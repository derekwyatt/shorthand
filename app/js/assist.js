// Real-time assistance on the pad:
//   - a faint guide of the next outline, shown once the pen has clearly moved (a tap
//     may be a dot: the h dot, or the brief form "a", not the next outline);
//   - live warnings while writing (wrong starting direction, circle turning the wrong
//     way, stroke running too long);
//   - a short note after each stroke, about the part that stroke matched;
//   - the correct pattern drawn thinly under each written part: green if right, red if not;
//   - the whole example on the top rule, at the size it is judged at.
import { guideUnits, cleanStrokes, toUserStrokes, isDot, angleText, strokeName, DOT_MAX } from './assess.js';
import { pathData, pathLength, bbox } from './render.js';
import { compileExample } from './join.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEG = 180 / Math.PI;
const GUIDE_AFTER = 0.6; // U of pen travel before a stroke counts as "not a dot"
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

function extent(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return Math.hypot(maxX - minX, maxY - minY);
}

const MODEL_LEFT = 16; // px from the pad's left edge

// `model`: the layer for the whole example; `modelOf()` returns { example, scale, lineSpacing }
// (example null when nothing is being practised).
export function createAssist({ overlay, check, hint, model, modelOf, unitPx, enabled, nextIndex: nextIndexFor }) {
  let units = [];
  let multiOutline = false;
  let live = null;
  let hintTimer = 0;

  function say(text, level = 'info', ms = 0) {
    clearTimeout(hintTimer);
    hint.textContent = text;
    hint.className = `hint show ${level}`;
    if (ms) hintTimer = setTimeout(() => { hint.className = 'hint'; }, ms);
  }
  function quiet() { clearTimeout(hintTimer); hint.className = 'hint'; }
  function clearGuide() { overlay.replaceChildren(); }

  // The example resting on the first rule that has room above it for the whole outline.
  function drawModel() {
    if (!model) return;
    const { example, scale = 1, lineSpacing } = modelOf?.() ?? {};
    if (!example || !enabled()) { model.replaceChildren(); return; }
    const compiled = compileExample(example);
    const box = bbox(compiled);
    const u = unitPx() * scale;
    const baseline = Math.max(1, Math.ceil(((box.maxY - box.minY) * u + 4) / lineSpacing)) * lineSpacing;
    const origin = { x: MODEL_LEFT - box.minX * u, y: baseline + box.minY * u };
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData(compiled, u, origin));
    path.setAttribute('class', 'model-path');
    const dots = compiled.segments.filter((s) => s.type === 'dot').map((s) => {
      if (s.dash) {
        const l = document.createElementNS(SVG_NS, 'line');
        const x = origin.x + s.p.x * u, y = origin.y - s.p.y * u, half = (s.dash * u) / 2;
        const a = ((s.angle ?? 0) * Math.PI) / 180, hx = half * Math.cos(a), hy = half * Math.sin(a);
        l.setAttribute('x1', x - hx); l.setAttribute('x2', x + hx); l.setAttribute('y1', y + hy); l.setAttribute('y2', y - hy);
        l.setAttribute('class', 'model-path');
        return l;
      }
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', origin.x + s.p.x * u);
      c.setAttribute('cy', origin.y - s.p.y * u);
      c.setAttribute('r', 2.8);
      c.setAttribute('class', 'model-dot');
      return c;
    });
    model.replaceChildren(path, ...dots);
  }

  function drawGuide(unit, at) {
    const u = unitPx();
    const s = unit.compiled.start;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData(unit.compiled, u, { x: at.x - s.x * u, y: at.y + s.y * u }));
    path.setAttribute('class', 'guide-path');
    overlay.replaceChildren(path);
  }

  // Index of the outline the learner is about to write = outlines (not dots) already written.
  function nextIndex(padStrokes) {
    return cleanStrokes(toUserStrokes(padStrokes, unitPx())).filter((s) => !isDot(s)).length;
  }

  function partLabel(r) {
    if (r.kind === 'dot') {
      if (r.role === 'h') return 'h dot';
      return multiOutline || r.word === '.' ? `“${r.word.toLowerCase()}” (dot)` : 'dot';
    }
    return multiOutline ? `“${r.word}”` : '';
  }

  return {
    setExample(example) {
      units = guideUnits(example);
      multiOutline = !!example.words;
      live = null;
      clearGuide();
      quiet();
      drawModel();
    },

    strokeStart(stroke, padStrokes) {
      quiet();
      clearGuide();
      const point = stroke.points[0];
      const unit = units[nextIndexFor && point ? nextIndexFor(padStrokes, point) : nextIndex(padStrokes)];
      live = unit ? { unit, turn: 0, lastDir: null, warned: false, len: 0, guided: false, checkedDir: false } : null;
    },

    strokeMove(stroke) {
      if (!live) return;
      const u = unitPx();
      const pts = stroke.points;
      const n = pts.length;
      if (n < 2) return;
      const p = pts[n - 2], q = pts[n - 1];
      const seg = Math.hypot(q.x - p.x, q.y - p.y) / u;
      live.len += seg;
      if (seg > 0.04) {
        const dir = Math.atan2(-(q.y - p.y), q.x - p.x) * DEG; // y up
        if (live.lastDir !== null) live.turn += wrap(dir - live.lastDir);
        live.lastDir = dir;
      }

      // Until the pen has clearly travelled, this could be a dot rather than the next outline.
      if (!live.guided) {
        if (live.len < GUIDE_AFTER || extent(pts) / u < DOT_MAX) return;
        live.guided = true;
        if (enabled()) drawGuide(live.unit, pts[0]);
      }
      if (live.warned || !enabled()) return;

      const { unit } = live;
      const name = strokeName(unit.consonant);
      if (unit.firstCircle) {
        if (Math.abs(live.turn) > 200 && Math.sign(live.turn) !== unit.firstCircle.rot) {
          live.warned = true;
          say(`↻ The ${unit.firstCircle.tok} circle goes ${unit.firstCircle.rot < 0 ? 'clockwise' : 'counter-clockwise'}.`, 'warn');
        }
        return;
      }
      const a = pts[0];
      if (!live.checkedDir && Math.hypot(q.x - a.x, q.y - a.y) / u >= 0.4) {
        live.checkedDir = true;
        const ang = Math.atan2(-(q.y - a.y), q.x - a.x) * DEG;
        const want = Math.atan2(unit.startDir.y, unit.startDir.x) * DEG;
        if (Math.abs(wrap(ang - want)) > 60) {
          live.warned = true;
          say(`↗ ${name} starts ${angleText(want)}.`, 'warn');
          return;
        }
      }
      const modelLen = pathLength(unit.compiled);
      if (live.len > modelLen * 1.7 + 0.3) {
        live.warned = true;
        say(`✋ That's already longer than ${name}, which is about ${modelLen.toFixed(1)} units long.`, 'warn');
      }
    },

    // After a stroke: a note about the part *this* stroke matched (a dot or an outline).
    afterStroke(result, stroke) {
      clearGuide();
      live = null;
      if (!result || !stroke?.points.length) return;
      const t0 = stroke.points[0].t;
      const r = result.units.find((x) => x.user && x.user.pts[0].t === t0);
      const rep = result.repeats?.find((x) => x.strokes.some((s) => s.points[0]?.t === t0));
      const inner = rep ? rep.result : result;
      const progress = inner.complete ? '' : `  (${inner.written} of ${inner.expected})`;
      const prefix = result.repeats?.length > 1 && rep ? `Repeat ${result.repeats.indexOf(rep) + 1}: ` : '';
      if (!r) {
        if (extent(stroke.points) / unitPx() < 0.15) return; // a pen bounce
        say(`${prefix}⚠ That stroke doesn't match anything in the example.${progress}`, 'warn', 5000);
        return;
      }
      const label = partLabel(r);
      const first = r.critiques.find((c) => c.level === 'error') ?? r.critiques[0];
      if (!first) say(`${prefix}✓ ${label ? `${label} ` : ''}looks right${progress}`, 'good', 3500);
      else say(`${prefix}${first.level === 'error' ? '✗' : '⚠'} ${first.text}${progress}`, first.level === 'error' ? 'bad' : 'warn', 6000);
    },

    // Thin green/red pattern under each written part (pad px; learner U is y-up).
    drawCheck(result) {
      const u = unitPx();
      const nodes = [];
      for (const c of result?.check ?? []) {
        const cls = c.ok ? 'ok' : 'bad';
        if (c.kind === 'outline') {
          const d = pathData({ segments: c.segments }, u, { x: 0, y: 0 });
          if (!d) continue;
          const el = document.createElementNS(SVG_NS, 'path');
          el.setAttribute('d', d);
          el.setAttribute('class', `check-path ${cls}`);
          nodes.push(el);
        } else {
          const el = document.createElementNS(SVG_NS, 'circle');
          el.setAttribute('cx', c.p.x * u);
          el.setAttribute('cy', -c.p.y * u);
          el.setAttribute('r', 2.6);
          el.setAttribute('class', `check-dot ${cls}`);
          nodes.push(el);
        }
      }
      check.replaceChildren(...nodes);
      drawModel(); // the writer's size may have been re-learned
    },

    reset() { clearGuide(); quiet(); live = null; drawModel(); },
    drawModel,
  };
}
