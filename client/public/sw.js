// Fazilnagar Town Portal Service Worker
const CACHE_NAME = 'fazilnagar-portal-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Do not intercept non-GET requests or external API calls
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname === '/sitemap.xml' ||
    url.pathname === '/robots.txt' ||
    url.pathname.startsWith('/google')
  ) {
    return;
  }

  // Pass through fetch requests with fallback
  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

// Handle incoming Web Push notifications (desktop laptop popups and mobile notifications)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Fazilnagar Portal', message: event.data ? event.data.text() : 'New update available' };
  }

  const title = data.title || 'Fazilnagar Portal Alert';
  const options = {
    body: data.message || data.body || 'New post, story or verification update received.',
    icon: data.icon || '/icon-192.svg',
    badge: '/icon-192.svg',
    data: {
      url: data.link || data.url || '/',
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle click on desktop popup or mobile notification bar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
