const CACHE_NAME = 'caspers-transport-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/motherboard.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/storage.js',
  '/js/app.js',
  '/js/schedule.js',
  '/js/job-form.js',
  '/js/quote.js',
  '/js/rates.js',
  '/js/setup.js',
  '/js/sos.js',
  '/js/transport-doc.js',
  '/icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
