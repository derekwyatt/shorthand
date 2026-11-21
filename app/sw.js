// Service worker: keeps the whole app on the device so it works offline.
//
// On install it saves every file in precache.js into a cache named for that version. Files
// whose saved contents still match their fingerprint are copied from the previous cache;
// only the rest are downloaded, so an update takes seconds even on a slow connection. Then
// the old cache is deleted.
//
// A page load is answered from the network when it responds within a few seconds (and the
// saved copy refreshed), otherwise from the saved copy, so a connected device always gets the
// latest version and an offline one still works. The page's scripts, styles and images then
// come from the same place as the page: a new page with an old script (one that missed the
// wait on a slow connection) would show controls that do nothing.
importScripts('precache.js');

const CACHE = `gregg-${self.PRECACHE_VERSION}`;
const PREFIX = 'gregg-';
const NETWORK_WAIT = 3000; // ms before a page load falls back to the saved copy
const FILE_WAIT = 20000;   // ms for a file of a page that came from the network
// Pages (client ids) that were answered from the saved copy. Lost if the browser stops the
// worker, and then their files come from the network: the same version on a fast reload.
const savedPages = new Set();

// tools/precache.mjs's fingerprint: the first 12 hex digits of the SHA-256 of the contents.
async function fingerprint(res) {
  const digest = await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer());
  return [...new Uint8Array(digest)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The files of earlier caches whose contents still match their fingerprint in `want`.
async function reusable(want) {
  const found = new Map();
  for (const key of await caches.keys()) {
    if (!key.startsWith(PREFIX) || key === CACHE) continue;
    const old = await caches.open(key);
    for (const req of await old.keys()) {
      const f = req.url.slice(self.registration.scope.length) || './';
      if (!want.has(f) || found.has(f)) continue;
      const res = await old.match(req);
      if (res?.ok && await fingerprint(res) === want.get(f)) found.set(f, res);
    }
  }
  return found;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const want = new Map(self.PRECACHE);
    const cache = await caches.open(CACHE);
    const kept = await reusable(want);
    await Promise.all([...kept].map(([f, res]) => cache.put(f, res)));
    await cache.addAll([...want.keys()].filter((f) => !kept.has(f)).map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
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
        // Saved under the plain URL: the page asks for its scripts as file?v=<fingerprint>.
        const copy = res.clone();
        const url = new URL(request.url);
        caches.open(CACHE).then((cache) => cache.put(url.origin + url.pathname, copy));
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
