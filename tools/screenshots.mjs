// Generates the README screenshots into docs/screenshots/ by driving headless Chrome over the
// DevTools protocol (same approach as tests/inkpad.cdp.mjs).
// Usage: node tools/screenshots.mjs   (needs Google Chrome and python3; CHROME env var overrides the binary)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'app');
const outDir = join(here, '..', 'docs', 'screenshots');
const HTTP_PORT = 8775;
const CDP_PORT = 9343;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCALE = Number(process.env.SCALE || 2);
const LINE_SPACING = 80;
const QUIZ_SEED = 7;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Seeded PRNG (mulberry32) so runs are reproducible.
let seed = 20240611;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => a + (b - a) * rand();

// Smooth low-frequency wobble: a couple of sinusoids with random phase, in px.
function wobbler(amp = 0.6) {
  const f = [between(1.2, 2.2), between(2.5, 4)];
  const ph = [between(0, 6.28), between(0, 6.28), between(0, 6.28), between(0, 6.28)];
  return (t, axis) => amp * (0.65 * Math.sin(6.28 * f[0] * t + ph[axis * 2]) + 0.35 * Math.sin(6.28 * f[1] * t + ph[axis * 2 + 1]));
}

const server = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'shorthand-shots-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--window-size=1180,820', 'about:blank',
], { stdio: 'ignore' });

let failed = false;
try {
  let serverUp = false;
  for (let i = 0; i < 50 && !serverUp; i++) {
    await sleep(200);
    try { serverUp = (await fetch(`http://127.0.0.1:${HTTP_PORT}/index.html`)).ok; } catch { /* not up yet */ }
  }
  if (!serverUp) throw new Error('static server did not start');

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome did not start');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(`evaluate failed: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    return res.result.value;
  };
  const waitReady = async () => {
    for (let i = 0; i < 100; i++) {
      await sleep(100);
      try {
        if (await evaluate(`document.readyState === 'complete' && !!document.getElementById('stats')?.textContent`)) return;
      } catch { /* context being replaced during navigation */ }
    }
    throw new Error('page did not become ready');
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: SCALE, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/index.html` });
  await waitReady();
  await evaluate(`localStorage.clear()`);
  await send('Page.reload');
  await sleep(300);
  await waitReady();

  const rect = await evaluate(`(() => { const r = document.getElementById('ink').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
  const pen = async (pts) => {
    const at = ([x, y]) => ({ x: rect.x + x, y: rect.y + y, pointerType: 'pen', force: 0.6 });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...at(pts[0]) });
    for (const p of pts.slice(1)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...at(p) });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...at(pts[pts.length - 1]) });
  };

  // Wait for animations and the floating hint toast to finish.
  const settle = async () => {
    await sleep(1500);
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`!document.getElementById('hint').classList.contains('show')`)) break;
      await sleep(200);
    }
    await sleep(1200);
  };
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, name);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`wrote ${file}`);
  };

  // Set the line spacing the way a user would, then go to the first level 5 example.
  await evaluate(`(() => { const el = document.getElementById('spacing'); el.value = ${LINE_SPACING}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(300);
  const padLs = await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--line-spacing').trim() + ' / ' + document.getElementById('spacing-out').value`);
  console.log('line spacing', padLs);
  await evaluate(`document.querySelector('.sections button[data-level="5"]').click()`);
  await sleep(400);
  const EXAMPLE_ID = await evaluate(`import('./data/examples.js').then(({ EXAMPLES }) => EXAMPLES.find((e) => e.level === 5).id)`);
  console.log('example', EXAMPLE_ID);

  // Model geometry in px for the example, one array of strokes (dots last), at line `row`.
  const model = await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const { modelUnits } = await import('./js/assess.js');
    const { samplePoints } = await import('./js/render.js');
    const ls = Number(document.getElementById('spacing').value);
    const u = ls / 3;
    const ex = EXAMPLES.find((e) => e.id === ${JSON.stringify(EXAMPLE_ID)});
    const strokes = [], dots = [];
    for (const m of modelUnits(ex)) {
      if (m.kind === 'dot') dots.push({ dot: [m.pos.x * u, -m.pos.y * u] });
      else strokes.push(samplePoints(m.compiled, 24).map((p) => [p.x * u, -p.y * u]));
    }
    return { ls, strokes, dots };
  })()`);
  const ls = model.ls;
  // Extent of the model, to place and scale it around its own origin.
  const allPts = model.strokes.flat();
  const minX = Math.min(...allPts.map((p) => p[0]));
  const maxX = Math.max(...allPts.map((p) => p[0])) - minX;
  
  // Write one repeat of the word on ruled line `row`, in column `col`, handwritten-ish.
  // `warp` optionally distorts the shape (for the deliberately poor repeat).
  const writeRepeat = async (row, col, warp) => {
    const oy = 2 * (row + 1) * ls; // rule rows 2, 4, 6
    const ox = 40 + col * 0;
    const s = between(0.95, 1.08);
    const dx = between(-14, 14);
    const place = ([x, y]) => {
      let px = (x - minX) * s, py = y * s;
      if (warp) [px, py] = warp(px, py);
      return [ox + dx + px, oy + py];
    };
    for (const stroke of model.strokes) {
      const w = wobbler();
      const pts = stroke.map((p, i, a) => {
        const t = i / (a.length - 1);
        const [x, y] = place(p);
        return [x + w(t, 0), y + w(t, 1)];
      });
      await pen(pts);
    }
    for (const d of model.dots) {
      const [x, y] = place(d.dot);
      await pen([[x, y], [x + 0.6, y], [x + 1, y + 0.5]]);
    }
  };

  // Go to the example (storage starts fresh, so the list starts at the first example).
  const goto = async (id) => {
    await evaluate(`(async () => {
      const { EXAMPLES } = await import('./data/examples.js');
      const i = EXAMPLES.findIndex((e) => e.id === ${JSON.stringify(id)});
      for (let k = 0; k < i; k++) document.getElementById('ex-next').click();
      document.getElementById('clear').click();
    })()`);
    await sleep(300);
  };
  const info = (what) => evaluate(`(() => ({
    title: document.getElementById('ex-title').textContent,
    score: document.getElementById('ex-score').textContent,
    verdict: document.getElementById('ex-verdict').textContent,
    critiques: [...document.querySelectorAll('#ex-critiques li')].map((li) => li.textContent),
    picks: document.querySelectorAll('.line-pick').length,
    ok: document.querySelectorAll('#check .check-path.ok').length,
    bad: document.querySelectorAll('#check .check-path.bad').length,
  }))()`).then((r) => { console.log(what, JSON.stringify(r)); return r; });

  // 1. Practice: three well-formed repeats.
  await evaluate(`document.getElementById('clear').click()`);
  await sleep(300);
  for (let row = 0; row < 3; row++) { await writeRepeat(row, 0); await sleep(150); }
  await settle();
  await info('practice');
  await shot('practice.png');

  // 2. Line stats: redo with line 2 stretched/skewed, then pick line 2.
  await evaluate(`document.getElementById('clear').click()`);
  await sleep(300);
  await writeRepeat(0, 0);
  await writeRepeat(1, 0, (x, y) => [x < maxX * 0.45 ? x : maxX * 0.45 + (x - maxX * 0.45) * 1.8, y * (x < maxX * 0.45 ? 1 : 0.85)]);
  await writeRepeat(2, 0);
  await sleep(200);
  await evaluate(`document.querySelectorAll('.line-pick')[1].click()`);
  await settle();
  await info('line-stats');
  await shot('line-stats.png');

  // 3. Quiz: a deterministic read quiz; answer two questions correctly.
  await evaluate(`location.hash = '#quiz'`);
  await sleep(400);
  const answers = await evaluate(`(async () => {
    const { generateQuiz } = await import('./js/quizgen.js');
    const quiz = generateQuiz({ n: 5, types: ['read'], seed: ${QUIZ_SEED} });
    window.fetch = async () => new Response(JSON.stringify(quiz), { headers: { 'Content-Type': 'application/json' } });
    const qs = quiz.questions || quiz;
    return qs.map((q) => q.exampleId);
  })()`);
  const clickText = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('#quiz-panel button')].find((x) => x.textContent === ${JSON.stringify(text)}); if (!b) return false; b.click(); return true; })()`);
  if (!(await clickText('Start quiz'))) throw new Error('no Start quiz button');
  await sleep(500);
  const answerCorrect = async (id) => {
    const ok = await evaluate(`(() => { const b = document.querySelector('#quiz-panel .choice[data-id=${JSON.stringify(id)}]'); if (!b) return false; b.click(); return true; })()`);
    if (!ok) throw new Error(`correct choice ${id} not found`);
    await sleep(300);
  };
  await answerCorrect(answers[0]);
  await clickText('Next');
  await sleep(400);
  await answerCorrect(answers[1]);
  await settle();
  console.log('quiz', JSON.stringify(await evaluate(`document.querySelector('#quiz-panel').innerText.slice(0, 200)`)));
  await shot('quiz.png');

  // 4. Strokes gallery after the replay-all animation.
  await evaluate(`location.hash = '#strokes'`);
  await sleep(500);
  await evaluate(`document.getElementById('replay-all').click()`);
  await sleep(1000);
  for (let i = 0; i < 100; i++) {
    const done = await evaluate(`[...document.querySelectorAll('#gallery path.ink')].every((p) => Math.abs(parseFloat(getComputedStyle(p).strokeDashoffset)) < 0.5)`);
    if (done) break;
    await sleep(500);
  }
  await settle();
  await shot('strokes.png');
  ws.close();

  // Optional lossless/near-lossless optimisation.
  const has = (cmd) => spawnSync('which', [cmd]).status === 0;
  const files = ['practice.png', 'line-stats.png', 'quiz.png', 'strokes.png'].map((f) => join(outDir, f));
  if (has('oxipng')) for (const f of files) spawnSync('oxipng', ['-o', '4', '--strip', 'safe', f]);
  else if (has('pngquant')) for (const f of files) spawnSync('pngquant', ['--quality', '80-95', '--force', '--ext', '.png', f]);
  for (const f of files) {
    const b = readFileSync(f);
    console.log(`${f}: ${b.readUInt32BE(16)}x${b.readUInt32BE(20)}, ${(statSync(f).size / 1024).toFixed(0)} KB`);
  }
} catch (err) {
  console.log('FAIL', err.message);
  failed = true;
} finally {
  chrome.kill();
  server.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
