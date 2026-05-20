const CACHE_NAME = 'grocery-list-v1.3';
const urlsToCache = [
  '/grocery-list/',
  '/grocery-list/index.html',
  '/grocery-list/style.css',
  '/grocery-list/app.js',
  '/grocery-list/manifest.json',
  'https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Update service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
