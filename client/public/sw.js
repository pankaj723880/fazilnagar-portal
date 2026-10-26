// Fazilnagar Town Portal High-Performance Service Worker
const CACHE_NAME = 'fazilnagar-portal-v4';
const CORE_SHELL_ASSETS = ['/', '/index.html', '/icon-192.svg', '/manifest.json'];

// Private and non-cacheable paths that should always bypass the service worker
const PRIVATE_OR_DYNAMIC_PREFIXES = [
  '/api',
  '/admin',
  '/messages',
  '/chat',
  '/profile',
  '/settings',
  '/create-news',
  '/login',
  '/register',
  '/upload',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_SHELL_ASSETS))
      .catch((err) => {
        console.warn('[SW] Core precache non-fatal warning:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Do not intercept non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cross-origin, SEO verification, and meta files bypass
  if (
    url.origin !== self.location.origin ||
    url.pathname === '/sitemap.xml' ||
    url.pathname === '/robots.txt' ||
    url.pathname.startsWith('/google')
  ) {
    return;
  }

  // Strictly exclude sensitive / authenticated / dynamic routes from caching
  const isPrivateOrDynamic = PRIVATE_OR_DYNAMIC_PREFIXES.some((prefix) =>
    url.pathname.startsWith(prefix)
  );
  if (isPrivateOrDynamic || event.request.headers.get('authorization')) {
    return; // Pass through directly to network
  }

  // 1. Static Assets (Immutable Hashed bundles, fonts, images): Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname === '/icon-192.svg' ||
    url.pathname === '/icon-512.svg' ||
    url.pathname === '/manifest.json';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            return new Response('', { status: 404, statusText: 'Asset not found' });
          });
      })
    );
    return;
  }

  // 2. Navigation Requests (Public HTML pages): Fast Network-First with 2.5s Timeout & Instant Cache Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        try {
          const networkResponse = await fetch(event.request, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        } catch (_) {
          clearTimeout(timeoutId);
          // If network stalls (>2.5s), times out, or fails: immediately serve cached shell
          const cached = await caches.match(event.request);
          if (cached) return cached;

          const indexFallback =
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          if (indexFallback) return indexFallback;

          return new Response('Offline - Please reconnect to view this page.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // 3. General public static requests: Stale-While-Revalidate with Safe Error Catching
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cached || fetchPromise.then((res) => res || new Response('Offline', { status: 503 }));
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
