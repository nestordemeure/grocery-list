const CACHE_NAME = 'grocery-list-v1.5';
// Relative to the service worker's scope, so this works both on
// GitHub Pages (/grocery-list/) and when serving locally.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Stale-while-revalidate: answer from cache immediately for a fast launch,
// then refresh the cache in the background so the next launch gets updates.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // 'no-cache' bypasses the HTTP cache (revalidating with the server),
    // otherwise the background refresh can keep re-caching a stale copy
    const refresh = fetch(request, { cache: 'no-cache' }).then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });

    if (cached) {
      event.waitUntil(refresh.catch(() => {}));
      return cached;
    }
    return refresh;
  })());
});

// Drop caches from older versions and take control of open pages
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});
