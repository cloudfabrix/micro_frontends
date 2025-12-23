# Upload Packs From Catalog (React)

A React-based application for browsing and uploading RDA packs from the CloudFabrix pack catalog. This application displays compatible packs, allows filtering by search, and enables bulk upload of selected packs.

## Features

- **Pack Catalog Browsing**: View available packs from the CloudFabrix RDA pack catalog
- **Compatibility Filtering**: Automatically filters packs based on installed fabric services
- **Version Management**: Shows only the latest version of each pack
- **Search Functionality**: Search packs by name or description
- **Bulk Selection**: Select multiple packs for upload with pagination support
- **Upload Status**: Real-time upload progress and status reporting
- **Dark Theme UI**: Modern dark theme interface matching CloudFabrix design system

## Tech Stack

- **React** 19.2.0
- **React DOM** 19.2.0
- **Vite** 7.1.10 for build tooling

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- Access to CloudFabrix RDAC platform

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

The development server will run on `http://localhost:5174` by default.

### Development Configuration

In development mode:
- The app uses a Vite proxy to forward API requests to avoid CORS issues
- Proxy configuration is defined in `vite.config.js`

## Production Build

### Build the Application

```bash
# Build for production
npm run build
```

This will create optimized production files in the `dist/` directory:
- `index.html` - Entry HTML file
- `index-<hash>.js` - Single bundled JavaScript file with inlined CSS

The build process automatically:
- Inlines CSS into the JavaScript bundle
- Creates a single JavaScript file for easy deployment
- Optimizes assets for production

## Deployment

### Deploy to CloudFabrix Platform

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Update dashboard.json**:
   - Copy the built `index.html` and JavaScript file from `dist/` directory
   - Update `dashboard.json` to reference the correct files
   - The `index.html` should reference the built JavaScript file

3. **Upload dashboard.json**:
   - Navigate to the CloudFabrix RDAF platform
   - Go to RDA Administration -> Dashboards
   - Add or update the dashboard using the `dashboard.json` file

## API Endpoints

The application uses the following API endpoints:

### Fetch Installed Services

- **Workers**: `/api/v2/fabric_health/workers?offset=0&limit=100`
- **Core Microservices**: `/api/v2/fabric_health/microservices/core?offset=0&limit=100`
- **App Microservices**: `/api/v2/fabric_health/microservices/app?offset=0&limit=100`

### Upload Pack

- **Endpoint**: `/api/v2/packs/upload`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with `file` field containing the pack tar.gz file

### Pack Catalog

- **Source**: `https://raw.githubusercontent.com/cloudfabrix/rda_packs/main/metadata/packs_metadata.json`
- **Format**: JSON array of pack objects

## Pack Compatibility Logic

The application implements PEP 440 version comparison and compatibility checking:

1. **Service Detection**: Fetches installed fabric services (workers, core, app microservices)
2. **Version Parsing**: Uses PEP 440 versioning rules to parse and compare versions
3. **Compatibility Check**: Filters packs based on `required_fabric_services` requirements
4. **Version Filtering**: Shows only the latest version of each pack

### Version Comparison

The app supports Python PEP 440 version formats:
- Standard versions: `1.2.3`
- Pre-release: `1.2.3a1`, `1.2.3b1`, `1.2.3rc1`
- Post-release: `1.2.3.post1`
- Development: `1.2.3.dev1`
- Epoch: `1!2.3.4`

### Compatibility Rules

- If a pack has no `required_fabric_services`, it's shown
- If installed services are not PEP 440 compliant (e.g., "daily-82"), compatibility checks are skipped
- Version specifiers (e.g., ">=8.0.0") are checked using SpecifierSet logic
- Case-insensitive service name matching

## File Structure

```
upload_packs_from_catalog/
├── src/
│   ├── PackCatalog.jsx      # Main catalog component
│   ├── App.jsx               # App wrapper
│   ├── main.jsx              # Entry point
│   ├── utils.js              # Version comparison and compatibility utilities
│   └── App.css               # Styles
├── dist/                     # Build output
├── dashboard.json            # CloudFabrix dashboard config
├── vite.config.js           # Vite configuration
├── package.json              # Dependencies
├── index.html                # HTML entry point
└── README.md                 # This file
```

## Customization

### Changing Catalog Source

Update the catalog URL in `src/PackCatalog.jsx`:

```javascript
const metadataUrl = "https://raw.githubusercontent.com/cloudfabrix/rda_packs/main/metadata/packs_metadata.json";
```

### Modifying Items Per Page

Change the `ITEMS_PER_PAGE` constant in `src/PackCatalog.jsx`:

```javascript
const ITEMS_PER_PAGE = 10; // Change to desired number
```

### Styling

All styles are in `src/App.css`. The app uses CSS custom properties (variables) for theming:

```css
:root {
    --bg-primary: #0f1419;
    --bg-secondary: #1a1f2e;
    --accent: #00d4aa;
    /* ... */
}
```

## Troubleshooting

### Packs Not Loading

- Verify the catalog URL is accessible
- Check browser console for network errors
- Ensure CORS is properly configured if accessing from different domain

### Upload Failures

- Verify the pack has a valid `tar_file_url` field
- Check API endpoint `/api/v2/packs/upload` is accessible
- Review upload status section for detailed error messages

### Compatibility Issues

- If no packs are shown, check if installed services are being fetched correctly
- Verify service names match between `required_fabric_services` and installed services
- Check browser console for compatibility check logs

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

