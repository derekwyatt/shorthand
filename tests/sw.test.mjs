// The service worker's install, run against a fake cache and server: an update copies the
// files whose saved contents are unchanged and downloads only the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const SCOPE = 'https://example.org/app/';
const SW = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
// In a worker, a relative URL resolves against the worker's location.
class ScopedRequest extends Request { constructor(u, init) { super(typeof u === 'string' ? new URL(u, SCOPE).href : u, init); } }
const print = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

function fakeCaches() {
  const store = new Map();
  const url = (r) => new URL(typeof r === 'string' ? r : r.url, SCOPE).href;
  const open = async (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      put: async (req, res) => { m.set(url(req), await res.clone().text()); },
      match: async (req) => (m.has(url(req)) ? new Response(m.get(url(req))) : undefined),
      keys: async () => [...m.keys()].map((u) => new Request(u)),
      addAll: async (reqs) => { for (const r of reqs) m.set(url(r), await (await ctx.fetch(r)).text()); },
    };
  };
  let ctx;
  return {
    store, bind: (c) => { ctx = c; },
    api: { open, keys: async () => [...store.keys()], delete: async (n) => store.delete(n) },
  };
}

// Installs a worker for `files` (path → contents on the server) over `caches`; returns the
// paths it downloaded.
async function install(files, caches) {
  const entries = Object.entries(files).map(([f, body]) => [f, print(body)]);
  const handlers = {};
  const fetched = [];
  const self = {
    registration: { scope: SCOPE },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    location: new URL(SCOPE),
  };
  const ctx = {
    self, caches: caches.api, crypto: globalThis.crypto, Request: ScopedRequest, Response, URL, setTimeout, clearTimeout, console,
    importScripts: () => { self.PRECACHE_VERSION = print(JSON.stringify(entries)); self.PRECACHE = entries; },
    fetch: async (req) => {
      const f = new URL(req.url ?? req, SCOPE).href.slice(SCOPE.length) || './';
      fetched.push(f);
      return new Response(files[f]);
    },
  };
  caches.bind(ctx);
  vm.runInNewContext(SW, ctx);
  const run = async (type) => { let done; handlers[type]({ waitUntil: (p) => { done = p; } }); await done; };
  await run('install');
  await run('activate');
  return { fetched: fetched.sort(), name: `gregg-${self.PRECACHE_VERSION}` };
}

test('an update downloads only the files that changed, and keeps one cache', async () => {
  const caches = fakeCaches();
  const v1 = { './': '<html>1', 'js/main.js': 'main 1', 'data/a.js': 'a', 'manual/x.png': 'png' };
  const first = await install(v1, caches);
  assert.deepEqual(first.fetched, Object.keys(v1).sort(), 'a first install downloads everything');

  const v2 = { ...v1, './': '<html>2', 'js/main.js': 'main 2', 'js/home.js': 'home' };
  const second = await install(v2, caches);
  assert.deepEqual(second.fetched, ['./', 'js/home.js', 'js/main.js']);
  assert.deepEqual([...caches.store.keys()], [second.name], 'the old cache is deleted');
  const saved = caches.store.get(second.name);
  for (const [f, body] of Object.entries(v2)) assert.equal(saved.get(new URL(f, SCOPE).href), body, f);
});

test('a saved file whose contents no longer match is downloaded again', async () => {
  const caches = fakeCaches();
  await install({ 'js/main.js': 'main 1' }, caches);
  // The saved copy was refreshed to contents the new list doesn't expect.
  const [name] = caches.store.keys();
  caches.store.get(name).set(`${SCOPE}js/main.js`, 'something else');
  const again = await install({ 'js/main.js': 'main 1', 'x.js': 'x' }, caches);
  assert.deepEqual(again.fetched, ['js/main.js', 'x.js']);
});
