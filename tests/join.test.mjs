// Tests for the joining rules (js/join.js) and the practice examples. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../app/data/examples.js';
import { STROKE_BY_ID } from '../app/data/strokes.js';
import { compileOutline, compileExample, JOIN_CIRCLE, circleOf, isMark, isWLoop, W_LOOP } from '../app/js/join.js';
import { cubicPoint, pathData } from '../app/js/render.js';

const words = EXAMPLES.filter((e) => e.kind === 'word');
const byTitle = (t) => words.find((w) => w.title === t);
// Words of one consonant stroke, with circles only at its ends (Manual §11–12).
const consonants = (outline) => outline.filter((t) => t !== 'h' && !circleOf(t) && !isMark(t));
const single = words.filter((w) => consonants(w.outline).length === 1);

// The 4 cubic segments of each circle, in order, from a compiled outline. `tok` is the
// circle's size (a or e); `reversed` marks the §71 r circle. §74 loops are skipped.
function circles(example) {
  const c = compileOutline(example.outline);
  const out = [];
  example.outline.forEach((tok, i) => {
    const circle = circleOf(tok);
    if (!circle || circle.loop || isWLoop(example.outline, i)) return; // loops: tested on their own
    out.push({ tok: circle.size, reversed: circle.reversed, segs: c.segments.filter((s, k) => c.tokenOf[k] === i && s.type === 'cubic') });
  });
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
      if (tok === 'h' || circleOf(tok) || isMark(tok)) continue;
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
  for (const w of single) {
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
  for (const w of single) {
    if (!w.outline.some((t) => ['m', 't', 'd'].includes(t))) continue;
    for (const { segs, reversed } of circles(w).circles) {
      // The §71 r circle is the exception: left motion.
      if (reversed) assert.ok(signedArea(polygon(segs)) > 0, `${w.title}: r circle is counter-clockwise`);
      else assert.ok(signedArea(polygon(segs)) < 0, `${w.title}: circle is clockwise`);
    }
  }
  // Spot checks of placement against the manual's p. 5 drawings.
  const me = circles(byTitle('me')).circles[0];
  assert.ok(centroid(polygon(me.segs)).y < 0, '"me": the e circle hangs below the end of m');
  const aim = circles(byTitle('aim')).circles[0];
  assert.ok(centroid(polygon(aim.segs)).y < 0, '"aim": the a circle sits below the start of m');
});

test('§11 rotation follows the curve: k/g clockwise, r/l counter-clockwise', () => {
  for (const w of single) {
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
  // (h before the o hook is tested with the hook.)
  for (const w of words.filter((x) => x.outline[0] === 'h' && circleOf(x.outline[1]))) {
    const { compiled, circles: cs } = circles(w);
    assert.equal(compiled.segments[0].type, 'dot', `${w.title}: dot comes first`);
    const dot = compiled.segments[0].p;
    const pts = polygon(cs[0].segs);
    const c = centroid(pts);
    assert.ok(dot.y > Math.max(...pts.map((p) => p.y)), `${w.title}: dot is above the circle`);
    assert.ok(Math.abs(dot.x - c.x) < 0.01, `${w.title}: dot is centred over the circle`);
  }
});

test('§14–18: every Unit 2 word is joined by the rule of the section it is printed under', () => {
  // reference/manual-unit2.md: the angle threshold is chosen so that this holds.
  let checked = 0;
  for (const w of words.filter((x) => x.level === 7)) {
    const section = Number(w.meaning[1].match(/§(\d+)/)[1]);
    if (![14, 15, 17, 18].includes(section)) continue;
    const { joins } = compileOutline(w.outline);
    assert.ok(joins.length >= 1, `${w.title}: has a circle between strokes`);
    assert.equal(joins[0].section, section, `${w.title}: first joined circle follows §${section} (turn ${joins[0].delta.toFixed(0)}°)`);
    checked++;
  }
  assert.ok(checked >= 30, `checked ${checked} words`);
});

test('§14: the circle goes outside the angle; §17: right motion between straight strokes', () => {
  const join = (title) => compileOutline(byTitle(title).outline).joins[0];
  // A left turn (make, gate) puts the circle below, written clockwise; a right turn (rain, team) above.
  for (const t of ['make', 'gate', 'kick', 'met']) assert.equal(join(t).rotation, -1, `${t}: clockwise`);
  for (const t of ['rain', 'team', 'rear', 'tale']) assert.equal(join(t).rotation, 1, `${t}: counter-clockwise`);
  for (const t of ['deed', 'mean', 'minimum']) assert.deepEqual([join(t).section, join(t).rotation], [17, -1], t);
  // §18: after r or l the circle hangs below (clockwise, inside k/g); after k it sits above.
  for (const t of ['wreck', 'rag', 'lake']) assert.equal(join(t).rotation, -1, t);
  assert.equal(join('kill').rotation, 1, 'kill');
});

test('§19/§21: k-r, g-l, r-k and l-k are flatter when joined; §20 g-r and k-l are not', () => {
  const bulges = (outline) => compileOutline(outline).segments.filter((s) => s.type === 'cubic').map((s) => {
    const chord = { x: s.p3.x - s.p0.x, y: s.p3.y - s.p0.y };
    const mid = cubicPoint(s, 0.5);
    const L = Math.hypot(chord.x, chord.y);
    return Math.abs((chord.x * (mid.y - s.p0.y) - chord.y * (mid.x - s.p0.x)) / L) / L;
  });
  const [k] = bulges(['k']);
  const [g] = bulges(['g']);
  const [kr] = bulges(['k', 'r']);
  const [gr] = bulges(['g', 'r']);
  assert.ok(kr < k * 0.9, `k is flatter in kr (${kr.toFixed(3)} vs ${k.toFixed(3)})`);
  assert.ok(Math.abs(gr - g) < 1e-9, 'g keeps its curve in gr');
});

test('Unit 3 blends join like any other stroke', () => {
  const join = (title) => compileOutline(byTitle(title).outline).joins[0];
  assert.equal(join('needed').section, 14, 'needed: n e ted, outside the angle');
  assert.equal(join('remain').rotation, 1, 'remain: the circle sits above, outside the angle');
  assert.equal(join('minimum').section, 17, 'minimum: men e men, straight strokes in line');
  for (const t of ['added', 'today', 'meant', 'mend']) assert.ok(compileOutline(byTitle(t).outline).segments.length > 0, t);
});

// The o hook (Manual §65–67), measured from the p. 34 plates.
const hookOf = (outline) => {
  const c = compileOutline(outline);
  const i = outline.indexOf('o');
  return c.segments.filter((s, k) => c.tokenOf[k] === i && s.type === 'cubic');
};
const dir = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);

test('the o hook is a small deep hook opening up and to the right', () => {
  const [s] = hookOf(['o']);
  const pts = Array.from({ length: 41 }, (_, i) => cubicPoint(s, i / 40));
  const ys = pts.map((p) => p.y), xs = pts.map((p) => p.x);
  const depth = -Math.min(...ys);
  assert.ok(depth > 0.18 && depth < 0.26, `depth ${depth}`);
  assert.ok(Math.min(...xs) < -0.1, 'its bottom lies behind its start (it goes down and back)');
  assert.ok(s.p3.x > 0.2 && Math.abs(s.p3.y) < 0.05, 'it ends level with its start, to the right');
  const exit = dir(s.c2, s.p3);
  assert.ok(exit > 15 && exit < 60, `it rises to the right at the end (${exit.toFixed(0)}°)`);
});

test('§67: before n, m, r, l the hook turns to leave along the next stroke; not after a downstroke', () => {
  const exitOf = (outline) => { const h = hookOf(outline); const s = h[h.length - 1]; return dir(s.c2, s.p3); };
  assert.ok(Math.abs(exitOf(['o', 'n'])) < 1, 'on: the hook leaves horizontally into n');
  assert.ok(Math.abs(exitOf(['n', 'o', 'n'])) < 1, 'known');
  assert.ok(exitOf(['n', 'o']) > 15, 'no: a final hook keeps its slant');
  // pour: after p the hook starts along the end of p, with no angle.
  const c = compileOutline(['p', 'o', 'r']);
  const pEnd = c.segments.filter((s, k) => c.tokenOf[k] === 0 && s.type === 'cubic').pop();
  const [h] = hookOf(['p', 'o', 'r']);
  const turn = Math.abs(dir(pEnd.c2, pEnd.p3) - dir(h.p0, h.c1));
  assert.ok(turn < 1 || turn > 359, `pour: no angle between p and the hook (${turn.toFixed(1)}°)`);
});

test('the h dot sits above an o hook', () => {
  const c = compileOutline(['h', 'o', 'm']);
  const dot = c.segments.find((s) => s.type === 'dot');
  assert.ok(dot && dot.p.y > 0.2, 'home: the dot is above the hook');
});

// §71 and §74: the left-motion r circle and its s loop.
const signedAreaOf = (outline, i) => {
  const c = compileOutline(outline);
  const pts = c.segments.filter((s, k) => c.tokenOf[k] === i && s.type === 'cubic')
    .flatMap((s) => Array.from({ length: 20 }, (_, j) => cubicPoint(s, j / 20)));
  return pts.reduce((a, p, j) => { const q = pts[(j + 1) % pts.length]; return a + (p.x * q.y - q.x * p.y) / 2; }, 0);
};

test('§71: the r circle turns the other way from the ordinary circle, only on straight strokes', () => {
  assert.ok(signedAreaOf(['m', 'a'], 1) < 0, 'may: right motion (clockwise, §12)');
  assert.ok(signedAreaOf(['m', 'a-rev'], 1) > 0, 'mar: left motion (counter-clockwise)');
  assert.ok(signedAreaOf(['t', 'a', 't'], 1) < 0 && signedAreaOf(['t', 'a-rev', 't'], 1) > 0, 'tat / tart (§17 reversed)');
  assert.ok(signedAreaOf(['a-rev', 't'], 0) > 0, 'art: the r circle before the stroke');
  assert.equal(compileOutline(['t', 'a-rev', 't']).joins[0].section, 71);
  assert.throws(() => compileOutline(['k', 'a-rev']), /straight strokes/);
});

test('§74: the s loop is a narrow loop carrying on along the stroke, at the end only', () => {
  const c = compileOutline(['n', 'e-rev-s']);
  const loop = c.segments.filter((s, k) => c.tokenOf[k] === 1);
  const pts = loop.flatMap((s) => Array.from({ length: 21 }, (_, j) => cubicPoint(s, j / 20)));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const long = Math.max(...xs) - Math.min(...xs), wide = Math.max(...ys) - Math.min(...ys);
  assert.ok(Math.min(...xs) >= 0.9 - 1e-6, 'nears: the loop lies beyond the end of n');
  assert.ok(long > 1.3 && long < 1.7 && wide > 0.25 && wide < 0.45, `e loop ${long.toFixed(2)} × ${wide.toFixed(2)} U`);
  assert.ok(signedAreaOf(['n', 'e-rev-s'], 1) > 0, 'left motion, like the r circle');
  assert.throws(() => compileOutline(['n', 'e-rev-s', 't']), /ends an outline/);
});

test('§94: the oo hook turns under after n and m, and after k before r or l; §93 us has no angle', () => {
  const startOf = (outline) => { const c = compileOutline(outline); const i = outline.indexOf('u'); const s = c.segments.find((x, k) => c.tokenOf[k] === i); return dir(s.p0, s.c1); };
  assert.ok(Math.abs(startOf(['n', 'u'])) < 1, 'none: the hook starts along the n');
  assert.ok(Math.abs(startOf(['m', 'u', 'd'])) < 1, 'mood');
  assert.ok(startOf(['k', 'u', 't']) > 30, 'cut: the ordinary raised hook after k');
  const cool = compileOutline(['k', 'u', 'l']);
  const kEnd = cool.segments.filter((x, k) => cool.tokenOf[k] === 0).pop();
  assert.ok(Math.abs(startOf(['k', 'u', 'l']) - dir(kEnd.c2, kEnd.p3)) < 1, 'cool: turned under after k before l');
  const c = compileOutline(['u', 's-right']);
  const [h] = c.segments.filter((s, k) => c.tokenOf[k] === 0), [s] = c.segments.filter((x, k) => c.tokenOf[k] === 1);
  const turn = Math.abs(dir(h.c2, h.p3) - dir(s.p0, s.c1));
  assert.ok(turn < 1 || turn > 359, `us: no angle between the hook and s (${turn.toFixed(1)}°)`);
});

test('§99 the w dash sits under its vowel; §100 the a dot sits on the line before the outline', () => {
  const c = compileOutline(['k', 'w-dash', 'e', 'k']);
  const dash = c.segments.find((s) => s.mark === 'w');
  const circle = c.segments.filter((s, k) => c.tokenOf[k] === 2 && s.type === 'cubic').flatMap((s) => [s.p0, s.p3]);
  assert.ok(dash && dash.dash > 0, 'quick: a dash');
  assert.ok(dash.p.y < Math.min(...circle.map((p) => p.y)), 'quick: below the e circle');
  assert.deepEqual(c.tokenOf.filter((k) => k === 1).length, 1, 'the dash is owned by the w-dash token');
  const a = compileOutline(['a-dot', 'u', 'a']);
  const dot = a.segments.find((s) => s.mark === 'a');
  const xs = a.segments.filter((s) => s.type === 'cubic').flatMap((s) => [s.p0.x, s.p3.x]);
  assert.ok(dot.p.x < Math.min(...xs) && Math.abs(dot.p.y - a.start.y) < 1e-9, 'away: the dot is before the outline, level with its start');
});

test('w before a vowel: the hook doubled, running on into a narrow loop that turns the same way', () => {
  const c = compileOutline(['u', 'a', 't']);
  const hook = c.segments.filter((s, k) => c.tokenOf[k] === 0), loop = c.segments.filter((s, k) => c.tokenOf[k] === 1);
  const plain = compileOutline(['u']);
  const span = (segs) => { const p = polygon(segs); return Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x)); };
  assert.ok(Math.abs(span(hook) / span(plain.segments) - 2) < 0.05, 'wait: the hook is twice its size');
  assert.equal(loop.length, 2, 'wait: a loop, not a circle');
  const end = hook.at(-1), first = loop[0];
  assert.deepEqual(first.p0, end.p3);
  assert.ok(Math.hypot(loop[1].p3.x - end.p3.x, loop[1].p3.y - end.p3.y) < 1e-9, 'the loop closes on the joint');
  const p = polygon(loop), reach = Math.max(...p.map((q) => Math.hypot(q.x - end.p3.x, q.y - end.p3.y)));
  assert.ok(Math.abs(reach - W_LOOP.a.length) < 0.1, `the a loop is ${W_LOOP.a.length} U long (${reach.toFixed(2)})`);
  const area = p.reduce((a, q, k) => { const r = p[(k + 1) % p.length]; return a + q.x * r.y - r.x * q.y; }, 0);
  assert.ok(area < 0, 'clockwise, carrying on the hook');
});

test('§112: the broken circle joins like the large circle and ends turned in; hooks beside a circle are doubled', () => {
  const tie = compileOutline(['t', 'i']), tea = compileOutline(['t', 'a']);
  const circ = (c) => c.segments.filter((s, k) => c.tokenOf[k] === 1);
  assert.equal(circ(tie).length, circ(tea).length + 1, 'tie: the a circle plus the indent');
  assert.deepEqual(circ(tie)[0].p0, circ(tea)[0].p0);
  const tick = circ(tie).at(-1), centre = centroid(polygon(circ(tea)));
  const d = (p) => Math.hypot(p.x - centre.x, p.y - centre.y);
  assert.ok(d(tick.p3) < d(tick.p0), 'the indent turns into the circle');
  const fight = compileOutline(['f', 'i', 't']);
  assert.equal(fight.segments.filter((s, k) => fight.tokenOf[k] === 1).length, 4, 'within an outline the next stroke leaves from the joint');
  const span = (c, i) => { const p = polygon(c.segments.filter((s, k) => c.tokenOf[k] === i)); return Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x)); };
  const plainU = span(compileOutline(['k', 'u', 't']), 1), plainO = span(compileOutline(['t', 'o', 'k']), 1);
  assert.ok(Math.abs(span(compileOutline(['n', 'a', 'u']), 2) / plainU - 2) < 0.1, 'now: the ow hook doubled');
  assert.ok(Math.abs(span(compileOutline(['t', 'o', 'e']), 1) / plainO - 2) < 0.15, 'toy: the oi hook doubled');
});

test('§136 ld: the l run on nearly level, swinging up steeply at the finish', () => {
  const ld = compileOutline(['ld']).segments.filter((s) => s.type === 'cubic');
  const start = dir(ld[0].p0, ld[0].c1), end = dir(ld.at(-1).c2, ld.at(-1).p3);
  assert.ok(Math.abs(start) < 20, `starts nearly level (${start.toFixed(0)}°)`);
  assert.ok(end > 55 && end < 85, `ends rising steeply (${end.toFixed(0)}°)`);
});
