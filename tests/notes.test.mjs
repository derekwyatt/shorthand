import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOKEN_NOTES, JOIN_NOTES, CIRCLE_NOTES, KIND_NOTES } from '../app/data/notes.js';
import { EXAMPLES } from '../app/data/examples.js';
import { LESSONS } from '../app/data/lessons.js';
import { unitOfParagraph } from '../app/js/manualtext.js';
import { joiningNotes, partNotes, taughtIn } from '../app/js/explain.js';

const tokensOf = (e) => e.outline ?? e.words?.flatMap((w) => w.tokens) ?? [];

test('every token of every outline has a study note', () => {
  const all = new Set(EXAMPLES.flatMap(tokensOf));
  const missing = [...all].filter((t) => !TOKEN_NOTES[t]);
  assert.deepEqual(missing, []);
});

test('every note cites paragraphs of the Manual that exist, in order', () => {
  const ranges = [
    ...Object.values(TOKEN_NOTES).map((n) => n[2]),
    ...JOIN_NOTES.map((n) => n[2]),
    ...Object.values(CIRCLE_NOTES).map((n) => n[1]),
    ...Object.values(KIND_NOTES).map((n) => n[2]),
  ];
  for (const [a, b] of ranges) {
    assert.ok(unitOfParagraph(a), `§${a} is a paragraph of the Manual`);
    assert.ok(unitOfParagraph(b), `§${b} is a paragraph of the Manual`);
    assert.ok(a <= b, `§${a}–${b} runs forward`);
  }
});

test('the joining notes name the circle rule the outline uses', () => {
  const texts = (tokens) => joiningNotes(tokens).map(([, [a]]) => a);
  assert.deepEqual(texts(['a', 'k']), [11], 'ache: a circle on a single curve (§11)');
  assert.deepEqual(texts(['a', 'm']), [12], 'aim: a circle on a single straight stroke (§12)');
  assert.deepEqual(texts(['m', 'a', 'k']), [14], 'make: a circle between strokes (§14–18)');
  assert.deepEqual(texts(['k', 'r', 'e', 'm']), [19, 14], 'cream: kr (§19), then the circle between r and m');
  assert.deepEqual(texts(['p', 'l', 'a']), [37, 11], 'play: pl (§37), then the circle at the end of the curve');
  assert.deepEqual(texts(['n']), []);
});

test('the parts are listed once each, in writing order', () => {
  assert.deepEqual(partNotes(['d', 'e', 'd']).map((n) => n[0]), ['d', 'The small circle (e)']);
});

test('an example is placed in the unit whose lessons first use it', () => {
  assert.equal(taughtIn('word-ache').unit, 1);
  const usedIn = (id) => LESSONS.filter((l) => l.steps.some((s) => s.example === id || s.show?.includes(id))).map((l) => l.unit);
  for (const l of LESSONS) {
    for (const s of l.steps.filter((x) => x.type === 'write')) assert.equal(taughtIn(s.example).unit, usedIn(s.example)[0], s.example);
  }
});
