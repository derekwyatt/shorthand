// Offline support: the service worker's list of files (app/precache.js) must match app/,
// and the manifest's icons must exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { precacheList, precacheSource } from '../tools/precache.mjs';

const APP = new URL('../app/', import.meta.url);

test('app/precache.js lists every file of the app (run npm run precache)', () => {
  assert.equal(readFileSync(new URL('precache.js', APP), 'utf8'), precacheSource());
});

test('the precache list has the page, its code, data and plates, and every entry exists', () => {
  const list = precacheList();
  for (const f of ['./', 'index.html', 'js/main.js', 'css/app.css', 'data/examples.js', 'plates/letter-k.png', 'manifest.webmanifest']) {
    assert.ok(list.includes(f), f);
  }
  assert.ok(!list.includes('sw.js') && !list.includes('precache.js'));
  for (const f of list.slice(1)) assert.ok(existsSync(new URL(f, APP)), f);
});

test('the manifest is relative to the app (works under /shorthand/ on Pages) and its icons exist', () => {
  const m = JSON.parse(readFileSync(new URL('manifest.webmanifest', APP), 'utf8'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  for (const icon of m.icons) {
    assert.ok(!icon.src.startsWith('/'), icon.src);
    assert.ok(existsSync(new URL(icon.src, APP)), icon.src);
  }
});

test('the app only uses relative URLs for its own files, so it works under a sub-path', () => {
  const html = readFileSync(new URL('index.html', APP), 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    assert.ok(!url.startsWith('/'), `index.html: ${url}`);
  }
});
