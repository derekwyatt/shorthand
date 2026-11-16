// Repeats: the learner writes the example many times on the pad. Letters: every stroke is
// one repeat. Everything else: every line of writing is one repeat. Each repeat is
// assessed separately with assessAttempt (assess.js).
import { assessAttempt, toUserStrokes, guideUnits, DOT_MAX } from './assess.js';
import { bbox } from './render.js';

const BOUNCE = 0.15; // U: a smaller stroke is a pen bounce (except the h dot)
const LINE_JOIN = 0.6; // of the line spacing: how close a stroke is to a line's writing
const DOT_JOIN = 1.0;
const MAX_RECURRING = 3;

const isLetter = (example) => example.kind === 'letter';

// Size (bbox diagonal, U) and centroid y (px, y down) of one pad stroke.
function measure(stroke, unitPx) {
  const [u] = toUserStrokes([stroke], unitPx);
  if (!u) return { size: 0, y: 0, bottom: 0, t: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, sumY = 0;
  for (const p of u.pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    sumY += p.y;
  }
  return { size: Math.hypot(maxX - minX, maxY - minY), y: -(sumY / u.pts.length) * unitPx, bottom: -minY * unitPx, t: u.pts[0].t };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const groupY = (g) => mean((g.big.length ? g.big : g.all).map((m) => m.y));

// Groups of { strokes, big: [measure], all: [measure] } in order of first stroke.
function lineGroups(strokes, { unitPx, lineSpacing }) {
  const items = strokes
    .map((stroke) => ({ stroke, ...measure(stroke, unitPx) }))
    .filter((m) => m.t !== undefined)
    .sort((a, b) => a.t - b.t);
  const groups = [];
  for (const m of items) {
    const dot = m.size < DOT_MAX;
    let best = null;
    let bestD = Infinity;
    for (const g of groups) {
      const d = Math.abs(groupY(g) - m.y);
      if (d < bestD) { best = g; bestD = d; }
    }
    const limit = (dot ? DOT_JOIN : LINE_JOIN) * lineSpacing;
    let g = best && bestD <= limit ? best : null;
    if (!g) {
      g = { strokes: [], big: [], all: [] };
      groups.push(g);
    }
    g.strokes.push(m.stroke);
    g.all.push(m);
    if (!dot) g.big.push(m);
  }
  return groups;
}

export function groupRepeats(example, strokes, { unitPx, lineSpacing }) {
  if (isLetter(example)) {
    const keepAll = example.id === 'letter-h';
    return strokes
      .map((stroke) => ({ stroke, ...measure(stroke, unitPx) }))
      .filter((m) => m.t !== undefined && (keepAll || m.size >= BOUNCE))
      .sort((a, b) => a.t - b.t)
      .map((m) => [m.stroke]);
  }
  return lineGroups(strokes, { unitPx, lineSpacing }).map((g) => g.strokes);
}

// Lines of writing on the pad, top to bottom: { y (px, centre of the writing), strokes }.
// Lines holding only dots are left out.
export function practiceLines(strokes, { unitPx, lineSpacing }) {
  return lineGroups(strokes, { unitPx, lineSpacing })
    .filter((g) => g.big.length)
    .map((g) => ({ y: groupY(g), strokes: g.strokes }))
    .sort((a, b) => a.y - b.y);
}

// Normalised key of a critique, for spotting issues that recur across repeats.
const issueKey = (text) => text.split(/[:.]/)[0].replace(/\d/g, '').replace(/\s+/g, ' ').trim();

export function assessRepeats(example, strokes, { unitPx, lineSpacing, scale = 1 }) {
  const groups = groupRepeats(example, strokes, { unitPx, lineSpacing });
  const repeats = groups.map((g) => ({
    strokes: g,
    result: assessAttempt(example, g, unitPx, { scale }),
    start: Math.max(...g.map((s) => measure(s, unitPx).t)),
  }));
  let latest = null;
  for (const r of repeats) if (!latest || r.start > latest.start) latest = r;
  const done = repeats.filter((r) => r.result.complete);
  let last = null;
  for (const r of done) if (!last || r.start > last.start) last = r;
  const scores = done.map((r) => r.result.score);

  let critiques = [];
  if (latest) {
    critiques = latest.result.complete ? [...latest.result.critiques] : latest.result.critiques.filter((c) => !c.text.startsWith('Missing'));
  }
  const counts = new Map();
  for (const r of done) {
    for (const key of new Set(r.result.critiques.map((c) => issueKey(c.text)).filter(Boolean))) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, MAX_RECURRING).forEach(([key, n]) => {
    critiques.push({ level: 'info', text: `In ${n} of ${done.length} repeats: ${key}.` });
  });

  return {
    repeats: repeats.map(({ strokes: s, result }) => ({ strokes: s, result })),
    latest: latest ? { strokes: latest.strokes, result: latest.result } : null,
    units: repeats.flatMap((r) => r.result.units),
    check: repeats.flatMap((r) => r.result.check ?? []),
    strokes: strokes.length,
    count: repeats.length,
    completedCount: done.length,
    correctCount: scores.filter((s) => s >= 80).length,
    best: scores.length ? Math.max(...scores) : null,
    score: scores.length ? Math.round(mean(scores)) : 0,
    complete: done.length > 0,
    written: latest ? latest.result.written : 0,
    expected: latest ? latest.result.expected : 0,
    latestComplete: latest ? latest.result.complete : false,
    critiques,
    lastCompleted: last ? last.result : null,
  };
}

// Index of the outline the learner is about to write: 0 for letters; otherwise the
// number of outlines already written on the line at `point`.
// Which outline a new stroke starting at `point` (px) is: the next one of the line it
// continues, or the first of a new line. A line's next outline is expected to start at its
// own height above the line's writing line (the lowest ink), so a tall outline that starts
// high, like b after "it will", still continues the line.
export function repeatIndexFor(example, padStrokes, point, { unitPx, lineSpacing, scale = 1 }) {
  if (isLetter(example)) return 0;
  const units = guideUnits(example);
  let best = null;
  for (const g of lineGroups(padStrokes, { unitPx, lineSpacing })) {
    if (!g.big.length || g.big.length >= units.length) continue;
    const next = units[g.big.length].compiled;
    const rise = next.start.y - bbox(next).minY; // U above the outline's lowest point
    const base = Math.max(...g.big.map((m) => m.bottom));
    const d = Math.abs(base - rise * scale * unitPx - point.y);
    if (d <= LINE_JOIN * lineSpacing && (!best || d < best.d)) best = { d, index: g.big.length };
  }
  return best ? best.index : 0;
}
