import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Inject table header sticky positioning styles
(function () {
  var _s = document.createElement('style');
  _s.textContent = "table thead{position:sticky;top:0;z-index:200;background:var(--primary)!important}table thead th{background:var(--primary)!important;color:#fff!important}table thead::before{content:'';position:absolute;top:calc(-1 * var(--table-padding-top,12px));left:0;right:0;height:var(--table-padding-top,12px);background:var(--primary)!important;z-index:199;pointer-events:none}table thead,table thead th{position:relative}";
  document.head.appendChild(_s);
})();

// Mount the root React component into the DOM
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);