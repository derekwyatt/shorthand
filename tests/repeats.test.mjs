// Tests for repeats on the pad (app/js/repeats.js). Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../app/data/examples.js';
import { modelUnits } from '../app/js/assess.js';
import { samplePoints } from '../app/js/render.js';
import { assessRepeats, groupRepeats, practiceLines, repeatIndexFor } from '../app/js/repeats.js';

const UNIT = 16; // px per U
const LS = 48; // line spacing
const O = { unitPx: UNIT, lineSpacing: LS };
const ex = (id) => EXAMPLES.find((e) => e.id === id);

// The model geometry as pad strokes in px (y down); `t0` keeps repeats in time order.
function perfect(example, { scale = 1, ox = 100, oy = 300, t0 = 0, skipDots = false } = {}) {
  const strokes = [];
  let t = t0;
  const px = (p) => ({ x: ox + p.x * UNIT * scale, y: oy - p.y * UNIT * scale, t: (t += 8) });
  const dots = [];
  for (const u of modelUnits(example)) {
    if (u.kind === 'dot') {
      const c = px(u.pos);
      dots.push({ points: [c, { ...c, x: c.x + 0.6, t: (t += 8) }, { ...c, x: c.x + 1, y: c.y + 0.5, t: (t += 8) }] });
    } else {
      strokes.push({ points: samplePoints(u.compiled, 24).map(px) });
    }
    t += 300;
  }
  return skipDots ? strokes : [...strokes, ...dots];
}
const texts = (r) => r.critiques.map((c) => c.text).join(' | ');
// Shift a set of strokes by (dx, dy) px and time dt.
const shift = (strokes, dx, dy, dt) => strokes.map((s) => ({ points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy, t: p.t + dt })) }));

test('three perfect k side by side are three correct repeats', () => {
  const k = ex('letter-k');
  const one = perfect(k);
  const strokes = [0, 1, 2].flatMap((i) => shift(one, i * 120, 0, i * 5000));
  const r = assessRepeats(k, strokes, O);
  assert.equal(r.count, 3);
  assert.equal(r.correctCount, 3);
  assert.ok(r.score >= 95, `score ${r.score}`);
  assert.equal(r.check.filter((c) => c.kind === 'outline' && c.ok).length, 3);
});

test('a perfect k plus a flat line: one correct, one with a critique', () => {
  const k = ex('letter-k');
  const flat = { points: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 300 + i * 16, y: 300, t: 9000 + i * 8 })) };
  const r = assessRepeats(k, [...perfect(k), flat], O);
  assert.equal(r.count, 2);
  assert.equal(r.correctCount, 1);
  assert.ok(r.latest.result.critiques.length > 0);
  assert.ok(r.critiques.length > 0, texts(r));
});

test('a tiny bounce before a stroke is ignored', () => {
  const k = ex('letter-k');
  const one = perfect(k);
  const bounce = { points: [{ x: 280, y: 300, t: 4000 }, { x: 281, y: 300.5, t: 4020 }] };
  const second = shift(one, 120, 0, 5000);
  assert.equal(groupRepeats(k, [...one, bounce, ...second], O).length, 2);
});

test('letter h: every dot is a repeat', () => {
  const h = ex('letter-h');
  const dot = (x, t) => ({ points: [{ x, y: 300, t }, { x: x + 0.6, y: 300, t: t + 8 }, { x: x + 1, y: 300.5, t: t + 16 }] });
  const r = assessRepeats(h, [dot(100, 0), dot(160, 1000), dot(220, 2000)], O);
  assert.equal(r.count, 3);
});

test('a word written on two lines is two repeats', () => {
  const e = ex('word-hate');
  const l1 = perfect(e);
  const l2 = shift(perfect(e, { t0: 20000 }), 0, 2 * LS, 0);
  const r = assessRepeats(e, [...l1, ...l2], O);
  assert.equal(r.count, 2);
  assert.equal(r.completedCount, 2);
  assert.ok(r.repeats.every((x) => x.result.complete));
});

test('practiceLines: one entry per line, top to bottom, each assessable alone', () => {
  const e = ex('word-hate');
  const l1 = perfect(e);
  const l2 = shift(perfect(e, { t0: 20000 }), 0, 2 * LS, 0);
  const lines = practiceLines([...l2, ...l1], O);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].y < lines[1].y);
  assert.equal(lines[0].strokes.length + lines[1].strokes.length, l1.length + l2.length);
  for (const line of lines) assert.equal(assessRepeats(e, line.strokes, O).count, 1);
});

test('a sentence plus the first two words on the next line', () => {
  const e = ex('sentence-the-men-will-have-the-key');
  const l1 = perfect(e);
  const l2 = shift(perfect(e, { t0: 40000, skipDots: true }).slice(0, 2), 0, 2 * LS, 0);
  const r = assessRepeats(e, [...l1, ...l2], O);
  assert.equal(r.count, 2);
  assert.equal(r.completedCount, 1);
  assert.equal(r.latestComplete, false);
  assert.equal(r.written, 2);
});

test('the same mistake in every repeat is summarised', () => {
  const k = ex('letter-k');
  const long = [0, 1, 2].flatMap((i) => shift(perfect(k, { scale: 2 }), i * 200, 0, i * 5000));
  const r = assessRepeats(k, long, O);
  assert.ok(r.critiques.some((c) => c.level === 'info' && c.text.startsWith('In 3 of 3 repeats')), texts(r));
});

test('repeatIndexFor: outlines already written on the line at the point', () => {
  const e = ex('sentence-the-men-will-have-the-key');
  const written = perfect(e, { skipDots: true }).slice(0, 2);
  const y = 300;
  assert.equal(repeatIndexFor(e, written, { x: 500, y }, O), 2);
  assert.equal(repeatIndexFor(e, written, { x: 500, y: y + 2 * LS }, O), 0);
  assert.equal(repeatIndexFor(ex('letter-k'), written, { x: 500, y }, O), 0);
});
