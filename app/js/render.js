// Turns stroke primitives (data/strokes.js) into cubic Bézier geometry, SVG and
// direction-showing animation.
//
// Geometry functions work in U with y up and need no DOM (they are unit-tested
// in Node). SVG functions convert to pixels with y down.

const rad = (deg) => (deg * Math.PI) / 180;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });

// ---------------------------------------------------------------- geometry (U, y up)

// Returns { segments, start, end }. A segment is
//   { type: 'cubic', p0, c1, c2, p3 }  or  { type: 'dot', p }.
// Primitives are chained: each one starts where the previous one ended.
export function compileStroke(stroke, start = { x: 0, y: 0 }) {
  const segments = [];
  let at = start;
  for (const prim of stroke.primitives) {
    const segs = compilePrimitive(prim, at);
    segments.push(...segs);
    const last = segs[segs.length - 1];
    at = last.type === 'dot' ? last.p : last.p3;
  }
  return { segments, start, end: at };
}

function compilePrimitive(prim, p0) {
  switch (prim.type) {
    case 'line': return [lineCubic(p0, prim.angle, prim.length)];
    case 'arc': return [arcCubic(p0, prim)];
    case 'circle': return circleCubics(p0, prim);
    case 'dot': return [{ type: 'dot', p: p0 }];
    default: throw new Error(`unknown primitive type ${prim.type}`);
  }
}

function lineCubic(p0, angle, length) {
  const d = { x: Math.cos(rad(angle)), y: Math.sin(rad(angle)) };
  return {
    type: 'cubic', p0,
    c1: add(p0, mul(d, length / 3)),
    c2: add(p0, mul(d, (2 * length) / 3)),
    p3: add(p0, mul(d, length)),
  };
}

// A symmetric cubic whose control points sit at 1/3 and 2/3 along the chord, raised
// by h. Its apex is 0.75·h above the chord, so h = 4/3 · sagitta.
// `ctrl` ([[along, across], [along, across]], fractions of the chord, across positive to
// the left of travel) replaces both control points with measured ones, for shapes the
// symmetric form cannot fit (the o hook).
function arcCubic(p0, { angle, length, bulge, skew = 0, spread = 0, ctrl = null }) {
  const d = { x: Math.cos(rad(angle)), y: Math.sin(rad(angle)) };
  const n = { x: -d.y, y: d.x }; // left of the direction of travel
  const h = (4 / 3) * bulge * length;
  const p3 = add(p0, mul(d, length));
  if (ctrl) {
    const at = ([a, b]) => add(add(p0, mul(d, a * length)), mul(n, b * length));
    return { type: 'cubic', p0, c1: at(ctrl[0]), c2: at(ctrl[1]), p3 };
  }
  return {
    type: 'cubic', p0,
    c1: add(add(p0, mul(d, (1 / 3 - spread) * length)), mul(n, h * (1 - skew))),
    c2: add(add(p0, mul(d, (2 / 3 + spread) * length)), mul(n, h * (1 + skew))),
    p3,
  };
}

// A full ellipse that starts and ends at its top point (in the unrotated frame).
// `indent` (ī) adds a small inner loop at the start.
function circleCubics(p0, { width, height, tilt = 0, dir = 'ccw', indent = false }) {
  const rx = width / 2;
  const ry = height / 2;
  const c = Math.cos(rad(tilt));
  const s = Math.sin(rad(tilt));
  const rot = (v) => ({ x: v.x * c - v.y * s, y: v.x * s + v.y * c });
  const sign = dir === 'ccw' ? 1 : -1;
  const pointAt = (center, th) => add(center, rot({ x: rx * Math.cos(th), y: ry * Math.sin(th) }));
  const deriv = (th) => rot({ x: -rx * Math.sin(th), y: ry * Math.cos(th) });

  const out = [];
  let start = p0;
  if (indent) {
    // Small loop hanging inside the top of the large circle, written the opposite way.
    const r = Math.min(rx, ry) * 0.3;
    const loop = circleCubics(p0, { width: 2 * r, height: 2 * r, tilt, dir: dir === 'ccw' ? 'cw' : 'ccw' });
    // Shift the loop so that its top coincides with p0 and it sits inside the big circle.
    out.push(...loop);
    start = p0;
  }

  const th0 = Math.PI / 2;
  const center = add(start, mul(pointAt({ x: 0, y: 0 }, th0), -1));
  const step = (sign * Math.PI) / 2;
  const k = (4 / 3) * Math.tan(step / 4);
  for (let i = 0; i < 4; i++) {
    const a = th0 + i * step;
    const b = a + step;
    out.push({
      type: 'cubic',
      p0: pointAt(center, a),
      c1: add(pointAt(center, a), mul(deriv(a), k)),
      c2: add(pointAt(center, b), mul(deriv(b), -k)),
      p3: pointAt(center, b),
    });
  }
  // Snap the closing point to the exact start so the ellipse is closed.
  out[out.length - 1].p3 = start;
  return out;
}

export function cubicPoint({ p0, c1, c2, p3 }, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

// Evenly spaced (in t) points along the whole stroke.
export function samplePoints(compiled, perSegment = 32) {
  const pts = [];
  for (const seg of compiled.segments) {
    if (seg.type === 'dot') { pts.push(seg.p); continue; }
    for (let i = pts.length ? 1 : 0; i <= perSegment; i++) pts.push(cubicPoint(seg, i / perSegment));
  }
  return pts;
}

export function pathLength(compiled) {
  const pts = samplePoints(compiled, 64);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

export function bbox(compiled) {
  const pts = samplePoints(compiled);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// Unit tangent (direction of travel) at the start or end of the stroke.
export function tangent(compiled, where) {
  const segs = compiled.segments.filter((s) => s.type === 'cubic');
  if (!segs.length) return { x: 1, y: 0 };
  const seg = where === 'start' ? segs[0] : segs[segs.length - 1];
  const [a, b] = where === 'start' ? [seg.p0, firstDistinct(seg, [seg.c1, seg.c2, seg.p3])] : [lastDistinct(seg, [seg.c2, seg.c1, seg.p0]), seg.p3];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}
const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-9;
const firstDistinct = (seg, cands) => cands.find((p) => !same(p, seg.p0)) || seg.p3;
const lastDistinct = (seg, cands) => cands.find((p) => !same(p, seg.p3)) || seg.p0;

// ---------------------------------------------------------------- SVG (px, y down)

const toPx = (p, unit, o) => ({ x: o.x + p.x * unit, y: o.y - p.y * unit });
const fmt = (v) => (Math.round(v * 100) / 100).toString();

// SVG path data for the cubic segments, in px with y down, offset so `origin` (px)
// is where U-space (0,0) lands.
export function pathData(compiled, unit, origin) {
  let d = '';
  let pen = null;
  for (const seg of compiled.segments) {
    if (seg.type === 'dot') continue;
    const [p0, c1, c2, p3] = [seg.p0, seg.c1, seg.c2, seg.p3].map((p) => toPx(p, unit, origin));
    if (!pen || !same(pen, p0)) d += `M${fmt(p0.x)} ${fmt(p0.y)}`;
    d += `C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p3.x)} ${fmt(p3.y)}`;
    pen = p3;
  }
  return d;
}

// The pen-down strokes of compiled geometry, in writing order: runs of cubic segments
// with no pen lift between them. A joined outline is one stroke; a sentence has one per
// outline (and per punctuation mark). Each run has the shape of compiled geometry.
export function penStrokes(compiled) {
  const runs = [];
  let run = null;
  for (const seg of compiled.segments) {
    if (seg.type === 'dot') continue;
    if (!run || !same(run[run.length - 1].p3, seg.p0)) runs.push(run = []);
    run.push(seg);
  }
  return runs.map((segments) => ({ segments, start: segments[0].p0, end: segments[segments.length - 1].p3 }));
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

// Builds an <svg> showing one stroke at `unit` px per U. Returns the element; the
// pieces needed for animation are on `svg.parts`.
export function renderStrokeSVG(stroke, opts = {}) {
  return renderCompiledSVG(compileStroke(stroke), { label: `Gregg ${stroke.label}`, ...opts });
}

// Same, for any compiled geometry (a single stroke or a joined outline). By default the
// SVG is cropped to the ink plus `pad`; pass width/height/origin (px) to place it exactly.
export function renderCompiledSVG(compiled, {
  unit = 24, pad = 14, strokeWidth = 2.5, color = '#1d3c8f', label = 'Gregg outline',
  width: fixedWidth, height: fixedHeight, origin: fixedOrigin,
} = {}) {
  const box = bbox(compiled);
  const width = fixedWidth ?? (box.maxX - box.minX) * unit + 2 * pad;
  const height = fixedHeight ?? (box.maxY - box.minY) * unit + 2 * pad;
  const origin = fixedOrigin ?? { x: pad - box.minX * unit, y: pad + box.maxY * unit };

  const svg = el('svg', { viewBox: `0 0 ${fmt(width)} ${fmt(height)}`, width: fmt(width), height: fmt(height), class: 'stroke-svg' });
  svg.setAttribute('aria-label', label);
  // One path per pen-down stroke, each with its own start mark and end arrow.
  const parts = { svg, compiled, strokes: [], dots: [] };

  for (const run of penStrokes(compiled)) {
    const ink = el('path', { d: pathData(run, unit, origin), fill: 'none', stroke: color, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'ink' });
    svg.append(ink);
    const s = toPx(run.start, unit, origin);
    const startMark = el('circle', { cx: fmt(s.x), cy: fmt(s.y), r: strokeWidth * 1.8, fill: '#2e9d4f', class: 'start-mark' });
    svg.prepend(startMark); // under the ink, so small circles stay visible
    parts.strokes.push({ run, ink, startMark, arrow: null });
  }
  for (const seg of compiled.segments.filter((s) => s.type === 'dot')) {
    const p = toPx(seg.p, unit, origin);
    const dot = el('circle', { cx: fmt(p.x), cy: fmt(p.y), r: strokeWidth * 1.4, fill: color, class: 'ink' });
    parts.dots.push(dot);
    svg.append(dot);
  }

  // Arrows go on top of all the ink.
  for (const stroke of parts.strokes) {
    const e = toPx(stroke.run.end, unit, origin);
    const t = tangent(stroke.run, 'end');
    const dir = { x: t.x, y: -t.y }; // y down
    const nrm = { x: -dir.y, y: dir.x };
    const L = strokeWidth * 3.2;
    const W = strokeWidth * 1.8;
    const tip = add(e, mul(dir, strokeWidth * 0.8));
    const back = add(tip, mul(dir, -L));
    const pts = [tip, add(back, mul(nrm, W)), add(back, mul(nrm, -W))].map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
    stroke.arrow = el('polygon', { points: pts, fill: '#d0473a', class: 'arrow' });
    svg.append(stroke.arrow);
  }

  svg.parts = parts;
  return svg;
}

// Animates the outline being written, one pen stroke after another, each in its writing
// direction. Resolves when done.
export function animateStroke(svg, { msPerPx = 9, minMs = 350, gapMs = 120 } = {}) {
  const { strokes, dots } = svg.parts;
  const anims = [];
  let at = 0;
  for (const { ink, startMark, arrow } of strokes) {
    const len = ink.getTotalLength();
    const duration = Math.max(minMs, len * msPerPx);
    ink.style.strokeDasharray = `${len} ${len}`;
    // The start mark shows when this stroke begins; the arrow once its ink reaches the end.
    anims.push(startMark.animate([{ opacity: 0 }, { opacity: 1 }],
      { delay: at, duration: 120, fill: 'both' }).finished);
    anims.push(ink.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { delay: at, duration, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' },
    ).finished);
    anims.push(arrow.animate([{ opacity: 0 }, { opacity: 1 }],
      { delay: at + duration, duration: 150, fill: 'both' }).finished);
    at += duration + gapMs;
  }
  for (const dot of dots) {
    anims.push(dot.animate([{ opacity: 0, transform: 'scale(0.2)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: minMs, fill: 'forwards', transformOrigin: 'center' }).finished);
  }
  return Promise.all(anims).catch(() => {});
}
