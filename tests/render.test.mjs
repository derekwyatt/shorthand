// Geometry tests for the stroke data and renderer. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STROKES, FAMILIES, STROKE_BY_ID } from '../app/data/strokes.js';
import { compileStroke, cubicPoint, pathData, pathLength, penStrokes, samplePoints, tangent } from '../app/js/render.js';
import { compileExample } from '../app/js/join.js';
import { EXAMPLES } from '../app/data/examples.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const chord = (c) => ({ x: c.end.x - c.start.x, y: c.end.y - c.start.y });
const deg = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI;
const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// Signed perpendicular height of the curve's midpoint above the chord (left of travel = +).
function apexHeight(compiled) {
  const seg = compiled.segments[0];
  const mid = cubicPoint(seg, 0.5);
  const d = chord(compiled);
  const L = Math.hypot(d.x, d.y);
  return ((mid.x - compiled.start.x) * -d.y + (mid.y - compiled.start.y) * d.x) / L;
}
const apex = (id) => cubicPoint(compileStroke(STROKE_BY_ID[id]).segments[0], 0.5);
const end = (id) => compileStroke(STROKE_BY_ID[id]).end;

test('families and strokes are consistent', () => {
  const ids = new Set(STROKES.map((s) => s.id));
  assert.equal(ids.size, STROKES.length, 'stroke ids are unique');
  const listed = FAMILIES.flatMap((f) => f.members);
  for (const id of listed) assert.ok(ids.has(id), `family member ${id} exists`);
  assert.equal(new Set(listed).size, listed.length, 'each stroke is in one family');
  assert.equal(listed.length, STROKES.length, 'every stroke is in a family');
});

test('lines and arcs match their angle and length exactly', () => {
  for (const s of STROKES) {
    const p = s.primitives[0];
    if (s.primitives.length !== 1 || !['line', 'arc'].includes(p.type)) continue;
    const c = compileStroke(s);
    const v = chord(c);
    near(Math.hypot(v.x, v.y), p.length, 1e-9, `${s.id} chord length`);
    assert.ok(angleDiff(deg(v), p.angle) < 1e-6, `${s.id} chord angle`);
    if (p.type === 'arc') near(apexHeight(c), p.bulge * p.length, 1e-9, `${s.id} sagitta`);
  }
});

test('writing directions match the manual', () => {
  // Forward strokes end to the right of where they start.
  for (const id of ['n', 'm', 'men', 'k', 'g', 'r', 'l', 't', 'd', 'ted', 'th-over', 'th-under', 'ten', 'tem', 'nd', 'md', 'ng', 'nk']) {
    assert.ok(end(id).x > 0, `${id} is written left to right`);
  }
  // Upward strokes end higher; downward strokes end lower and to the left.
  for (const id of ['t', 'd', 'ted', 'th-over', 'th-under', 'ten', 'tem', 'nd', 'md']) assert.ok(end(id).y > 0, `${id} is written upward`);
  for (const id of ['p', 'b', 'f', 'v', 's-left', 's-right', 'sh', 'ch', 'j']) {
    assert.ok(end(id).y < 0 && end(id).x < 0, `${id} is written downward, top-right to bottom-left`);
  }
  for (const id of ['ng', 'nk']) assert.ok(end(id).y < 0, `${id} slants down to the right`);
  for (const id of ['n', 'm', 'men']) near(end(id).y, 0, 1e-9, `${id} is horizontal`);
});

test('curves bulge to the correct side', () => {
  for (const id of ['k', 'g']) assert.ok(apex(id).y > 0.1, `${id} is convex upward`);
  for (const id of ['r', 'l']) assert.ok(apex(id).y < -0.1, `${id} is convex downward`);
  // "(" vs ")": compare the apex with the chord midpoint.
  for (const id of ['p', 'b', 's-left']) assert.ok(apex(id).x < end(id).x / 2, `${id} is convex to the left`);
  for (const id of ['f', 'v', 's-right']) assert.ok(apex(id).x > end(id).x / 2, `${id} is convex to the right`);
  for (const id of ['th-over', 'ten', 'tem']) {
    const a = apex(id), e = end(id);
    assert.ok(a.y > e.y / 2 && a.x < e.x / 2, `${id} is convex up-left`);
  }
  for (const id of ['th-under', 'nd', 'md']) {
    const a = apex(id), e = end(id);
    assert.ok(a.y < e.y / 2 && a.x > e.x / 2, `${id} is convex down-right`);
  }
  assert.ok(apex('o').y < 0, 'o hook opens upward (dips down)');
  assert.ok(apex('u').y > 0, 'u hook opens downward (arches up)');
});

test('within a family, sizes grow in order', () => {
  for (const f of FAMILIES) {
    if (['circles', 'hooks', 'marks', 'blends'].includes(f.id)) continue;
    const lens = f.members.map((id) => pathLength(compileStroke(STROKE_BY_ID[id])));
    for (let i = 1; i < lens.length; i++) {
      // Smallest measured step between neighbours is nd→md ≈ 1.36× (chart), so require 1.3×.
      assert.ok(lens[i] > lens[i - 1] * 1.3, `${f.id}: ${f.members[i]} is clearly longer than ${f.members[i - 1]} (${lens[i].toFixed(2)} vs ${lens[i - 1].toFixed(2)})`);
    }
  }
});

test('circles are closed, the right size and written in their direction', () => {
  for (const id of ['a', 'e', 'i']) {
    const s = STROKE_BY_ID[id];
    const c = compileStroke(s);
    near(c.end.x, 0, 1e-9, `${id} closes (x)`);
    near(c.end.y, 0, 1e-9, `${id} closes (y)`);
    const pts = samplePoints(c);
    const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const prim = s.primitives[0];
    assert.ok(w > prim.width * 0.9 && w < prim.width * 1.15, `${id} width ≈ ${prim.width} (got ${w.toFixed(3)})`);
    // Shoelace over the main ellipse only (skip ī's inner loop): positive = counter-clockwise.
    const main = { ...c, segments: c.segments.slice(-4) };
    const mp = samplePoints(main);
    let area = 0;
    for (let i = 0; i < mp.length - 1; i++) area += mp[i].x * mp[i + 1].y - mp[i + 1].x * mp[i].y;
    assert.equal(Math.sign(area), prim.dir === 'ccw' ? 1 : -1, `${id} is written ${prim.dir}`);
  }
  const a = pathLength(compileStroke(STROKE_BY_ID.a));
  const e = pathLength(compileStroke(STROKE_BY_ID.e));
  assert.ok(a / e > 2.2 && a / e < 3, `a/e circle ratio ≈ 2.6 (got ${(a / e).toFixed(2)})`);
});

test('penStrokes: a joined word is one stroke; a sentence has one per outline', () => {
  const ex = (id) => EXAMPLES.find((e) => e.id === id);
  assert.equal(penStrokes(compileExample(ex('word-hate'))).length, 1);

  const sentence = ex('sentence-it-will-be-good');
  const compiled = compileExample(sentence);
  const runs = penStrokes(compiled);
  assert.equal(runs.length, sentence.words.length, 'It will (one phrase) · be · good · .');
  assert.equal(runs.flatMap((r) => r.segments).length, compiled.segments.filter((s) => s.type !== 'dot').length, 'every segment is in a stroke');
  for (const r of runs) {
    assert.equal(r.start, r.segments[0].p0);
    assert.equal(r.end, r.segments[r.segments.length - 1].p3);
    for (let i = 1; i < r.segments.length; i++) {
      const gap = Math.hypot(r.segments[i].p0.x - r.segments[i - 1].p3.x, r.segments[i].p0.y - r.segments[i - 1].p3.y);
      assert.ok(gap < 1e-6, 'no pen lift inside a stroke');
    }
  }
  for (let i = 1; i < runs.length; i++) {
    assert.ok(Math.hypot(runs[i].start.x - runs[i - 1].end.x, runs[i].start.y - runs[i - 1].end.y) > 1e-6, 'strokes are split at pen lifts');
  }
});

test('tangents and SVG path data are well formed', () => {
  for (const s of STROKES) {
    const c = compileStroke(s);
    const d = pathData(c, 20, { x: 100, y: 100 });
    assert.ok(!/NaN|Infinity/.test(d), `${s.id} path data has no NaN`);
    if (s.id !== 'h') assert.match(d, /^M[-\d.]+ [-\d.]+C/, `${s.id} path starts with M…C`);
    const t = tangent(c, 'end');
    near(Math.hypot(t.x, t.y), 1, 1e-9, `${s.id} end tangent is a unit vector`);
  }
  // SVG y is down: t (upward) must end above its start on screen.
  const d = pathData(compileStroke(STROKE_BY_ID.t), 10, { x: 0, y: 0 });
  const nums = d.match(/-?[\d.]+/g).map(Number);
  assert.ok(nums[nums.length - 1] < nums[1], 't goes up on screen');
});
