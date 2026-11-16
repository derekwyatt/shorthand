// Tests for attempt scoring and critiques (app/js/assess.js). Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXAMPLES } from '../app/data/examples.js';
import { assessAttempt, modelUnits } from '../app/js/assess.js';
import { samplePoints } from '../app/js/render.js';
import { compileOutline } from '../app/js/join.js';

const UNIT = 16; // px per U (line spacing 48 / 3)
const ex = (id) => EXAMPLES.find((e) => e.id === id);

// A "perfect" attempt: the model geometry itself, as pad strokes in px (y down).
function perfect(example, { scale = 1, ox = 100, oy = 300, transform = (p) => p } = {}) {
  const strokes = [];
  let t = 0;
  const px = (p) => ({ x: ox + p.x * UNIT * scale, y: oy - p.y * UNIT * scale, t: (t += 8) });
  for (const u of modelUnits(example)) {
    if (u.kind === 'dot') {
      const c = px(u.pos);
      strokes.push({ points: [c, { ...c, x: c.x + 0.6, t: (t += 8) }, { ...c, x: c.x + 1, y: c.y + 0.5, t: (t += 8) }] });
    } else {
      strokes.push({ points: samplePoints(u.compiled, 24).map(transform).map(px) });
    }
    t += 300;
  }
  return strokes;
}
const texts = (r) => r.critiques.map((c) => c.text).join(' | ');

test('a perfect copy of every example scores ~100 with no errors', () => {
  for (const e of EXAMPLES) {
    const r = assessAttempt(e, perfect(e), UNIT);
    const errors = r.critiques.filter((c) => c.level === 'error');
    assert.ok(r.complete, `${e.id} complete`);
    assert.equal(errors.length, 0, `${e.id}: unexpected errors: ${texts(r)}`);
    assert.ok(r.score >= 95, `${e.id}: score ${r.score} (${texts(r)})`);
  }
});

test('writing everything larger is not an error in a sentence', () => {
  const e = ex('sentence-the-men-will-have-the-key');
  const r = assessAttempt(e, perfect(e, { scale: 1.3 }), UNIT);
  assert.ok(r.score >= 90, `score ${r.score}: ${texts(r)}`);
});

test('the recorded "hate" attempt reads as "ham"', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/word-hate-1.json', import.meta.url)));
  const r = assessAttempt(ex(fx.example.id), fx.strokes, fx.strokes[0].lineSpacing / 3);
  const t = texts(r);
  assert.match(t, /reads as m, not t, so the outline says “ham”/);
  assert.match(t, /Too flat/);
  assert.match(t, /Too long/);
  assert.doesNotMatch(t, /clockwise|wrong side|Missing/, 'circle and dot were right');
  assert.equal(r.extras, 0, 'the pen bounce is ignored');
  assert.ok(r.score > 40 && r.score < 75, `score ${r.score}`);
});

test('a k curved the wrong way reads as r', () => {
  const e = ex('letter-k');
  const flip = (p) => ({ x: p.x, y: -p.y });
  const r = assessAttempt(e, perfect(e, { transform: flip }), UNIT);
  assert.match(texts(r), /reads as r, not k/);
  assert.match(texts(r), /Curves the wrong way/);
  assert.ok(r.score <= 55);
});

test('a t written downward is the wrong direction', () => {
  const e = ex('letter-t');
  const reverse = (strokes) => strokes.map((s) => ({ points: [...s.points].reverse().map((p, i) => ({ ...p, t: i * 8 })) }));
  const r = assessAttempt(e, reverse(perfect(e)), UNIT);
  assert.match(texts(r), /Wrong direction/);
});

test('a circle turned the wrong way is caught', () => {
  const e = ex('word-me');
  // Mirror top-to-bottom: the e circle now hangs above m and turns counter-clockwise.
  const r = assessAttempt(e, perfect(e, { transform: (p) => ({ x: p.x, y: -p.y }) }), UNIT);
  assert.match(texts(r), /should go clockwise; yours goes counter-clockwise/);
});

test('an a circle drawn e-sized is caught', () => {
  const e = { id: 'x', kind: 'word', title: 'may', outline: ['m', 'a'] };
  const small = { id: 'x', kind: 'word', title: 'me', outline: ['m', 'e'] };
  const strokes = perfect(small);
  const r = assessAttempt(e, strokes, UNIT);
  assert.match(texts(r), /too small: it reads as e/);
});

test('a missing h dot and a missing word are reported', () => {
  const e = ex('word-hack');
  const noDot = perfect(e).filter((s) => s.points.length > 3);
  assert.match(texts(assessAttempt(e, noDot, UNIT)), /Missing the h dot/);

  const s = ex('sentence-it-will-be-good');
  const strokes = perfect(s);
  strokes.splice(1, 1); // drop "be" ("It will" is one phrase)
  const r = assessAttempt(s, strokes, UNIT);
  assert.match(texts(r), /Missing: “be”/);
  assert.ok(r.score < 90);
});

test('a partial attempt is marked incomplete', () => {
  const s = ex('sentence-have-a-good-day');
  const r = assessAttempt(s, perfect(s).slice(0, 1), UNIT);
  assert.equal(r.complete, false);
  assert.equal(r.written, 1);
  assert.ok(r.expected >= 3);
});

test('sentences only use verified outlines and end with a period', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'sentence')) {
    assert.equal(e.words[e.words.length - 1].tokens[0], 'period', `${e.id} ends with the period mark`);
    for (const w of e.words) compileOutline(w.tokens);
  }
});

test('the dot letter (h / brief form "a") is scored on its own', () => {
  const e = ex('letter-h');
  const none = assessAttempt(e, [], UNIT);
  assert.equal(none.strokes, 0);
  assert.equal(none.complete, false);

  const dot = assessAttempt(e, perfect(e), UNIT);
  assert.ok(dot.complete && dot.score === 100, `dot scores 100 (${dot.score}: ${texts(dot)})`);
  assert.deepEqual(dot.check.map((c) => [c.kind, c.ok]), [['dot', true]]);

  const lineInstead = assessAttempt(e, perfect(ex('letter-t')), UNIT);
  assert.ok(lineInstead.complete, 'a stroke instead of the dot still finishes the attempt');
  assert.match(texts(lineInstead), /Missing the dot/);
  assert.ok(lineInstead.score < 20);
});

test('an h word is finished only when both the outline and its dot are written, in either order', () => {
  const e = ex('word-hate');
  const [dot, outline] = perfect(e);
  const outlineOnly = assessAttempt(e, [outline], UNIT);
  assert.equal(outlineOnly.complete, false);
  assert.equal(outlineOnly.written, 1);
  assert.equal(outlineOnly.expected, 2);
  const dotOnly = assessAttempt(e, [dot], UNIT);
  assert.equal(dotOnly.complete, false, 'a lone dot is the h, not the start of the outline');
  assert.equal(dotOnly.units.find((u) => u.kind === 'dot').user !== null, true);
  const dotLast = assessAttempt(e, [outline, { points: dot.points.map((p) => ({ ...p, t: p.t + 5000 })) }], UNIT);
  assert.ok(dotLast.complete && dotLast.score >= 95, `dot written last: ${dotLast.score} ${texts(dotLast)}`);
});

test('the check pattern is green for a correct copy and red where it is wrong', () => {
  const good = assessAttempt(ex('word-hate'), perfect(ex('word-hate')), UNIT);
  assert.deepEqual(good.check.map((c) => [c.kind, c.ok]).sort(), [['dot', true], ['outline', true]]);
  const o = good.check.find((c) => c.kind === 'outline');
  const u = good.units.find((x) => x.kind === 'outline').user.pts[0];
  assert.ok(Math.hypot(o.segments[0].p0.x - u.x, o.segments[0].p0.y - u.y) < 1e-9, 'pattern starts where the learner started');

  const fx = JSON.parse(readFileSync(new URL('./fixtures/word-hate-1.json', import.meta.url)));
  const bad = assessAttempt(ex(fx.example.id), fx.strokes, fx.strokes[0].lineSpacing / 3);
  assert.equal(bad.check.find((c) => c.kind === 'outline').ok, false, 'the flat, long t is red');
  assert.equal(bad.check.find((c) => c.kind === 'dot').ok, true, 'the h dot is green');

  const s = ex('sentence-have-a-good-day');
  const strokes = perfect(s);
  const missingDot = strokes.filter((st, i) => i !== 1); // drop the "a" dot
  const r = assessAttempt(s, missingDot, UNIT);
  assert.equal(r.complete, false, 'the sentence still owes its dot');
});

test('the dot letter (h, brief form "a") is scored on its own', () => {
  const e = ex('letter-h');
  const none = assessAttempt(e, [], UNIT);
  assert.equal(none.strokes, 0);
  assert.equal(none.complete, false);

  const dot = assessAttempt(e, perfect(e), UNIT);
  assert.ok(dot.complete && dot.score === 100, `dot scores 100 (${dot.score}: ${texts(dot)})`);
  assert.equal(dot.written, 1);
  assert.deepEqual(dot.check.map((c) => [c.kind, c.ok]), [['dot', true]]);

  const line = assessAttempt(e, perfect(ex('letter-n')), UNIT);
  assert.ok(line.complete, 'a stroke instead of the dot is still a finished attempt');
  assert.match(texts(line), /Missing the dot/);
  assert.ok(line.score < 20);
});

test('an h word is not finished until its dot is written, in either order', () => {
  const e = ex('word-hate');
  const strokes = perfect(e); // dot first, then the outline
  const outlineOnly = assessAttempt(e, [strokes[1]], UNIT);
  assert.equal(outlineOnly.complete, false);
  assert.equal(outlineOnly.written, 1);
  assert.equal(outlineOnly.expected, 2);
  const dotLast = assessAttempt(e, [strokes[1], { points: strokes[0].points.map((p) => ({ ...p, t: p.t + 5000 })) }], UNIT);
  assert.ok(dotLast.complete && dotLast.score >= 95, `dot written last is fine (${dotLast.score}: ${texts(dotLast)})`);
});

test('the check pattern is green when right and red when wrong, anchored on the learner', () => {
  const good = assessAttempt(ex('word-hate'), perfect(ex('word-hate')), UNIT);
  assert.deepEqual(good.check.map((c) => [c.kind, c.ok]).sort(), [['dot', true], ['outline', true]]);
  const fx = JSON.parse(readFileSync(new URL('./fixtures/word-hate-1.json', import.meta.url)));
  const bad = assessAttempt(ex('word-hate'), fx.strokes, fx.strokes[0].lineSpacing / 3);
  const outline = bad.check.find((c) => c.kind === 'outline');
  assert.equal(outline.ok, false, 'the "ham"-shaped attempt gets a red pattern');
  // The pattern starts exactly where the learner started the outline.
  const userStart = bad.units.find((u) => u.kind === 'outline').user.pts[0];
  const p0 = outline.segments.find((s) => s.type === 'cubic').p0;
  assert.ok(Math.hypot(p0.x - userStart.x, p0.y - userStart.y) < 1e-9);
  // In a sentence, the "a" dot gets its own check mark.
  const s = ex('sentence-have-a-good-day');
  const r = assessAttempt(s, perfect(s), UNIT);
  assert.equal(r.check.filter((c) => c.kind === 'dot').length, 1);
  assert.ok(r.check.every((c) => c.ok));
});

test('a verdict never changes as more of the example is written', () => {
  for (const s of [1, 1.4]) {
    for (const e of EXAMPLES.filter((x) => x.kind !== 'letter')) {
      const all = perfect(e, { scale: s });
      const seen = new Map();
      for (let k = 1; k <= all.length; k++) {
        const r = assessAttempt(e, all.slice(0, k), UNIT, { scale: s });
        r.check.forEach((c, i) => {
          const key = `${c.kind}${i}`;
          if (seen.has(key)) assert.equal(c.ok, seen.get(key), `${e.id} at ${s}x: part ${i} flipped after ${k} strokes`);
          seen.set(key, c.ok);
        });
      }
    }
  }
});

test('a partial sentence lines up with its first words, not a look-alike further on', () => {
  const e = ex('sentence-it-will-be-good');
  const r = assessAttempt(e, perfect(e, { scale: 1.4 }).slice(0, 2), UNIT, { scale: 1.4 });
  const written = r.units.filter((u) => u.kind === 'outline' && u.user).map((u) => u.word);
  assert.deepEqual(written, ['It will', 'be']);
  assert.ok(r.check.every((c) => c.ok), texts(r));
});

test('a phrase (Manual §4) is one joined outline, scored as a whole', () => {
  const e = ex('sentence-it-will-be-good');
  assert.deepEqual(e.words.map((w) => w.text), ['It will', 'be', 'good', '.']);
  assert.deepEqual(e.words[0].tokens, ['t', 'l']);
  const r = assessAttempt(e, perfect(e), UNIT);
  assert.ok(r.score >= 90, texts(r));
  // Writing the two words apart, as before, is not the phrase.
  const apart = ex('sentence-it-is-good');
  assert.equal(apart.words[0].text, 'It');
});

test('a long stroke written too short is told how big it is against the ruling', () => {
  const e = ex('letter-b');
  const r = assessAttempt(e, perfect(e, { scale: 0.55 }), UNIT);
  assert.match(texts(r), /b is a long stroke, about 0\.9 of a line space tall: start it just below the line above and finish on the line/);
});

test('the learned writer size is capped by the ruling: the tallest strokes fit in a line space', async () => {
  const { WRITER_MAX } = await import('../app/js/writer.js');
  const { U_PER_LINE, STROKES } = await import('../app/data/strokes.js');
  const { compileOutline } = await import('../app/js/join.js');
  const { bbox } = await import('../app/js/render.js');
  const tallest = Math.max(...STROKES.filter((s) => s.size === 'long').map((s) => { const b = bbox(compileOutline([s.id])); return (b.maxY - b.minY) / U_PER_LINE; }));
  assert.ok(tallest * WRITER_MAX <= 1.06, `tallest stroke at the largest writer size: ${(tallest * WRITER_MAX).toFixed(2)} line spaces`);

  const e = ex('sentence-it-will-be-good');
  const big = assessAttempt(e, perfect(e, { scale: 1.5 }), UNIT, { scale: WRITER_MAX });
  assert.match(texts(big), /too big for this ruling/);
});

test('near a letter boundary the intended letter gets the benefit of the doubt', async () => {
  const { PASS_SCORE } = await import('../app/js/assess.js');
  const e = ex('word-aim');
  const rot = (deg) => (p) => ({ x: p.x * Math.cos(deg / 57.3) - p.y * Math.sin(deg / 57.3), y: p.x * Math.sin(deg / 57.3) + p.y * Math.cos(deg / 57.3) });
  // m slanted up 18°: a slanted m (warned), not d.
  const slanted = assessAttempt(e, perfect(e, { transform: rot(18) }), UNIT);
  assert.ok(slanted.score >= PASS_SCORE && !/reads as/.test(texts(slanted)), `${slanted.score}: ${texts(slanted)}`);
  // Written a bit small for the learned size: a short m, not n; the a circle is still a.
  const small = assessAttempt(e, perfect(e, { scale: 0.75 }), UNIT, { scale: 1.2 });
  assert.ok(small.score >= PASS_SCORE && !/reads as/.test(texts(small)), `${small.score}: ${texts(small)}`);
  // Clearly n-sized, it does read as n.
  assert.match(texts(assessAttempt(e, perfect(e, { scale: 0.5 }), UNIT, { scale: 1.2 })), /reads as n/);
});
