// Tests for the joining rules (js/join.js) and the practice examples. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../app/data/examples.js';
import { STROKE_BY_ID } from '../app/data/strokes.js';
import { compileOutline, compileExample, JOIN_CIRCLE } from '../app/js/join.js';
import { cubicPoint, pathData } from '../app/js/render.js';

const words = EXAMPLES.filter((e) => e.kind === 'word');
const byTitle = (t) => words.find((w) => w.title === t);

// The 4 cubic segments of each circle, in order, from a compiled outline.
function circles(example) {
  const c = compileOutline(example.outline);
  const cubics = c.segments.filter((s) => s.type === 'cubic');
  const out = [];
  let k = 0;
  for (const tok of example.outline) {
    if (tok === 'h') continue;
    if (tok === 'a' || tok === 'e') {
      out.push({ tok, segs: cubics.slice(k, k + 4) });
      k += 4;
    } else {
      k += 1; // every stroke used in words is a single cubic
    }
  }
  return { compiled: c, circles: out };
}
function polygon(segs) {
  const pts = [];
  for (const s of segs) for (let i = 0; i < 16; i++) pts.push(cubicPoint(s, i / 16));
  return pts;
}
const centroid = (pts) => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
const signedArea = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.y - q.x * p.y; }, 0) / 2;

test('every example compiles to finite geometry', () => {
  assert.ok(EXAMPLES.length >= 50);
  for (const ex of EXAMPLES) {
    const c = compileExample(ex);
    const d = pathData(c, 16, { x: 0, y: 0 });
    const dotOnly = c.segments.every((s) => s.type === 'dot');
    assert.ok((d.length > 0 || dotOnly) && !/NaN|Infinity/.test(d), `${ex.id} path data`);
    assert.ok(ex.meaning.length > 0 && ex.meaning.every((m) => m.length > 5), `${ex.id} has a meaning`);
  }
  assert.equal(new Set(EXAMPLES.map((e) => e.id)).size, EXAMPLES.length, 'example ids are unique');
});

test('examples avoid strokes that are not yet verified', () => {
  for (const ex of EXAMPLES) {
    for (const tok of ex.outline) {
      if (['a', 'e', 'h'].includes(tok)) continue;
      assert.ok(!STROKE_BY_ID[tok].verify, `${ex.id} uses unverified stroke ${tok}`);
    }
  }
});

test('circles close on the joint and have the right size', () => {
  for (const w of words) {
    for (const { tok, segs } of circles(w).circles) {
      const start = segs[0].p0, end = segs[3].p3;
      assert.ok(Math.hypot(start.x - end.x, start.y - end.y) < 1e-9, `${w.title}: circle closes`);
      const pts = polygon(segs);
      const w2 = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
      assert.ok(Math.abs(w2 - JOIN_CIRCLE[tok]) < 0.02, `${w.title}: ${tok} circle diameter ${w2.toFixed(3)}`);
    }
  }
});

test('§11: on curves the circle sits inside the curve', () => {
  // k, g are convex upward, so "inside" is below the stroke; r, l are convex downward, so above.
  for (const w of words) {
    const curve = w.outline.find((t) => ['k', 'g', 'r', 'l'].includes(t));
    if (!curve) continue;
    const { compiled, circles: cs } = circles(w);
    const stroke = compiled.segments.filter((s) => s.type === 'cubic').find((s) => !cs.some((c) => c.segs.includes(s)));
    for (const { segs } of cs) {
      const c = centroid(polygon(segs));
      const joint = segs[0].p0;
      if (['k', 'g'].includes(curve)) assert.ok(c.y < joint.y, `${w.title}: circle below the ${curve} curve`);
      else assert.ok(c.y > joint.y, `${w.title}: circle above the ${curve} curve`);
      // And it lies under the arch (between the curve's ends horizontally).
      const xs = [stroke.p0.x, stroke.p3.x];
      assert.ok(c.x > Math.min(...xs) - 0.05 && c.x < Math.max(...xs) + 0.05, `${w.title}: circle is within the curve's span`);
    }
  }
});

test('§12: on straight strokes the circle is written clockwise', () => {
  for (const w of words) {
    if (!w.outline.some((t) => ['m', 't', 'd'].includes(t))) continue;
    for (const { segs } of circles(w).circles) {
      assert.ok(signedArea(polygon(segs)) < 0, `${w.title}: circle is clockwise`);
    }
  }
  // Spot checks of placement against the manual's p. 5 drawings.
  const me = circles(byTitle('me')).circles[0];
  assert.ok(centroid(polygon(me.segs)).y < 0, '"me": the e circle hangs below the end of m');
  const aim = circles(byTitle('aim')).circles[0];
  assert.ok(centroid(polygon(aim.segs)).y < 0, '"aim": the a circle sits below the start of m');
});

test('§11 rotation follows the curve: k/g clockwise, r/l counter-clockwise', () => {
  for (const w of words) {
    const curve = w.outline.find((t) => ['k', 'g', 'r', 'l'].includes(t));
    if (!curve) continue;
    for (const { segs } of circles(w).circles) {
      const area = signedArea(polygon(segs));
      if (['k', 'g'].includes(curve)) assert.ok(area < 0, `${w.title}: clockwise`);
      else assert.ok(area > 0, `${w.title}: counter-clockwise`);
    }
  }
});

test('h is a dot above its vowel circle, written first', () => {
  for (const w of words.filter((x) => x.outline[0] === 'h')) {
    const { compiled, circles: cs } = circles(w);
    assert.equal(compiled.segments[0].type, 'dot', `${w.title}: dot comes first`);
    const dot = compiled.segments[0].p;
    const pts = polygon(cs[0].segs);
    const c = centroid(pts);
    assert.ok(dot.y > Math.max(...pts.map((p) => p.y)), `${w.title}: dot is above the circle`);
    assert.ok(Math.abs(dot.x - c.x) < 0.01, `${w.title}: dot is centred over the circle`);
  }
});
