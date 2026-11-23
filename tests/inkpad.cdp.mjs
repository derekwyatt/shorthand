// End-to-end check of the ink pad in headless Chrome, driven over the DevTools protocol.
// Usage: node tests/inkpad.cdp.mjs   (needs Google Chrome and python3)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const HTTP_PORT = 8765;
const CDP_PORT = 9333;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const server = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'inkpad-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--window-size=1024,768', 'about:blank',
], { stdio: 'ignore' });

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
  const consoleErrors = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(JSON.stringify(msg.params.args));
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

  // Optional V8 coverage from the page (COVERAGE_DIR), merged by c8 with node's own output.
  const COVERAGE_DIR = process.env.COVERAGE_DIR;
  const origin = `http://127.0.0.1:${HTTP_PORT}/`;
  const covScripts = [];
  let covN = 0;
  const snap = async () => {
    if (!COVERAGE_DIR) return;
    const { result } = await send('Profiler.takePreciseCoverage');
    const mine = result.filter((e) => e.url.startsWith(origin)).map((e) => ({
      ...e, url: pathToFileURL(join(root, decodeURIComponent(e.url.slice(origin.length).split(/[?#]/)[0]))).href,
    }));
    if (mine.length) covScripts.push(mine);
  };
  const flushCoverage = () => {
    if (!COVERAGE_DIR) return;
    mkdirSync(COVERAGE_DIR, { recursive: true });
    for (const result of covScripts) writeFileSync(join(COVERAGE_DIR, `coverage-chrome-${covN++}.json`), JSON.stringify({ result }));
  };
  // A reload starts a new page whose scripts the running coverage no longer counts, so
  // coverage is taken before each reload (snap) and started again after it.
  const startCoverage = async () => {
    if (!COVERAGE_DIR) return;
    await send('Profiler.stopPreciseCoverage').catch(() => {});
    await send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  };
  if (COVERAGE_DIR) {
    // Scripts from a cache (HTTP, V8's code cache, the service worker's) skip the counters.
    await send('Profiler.enable');
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Network.setBypassServiceWorker', { bypass: true });
  }
  await startCoverage();
  await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/index.html#pad` });
  await waitReady();
  await evaluate(`localStorage.clear()`);
  await snap();
  await send('Page.reload');
  await sleep(300);
  await waitReady();
  await startCoverage();

  const rect = await evaluate(`(() => { const r = document.getElementById('ink').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
  check(rect.w > 500 && rect.h > 400, `canvas fills the page (${Math.round(rect.w)}x${Math.round(rect.h)})`);
  const dims = await evaluate(`(() => { const c = document.getElementById('ink'); return [c.width, c.height, devicePixelRatio]; })()`);
  check(dims[0] === Math.round(rect.w * dims[2]), `canvas backing store matches devicePixelRatio (${dims.join(', ')})`);

  // Write a "t"-like upward stroke with the pen.
  const pen = async (pts) => {
    const at = ([x, y]) => ({ x: rect.x + x, y: rect.y + y, pointerType: 'pen', force: 0.6 });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...at(pts[0]) });
    for (const p of pts.slice(1)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...at(p) });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...at(pts[pts.length - 1]) });
  };
  const line = (x0, y0, x1, y1, n = 20) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);

  await pen(line(100, 200, 160, 165));
  await sleep(100);
  // Strokes for the example currently shown (storage keeps one list per example).
  const stored = () => evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('gregg.practice.v2'));
    return { data: { strokes: s.attempts[s.exampleId]?.strokes || [] }, exampleId: s.exampleId };
  })()`);
  let s = await stored();
  check(s?.data?.strokes?.length === 1, 'pen stroke is recorded and persisted');
  const st = s.data.strokes[0];
  check(st.pointerType === 'pen', `stroke pointerType is pen (${st.pointerType})`);
  check(st.points.length >= 20, `stroke has all sample points (${st.points.length})`);
  const [x0, y0] = st.points[0];
  const [x1, y1] = st.points[st.points.length - 1];
  check(Math.abs(x0 - 100) < 1 && Math.abs(y0 - 200) < 1 && Math.abs(x1 - 160) < 1 && Math.abs(y1 - 165) < 1,
    `coordinates are canvas-relative CSS px (${x0},${y0} → ${x1},${y1})`);
  check(st.points.every((p, i, a) => i === 0 || p[2] >= a[i - 1][2]), 'timestamps are non-decreasing');
  check(st.lineSpacing === 48, 'stroke records the line spacing');
  const exp = await evaluate(`import('./js/main.js').then((m) => m.buildExport())`);
  check(exp.format === 'gregg-ink' && exp.version === 1 && exp.canvas.width > 0 && exp.strokes.length === 1, 'export format header and strokes');
  check(exp.example?.id === 'letter-k' && exp.example.outline[0] === 'k' && exp.example.meaning.length > 0, `export names the example being copied (${exp.example?.id})`);

  // A finger touch must not ink (palm rejection).
  const touch = async (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: rect.x + x, y: rect.y + y, id: 1 }] });
  await touch('touchStart', 300, 300);
  for (let i = 1; i <= 10; i++) await touch('touchMove', 300 + i * 10, 300);
  await touch('touchEnd');
  await sleep(100);
  s = await stored();
  check(s.data.strokes.length === 1, 'finger touch is ignored by default');

  // The page must not scroll while writing.
  check(await evaluate(`window.scrollX === 0 && window.scrollY === 0 && document.scrollingElement.scrollTop === 0`), 'page did not scroll');

  // Finger ink toggle lets touches draw.
  await evaluate(`document.getElementById('finger').click()`);
  await touch('touchStart', 300, 300);
  for (let i = 1; i <= 10; i++) await touch('touchMove', 300 + i * 10, 300);
  await touch('touchEnd');
  await sleep(100);
  s = await stored();
  check(s.data.strokes.length === 2 && s.data.strokes[1].pointerType === 'touch', 'finger ink toggle allows touch strokes');
  await evaluate(`document.getElementById('finger').click()`);

  // Undo, clear, undo-of-clear.
  await evaluate(`document.getElementById('undo').click()`);
  s = await stored();
  check(s.data.strokes.length === 1, 'undo removes the last stroke');
  await pen(line(400, 300, 400, 380));
  await evaluate(`document.getElementById('clear').click()`);
  s = await stored();
  check(s.data.strokes.length === 0, 'clear removes all strokes');
  await evaluate(`document.getElementById('undo').click()`);
  s = await stored();
  check(s.data.strokes.length === 2, 'undo after clear restores the strokes');

  // Ink is actually on the canvas.
  const inked = await evaluate(`(() => { const c = document.getElementById('ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()`);
  check(inked > 50, `ink pixels drawn (${inked})`);

  // Pen thickness redraws the ink thicker and is kept.
  await evaluate(`(() => { const r = document.getElementById('pen-width'); r.value = 5; r.dispatchEvent(new Event('input')); })()`);
  const thick = await evaluate(`(() => { const c = document.getElementById('ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()`);
  check(thick > inked * 1.5, `pen thickness redraws thicker ink (${inked} → ${thick} pixels)`);
  check(JSON.parse(await evaluate(`localStorage.getItem('gregg.practice.v2')`)).penWidth === 5, 'pen thickness is saved');
  check(await evaluate(`document.getElementById('pen-width-out').value`) === '5px', 'pen thickness shows its value');

  // Line spacing control updates the rules and later strokes.
  await evaluate(`(() => { const r = document.getElementById('spacing'); r.value = 64; r.dispatchEvent(new Event('input')); })()`);
  check(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--line-spacing').trim()`) === '64px', 'line spacing control sets the CSS rule spacing');
  await pen(line(400, 300, 450, 300));
  s = await stored();
  check(s.data.strokes[2]?.lineSpacing === 64, 'new strokes record the new line spacing');

  // Strokes survive a reload.
  await snap();
  await send('Page.reload');
  await sleep(300);
  await waitReady();
  await startCoverage();
  check((await evaluate(`document.getElementById('stats').textContent`)).startsWith('3 strokes'), 'strokes restored after reload');
  const inkedAfter = await evaluate(`(() => { const c = document.getElementById('ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()`);
  check(inkedAfter > 50, 'restored strokes are redrawn');

  // Stroke gallery (milestone 2).
  await evaluate(`location.hash = '#strokes'`);
  await sleep(300);
  const g = await evaluate(`(async () => {
    const { STROKES } = await import('./data/strokes.js');
    return {
      strokes: STROKES.length,
      cards: document.querySelectorAll('#gallery .card').length,
      padHidden: document.getElementById('practice').hidden,
      replayVisible: getComputedStyle(document.getElementById('replay-all')).display !== 'none',
    };
  })()`);
  check(g.cards === g.strokes && g.cards > 30, `gallery shows a card for every stroke (${g.cards}/${g.strokes})`);
  check(g.padHidden && g.replayVisible, 'strokes view hides the pad and shows its own tools');
  await sleep(3000);
  const done = await evaluate(`(() => {
    const inks = [...document.querySelectorAll('#gallery path.ink')];
    const arrows = [...document.querySelectorAll('#gallery .arrow')];
    return {
      inks: inks.length,
      inkDone: inks.every((p) => Math.abs(parseFloat(getComputedStyle(p).strokeDashoffset)) < 0.5),
      arrows: arrows.length,
      arrowsShown: arrows.filter((a) => getComputedStyle(a).opacity === '1').length,
    };
  })()`);
  check(done.inkDone, `every stroke animation finishes fully drawn (${done.inks} paths)`);
  check(done.arrows === done.inks && done.arrowsShown === done.arrows, `end arrows appear after drawing (${done.arrowsShown}/${done.arrows})`);
  const replay = await evaluate(`(async () => {
    const card = document.querySelector('#gallery .card[data-stroke="d"]');
    card.click();
    await new Promise((r) => setTimeout(r, 60));
    const p = card.querySelector('path.ink');
    return { mid: parseFloat(getComputedStyle(p).strokeDashoffset), len: p.getTotalLength() };
  })()`);
  check(replay.mid > 1 && replay.mid <= replay.len, `tapping a card replays its animation (dashoffset ${replay.mid.toFixed(1)} of ${replay.len.toFixed(1)})`);
  await evaluate(`location.hash = '#pad'`);
  await sleep(200);
  check(await evaluate(`!document.getElementById('practice').hidden && document.getElementById('gallery').hidden`), 'switching back shows the pad');

  // Practice panel (example to copy).
  const ex1 = await evaluate(`(() => ({
    title: document.getElementById('ex-title').textContent,
    counter: document.getElementById('ex-counter').textContent,
    meaning: document.getElementById('ex-meaning').textContent,
    hasInk: !!document.querySelector('#ex-art path.ink'),
    artRight: document.querySelector('.example-panel').getBoundingClientRect().right,
    padLeft: document.getElementById('ink').getBoundingClientRect().left,
  }))()`);
  check(ex1.title === 'k' && ex1.hasInk && /can/.test(ex1.meaning), `example panel shows the first example with its meaning (${ex1.title}: ${ex1.meaning.slice(0, 60)}…)`);
  check(ex1.artRight <= ex1.padLeft + 1, 'example is on the left, pad on the right');
  const before = (await stored()).data.strokes.length;
  await evaluate(`document.getElementById('ex-next').click()`);
  await sleep(150);
  let s2 = await stored();
  check(s2.exampleId === 'letter-g' && s2.data.strokes.length === 0, 'Next shows the next example with an empty pad');
  check(await evaluate(`document.getElementById('ex-title').textContent`) === 'g', 'panel title follows Next');
  await pen(line(500, 300, 600, 300));
  await evaluate(`document.getElementById('ex-prev').click()`);
  await sleep(150);
  s2 = await stored();
  check(s2.exampleId === 'letter-k' && s2.data.strokes.length === before, 'Prev restores that example\'s own strokes');
  // Jump to a word that uses the joining rules and check it renders.
  const word = await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const i = EXAMPLES.findIndex((e) => e.id === 'word-hack');
    const cur = EXAMPLES.findIndex((e) => e.title === document.getElementById('ex-title').textContent);
    for (let k = cur; k < i; k++) document.getElementById('ex-next').click();
    await new Promise((r) => setTimeout(r, 100));
    return {
      title: document.getElementById('ex-title').textContent,
      meaning: document.getElementById('ex-meaning').textContent,
      dots: document.querySelectorAll('#ex-art circle.ink').length,
      ink: !!document.querySelector('#ex-art path.ink'),
    };
  })()`);
  check(word.title === 'hack' && word.ink && word.dots === 2 /* enlarged + actual size */ && /inside the curve/.test(word.meaning), `word example renders with its h dot and rule (${word.title})`);

  // "About this outline" gathers the parts and rules with their §, and a § opens over it with a way back.
  const about = await evaluate(`(async () => {
    document.querySelector('#ex-meaning .explain-link').click();
    await new Promise((r) => setTimeout(r, 100));
    const pop = document.querySelector('.explain-pop');
    const text = pop?.innerText ?? '';
    const site = [...pop.querySelectorAll('.section-pop-foot a')].map((a) => a.href);
    pop.querySelector('.section-link').click();
    await new Promise((r) => setTimeout(r, 100));
    const section = document.querySelector('.section-pop:not(.explain-pop) .section-pop-bar')?.innerText ?? '';
    document.querySelector('.section-pop-bar [aria-label=Back]').click();
    await new Promise((r) => setTimeout(r, 100));
    const back = !!document.querySelector('.explain-pop');
    document.querySelector('.section-pop-close[aria-label=Close]').click();
    return { text, site, section, back, open: document.querySelectorAll('.section-pop-shade').length };
  })()`);
  check(/Its parts/i.test(about.text) && /The dot/.test(about.text) && /§3/.test(about.text) && /Unit 1/.test(about.text)
    && about.site.some((h) => h.endsWith('anunit01.html#p3')) && /^◀/.test(about.section) && about.back && about.open === 0,
    `“About this outline” lists the parts with their § and links to the site; a § opens with Back (${JSON.stringify({ ...about, text: about.text.slice(0, 80) })})`);

  // A §209 disjoined prefix is a second pen-down of the same word, not another repeat.
  await evaluate(`(() => { const s = document.querySelector('#level-select'); s.value = '33'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(100);
  await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const i = EXAMPLES.findIndex((e) => e.id === 'word-contract');
    const cur = EXAMPLES.findIndex((e) => e.title === document.getElementById('ex-title').textContent);
    document.getElementById('clear').click();
    for (let k = cur; k < i; k++) document.getElementById('ex-next').click();
  })()`);
  await sleep(150);
  const disPts = await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const { modelUnits } = await import('./js/assess.js');
    const { samplePoints } = await import('./js/render.js');
    const u = Number(document.getElementById('spacing').value) / 3;
    const ex = EXAMPLES.find((e) => e.id === 'word-contract');
    return modelUnits(ex).map((m) => samplePoints(m.compiled, 24).map((p) => [150 + p.x * u, 160 - p.y * u]));
  })()`);
  for (const s of disPts) await pen(s);
  await sleep(150);
  const dis = await evaluate(`({ title: document.getElementById('ex-title').textContent, verdict: document.getElementById('ex-verdict').textContent })`);
  check(disPts.length === 2 && dis.title === 'contract' && dis.verdict.includes('1 repeat') && !/0 repeats|2 repeats/.test(dis.verdict), `a disjoined prefix and the rest are one word, one repeat (${dis.title}: ${dis.verdict})`);
  await evaluate(`document.getElementById('clear').click()`);

  // Scoring, critiques and real-time assistance.
  await evaluate(`localStorage.removeItem('gregg.writer.v1')`); // earlier strokes taught a size; start from the example size
  await evaluate(`(() => { const s = document.querySelector('#level-select'); s.value = '1'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await evaluate(`document.getElementById('clear').click()`);
  await sleep(100);
  check(await evaluate(`document.getElementById('ex-title').textContent`) === 'k', 'Level 1 option jumps to the first letter');
  // Draw a perfect k from the model geometry, through real pen events.
  const kPts = await evaluate(`(async () => {
    const { STROKE_BY_ID, U_PER_LINE } = await import('./data/strokes.js');
    const { compileStroke, samplePoints } = await import('./js/render.js');
    const u = Number(document.getElementById('spacing').value) / U_PER_LINE;
    return samplePoints(compileStroke(STROKE_BY_ID.k), 20).map((p) => [200 + p.x * u, 300 - p.y * u]);
  })()`);
  const at = ([x, y]) => ({ x: rect.x + x, y: rect.y + y, pointerType: 'pen', force: 0.5 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...at(kPts[0]) });
  await sleep(50);
  check(await evaluate(`!document.querySelector('#guide .guide-path')`), 'no guide at pen-down (it might be a dot)');
  for (const p of kPts.slice(1, 12)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...at(p) });
  await sleep(50);
  check(await evaluate(`!!document.querySelector('#guide .guide-path')`), 'the guide appears once the pen is clearly writing a stroke');
  for (const p of kPts.slice(12)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...at(p) });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...at(kPts[kPts.length - 1]) });
  await sleep(150);
  const fb = await evaluate(`(() => ({
    score: document.getElementById('ex-score').textContent,
    cls: document.getElementById('ex-score').className,
    items: [...document.querySelectorAll('#ex-critiques li')].map((li) => li.className + ':' + li.textContent),
    hint: document.getElementById('hint').className + ' ' + document.getElementById('hint').textContent,
  }))()`);
  check(Number(fb.score) >= 90 && /good/.test(fb.cls), `a well-formed k scores high (${fb.score}, ${fb.items.join(' | ')})`);
  check(/show/.test(fb.hint) && /looks right/.test(fb.hint), `real-time note after the stroke (${fb.hint.trim()})`);
  check(await evaluate(`document.querySelectorAll('#check .check-path.ok').length === 1 && !document.querySelector('#guide .guide-path')`),
    'a thin green pattern sits under the correct k (guide cleared)');

  // Repeats: the guide still appears for the 2nd k, and three k's are three repeats.
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...at([kPts[0][0] + 120, kPts[0][1]]) });
  for (const p of kPts.slice(1, 12)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...at([p[0] + 120, p[1]]) });
  await sleep(50);
  check(await evaluate(`!!document.querySelector('#guide .guide-path')`), 'the guide appears for the 2nd repeat of a letter');
  for (const p of kPts.slice(12)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, ...at([p[0] + 120, p[1]]) });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...at([kPts[kPts.length - 1][0] + 120, kPts[kPts.length - 1][1]]) });
  await pen(kPts.map(([x, y]) => [x + 240, y]));
  await sleep(150);
  const rep3 = await evaluate(`({ verdict: document.getElementById('ex-verdict').textContent, ok: document.querySelectorAll('#check .check-path.ok').length })`);
  check(rep3.verdict.includes('3 repeats') && rep3.ok === 3, `three k's are three repeats (${rep3.verdict}, ${rep3.ok} green)`);

  // A word written on two lines is two repeats.
  await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const i = EXAMPLES.findIndex((e) => e.id === 'word-hate');
    const cur = EXAMPLES.findIndex((e) => e.title === document.getElementById('ex-title').textContent);
    document.getElementById('clear').click();
    for (let k = cur; k < i; k++) document.getElementById('ex-next').click();
  })()`);
  await sleep(150);
  const wordPts = await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const { modelUnits } = await import('./js/assess.js');
    const { samplePoints } = await import('./js/render.js');
    const ls = Number(document.getElementById('spacing').value);
    const u = ls / 3;
    const ex = EXAMPLES.find((e) => e.id === 'word-hate');
    const out = [];
    for (const row of [0, 1]) {
      const oy = 120 + row * 2 * ls;
      const dots = [];
      for (const m of modelUnits(ex)) {
        if (m.kind === 'dot') {
          const x = 100 + m.pos.x * u, y = oy - m.pos.y * u;
          dots.push([[x, y], [x + 0.6, y], [x + 1, y + 0.5]]);
        } else out.push(samplePoints(m.compiled, 24).map((p) => [100 + p.x * u, oy - p.y * u]));
      }
      out.push(...dots);
    }
    return out;
  })()`);
  for (const s of wordPts) await pen(s);
  await sleep(150);
  const verdict2 = await evaluate(`document.getElementById('ex-verdict').textContent`);
  check(verdict2.includes('2 repeats'), `a word written on two lines is two repeats (${verdict2})`);

  // One line-pick button per line; at most one pressed; unpicking shows every line again.
  const picks = () => evaluate(`({ n: document.querySelectorAll('.line-pick').length, pressed: [...document.querySelectorAll('.line-pick[aria-pressed="true"]')].map((b) => b.textContent), verdict: document.getElementById('ex-verdict').textContent })`);
  const pickLine = (n) => evaluate(`document.querySelectorAll('.line-pick')[${n}].click()`);
  check((await picks()).n === 2, 'one line-pick button per line of writing');
  const col = await evaluate(`(() => {
    const c = document.getElementById('line-picks').getBoundingClientRect();
    const ink = document.getElementById('ink').getBoundingClientRect();
    const b = [...document.querySelectorAll('.line-pick')].map((x) => x.getBoundingClientRect());
    return { colLeft: c.left, colRight: c.right, inkLeft: ink.left, inside: b.every((r) => r.left >= c.left && r.right <= c.right) };
  })()`);
  check(col.colRight - col.colLeft > 30 && col.colRight <= col.inkLeft + 1 && col.inside, `pickers sit in their own column left of the pad (${JSON.stringify(col)})`);
  await pickLine(1);
  let lp = await picks();
  check(lp.pressed.join() === '2' && lp.verdict.startsWith('Line 2') && lp.verdict.includes('1 repeat '), `picking line 2 shows its stats only (${lp.verdict})`);
  await pickLine(0);
  lp = await picks();
  check(lp.pressed.join() === '1' && lp.verdict.startsWith('Line 1'), `picking line 1 unpicks line 2 (${lp.pressed.join()}: ${lp.verdict})`);
  await pickLine(0);
  lp = await picks();
  check(lp.pressed.length === 0 && lp.verdict.includes('2 repeats'), `unpicking shows every line again (${lp.verdict})`);

  // A flat line for k is critiqued.
  await evaluate(`(() => { const s = document.querySelector('#level-select'); s.value = '1'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(100);
  await evaluate(`document.getElementById('clear').click()`);
  await pen(line(200, 300, 260, 300));
  await sleep(150);
  const bad = await evaluate(`[...document.querySelectorAll('#ex-critiques li')].map((li) => li.textContent).join(' | ')`);
  check(/reads as/.test(bad) || /Too straight/.test(bad), `a straight line for k gets a critique (${bad})`);
  check(await evaluate(`document.querySelectorAll('#check .check-path.bad').length === 1 && !document.querySelector('#check .ok')`),
    'a thin red pattern sits under the wrong stroke');
  const exported = await evaluate(`import('./js/main.js').then((m) => { const x = m.buildExport(); return { ...x.assessment, ex: x.example.id }; })`);
  check(exported?.ex === 'letter-k' && exported.score < 80 && exported.critiques.length > 0, `export includes the score and critiques (${exported?.ex}: ${exported?.score})`);

  // The dot letter (h / "a"): a tap is scored and gets its own note, with no guide.
  await evaluate(`(() => { const s = document.querySelector('#level-select'); s.value = '1'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const toH = await evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const i = EXAMPLES.findIndex((e) => e.id === 'letter-h');
    for (let k = 0; k < i; k++) document.getElementById('ex-next').click();
    document.getElementById('clear').click();
    return document.getElementById('ex-title').textContent;
  })()`);
  await pen([[300, 300], [300.5, 300.4], [301, 300.6]]);
  await sleep(150);
  const dotFb = await evaluate(`(() => ({
    score: document.getElementById('ex-score').textContent,
    hint: document.getElementById('hint').textContent,
    guide: !!document.querySelector('#guide .guide-path'),
    check: document.querySelectorAll('#check .check-dot.ok').length,
  }))()`);
  check(toH === 'h' && dotFb.score === '100' && /dot looks right/.test(dotFb.hint) && !dotFb.guide && dotFb.check === 1,
    `the dot letter is scored (${toH}: ${dotFb.score}, "${dotFb.hint}")`);

  // Level 5 (short sentences).
  await evaluate(`(() => { const s = document.querySelector('#level-select'); s.value = '5'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(150);
  const sent = await evaluate(`(() => ({
    title: document.getElementById('ex-title').textContent,
    counter: document.getElementById('ex-counter').textContent,
    active: document.getElementById('level-select').value,
    ink: document.querySelectorAll('#ex-art .ex-big path.ink').length,
    starts: document.querySelectorAll('#ex-art .ex-big .start-mark').length,
    arrows: document.querySelectorAll('#ex-art .ex-big .arrow').length,
  }))()`);
  check(sent.title === 'It will be good.' && /Level 5 · Short sentences · 1 of \d+/.test(sent.counter) && sent.active === '5',
    `Level 5 button shows a sentence (${sent.title}, ${sent.counter})`);
  check(sent.ink === 4 && sent.starts === 4 && sent.arrows === 4, // "It will" is one phrase
    `every stroke of the sentence has its own start mark and end arrow (${sent.ink} strokes, ${sent.starts} starts, ${sent.arrows} arrows)`);
  const model = await evaluate(`(() => {
    const p = document.querySelector('#model .model-path');
    if (!p) return null;
    const b = p.getBBox();
    const ls = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--line-spacing'));
    return { top: b.y, bottom: b.y + b.height, ls };
  })()`);
  check(model && model.top >= 0 && Math.abs(model.bottom - model.ls) < 3,
    `the whole example is drawn resting on the top rule (${JSON.stringify(model)})`);

  // Quiz mode. The static server has no /api/quiz; the page stubs fetch with a short quiz
  // (the length buttons only offer 5/10/20) built by the same generator.
  const attempts = () => evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('gregg.practice.v2')).attempts)`);
  const attemptsBefore = await attempts();
  const practiceTitle = await evaluate(`document.getElementById('ex-title').textContent`);
  const click = (sel) => evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);
  const clickText = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('#quiz-panel button')].find((x) => x.textContent === ${JSON.stringify(text)}); if (!b) return false; b.click(); return true; })()`);
  // `seed` pins the questions; unseeded quizzes are random.
  const startQuiz = async (n, type, seed) => {
    await evaluate(`(async () => {
      const { generateQuiz } = await import('./js/quizgen.js');
      window.fetch = async () => new Response(JSON.stringify(generateQuiz({ n: ${n}, types: ['${type}']${seed === undefined ? '' : `, seed: ${seed}`} })), { headers: { 'Content-Type': 'application/json' } });
    })()`);
    // No level is ticked until a unit's lessons are finished: tick one so Start is enabled.
    await evaluate(`(() => { const i = document.querySelector('#quiz-panel .quiz-opts input'); if (!i.checked) i.click(); })()`);
    await clickText('Start quiz');
    await sleep(400);
  };

  await evaluate(`location.hash = '#quiz'`);
  await sleep(300);
  check(await evaluate(`document.querySelector('#quiz-panel h2')?.textContent === 'Quiz' && getComputedStyle(document.getElementById('quiz-panel')).display !== 'none' && getComputedStyle(document.getElementById('ex-title').closest('.example-panel')).display === 'none'`),
    'quiz view shows the quiz panel instead of the example panel');
  await startQuiz(2, 'read');
  for (let q = 0; q < 2; q++) {
    check(await evaluate(`document.querySelectorAll('#quiz-panel .choice').length === 4`), `read question ${q + 1} has 4 choices`);
    await click('#quiz-panel .choice');
    await sleep(150);
    check(await evaluate(`document.querySelectorAll('#quiz-panel .choice.correct').length === 1`), 'exactly one choice is marked correct');
    check(await evaluate(`[...document.querySelectorAll('#quiz-panel button')].some((b) => /^(Next|Finish)$/.test(b.textContent))`), 'a Next button appears after answering');
    check(await evaluate(`!!document.querySelector('#quiz-panel .ex-meaning .explain-link')`), 'an answered question links to its study note');
    await clickText(q === 0 ? 'Next' : 'Finish');
    await sleep(200);
  }
  const summary = await evaluate(`document.querySelector('#quiz-panel h2')?.textContent`);
  check(/of 2/.test(summary), `summary shows the total (${summary})`);
  check(await evaluate(`!!JSON.parse(localStorage.getItem('gregg.quiz.v1') || '[]').length`), 'finished quiz is saved');
  await clickText('Back');
  await sleep(200);

  // Seed 21 asks for letter d, so the straight line below is matched and the check overlay
  // is drawn. (A random question may have no part that a straight line can match.)
  await startQuiz(1, 'write', 21);
  check(await evaluate(`document.getElementById('quiz-check')?.disabled ?? document.querySelector('#quiz-panel .quiz-btn:not(.alt)')?.disabled`), 'Check is disabled while the pad is empty');
  await pen(line(100, 200, 160, 165));
  await sleep(150);
  await clickText('Check');
  await sleep(300);
  const badge = await evaluate(`document.querySelector('#quiz-panel .score')?.textContent`);
  check(/^\d+$|^\d+\/\d+$/.test(badge || ''), `write question shows a score badge (${badge})`);
  check(await evaluate(`document.getElementById('check').children.length >= 1`), 'the correct pattern is drawn under the ink');
  await clickText('Finish');
  await sleep(200);

  await evaluate(`location.hash = '#pad'`);
  await sleep(300);
  check(await evaluate(`document.getElementById('ex-title').textContent`) === practiceTitle && await evaluate(`getComputedStyle(document.getElementById('ex-title').closest('.example-panel')).display !== 'none'`),
    `back on the pad the practice example is shown again (${practiceTitle})`);
  check((await attempts()) === attemptsBefore, 'the quiz did not overwrite practice attempts');

  // Look-alike series: one family, written member by member, results only at the end.
  await evaluate(`location.hash = '#quiz'`);
  await sleep(300);
  await evaluate(`(() => {
    for (const i of document.querySelectorAll('#quiz-panel input[type=checkbox]')) {
      i.checked = i.parentElement.textContent === 'Look-alike series' || i.parentElement.textContent.startsWith('1 ·');
    }
  })()`);
  await evaluate(`(async () => {
    const { generateQuiz } = await import('./js/quizgen.js');
    window.fetch = async () => new Response(JSON.stringify(generateQuiz({ n: 1, types: ['series'] })), { headers: { 'Content-Type': 'application/json' } });
  })()`);
  await clickText('Start quiz');
  await sleep(400);
  const memberCount = Number(await evaluate(`document.querySelector('#quiz-panel .quiz-progress span').textContent.match(/of (\\d+)$/)?.[1] ?? '0'`));
  check(memberCount >= 2, `series question shows its member count (${memberCount})`);
  for (let m = 0; m < memberCount; m++) {
    check(await evaluate(`document.querySelector('#quiz-panel .quiz-btn.big')?.disabled`), `series Next is disabled while the pad is empty (${m + 1})`);
    await pen(line(100, 200, 100 + 40 * (m + 1), 200 - 20 * (m + 1)));
    await sleep(150);
    check(await evaluate(`!document.querySelector('#quiz-panel .score') && !document.querySelector('#quiz-panel .critiques') && !document.querySelector('#quiz-panel .series-row')`), 'no score or critique before the reveal');
    await clickText(m === memberCount - 1 ? 'Reveal' : 'Next');
    await sleep(250);
  }
  check(await evaluate(`document.querySelectorAll('#quiz-panel .series-row').length`) === memberCount, 'reveal shows one result row per member');
  check(await evaluate(`[...document.querySelectorAll('#quiz-panel .series-row')].every((r) => r.querySelector('svg') && r.querySelector('.series-score')?.textContent.length > 0)`), 'each row has an SVG and a score');
  await clickText('Finish');
  await sleep(250);
  const seriesSummary = await evaluate(`document.querySelector('#quiz-panel h2')?.textContent`);
  check(new RegExp(`of ${memberCount}$`).test(seriesSummary || ''), `series summary counts members (${seriesSummary})`);

  // Lessons: Unit 1 opens on a rule with animated figures; a write step passes on a good
  // copy; a choose step marks wrong picks and the right one; progress survives a reload.
  const lessonsAttemptsBefore = await attempts();
  await evaluate(`location.hash = '#learn'`);
  await sleep(300);
  const lessonText = () => evaluate(`(() => ({
    counter: document.querySelector('#lesson-panel .ex-counter')?.textContent,
    title: document.querySelector('#lesson-panel .lesson-title, #lesson-panel .quiz-prompt')?.textContent,
    next: document.querySelector('#lesson-panel .lesson-next')?.textContent,
    tab: document.querySelector('#lesson-panel .lesson-unit')?.value,
    figs: document.querySelectorAll('#lesson-panel .lesson-fig svg').length,
    status: document.querySelector('#lesson-panel .lesson-status')?.textContent ?? '',
  }))()`);
  const lessonNext = () => click('#lesson-panel .lesson-next');
  let ls = await lessonText();
  check(await evaluate(`getComputedStyle(document.getElementById('lesson-panel')).display !== 'none' && getComputedStyle(document.getElementById('ex-title').closest('.example-panel')).display === 'none'`),
    'lessons view shows the lesson panel instead of the example panel');
  check(ls.tab === '1' && /^Unit 1 · Manual pp\. 1–6 · Step 1 of \d+$/.test(ls.counter) && ls.title === 'Written by sound' && ls.figs === 2,
    `Unit 1 opens on its first rule with two figures (${ls.counter}, ${ls.title}, ${ls.figs})`);
  // Step 1's outlines are also shown at actual size, and each can be tried on the pad.
  const strip = await evaluate(`(() => ({
    labels: [...document.querySelectorAll('#lesson-panel .lesson-actual .strip-label')].map((t) => t.textContent),
    selected: document.querySelector('#lesson-panel .strip-label.selected')?.textContent,
    figSelected: document.querySelectorAll('#lesson-panel .lesson-fig.selected').length,
    tryText: document.querySelector('#lesson-panel .lesson-try')?.textContent,
    h: document.querySelector('#lesson-panel .lesson-actual')?.getBoundingClientRect().height,
    ls: Number(document.getElementById('spacing').value),
  }))()`);
  check(strip.labels.join() === 'aim,knee' && strip.selected === 'aim' && strip.figSelected === 1 && /write “aim”/.test(strip.tryText) && strip.h >= 1.5 * strip.ls,
    `read step shows its outlines at actual size on ruled lines, "aim" ready to try (${JSON.stringify(strip)})`);
  const modelPts = (id, ox, oy) => evaluate(`(async () => {
    const { EXAMPLES } = await import('./data/examples.js');
    const { modelUnits } = await import('./js/assess.js');
    const { samplePoints } = await import('./js/render.js');
    const u = Number(document.getElementById('spacing').value) / 3;
    const ex = EXAMPLES.find((e) => e.id === ${JSON.stringify(id)});
    return modelUnits(ex).filter((m) => m.kind !== 'dot').map((m) => samplePoints(m.compiled, 20).map((p) => [${ox} + p.x * u, ${oy} - p.y * u]));
  })()`);
  await evaluate(`localStorage.removeItem('gregg.writer.v1')`);
  for (const st of await modelPts('word-aim', 200, 300)) await pen(st);
  await sleep(200);
  ls = await lessonText();
  check(/matches/.test(ls.status) && Number(await evaluate(`document.querySelector('#lesson-panel .score').textContent`)) >= 85 && await evaluate(`document.querySelectorAll('#check .check-path.ok').length >= 1`),
    `a good "aim" on the pad is scored, with the green pattern under it (${ls.status})`);
  await evaluate(`document.querySelector('#lesson-panel .strip-label[data-id="word-knee"]').nextElementSibling.dispatchEvent(new MouseEvent('click'))`);
  await sleep(150);
  check(await evaluate(`/write “knee”/.test(document.querySelector('#lesson-panel .lesson-try').textContent) && document.querySelector('#lesson-panel .strip-label.selected').textContent === 'knee'`) && await evaluate(`document.querySelector('#lesson-panel .score').textContent`) === '–',
    'tapping "knee" at actual size tries it instead, on a clean pad');
  await click('#lesson-panel .lesson-fig');
  await sleep(150);
  check(Number(await evaluate(`document.querySelector('#lesson-panel .score').textContent`)) >= 85, 'tapping "aim" again brings back its ink and score');
  // A second line of "aim": the gutter numbers the lines, and picking one shows its stats.
  const lineGap = 2 * Number(await evaluate(`document.getElementById('spacing').value`));
  for (const st of await modelPts('word-aim', 200, 300 + lineGap)) await pen(st);
  await sleep(200);
  const lessonPicks = () => evaluate(`({ n: document.querySelectorAll('.line-pick').length, shown: getComputedStyle(document.getElementById('line-picks')).display !== 'none', verdict: document.querySelector('#lesson-panel .verdict').textContent })`);
  let lpk = await lessonPicks();
  check(lpk.n === 2 && lpk.shown && lpk.verdict.includes('2 repeats'), `lessons number the pad's lines in the gutter too (${JSON.stringify(lpk)})`);
  await evaluate(`document.querySelectorAll('.line-pick')[1].click()`);
  lpk = await lessonPicks();
  check(lpk.verdict.startsWith('Line 2') && lpk.verdict.includes('1 repeat '), `picking a line in a lesson shows that line's stats (${lpk.verdict})`);
  await evaluate(`document.getElementById('clear').click()`);
  await sleep(100);
  check((await lessonPicks()).n === 0, 'clearing the pad removes the line numbers');

  await lessonNext();
  await lessonNext();
  await sleep(200);
  ls = await lessonText();
  check(/Write k/.test(ls.title) && ls.next === 'Skip ▶' && /70 or more passes/.test(ls.status), `step 3 asks for k and can be skipped (${ls.title}, ${ls.next})`);
  await evaluate(`localStorage.removeItem('gregg.writer.v1')`);
  await pen(kPts);
  await sleep(200);
  ls = await lessonText();
  check(/Passed/.test(ls.status) && ls.next === 'Next ▶', `a good k passes the write step (${ls.status})`);
  check(await evaluate(`JSON.parse(localStorage.getItem('gregg.lessons.v1')).done['unit-1'].includes('write:letter-k')`), 'the passed step is saved');
  check(await evaluate(`document.querySelector('#lesson-panel .lesson-unit').selectedOptions[0].textContent.includes('(1/')`), 'the unit picker counts the step');
  for (let i = 0; i < 4; i++) await lessonNext();
  await sleep(200);
  ls = await lessonText();
  check(/Step 7 of/.test(ls.counter) && ls.title === 'What does this say?' && await evaluate(`document.querySelectorAll('#lesson-panel .choice').length === 4`), `step 7 is a reading question (${ls.counter})`);
  await evaluate(`[...document.querySelectorAll('#lesson-panel .choice')].find((b) => b.textContent === 'k').click()`);
  await sleep(100);
  check(await evaluate(`document.querySelectorAll('#lesson-panel .choice.wrong').length === 1`) && /Try again/.test((await lessonText()).status), 'a wrong pick is marked and can be retried');
  await evaluate(`[...document.querySelectorAll('#lesson-panel .choice')].find((b) => b.textContent === 'g').click()`);
  await sleep(100);
  check(await evaluate(`document.querySelectorAll('#lesson-panel .choice.correct').length === 1 && document.querySelector('#lesson-panel .ex-meaning p') !== null`), 'the right pick is marked and its meaning shown');
  check(await evaluate(`document.querySelectorAll('#lesson-panel .lesson-actual .strip-label').length === 1 && /write “g”/.test(document.querySelector('#lesson-panel .lesson-try')?.textContent)`),
    'once answered, the outline is shown at actual size and can be tried on the pad');
  await snap();
  await evaluate(`location.reload()`);
  await sleep(500);
  await waitReady();
  await startCoverage();
  await sleep(300);
  ls = await lessonText();
  check(/Step 7 of/.test(ls.counter) && await evaluate(`document.querySelectorAll('#lesson-panel .choice.correct').length === 1`), `after a reload the lesson resumes at the same step, answered (${ls.counter})`);
  await evaluate(`(() => { const s = document.querySelector('#lesson-panel .lesson-unit'); s.value = '2'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(200);
  ls = await lessonText();
  check(ls.tab === '2' && /^Unit 2 · Manual pp\. 7–11 · Step 1 of/.test(ls.counter) && ls.title === 'Circles between strokes', `the Unit 2 tab opens Unit 2 (${ls.counter})`);
  check((await attempts()) === lessonsAttemptsBefore, 'lessons did not overwrite practice attempts');

  // Back up / Restore buttons exist and the export sees the saved progress.
  check(await evaluate(`!!document.getElementById('backup') && !!document.getElementById('restore') && !!document.getElementById('restore-file')`), 'Back up and Restore buttons exist');
  const backupKeys = await evaluate(`import('/js/backup.js').then((m) => Object.keys(m.exportProgress(localStorage).data))`);
  check(backupKeys.includes('gregg.practice.v2'), `the backup includes the practice progress (${backupKeys})`);

  // Lessons: the Manual's text full screen, a reading step and its reader, a Speed Studies
  // step, and the summary of a unit.
  await evaluate(`location.hash = '#learn'`);
  await sleep(200);
  // `test`: a condition on the step `s`, as source.
  const goStep = (test) => evaluate(`(async () => {
    const { LESSONS } = await import('./data/lessons.js');
    const ok = (s) => ${test};
    const l = LESSONS.find((x) => x.steps.some(ok));
    const i = l.steps.findIndex(ok);
    const sel = document.querySelector('#lesson-panel .lesson-unit');
    sel.value = String(l.unit); sel.dispatchEvent(new Event('change'));
    for (let k = 0; k < 200 && !document.querySelector('#lesson-panel .ex-counter').textContent.includes('Step ' + (i + 1) + ' of'); k++) {
      const label = document.querySelector('#lesson-panel .ex-counter').textContent;
      const at = Number(/Step (\\d+)/.exec(label)?.[1] ?? Infinity); // the summary is past the last step
      document.querySelector(at > i + 1 ? '#lesson-panel .ex-nav button' : '#lesson-panel .lesson-next').click();
    }
    return document.querySelector('#lesson-panel .ex-counter').textContent;
  })()`);
  const sections = await evaluate(`(() => {
    const links = [...document.querySelectorAll('#lesson-panel a.section-link')];
    const plain = [...document.querySelectorAll('#lesson-panel p, #lesson-panel li, #lesson-panel .ex-source')].some((e) => [...e.childNodes].some((n) => n.nodeType === 3 && /§\\s*\\d/.test(n.data)));
    return { n: links.length, hrefs: links.map((a) => a.href), plain, option: !!document.querySelector('option a') };
  })()`);
  check(sections.n > 0 && sections.hrefs.every((h) => /^https:\/\/greggshorthand\.github\.io\/anunit\d\d\.html#p\d+$/.test(h)) && !sections.plain && !sections.option,
    `every § in the lesson links to its paragraph on the source site (${JSON.stringify(sections).slice(0, 300)})`);
  const pop = await evaluate(`(async () => {
    const tick = () => new Promise((r) => setTimeout(r, 50));
    const state = () => { const p = document.querySelector('.section-pop'); return p && { title: p.querySelector('strong').textContent, first: p.querySelector('.section-pop-body p')?.textContent.slice(0, 20), out: p.querySelector('a.out-link')?.getAttribute('href'), target: p.querySelector('a.out-link')?.target }; };
    const link = document.querySelector('#lesson-panel a.section-link');
    link.click(); await tick();
    const shown = { ...state(), titleLinks: document.querySelectorAll('.section-pop-bar a').length };
    document.querySelector('.section-pop-close').click(); await tick();
    const afterX = !!state();
    link.click(); await tick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await tick();
    const afterEsc = !!state();
    link.click(); await tick();
    document.querySelector('.section-pop-shade').dispatchEvent(new MouseEvent('click', { bubbles: true })); await tick();
    return { shown, afterX, afterEsc, afterShade: !!state(), shades: document.querySelectorAll('.section-pop-shade').length };
  })()`);
  check(pop.shown?.title.startsWith('Manual §14') && /^14\./.test(pop.shown.first ?? '') && pop.shown.out === 'https://greggshorthand.github.io/anunit02.html#p14' && pop.shown.target === '_blank' && pop.shown.titleLinks === 0,
    `tapping a § shows its paragraph in a small window, with a link to the site in a new tab (${JSON.stringify(pop.shown)})`);
  check(!pop.afterX && !pop.afterEsc && !pop.afterShade && pop.shades === 0, `the § window closes with ✕, Escape or a tap outside it (${JSON.stringify(pop)})`);
  await click('#lesson-panel .manual-ref');
  await sleep(200);
  const manual = await evaluate(`(() => { const r = document.querySelector('.manual-reader'); return { open: !!r, flash: !!r?.querySelector('.flash'), next: [...(r?.querySelectorAll('button') ?? [])].map((b) => b.textContent) }; })()`);
  check(manual.open && manual.flash && manual.next.some((x) => /Unit \d+ ▶/.test(x)), `"read it in the Manual" opens the unit's text at its paragraph (${JSON.stringify(manual)})`);
  const nextUnit = Number(/Unit (\d+) ▶/.exec(manual.next.join(' '))[1]);
  await evaluate(`[...document.querySelectorAll('.manual-reader button')].find((b) => /▶/.test(b.textContent)).click()`);
  await sleep(150);
  check(await evaluate(`/Unit ${nextUnit}\\b/.test(document.querySelector('.manual-reader .reader-bar strong').textContent)`), 'the Manual reader goes on to the next unit');
  await evaluate(`[...document.querySelectorAll('.manual-reader button')].find((b) => /Close/.test(b.textContent)).click()`);
  check(await evaluate(`!document.querySelector('.reader')`), 'Close shuts the Manual reader');

  await goStep(`s.type === 'reading'`);
  const reading = await evaluate(`(() => {
    const body = document.querySelector('#lesson-panel');
    const hidden = () => body.querySelectorAll('.key-hidden').length;
    const before = hidden();
    [...body.querySelectorAll('button')].find((b) => b.textContent === 'Show next').click();
    const afterNext = hidden();
    [...body.querySelectorAll('button')].find((b) => b.textContent === 'Show all').click();
    const afterAll = hidden();
    return { before, afterNext, afterAll, plates: body.querySelectorAll('.reading-plate').length };
  })()`);
  check(reading.plates >= 1 && reading.before > 1 && reading.afterNext === reading.before - 1 && reading.afterAll === 0,
    `a reading step shows its page and hides the key sentence by sentence (${JSON.stringify(reading)})`);
  await click('#lesson-panel .reading-plate');
  await sleep(150);
  const reader = await evaluate(`(() => { const r = document.querySelector('.reader'); const page = r?.querySelector('.reader-page'); page?.click(); return { open: !!r, key: !!r?.querySelector('.reading-keybox'), big: page?.classList.contains('big') }; })()`);
  check(reader.open && reader.key && reader.big, `the page opens full screen beside its key, and zooms (${JSON.stringify(reader)})`);
  await evaluate(`[...document.querySelectorAll('.reader button')].find((b) => /Close/.test(b.textContent)).click()`);
  check(await evaluate(`!document.querySelector('.reader') && !!document.querySelector('#lesson-panel .reading-keybox')`), 'closing the reader puts the key back in the lesson');
  const words = await evaluate(`(async () => {
    [...document.querySelectorAll('#lesson-panel .explain-link')].find((b) => /each word/.test(b.textContent)).click();
    await new Promise((r) => setTimeout(r, 200));
    const rows = [...document.querySelectorAll('.word-help tbody tr')];
    const res = { rows: rows.length, drawn: document.querySelectorAll('.word-help svg').length, sections: document.querySelectorAll('.word-help .section-link').length };
    document.querySelector('.section-pop-close[aria-label=Close]').click();
    return res;
  })()`);
  check(words.rows > 20 && words.drawn > 5 && words.sections > 5, `a reading's “How each word is written” lists its words with outlines and § links (${JSON.stringify(words)})`);

  await goStep(`s.type === 'speed' && s.speed.figures.length > 0`);
  const speed = await evaluate(`(() => ({ title: document.querySelector('#lesson-panel .lesson-title')?.textContent, figs: document.querySelectorAll('#lesson-panel .speed-fig').length, source: document.querySelector('#lesson-panel .ex-source')?.textContent }))()`);
  check(speed.title && speed.figs >= 1 && /Speed Stud/.test(speed.source), `a Speed Studies step shows its drills (${JSON.stringify(speed)})`);
  await click('#lesson-panel .speed-plate');
  await sleep(100);
  check(await evaluate(`!!document.querySelector('.reader .reader-page img')`), 'a drill enlarges full screen');
  await evaluate(`[...document.querySelectorAll('.reader button')].find((b) => /Close/.test(b.textContent)).click()`);

  // The summary lists the skipped exercises, each a way back to it.
  const unitEnd = await evaluate(`(async () => {
    const { LESSONS } = await import('./data/lessons.js');
    const l = LESSONS[LESSONS.length - 1];
    const sel = document.querySelector('#lesson-panel .lesson-unit');
    sel.value = String(l.unit); sel.dispatchEvent(new Event('change'));
    for (let k = 0; k < l.steps.length + 2 && !/Summary/.test(document.querySelector('#lesson-panel .ex-counter').textContent); k++) document.querySelector('#lesson-panel .lesson-next').click();
    const left = document.querySelectorAll('#lesson-panel .lesson-left .choice');
    const counter = document.querySelector('#lesson-panel .ex-counter').textContent;
    const bars = [...document.querySelectorAll('#lesson-panel .progress-count')].map((x) => x.textContent);
    const back = left.length;
    left[0]?.click();
    return { counter, back, bars, after: document.querySelector('#lesson-panel .ex-counter').textContent, total: l.steps.length };
  })()`);
  check(/Summary/.test(unitEnd.counter) && unitEnd.back > 0 && /Step \d+ of/.test(unitEnd.after) && unitEnd.bars[0] === `${unitEnd.total}/${unitEnd.total}`,
    `the last screen sums up the unit, lists what was skipped and goes back to it (${JSON.stringify(unitEnd)})`);

  // Reference: every section opens; the brief forms can be searched; units can be picked.
  await evaluate(`location.hash = '#ref'`);
  await sleep(300);
  const ref = await evaluate(`(async () => {
    const out = {};
    for (const b of document.querySelectorAll('.ref-menu button')) {
      b.click();
      out[b.dataset.id] = document.querySelector('.ref-body').children.length;
    }
    document.querySelector('.ref-menu button[data-id="briefs"]').click();
    const search = document.querySelector('.ref-search');
    search.value = 'about'; search.dispatchEvent(new Event('input'));
    out.found = document.querySelectorAll('.ref-brief:not([hidden])').length;
    out.count = document.querySelector('.ref-body .ex-caption').textContent;
    document.querySelector('.ref-menu button[data-id="units"]').click();
    const pick = document.querySelector('.ref-body select');
    pick.value = '3'; pick.dispatchEvent(new Event('change'));
    out.unit3 = /Unit 3|^\\s*\\d/.test(document.querySelector('.ref-body .manual-text').textContent) && document.querySelector('.ref-body .manual-text').textContent.length > 500;
    return out;
  })()`);
  check(Object.keys(ref).length >= 7 && Object.entries(ref).filter(([k]) => !['found', 'count', 'unit3'].includes(k)).every(([, n]) => n >= 2), `every reference section has content (${JSON.stringify(ref)})`);
  check(ref.found >= 1 && ref.found < 10 && /of 320/.test(ref.count), `the brief-form search filters the chart (${ref.found}, ${ref.count})`);
  check(ref.unit3, 'the Manual can be read unit by unit in Reference');
  const links = await evaluate(`(() => {
    const out = {};
    for (const b of document.querySelectorAll('.ref-menu button')) {
      b.click();
      out[b.dataset.id] = [...document.querySelectorAll('.ref-body a.out-link')].map((a) => a.getAttribute('href'));
    }
    document.querySelector('.ref-menu button[data-id="units"]').click();
    const pick = document.querySelector('.ref-body select');
    pick.value = '7'; pick.dispatchEvent(new Event('change'));
    out.unit7 = document.querySelector('.ref-body a.out-link').getAttribute('href');
    out.newTab = [...document.querySelectorAll('a.out-link')].every((a) => a.target === '_blank' && a.rel === 'noopener');
    return out;
  })()`);
  const site = 'https://greggshorthand.github.io/';
  check(links.beginner[0] === site + 'antwtbgr.html' && links.briefs[0] === site + 'anbfs.html' && links.phrases[0] === site + 'anphrase.html' && links.alphabet[0] === site + 'analphbt.html'
    && links.unit7 === site + 'anunit07.html' && links.newTab, `each Reference section links to its page at greggshorthand.github.io (${JSON.stringify(links)})`);
  check(links.thanks.includes(site) && links.thanks.includes(site + 'Annivman.pdf') && links.thanks.some((h) => /jandrewowen/.test(h)), 'Thanks credits Andrew Owen, with links to his sites');

  // The Manual's own cross-references open what they name inside the app.
  const xref = await evaluate(`(async () => {
    const pick = document.querySelector('.ref-body select') ?? (document.querySelector('.ref-menu button[data-id="units"]').click(), document.querySelector('.ref-body select'));
    pick.value = '28'; pick.dispatchEvent(new Event('change'));
    const chapter = [...document.querySelectorAll('.ref-body a.inline-link')].find((a) => a.textContent === 'Chapter VIII');
    chapter?.click();
    const unit = document.querySelector('.manual-reader .reader-bar strong')?.textContent;
    pick.value = '25'; pick.dispatchEvent(new Event('change'));
    document.querySelector('.manual-reader')?.remove();
    [...document.querySelectorAll('.ref-body a.inline-link')].find((a) => /paragraph 23/.test(a.textContent))?.click();
    const para = !!document.querySelector('.manual-reader #m23')?.closest('p.flash');
    const alpha = [...document.querySelectorAll('.manual-reader a.inline-link')].length;
    document.querySelector('.manual-reader')?.remove();
    location.hash = '#ref/alphabet';
    await new Promise((r) => setTimeout(r, 200));
    const opened = document.querySelector('.ref-menu button.active')?.dataset.id;
    return { chapter: !!chapter, unit, para, alpha, opened };
  })()`);
  check(xref.chapter && /Unit 22/.test(xref.unit) && xref.para && xref.opened === 'alphabet',
    `the Manual's cross-references open the unit, the paragraph, and #ref/alphabet the alphabet (${JSON.stringify(xref)})`);

  // Every module is loaded at its versioned URL (index.html's import map), so a browser
  // can't pair the page with an old copy of a script.
  const loaded = await evaluate(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\\/(js|data)\\/[^?]+\\.js/.test(n))`);
  check(loaded.length > 10 && loaded.every((n) => /\\?v=[0-9a-f]{12}$/.test(n)) && loaded.some((n) => n.includes('/js/ink.js?v=')),
    `modules load at versioned URLs (${loaded.length}, e.g. ${loaded.find((n) => n.includes('/js/ink.js')) ?? 'none'})`);

  // Home (the default view): the overview and the story, eight lines of Gregg over English;
  // tapping a line writes it out.
  await evaluate(`location.hash = ''`);
  await sleep(200);
  const home = await evaluate(`(async () => {
    const main = document.getElementById('home');
    const lines = [...main.querySelectorAll('.home-line')];
    const first = lines[0].querySelector('.home-gregg');
    first.click();
    await new Promise((r) => setTimeout(r, 300));
    const writing = first.querySelector('svg .ink').getAnimations().length > 0;
    return {
      shown: !main.hidden && document.body.classList.contains('view-home'),
      active: document.querySelector('.modes a.active')?.dataset.view,
      paragraphs: main.querySelectorAll('.home-body > p:not(.ex-caption)').length,
      lines: lines.length,
      inked: lines.every((l) => l.querySelectorAll('.home-gregg svg .ink').length > 0 && l.querySelector('.home-english').textContent.endsWith('.')),
      links: [...main.querySelectorAll('.home-body > p a')].map((a) => a.getAttribute('href')),
      writing,
    };
  })()`);
  check(home.shown && home.active === 'home' && home.paragraphs === 2 && home.lines === 8 && home.inked && home.writing && home.links.includes('#learn'),
    `Home is the default view: two paragraphs, eight story lines in Gregg with English, a tap writes a line (${JSON.stringify(home)})`);

  // In Practice, a source line's § opens the Manual in the app and its page links to the scan.
  await evaluate(`location.hash = '#pad'`);
  await sleep(200);
  const src = await evaluate(`(async () => {
    const sel = document.getElementById('level-select');
    sel.value = '5'; sel.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 200));
    const line = document.querySelector('.example-panel .ex-source');
    const page = line.querySelector('a.out-link')?.getAttribute('href');
    const para = line.querySelector('button.inline-link');
    para?.click();
    const reader = document.querySelector('.manual-reader');
    const back = reader?.querySelector('.credit a')?.getAttribute('href');
    reader?.querySelector('.reader-bar button:last-child').click();
    const sections = [...line.querySelectorAll('a.section-link')].map((a) => a.textContent + ' ' + a.getAttribute('href'));
    return { text: line.textContent, page, para: para?.textContent, back, closed: !document.querySelector('.manual-reader'), sections };
  })()`);
  check(/Annivman\.pdf#page=\d+$/.test(src.page ?? '') && /read it in the Manual/.test(src.para ?? '') && /anunit\d\d\.html#p\d+$/.test(src.back ?? '') && src.closed,
    `a Practice source line links its page to the scan, and opens the Manual in the app, which links on to the site (${JSON.stringify(src)})`);
  check(src.sections.join() === '§3 https://greggshorthand.github.io/anunit01.html#p3,§23 https://greggshorthand.github.io/anunit02.html#p23,§29 https://greggshorthand.github.io/anunit03.html#p29,§34 https://greggshorthand.github.io/anunit04.html#p34,§11–12 https://greggshorthand.github.io/anunit01.html#p11,§4 https://greggshorthand.github.io/anunit01.html#p4',
    `a Practice source line links each § to its paragraph on the source site (${src.sections.join()})`);

  // Settings: the menu opens and closes; a theme recolours the app and the pad's pen.
  await evaluate(`location.hash = '#pad'`);
  await sleep(200);
  await click('#menu-btn');
  check(await evaluate(`!document.getElementById('menu').hidden && document.getElementById('menu-btn').getAttribute('aria-expanded') === 'true'`), 'the Settings button opens the menu');
  const themed = await evaluate(`(() => {
    const paper = getComputedStyle(document.body).backgroundColor;
    document.querySelector('.theme-pick[data-theme="night"]').click();
    const night = { attr: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor, pen: document.querySelector('#ink') && getComputedStyle(document.documentElement).getPropertyValue('--pen').trim(), saved: JSON.parse(localStorage.getItem('gregg.ui.v1')).theme, checked: document.querySelector('.theme-pick[aria-checked="true"]').dataset.theme };
    document.querySelector('.theme-pick[data-theme="auto"]').click();
    const auto = document.documentElement.hasAttribute('data-theme');
    document.querySelector('.theme-pick[data-theme="paper"]').click();
    return { paper, night, auto };
  })()`);
  check(themed.night.attr === 'night' && themed.night.bg !== themed.paper && themed.night.pen === '#b8d2ff' && themed.night.saved === 'night' && themed.night.checked === 'night' && themed.auto === false,
    `themes recolour the app, are remembered, and Auto follows the device (${JSON.stringify(themed)})`);
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  check(await evaluate(`document.getElementById('menu').hidden`), 'Escape closes the menu');
  await click('#menu-btn');
  await evaluate(`document.querySelector('.page').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  check(await evaluate(`document.getElementById('menu').hidden`), 'a tap outside closes the menu');

  // The handle between panel and pad resizes the panel, within limits, and remembers it.
  const split = await evaluate(`(async () => {
    const s = document.getElementById('split');
    const area = document.getElementById('practice').getBoundingClientRect();
    const panel = () => document.querySelector('.example-panel').getBoundingClientRect().width;
    const before = panel();
    s.setPointerCapture = () => {};
    s.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: area.left + before, clientY: 300, bubbles: true }));
    s.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: area.left + 250, clientY: 300, bubbles: true }));
    s.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    const dragged = panel();
    s.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, clientX: 0, clientY: 300, bubbles: true }));
    s.dispatchEvent(new PointerEvent('pointermove', { pointerId: 8, clientX: area.right, clientY: 300, bubbles: true }));
    s.dispatchEvent(new PointerEvent('pointerup', { pointerId: 8, bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    const widest = panel();
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    const keyed = panel();
    const saved = JSON.parse(localStorage.getItem('gregg.ui.v1')).pane.w;
    s.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    return { before, dragged, widest, keyed, saved, reset: panel(), area: area.width };
  })()`);
  check(Math.abs(split.dragged - 250) < 20 && split.widest <= 0.6 * split.area + 2 && split.keyed < split.widest && split.saved < 0.6 && Math.abs(split.reset - split.before) < 2,
    `dragging the handle resizes the panel, the pad keeps 40%, arrows nudge it, double-tap resets (${JSON.stringify(split)})`);

  // Export hands a file to the browser (a download where there is no share sheet).
  const saved2 = await evaluate(`(async () => {
    const names = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { names.push(this.download); };
    document.getElementById('export').click();
    await new Promise((r) => setTimeout(r, 100));
    document.getElementById('backup').click();
    await new Promise((r) => setTimeout(r, 100));
    HTMLAnchorElement.prototype.click = orig;
    return { names, status: document.getElementById('ex-status').textContent };
  })()`);
  check(saved2.names.length === 2 && /^gregg-.*\.json$/.test(saved2.names[0]) && /\.json$/.test(saved2.names[1]) && /Exported/.test(saved2.status),
    `Export JSON and Back up save files, and the example is marked saved2 (${JSON.stringify(saved2)})`);

  // Reset clears everything (after confirming).
  await evaluate(`location.hash = '#pad'`);
  await sleep(200);
  await evaluate(`localStorage.setItem('gregg.writer.v1', JSON.stringify({ scale: 1.5 }))`);
  const beforeReset = await evaluate(`Object.keys(localStorage).filter((k) => k.startsWith('gregg.')).length`);
  await evaluate(`window.confirm = () => false; document.getElementById('reset-all').click()`);
  check(await evaluate(`Object.keys(localStorage).filter((k) => k.startsWith('gregg.')).length`) === beforeReset, 'Reset does nothing when cancelled');
  await snap();
  await evaluate(`window.confirm = () => true; document.getElementById('reset-all').click()`);
  await sleep(500);
  await waitReady();
  await startCoverage();
  const after = await evaluate(`(() => {
    const p = JSON.parse(localStorage.getItem('gregg.practice.v2') || '{}');
    return { attempts: Object.keys(p.attempts || {}).length, quiz: localStorage.getItem('gregg.quiz.v1'), writer: localStorage.getItem('gregg.writer.v1'), lessons: localStorage.getItem('gregg.lessons.v1'), title: document.getElementById('ex-title').textContent };
  })()`);
  check(beforeReset >= 3 && after.attempts === 0 && after.quiz === null && after.writer === null && after.lessons === null && after.title === 'k',
    `Reset clears practice, quiz history, lesson progress and writing size (${JSON.stringify(after)})`);

  check(consoleErrors.length === 0, `no console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ')}` : ''}`);
  await snap();
  flushCoverage();
  if (COVERAGE_DIR) await send('Network.setBypassServiceWorker', { bypass: false });

  // Offline: once the service worker has saved the app, it loads with no network.
  const cached = await evaluate(`(async () => {
    await navigator.serviceWorker.ready;
    const list = {};
    new Function('self', await (await fetch('precache.js')).text())(list);
    const name = 'gregg-' + list.PRECACHE_VERSION;
    const cache = await caches.open(name);
    // The browser's fingerprint of a saved file is the one in the list (what an update compares).
    const body = await (await cache.match('js/main.js')).arrayBuffer();
    const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', body))].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
    return {
      caches: (await caches.keys()).filter((k) => k.startsWith('gregg-')).length,
      page: !!(await cache.match('./')), plate: !!(await cache.match('plates/letter-k.png')), count: (await cache.keys()).length,
      print: hex === new Map(list.PRECACHE).get('js/main.js'),
    };
  })()`);
  check(cached.caches === 1 && cached.page && cached.plate && cached.count >= 150 && cached.print,
    `the service worker saves the whole app in one cache for this version, fingerprints matching the list (${JSON.stringify(cached)})`);
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Page.reload');
  await sleep(500);
  await waitReady();
  await startCoverage();
  const offline = await evaluate(`(async () => {
    location.hash = '#learn';
    await new Promise((r) => setTimeout(r, 300));
    const img = new Image();
    img.src = 'plates/letter-k.png';
    await img.decode().catch(() => {});
    return { online: navigator.onLine, lesson: !!document.querySelector('#lesson-panel .lesson-body, #lesson-panel h2'), plate: img.naturalWidth };
  })()`);
  check(offline.lesson && offline.plate > 0, `the app and its plates load offline (${JSON.stringify(offline)})`);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  ws.close();
} catch (err) {
  console.log('FAIL ', err.message);
  failures++;
} finally {
  chrome.kill();
  server.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
