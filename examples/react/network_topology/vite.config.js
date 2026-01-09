import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// API Configuration
const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyLWlkIjoic2lyaS5rb3RoZUBjbG91ZGZhYnJpeC5jb20iLCJ3b3Jrc3BhY2VpZCI6ImFkYzVjN2MzLWVlNDQtNGU2Ni04MjIxLTg2MDYyMjU3OTZmZSIsInJkYWNfYXBpX2VuZHBvaW50IjoiaHR0cDovLzEwLjk1LjEyNS4xOTA6ODgwOCJ9.vptGeX0_jyh6IYW7hv2KnVSoWHiXvgYiKoNK5XoPvXY";

// Plugin to inline CSS into JS
const inlineCSSPlugin = () => {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(options, bundle) {
      // Find CSS files
      const cssFiles = Object.keys(bundle).filter(fileName => fileName.endsWith('.css'));
      
      // Find JS entry file
      const jsFile = Object.keys(bundle).find(fileName => 
        fileName.endsWith('.js') && bundle[fileName].isEntry
      );
      
      if (cssFiles.length && jsFile) {
        // Get CSS content
        const cssContent = cssFiles.map(fileName => bundle[fileName].source).join('\n');
        
        // Popup positioning code - must be at the very top before everything else
        const popupCode = `
// Dynamic Popup Positioning Utility
window.getOptimalPopupPosition = function(initialX, initialY, popupWidth = 400, popupHeight = 300) {
    const padding = 10;
    let x = initialX;
    let y = initialY;
    if (x + popupWidth + padding > window.innerWidth) {
      x = window.innerWidth - popupWidth - padding;
    }
    if (x - padding < 0) {
      x = padding;
    }
    if (y + popupHeight + padding > window.innerHeight) {
      y = window.innerHeight - popupHeight - padding;
    }
    if (y - padding < 0) {
      y = padding;
    }
    return { x, y };
  };
  
  // Aggressive Popup Position Fixer - Direct DOM manipulation
  const popupFixer = {
    init: function() {
      this.fixAllPopups();
      setInterval(() => this.fixAllPopups(), 100);
      document.addEventListener('mousemove', () => this.fixAllPopups(), true);
      document.addEventListener('click', () => {
        setTimeout(() => this.fixAllPopups(), 50);
      }, true);
    },
    fixAllPopups: function() {
      const allDivs = document.querySelectorAll('div[style*="position: absolute"], div[style*="position: fixed"]');
      const hasPopups = Array.from(allDivs).some(el => {
        if (el.classList.contains('alert-badge')) return false;
        const zIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
        // Consider any positioned element with z-index > 800 as a potential popup
        return zIndex > 800;
      });

      // Adjust alert badge z-index based on popup presence
      const alertBadges = document.querySelectorAll('.alert-badge');
      alertBadges.forEach(badge => {
        badge.style.zIndex = hasPopups ? '799' : '1000';
      });

      allDivs.forEach(el => {
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
        const zIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
        if (zIndex < 900) return;
        const rect = el.getBoundingClientRect();
        const left = parseInt(el.style.left) || 0;
        const top = parseInt(el.style.top) || 0;
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const offscreen = {
          right: rect.right > window.innerWidth,
          bottom: rect.bottom > window.innerHeight,
          left: rect.left < 0,
          top: rect.top < 0
        };
        if (offscreen.right || offscreen.bottom || offscreen.left || offscreen.top) {
          const optimal = window.getOptimalPopupPosition(left, top, width, height);
          el.style.left = optimal.x + 'px';
          el.style.top = optimal.y + 'px';
        }
      });
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => popupFixer.init());
  } else {
    popupFixer.init();
  }
`;
        
        // Prepend CSS injection code to JS
        const cssInjectionCode = `
(function() {
  var style = document.createElement('style');
  style.textContent = ${JSON.stringify(cssContent)};
  document.head.appendChild(style);
})();
`;
        bundle[jsFile].code = popupCode + cssInjectionCode + bundle[jsFile].code;
        
        // Remove CSS files from bundle
        cssFiles.forEach(fileName => delete bundle[fileName]);
      }
    }
  };
};

// Vite configuration for the network visualization project.
// See https://vitejs.dev/config/ for more details.
export default defineConfig({
  plugins: [react(), inlineCSSPlugin()],
  define: {
    'import.meta.env.VITE_API_TOKEN': JSON.stringify(API_TOKEN)
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v2': {
        target: 'https://10.95.125.190',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => path
      },
      '/api': {
        target: 'https://10.95.125.190',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => path
      }
    }
  },
  build: {
    // Inline CSS into JS
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Generate a single JS file
        manualChunks: undefined,
        // Inline assets (fonts, images) as base64 if they're small enough
        inlineDynamicImports: true,
        // Put JS files in root directory instead of assets/
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep images as separate files in root
          if (/\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name)) {
            return '[name]-[hash][extname]';
          }
          // This won't be used for fonts if we inline them
          return '[name]-[hash][extname]';
        }
      }
    },
    // Increase the inline asset size limit to inline fonts and CSS
    // Set to a very high value to inline everything except images
    assetsInlineLimit: 1000000 // 1MB - will inline fonts, CSS, and other assets as base64
  }
});