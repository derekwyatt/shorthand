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
//   h    before a hook, the dot goes above the hook (home, hope).
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
import { compileStroke, tangent, bbox } from './render.js';

// Diameters of joined circles in U (measured: a ≈ 0.8–1.05 U, e ≈ 0.4 U).
export const JOIN_CIRCLE = { a: 0.95, e: 0.38 };
const H_GAP = 0.35; // space between the h dot and the top of its circle, in U
// Between two strokes, a turn of at least this many degrees counts as an angle (§14).
export const ANGLE_THRESHOLD = 20;
// §19/§21: equal curves joined directly are drawn this much flatter (bulge factor).
export const JOINED_CURVE_FLATTEN = 0.75;
const FLAT_PAIRS = new Set(['k r', 'g l', 'r k', 'l k']);
const ROUND_PAIRS = new Set(['f r', 'f l', 'v r', 'v l', 'k sh', 'f m', 'f g', 'b g', 'k b', 's-left s-right', 's-right s-left']);

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

// A circle token as { size: 'a' | 'e', reversed, loop }, or null for any other token.
export function circleOf(tok) {
  const m = /^([ae])(?:(-rev)(-s)?)?$/.exec(tok ?? '');
  return m ? { size: m[1], reversed: !!m[2], loop: !!m[3] } : null;
}
export const S_LOOP = { a: { length: 2.0, width: 0.6 }, e: { length: 1.5, width: 0.4 } };

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

// A full circle of radius r that leaves `p` heading along unit vector `t`, turning
// with rotation `s`, and returns to `p` with the same heading.
export function circleFrom(p, t, s, r) {
  const n = { x: -t.y, y: t.x };
  const center = { x: p.x + s * n.x * r, y: p.y + s * n.y * r };
  const th0 = Math.atan2(p.y - center.y, p.x - center.x);
  const step = (s * Math.PI) / 2;
  const k = (4 / 3) * Math.tan(step / 4);
  const at = (th) => ({ x: center.x + r * Math.cos(th), y: center.y + r * Math.sin(th) });
  const d = (th) => ({ x: -r * Math.sin(th), y: r * Math.cos(th) });
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
  return { segments, center, r };
}

// n and m and their blends (want, o nd, p. 37, shows the hook turned before nd too).
// After a downstroke the hook is the downstroke's end curling round: on the plates (pour,
// bone, pole, ball, p. 36) that curl is about twice the size of a hook after a forward stroke.
const HOOK_AFTER_DOWNSTROKE = 2;
const HOOK_TURNS_BEFORE = new Set(['n', 'm', 'r', 'l', 'men', 'nd', 'md']);
const isDownstroke = (stroke) => stroke.primitives[0].angle <= -90 && stroke.primitives[0].angle >= -150;

// §67: the o hook turned by `turn` degrees.
const turnedHook = (hook, turn) => ({ ...hook, turned: turn, primitives: hook.primitives.map((p) => ({ ...p, angle: p.angle + turn })) });

// The strokes of an outline, with §19/§21 flattening applied to directly joined equal curves
// and the §67 o hook turned.
function outlineStrokes(outline) {
  const strokes = outline.map((_, i) => strokeAt(outline, i));
  outline.forEach((tok, i) => {
    if (tok !== 'o') return;
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
      strokes[k] = { ...st, flattened: true, primitives: st.primitives.map((p) => ({ ...p, bulge: p.bulge * JOINED_CURVE_FLATTEN })) };
    }
  });
  return strokes;
}

// Returns { segments, start, end, tokens, tokenOf, joins } in the same shape as
// compileStroke(): tokenOf[k] is the index in `outline` of the token that segment k was
// drawn for; joins lists the circles between two strokes with the rule that placed them.
export function compileOutline(outline) {
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
      if (loop) {
        if (!reversed || next) throw new Error(`the s loop ends an outline (${outline.join(' ')})`);
        const segs = loopFrom(pen, t, rotation, S_LOOP[size]);
        segments.push(...segs);
        owners.push(...segs.map(() => i));
        return;
      }
      const circle = circleFrom(pen, t, rotation, JOIN_CIRCLE[size] / 2);
      segments.push(...circle.segments);
      owners.push(...circle.segments.map(() => i));
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
    if (pendingDot && tok === 'o') {
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
    segments: c.segments.map((s) => (s.type === 'dot'
      ? { type: 'dot', p: movePoint(s.p, dx, dy) }
      : { type: 'cubic', p0: movePoint(s.p0, dx, dy), c1: movePoint(s.c1, dx, dy), c2: movePoint(s.c2, dx, dy), p3: movePoint(s.p3, dx, dy) })),
  };
}

export const WORD_GAP = 1.0; // space between outlines, in U
const BRIEF_DOT_HEIGHT = 0.35; // the "a, an" dot sits a little above the line

// Lays words ({ text, tokens }) out left to right, each outline resting on the line (y = 0).
// Gregg has no position writing (Manual p. x), so resting on the line is a free choice.
export function layoutWords(words) {
  let x = 0;
  return words.map((w) => {
    const c = compileOutline(w.tokens);
    const b = bbox(c);
    const dotOnly = c.segments.every((s) => s.type === 'dot');
    const placed = translateCompiled(c, x - b.minX, dotOnly ? BRIEF_DOT_HEIGHT - b.minY : -b.minY);
    x += (b.maxX - b.minX) + WORD_GAP;
    return { ...w, compiled: placed };
  });
}

export function compileSentence(words) {
  const placed = layoutWords(words);
  const segments = placed.flatMap((w) => w.compiled.segments);
  const firstCubic = segments.find((s) => s.type === 'cubic');
  return { segments, start: firstCubic ? firstCubic.p0 : placed[0].compiled.start, end: placed[placed.length - 1].compiled.end };
}

// Geometry for any practice example (letter, word or sentence).
export function compileExample(example) {
  return example.words ? compileSentence(example.words) : compileOutline(example.outline);
}
