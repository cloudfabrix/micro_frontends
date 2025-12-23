import React, { useState, useEffect, useMemo } from 'react';
import {
    getPackKey,
    fetchInstalledServices,
    filterPacksByCompatibility,
    filterLatestVersions
} from './utils.js';

const ITEMS_PER_PAGE = 10;

function PackCatalog() {
    const [packsData, setPacksData] = useState([]);
    const [filteredPacks, setFilteredPacks] = useState([]);
    const [selectedPacks, setSelectedPacks] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [showStatus, setShowStatus] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Apply theme from parent window (if in iframe) or system theme
    useEffect(() => {
        // Function to copy CSS variables from parent window
        const copyParentTheme = () => {
            try {
                // Check if we're running inside an iframe and can access parent
                if (window.parent && window.parent !== window) {
                    // Get computed styles from parent's root element
                    const parentStyles = window.parent.getComputedStyle(window.parent.document.documentElement);
                    // Get all property names from parent
                    const parentProps = Array.from(parentStyles);
                    
                    // Filter for CSS custom properties (variables starting with --)
                    const cssVariables = parentProps.filter(prop => prop.startsWith('--'));
                    
                    // Get the iframe's root element
                    const iframeRoot = document.documentElement;
                    
                    // Copy each CSS variable to the iframe
                    cssVariables.forEach(varName => {
                        const value = parentStyles.getPropertyValue(varName);
                        iframeRoot.style.setProperty(varName, value);
                    });

                    const bgColor1 = parentStyles.getPropertyValue('--v-theme-background');
                    const isDarkMode = bgColor1 && bgColor1 != "255,255,255"
                    setIsDarkTheme(isDarkMode);
                    if (isDarkMode) {
                        document.documentElement.removeAttribute('data-theme');
                    } else {
                        document.documentElement.setAttribute('data-theme', 'light');
                    }
                    return true; // Successfully copied from parent
                }
            } catch (error) {
                console.log('Cannot access parent document (likely cross-origin or not in iframe):', error.message);
            }
            return false; // Not in iframe or couldn't access parent
        };

        // Try to copy from parent first
        const copiedFromParent = copyParentTheme();
        // If not in iframe or couldn't access parent, use system theme
        if (!copiedFromParent) {
            const applySystemTheme = () => {
                const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setIsDarkTheme(isDarkMode);
                if (isDarkMode) {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                }
            };

            // Apply theme on mount
            applySystemTheme();

            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleThemeChange = (e) => {
                const isDarkMode = e.matches;
                setIsDarkTheme(isDarkMode);
                if (isDarkMode) {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                }
            };

            mediaQuery.addEventListener('change', handleThemeChange);

            // Cleanup
            return () => {
                mediaQuery.removeEventListener('change', handleThemeChange);
            };
        }
    }, []);

    // Load catalog data on mount
    useEffect(() => {
        loadCatalog();
    }, []);

    // Filter packs based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredPacks(packsData);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = packsData.filter(p =>
                (p.pack_name || '').toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query)
            );
            setFilteredPacks(filtered);
        }
        setCurrentPage(1); // Reset to first page on search
    }, [searchQuery, packsData]);

    async function loadCatalog() {
        setLoading(true);
        setError(null);
        try {
            const metadataUrl = "https://raw.githubusercontent.com/cloudfabrix/rda_packs/main/metadata/packs_metadata.json";
            const response = await fetch(metadataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("Invalid catalog format");

            // Step 1: Fetch installed services (gracefully handle failures)
            let installedServices = new Map();
            try {
                const result = await fetchInstalledServices();
                installedServices = result.servicesMap;
            } catch (err) {
                // Continue with empty map - will show all packs if services can't be fetched
            }

            // Step 2: Filter by compatibility (if we have installed services)
            let compatiblePacks = data;
            if (installedServices.size > 0) {
                compatiblePacks = filterPacksByCompatibility(data, installedServices);
            }

            // Step 3: Filter to show only latest versions
            const latestVersions = filterLatestVersions(compatiblePacks);

            setPacksData(latestVersions);
            setFilteredPacks(latestVersions);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Pagination calculations
    const totalPages = Math.ceil(filteredPacks.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pagePacks = filteredPacks.slice(startIndex, endIndex);

    // Check if all items on current page are selected
    const allPageSelected = useMemo(() => {
        return pagePacks.length > 0 && pagePacks.every(p => selectedPacks.has(getPackKey(p)));
    }, [pagePacks, selectedPacks]);

    function toggleSelection(packKey, isSelected) {
        setSelectedPacks(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(packKey);
            } else {
                newSet.delete(packKey);
            }
            return newSet;
        });
    }

    function handleSelectAll(e) {
        if (e.target.checked) {
            pagePacks.forEach(p => {
                setSelectedPacks(prev => new Set(prev).add(getPackKey(p)));
            });
        } else {
            pagePacks.forEach(p => {
                setSelectedPacks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(getPackKey(p));
                    return newSet;
                });
            });
        }
    }

    function clearSelection() {
        setSelectedPacks(new Set());
        setShowStatus(false);
        setUploadStatus(null);
    }

    function formatDependencies(deps) {
        if (!deps || !Array.isArray(deps) || deps.length === 0) {
            return <span className="no-deps">None</span>;
        }
        return (
            <ul className="dependency-list">
                {deps.map((d, idx) => (
                    <li key={idx}>
                        {d.name}
                        <span className="dep-version">{d.version}</span>
                    </li>
                ))}
            </ul>
        );
    }

    async function uploadSelected() {
        const selected = packsData.filter(p => selectedPacks.has(getPackKey(p)));

        if (selected.length === 0) {
            alert('No packs selected');
            return;
        }

        setUploading(true);
        setShowStatus(true);

        const results = {
            success: [],
            failed: []
        };

        // Upload each pack individually
        for (let i = 0; i < selected.length; i++) {
            const pack = selected[i];
            const packName = pack.pack_name || 'Unknown';
            const packVersion = pack.pack_version || 'Unknown';
            const tarFileUrl = pack.tar_file_url;

            if (!tarFileUrl) {
                results.failed.push({ pack: packName, version: packVersion, error: 'Missing tar_file_url' });
                continue;
            }

            try {
                // Fetch the tar file from the URL
                const tarResponse = await fetch(tarFileUrl);
                if (!tarResponse.ok) {
                    throw new Error(`Failed to fetch tar file: HTTP ${tarResponse.status}`);
                }

                // Convert response to blob
                const tarBlob = await tarResponse.blob();

                // Create FormData for multipart/form-data upload
                const formData = new FormData();
                const fileName = tarFileUrl.split('/').pop() || `${packName}_${packVersion}.tar.gz`;
                formData.append('file', tarBlob, fileName);

                // Upload the file
                const uploadResponse = await fetch('/api/v2/packs/upload', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json'
                    },
                    body: formData
                });

                // Parse the response - try JSON first, fallback to text
                let result;
                try {
                    result = await uploadResponse.json();
                } catch (err) {
                    const errorText = await uploadResponse.text().catch(() => '');
                    if (!uploadResponse.ok) {
                        throw new Error(`HTTP ${uploadResponse.status}: ${errorText || 'Unknown error'}`);
                    }
                    throw new Error(`Failed to parse response: ${errorText || err.message}`);
                }

                // Check for error response with "detail" field (common error format)
                if (result.detail) {
                    throw new Error(result.detail);
                }

                // Check the API response structure for success response
                const serviceError = result.serviceError;
                const serviceResult = result.serviceResult || {};
                const status = serviceResult.status;
                const statusMessage = serviceResult.statusMessage || 'Unknown status';

                // Check if there's a service error or if status is not SUBMIT_OK
                if (serviceError && serviceError !== 'none') {
                    throw new Error(`Service error: ${serviceError}${statusMessage ? ` - ${statusMessage}` : ''}`);
                }

                if (status === 'SUBMIT_OK') {
                    results.success.push({
                        pack: packName,
                        version: packVersion,
                        message: statusMessage
                    });
                } else {
                    throw new Error(`Upload failed: ${statusMessage || status || 'Unknown error'}`);
                }
            } catch (err) {
                results.failed.push({ pack: packName, version: packVersion, error: err.message });
            }
        }

        setUploading(false);
        setUploadStatus(results);

        // Show results in popup as well
        let message = `Upload completed:\n`;
        message += `✓ Success: ${results.success.length}\n`;
        message += `✗ Failed: ${results.failed.length}`;

        if (results.success.length > 0) {
            message += `\n\nSuccessful uploads:\n`;
            results.success.forEach(s => {
                message += `- ${s.pack} (${s.version})`;
                if (s.message) {
                    message += `: ${s.message}`;
                }
                message += `\n`;
            });
        }

        if (results.failed.length > 0) {
            message += `\n\nFailed packs:\n`;
            results.failed.forEach(f => {
                message += `- ${f.pack} (${f.version}): ${f.error}\n`;
            });
        }

        alert(message);

        // Clear selection after successful upload
        if (results.failed.length === 0 && results.success.length > 0) {
            clearSelection();
        }
    }

    function nextPage() {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    }

    function previousPage() {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    }

    return (
        <div className="container">
            <h1>RDA Pack Catalog</h1>

            <div className="toolbar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search packs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="selection-info">
                    <strong>{selectedPacks.size}</strong> pack{selectedPacks.size !== 1 ? 's' : ''} selected
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={allPageSelected}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th>Pack Name</th>
                            <th>Version</th>
                            <th>Description</th>
                            <th>Required Fabric Services</th>
                            <th>Required Base Packs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="loading">
                                        <div className="spinner"></div>
                                        <div>Loading catalog...</div>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="6" className="error">
                                    Failed to load catalog: {error}
                                </td>
                            </tr>
                        ) : pagePacks.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="loading">
                                    No packs found
                                </td>
                            </tr>
                        ) : (
                            pagePacks.map((pack) => {
                                const packKey = getPackKey(pack);
                                const isSelected = selectedPacks.has(packKey);
                                return (
                                    <tr
                                        key={packKey}
                                        className={isSelected ? 'selected' : ''}
                                        onClick={(e) => {
                                            if (e.target.type !== 'checkbox') {
                                                toggleSelection(packKey, !isSelected);
                                            }
                                        }}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(packKey, e.target.checked);
                                                }}
                                            />
                                        </td>
                                        <td className="pack-name">{pack.pack_name || 'N/A'}</td>
                                        <td>
                                            <span className="pack-version">{pack.pack_version || 'N/A'}</span>
                                        </td>
                                        <td className="pack-description">{pack.description || '-'}</td>
                                        <td>{formatDependencies(pack.required_fabric_services)}</td>
                                        <td>{formatDependencies(pack.required_base_packs)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {filteredPacks.length > ITEMS_PER_PAGE && (
                <div className="pagination">
                    <div className="pagination-info">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredPacks.length)} of {filteredPacks.length} packs
                    </div>
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            onClick={previousPage}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span className="pagination-page-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="pagination-btn"
                            onClick={nextPage}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {showStatus && uploadStatus && (
                <div className="status-section visible">
                    <div className="status-header">Upload Status</div>
                    <div className="status-summary">
                        <div className="status-summary-item success">
                            <span>✓</span>
                            <span><strong>{uploadStatus.success.length}</strong> successful</span>
                        </div>
                        <div className="status-summary-item error">
                            <span>✗</span>
                            <span><strong>{uploadStatus.failed.length}</strong> failed</span>
                        </div>
                    </div>
                    <div className="status-details">
                        {uploadStatus.success.length > 0 && (
                            <>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <strong style={{ color: 'var(--accent)' }}>Successful uploads:</strong>
                                </div>
                                <ul className="status-list">
                                    {uploadStatus.success.map((s, idx) => (
                                        <li key={idx} className="success">
                                            <span className="pack-info">
                                                {s.pack} ({s.version})
                                            </span>
                                            {s.message && (
                                                <span className="pack-message">{s.message}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {uploadStatus.failed.length > 0 && (
                            <>
                                {uploadStatus.success.length > 0 && (
                                    <div style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
                                        <strong style={{ color: '#ff6b6b' }}>Failed uploads:</strong>
                                    </div>
                                )}
                                {uploadStatus.success.length === 0 && (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <strong style={{ color: '#ff6b6b' }}>Failed uploads:</strong>
                                    </div>
                                )}
                                <ul className="status-list">
                                    {uploadStatus.failed.map((f, idx) => (
                                        <li key={idx} className="error">
                                            <span className="pack-info">
                                                {f.pack} ({f.version})
                                            </span>
                                            <span className="pack-message">{f.error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="actions">
                <button className="btn btn-secondary" onClick={clearSelection}>
                    Clear Selection
                </button>
                <button
                    className="btn btn-primary"
                    disabled={selectedPacks.size === 0 || uploading}
                    onClick={uploadSelected}
                >
                    {uploading ? 'Uploading...' : 'Upload Selected'}
                </button>
            </div>
        </div>
    );
}

export default PackCatalog;

