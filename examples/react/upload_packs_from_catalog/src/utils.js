/**
 * Compare two version strings using Python PEP 440 versioning rules
 * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 * Handles common Python version formats: 1.2.3, 1.2.3a1, 1.2.3b1, 1.2.3rc1, 1.2.3.post1, 1.2.3.dev1
 */
export function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    
    // Normalize versions: remove leading/trailing whitespace
    v1 = v1.trim();
    v2 = v2.trim();
    
    if (v1 === v2) return 0;
    
    // Parse version into segments: [epoch, release, pre, post, dev]
    // PEP 440 format: [N!]N(.N)*[{a|b|rc}N][.postN][.devN]
    const parseVersion = (v) => {
        // Handle epoch (e.g., "1!2.3.4")
        let epoch = 0;
        if (v.includes('!')) {
            const parts = v.split('!');
            epoch = parseInt(parts[0], 10) || 0;
            v = parts[1];
        }
        
        let release = v;
        let pre = null;
        let post = null;
        let dev = null;
        
        // Parse in order: dev (last), post (before dev), pre (before post)
        // Pattern: release [pre] [post] [dev]
        
        // Check for dev (must be last, format: .devN)
        const devMatch = v.match(/^(.+?)(\.dev)(\d+)$/);
        if (devMatch) {
            release = devMatch[1];
            dev = { type: 'dev', num: parseInt(devMatch[3], 10) };
            v = release;
        }
        
        // Check for post (format: .postN, can be before dev)
        const postMatch = v.match(/^(.+?)(\.post)(\d+)$/);
        if (postMatch) {
            release = postMatch[1];
            post = parseInt(postMatch[3], 10);
            v = release;
        }
        
        // Check for pre (alpha, beta, rc) - format: aN, bN, rcN (no dot before)
        // This can appear after release numbers but before .post or .dev
        const preMatch = v.match(/^(.+?)(a|b|rc)(\d+)$/);
        if (preMatch) {
            release = preMatch[1];
            const preType = preMatch[2];
            const preNum = parseInt(preMatch[3], 10);
            // Order: a < b < rc
            const preOrder = { 'a': 0, 'b': 1, 'rc': 2 };
            pre = { type: preOrder[preType] || 0, num: preNum };
        }
        
        // Parse release segment (e.g., "1.2.3")
        // Remove any trailing dots
        release = release.replace(/\.+$/, '');
        const releaseParts = release.split('.').map(p => {
            const num = parseInt(p, 10);
            return isNaN(num) ? 0 : num;
        });
        
        return { epoch, release: releaseParts, pre, post, dev };
    };
    
    const parsed1 = parseVersion(v1);
    const parsed2 = parseVersion(v2);
    
    // Compare epoch
    if (parsed1.epoch !== parsed2.epoch) {
        return parsed1.epoch > parsed2.epoch ? 1 : -1;
    }
    
    // Compare release segments
    const maxReleaseLen = Math.max(parsed1.release.length, parsed2.release.length);
    for (let i = 0; i < maxReleaseLen; i++) {
        const r1 = parsed1.release[i] || 0;
        const r2 = parsed2.release[i] || 0;
        if (r1 !== r2) {
            return r1 > r2 ? 1 : -1;
        }
    }
    
    // Pre-release versions are less than final releases
    if (parsed1.pre && !parsed2.pre) return -1;
    if (!parsed1.pre && parsed2.pre) return 1;
    
    // Compare pre-release versions
    if (parsed1.pre && parsed2.pre) {
        if (parsed1.pre.type !== parsed2.pre.type) {
            return parsed1.pre.type > parsed2.pre.type ? 1 : -1;
        }
        if (parsed1.pre.num !== parsed2.pre.num) {
            return parsed1.pre.num > parsed2.pre.num ? 1 : -1;
        }
    }
    
    // Post-release versions are greater than final releases
    if (parsed1.post && !parsed2.post) return 1;
    if (!parsed1.post && parsed2.post) return -1;
    if (parsed1.post && parsed2.post) {
        if (parsed1.post !== parsed2.post) {
            return parsed1.post > parsed2.post ? 1 : -1;
        }
    }
    
    // Dev versions are less than non-dev versions
    if (parsed1.dev && !parsed2.dev) return -1;
    if (!parsed1.dev && parsed2.dev) return 1;
    if (parsed1.dev && parsed2.dev) {
        if (parsed1.dev.num !== parsed2.dev.num) {
            return parsed1.dev.num > parsed2.dev.num ? 1 : -1;
        }
    }
    
    return 0;
}

/**
 * Check if a version string is valid PEP 440 (can be parsed as semantic version)
 * Returns: { isValid: boolean, isSemantic: boolean }
 * If parsing fails, it's non-semantic (like daily builds, RC builds)
 */
export function tryParsePEP440Version(versionStr) {
    if (!versionStr || typeof versionStr !== 'string') {
        return { isValid: false, isSemantic: false };
    }
    
    const trimmed = versionStr.trim();
    
    // Check for non-semantic indicators (daily, RC, dev, alpha, beta)
    // This should match "daily-82", "daily", "RC1", "dev1", etc.
    const nonSemanticPatterns = /daily|rc|dev|alpha|beta/i;
    const isNonSemantic = nonSemanticPatterns.test(trimmed);
    if (isNonSemantic) {
        return { isValid: true, isSemantic: false };
    }
    
    // Try to parse as PEP 440 version
    // Basic PEP 440 pattern: [N!]N(.N)*[{a|b|rc}N][.postN][.devN]
    // Simplified check: starts with digit, contains dots, no invalid characters
    const pep440Pattern = /^(\d+!)?\d+(\.\d+)*([a-z]+\d+)?(\.post\d+)?(\.dev\d+)?$/i;
    
    if (pep440Pattern.test(trimmed)) {
        // Additional validation: try to compare versions
        try {
            // If we can extract numeric parts, it's likely semantic
            const parts = trimmed.split(/[!a-z]/i);
            if (parts.length > 0 && /^\d+/.test(parts[0])) {
                return { isValid: true, isSemantic: true };
            }
        } catch (e) {
            // Parsing failed
        }
    }
    
    // If it doesn't match PEP 440 pattern but doesn't have non-semantic indicators,
    // it might still be a version string (like "1.2.3")
    if (/^\d+\.\d+/.test(trimmed)) {
        return { isValid: true, isSemantic: true };
    }
    
    return { isValid: true, isSemantic: false };
}

/**
 * Update service version map, keeping the highest version for each service
 * Uses PEP 440 parsing to determine if version is semantic
 */
export function updateServiceVersion(installedServices, serviceName, versionStr) {
    if (!serviceName || !versionStr) return;
    
    // Use PEP 440 parsing to determine if version is semantic
    const versionCheck = tryParsePEP440Version(versionStr);
    const versionObj = { 
        version: versionStr, 
        isSemantic: versionCheck.isSemantic 
    };
    
    if (!installedServices.has(serviceName)) {
        installedServices.set(serviceName, versionObj);
    } else {
        const existing = installedServices.get(serviceName);
        // If new version is semantic and existing is not, prefer semantic
        if (versionCheck.isSemantic && !existing.isSemantic) {
            installedServices.set(serviceName, versionObj);
        } else if (!versionCheck.isSemantic && existing.isSemantic) {
            // Keep existing semantic version
        } else {
            // Both semantic or both non-semantic - compare versions
            if (compareVersions(versionStr, existing.version) > 0) {
                installedServices.set(serviceName, versionObj);
            }
        }
    }
}

/**
 * Check a single version specifier
 */
function versionSpecifierMatchesSingle(specifier, installedVersion) {
    // Extract operator and version
    const operators = ['>=', '<=', '==', '!=', '~=', '>', '<'];
    let operator = '';
    let requiredVersion = specifier;
    
    for (const op of operators) {
        if (specifier.startsWith(op)) {
            operator = op;
            requiredVersion = specifier.substring(op.length).trim();
            break;
        }
    }
    
    // If no operator, assume ==
    if (!operator) {
        operator = '==';
    }
    
    const comparison = compareVersions(installedVersion, requiredVersion);
    
    switch (operator) {
        case '==':
            return comparison === 0;
        case '>=':
            return comparison >= 0;
        case '<=':
            return comparison <= 0;
        case '>':
            return comparison > 0;
        case '<':
            return comparison < 0;
        case '!=':
            return comparison !== 0;
        case '~=':
            // Compatible release: >= version, < next major version
            // For ~=1.2.3, we need: >=1.2.3 and <2.0.0
            // Simplified: check if installed >= required and same major version
            if (comparison < 0) return false;
            const requiredParts = requiredVersion.split('.');
            const installedParts = installedVersion.split('.');
            if (requiredParts.length > 0 && installedParts.length > 0) {
                const requiredMajor = parseInt(requiredParts[0], 10) || 0;
                const installedMajor = parseInt(installedParts[0], 10) || 0;
                return installedMajor === requiredMajor;
            }
            return comparison >= 0;
        default:
            return false;
    }
}

/**
 * Check if a version specifier (like ">=1.2.3") matches an installed version
 * Simplified version of Python's SpecifierSet.contains()
 * Handles: >=, <=, ==, >, <, ~=, !=, and comma-separated multiple specifiers
 */
export function versionSpecifierMatches(specifier, installedVersion) {
    // Remove whitespace
    specifier = specifier.trim();
    installedVersion = installedVersion.trim();
    
    // Handle ==* (any version)
    if (specifier === '==*' || specifier === '*') {
        return true;
    }
    
    // Handle multiple specifiers separated by commas (e.g., ">=1.2.3,<2.0.0")
    const specifiers = specifier.split(',').map(s => s.trim());
    
    // All specifiers must match
    for (const singleSpec of specifiers) {
        if (!versionSpecifierMatchesSingle(singleSpec, installedVersion)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Check if a specifier string is valid PEP 440 SpecifierSet
 * Returns: { isValid: boolean, isSemantic: boolean }
 */
export function tryParsePEP440Specifier(specifierStr) {
    if (!specifierStr || typeof specifierStr !== 'string') {
        return { isValid: false, isSemantic: false };
    }
    
    const trimmed = specifierStr.trim();
    
    // Handle ==* (any version)
    if (trimmed === '==*' || trimmed === '*') {
        return { isValid: true, isSemantic: true };
    }
    
    // Check if it contains valid operators
    const validOperators = ['>=', '<=', '==', '!=', '~=', '>', '<'];
    let hasOperator = false;
    for (const op of validOperators) {
        if (trimmed.startsWith(op)) {
            hasOperator = true;
            break;
        }
    }
    
    if (!hasOperator && !/^\d+/.test(trimmed)) {
        // No operator and doesn't start with digit - likely invalid
        return { isValid: false, isSemantic: false };
    }
    
    // Extract version part after operator
    let versionPart = trimmed;
    for (const op of validOperators) {
        if (trimmed.startsWith(op)) {
            versionPart = trimmed.substring(op.length).trim();
            break;
        }
    }
    
    // Check if the version part is valid PEP 440
    const versionCheck = tryParsePEP440Version(versionPart);
    if (!versionCheck.isValid) {
        return { isValid: false, isSemantic: false };
    }
    
    // If version part is semantic, the specifier is semantic
    return { isValid: true, isSemantic: versionCheck.isSemantic };
}

/**
 * Check if required fabric services are compatible with installed services
 * Matches _check_fabric_service_compatibility logic from Python exactly
 */
export function checkFabricServiceCompatibility(requiredServices, installedServices) {
    if (!requiredServices || !Array.isArray(requiredServices) || requiredServices.length === 0) {
        return true; // No requirements means compatible
    }
    
    for (const service of requiredServices) {
        // Handle both object format {name: "...", version: "..."} and Map-like format
        const serviceName = service.name || (typeof service.get === 'function' ? service.get('name') : null);
        const requiredVersion = service.version || (typeof service.get === 'function' ? service.get('version') : null);
        
        if (!serviceName || !requiredVersion) {
            continue;
        }
        
        // Check if the service is installed (service.name should match pod_type)
        // Try exact match first, then case-insensitive match
        let installedService = null;
        let matchedKey = null;
        
        if (installedServices.has(serviceName)) {
            matchedKey = serviceName;
            installedService = installedServices.get(serviceName);
        } else {
            // Try case-insensitive match
            for (const [key, value] of installedServices.entries()) {
                if (key.toLowerCase() === serviceName.toLowerCase()) {
                    matchedKey = key;
                    installedService = value;
                    break;
                }
            }
        }
        
        if (!installedService) {
            return false;
        }
        
        const installedVersion = installedService.version; // This is build_tag
        
        // IMPORTANT: First check if installed version (build_tag) is PEP 440 compliant
        // If the installed build_tag is NOT PEP 440 compliant (non-semantic), skip the compatibility check entirely
        let installedVersionIsSemantic = false;
        try {
            const versionCheck = tryParsePEP440Version(installedVersion);
            installedVersionIsSemantic = versionCheck.isSemantic;
            
            if (!installedVersionIsSemantic) {
                // Installed build_tag is not PEP 440 compliant - skip compatibility check for this service
                continue; // Skip this service requirement and continue to next one
            }
        } catch (e) {
            // If we can't parse the version, treat it as non-semantic and skip
            continue; // Skip this service requirement and continue to next one
        }
        
        // Installed version is PEP 440 compliant - proceed with compatibility check
        // Check if required version specifier is semantic (like SpecifierSet in Python)
        let requiredVersionIsSemantic = false;
        let specSetValid = false;
        try {
            const specCheck = tryParsePEP440Specifier(requiredVersion);
            specSetValid = specCheck.isValid;
            requiredVersionIsSemantic = specCheck.isSemantic;
        } catch (e) {
            // Ignore
        }
        
        // Perform validation based on version types (matching Python logic exactly)
        // Use SpecifierSet.contains() logic when both are semantic
        if (requiredVersionIsSemantic && installedVersionIsSemantic) {
            // Both are semantic - use strict version checking (like spec_set.contains() in Python)
            const matches = versionSpecifierMatches(requiredVersion, installedVersion);
            if (!matches) {
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Fetch installed services from fabric health APIs
 */
export async function fetchInstalledServices() {
    const installedServices = new Map(); // pod_type -> { version: build_tag, isSemantic }
    const rawData = {
        workers: null,
        core: null,
        app: null
    };
    
    try {
        // Fetch workers
        const workersResponse = await fetch('/api/v2/fabric_health/workers?offset=0&limit=100', {
            headers: { 'accept': 'application/json' }
        });
        if (workersResponse.ok) {
            const workersData = await workersResponse.json();
            rawData.workers = workersData;
            const workers = workersData.worker || [];
            for (const worker of workers) {
                const podType = worker.pod_type;
                const buildTag = worker.build_tag;
                if (podType && buildTag) {
                    updateServiceVersion(installedServices, podType, buildTag);
                }
            }
        }
    } catch (err) {
        rawData.workers = { error: err.message };
    }
    
    try {
        // Fetch core microservices
        const coreResponse = await fetch('/api/v2/fabric_health/microservices/core?offset=0&limit=100', {
            headers: { 'accept': 'application/json' }
        });
        if (coreResponse.ok) {
            const coreData = await coreResponse.json();
            rawData.core = coreData;
            const coreServices = coreData.core_microservices || [];
            for (const service of coreServices) {
                const podType = service.pod_type;
                const buildTag = service.build_tag;
                if (podType && buildTag) {
                    updateServiceVersion(installedServices, podType, buildTag);
                }
            }
        }
    } catch (err) {
        rawData.core = { error: err.message };
    }
    
    try {
        // Fetch app microservices
        const appResponse = await fetch('/api/v2/fabric_health/microservices/app?offset=0&limit=100', {
            headers: { 'accept': 'application/json' }
        });
        if (appResponse.ok) {
            const appData = await appResponse.json();
            rawData.app = appData;
            const appServices = appData.app_microservices || [];
            for (const service of appServices) {
                const podType = service.pod_type;
                const buildTag = service.build_tag;
                if (podType && buildTag) {
                    updateServiceVersion(installedServices, podType, buildTag);
                }
            }
        }
    } catch (err) {
        rawData.app = { error: err.message };
    }
    
    return { servicesMap: installedServices, rawData: rawData };
}

/**
 * Filter packs by fabric service compatibility
 */
export function filterPacksByCompatibility(packs, installedServices) {
    const compatiblePacks = [];
    
    for (const pack of packs) {
        const packName = pack.pack_name;
        const packVersion = pack.pack_version;
        
        if (!packName || !packVersion) {
            continue;
        }
        
        // Check fabric service compatibility
        if (pack.required_fabric_services && Array.isArray(pack.required_fabric_services) && pack.required_fabric_services.length > 0) {
            const isCompatible = checkFabricServiceCompatibility(pack.required_fabric_services, installedServices);
            if (isCompatible) {
                compatiblePacks.push(pack);
            }
        } else {
            // If no required_fabric_services specified, include the pack
            compatiblePacks.push(pack);
        }
    }
    
    return compatiblePacks;
}

/**
 * Filter packs to show only the latest version of each pack
 */
export function filterLatestVersions(packs) {
    const packMap = new Map();
    
    for (const pack of packs) {
        const packName = pack.pack_name;
        const packVersion = pack.pack_version;
        
        if (!packName || !packVersion) continue;
        
        if (!packMap.has(packName)) {
            packMap.set(packName, pack);
        } else {
            const existingPack = packMap.get(packName);
            const existingVersion = existingPack.pack_version;
            
            // Compare versions and keep the latest
            if (compareVersions(packVersion, existingVersion) > 0) {
                packMap.set(packName, pack);
            }
        }
    }
    
    return Array.from(packMap.values());
}

/**
 * Get pack key for identification
 */
export function getPackKey(pack) {
    return `${pack.pack_name}::${pack.pack_version}`;
}

