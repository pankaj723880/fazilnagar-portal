import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
if (typeof window !== 'undefined' && window.__STARTUP_METRICS__) {
  window.__STARTUP_METRICS__.jsInit = performance.now();
  try { performance.mark('app-js-init'); } catch (e) {}
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

if (typeof window !== 'undefined' && window.__STARTUP_METRICS__) {
  window.__STARTUP_METRICS__.reactMounted = performance.now();
  try { performance.mark('app-react-mounted'); } catch (e) {}
}

// Register PWA service worker with auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}