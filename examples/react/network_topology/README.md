# Network Topology Visualization

A React-based interactive network topology visualization tool built with Cytoscape.js. This application displays network devices and their interconnections with support for various routing protocols (CDP, LLDP, ISIS, BGP, OSPF).

## Features

- **Interactive Graph Visualization**: Pan, zoom, and explore network topology
- **Multiple Layout Options**: 
  - Network Hierarchy (CORE-PE-PRE)
  - Breadthfirst (Circular)
  - Breadthfirst (Linear)
  - Concentric (By Degree)
  - Circle
  - Grid
  - Force-Directed (COSE)
- **Device Filtering**:
  - Search by hostname, device model, or IP address
  - Multi-select filter by device family
  - Show/hide unmanaged devices
- **Link Type Filtering**: Filter by CDP, LLDP, ISIS, BGP, OSPF
- **Visual Customization**:
  - Color-coded link types
  - Device icons (router images)
  - Toggle between hostname and IP address display
  - Dark/Light theme support (auto-detected)
- **Interactive Details**:
  - Right-click context menu for nodes and edges
  - Detailed node information popup (device details and connected links)
  - Edge properties popup
  - Neighbor highlighting on node selection
- **Control Panel**:
  - Zoom in/out, Fit to window, Pan controls
  - Layout selector, Redraw, Reset all filters
  - Collapsible panel for clean view

## Tech Stack

- **React** 18.2.0
- **Cytoscape.js** 3.31.1
- **react-cytoscapejs** 2.0.0
- **Axios** for API calls
- **Vite** for build tooling

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- Access to CloudFabrix RDAC platform with ArangoDB GraphDB

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

The development server will run on `http://localhost:5173` by default.

### Development Configuration

In development mode:
- The app uses a Vite proxy to forward API requests to avoid CORS issues
- A Bearer token is automatically included in API requests (defined in `src/TopologyGraph.jsx`)
- Router icon is loaded from `/router.png` in the public directory

## Production Build

### Build the Application

```bash
# Build for production
npm run build
```

This will create optimized production files in the `dist/` directory:
- `index.html` - Entry HTML file
- `index-<hash>.js` - Single bundled JavaScript file with inlined CSS
- `router.png` - Router icon image

### Build and Deploy to Dashboard

To build and automatically embed the application into `dashboard.json`:

```bash
# Run the automated build and update script
python3 build_and_update.py
```

This script will:
1. Run `npm run build`
2. Read the generated `dist/index.html` and `dist/index-*.js` files
3. Update the HTML to reference `main.js` instead of the hashed filename
4. Remove any CSS link tags (CSS is inlined in the JS bundle)
5. Embed both files into `dashboard.json` as attachments:
   - `attachments[name=index.html].value`
   - `attachments[name=main.js].value`

## Deployment

### Deploy to CloudFabrix Platform

1. **Build the application**:
   ```bash
   python3 build_and_update.py
   ```

2. **Upload dashboard.json**:
   - Change the dashboard id, title etc fieds in dashboard.json
   - Navigate to the CloudFabrix RDAF platform
   - Go to RDA Administration -> Dashboards 
   - Add or update the dashboard using the generated `dashboard.json` file


### Authentication

- **Development**: Bearer token is included automatically (hardcoded in the source)
- **Production**: The app relies on the CloudFabrix platform's session authentication. No Bearer token is sent.

The app automatically detects the environment using `import.meta.env.DEV` and adjusts accordingly.

### Theme Inheritance (iframe)

When running inside an iframe (as a custom widget in CloudFabrix dashboards):
- The app automatically copies all CSS custom properties (variables starting with `--`) from the parent window
- This ensures the widget matches the parent dashboard's theme (light/dark mode and color scheme)
- If the parent window is not accessible (cross-origin) or the app is not in an iframe, it falls back to system theme detection
- Theme synchronization happens on component mount

## Server Requirements

### GraphDB (ArangoDB) Schema

The application expects the following GraphDB collections and structure:

#### Database and Collections

- **Database**: `cfx_rdaf_topology_new`
- **Graph**: `cfx_rdaf_topology_new_graph`
- **Node Collection**: `cfx_rdaf_topology_new_nodes`
- **Edge Collection**: `cfx_rdaf_topology_new_edges`

#### Node Document Schema

Each node document in `cfx_rdaf_topology_new_nodes` should have the following fields:

```json
{
  "_key": "unique_node_id",
  "_id": "cfx_rdaf_topology_new_nodes/unique_node_id",
  "node_id": "unique_node_identifier",
  "node_label": "Device Hostname",
  "device_ip": "192.168.1.1",
  "device_family": "Cisco",
  "device_model": "Catalyst 9300",
  "device_serial_number": "SN123456789",
  "device_mgmt_status": "MANAGED",
  "device_fw_type": "IOS-XE",
  "device_fw_version": "17.3.1",
  "device_role": "ACCESS",
  "timestamp": "2024-10-19T12:00:00Z"
}
```

**Required Fields**:
- `_key` or `node_id`: Unique identifier for the node
- `node_label`: Display name (hostname)
- `device_ip`: IP address of the device

**Optional Fields** (displayed in node details popup):
- `device_family`: Device manufacturer/family
- `device_model`: Device model
- `device_serial_number`: Serial number
- `device_mgmt_status`: Management status (MANAGED/UNMANAGED)
- `device_fw_type`: Firmware type
- `device_fw_version`: Firmware version
- `device_role`: Role in network (CORE/PE/PRE/ACCESS)
- Any additional fields will be displayed in the node details popup

#### Edge Document Schema

Each edge document in `cfx_rdaf_topology_new_edges` should have the following fields:

```json
{
  "_key": "unique_edge_id",
  "_id": "cfx_rdaf_topology_new_edges/unique_edge_id",
  "_from": "cfx_rdaf_topology_new_nodes/node_id_1",
  "_to": "cfx_rdaf_topology_new_nodes/node_id_2",
  "left_id": "node_id_1",
  "right_id": "node_id_2",
  "source_device": "Device1_Hostname",
  "target_device": "Device2_Hostname",
  "source_port": "GigabitEthernet1/0/1",
  "target_port": "GigabitEthernet1/0/2",
  "source_ip": "192.168.1.1",
  "target_ip": "192.168.1.2",
  "link_type": "CDP",
  "timestamp": "2024-10-19T12:00:00Z"
}
```

**Required Fields**:
- `_from` and `_to` OR `left_id` and `right_id`: References to connected nodes
- `link_type`: Type of link (CDP, LLDP, ISIS, BGP, OSPF)

**Optional Fields** (displayed in link details):
- `source_device`, `target_device`: Device names
- `source_port`, `target_port`: Port identifiers
- `source_ip`, `target_ip`: IP addresses of link endpoints
- Any additional fields will be displayed in the edge details popup

#### AQL Queries Used

The application executes the following AQL queries:

```aql
-- Fetch all nodes
FOR n IN cfx_rdaf_topology_new_nodes RETURN n

-- Fetch all edges
FOR e IN cfx_rdaf_topology_new_edges RETURN e
```

### API Endpoint

The application expects the following API endpoint to be available:

**Endpoint**: `/api/portal/rdac/browseapi`

**Method**: `POST`

**Request Headers** (Production):
- `Content-Type: application/json`
- Session-based authentication (cookies/session tokens managed by the platform)

**Request Body**: See `getAqlBody()` function in `src/TopologyGraph.jsx` for the exact structure. The request includes:
- `reportId`: "graphdb.aql.executor"
- `query`: AQL query string
- `context`: User and project context information

**Response Format**:
```json
{
  "serviceResult": {
    "results": "[{\"_key\":\"...\", ...}, ...]"
  }
}
```

Where `results` is a JSON-stringified array of documents.

### Proxy Configuration (Development Only)

For development, Vite is configured to proxy requests:

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'https://10.95.125.190', <Replace this with your server IP address>
    changeOrigin: true,
    secure: false
  }
}
```

In production, the app makes requests directly to the relative path `/api/portal/rdac/browseapi`, which should be handled by the CloudFabrix platform's routing.

## File Structure

```
network-visualization/
├── src/
│   ├── TopologyGraph.jsx          # Main component
│   ├── App.jsx                     # App wrapper
│   ├── main.jsx                    # Entry point
│   ├── icons.jsx                   # Custom SVG icons
│   └── custom_widget_platform_compatible_style.css  # Styles
├── public/
│   └── router.png                  # Router icon (dev)
├── dist/                           # Build output
├── dashboard.json                  # CloudFabrix dashboard config
├── build_and_update.py            # Build and deploy script
├── vite.config.js                 # Vite configuration
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Customization

### Changing Database/Collection Names

Update the AQL queries in `src/TopologyGraph.jsx`:

```javascript
const nodeQuery = getAqlBody('FOR n IN YOUR_NODE_COLLECTION RETURN n', 'YOUR_DATABASE');
const edgeQuery = getAqlBody('FOR e IN YOUR_EDGE_COLLECTION RETURN e', 'YOUR_DATABASE');
```


### Changing Link Type Colors

Modify the `linkTypeColors` object in `src/TopologyGraph.jsx`:

```javascript
const linkTypeColors = {
  'CDP': '#9B59B6',      // Purple
  'LLDP': '#3498DB',     // Blue
  'ISIS': '#2ECC71',     // Green
  'BGP': '#E67E22',      // Orange
  'OSPF': '#E74C3C',     // Pink
  'default': '#95A5A6'   // Gray
};
```

### Modifying Network Hierarchy

The network hierarchy layout uses the `device_role` field. Update the `getNodeLayer()` function to change the hierarchy logic:

```javascript
const getNodeLayer = (node) => {
  const role = (node.data.device_role || '').toUpperCase();
  if (role.includes('CORE')) return 0;
  if (role.includes('PE')) return 1;
  if (role.includes('PRE')) return 2;
  return 3;
};
```

## Troubleshooting

### Edges Not Showing

- Verify that edge documents have valid `_from`/`_to` or `left_id`/`right_id` fields
- Ensure the node IDs referenced in edges exist in the nodes collection
- Check the browser console for "Can not create edge with nonexistant source" errors

### API Authentication Errors

- **Development**: Update the Bearer token in `src/TopologyGraph.jsx`
- **Production**: Ensure the CloudFabrix session is active

### Theme Issues

**In iframe (custom widget):**
- The app automatically copies CSS variables from the parent window
- Check browser console for "Copied X CSS variables from parent window" message
- If you see "Cannot access parent document", the iframe may be cross-origin
- Verify the parent window uses CSS custom properties (variables starting with `--`)

**Standalone (not in iframe):**
- The app automatically detects system theme
- To force a specific theme, modify the theme detection in `src/TopologyGraph.jsx`:

```javascript
// Force light theme
setIsDarkTheme(false);
document.documentElement.setAttribute('data-theme', 'light');

// Force dark theme
setIsDarkTheme(true);
document.documentElement.removeAttribute('data-theme');
```

### Build Issues

If the build fails:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall dependencies: `npm install`
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Rebuild: `npm run build`

## License

This project is proprietary to CloudFabrix.

## Support

For issues or questions, contact the CloudFabrix development team.

