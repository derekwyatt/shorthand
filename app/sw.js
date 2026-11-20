// Service worker: keeps the whole app on the device so it works offline.
//
// On install it saves every file in precache.js. A page load is answered from the network
// when it responds within a few seconds (and the saved copy refreshed), otherwise from the
// saved copy, so a connected device always gets the latest version and an offline one
// still works. The page's scripts, styles and images then come from the same place as the
// page: a new page with an old script (one that missed the wait on a slow connection)
// would show controls that do nothing.
importScripts('precache.js');

const CACHE = 'gregg-v1';
const NETWORK_WAIT = 3000; // ms before a page load falls back to the saved copy
const FILE_WAIT = 20000;   // ms for a file of a page that came from the network
// Pages (client ids) that were answered from the saved copy. Lost if the browser stops the
// worker, and then their files come from the network: the same version on a fast reload.
const savedPages = new Set();

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

function fromNetwork(request, wait) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('slow network')), wait);
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
  if (request.mode === 'navigate') {
    event.respondWith(fromNetwork(request, NETWORK_WAIT).catch(() => {
      if (event.resultingClientId) savedPages.add(event.resultingClientId);
      return fromCache(request);
    }));
  } else if (savedPages.has(event.clientId)) {
    event.respondWith(fromCache(request).then((res) => (res.type === 'error' ? fromNetwork(request, FILE_WAIT) : res)));
  } else {
    event.respondWith(fromNetwork(request, FILE_WAIT).catch(() => fromCache(request)));
  }
});
