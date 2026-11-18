// Service worker: keeps the whole app on the device so it works offline.
//
// On install it saves every file in precache.js. Requests are then answered from the
// network when it responds within a few seconds (and the saved copy refreshed), otherwise
// from the saved copy, so a connected device always gets the latest version and an
// offline one still works.
importScripts('precache.js');

const CACHE = 'gregg-v1';
const NETWORK_WAIT = 3000; // ms before falling back to the saved copy

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(self.PRECACHE.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('slow network')), NETWORK_WAIT);
    // Always ask the server (a cheap "not modified" when nothing changed): GitHub Pages lets
    // the browser keep files 10 minutes, which would otherwise serve a stale or mixed version
    // right after an update.
    fetch(request, { cache: 'no-cache' }).then((res) => {
      clearTimeout(timer);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      resolve(res);
    }, (err) => { clearTimeout(timer); reject(err); });
  });
}

async function fromCache(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  // A page load of any URL in the app falls back to the app itself.
  if (request.mode === 'navigate') return cache.match('./');
  return Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only the app's own files: not the dev server's live reload or quiz API, not other sites.
  if (request.method !== 'GET' || url.origin !== self.location.origin
      || url.pathname.includes('/__livereload') || url.pathname.includes('/api/')) return;
  event.respondWith(fromNetwork(request).catch(() => fromCache(request)));
});
