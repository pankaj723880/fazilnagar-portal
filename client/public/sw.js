// Fazilnagar Town Portal Service Worker
const CACHE_NAME = 'fazilnagar-portal-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch requests with fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
