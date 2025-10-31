// Service Worker for offline support and caching
const CACHE_NAME = 'ai-affiliate-empire-blog-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'images-v1';

// Cache size limits
const CACHE_SIZE_LIMIT = {
  [DYNAMIC_CACHE]: 50,
  [IMAGE_CACHE]: 100,
};

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Limit cache size
const limitCacheSize = (cacheName, maxItems) => {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
      }
    });
  });
};

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        event.waitUntil(
          fetch(request).then(response => {
            return caches.open(getDynamicCacheName(request)).then(cache => {
              cache.put(request, response.clone());
              limitCacheSize(getDynamicCacheName(request), CACHE_SIZE_LIMIT[getDynamicCacheName(request)]);
              return response;
            });
          }).catch(() => {})
        );
        return cachedResponse;
      }

      // Fetch from network and cache
      return fetch(request).then(response => {
        return caches.open(getDynamicCacheName(request)).then(cache => {
          cache.put(request, response.clone());
          limitCacheSize(getDynamicCacheName(request), CACHE_SIZE_LIMIT[getDynamicCacheName(request)]);
          return response;
        });
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Helper to determine cache name based on request type
function getDynamicCacheName(request) {
  if (request.destination === 'image') {
    return IMAGE_CACHE;
  }
  return DYNAMIC_CACHE;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-newsletter') {
    event.waitUntil(syncNewsletterSubscriptions());
  }
});

async function syncNewsletterSubscriptions() {
  // Handle offline newsletter subscriptions
  console.log('[SW] Syncing newsletter subscriptions');
}

// Push notifications support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New content available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Affiliate Empire', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
