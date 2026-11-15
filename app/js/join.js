// Joins consonant strokes, vowel circles and the h dot into one outline.
//
// Rules implemented (Gregg Shorthand Manual, Anniversary Edition, 1929):
//   §11  At the beginning or end of a single curve, the circle is placed INSIDE the curve.
//   §12  At the beginning or end of a single straight stroke, the circle is written with
//        RIGHT motion (clockwise).
//   h    is a dot written above the vowel that follows it.
// Circles BETWEEN two strokes (§14–18) are not implemented yet and throw.
//
// An outline is a list of tokens: a stroke id from data/strokes.js, 'a' or 'e' (circle)
// or 'h' (dot). Geometry is in U with y up, like render.js.
import { STROKE_BY_ID } from '../data/strokes.js';
import { compileStroke, tangent, bbox } from './render.js';

// Diameters of joined circles in U (measured: a ≈ 0.8–1.05 U, e ≈ 0.4 U).
export const JOIN_CIRCLE = { a: 0.95, e: 0.38 };
const H_GAP = 0.35; // space between the h dot and the top of its circle, in U

const isCircle = (tok) => tok === 'a' || tok === 'e';
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

// Returns { segments, start, end } in the same shape as compileStroke().
export function compileOutline(outline) {
  const segments = [];
  const dots = [];
  let pen = { x: 0, y: 0 };
  let pendingDot = false;

  outline.forEach((tok, i) => {
    if (tok === 'h') {
      pendingDot = true;
      return;
    }
    if (isCircle(tok)) {
      const prev = strokeAt(outline, i - 1);
      const next = strokeAt(outline, i + 1);
      if (prev && next) throw new Error(`circle between strokes is not implemented yet (${outline.join(' ')})`);
      const adj = prev || next;
      if (!adj) throw new Error(`a circle needs a stroke to join (${outline.join(' ')})`);
      const t = prev ? tangent(compileStroke(prev), 'end') : tangent(compileStroke(next), 'start');
      const circle = circleFrom(pen, t, circleRotation(adj), JOIN_CIRCLE[tok] / 2);
      segments.push(...circle.segments);
      if (pendingDot) {
        dots.push({ type: 'dot', p: { x: circle.center.x, y: circle.center.y + circle.r + H_GAP } });
        pendingDot = false;
      }
      return;
    }
    const c = compileStroke(strokeAt(outline, i), pen);
    segments.push(...c.segments);
    pen = c.end;
  });
  if (pendingDot) {
    // A dot on its own is the letter h / the brief form "a, an".
    if (outline.length !== 1) throw new Error(`h must be followed by a vowel circle (${outline.join(' ')})`);
    dots.push({ type: 'dot', p: pen });
  }

  const firstCubic = segments.find((s) => s.type === 'cubic');
  // The h dot is written first, so it leads the segment list.
  return { segments: [...dots, ...segments], start: firstCubic ? firstCubic.p0 : pen, end: pen };
}

// ---------------------------------------------------------------- sentences

const movePoint = (p, dx, dy) => ({ x: p.x + dx, y: p.y + dy });
export function translateCompiled(c, dx, dy) {
  return {
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
