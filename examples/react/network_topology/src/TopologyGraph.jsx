import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import axios from 'axios';
import './custom_widget_platform_compatible_style.css';
import { SearchPlusIcon, SearchMinusIcon, ExpandIcon, SyncAltIcon, UndoIcon, TimesIcon, ProjectDiagramIcon, FilterIcon, FilterCircleXmarkIcon, InfoCircleIcon } from './icons.jsx';

const getAqlBody = (aql, dbname) => {
  const params = {
    "reportId":"graphdb.aql.executor",
    "query":aql,
    context:{
      "id":"user-dashboard-rda-graph-aql-editor-template",
      "name":"rda-graph-aql-editor-template",
      "app-context": {"appName":"user-dashboard/rda-graph-app"},
      "USER_ID":"siri.kothe@cloudfabrix.com",
      "USER_PROJECTS":["e6664cf2-3c25-11f0-9445-0242ac140006"],
      "projectId":["e6664cf2-3c25-11f0-9445-0242ac140006"],
      "USER_ROLE":"msp-admin",
      "USER_GROUP_NAME":"MSP Admin",
      "USER_GROUP_TAGS":[],
      "MSP_ID":"adc5c7c3-ee44-4e66-8221-8606225796fe",
      "ENV_APP_TYPE":"onprem",
      "ENV_HOSTNAME":"1c094382ea01",
      "ENV_NO_GRAPHDB":"",
      "OIA":"enabled",
      "app_filter":null,
      "view-context": {
        "appName":"user-dashboard/rda-graph-app",
        "pageName":"rda-graph-aql-editor-template"
      },
      "graph_name":`${dbname}_graph`,
      "db_name":dbname,
      "edge_collection":`${dbname}_edges`,
      "node_collection":`${dbname}_nodes`,
      "contextInfo":{
          "contextIdList":[]
      }
    }
  }
  const paramsString = JSON.stringify(params)
  return {
    "serviceRequestDescriptor":{
      "serviceName":"saas-reports",
      "version":"*",
      "params":{
        "params":[
          paramsString
        ]
      },
      "methodName":"getReport",
      "ignoreCall":true,
      "parseOutput":false
    }
  }
}

const getResponseData = (response) => {
    const serviceResult = response.serviceResult || {}
  const results = serviceResult.results || "[]"
  return JSON.parse(results)
}

  
const TopologyGraph = () => {
  const [cy, setCy] = useState(null);
  const [elements, setElements] = useState([]);
  const [allElements, setAllElements] = useState([]); // Store all elements
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('details');
  const [contextMenu, setContextMenu] = useState(null); // { type: 'node'|'edge', data: {}, position: {x, y} }
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('label'); // 'label', 'device_model', 'device_ip'
  const [devicemodels, setDevicemodels] = useState([]); // All unique device models
  const [selectedDevicemodels, setSelectedDevicemodels] = useState([]); // Selected device models for filtering
  const [deviceModelCounts, setDeviceModelCounts] = useState({}); // Count of nodes per device model
  const [layoutType, setLayoutType] = useState('network-hierarchy'); // Layout type selection
  const layoutRef = useRef(null); // Store current layout instance
  const [showUnmanagedDevices, setShowUnmanagedDevices] = useState(true); // Show/hide unmanaged devices
  const [isDarkTheme, setIsDarkTheme] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches); // Track theme
  const [labelDisplayMode, setLabelDisplayMode] = useState('hostname'); // 'hostname' or 'ip'
  const [showControlPanel, setShowControlPanel] = useState(true); // Show/hide control panel
  const [showDevicePopup, setShowDevicePopup] = useState(false); // Show/hide device selection popup
  const [selectedDevices, setSelectedDevices] = useState([]); // Selected devices for filtering
  const [allDevices, setAllDevices] = useState([]); // All devices with their details
  const [pendingFilterDevices, setPendingFilterDevices] = useState([]); // Devices added to filter but not yet applied
  const [alertCounts, setAlertCounts] = useState({}); // Alert counts per device IP
  const [nodeAlerts, setNodeAlerts] = useState([]); // Alerts for the selected node
  const [loadingAlerts, setLoadingAlerts] = useState(false); // Loading state for alerts
  const [showFilterHelp, setShowFilterHelp] = useState(false); // Show/hide filter help popup
  
  // Link type filters
  const [linkTypeFilters, setLinkTypeFilters] = useState({
    'CDP': true,
    'LLDP': true,
    'ISIS': true,
    'BGP': true,
    'OSPF': true
  });

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
  
          // // Detect if parent is using dark theme by checking background color
          // const bgColor = parentStyles.getPropertyValue('--bg') || parentStyles.getPropertyValue('background-color');
          // // Simple heuristic: if background is dark, it's dark theme
          // console.log("Background color", bgColor);
          // const isDarkMode = bgColor && (bgColor.includes('rgb') ? 
          //   (parseInt(bgColor.match(/\d+/)[0]) < 128) : 
          //   bgColor.includes('dark') || bgColor.includes('#1') || bgColor.includes('#2') || bgColor.includes('#0'));
          // console.log("Is dark mode", isDarkMode);
          // console.log("Background color", bgColor);
          // setIsDarkTheme(isDarkMode);
          
          // // Copy data-theme attribute if present
          // const parentTheme = window.parent.document.documentElement.getAttribute('data-theme');
          // if (parentTheme) {
          //   iframeRoot.setAttribute('data-theme', parentTheme);
          // }
          // console.log("Parent theme", parentTheme);
          return true; // Successfully copied from parent
        }
      } catch (error) {
        console.log('Cannot access parent document (likely cross-origin or not in iframe):', error.message);
      }
      return false; // Not in iframe or couldn't access parent
    };

    // Try to copy from parent first
    const copiedFromParent = copyParentTheme();
    console.log("Copied from parent", copiedFromParent);
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

  // Link type color mapping
  const linkTypeColors = {
    'CDP': '#9B59B6',      // Purple
    'LLDP': '#3498DB',     // Blue
    'ISIS': '#2ECC71',     // Green
    'BGP': '#E67E22',      // Orange
    'OSPF': '#E91E63',     // Pink
    'default': '#95a5a6'   // Gray
  };

  const getLinkColor = (linkType) => {
    if (!linkType) return linkTypeColors.default;
    const upperLinkType = linkType.toUpperCase();
    return linkTypeColors[upperLinkType] || linkTypeColors.default;
  };

  // Get text color based on theme
  const getTextColor = () => {
    return isDarkTheme ? '#FAFAFA' : '#212121'; // cfxtext for dark and light themes
  };

  useEffect(() => {
    async function fetchGraph() {
      // Use the Vite proxy to avoid CORS issues. The proxy will forward
      // requests from /api to https://10.95.125.190/api
      const baseUrl = "/api/portal/rdac/browseapi"
      
      // Only include Bearer token in dev mode
      const headers = {};
      if (import.meta.env.DEV) {
        headers.Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyLWlkIjoic2lyaS5rb3RoZUBjbG91ZGZhYnJpeC5jb20iLCJ3b3Jrc3BhY2VpZCI6ImFkYzVjN2MzLWVlNDQtNGU2Ni04MjIxLTg2MDYyMjU3OTZmZSIsInJkYWNfYXBpX2VuZHBvaW50IjoiaHR0cDovLzEwLjk1LjEyNS4xOTA6ODgwOCJ9.vptGeX0_jyh6IYW7hv2KnVSoWHiXvgYiKoNK5XoPvXY";
      }

      // Define AQL queries to retrieve nodes and edges from ArangoDB.
      const nodeQuery = getAqlBody('FOR n IN routing_protocol_topology_nodes RETURN n', 'routing_protocol_topology');
      const edgeQuery = getAqlBody('FOR e IN routing_protocol_topology_edges RETURN e', 'routing_protocol_topology');
      // const nodeQuery = getAqlBody('FOR n IN cfx_rdaf_topology_new_nodes RETURN n', 'cfx_rdaf_topology_new');
      // const edgeQuery = getAqlBody('FOR e IN cfx_rdaf_topology_new_edges RETURN e', 'cfx_rdaf_topology_new');

      try {
        // Fire off the node and edge queries concurrently.
        const [nodeRes, edgeRes] = await Promise.all([
          axios.post(`${baseUrl}`, nodeQuery, { headers }),
          axios.post(`${baseUrl}`, edgeQuery, { headers }),
        ]);
        const rawNodes = getResponseData(nodeRes.data);
        const rawEdges = getResponseData(edgeRes.data);
        console.log("Raw Nodes", rawNodes);
        // Map raw node documents into the Cytoscape format.
        const nodes = rawNodes.map((n) => {
          // Determine a unique ID for each node. Use `_key` if available, else
          // `_id` or fallback to `id`/`key` fields.
          const id = n.node_id || n._key || n._id || n.id || n.key;
          return {
            data: {
            id,
              label: n.node_label || n.label || n.name || id,
              group: n.group || n.type || null,
              device_model: n.device_model || null,
              device_fw_type: n.device_fw_type || null,
              device_fw_version: n.device_fw_version || null,
              fqdn: n.device_hostname || null,
              device_ip: n.device_ip || null,
              device_location: n.device_location || null,
              device_mgmt_status: n.device_status || null,
              device_vendor: n.device_vendor || null,
              device_serial_number: n.parent_sn || null,

            //   ...n,
            }
          };
        });

        // Map raw edge documents into the Cytoscape format.
        const edges = rawEdges.map((e, index) => {
          // ArangoDB edges store the `_from` and `_to` fields in the format
          // "collectionName/key". We strip the prefix to obtain just the key.
          const extractKey = (fullId) => {
            if (typeof fullId === 'string' && fullId.includes('/')) {
              return fullId.split('/')[1];
            }
            return fullId;
          };
          // Handle different edge field formats: _from/_to, from/to, left_id/right_id
          const source = extractKey(e.left_id || e._from || e.from);
          const target = extractKey(e.right_id || e._to || e.to);
        //   console.log("Source", e.left_id, "Target", e.right_id);
          const edge = {
            data: {
              // ...e,
              // id: e._key || e._id || `edge-${index}`,
              id: e.unique_id || `edge-${index}`,
              source: source,
              target: target,
              source_device: e.left_label || null,
              target_device: e.right_label || null,
              target_port: e.right_interface || null,
              source_port: e.left_interface || null,
              left_ip: e.left_ip || null,
              right_ip: e.right_ip || null,
              link_type: e.link_type || e.device_object || null,
            }
          };
        //   console.log("Edge111", edge.data.id, edge.data.source, edge.data.target);
          return edge;
        });
        const allElems = [...nodes, ...edges];
        setAllElements(allElems);
        setElements(allElems);
        
        // Extract unique device models and count nodes per model
        const models = new Set();
        const modelCounts = {};
        nodes.forEach(node => {
          if (node.data.device_model) {
            const model = node.data.device_model;
            models.add(model);
            modelCounts[model] = (modelCounts[model] || 0) + 1;
          }
        });
        setDevicemodels(Array.from(models).sort());
        setDeviceModelCounts(modelCounts);
        console.log("Device models", models)
        console.log("Counts", modelCounts);
        
        // Store all devices with their details for the device selection popup
        const devicesWithDetails = nodes.map(node => ({
          id: node.data.id,
          label: node.data.label,
          hostname: node.data.fqdn,
          ip: node.data.device_ip,
          model: node.data.device_model,
          vendor: node.data.device_vendor,
          location: node.data.device_location,
          mgmt_status: node.data.device_mgmt_status,
          serial: node.data.device_serial_number
        }));
        setAllDevices(devicesWithDetails);
      } catch (err) {
        console.error('Failed to load topology:', err);
      }
    }

    fetchGraph();
  }, []);

  // Fetch alerts for a specific node
  const fetchNodeAlerts = async (deviceIP) => {
    if (!deviceIP) return;
    
    setLoadingAlerts(true);
    try {
      const cfxqlQuery = `a_asset_ip_address is '${deviceIP}' and a_status is 'ACTIVE' and a_source_system_id is not 'Alert Group'`;
      
      const baseUrl = "/api/v2/pstreams/pstream/oia-alerts-stream/data";
      const params = new URLSearchParams({
        cfxql_query: cfxqlQuery,
        limit: '100'
      });

      const headers = {};
      if (import.meta.env.DEV) {
        headers.Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyLWlkIjoic2lyaUBmYWJyaXguYWkiLCJ3b3Jrc3BhY2VpZCI6ImZjYjY0YWIwLTY3MTYtNDgxYi1iZTUxLWRiNjY4NThhY2M0NyJ9.kiuQ67x7d6hF3N0rxOzqMWCLpdjpS7T8EtYUNCDLR1E";
      }

      const response = await axios.get(`${baseUrl}?${params.toString()}`, { headers });
      
      const alerts = response.data?.serviceResult?.data?.results || [];
      setNodeAlerts(alerts);
      console.log(`Fetched ${alerts.length} alerts for device ${deviceIP}`);
    } catch (error) {
      console.error('Failed to fetch node alerts:', error);
      setNodeAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Fetch alert counts for all devices
  useEffect(() => {
    async function fetchAlertCounts() {
      if (allDevices.length === 0) return;

      // Get all unique IPs
      const deviceIPs = allDevices
        .map(d => d.ip)
        .filter(ip => ip); // Filter out null/undefined IPs

      if (deviceIPs.length === 0) return;

      try {
        // Build the cfxql query to filter by IPs and active status
        const ipList = deviceIPs.map(ip => `'${ip}'`).join(',');
        const cfxqlQuery = `a_asset_ip_address in [${ipList}] and a_status is 'ACTIVE' `;
        
        const baseUrl = "/api/v2/pstreams/pstream/oia-alerts-stream/data";
        const params = new URLSearchParams({
          cfxql_query: cfxqlQuery,
          group_by: 'a_asset_ip_address',
          aggs: 'value_count:count_',
          limit: '1000'
        });

        const headers = {};
        if (import.meta.env.DEV) {
          headers.Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyLWlkIjoic2lyaUBmYWJyaXguYWkiLCJ3b3Jrc3BhY2VpZCI6ImZjYjY0YWIwLTY3MTYtNDgxYi1iZTUxLWRiNjY4NThhY2M0NyJ9.kiuQ67x7d6hF3N0rxOzqMWCLpdjpS7T8EtYUNCDLR1E";
        }

        const response = await axios.get(`${baseUrl}?${params.toString()}`, { headers });
        
        // Parse the response
        const series = response.data?.serviceResult?.data?.series || [];
        const counts = {};
        
        series.forEach(item => {
          const ip = item.group?.[0];
          const count = item.values?.[0]?.value || 0;
          if (ip) {
            counts[ip] = count;
          }
        });
        
        setAlertCounts(counts);
        console.log('Alert counts fetched:', counts);
      } catch (error) {
        console.error('Failed to fetch alert counts:', error);
      }
    }

    fetchAlertCounts();
    
    // Refresh alert counts every 60 seconds
    const interval = setInterval(fetchAlertCounts, 60000);
    return () => clearInterval(interval);
  }, [allDevices]);

  // Filter elements based on selected link types and search
  useEffect(() => {
    if (allElements.length > 0) {
      // Separate nodes and edges
      const allNodes = allElements.filter(elem => !elem.data.source && !elem.data.target);
      const allEdges = allElements.filter(elem => elem.data.source && elem.data.target);
      
      // Filter nodes by search term or device family selection
      let filteredNodes = allNodes;
      
      // Filter out unmanaged devices if checkbox is unchecked
      if (!showUnmanagedDevices) {
        filteredNodes = filteredNodes.filter(node => {
          const label = node.data.device_mgmt_status || '';
          return !label.toUpperCase().includes('UNMANAGED');
        });
      }
      
      // Filter by selected devices first
      if (selectedDevices.length > 0) {
        console.log('Filtering by selected devices:', selectedDevices.length, 'devices');
        filteredNodes = filteredNodes.filter(node => {
          return selectedDevices.includes(node.data.id);
        });
        console.log('After device filter:', filteredNodes.length, 'nodes remaining');
      }
      
      // Then filter by device model (if not using device selection)
      if (selectedDevices.length === 0 && searchField === 'device_model' && selectedDevicemodels.length > 0) {
        filteredNodes = filteredNodes.filter(node => {
          return selectedDevicemodels.includes(node.data.device_model);
        });
      }
      
      // Finally apply text search filter (works on top of other filters)
      if (searchTerm.trim() !== '') {
        console.log('Applying text search:', searchTerm, 'on field:', searchField);
        filteredNodes = filteredNodes.filter(node => {
          const searchValue = node.data[searchField];
          if (!searchValue) return false;
          return String(searchValue).toLowerCase().includes(searchTerm.toLowerCase());
        });
        console.log('After text search:', filteredNodes.length, 'nodes remaining');
      }

      // Create a set of filtered node IDs
      const filteredNodeIds = new Set(filteredNodes.map(n => n.data.id));

      // Filter edges: only keep edges where BOTH source AND target exist in filtered nodes
      let filteredEdges = allEdges.filter(edge => {
        const hasSource = filteredNodeIds.has(edge.data.source);
        const hasTarget = filteredNodeIds.has(edge.data.target);
        
        // Both source and target must exist
        if (!hasSource || !hasTarget) return false;
        
        // Filter by link type
        const linkType = edge.data.link_type;
        if (!linkType) return true;
        const upperLinkType = linkType.toUpperCase();
        return linkTypeFilters[upperLinkType] !== false;
      });
      
      // Get node IDs that have at least one edge
      const connectedNodeIds = new Set();
      filteredEdges.forEach(edge => {
        connectedNodeIds.add(edge.data.source);
        connectedNodeIds.add(edge.data.target);
      });
      
      // Keep only nodes that have at least one connection
      // BUT: If user explicitly selected devices, show them even without connections
      let finalNodes;
      if (selectedDevices.length > 0) {
        // When devices are explicitly selected, show all selected nodes even if disconnected
        finalNodes = filteredNodes;
      } else {
        // For other filters, only show nodes with connections
        finalNodes = filteredNodes.filter(node => connectedNodeIds.has(node.data.id));
      }
      
      // Combine nodes and edges
      const finalElements = [...finalNodes, ...filteredEdges];
      
      console.log('Final elements:', finalNodes.length, 'nodes,', filteredEdges.length, 'edges');
      setElements(finalElements);
    }
  }, [linkTypeFilters, allElements, searchTerm, searchField, selectedDevicemodels, showUnmanagedDevices, selectedDevices]);

  // Center and fit the graph when cy instance is ready and elements are loaded
  useEffect(() => {
    if (!cy || elements.length === 0) return;

    // Stop any running layout before starting a new one
    if (layoutRef.current) {
      try {
        layoutRef.current.stop();
      } catch (e) {
        console.warn('Error stopping previous layout:', e);
      }
    }

    // Remove all previous event handlers to prevent duplicates
    cy.removeAllListeners();

    // Run the new layout with error handling
    try {
      const layoutConfig = getLayoutConfig(layoutType);
      layoutRef.current = cy.layout(layoutConfig);
      layoutRef.current.run();
    } catch (error) {
      console.error('Layout error:', error);
      // Fallback to a simple circle layout if there's an error
      try {
        layoutRef.current = cy.layout({ name: 'circle', fit: true, padding: 50 });
        layoutRef.current.run();
      } catch (fallbackError) {
        console.error('Fallback layout error:', fallbackError);
      }
    }

    // Add event handlers for highlighting neighbors on left click
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      
      // Clear previous selection
      cy.elements().removeClass('dimmed highlighted');
      setSelectedEdge(null);
      setContextMenu(null);
      
      // Get neighbors and connected edges
      const neighborhood = node.neighborhood();
      const connectedEdges = node.connectedEdges();
      
      // Dim all elements first
      cy.elements().addClass('dimmed');
      
      // Highlight selected node, its neighbors, and connected edges
      node.removeClass('dimmed').addClass('highlighted');
      neighborhood.removeClass('dimmed').addClass('highlighted');
      connectedEdges.removeClass('dimmed').addClass('highlighted');
    });

    // Add event handler for edge left clicks
    cy.on('tap', 'edge', function(evt) {
      const edge = evt.target;
      
      // Clear previous selection
      cy.elements().removeClass('dimmed highlighted');
      setSelectedNode(null);
      setContextMenu(null);
      
      // Highlight the selected edge and its nodes
      cy.elements().addClass('dimmed');
      edge.removeClass('dimmed').addClass('highlighted');
      edge.source().removeClass('dimmed').addClass('highlighted');
      edge.target().removeClass('dimmed').addClass('highlighted');
    });

    // Right-click context menu for nodes
    cy.on('cxttap', 'node', function(evt) {
      const node = evt.target;
      const renderedPosition = node.renderedPosition();
      setContextMenu({
        type: 'node',
        data: node.data(),
        position: { x: renderedPosition.x, y: renderedPosition.y }
      });
    });

    // Right-click context menu for edges
    cy.on('cxttap', 'edge', function(evt) {
      const edge = evt.target;
      const midpoint = edge.midpoint();
      const pan = cy.pan();
      const zoom = cy.zoom();
      setContextMenu({
        type: 'edge',
        data: edge.data(),
        position: { 
          x: midpoint.x * zoom + pan.x, 
          y: midpoint.y * zoom + pan.y 
        }
      });
    });

    // Reset when clicking on background
    cy.on('tap', function(evt) {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed highlighted');
        setSelectedNode(null);
        setSelectedEdge(null);
        setContextMenu(null);
        setNodeAlerts([]);
      }
    });

    // Cleanup function
    return () => {
      if (layoutRef.current) {
        try {
          layoutRef.current.stop();
        } catch (e) {
          console.warn('Error stopping layout on cleanup:', e);
        }
      }
    };
  }, [cy, elements, layoutType]);

  // Render alert count badges on nodes
  useEffect(() => {
    if (!cy || Object.keys(alertCounts).length === 0) return;

    // Remove existing badges
    document.querySelectorAll('.alert-badge').forEach(el => el.remove());

    // Add badges for nodes with alerts
    cy.nodes().forEach(node => {
      const deviceIP = node.data('device_ip');
      const alertCount = alertCounts[deviceIP];
      
      if (alertCount && alertCount > 0) {
        const nodeId = node.id();
        
        // Create badge element
        const badge = document.createElement('div');
        badge.className = 'alert-badge';
        badge.setAttribute('data-node-id', nodeId);
        badge.textContent = alertCount > 99 ? '99+' : alertCount;
        
        // Make it circular - adjust size based on content
        const badgeSize = alertCount > 99 ? '28px' : (alertCount > 9 ? '24px' : '20px');
        const fontSize = alertCount > 99 ? '9px' : '10px';
        
        badge.style.cssText = `
          position: absolute;
          background: #F44336;
          color: white;
          border-radius: 50%;
          font-size: ${fontSize};
          font-weight: bold;
          pointer-events: none;
          z-index: 1000;
          width: ${badgeSize};
          height: ${badgeSize};
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          border: 2px solid white;
          line-height: 1;
        `;
        
        document.body.appendChild(badge);
        
        // Function to update badge position
        const updateBadgePosition = () => {
          const pos = node.renderedPosition();
          const zoom = cy.zoom();
          const pan = cy.pan();
          
          // Position to overlap the top-right corner of the node
          // Node size is 60px (radius 30px from center)
          const badgeSizeNum = parseInt(badgeSize);
          const halfBadge = badgeSizeNum / 2;
          
          // Position badge center at (pos.x + 15, pos.y - 15) for nice overlap
          // Then subtract half the badge size to position the top-left corner
          const badgeCenterX = pos.x + 15;
          const badgeCenterY = pos.y - 15;
          
          badge.style.left = `${badgeCenterX - halfBadge}px`;
          badge.style.top = `${badgeCenterY - halfBadge}px`;
        };
        
        // Initial position
        updateBadgePosition();
        
        // Update position on pan/zoom
        cy.on('pan zoom', updateBadgePosition);
        cy.on('position', `node[id="${nodeId}"]`, updateBadgePosition);
      }
    });

    // Cleanup
    return () => {
      document.querySelectorAll('.alert-badge').forEach(el => el.remove());
    };
  }, [cy, alertCounts, elements]);

  // Update stylesheet when theme changes
  useEffect(() => {
    if (!cy) return;
    cy.style(stylesheet);
  }, [cy, isDarkTheme, labelDisplayMode]);

//   const elements = [
//     { data: { id: 'one', label: 'Node 1' } },
//     { data: { id: 'two', label: 'Node 2' } },
//     { data: { id: 'edge1', source: 'one', target: 'two' } }
//   ];

  // Get router icon path based on environment
  const routerIconPath = import.meta.env.DEV 
    ? '/router.png' 
    : '/assets/img/icons/blue_outline/router.png';

  const stylesheet = [
    {
      selector: 'node',
      style: {
        // Opaque background circle behind the icon - theme-aware
        'background-color': isDarkTheme ? '#1a1a1a' : '#e8e8e8',
        'background-opacity': 1,
        // Icon on top of the background
        'background-image': routerIconPath,
        'background-fit': 'cover',
        'background-clip': 'none',
        'background-image-opacity': 1,
        'label': (ele) => {
          const data = ele.data();
          return labelDisplayMode === 'ip' ? (data.device_ip || data.label) : data.label;
        },
        'color': isDarkTheme ? '#ffffff' : '#000000',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'font-size': 10,
        'font-weight': '600',
        'width': 60,
        'height': 60,
        'z-index': 999,
        // Fully opaque label background - theme-aware
        'text-background-color': isDarkTheme ? '#000000' : '#ffffff',
        'text-background-opacity': 0.95,
        'text-background-padding': '4px',
        'text-background-shape': 'roundrectangle',
        // Text outline for better contrast - theme-aware
        'text-outline-color': isDarkTheme ? '#000000' : '#ffffff',
        'text-outline-width': 2,
        'text-outline-opacity': 1,
        // Node border for prominence - theme-aware
        'border-width': 3,
        'border-color': isDarkTheme ? '#ffffff' : '#333333',
        'border-opacity': isDarkTheme ? 0.6 : 0.8,
        'border-style': 'solid',
        // Make the node shape visible
        'shape': 'ellipse'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': (ele) => getLinkColor(ele.data('link_type')),
        'curve-style': 'bezier',
        'z-index': 1
      }
    },
    // Specific styles for each link type
    {
      selector: 'edge[link_type *= "CDP"], edge[link_type *= "cdp"]',
      style: {
        'line-color': linkTypeColors.CDP,
        'width': 3
      }
    },
    {
      selector: 'edge[link_type *= "LLDP"], edge[link_type *= "lldp"]',
      style: {
        'line-color': linkTypeColors.LLDP,
        'width': 3
      }
    },
    {
      selector: 'edge[link_type *= "ISIS"], edge[link_type *= "isis"]',
      style: {
        'line-color': linkTypeColors.ISIS,
        'width': 3
      }
    },
    {
      selector: 'edge[link_type *= "BGP"], edge[link_type *= "bgp"]',
      style: {
        'line-color': linkTypeColors.BGP,
        'width': 3
      }
    },
    {
      selector: 'edge[link_type *= "OSPF"], edge[link_type *= "ospf"]',
      style: {
        'line-color': linkTypeColors.OSPF,
        'width': 3
      }
    },
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.3
      }
    },
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.3,
        'background-opacity': 1,
        'text-background-opacity': 1
      }
    },
    {
      selector: '.highlighted',
      style: {
        'opacity': 1
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 5,
        'border-color': '#0074D9',
        'border-style': 'solid',
        'border-opacity': 1,
        'z-index': 1000,
        'background-color': isDarkTheme ? '#2a2a2a' : '#d0d0d0',
        'background-opacity': 1
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'width': 5,
        'line-color': '#0074D9',
        'z-index': 10
      }
    }
  ];

  // Helper function to determine node layer based on label
  const getNodeLayer = (node) => {
    const label = node.data('label') || '';
    const labelUpper = label.toUpperCase();
    
    if (labelUpper.includes('CORE')) {
      return 3; // Innermost layer (highest value)
    } else if (labelUpper.includes('PE')) {
      return 2; // Middle layer
    } else if (labelUpper.includes('PRE')) {
      return 1; // Outermost layer (lowest value)
    } else {
      return 0; // Unknown/other nodes
    }
  };

  // Function to get layout configuration based on selected type
  const getLayoutConfig = (type) => {
    const baseConfig = {
      fit: true,
      padding: 50,
      animate: false
    };

    switch(type) {
      case 'network-hierarchy':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: getNodeLayer,
          levelWidth: () => 1,
          spacingFactor: 2.0,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          minNodeSpacing: 20
        };
      case 'breadthfirst-circle':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: true,
          circle: true,
          spacingFactor: 1.5,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false
        };
      case 'breadthfirst-linear':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: true,
          circle: false,
          spacingFactor: 1.5,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false
        };
      case 'grid':
        return {
          ...baseConfig,
          name: 'grid',
          avoidOverlap: true,
          avoidOverlapPadding: 10,
          nodeDimensionsIncludeLabels: false
        };
      case 'circle':
        return {
          ...baseConfig,
          name: 'circle',
          avoidOverlap: true,
          spacingFactor: 1.2
        };
      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: (node) => node.degree(),
          levelWidth: () => 2,
          spacingFactor: 1.5,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true
        };
      case 'cose':
        return {
          ...baseConfig,
          name: 'cose',
          nodeRepulsion: 400000,
          nodeOverlap: 20,
          idealEdgeLength: 100,
          edgeElasticity: 200,
          nestingFactor: 5,
          gravity: 80,
          numIter: 2000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
          randomize: false
        };
      default:
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: getNodeLayer,
          levelWidth: () => 1,
          spacingFactor: 2.0,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true,
          minNodeSpacing: 80
        };
    }
  };

  const layout = getLayoutConfig(layoutType);

  const handleLinkTypeToggle = (linkType) => {
    setLinkTypeFilters(prev => ({
      ...prev,
      [linkType]: !prev[linkType]
    }));
  };

  const handleFitToWindow = () => {
    if (cy) {
      cy.fit(null, 50); // Fit with 50px padding
    }
  };

  const handleReload = () => {
    if (cy && elements.length > 0) {
      // Stop any running layout
      if (layoutRef.current) {
        try {
          layoutRef.current.stop();
        } catch (e) {
          console.warn('Error stopping previous layout:', e);
        }
      }
      
      // Re-run the current layout
      try {
        const layoutConfig = getLayoutConfig(layoutType);
        layoutRef.current = cy.layout(layoutConfig);
        layoutRef.current.run();
      } catch (error) {
        console.error('Layout error:', error);
      }
    }
  };

  const handleZoomIn = () => {
    if (cy) {
      cy.zoom({
        level: cy.zoom() * 1.2,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
      });
    }
  };

  const handleZoomOut = () => {
    if (cy) {
      cy.zoom({
        level: cy.zoom() * 0.8,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
      });
    }
  };

  const handleResetAll = () => {
    // Reset all filters and settings to default
    setLinkTypeFilters({
      'CDP': true,
      'LLDP': true,
      'ISIS': true,
      'BGP': true,
      'OSPF': true
    });
    setShowUnmanagedDevices(true);
    setSearchTerm('');
    setSearchField('label');
    setSelectedDevicemodels([]);
    setSelectedDevices([]);
    setPendingFilterDevices([]);
    setShowDevicePopup(false);
    setLayoutType('network-hierarchy');
    setSelectedNode(null);
    setSelectedEdge(null);
    setContextMenu(null);
    
    // Clear highlighting
    if (cy) {
      cy.elements().removeClass('dimmed highlighted');
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'var(--bg)' }}>
      <style>{`
        /* Custom scrollbar for left panel */
        .control-panel-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .control-panel-scroll::-webkit-scrollbar-track {
          background: var(--cfx3rdlevel);
          border-radius: 4px;
        }
        .control-panel-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }
        .control-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
        }
        /* For Firefox */
        .control-panel-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--border) var(--cfx3rdlevel);
        }
      `}</style>
      {/* Toggle Control Panel Button */}
      <button
        onClick={() => setShowControlPanel(!showControlPanel)}
        title={showControlPanel ? "Hide Control Panel" : "Show Control Panel"}
        style={{
          position: 'absolute',
          top: '20px',
          left: showControlPanel ? '320px' : '20px',
          width: '44px',
          height: '44px',
          padding: '0',
          background: 'var(--primary)',
          color: 'var(--text)',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          boxShadow: 'var(--elevation-2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
      >
        {showControlPanel ? '◀' : '▶'}
      </button>

      {/* Left Side Panel */}
      {showControlPanel && (
        <div className="control-panel-scroll" style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          overflowX: 'visible',
          paddingRight: '5px'
        }}>
        {/* Control Panel - Compact */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: 'var(--elevation-2)'
        }}>
          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleZoomIn} title="Zoom In" className="action-btn"
              style={{ width: '44px', height: '44px', padding: '0', background: 'var(--primary)', color: 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}>
              <SearchPlusIcon />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out" className="action-btn"
              style={{ width: '44px', height: '44px', padding: '0', background: 'var(--primary)', color: 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}>
              <SearchMinusIcon />
            </button>
            <button onClick={handleFitToWindow} title="Fit to Window" className="action-btn"
              style={{ width: '44px', height: '44px', padding: '0', background: 'var(--primary)', color: 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}>
              <ExpandIcon />
            </button>
            <button onClick={handleReload} title="Redraw Layout" className="action-btn"
              style={{ width: '44px', height: '44px', padding: '0', background: 'var(--primary)', color: 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}>
              <SyncAltIcon />
            </button>
            <button onClick={handleResetAll} title="Reset All" className="action-btn"
              style={{ width: '44px', height: '44px', padding: '0', background: 'var(--error)', color: 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--red)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--error)'}>
              <UndoIcon />
            </button>
          </div>
          
          {/* Layout Selector */}
          <select value={layoutType} onChange={(e) => setLayoutType(e.target.value)} className="sort-select"
            style={{ width: '100%', padding: '6px', fontSize: '11px' }}>
            <optgroup label="Network Layouts">
              <option value="network-hierarchy">Network Hierarchy</option>
            </optgroup>
            <optgroup label="Standard Layouts">
              <option value="breadthfirst-circle">Breadthfirst (Circular)</option>
              <option value="breadthfirst-linear">Breadthfirst (Linear)</option>
              <option value="concentric">Concentric (By Degree)</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
              <option value="cose">Force-Directed (COSE)</option>
            </optgroup>
          </select>
        </div>

        {/* Summary & Display Options - Compact */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: 'var(--elevation-2)'
        }}>
          {/* Summary Stats - Compact Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--text)',
            marginBottom: '8px'
          }}>
            <div style={{ background: 'var(--accent-light)', padding: '4px 6px', borderRadius: '3px' }}>
              <div>Total: <strong>{allElements.filter(e => !e.data.source && !e.data.target).length}</strong> nodes</div>
            </div>
            <div style={{ background: 'var(--accent-light)', padding: '4px 6px', borderRadius: '3px' }}>
              <div>Total: <strong>{allElements.filter(e => e.data.source && e.data.target).length}</strong> edges</div>
            </div>
            <div style={{ background: 'var(--accent-light)', padding: '4px 6px', borderRadius: '3px' }}>
              <div>Visible: <strong>{elements.filter(e => !e.data.source && !e.data.target).length}</strong> nodes</div>
            </div>
            <div style={{ background: 'var(--accent-light)', padding: '4px 6px', borderRadius: '3px' }}>
              <div>Visible: <strong>{elements.filter(e => e.data.source && e.data.target).length}</strong> edges</div>
            </div>
          </div>
          
          {/* Display Options - Horizontal */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="labelDisplayMode" value="hostname" checked={labelDisplayMode === 'hostname'}
                onChange={(e) => setLabelDisplayMode(e.target.value)} style={{ cursor: 'pointer' }} />
              <span>Hostname</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="labelDisplayMode" value="ip" checked={labelDisplayMode === 'ip'}
                onChange={(e) => setLabelDisplayMode(e.target.value)} style={{ cursor: 'pointer' }} />
              <span>IP</span>
            </label>
          </div>
        </div>

        {/* Search/Filter by Node */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: 'var(--elevation-2)'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '12px', 
              color: 'var(--primary)'
            }}>
              Filter Devices
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(selectedDevices.length > 0 || searchTerm.trim() !== '' || selectedDevicemodels.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedDevices([]);
                    setPendingFilterDevices([]);
                    setSearchTerm('');
                    setSelectedDevicemodels([]);
                  }}
                  className="action-btn"
                  title="Clear all filters and show all devices"
                  style={{
                    width: '44px',
                    height: '44px',
                    padding: '0',
                    background: 'var(--error)',
                    color: 'var(--text)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--red)'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--error)'}
                >
                  <FilterCircleXmarkIcon />
                </button>
              )}
              <button
                onClick={() => setShowDevicePopup(true)}
                className="action-btn"
                title="Open device selection table"
                style={{
                  width: '44px',
                  height: '44px',
                  padding: '0',
                  background: 'var(--primary)',
                  color: 'var(--text)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
              >
                <FilterIcon />
              </button>
              <button
                onClick={() => setShowFilterHelp(true)}
                className="action-btn"
                title="Show how to filter"
                style={{
                  width: '44px',
                  height: '44px',
                  padding: '0',
                  background: 'var(--cfx3rdlevel)',
                  color: 'var(--primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--primary)';
                  e.target.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--cfx3rdlevel)';
                  e.target.style.color = 'var(--primary)';
                }}
              >
                <InfoCircleIcon />
              </button>
            </div>
          </div>
          
          {/* Filter Status */}
          {(selectedDevices.length > 0 || searchTerm.trim() !== '' || selectedDevicemodels.length > 0) && (
            <div style={{
              background: 'var(--accent-light)',
              border: '1px solid var(--accent-border)',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '10px',
              fontSize: '11px',
              color: 'var(--text)'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}>
                Active Filters:
              </div>
              {selectedDevices.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ fontWeight: '600' }}>
                    • {selectedDevices.length} device{selectedDevices.length !== 1 ? 's' : ''} selected
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-secondary)', 
                    marginLeft: '12px',
                    marginTop: '2px',
                    fontStyle: 'italic'
                  }}>
                    {(() => {
                      const deviceNames = selectedDevices
                        .map(id => {
                          const device = allDevices.find(d => d.id === id);
                          return device ? (device.label || device.hostname || device.id) : id;
                        })
                        .slice(0, 5);
                      
                      const displayText = deviceNames.join(', ');
                      return selectedDevices.length > 5 
                        ? `${displayText}, ... (+${selectedDevices.length - 5} more)`
                        : displayText;
                    })()}
                  </div>
                </div>
              )}
              {searchTerm.trim() !== '' && (
                <div>• Text search: "{searchTerm}"</div>
              )}
              {selectedDevicemodels.length > 0 && (
                <div>• {selectedDevicemodels.length} device model{selectedDevicemodels.length !== 1 ? 's' : ''}</div>
              )}
            </div>
          )}
          
          <div style={{ marginBottom: '10px' }}>
            <select
              value={searchField}
              onChange={(e) => {
                setSearchField(e.target.value);
                setSearchTerm('');
                setSelectedDevicemodels([]);
              }}
              className="sort-select"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '12px'
              }}
            >
              <option value="label">Label</option>
              <option value="device_model">Device Family</option>
              <option value="device_ip">Device IP</option>
            </select>
          </div>
          
          {searchField === 'device_model' ? (
            <div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '8px',
                background: 'var(--cfx3rdlevel)'
              }}>
                {devicemodels.length > 0 ? (
                  devicemodels.map(family => (
                    <label 
                      key={family} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '8px', 
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedDevicemodels.includes(family)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDevicemodels([...selectedDevicemodels, family]);
                            } else {
                              setSelectedDevicemodels(selectedDevicemodels.filter(f => f !== family));
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ flex: 1 }}>{family}</span>
                      </div>
                      <span style={{ 
                        background: 'var(--primary)', 
                        color: 'var(--text)', 
                        padding: '2px 6px', 
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        minWidth: '25px',
                        textAlign: 'center'
                      }}>
                        {deviceModelCounts[family] || 0}
                      </span>
                    </label>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                    No device models found
                  </div>
                )}
              </div>
              {selectedDevicemodels.length > 0 && (
                <button
                  onClick={() => setSelectedDevicemodels([])}
                  className="action-btn"
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '6px',
                    background: 'var(--cfx3rdlevel)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Clear Selection ({selectedDevicemodels.length} selected)
                </button>
              )}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={`Search by ${searchField}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{
                  width: '100%',
                  padding: '8px 30px 8px 8px',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    padding: '0 5px'
                  }}
                  title="Clear search"
                >
                  <TimesIcon />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Device Filters */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: 'var(--elevation-2)'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '12px', 
            marginBottom: '6px',
            color: 'var(--primary)'
          }}>
            Device Filters
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showUnmanagedDevices}
                onChange={(e) => setShowUnmanagedDevices(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px' }}>Show Unmanaged Devices</span>
            </label>
          </div>
        </div>

        {/* Pending Filter Devices */}
        {pendingFilterDevices.length > 0 && (
          <div style={{
            background: 'var(--card)',
            border: '2px solid var(--primary)',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: 'var(--elevation-4)'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '12px', 
              marginBottom: '8px',
              color: 'var(--primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📋 Devices to Filter ({pendingFilterDevices.length})</span>
              <button
                onClick={() => setPendingFilterDevices([])}
                title="Clear all pending devices"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--error)',
                  fontSize: '16px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <TimesIcon />
              </button>
            </div>
            
            <div style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontStyle: 'italic'
            }}>
              Right-click devices in the graph to add them here
            </div>
            
            {/* Device List */}
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              marginBottom: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--cfx3rdlevel)'
            }}>
              {pendingFilterDevices.map((device, idx) => (
                <div
                  key={device.id}
                  style={{
                    padding: '8px',
                    borderBottom: idx < pendingFilterDevices.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    background: idx % 2 === 0 ? 'var(--cfx3rdlevel)' : 'var(--card)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {device.label || device.hostname || device.id}
                    </div>
                    {device.ip && (
                      <div style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '10px',
                        marginTop: '2px'
                      }}>
                        {device.ip}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPendingFilterDevices(pendingFilterDevices.filter(d => d.id !== device.id));
                    }}
                    title="Remove"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--error)',
                      fontSize: '14px',
                      padding: '4px',
                      marginLeft: '8px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <TimesIcon />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Apply Filter Button */}
            <button
              onClick={() => {
                setSelectedDevices(pendingFilterDevices.map(d => d.id));
                setPendingFilterDevices([]);
              }}
              className="action-btn"
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--green)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--success)'}
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Link Type Filters */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: 'var(--elevation-2)'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '12px', 
            marginBottom: '6px',
            color: 'var(--primary)'
          }}>
            Link Type Filters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(linkTypeFilters).map(linkType => (
              <label key={linkType} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={linkTypeFilters[linkType]}
                  onChange={() => handleLinkTypeToggle(linkType)}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ 
                  width: '25px', 
                  height: '3px', 
                  backgroundColor: linkTypeColors[linkType] 
                }}></div>
                <span style={{ fontSize: '12px' }}>{linkType}</span>
              </label>
            ))}
          </div>
        </div>
        </div>
      )}

      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={layout}
        style={{ width: '100%', height: '100%' }}
        cy={(cyInstance) => {
          setCy(cyInstance);
        }}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: `${contextMenu.position.x + 10}px`,
            top: `${contextMenu.position.y + 10}px`,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--elevation-4)',
            zIndex: 1001,
            minWidth: '180px',
            padding: 0
          }}
        >
          <button
            onClick={() => {
              if (contextMenu.type === 'node') {
                setSelectedNode(contextMenu.data);
                setPopupPosition(contextMenu.position);
                setActiveTab('details');
              } else {
                setSelectedEdge(contextMenu.data);
                setPopupPosition(contextMenu.position);
              }
              setContextMenu(null);
            }}
            className="action-btn"
            style={{
              width: '100%',
              padding: '10px 15px',
              background: 'var(--card)',
              color: 'var(--primary)',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left',
              fontWeight: '500',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--accent-light)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--card)'}
          >
            {contextMenu.type === 'node' ? 'Show Node Details' : 'Show Link Details'}
          </button>
          {contextMenu.type === 'node' && (
            <>
              <button
                onClick={() => {
                  const device = allDevices.find(d => d.id === contextMenu.data.id);
                  if (device && !pendingFilterDevices.find(d => d.id === device.id)) {
                    setPendingFilterDevices([...pendingFilterDevices, device]);
                  }
                  setContextMenu(null);
                }}
                className="action-btn"
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  background: 'var(--card)',
                  color: 'var(--primary)',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  fontWeight: '500',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--accent-light)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--card)'}
              >
                Add to Filter
              </button>
              <button
                onClick={() => {
                  if (!cy) return;
                  
                  // Get the selected node
                  const node = cy.getElementById(contextMenu.data.id);
                  if (!node) return;
                  
                  // Get all neighbor nodes
                  const neighbors = node.neighborhood('node');
                  
                  // Collect all device IDs to filter (selected node + neighbors)
                  const deviceIdsToShow = [];
                  
                  // Add the selected node
                  deviceIdsToShow.push(contextMenu.data.id);
                  
                  // Add all neighbor nodes
                  neighbors.forEach(neighborNode => {
                    deviceIdsToShow.push(neighborNode.id());
                  });
                  
                  // Directly apply the filter
                  setSelectedDevices(deviceIdsToShow);
                  
                  // Clear pending devices
                  setPendingFilterDevices([]);
                  
                  setContextMenu(null);
                }}
                className="action-btn"
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  background: 'var(--card)',
                  color: 'var(--primary)',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  fontWeight: '500',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--accent-light)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--card)'}
              >
                Show Node + Neighbors
              </button>
            </>
          )}
          <button
            onClick={() => setContextMenu(null)}
            className="action-btn"
            style={{
              width: '100%',
              padding: '10px 15px',
              background: 'var(--card)',
              color: 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left',
              fontWeight: '500',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--cfx3rdlevel)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--card)'}
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Node Details Popup */}
      {selectedNode && cy && (
        <div
          style={{
            position: 'absolute',
            left: `${popupPosition.x + 20}px`,
            top: `${popupPosition.y - 20}px`,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--elevation-8)',
            padding: '15px',
            minWidth: '500px',
            maxWidth: '500%',
            maxHeight: '500px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '16px', 
            marginBottom: '15px',
            color: 'var(--primary)',
            borderBottom: '2px solid var(--primary)',
            paddingBottom: '8px'
          }}>
            {selectedNode.label || selectedNode.id}
          </div>
          
          {/* Tab Navigation */}
          <div className="tabs-nav" style={{ 
            display: 'flex', 
            marginBottom: '15px',
            borderBottom: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setActiveTab('details')}
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                flex: 1
              }}
            >
              Device Details
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`tab-btn ${activeTab === 'links' ? 'active' : ''}`}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                flex: 1
              }}
            >
              Links ({cy.getElementById(selectedNode.id).connectedEdges().length})
            </button>
            <button
              onClick={() => {
                setActiveTab('alerts');
                if (selectedNode.device_ip) {
                  fetchNodeAlerts(selectedNode.device_ip);
                }
              }}
              className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                flex: 1
              }}
            >
              Alerts {alertCounts[selectedNode.device_ip] ? `(${alertCounts[selectedNode.device_ip]})` : ''}
            </button>
          </div>
          
          {/* Tab Content */}
          {activeTab === 'details' && (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <tbody>
                {Object.entries(selectedNode)
                  .filter(([key]) => key !== 'label' && key !== 'id')
                  .filter(([, value]) => value !== null && value !== undefined)
                  .map(([key, value]) => {
                    // Format the key to be more readable
                    const formattedKey = key
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase());
                    
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{
                          padding: '10px 8px',
                          color: 'var(--text-secondary)',
                          fontWeight: '600',
                          verticalAlign: 'top',
                          width: '40%',
                          background: 'var(--cfx3rdlevel)'
                        }}>
                          {formattedKey}
                        </td>
                        <td style={{
                          padding: '10px 8px',
                          color: 'var(--text)',
                          fontWeight: '400',
                          wordBreak: 'break-word'
                        }}>
                          {String(value)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
          
          {activeTab === 'links' && (
            <div style={{ maxHeight: '100%', maxWidth: '100%', overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{
                minWidth: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: 'var(--primary)', color: 'var(--text)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Source Device</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Source Port</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Target Device</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Target Port</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Source IP</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Target IP</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Link Type</th>
                  </tr>
                </thead>
                <tbody>
                  {cy.getElementById(selectedNode.id).connectedEdges().map((edge, idx) => {
                    const edgeData = edge.data();
                    
                    return (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'var(--cfx3rdlevel)' : 'var(--card)'
                      }}>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.source_device || edgeData.source || '-'}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.source_port || '-'}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.target_device || edgeData.target || '-'}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.target_port || '-'}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.left_ip || '-'}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.right_ip || '-'}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {edgeData.link_type || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {cy.getElementById(selectedNode.id).connectedEdges().length === 0 && (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: 'var(--text-muted)',
                  fontSize: '12px'
                }}>
                  No links found for this device
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'alerts' && (
            <div style={{ maxHeight: '100%', maxWidth: '100%', overflowY: 'auto', overflowX: 'auto' }}>
              {loadingAlerts ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: 'var(--text-muted)',
                  fontSize: '12px'
                }}>
                  Loading alerts...
                </div>
              ) : nodeAlerts.length > 0 ? (
                <table style={{
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px'
                }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--primary)', color: 'var(--text)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Severity</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Type</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', minWidth: '200px' }}>Message</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Raised Time</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Ticket ID</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Incident ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodeAlerts.map((alert, idx) => {
                      // Format the timestamp
                      let raisedTime = '-';
                      if (alert.a_raised_ts) {
                        try {
                          const date = new Date(alert.a_raised_ts);
                          raisedTime = date.toLocaleString();
                        } catch (e) {
                          raisedTime = alert.a_raised_ts;
                        }
                      }
                      
                      // Determine severity color
                      const severityColors = {
                        'CRITICAL': '#F44336',
                        'MAJOR': '#FF9800',
                        'MINOR': '#FFC107',
                        'WARNING': '#2196F3',
                        'INFO': '#4CAF50'
                      };
                      const severityColor = severityColors[alert.a_severity] || 'var(--text)';
                      
                      return (
                        <tr key={idx} style={{ 
                          borderBottom: '1px solid var(--border)',
                          background: idx % 2 === 0 ? 'var(--cfx3rdlevel)' : 'var(--card)'
                        }}>
                          <td style={{ 
                            padding: '8px', 
                            whiteSpace: 'nowrap',
                            color: severityColor,
                            fontWeight: '600'
                          }}>
                            {alert.a_severity || '-'}
                          </td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                            {alert.a_alert_type || '-'}
                          </td>
                          <td style={{ 
                            padding: '8px',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'normal'
                          }}>
                            {alert.a_message || '-'}
                          </td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap', fontSize: '10px' }}>
                            {raisedTime}
                          </td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                            {alert.a_ticket_id || '-'}
                          </td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                            {alert.a_incident_id || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: 'var(--text-muted)',
                  fontSize: '12px'
                }}>
                  No active alerts found for this device
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => {
              setSelectedNode(null);
              setNodeAlerts([]);
            }}
            className="action-btn"
            style={{
              marginTop: '15px',
              width: '100%',
              padding: '10px',
              background: 'var(--primary)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Close
          </button>
        </div>
      )}
      
      {/* Edge Details Popup */}
      {selectedEdge && (
        <div
          style={{
            position: 'absolute',
            left: `${popupPosition.x + 20}px`,
            top: `${popupPosition.y - 20}px`,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--elevation-8)',
            padding: '15px',
            minWidth: '400px',
            maxWidth: '500px',
            maxHeight: '500px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '16px', 
            marginBottom: '15px',
            color: 'var(--primary)',
            borderBottom: '2px solid var(--primary)',
            paddingBottom: '8px'
          }}>
            Link Details
          </div>
          
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px'
          }}>
            <tbody>
              {Object.entries(selectedEdge)
                .filter(([key]) => key !== 'source' && key !== 'target')
                .filter(([, value]) => value !== null && value !== undefined)
                .map(([key, value]) => {
                  // Format the key to be more readable
                  const formattedKey = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{
                        padding: '10px 8px',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        verticalAlign: 'top',
                        width: '40%',
                        background: 'var(--cfx3rdlevel)'
                      }}>
                        {formattedKey}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        color: 'var(--text)',
                        fontWeight: '400',
                        wordBreak: 'break-word'
                      }}>
                        {String(value)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          
          <button
            onClick={() => setSelectedEdge(null)}
            className="action-btn"
            style={{
              marginTop: '15px',
              width: '100%',
              padding: '10px',
              background: 'var(--primary)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
          Close
        </button>
      </div>
    )}
    
    {/* Filter Help Popup */}
    {showFilterHelp && (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setShowFilterHelp(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            backdropFilter: 'blur(2px)'
          }}
        />
        
        {/* Popup */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--elevation-24)',
            zIndex: 2001,
            width: '90vw',
            maxWidth: '500px',
            padding: '20px'
          }}
        >
          {/* Header */}
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '15px',
            color: 'var(--text)',
            borderBottom: '2px solid var(--primary)',
            paddingBottom: '8px'
          }}>
            Filter Methods
          </div>
          
          {/* Content */}
          <div style={{
            fontSize: '13px',
            color: 'var(--text)',
            lineHeight: '1.8'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>
                1. Quick Text Search
              </div>
              <div style={{ paddingLeft: '15px', color: 'var(--text-secondary)' }}>
                Use the search field below to filter by device label or IP address
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>
                2. Table Selection
              </div>
              <div style={{ paddingLeft: '15px', color: 'var(--text-secondary)' }}>
                Click the filter icon button to select multiple devices from a table
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>
                3. Right-Click Menu
              </div>
              <div style={{ paddingLeft: '15px', color: 'var(--text-secondary)' }}>
                • <strong>Add to Filter</strong> (staged): Add devices to pending list, then apply<br/>
                • <strong>Show Node + Neighbors</strong> (instant): Immediately show only the selected node and its connected neighbors
              </div>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={() => setShowFilterHelp(false)}
            className="action-btn"
            style={{
              marginTop: '15px',
              width: '100%',
              padding: '10px',
              background: 'var(--primary)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
          >
            Got it!
          </button>
        </div>
      </>
    )}
    
    {/* Device Selection Popup */}
    {showDevicePopup && (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setShowDevicePopup(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            backdropFilter: 'blur(2px)'
          }}
        />
        
        {/* Popup */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--elevation-24)',
            zIndex: 2001,
            width: '90vw',
            maxWidth: '900px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '2px solid var(--primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '18px', 
                color: 'var(--text)',
                fontWeight: 'bold'
              }}>
                🔍 Select Devices to Filter
              </h3>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: '12px', 
                color: 'var(--text-secondary)' 
              }}>
                Use this table to select devices by their details
              </p>
              <p style={{ 
                margin: '2px 0 0 0', 
                fontSize: '11px', 
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}>
                {selectedDevices.length} of {allDevices.length} devices selected
              </p>
            </div>
            <button
              onClick={() => setShowDevicePopup(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '24px',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              <TimesIcon />
            </button>
          </div>
          
          {/* Action Buttons */}
          <div style={{
            padding: '12px 20px',
            display: 'flex',
            gap: '12px',
            borderBottom: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setSelectedDevices(allDevices.map(d => d.id))}
              className="action-btn"
              style={{
                padding: '8px 16px',
                background: 'var(--primary)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedDevices([])}
              className="action-btn"
              style={{
                padding: '8px 16px',
                background: 'var(--cfx3rdlevel)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Clear All
            </button>
          </div>
          
          {/* Device List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <thead style={{
                position: 'sticky',
                top: 0,
                background: 'var(--primary)',
                color: 'var(--text)',
                zIndex: 1
              }}>
                <tr>
                  <th style={{ 
                    padding: '10px 8px', 
                    textAlign: 'left',
                    width: '40px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedDevices.length === allDevices.length && allDevices.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDevices(allDevices.map(d => d.id));
                        } else {
                          setSelectedDevices([]);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Hostname</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>IP Address</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Device Model</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Vendor</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Location</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allDevices.map((device, idx) => (
                  <tr
                    key={device.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: selectedDevices.includes(device.id) 
                        ? 'var(--accent-light)' 
                        : (idx % 2 === 0 ? 'var(--cfx3rdlevel)' : 'var(--card)'),
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => {
                      if (selectedDevices.includes(device.id)) {
                        setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                      } else {
                        setSelectedDevices([...selectedDevices, device.id]);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedDevices.includes(device.id)) {
                        e.currentTarget.style.background = 'var(--cfx3rdlevel)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedDevices.includes(device.id)) {
                        e.currentTarget.style.background = idx % 2 === 0 ? 'var(--cfx3rdlevel)' : 'var(--card)';
                      }
                    }}
                  >
                    <td style={{ padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedDevices([...selectedDevices, device.id]);
                          } else {
                            setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ 
                      padding: '8px', 
                      fontWeight: '500',
                      color: 'var(--text)'
                    }}>
                      {device.label || device.hostname || '-'}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {device.ip || '-'}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {device.model || '-'}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {device.vendor || '-'}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {device.location || '-'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        background: device.mgmt_status?.toUpperCase().includes('UNMANAGED') 
                          ? 'var(--error)' 
                          : 'var(--success)',
                        color: 'white'
                      }}>
                        {device.mgmt_status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowDevicePopup(false)}
              className="action-btn"
              style={{
                padding: '10px 24px',
                background: 'var(--cfx3rdlevel)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setShowDevicePopup(false)}
              className="action-btn"
              style={{
                padding: '10px 24px',
                background: 'var(--primary)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </>
    )}
  </div>
);
};

export default TopologyGraph;
