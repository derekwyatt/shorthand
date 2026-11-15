// Development server for app/: static files + live reload.
//
//   node --watch tools/dev-server.mjs        (--watch restarts the server if this file changes)
//
// Every HTML page gets a small script that listens on /__livereload (Server-Sent
// Events). When any file under app/ changes, all open pages reload. Strokes on the
// pad survive the reload (they are kept in localStorage).
//
// Env: PORT (default 8000), HOST (default 0.0.0.0 so the iPad can reach it on the LAN).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateQuiz } from '../app/js/quizgen.js';

const ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};
const RELOAD_SNIPPET = `<script>(() => {
  const es = new EventSource('/__livereload');
  es.addEventListener('reload', () => location.reload());
})();</script>`;

const clients = new Set();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__livereload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/api/quiz' && req.method === 'GET') {
    const list = (name) => (url.searchParams.get(name) || '').split(',').map((s) => s.trim()).filter(Boolean);
    const quiz = generateQuiz({
      n: Number(url.searchParams.get('n')) || undefined,
      levels: list('levels').map(Number),
      types: list('types'),
      seed: url.searchParams.get('seed') ?? undefined,
    });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(quiz));
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    let body = await readFile(file);
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
    if (type.startsWith('text/html')) body = Buffer.from(body.toString().replace('</body>', `${RELOAD_SNIPPET}\n</body>`));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

// Debounced reload on any change under app/ (editors often write several events per save).
let timer = null;
watch(ROOT, { recursive: true }, (_event, filename) => {
  if (!filename || /(^|[/\\])\.|~$|\.swp$/.test(filename)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`${new Date().toLocaleTimeString()}  changed: ${filename} → reloading ${clients.size} page(s)`);
    for (const c of clients) c.write('event: reload\ndata: 1\n\n');
  }, 150);
});

// Keep SSE connections alive through proxies and iPad Safari's idle timeouts.
setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20000).unref();

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} with live reload`);
  console.log(`  local:  http://localhost:${PORT}/`);
  if (HOST === '0.0.0.0') {
    for (const addrs of Object.values(networkInterfaces())) {
      for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) console.log(`  LAN:    http://${a.address}:${PORT}/   (open this on the iPad)`);
    }
  }
});
