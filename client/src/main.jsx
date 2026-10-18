import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
if (typeof window !== 'undefined' && window.__STARTUP_METRICS__) {
  window.__STARTUP_METRICS__.jsInit = performance.now();
  try { performance.mark('app-js-init'); } catch (e) {}
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)

if (typeof window !== 'undefined' && window.__STARTUP_METRICS__) {
  window.__STARTUP_METRICS__.reactMounted = performance.now();
  try { performance.mark('app-react-mounted'); } catch (e) {}
}

// Handle Vite dynamic chunk loading errors (e.g. after a new deployment changes chunk hashes)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected, reloading page for latest assets:', event);
  window.location.reload();
});

// Register PWA service worker with auto-update only in production (never on localhost/dev)
if ('serviceWorker' in navigator) {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (!isLocal && !import.meta.env.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
    });
  } else if (isLocal) {
    // Proactively clean up any stale service workers registered on localhost
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}