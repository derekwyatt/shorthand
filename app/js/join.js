// Joins consonant strokes, vowel circles and the h dot into one outline.
//
// Rules implemented (Gregg Shorthand Manual, Anniversary Edition, 1929):
//   §11  At the beginning or end of a single curve, the circle is placed INSIDE the curve.
//   §12  At the beginning or end of a single straight stroke, the circle is written with
//        RIGHT motion (clockwise).
//   h    is a dot written above the vowel that follows it.
//   §14  Between strokes that meet at an angle (or a point), the circle goes OUTSIDE the angle.
//   §15  Straight stroke and curve, or two same-motion curves, joined without an angle:
//        the circle is inside the curve.
//   §17  Between straight strokes in the same direction: right motion (clockwise).
//   §18  Between opposite curves the circle is turned back on the first curve (inside the
//        second curve, against the first).
//   §19/§21  k+r, g+l, r+k and l+k are equal curves and are made a little flatter when joined.
//   (§20 gr and kl keep their normal geometry.)
//   §39  fr and fl: "the angle is rounded to give fluency", like part of a longhand y. The
//        strokes meet with one shared direction instead of a corner. (vr and vl, the long
//        forms, are taken to follow the same rule: an inference.)
//        The Unit 6 plates round k-sh (action), f-m (formal, inform), f-g (forgot), b-g
//        (big) and k-b (can be) the same way, so those pairs are rounded too.
//   §52  The two s signs of ses are joined "as a blend": one smooth reverse curve.
//   §67  "To avoid an unnecessary angle, the slant of the o-hook is modified slightly before
//        n, m, r, and l": the hook is turned until it leaves along the next stroke's start.
//        "When a downstroke comes before the o-hook, this rule does not apply, since the
//        o-hook joins to downstrokes without an angle": after a downstroke the hook is
//        turned to start along the downstroke's end (pour, bone, pole on p. 36).
//   h    before a hook, the dot goes above the hook (home, hope, who).
//   §93  "The combination us is written without an angle": u s-right is a rounded pair, and
//        so is s-right u, the sw of sweet and swim on the Unit 11 plates (p. 53).
//   §99  w within a word: "a short horizontal dash" under the following vowel (w-dash, the
//        token before that vowel's circle or hook). §100 initial a: a dot on the line before
//        the outline (a-dot). Both are written apart from the outline, like the h dot.
//   §8   Marking vowels: "the medium sound is marked with a dot, and the long sound with a
//        short dash" (ä, ĕ: v-dot; ā, ē: v-dash, the token before the vowel). As printed in
//        Units 1 and 2 (pp. 3–13), just under the circle, the dash a little left and rising.
//   §209 "The prefix is placed above the line, very close to the remainder of the word": the
//        token `^` ends a disjoined prefix (contr = k ^, intr = n ^), drawn as a stroke of its
//        own just above the start of the rest (p. 121).
//   §230 "Analogical word-endings, disjoined": the token `_` starts a suffix written apart,
//        just under the end of the word (pp. 137–138).
//   §94  "The oo-hook is turned under after n, m. It is also turned under after k or g if
//        followed by r or l": the hook turned to start along the end of the n / m / k / g,
//        so it curls down and back under the line (none, numb, cool, p. 50). The n and m
//        blends are taken to follow n and m (an inference: no plate).
//   §71  "The circle is written with left motion to express r following the vowel" before and
//        after straight strokes and between straight strokes in the same direction: the
//        tokens a-rev and e-rev are the a and e circles turned the other way from §12 / §17.
//        Only on straight strokes.
//   §74  "The letter s is added to a final left-motion circle on straight strokes by changing
//        the circle to a loop": a-rev-s, e-rev-s, a narrow loop carrying on along the stroke.
//        Size measured on p. 40 (tears, nears, dares): e ≈ 1.5 × 0.4 U, a ≈ 2 × 0.6 U.
// The angle threshold and the flattening factor are inferences (reference/manual-unit2.md).
//
// An outline is a list of tokens: a stroke id from data/strokes.js, 'a' or 'e' (circle),
// 'a-rev' or 'e-rev' (the §71 r circle) or 'h' (dot). Geometry is in U with y up, like render.js.
import { STROKE_BY_ID } from '../data/strokes.js';
import { compileStroke, cubicPoint, tangent, bbox, brokenTick } from './render.js';

// Joined circles are ovals, not round. On the 600-dpi plates the large circle beside a straight
// stroke is about twice as long as it is high, its long axis along that stroke (aim, ate, make,
// calm; pp. 5, 7); between curves it is rounder and still follows the direction of the joint
// (air, ail, gay). The small circle is only a little oval (team). Axes in U; `round` is the
// minor axis between curves.
export const JOIN_OVAL = { a: { major: 1.15, minor: 0.55, round: 0.85 }, e: { major: 0.42, minor: 0.34, round: 0.36 } };
const OVAL_TILT = 20; // a typical joint direction, for the size the recogniser expects
// Half the width and half the height of an oval's bounding box.
export function ovalExtent({ major, minor }, tilt = OVAL_TILT) {
  const c = Math.cos(tilt * Math.PI / 180), s = Math.sin(tilt * Math.PI / 180);
  return { x: Math.hypot(major / 2 * c, minor / 2 * s), y: Math.hypot(major / 2 * s, minor / 2 * c) };
}
// The size of a joined circle in U, as the mean of its box's width and height: what the
// recogniser compares a written circle with.
export const JOIN_CIRCLE = Object.fromEntries(Object.entries(JOIN_OVAL).map(([k, o]) => { const e = ovalExtent(o); return [k, e.x + e.y]; }));
const H_GAP = 0.35; // space between the h dot and the top of its circle, in U
// Between two strokes, a turn of at least this many degrees counts as an angle (§14).
export const ANGLE_THRESHOLD = 20;
// §19/§21: equal curves joined directly are drawn this much flatter (bulge factor).
export const JOINED_CURVE_FLATTEN = 0.75;
const FLAT_PAIRS = new Set(['k r', 'g l', 'r k', 'l k']);
const ROUND_PAIRS = new Set(['p r', 'p l', 'b r', 'b l', 'f r', 'f l', 'v r', 'v l', 'k sh', 'f m', 'f g', 'b g', 'k b', 's-left s-right', 's-right s-left', 'u s-right', 's-right u']);

// §39: bend the end of the previous stroke and the start of the next so that both run
// along the average of their directions where they meet (a rounded turn, no corner).
function roundJoin(prevSeg, nextSeg) {
  const a = { x: prevSeg.p3.x - prevSeg.c2.x, y: prevSeg.p3.y - prevSeg.c2.y };
  const b = { x: nextSeg.c1.x - nextSeg.p0.x, y: nextSeg.c1.y - nextSeg.p0.y };
  const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
  const t = { x: a.x / la + b.x / lb, y: a.y / la + b.y / lb };
  const lt = Math.hypot(t.x, t.y);
  if (lt < 1e-6) return;
  t.x /= lt; t.y /= lt;
  // The sharper the turn, the shorter the handles, so a near-reversal (f-g) bends without
  // overshooting into a loop.
  const k = Math.max(0.3, (1 + (a.x * b.x + a.y * b.y) / (la * lb)) / 2);
  prevSeg.c2 = { x: prevSeg.p3.x - t.x * la * k, y: prevSeg.p3.y - t.y * la * k };
  nextSeg.c1 = { x: nextSeg.p0.x + t.x * lb * k, y: nextSeg.p0.y + t.y * lb * k };
}

// A circle token as { size: 'a' | 'e', reversed, loop, broken }, or null for any other token.
// i is the §112 broken circle: the large circle, joined like one, with an indent.
export function circleOf(tok) {
  if (tok === 'i') return { size: 'a', reversed: false, loop: false, broken: true };
  const m = /^([ae])(?:(-rev)(-s)?)?$/.exec(tok ?? '');
  return m ? { size: m[1], reversed: !!m[2], loop: !!m[3], broken: false } : null;
}

export const S_LOOP = { a: { length: 2.0, width: 0.6 }, e: { length: 1.5, width: 0.4 } };
// w before a vowel (we, way, wait; Unit 11 plates, p. 52): the oo hook drawn about twice its
// size runs on into the circle, which the plates draw as a narrow loop carrying on along the
// hook's descending end and turning the same way (∂), not a round circle beside the join.
// Measured against t on the 600-dpi plates.
export const W_LOOP = { a: { length: 1.5, width: 0.6 }, e: { length: 1.2, width: 0.4 } };
const W_HOOK = 2;
// A hook drawn twice its size beside a circle (below).
export const isDoubledHook = (outline, i) => (outline[i] === 'u' && (isWLoop(outline, i + 1) || circleOf(outline[i - 1]) !== null))
  || (outline[i] === 'o' && circleOf(outline[i + 1]) !== null);
const doubled = (stroke) => ({ ...stroke, primitives: stroke.primitives.map((p) => ({ ...p, length: p.length * W_HOOK })) });
export const isWLoop = (outline, i) => outline[i - 1] === 'u' && circleOf(outline[i]) !== null && !circleOf(outline[i]).reversed;

// §74: a narrow loop from `p` out along `t` and back, turning with rotation `s`.
export function loopFrom(p, t, s, { length, width }) {
  const n = { x: -t.y * s, y: t.x * s }; // the side the loop turns toward
  const at = (a, b) => ({ x: p.x + t.x * a + n.x * b, y: p.y + t.y * a + n.y * b });
  const tip = at(length, width * 0.5);
  return [
    { type: 'cubic', p0: p, c1: at(length * 0.45, -width * 0.25), c2: at(length * 1.02, -width * 0.1), p3: tip },
    { type: 'cubic', p0: tip, c1: at(length * 0.98, width * 0.95), c2: at(length * 0.45, width * 0.8), p3: p },
  ];
}
const isCircle = (tok) => circleOf(tok) !== null;
const isStraight = (stroke) => stroke.primitives[0].type === 'line';
const strokeAt = (outline, i) => {
  const tok = outline[i];
  if (tok === undefined || tok === 'h' || isCircle(tok)) return null;
  const s = STROKE_BY_ID[tok];
  if (!s) throw new Error(`unknown stroke "${tok}"`);
  return s;
};

// Rotation of a circle joined to `stroke`: +1 counter-clockwise, -1 clockwise.
export function circleRotation(stroke) {
  const prim = stroke.primitives[0];
  if (prim.type === 'arc') return -Math.sign(prim.bulge); // §11: inside the curve
  if (prim.type === 'line') return -1;                     // §12: right motion
  throw new Error(`no circle-joining rule for ${stroke.id}`);
}

const motion = (stroke) => Math.sign(stroke.primitives[0].bulge);
const isCurve = (stroke) => stroke.primitives[0].type === 'arc';
const turnDegrees = (a, b) => {
  const d = (Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * (180 / Math.PI);
  return ((((d + 180) % 360) + 360) % 360) - 180;
};

// Which rule places a circle between `prev` and `next` (stroke objects): returns
// { section: 14 | 15 | 17 | 18, rotation, delta } with rotation +1 counter-clockwise,
// -1 clockwise, and delta the turn in degrees from the end tangent of `prev` to the
// start tangent of `next` (left / counter-clockwise positive).
export function circleJoinRule(prev, next) {
  const delta = turnDegrees(tangent(compileStroke(prev), 'end'), tangent(compileStroke(next), 'start'));
  const curves = [prev, next].filter(isCurve);
  if (Math.abs(delta) >= ANGLE_THRESHOLD) return { section: 14, rotation: -Math.sign(delta), delta };
  if (curves.length === 0) return { section: 17, rotation: -1, delta };
  if (curves.length === 1) return { section: 15, rotation: circleRotation(curves[0]), delta };
  if (motion(prev) === motion(next)) return { section: 15, rotation: circleRotation(next), delta };
  return { section: 18, rotation: circleRotation(next), delta };
}

// A full oval with axes `major` and `minor` in U, its long axis along t, that leaves `p`
// heading along unit vector `t`, turning with rotation `s`, and returns to `p` with the same
// heading. `r` is its half-height, for placing a dot above it.
export function circleFrom(p, t, s, { major, minor }) {
  const tilt = Math.atan2(t.y, t.x) * 180 / Math.PI;
  const rx = major / 2, ry = minor / 2;
  const c = Math.cos(tilt * Math.PI / 180), sn = Math.sin(tilt * Math.PI / 180);
  const rot = (v) => ({ x: v.x * c - v.y * sn, y: v.x * sn + v.y * c });
  // The point of the oval whose direction of travel is t.
  const tl = { x: t.x * c + t.y * sn, y: -t.x * sn + t.y * c };
  const th0 = Math.atan2(-s * tl.x / rx, s * tl.y / ry);
  const local = (th) => rot({ x: rx * Math.cos(th), y: ry * Math.sin(th) });
  const l0 = local(th0);
  const center = { x: p.x - l0.x, y: p.y - l0.y };
  const at = (th) => { const v = local(th); return { x: center.x + v.x, y: center.y + v.y }; };
  const d = (th) => rot({ x: -rx * Math.sin(th), y: ry * Math.cos(th) });
  const step = (s * Math.PI) / 2;
  const k = (4 / 3) * Math.tan(step / 4);
  const segments = [];
  for (let i = 0; i < 4; i++) {
    const a = th0 + i * step;
    const b = a + step;
    const pa = at(a), pb = at(b), da = d(a), db = d(b);
    segments.push({
      type: 'cubic', p0: pa,
      c1: { x: pa.x + k * da.x, y: pa.y + k * da.y },
      c2: { x: pb.x - k * db.x, y: pb.y - k * db.y },
      p3: pb,
    });
  }
  segments[0].p0 = p;
  segments[3].p3 = p;
  return { segments, center, r: ovalExtent({ major, minor }, tilt).y };
}

// n and m and their blends (want, o nd, p. 37, shows the hook turned before nd too).
// After a downstroke the hook is the downstroke's end curling round: on the plates (pour,
// bone, pole, ball, p. 36) that curl is about twice the size of a hook after a forward stroke.
const HOOK_AFTER_DOWNSTROKE = 2;
const HOOK_TURNS_BEFORE = new Set(['n', 'm', 'r', 'l', 'men', 'nd', 'md']);
const isDownstroke = (stroke) => stroke.primitives[0].angle <= -90 && stroke.primitives[0].angle >= -150;

// §67: the o hook turned by `turn` degrees.
const turnedHook = (hook, turn) => ({ ...hook, turned: turn, primitives: hook.primitives.map((p) => ({ ...p, angle: p.angle + turn })) });

// A curve drawn flatter by JOINED_CURVE_FLATTEN; measured control points are drawn in toward
// the chord by the same factor.
const flatten = (p) => ({
  ...p,
  bulge: p.bulge * JOINED_CURVE_FLATTEN,
  ...(p.ctrl && { ctrl: p.ctrl.map(([a, b]) => [a, b * JOINED_CURVE_FLATTEN]) }),
});

// A measured curve with its tight turn at the start (`at` = 'start') or end relaxed: that end's
// handle points along the run of the stroke instead. Where a circle joins that end the circle
// takes the place of the turn (air, ail, cake; pp. 5-7): the r after the circle of air runs
// out almost straight, and the k of cake sweeps into its circle.
const RELAX = 0.5, KEEP = 0.75; // handle along the run; depth kept
function relaxed(stroke, at) {
  const primitives = stroke.primitives.map((p) => {
    if (!p.ctrl) return p;
    const [[a1, b1], [a2, b2]] = p.ctrl;
    // Along the run of the stroke, keeping most of the turn's depth (array, p. 6, keeps a
    // visible dip in its r; happy, a full p).
    const ctrl = at === 'start'
      ? [[a2 * RELAX, b1 * KEEP], [a2, b2]]
      : [[a1, b1], [1 + (a1 - 1) * RELAX, b2 * KEEP]];
    return { ...p, ctrl };
  });
  return { ...stroke, primitives };
}

// The strokes of an outline, with §19/§21 flattening applied to directly joined equal curves
// and the §67 o hook turned.
function outlineStrokes(outline) {
  const strokes = outline.map((_, i) => strokeAt(outline, i));
  outline.forEach((tok, i) => {
    if (tok === 'u') {
      const prev = outline[i - 1], next = outline[i + 1];
      const under = ['n', 'm', 'men', 'nd', 'md'].includes(prev) || (['k', 'g'].includes(prev) && ['r', 'l'].includes(next));
      if (under) strokes[i] = turnedHook(strokes[i], turnDegrees(tangent(compileStroke(strokes[i]), 'start'), tangent(compileStroke(strokes[i - 1]), 'end')));
      // Beside a circle (w before a vowel; the diphthongs ū and ow, §112) the hook is about
      // twice its size on the plates (way, use, now, cow; pp. 52, 61).
      if (isDoubledHook(outline, i)) strokes[i] = doubled(strokes[i]);
      return;
    }
    if (tok !== 'o') return;
    // oi (§112): the hook before the circle is doubled too (oil, toy, boy; p. 61).
    if (isDoubledHook(outline, i) && !(strokes[i - 1] && isDownstroke(strokes[i - 1]))) strokes[i] = doubled(strokes[i]);
    const hook = compileStroke(strokes[i]);
    const prev = strokes[i - 1];
    if (prev && isDownstroke(prev)) {
      const turned = turnedHook(strokes[i], turnDegrees(tangent(hook, 'start'), tangent(compileStroke(prev), 'end')));
      strokes[i] = { ...turned, primitives: turned.primitives.map((p) => ({ ...p, length: p.length * HOOK_AFTER_DOWNSTROKE })) };
    } else if (HOOK_TURNS_BEFORE.has(outline[i + 1])) {
      strokes[i] = turnedHook(strokes[i], turnDegrees(tangent(hook, 'end'), tangent(compileStroke(strokes[i + 1]), 'start')));
    }
  });
  strokes.forEach((s, i) => {
    const n = strokes[i + 1];
    if (!s || !n || !FLAT_PAIRS.has(`${outline[i]} ${outline[i + 1]}`)) return;
    for (const k of [i, i + 1]) {
      const st = strokes[k];
      if (st.flattened) continue;
      strokes[k] = { ...st, flattened: true, primitives: st.primitives.map(flatten) };
    }
  });
  // A circle in place of a curve's tight turn.
  strokes.forEach((s, i) => {
    if (!s?.primitives?.[0]?.ctrl || !['arc'].includes(s.primitives[0].type) || ['o', 'u', 'ld', 'def', 'jnt'].includes(outline[i])) return;
    // Only the end with the turn: the one whose control point stands further off the chord.
    const [[, b1], [, b2]] = s.primitives[0].ctrl;
    const tight = Math.abs(b1) > Math.abs(b2) ? 'start' : 'end';
    const beside = tight === 'start' ? outline[i - 1] : outline[i + 1];
    if (isCircle(beside ?? '')) strokes[i] = relaxed(strokes[i], tight);
  });
  return strokes;
}

const MARKS = new Set(['w-dash', 'a-dot', 'cap', 'v-dash', 'v-dot', 'ing']);
export const isMark = (tok) => MARKS.has(tok);
const W_DASH = { length: 0.4, gap: 0.25 }; // below the vowel, in U
const A_DOT_GAP = 0.45; // before the outline
// §8 vowel marks under the circle: the dot's gap, and the dash (its middle left of the circle's).
const V_DOT_GAP = 0.2;
const V_DASH = { length: 0.32, angle: 62, gap: 0.3, left: 0.08 };
// §3: "A dot at the end of a word expresses ing": just past the outline's last point, a little
// below it.
const ING_DOT = { along: 0.3, below: 0.15 };
// §233: the capital mark, two short parallel dashes rising to the right under the outline, right of its middle (p. 141).
const CAP = { length: 0.4, angle: 30, gap: 0.35, apart: 0.14, along: 0.7 };

// The outline without its §99 / §100 marks, compiled, then the marks placed: a w dash
// below the vowel after it, the a dot on the line before the outline. Mark segments are
// dots ({ type: 'dot', p, mark, dash? }); a dash has a length and is drawn as a short line.
export const DISJOIN = '^';
// §230 (and the §218 stand forms): the token `_` starts a disjoined suffix, written as a
// stroke of its own under the end of the word.
export const SUFFIX = '_';
export const isDisjoin = (tok) => tok === DISJOIN || tok === SUFFIX;
// §209: the prefix's lowest point this far above the highest point of the rest under it.
const PREFIX_GAP = 0.3;
// §230: the suffix starts this far left of the word's last point, its top this far below
// it (pp. 137–138).
const SUFFIX_BACK = 0.45, SUFFIX_GAP = 0.75;

// A word written in two pen-downs, placed. `^` ends a prefix, which starts over the start
// of the rest, just clear of it; `_` starts a suffix, under the end of the word. tokenOf
// still indexes the whole outline; the `^` or `_` owns no segment.
function compileDisjoined(outline) {
  const k = outline.findIndex(isDisjoin);
  if (k < 1 || k === outline.length - 1 || outline.slice(k + 1).some(isDisjoin)) throw new Error(`one disjoined part, written before or after the rest of the word (${outline.join(' ')})`);
  const first = compileOutline(outline.slice(0, k)), second = compileOutline(outline.slice(k + 1));
  const onCurve = (c) => c.segments.filter((s) => s.type === 'cubic').flatMap((s) => Array.from({ length: 17 }, (_, i) => cubicPoint(s, i / 16)));
  const fp = onCurve(first), sp = onCurve(second);
  const fMinX = Math.min(...fp.map((p) => p.x)), sMinX = Math.min(...sp.map((p) => p.x));
  let d;
  if (outline[k] === DISJOIN) {
    const span = Math.max(...fp.map((p) => p.x)) - fMinX;
    const top = Math.max(...sp.filter((p) => p.x <= sMinX + span + 0.3).map((p) => p.y));
    d = { x: sMinX - fMinX, y: top + PREFIX_GAP - Math.min(...fp.map((p) => p.y)) };
  }
  // The part that moves: the prefix onto the rest, or the suffix under the word.
  const moving = outline[k] === DISJOIN ? first : second;
  if (outline[k] === SUFFIX) {
    const x0 = first.end.x - SUFFIX_BACK, x1 = x0 + Math.max(...sp.map((p) => p.x)) - sMinX;
    // Under the last point, and never into a part of the word that dips lower above it.
    const above = fp.filter((p) => p.x >= x0 - 0.1 && p.x <= x1 + 0.1).map((p) => p.y - PREFIX_GAP);
    const top = Math.min(first.end.y - SUFFIX_GAP, ...above);
    d = { x: x0 - sMinX, y: top - Math.max(...sp.map((p) => p.y)) };
  }
  const mv = (p) => ({ x: p.x + d.x, y: p.y + d.y });
  const moved = moving.segments.map((s) => (s.type === 'dot' ? { ...s, p: mv(s.p) } : { ...s, p0: mv(s.p0), c1: mv(s.c1), c2: mv(s.c2), p3: mv(s.p3) }));
  const [a, b] = outline[k] === DISJOIN ? [moved, second.segments] : [first.segments, moved];
  return {
    segments: [...a, ...b],
    start: outline[k] === DISJOIN ? mv(first.start) : first.start,
    end: outline[k] === DISJOIN ? second.end : mv(second.end),
    tokens: outline,
    tokenOf: [...first.tokenOf, ...second.tokenOf.map((t) => t + k + 1)],
    joins: [...first.joins, ...second.joins.map((j) => ({ ...j, index: j.index + k + 1 }))],
  };
}

// §48: "The base of the first consonant of a word rests on the line of writing, but when s
// precedes another consonant, the base of the consonant following the s is placed on the
// line." `base` is the y of that point: a vowel circle or hook before or under it may hang
// below the line. An outline with a disjoined part, or with no consonant, rests its lowest
// point on the line instead.
const NOT_CONSONANT = new Set(['a', 'a-rev', 'a-rev-s', 'e', 'e-rev', 'e-rev-s', 'i', 'o', 'u', 'h', 'period']);
const isConsonant = (tok) => !NOT_CONSONANT.has(tok) && !isMark(tok) && !isDisjoin(tok);
function baseOf(outline, c) {
  const lowest = bbox(c).minY;
  if (outline.some(isDisjoin)) return lowest;
  let at = outline.findIndex(isConsonant);
  if (at < 0) return lowest;
  if (outline[at] === 's-left' || outline[at] === 's-right') {
    const next = outline.findIndex((tok, i) => i > at && isConsonant(tok));
    if (next >= 0) at = next;
  }
  const own = c.segments.filter((seg, k) => c.tokenOf[k] === at && seg.type === 'cubic');
  if (!own.length) return lowest;
  return Math.min(...own.flatMap((seg) => Array.from({ length: 17 }, (_, i) => cubicPoint(seg, i / 16).y)));
}

export function compileOutline(outline) {
  const c = compileParts(outline);
  return { ...c, base: baseOf(outline, c) };
}

function compileParts(outline) {
  if (outline.some(isDisjoin)) return compileDisjoined(outline);
  if (!outline.some(isMark)) return compileCore(outline);
  const core = [], origin = [], marks = [];
  outline.forEach((tok, i) => {
    if (isMark(tok)) marks.push({ tok, i, at: core.length });
    else { core.push(tok); origin.push(i); }
  });
  const c = compileCore(core);
  const box = bbox(c);
  const segments = [...c.segments], tokenOf = c.tokenOf.map((k) => origin[k]);
  for (const m of marks) {
    let seg;
    if (m.tok === 'a-dot') {
      seg = { type: 'dot', mark: 'a', p: { x: box.minX - A_DOT_GAP, y: c.start.y } };
    } else if (m.tok === 'ing') {
      if (m.i !== outline.length - 1) throw new Error(`the ing dot ends the word (${outline.join(' ')})`);
      seg = { type: 'dot', mark: 'ing', p: { x: c.end.x + ING_DOT.along, y: c.end.y - ING_DOT.below } };
    } else if (m.tok === 'cap') {
      // Under the outline, CAP.along of the way across its width (p. 141: right of the middle
      // of m and k, near the right end of g and n), the upper dash CAP.gap below its lowest point.
      const pts = [...c.segments.filter((s) => s.type === 'cubic').flatMap((s) => Array.from({ length: 17 }, (_, i) => cubicPoint(s, i / 16))), ...c.segments.filter((s) => s.type === 'dot').map((s) => s.p)];
      const low = pts.reduce((a, p) => (p.y < a.y ? p : a));
      const y = low.y - CAP.gap - (CAP.length / 2) * Math.sin((CAP.angle * Math.PI) / 180);
      const minX = Math.min(...pts.map((p) => p.x)), mid = minX + CAP.along * (Math.max(...pts.map((p) => p.x)) - minX);
      for (const k of [1, 0]) {
        segments.unshift({ type: 'dot', mark: 'cap', dash: CAP.length, angle: CAP.angle, p: { x: mid, y: y - k * CAP.apart } });
        tokenOf.unshift(m.i);
      }
      continue;
    } else {
      const own = c.segments.filter((s, k) => c.tokenOf[k] === m.at && s.type === 'cubic');
      if (!own.length) throw new Error(`${m.tok} goes before a vowel (${outline.join(' ')})`);
      const b = bbox({ segments: own });
      const x = (b.minX + b.maxX) / 2;
      if (m.tok === 'v-dot') seg = { type: 'dot', mark: 'v-dot', p: { x, y: b.minY - V_DOT_GAP } };
      else if (m.tok === 'v-dash') seg = { type: 'dot', mark: 'v-dash', dash: V_DASH.length, angle: V_DASH.angle, p: { x: x - V_DASH.left, y: b.minY - V_DASH.gap } };
      else seg = { type: 'dot', mark: 'w', dash: W_DASH.length, p: { x, y: b.minY - W_DASH.gap } };
    }
    segments.unshift(seg);
    tokenOf.unshift(m.i);
  }
  return { ...c, segments, tokens: outline, tokenOf, joins: c.joins.map((j) => ({ ...j, index: origin[j.index] })) };
}

// Returns { segments, start, end, tokens, tokenOf, joins } in the same shape as
// compileStroke(): tokenOf[k] is the index in `outline` of the token that segment k was
// drawn for; joins lists the circles between two strokes with the rule that placed them.
function compileCore(outline) {
  const segments = [];
  const owners = [];
  const dots = [];
  const dotOwners = [];
  const joins = [];
  const strokes = outlineStrokes(outline);
  const plain = outline.map((_, i) => strokeAt(outline, i)); // the rule reads the unflattened forms
  let pen = { x: 0, y: 0 };
  let pendingDot = false;
  let dotToken = -1;

  outline.forEach((tok, i) => {
    if (tok === 'h') {
      pendingDot = true;
      dotToken = i;
      return;
    }
    if (isCircle(tok)) {
      const prev = strokes[i - 1] ?? null;
      const next = strokes[i + 1] ?? null;
      const adj = prev || next;
      if (!adj) throw new Error(`a circle needs a stroke to join (${outline.join(' ')})`);
      let rotation;
      let t;
      if (prev && next) {
        const rule = circleJoinRule(plain[i - 1], plain[i + 1]);
        rotation = rule.rotation;
        joins.push({ index: i, tok, ...rule });
        t = tangent(compileStroke(prev), 'end');
      } else {
        rotation = circleRotation(adj);
        t = prev ? tangent(compileStroke(prev), 'end') : tangent(compileStroke(next), 'start');
      }
      const { size, reversed, loop } = circleOf(tok);
      if (reversed) {
        // §71: left motion, the other way from the straight-stroke rule.
        if (![prev, next].filter(Boolean).every(isStraight)) throw new Error(`the r circle joins only straight strokes (${outline.join(' ')})`);
        rotation = -rotation;
        if (joins.length && joins[joins.length - 1].index === i) Object.assign(joins[joins.length - 1], { section: 71, rotation });
      }
      if (isWLoop(outline, i)) {
        const segs = loopFrom(pen, t, circleRotation(prev), W_LOOP[size]);
        segments.push(...segs);
        owners.push(...segs.map(() => i));
        return;
      }
      if (loop) {
        if (!reversed || next) throw new Error(`the s loop ends an outline (${outline.join(' ')})`);
        const segs = loopFrom(pen, t, rotation, S_LOOP[size]);
        segments.push(...segs);
        owners.push(...segs.map(() => i));
        return;
      }
      const oval = JOIN_OVAL[size];
      const flat = [prev, next].some((x) => x && isStraight(x));
      const circle = circleFrom(pen, t, rotation, { major: oval.major, minor: flat ? oval.minor : oval.round });
      segments.push(...circle.segments);
      owners.push(...circle.segments.map(() => i));
      if (circleOf(tok).broken && !next) {
        // The indent ends the outline; within one the next stroke leaves from the joint.
        const tick = brokenTick(circle.segments[0], circle.center);
        segments.push(...tick);
        owners.push(...tick.map(() => i));
      }
      if (pendingDot) {
        dots.push({ type: 'dot', p: { x: circle.center.x, y: circle.center.y + circle.r + H_GAP } });
        dotOwners.push(dotToken);
        pendingDot = false;
      }
      return;
    }
    const c = compileStroke(strokes[i], pen);
    if (ROUND_PAIRS.has(`${outline[i - 1]} ${tok}`) && segments.length) roundJoin(segments[segments.length - 1], c.segments[0]);
    segments.push(...c.segments);
    owners.push(...c.segments.map(() => i));
    if (pendingDot && (tok === 'o' || tok === 'u')) {
      // Above the hook: over the middle of its span, a gap above its top.
      const b = bbox(c);
      dots.push({ type: 'dot', p: { x: (b.minX + b.maxX) / 2, y: b.maxY + H_GAP } });
      dotOwners.push(dotToken);
      pendingDot = false;
    }
    pen = c.end;
  });
  if (pendingDot) {
    // A dot on its own is the letter h / the brief form "a, an".
    if (outline.length !== 1) throw new Error(`h must be followed by a vowel circle or the o hook (${outline.join(' ')})`);
    dots.push({ type: 'dot', p: pen });
    dotOwners.push(dotToken);
  }

  const firstCubic = segments.find((s) => s.type === 'cubic');
  // The h dot is written first, so it leads the segment list.
  return {
    segments: [...dots, ...segments], start: firstCubic ? firstCubic.p0 : pen, end: pen,
    tokens: outline, tokenOf: [...dotOwners, ...owners], joins,
  };
}

// ---------------------------------------------------------------- sentences

const movePoint = (p, dx, dy) => ({ x: p.x + dx, y: p.y + dy });
export function translateCompiled(c, dx, dy) {
  return {
    ...c,
    start: movePoint(c.start, dx, dy),
    end: movePoint(c.end, dx, dy),
    ...(c.base === undefined ? {} : { base: c.base + dy }),
    segments: c.segments.map((s) => (s.type === 'dot'
      ? { ...s, p: movePoint(s.p, dx, dy) }
      : { type: 'cubic', p0: movePoint(s.p0, dx, dy), c1: movePoint(s.c1, dx, dy), c2: movePoint(s.c2, dx, dy), p3: movePoint(s.p3, dx, dy) })),
  };
}

export const WORD_GAP = 1.0; // space between outlines, in U
const BRIEF_DOT_HEIGHT = 0.35; // the "a, an" dot sits a little above the line

// Lays words ({ text, tokens }) out left to right, each outline resting on the line (y = 0)
// at its base (§48).
// Gregg has no position writing (Manual p. x), so resting on the line is a free choice.
export function layoutWords(words) {
  let x = 0;
  return words.map((w) => {
    const c = compileOutline(w.tokens);
    const b = bbox(c);
    const dotOnly = c.segments.every((s) => s.type === 'dot');
    const placed = translateCompiled(c, x - b.minX, dotOnly ? BRIEF_DOT_HEIGHT - b.minY : -c.base);
    x += (b.maxX - b.minX) + WORD_GAP;
    return { ...w, compiled: placed };
  });
}

export function compileSentence(words) {
  const placed = layoutWords(words);
  const segments = placed.flatMap((w) => w.compiled.segments);
  const firstCubic = segments.find((s) => s.type === 'cubic');
  return { segments, start: firstCubic ? firstCubic.p0 : placed[0].compiled.start, end: placed[placed.length - 1].compiled.end, base: 0 };
}

// Geometry for any practice example (letter, word or sentence).
export function compileExample(example) {
  return example.words ? compileSentence(example.words) : compileOutline(example.outline);
}
