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
  if (COVERAGE_DIR) {
    await send('Profiler.enable');
    await send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  }
  await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/index.html` });
  await waitReady();
  await evaluate(`localStorage.clear()`);
  await snap();
  await send('Page.reload');
  await sleep(300);
  await waitReady();

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

  // Line spacing control updates the rules and later strokes.
  await evaluate(`(() => { const r = document.getElementById('spacing'); r.value = 64; r.dispatchEvent(new Event('input')); })()`);
  check(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--line-spacing').trim()`) === '64px', 'line spacing control sets the CSS rule spacing');
  await pen(line(600, 300, 650, 300));
  s = await stored();
  check(s.data.strokes[2]?.lineSpacing === 64, 'new strokes record the new line spacing');

  // Strokes survive a reload.
  await snap();
  await send('Page.reload');
  await sleep(300);
  await waitReady();
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

  // Scoring, critiques and real-time assistance.
  await evaluate(`localStorage.removeItem('gregg.writer.v1')`); // earlier strokes taught a size; start from the example size
  await evaluate(`document.querySelector('.sections button[data-level="1"]').click()`);
  await evaluate(`document.getElementById('clear').click()`);
  await sleep(100);
  check(await evaluate(`document.getElementById('ex-title').textContent`) === 'k', 'Level 1 button jumps to the first letter');
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
  await evaluate(`document.querySelector('.sections button[data-level="1"]').click()`);
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
  await evaluate(`(() => { const b = [...document.querySelectorAll('.sections button')]; b[0].click(); })()`);
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
  await evaluate(`document.querySelector('.sections button[data-level="5"]').click()`);
  await sleep(150);
  const sent = await evaluate(`(() => ({
    title: document.getElementById('ex-title').textContent,
    counter: document.getElementById('ex-counter').textContent,
    active: document.querySelector('.sections button.active')?.dataset.level,
    ink: document.querySelectorAll('#ex-art .ex-big path.ink').length,
    starts: document.querySelectorAll('#ex-art .ex-big .start-mark').length,
    arrows: document.querySelectorAll('#ex-art .ex-big .arrow').length,
  }))()`);
  check(sent.title === 'It will be good.' && /Level 5 · Short sentences · 1 of \d+/.test(sent.counter) && sent.active === '5',
    `Level 5 button shows a sentence (${sent.title}, ${sent.counter})`);
  check(sent.ink === 5 && sent.starts === 5 && sent.arrows === 5,
    `every stroke of the sentence has its own start mark and end arrow (${sent.ink} strokes, ${sent.starts} starts, ${sent.arrows} arrows)`);

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
    tab: document.querySelector('#lesson-panel .lesson-tabs button.active')?.dataset.unit,
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
  await evaluate(`document.getElementById('clear').click()`);

  await lessonNext();
  await lessonNext();
  await sleep(200);
  ls = await lessonText();
  check(/Write k/.test(ls.title) && ls.next === 'Skip ▶' && /80 or more passes/.test(ls.status), `step 3 asks for k and can be skipped (${ls.title}, ${ls.next})`);
  await evaluate(`localStorage.removeItem('gregg.writer.v1')`);
  await pen(kPts);
  await sleep(200);
  ls = await lessonText();
  check(/Passed/.test(ls.status) && ls.next === 'Next ▶', `a good k passes the write step (${ls.status})`);
  check(await evaluate(`JSON.parse(localStorage.getItem('gregg.lessons.v1')).done['unit-1'].includes('write:letter-k')`), 'the passed step is saved');
  check(await evaluate(`document.querySelector('#lesson-panel .lesson-tabs button.active small').textContent.startsWith('1/')`), 'the unit tab counts the step');
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
  await evaluate(`location.reload()`);
  await sleep(500);
  await waitReady();
  await sleep(300);
  ls = await lessonText();
  check(/Step 7 of/.test(ls.counter) && await evaluate(`document.querySelectorAll('#lesson-panel .choice.correct').length === 1`), `after a reload the lesson resumes at the same step, answered (${ls.counter})`);
  await click('#lesson-panel .lesson-tabs button[data-unit="2"]');
  await sleep(200);
  ls = await lessonText();
  check(ls.tab === '2' && /^Unit 2 · Manual pp\. 7–11 · Step 1 of/.test(ls.counter) && ls.title === 'Circles between strokes', `the Unit 2 tab opens Unit 2 (${ls.counter})`);
  check((await attempts()) === lessonsAttemptsBefore, 'lessons did not overwrite practice attempts');

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
  const after = await evaluate(`(() => {
    const p = JSON.parse(localStorage.getItem('gregg.practice.v2') || '{}');
    return { attempts: Object.keys(p.attempts || {}).length, quiz: localStorage.getItem('gregg.quiz.v1'), writer: localStorage.getItem('gregg.writer.v1'), lessons: localStorage.getItem('gregg.lessons.v1'), title: document.getElementById('ex-title').textContent };
  })()`);
  check(beforeReset >= 3 && after.attempts === 0 && after.quiz === null && after.writer === null && after.lessons === null && after.title === 'k',
    `Reset clears practice, quiz history, lesson progress and writing size (${JSON.stringify(after)})`);

  check(consoleErrors.length === 0, `no console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ')}` : ''}`);
  await snap();
  flushCoverage();
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
