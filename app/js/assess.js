// Scores a learner's attempt against the example they were copying, and explains what
// is off. This is *verification* of a known target, not open-ended recognition.
//
// Per outline it finds the vowel circles (loops) in the pen path, measures what is left
// (the consonant: slant, length, curve), works out which letter that actually reads as,
// and checks each circle's direction, size and side. Dots (h, and the brief form "a")
// are matched by position. Everything works in U (1 U = length of t), y up.
//
// No DOM: unit-tested in Node (tests/assess.test.mjs).
import { STROKES, STROKE_BY_ID, U_PER_LINE } from '../data/strokes.js';
import { EXAMPLES } from '../data/examples.js';
import { circleRotation, circleOf, isDisjoin, isDoubledHook, isMark, isWLoop, JOIN_CIRCLE, layoutWords } from './join.js';
import { samplePoints, tangent, cubicPoint } from './render.js';
import { WRITER_MAX } from './writer.js';

const DEG = 180 / Math.PI;

// A repeat (or a quiz answer, or a lesson's write step) passes at this score.
export const PASS_SCORE = 70;
// How much closer another letter must be before an outline "reads as" it. Within this
// margin the intended letter gets the benefit of the doubt, and only the length or angle
// is critiqued: a slightly short m is a short m, not an n.
const READS_AS_MARGIN = 1.0;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a, b) => a.x * b.y - a.y * b.x;
const angleOf = (v) => Math.atan2(v.y, v.x) * DEG;
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isCircleTok = (t) => circleOf(t) !== null;

export const DOT_MAX = 0.4; // a stroke smaller than this (bbox diagonal, U) is a dot
const NAME = {
  'th-over': 'th (over-curve)', 'th-under': 'th (under-curve)',
  's-left': 's (left curve)', 's-right': 's (right curve)', period: 'the period mark',
};
export const strokeName = (s) => NAME[s.id] || s.label;

// ---------------------------------------------------------------- geometry helpers

export function pathLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i], pts[i - 1]);
  return L;
}
function bboxOf(pts) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
const extentOf = (pts) => { const b = bboxOf(pts); return Math.hypot(b.maxX - b.minX, b.maxY - b.minY); };
const centroid = (pts) => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
function signedArea(pts) { // > 0 counter-clockwise (y up)
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
  return a / 2;
}
function segIntersect(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const t = cross(sub(c, a), s) / den, u = cross(sub(c, a), r) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? { x: a.x + t * r.x, y: a.y + t * r.y } : null;
}
function cumulative(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + dist(pts[i], pts[i - 1]));
  return acc;
}
// Unit direction of travel over the first (or last) `span` U of a path.
function dirAt(pts, where, span = 0.35) {
  const seq = where === 'start' ? pts : [...pts].reverse();
  let k = 1;
  while (k < seq.length - 1 && dist(seq[k], seq[0]) < span) k++;
  const v = where === 'start' ? sub(seq[k], seq[0]) : sub(seq[0], seq[k]);
  const L = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / L, y: v.y / L };
}
function compass(v) {
  const names = ['right', 'up-right', 'up', 'up-left', 'left', 'down-left', 'down', 'down-right'];
  return names[(Math.round(angleOf(v) / 45) + 8) % 8];
}
// Where a circle sits, as words: "above", "below and to the left of".
const BESIDE = {
  right: 'to the right of', 'up-right': 'above and to the right of', up: 'above', 'up-left': 'above and to the left of',
  left: 'to the left of', 'down-left': 'below and to the left of', down: 'below', 'down-right': 'below and to the right of',
};
const besideWords = (v) => BESIDE[compass(v)];
// "up to the right at 30°", "level, left to right", "down to the left at 55°"
export function angleText(a) {
  a = wrap(a);
  if (Math.abs(a) < 6) return 'level, left to right';
  if (Math.abs(a) > 174) return 'level, right to left';
  const elev = Math.round(Math.abs(a) <= 90 ? Math.abs(a) : 180 - Math.abs(a));
  return `${a > 0 ? 'up' : 'down'} to the ${Math.abs(a) < 90 ? 'right' : 'left'} at ${elev}°`;
}

// ---------------------------------------------------------------- model side

// The units a learner has to write for an example: outlines (one pen-down each) and dots.
export function modelUnits(example) {
  const words = example.words ?? [{ text: example.title, tokens: example.outline }];
  const units = [];
  for (const w of layoutWords(words).flatMap(disjoinedParts)) {
    const toks = w.tokens;
    const dots = w.compiled.segments.filter((s) => s.type === 'dot');
    // §99 / §100 / §233 marks are written apart, like the h dot: each is a unit of its own.
    for (const s of dots.filter((d) => d.mark)) units.push({ kind: 'dot', role: s.mark, word: w.text, pos: s.p });
    if (toks.filter((t) => !isMark(t)).join() === 'h') {
      units.push({ kind: 'dot', role: 'brief', word: w.text, pos: dots.find((d) => !d.mark).p });
      continue;
    }
    const main = toks.filter((t) => t !== 'h' && !isMark(t));
    const consonants = main.filter((t) => !isCircleTok(t));
    // Joined consonants, the §74 s loop, the w loop, the broken circle, the doubled hooks
    // of the diphthongs and ld (on its own its stroke is easily taken for md): the whole
    // shape is matched, not its parts.
    if (consonants.length >= 2 || consonants.includes('ld') || main.some((t, k) => circleOf(t)?.loop || circleOf(t)?.broken || isWLoop(main, k) || isDoubledHook(main, k))) {
      // Joined consonants (level 7): the whole shape is matched, not its parts.
      const geometry = { ...w.compiled, segments: [], tokenOf: [] };
      w.compiled.segments.forEach((seg, k) => {
        if (seg.type === 'dot') return;
        geometry.segments.push(seg);
        geometry.tokenOf.push(w.compiled.tokenOf[k]);
      });
      units.push({
        kind: 'outline', shape: true, word: w.text, tokens: main, allTokens: toks, consonant: STROKE_BY_ID[consonants[0]],
        circles: [], compiled: geometry, start: geometry.start,
      });
      continue;
    }
    const cons = STROKE_BY_ID[consonants[0]];
    const ci = main.indexOf(consonants[0]);
    // tok is the circle's size (a or e); `r` marks the §71 left-motion r circle.
    const circles = main.flatMap((t, i) => {
      const c = circleOf(t);
      return c ? [{ tok: c.size, r: c.reversed, at: i < ci ? 'start' : 'end', rot: circleRotation(cons) * (c.reversed ? -1 : 1) }] : [];
    });
    const geometry = { ...w.compiled, segments: w.compiled.segments.filter((s) => s.type !== 'dot') };
    const outline = { kind: 'outline', word: w.text, tokens: main, allTokens: toks, consonant: cons, circles, compiled: geometry, start: geometry.start };
    if (toks[0] === 'h') units.push({ kind: 'dot', role: 'h', word: w.text, pos: dots.find((d) => !d.mark).p, owner: outline });
    units.push(outline);
  }
  return units;
}

// A word with a §209 disjoined prefix or a §230 disjoined suffix is two pen-downs: each part is scored as an outline of
// its own (tokenOf renumbered within the part).
function disjoinedParts(w) {
  const k = w.tokens.findIndex(isDisjoin);
  if (k < 0) return [w];
  return [[0, k], [k + 1, w.tokens.length]].map(([from, to]) => {
    const segments = [], tokenOf = [];
    w.compiled.segments.forEach((s, i) => {
      const t = w.compiled.tokenOf[i];
      if (t >= from && t < to) { segments.push(s); tokenOf.push(t - from); }
    });
    const first = segments.find((s) => s.type === 'cubic'), last = segments.filter((s) => s.type === 'cubic').at(-1);
    return { ...w, tokens: w.tokens.slice(from, to), compiled: { ...w.compiled, segments, tokenOf, start: first.p0, end: last.p3, tokens: w.tokens.slice(from, to) } };
  });
}

// Letters a consonant stroke could be confused with (single straight lines and curves;
// hooks and blends are not taught yet).
const CANDIDATES = STROKES.filter((s) => s.primitives.length === 1 && ['line', 'arc'].includes(s.primitives[0].type) && !s.verify);

// How far a stroke's features are from letter `s` (0 = exactly it).
function strokeCost(f, s, scale) {
  const p = s.primitives[0];
  return (wrap(f.angle - p.angle) / 20) ** 2
    + (Math.log(f.length / (p.length * scale)) / Math.log(1.45)) ** 2
    + ((f.bulge - (p.bulge ?? 0)) / 0.09) ** 2;
}

// The letter the stroke reads as. `expected`, if given, wins unless another letter is
// clearer by READS_AS_MARGIN.
function classify(f, scale, expected = null) {
  let best = null;
  for (const s of CANDIDATES) {
    const cost = strokeCost(f, s, scale);
    if (!best || cost < best.cost) best = { stroke: s, cost };
  }
  if (expected && best.stroke.id !== expected.id && CANDIDATES.includes(expected)) {
    const cost = strokeCost(f, expected, scale);
    if (cost - best.cost <= READS_AS_MARGIN) return { stroke: expected, cost };
  }
  return best;
}

// §8 vowel marks: checked when written, but not needed to finish the outline.
const isVowelMark = (m) => m.role === 'v-dash' || m.role === 'v-dot';

// What the outline (or brief form) would mean if its consonant were `other`.
function readsAs(model, other) {
  // Compared without marks: a vowel mark doesn't make a different outline.
  const bare = (outline) => outline.filter((t) => !isMark(t)).join(' ');
  const swapped = bare(model.allTokens.map((t) => (t === model.consonant.id ? other.id : t)));
  const word = EXAMPLES.find((e) => e.kind === 'word' && bare(e.outline) === swapped);
  if (word) return `“${word.title}”`;
  if (model.allTokens.length === 1 && other.briefForms.length) return other.briefForms.map((b) => `“${b}”`).join(' / ');
  return null;
}

// ---------------------------------------------------------------- learner side

export function toUserStrokes(strokes, unitPx) {
  return strokes
    .map((s) => ({
      pts: s.points
        .map((p) => (Array.isArray(p) ? { x: p[0], y: p[1], t: p[2] } : p))
        .map((p) => ({ x: p.x / unitPx, y: -p.y / unitPx, t: p.t })),
    }))
    .filter((s) => s.pts.length);
}

// Drop pen bounces: a tiny, very short touch immediately followed by a stroke that
// starts at the same spot.
export function cleanStrokes(us) {
  return us.filter((s, i) => {
    const n = us[i + 1];
    if (!n) return true;
    const dur = s.pts[s.pts.length - 1].t - s.pts[0].t;
    const gap = n.pts[0].t - s.pts[s.pts.length - 1].t;
    return !(extentOf(s.pts) < 0.15 && dur < 80 && gap < 150 && dist(s.pts[0], n.pts[0]) < 0.25);
  });
}
// Small AND short: a small o hook (≈ 0.45 U across, but ≈ 0.7 U of travel) is not a dot.
const DOT_TRAVEL_MAX = 0.45;
const travelOf = (pts) => pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
export const isDot = (s) => extentOf(s.pts) < DOT_MAX && travelOf(s.pts) < DOT_TRAVEL_MAX;

// Hand jitter, smoothed away before measuring: the path is resampled every SMOOTH_STEP U
// and averaged over ±SMOOTH_RADIUS samples. Without this a short line (n, t) wobbles enough
// to count as a curve, and a small e circle can seem to turn the wrong way. The first and
// last points stay where the pen touched down and lifted.
const SMOOTH_STEP = 0.04;
const SMOOTH_RADIUS = 2;
export function smoothPath(pts) {
  if (pts.length < 3) return pts;
  const even = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = dist(a, b);
    let at = SMOOTH_STEP - carry;
    while (at <= d) {
      const k = at / d;
      even.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t: a.t + (b.t - a.t) * k });
      at += SMOOTH_STEP;
    }
    carry = d - (at - SMOOTH_STEP);
  }
  even.push(pts[pts.length - 1]);
  if (even.length < 2 * SMOOTH_RADIUS + 3) return even;
  return even.map((p, i) => {
    if (i === 0 || i === even.length - 1) return p;
    const r = Math.min(SMOOTH_RADIUS, i, even.length - 1 - i);
    let x = 0, y = 0;
    for (let j = i - r; j <= i + r; j++) { x += even[j].x; y += even[j].y; }
    return { x: x / (2 * r + 1), y: y / (2 * r + 1), t: p.t };
  });
}

// A loop at the start of a path: the first self-crossing, or (if the writer closed the
// circle without crossing) the closest return to the starting point.
function findStartLoop(pts, expectedDiameter) {
  if (pts.length < 6) return null;
  const acc = cumulative(pts);
  const minLen = Math.PI * expectedDiameter * 0.3;
  for (let j = 2; j < pts.length - 1; j++) {
    for (let i = 0; i < j - 1; i++) {
      if (acc[i] > Math.PI * expectedDiameter) break; // the loop must start near the stroke's start
      if (acc[j] - acc[i] < minLen) continue;
      const X = segIntersect(pts[i], pts[i + 1], pts[j], pts[j + 1]);
      if (X) return { loop: [X, ...pts.slice(i + 1, j + 1), X], joint: X, rest: [X, ...pts.slice(j + 1)] };
    }
  }
  const tol = Math.max(0.3, 0.45 * expectedDiameter);
  let best = -1;
  for (let j = 1; j < pts.length - 1; j++) {
    if (acc[j] < minLen) continue;
    const d = dist(pts[j], pts[0]);
    if (d < tol && (best < 0 || d < dist(pts[best], pts[0]))) best = j;
    else if (best >= 0 && d > dist(pts[best], pts[0]) + 0.15) break; // past the closest point
  }
  if (best < 0) return null;
  return { loop: pts.slice(0, best + 1), joint: pts[best], rest: pts.slice(best) };
}
function hasLoop(pts) {
  const acc = cumulative(pts);
  for (let j = 2; j < pts.length - 1; j++) {
    for (let i = 0; i < j - 1; i++) {
      if (acc[j] - acc[i] > 0.8 && segIntersect(pts[i], pts[i + 1], pts[j], pts[j + 1])) return true;
    }
  }
  return false;
}

// Chord angle, chord length and signed bulge (sagitta / chord, + = left of travel).
export function strokeFeatures(pts) {
  const a = pts[0], b = pts[pts.length - 1];
  const c = sub(b, a);
  const L = Math.hypot(c.x, c.y);
  let bulge = 0;
  if (L > 1e-6) {
    const d = { x: c.x / L, y: c.y / L };
    for (const p of pts) {
      const h = cross(d, sub(p, a));
      if (Math.abs(h) > Math.abs(bulge)) bulge = h;
    }
    bulge /= L;
  }
  // The ends' directions over a quarter of the stroke at most: over a fixed span a small
  // hook's end direction would be its chord's.
  const span = Math.min(0.35, pathLen(pts) / 4);
  return { angle: angleOf(c), length: L, bulge, startDir: dirAt(pts, 'start', span), endDir: dirAt(pts, 'end', span) };
}

// ---------------------------------------------------------------- one outline

function assessOutline(model, user, scale) {
  const critiques = [];
  let penalty = 0;
  const add = (level, text, p) => { critiques.push({ level, text }); penalty += p; };
  const cons = model.consonant;
  const name = strokeName(cons);
  const loops = {};

  let pts = user.pts;
  for (const c of model.circles) {
    const d = JOIN_CIRCLE[c.tok] * scale;
    if (c.at === 'start') {
      const r = findStartLoop(pts, d);
      if (r) { loops.start = r; pts = r.rest; }
    } else {
      const r = findStartLoop([...pts].reverse(), d);
      if (r) { loops.end = { loop: [...r.loop].reverse(), joint: r.joint }; pts = [...r.rest].reverse(); }
    }
  }
  if (!model.circles.length && hasLoop(pts)) add('error', `There is a loop in your stroke, but ${name} has no circle.`, 20);

  const f = pts.length >= 2 ? strokeFeatures(pts) : null;
  let best = null;
  if (!f || f.length < 0.12) {
    add('error', `I couldn't find the ${name} stroke.`, 60);
  } else {
    const prim = cons.primitives[0];
    const exp = { angle: prim.angle, length: prim.length * scale, bulge: prim.bulge ?? 0 };
    best = classify(f, scale, cons);

    const dAng = wrap(f.angle - exp.angle);
    if (Math.abs(dAng) > 110) {
      add('error', `Wrong direction: ${name} goes ${angleText(exp.angle)}; yours goes ${angleText(f.angle)}.`, 45);
    } else if (Math.abs(dAng) > 12) {
      const elev = (a) => { const w = Math.abs(wrap(a)); return w <= 90 ? w : 180 - w; };
      const flatter = elev(f.angle) < elev(exp.angle);
      add(Math.abs(dAng) > 22 ? 'error' : 'warn',
        `Too ${flatter ? 'flat' : 'steep'}: ${name} goes ${angleText(exp.angle)}; yours goes ${angleText(f.angle)}.`,
        Math.min(25, (Math.abs(dAng) - 10) * 1.2));
    }

    const r = f.length / exp.length;
    if (r > 1.45) add(r > 1.8 ? 'error' : 'warn', `Too long: about ${r.toFixed(1)}× the length of ${name}.`, Math.min(25, (Math.log(r) - Math.log(1.45)) * 80));
    else if (r < 0.69) add(r < 0.55 ? 'error' : 'warn', `Too short: about ${r.toFixed(1)}× the length of ${name}.${cons.size === 'long' ? ` ${longStrokeSize(cons, name)}` : ''}`, Math.min(25, (Math.log(1 / r) - Math.log(1.45)) * 80));

    const bm = exp.bulge, bu = f.bulge;
    const side = (b, ang) => { const t = { x: Math.cos(ang / DEG), y: Math.sin(ang / DEG) }; return compass({ x: -t.y * Math.sign(b), y: t.x * Math.sign(b) }); };
    if (bm === 0) {
      if (Math.abs(bu) > 0.1) add(Math.abs(bu) > 0.16 ? 'error' : 'warn', `${name} is a straight line; yours curves (bulging ${side(bu, f.angle)}).`, Math.min(30, (Math.abs(bu) - 0.08) * 150));
    } else if (Math.sign(bu) !== Math.sign(bm) && Math.abs(bu) > 0.05) {
      add('error', `Curves the wrong way: ${name} bulges ${side(bm, exp.angle)}; yours bulges ${side(bu, f.angle)}.`, 35);
    } else if (Math.abs(bu) < Math.abs(bm) * 0.35) {
      add('warn', `Too straight: ${name} is a curve that bulges ${side(bm, exp.angle)}.`, 15);
    } else if (Math.abs(bu) > Math.abs(bm) * 2.6) {
      add('warn', `The curve is too deep for ${name}.`, 10);
    }

    if (best.stroke.id !== cons.id) {
      const other = strokeName(best.stroke);
      const as = readsAs(model, best.stroke);
      critiques.unshift({ level: 'error', text: `This reads as ${other}, not ${name}${as ? `, so the outline says ${as}` : ''}.` });
      penalty = Math.max(penalty, 45);
    }
  }

  // Circles: present, direction, size, side.
  for (const c of model.circles) {
    const where = c.at === 'start' ? 'beginning' : 'end';
    const L = loops[c.at];
    if (!L) { add('error', `Missing the ${c.tok} circle at the ${where} of ${name}.`, 35); continue; }
    const area = signedArea(L.loop);
    const want = c.rot < 0 ? 'clockwise' : 'counter-clockwise';
    if (Math.sign(area) !== c.rot) add('error', `The ${c.tok} circle should go ${want}; yours goes ${area < 0 ? 'clockwise' : 'counter-clockwise'}.`, 25);
    const b = bboxOf(L.loop);
    const d = ((b.maxX - b.minX) + (b.maxY - b.minY)) / 2;
    const split = Math.sqrt(JOIN_CIRCLE.a * JOIN_CIRCLE.e) * scale;
    // As with letters, the intended circle gets the benefit of the doubt near the split.
    if (c.tok === 'a' && d < split * 0.85) add('error', 'The circle is too small: it reads as e (small circle), not a (large circle).', 25);
    else if (c.tok === 'e' && d > split * 1.15) add('error', 'The circle is too large: it reads as a (large circle), not e (small circle).', 25);
    else {
      const ratio = d / (JOIN_CIRCLE[c.tok] * scale);
      if (ratio > 1.6) add('warn', `The ${c.tok} circle is about ${ratio.toFixed(1)}× the size in the example.`, 5);
      else if (ratio < 0.6) add('warn', `The ${c.tok} circle is about ${ratio.toFixed(1)}× the size in the example.`, 5);
    }
    if (f) {
      const dir = c.at === 'start' ? f.startDir : f.endDir;
      const sideNow = Math.sign(cross(dir, sub(centroid(L.loop), L.joint)));
      if (sideNow && sideNow !== c.rot) {
        const n = { x: -dir.y * c.rot, y: dir.x * c.rot };
        const rule = c.r ? 'turned with left motion to add r (Manual §71)'
          : cons.primitives[0].type === 'arc' ? 'inside the curve (Manual §11)' : 'on the clockwise side (Manual §12)';
        add('error', `The ${c.tok} circle is on the wrong side: it belongs ${besideWords(n)} the point where it joins ${name}, ${rule}.`, 20);
      }
    }
  }

  return { score: Math.round(100 - Math.min(100, penalty)), critiques, readsAs: best?.stroke.id ?? null, loops };
}

// ---------------------------------------------------------------- one joined outline (level 7)

// Whole-shape scoring for outlines of 2+ consonants. Calibrated on the level 7 words:
// a perfect copy with hand jitter scores >= 90; another word's outline scores < 70.
export const SHAPE = {
  samples: 64,
  sizeBand: [0.7, 1.4], // userLength / (modelLength * scale) outside this is a size critique
  slope: 330,           // score points lost per unit of mean normalised shape distance
  drift: 0.2,           // U: a token whose samples are this far from the model on average drifts
  reverseSmall: 0.12,   // a reversed fit this close (normalised) counts as "written backwards"
};

// Points and the token that owns each one, along the model outline.
function modelPath(unit) {
  const pts = [];
  const owner = [];
  unit.compiled.segments.forEach((seg, k) => {
    for (let i = pts.length ? 1 : 0; i <= 32; i++) { pts.push(cubicPoint(seg, i / 32)); owner.push(unit.compiled.tokenOf[k]); }
  });
  return { pts, owner };
}

// n points evenly spaced by arc length (owner = token of the sample point, if given).
function resample(pts, n, owner = null) {
  const acc = cumulative(pts);
  const total = acc[acc.length - 1];
  const out = [];
  const own = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (j < pts.length - 1 && acc[j] < target) j++;
    const span = acc[j] - acc[j - 1];
    const f = span > 1e-12 ? clamp((target - acc[j - 1]) / span, 0, 1) : 0;
    out.push({ x: pts[j - 1].x + f * (pts[j].x - pts[j - 1].x), y: pts[j - 1].y + f * (pts[j].y - pts[j - 1].y) });
    if (owner) own.push(owner[f < 0.5 ? j - 1 : j]);
  }
  return { pts: out, owner: own, length: total };
}

// Mean distance between two equally sampled paths after scaling each to unit length and
// centring it on its centroid.
function shapeDistance(a, la, b, lb) {
  const ca = centroid(a), cb = centroid(b);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.hypot((a[i].x - ca.x) / la - (b[i].x - cb.x) / lb, (a[i].y - ca.y) / la - (b[i].y - cb.y) / lb);
  return sum / a.length;
}

// The point of `path` nearest to p.
function nearestOnPath(p, path) {
  let best = null, bd = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const v = sub(b, a);
    const L2 = v.x * v.x + v.y * v.y;
    const f = L2 > 1e-12 ? clamp(((p.x - a.x) * v.x + (p.y - a.y) * v.y) / L2, 0, 1) : 0;
    const q = { x: a.x + f * v.x, y: a.y + f * v.y };
    const d = dist(p, q);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

// Scale and offset that lay the model's samples over the learner's ink (q = s·p + t).
// Starts from the extents and centroids, then refines a few times on nearest points both
// ways (model to ink and ink to model, so the fit can't shrink onto part of the ink). Not
// from the path lengths: a wavy hand or an overshoot at a corner lengthens the ink, and a
// model scaled to that length lands beside a correctly written short stroke.
function fitModel(M, U) {
  const cM = centroid(M), cU = centroid(U);
  let s = extentOf(U) / (extentOf(M) || 1);
  let t = { x: cU.x - s * cM.x, y: cU.y - s * cM.y };
  for (let it = 0; it < 8; it++) {
    const T = (p) => ({ x: s * p.x + t.x, y: s * p.y + t.y });
    const placed = M.map(T);
    const pairs = [
      ...M.map((p, i) => [p, nearestOnPath(placed[i], U)]),
      ...U.map((q) => { const n = nearestOnPath(q, placed); return [{ x: (n.x - t.x) / s, y: (n.y - t.y) / s }, q]; }),
    ];
    const mm = centroid(pairs.map((x) => x[0])), um = centroid(pairs.map((x) => x[1]));
    let num = 0, den = 0;
    for (const [p, q] of pairs) { const a = sub(p, mm), b = sub(q, um); num += a.x * b.x + a.y * b.y; den += a.x * a.x + a.y * a.y; }
    if (den < 1e-9) break;
    s = num / den;
    t = { x: um.x - s * mm.x, y: um.y - s * mm.y };
  }
  return { s, t };
}

// "the r", "the a-circle at the beginning", "the e-circle between k and t".
function tokenPhrase(tokens, i) {
  const t = tokens[i];
  if (!isCircleTok(t)) return `the ${t === 'h' ? 'h-dot' : strokeName(STROKE_BY_ID[t])}`;
  const nameAt = (k) => (STROKE_BY_ID[tokens[k]] ? strokeName(STROKE_BY_ID[tokens[k]]) : null);
  const [p, n] = [nameAt(i - 1), nameAt(i + 1)];
  const { size, reversed } = circleOf(t);
  const circle = `the ${size}-circle${reversed ? ' for r' : ''}`;
  if (p && n) return `${circle} between ${p} and ${n}`;
  return `${circle} at the ${p ? 'end' : 'beginning'}`;
}

export function assessShape(unit, user, { scale = 1 } = {}) {
  const critiques = [];
  let penalty = 0;
  const add = (level, text, p) => { critiques.push({ level, text }); penalty += p; };
  const q = `“${unit.word}”`;
  const model = modelPath(unit);
  // The learner's ink is smoothed (smoothPath); the model is smoothed the same way before
  // the shapes are compared, or a tight turn (the o hook) would count against a perfect copy.
  const smoothModel = smoothPath(model.pts);
  const modelLen = pathLen(smoothModel);
  const userLen = pathLen(user.pts);
  const result = { score: 0, critiques, readsAs: null, loops: {}, pieces: [], align: null };
  if (userLen < 0.12) {
    add('error', `I couldn't find the stroke for ${q}.`, 100);
    return result;
  }

  const M = resample(model.pts, SHAPE.samples, model.owner);
  const U = resample(user.pts, SHAPE.samples);
  const ratio = userLen / (modelLen * scale);
  const [lo, hi] = SHAPE.sizeBand;
  if (ratio > hi) add(ratio > 1.8 ? 'error' : 'warn', `Too big: about ${ratio.toFixed(1)}× the size of ${q}.`, Math.min(25, (Math.log(ratio) - Math.log(hi)) * 80));
  else if (ratio < lo) add(ratio < 0.55 ? 'error' : 'warn', `Too small: about ${ratio.toFixed(1)}× the size of ${q}.`, Math.min(25, (Math.log(1 / ratio) - Math.log(1 / lo)) * 80));

  const MS = resample(smoothModel, SHAPE.samples);
  const d = shapeDistance(MS.pts, modelLen, U.pts, userLen);
  const dRev = shapeDistance([...MS.pts].reverse(), modelLen, U.pts, userLen);
  result.d = d;
  result.dRev = dRev;
  const reversed = dRev < 0.6 * d && dRev < SHAPE.reverseSmall;
  if (reversed) {
    const start = angleOf(sub(M.pts[Math.min(3, M.pts.length - 1)], M.pts[0]));
    add('error', `Wrong direction: ${q} starts ${angleText(start)}; you wrote it from the other end.`, 0);
  }
  penalty += d * SHAPE.slope;

  // Localise: lay the model over the learner's shape (fitModel) and measure how far each
  // model sample is from the ink, and each ink sample from the model (counted against the
  // nearest model sample's token, so a stroke written too long drifts too); a token's
  // drift is the mean.
  const { s, t } = fitModel(M.pts, U.pts);
  const placed = M.pts.map((p) => ({ x: s * p.x + t.x, y: s * p.y + t.y }));
  const sums = new Map();
  const count = (tok, dev) => { const e = sums.get(tok) ?? { n: 0, sum: 0 }; e.n++; e.sum += dev; sums.set(tok, e); };
  placed.forEach((p, i) => count(M.owner[i], dist(p, nearestOnPath(p, U.pts)) / s));
  for (const q of U.pts) {
    let k = 0;
    placed.forEach((p, i) => { if (dist(p, q) < dist(placed[k], q)) k = i; });
    count(M.owner[k], dist(q, nearestOnPath(q, placed)) / s);
  }
  let worst = null;
  for (const [tok, e] of sums) {
    const mean = e.sum / e.n;
    result.pieces.push({ token: tok, dev: mean, ok: mean <= SHAPE.drift });
    if (!worst || mean > worst.mean) worst = { tok, mean };
  }
  if (worst && worst.mean > SHAPE.drift && !reversed) add('warn', `Drifts from the model at ${tokenPhrase(unit.allTokens, worst.tok)}.`, 0);
  result.align = { s, t };
  result.score = Math.round(100 - clamp(penalty, 0, 100));
  return result;
}

// ---------------------------------------------------------------- whole attempt

// Alignment of model outlines with the learner's strokes, in writing order. Outlines
// after the last stroke are simply not written yet, so they cost nothing: a partial
// attempt lines up with the START of the example instead of skipping ahead to a
// look-alike further on. Lengths are compared at the writer's size (`scale`), and a
// curve bending the wrong way costs extra.
function align(models, users, scale) {
  const cost = (m, u) => {
    const mp = samplePoints(m.compiled, 8);
    const ma = angleOf(sub(mp[mp.length - 1], mp[0])), ua = angleOf(sub(u.pts[u.pts.length - 1], u.pts[0]));
    const lr = Math.abs(Math.log(Math.max(pathLen(u.pts) / scale, 0.05) / pathLen(mp)));
    const mb = strokeFeatures(mp).bulge, ub = strokeFeatures(u.pts).bulge;
    const bend = !m.shape && Math.abs(mb) > 0.05 && Math.abs(ub) > 0.05 && Math.sign(mb) !== Math.sign(ub) ? 0.3 : 0;
    // A joined outline written from the wrong end still pairs with its model (and is then
    // told so), at a small extra cost.
    const turn = Math.abs(wrap(ua - ma)) / 180;
    const angle = m.shape ? Math.min(turn, Math.abs(wrap(ua - ma - 180)) / 180 + 0.2) : turn;
    return Math.min(1, 0.5 * angle + 0.5 * Math.min(1, lr / Math.log(4)) + bend);
  };
  const GAP = 0.75;
  const n = models.length, k = users.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: k + 1 }, (_, j) => (i + j) * GAP));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= k; j++) {
      D[i][j] = Math.min(D[i - 1][j - 1] + cost(models[i - 1], users[j - 1]), D[i - 1][j] + GAP, D[i][j - 1] + GAP);
    }
  }
  // Best end point once all strokes are used; the models after it are "not yet written".
  let end = n;
  for (let i = 0; i <= n; i++) if (D[i][k] < D[end][k] - 1e-9) end = i;
  const pairs = models.slice(end).map((m) => ({ m, u: null }));
  let i = end, j = k;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + cost(models[i - 1], users[j - 1]))) < 1e-9) { pairs.unshift({ m: models[i - 1], u: users[j - 1] }); i--; j--; }
    else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + GAP)) < 1e-9) { pairs.unshift({ m: models[i - 1], u: null }); i--; }
    else { pairs.unshift({ m: null, u: users[j - 1] }); j--; }
  }
  return pairs;
}

// Similarity transform (scale + translation) from model U to the learner's U.
function fitTransform(pairs) {
  if (!pairs.length) return null;
  if (pairs.length === 1) {
    const { m, u, mLen, uLen } = pairs[0];
    const s = clamp(uLen / mLen, 0.5, 2);
    return { s, tx: u.x - s * m.x, ty: u.y - s * m.y };
  }
  const mm = centroid(pairs.map((p) => p.m)), um = centroid(pairs.map((p) => p.u));
  let num = 0, den = 0;
  for (const p of pairs) { const a = sub(p.m, mm), b = sub(p.u, um); num += a.x * b.x + a.y * b.y; den += a.x * a.x + a.y * a.y; }
  const s = clamp(den > 1e-9 ? num / den : 1, 0.4, 2.5);
  return { s, tx: um.x - s * mm.x, ty: um.y - s * mm.y };
}

// How big a long stroke is against the pad's ruling (at the example's size), so a learner
// who keeps a long stroke inside part of a line space knows where to start and stop it.
function longStrokeSize(cons, name) {
  const { angle, length } = cons.primitives[0];
  const rise = Math.abs(Math.sin(angle / DEG)) * length / U_PER_LINE;
  const run = Math.abs(Math.cos(angle / DEG)) * length / U_PER_LINE;
  if (rise >= run) {
    const how = angle < 0 ? 'start it just below the line above and finish on the line' : 'start it on the line and finish just below the line above';
    return `${name} is a long stroke, about ${rise.toFixed(1)} of a line space tall: ${how}.`;
  }
  return `${name} is a long stroke, about ${run.toFixed(1)} line spaces long.`;
}

// strokes: pad strokes ({points:[{x,y,t}]}) or exported ones ({points:[[x,y,t,p]]}), in px.
// unitPx: pixels per U on the pad (lineSpacing / U_PER_LINE).
export function assessAttempt(example, strokes, unitPx, { scale = 1 } = {}) {
  const units = modelUnits(example);
  const user = cleanStrokes(toUserStrokes(strokes, unitPx)).map((s) => (isDot(s) ? s : { ...s, pts: smoothPath(s.pts) }));
  const userDots = user.filter(isDot);
  const userMain = user.filter((s) => !isDot(s));
  const mMain = units.filter((u) => u.kind === 'outline');
  const mDots = units.filter((u) => u.kind === 'dot');
  const sentence = !!example.words;
  const label = (u) => (sentence ? `“${u.word}”` : null);

  const pairs = align(mMain, userMain, scale);
  const matched = pairs.filter((p) => p.m && p.u);
  // `fit` only places dots. Sizes are judged against the writer's own size (`scale`,
  // learned across attempts), never re-estimated mid-attempt, so an outline's verdict
  // doesn't change as more of the example is written.
  const fit = fitTransform(matched.map((p) => ({ m: p.m.start, u: p.u.pts[0], mLen: pathLen(samplePoints(p.m.compiled, 12)), uLen: pathLen(p.u.pts) })));
  const lenScale = scale;
  // Size from each outline's extent (bounding-box diagonal), which hand jitter barely
  // changes, unlike the length of the path.
  const ratios = matched.map((p) => extentOf(p.u.pts) / extentOf(samplePoints(p.m.compiled, 12))).sort((a, b) => a - b);
  const sizeRatio = ratios.length ? ratios[(ratios.length - 1) >> 1] : null; // median, at the writer's actual size

  const results = [];
  const extras = [];
  const byModel = new Map();
  for (const p of pairs) {
    if (p.m && p.u) {
      const r = p.m.shape ? assessShape(p.m, p.u, { scale: lenScale }) : assessOutline(p.m, p.u, lenScale);
      const res = { unit: p.m, user: p.u, weight: 1, ...r };
      results.push(res);
      byModel.set(p.m, res);
    } else if (p.m) {
      results.push({ unit: p.m, user: null, weight: 1, score: 0, missing: true, critiques: [{ level: 'error', text: `Missing: ${label(p.m) ?? (p.m.shape ? `“${p.m.word}”` : strokeName(p.m.consonant))}.` }] });
    } else {
      extras.push(p.u);
    }
  }

  // Dots: predict where each should be from the matched outlines; the closest pairs of
  // predicted and written dots are matched first, so an h dot above a circle is not taken
  // for the vowel mark under it. (With no outline to place them, dots go in order.)
  const free = new Set(userDots);
  const picks = new Map();
  const near = mDots.flatMap((m, i) => {
    const pred = fit && { x: fit.s * m.pos.x + fit.tx, y: fit.s * m.pos.y + fit.ty };
    return userDots.map((d) => ({ m, i, d, dd: pred ? dist(centroid(d.pts), pred) : 0 }))
      .filter((x) => !pred || x.dd <= 1.5 * fit.s);
  }).sort((a, b) => a.dd - b.dd || a.i - b.i);
  for (const x of near) {
    if (picks.has(x.m) || !free.has(x.d)) continue;
    picks.set(x.m, x);
    free.delete(x.d);
  }
  for (const m of mDots) {
    const pick = picks.get(m);
    let what = 'the dot';
    if (m.role === 'h') what = `the h dot${sentence ? ` in “${m.word}”` : ''}`;
    else if (m.role === 'w') what = 'the w dash under the vowel (Manual §99)';
    else if (m.role === 'a') what = 'the a dot before the outline (Manual §100)';
    else if (m.role === 'cap') what = 'the capital dashes under the outline (Manual §233)';
    else if (m.role === 'v-dash') what = 'the dash under the vowel: its long sound (Manual §8)';
    else if (m.role === 'v-dot') what = 'the dot under the vowel: its medium sound (Manual §8)';
    else if (sentence) what = `the dot for “${m.word.toLowerCase()}”`;
    if (!pick && isVowelMark(m)) {
      // §8: "otherwise they are seldom used": a note, not a fault.
      results.push({ unit: m, user: null, weight: 0, score: 0, missing: true, critiques: [{ level: 'info', text: `The manual prints a ${m.role === 'v-dash' ? 'dash under the vowel here: its long sound' : 'dot under the vowel here: its medium sound'} (Manual §8).` }] });
      continue;
    }
    if (!pick) {
      results.push({ unit: m, user: null, weight: 0.25, score: 0, missing: true, critiques: [{ level: 'error', text: `Missing ${what}${m.role === 'h' ? ' above the circle' : ''}.` }] });
      continue;
    }
    const res = { unit: m, user: pick.d, weight: 0.25, score: 100, critiques: [] };
    const ownerRes = m.owner && byModel.get(m.owner);
    const loop = ownerRes?.loops?.start?.loop;
    if (m.role === 'h' && loop) {
      const top = bboxOf(loop).maxY;
      if (centroid(pick.d.pts).y < top - 0.05) { res.score = 50; res.critiques.push({ level: 'warn', text: 'The h dot goes above the circle.' }); }
    }
    results.push(res);
  }
  extras.push(...free);

  const wsum = results.reduce((a, r) => a + r.weight, 0) || 1;
  let score = results.reduce((a, r) => a + r.weight * r.score, 0) / wsum - 8 * extras.length;
  score = Math.round(clamp(score, 0, 100));

  const critiques = [];
  for (const r of results) {
    for (const c of r.critiques) critiques.push({ ...c, text: r.unit.kind === 'outline' && sentence && !r.missing ? `“${r.unit.word}”: ${c.text}` : c.text });
  }
  for (const e of extras) critiques.push({ level: 'warn', text: isDot(e) ? 'There is an extra dot.' : 'There is an extra stroke that doesn\'t belong to the example.' });
  if (sizeRatio && sizeRatio > WRITER_MAX * 1.15) {
    critiques.push({ level: 'info', text: `You wrote about ${sizeRatio.toFixed(1)}× the example's size, which is too big for this ruling: at that size the long strokes (b, v, j) would run past the next line. Write t about a third of a line space tall, or widen the line spacing.` });
  } else if (sizeRatio && matched.length >= 2 && (sizeRatio / scale > 1.45 || sizeRatio / scale < 0.7)) {
    critiques.push({ level: 'info', text: `You wrote about ${sizeRatio.toFixed(1)}× the example's size. Fine if it's your natural size: the app learns it as you finish attempts.` });
  }

  // Dots count as parts too: the letter h / "a" is nothing but a dot, and an h word
  // isn't finished until its dot is written (in either order). A vowel mark is optional.
  const needDots = mDots.filter((m) => !isVowelMark(m)).length;
  const complete = userMain.length >= mMain.length && user.length >= mMain.length + needDots;

  return {
    score,
    complete,
    written: Math.min(userMain.length, mMain.length) + Math.min(userDots.length, needDots),
    expected: mMain.length + needDots,
    strokes: user.length,
    critiques,
    units: results.map(({ unit, user: u, score: s, critiques: c, readsAs: ra, missing }) => ({
      kind: unit.kind, role: unit.role ?? null, word: unit.word, user: u, score: s, critiques: c, readsAs: ra ?? null, missing: !!missing,
    })),
    extras: extras.length,
    sizeRatio,
    check: checkPattern(results, { complete, lenScale, fit }),
  };
}

// The correct pattern for each part, placed on the learner's writing (learner U, y up):
// each outline anchored at the point where the learner started it, at the expected size;
// each dot where it belongs. `ok` = no errors for that part.
const mapSegments = (segs, T) => segs.map((s) => (s.type === 'dot'
  ? { type: 'dot', p: T(s.p) }
  : { type: 'cubic', p0: T(s.p0), c1: T(s.c1), c2: T(s.c2), p3: T(s.p3) }));

function checkPattern(results, { complete, lenScale, fit }) {
  const placeOutline = new Map();
  for (const r of results) {
    if (r.unit.kind !== 'outline' || !r.user) continue;
    const m0 = r.unit.compiled.start, u0 = r.user.pts[0];
    placeOutline.set(r.unit, (p) => ({ x: u0.x + lenScale * (p.x - m0.x), y: u0.y + lenScale * (p.y - m0.y) }));
  }
  const out = [];
  for (const r of results) {
    if (r.missing && isVowelMark(r.unit)) continue; // optional, so nothing is wrong
    const ok = !r.missing && !r.critiques.some((c) => c.level === 'error');
    if (r.unit.kind === 'outline') {
      if (r.pieces && r.align && r.user) {
        // Joined outline: one piece per token, green where it matches, red where it drifts.
        const { s, t } = r.align;
        const T = (p) => ({ x: s * p.x + t.x, y: s * p.y + t.y });
        const segs = r.unit.compiled.segments;
        const okOf = new Map(r.pieces.map((x) => [x.token, x.ok]));
        let k = 0;
        while (k < segs.length) {
          const tok = r.unit.compiled.tokenOf[k];
          let e = k;
          while (e < segs.length && r.unit.compiled.tokenOf[e] === tok) e++;
          out.push({ kind: 'outline', word: r.unit.word, ok: okOf.get(tok) ?? true, segments: mapSegments(segs.slice(k, e), T) });
          k = e;
        }
        continue;
      }
      const T = placeOutline.get(r.unit);
      if (T) out.push({ kind: 'outline', word: r.unit.word, ok, segments: mapSegments(r.unit.compiled.segments, T) });
      continue;
    }
    if (!r.user && !complete) continue; // not written yet; only flag a missing dot at the end
    const T = r.unit.owner && placeOutline.get(r.unit.owner);
    let p = null;
    if (T) p = T(r.unit.pos);
    else if (r.user) p = centroid(r.user.pts);
    else if (fit) p = { x: fit.s * r.unit.pos.x + fit.tx, y: fit.s * r.unit.pos.y + fit.ty };
    if (p) out.push({ kind: 'dot', word: r.unit.word, ok, p });
  }
  return out;
}

// Model outlines (no dots) in writing order: what the guide shows next.
export function guideUnits(example) {
  return modelUnits(example).filter((u) => u.kind === 'outline').map((u) => ({
    word: u.word,
    compiled: u.compiled,
    startDir: tangent(u.compiled, 'start'),
    firstCircle: u.circles.find((c) => c.at === 'start') ?? null,
    consonant: u.consonant,
  }));
}
