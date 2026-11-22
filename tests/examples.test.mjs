// Tests for the practice levels and example content. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, LEVELS, VOWEL_MARKS, withVowelMarks } from '../app/data/examples.js';
import { STROKE_BY_ID } from '../app/data/strokes.js';
import { compileExample } from '../app/js/join.js';
import { bbox } from '../app/js/render.js';

const atLevel = (n) => EXAMPLES.filter((e) => e.level === n);
const key = (e) => e.outline.join(' ');

test('levels run on without gaps, one per manual unit from Unit 2, every example has one, ordered', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), LEVELS.map((_, i) => i + 1));
  for (const l of LEVELS) assert.ok(l.name && l.description, `level ${l.id}`);
  for (const l of LEVELS.filter((x) => x.unit)) assert.equal(l.id, l.unit + 5, `level ${l.id} is Unit ${l.unit}`);
  const ids = new Set(LEVELS.map((l) => l.id));
  for (const e of EXAMPLES) assert.ok(ids.has(e.level), e.id);
  for (let i = 1; i < EXAMPLES.length; i++) assert.ok(EXAMPLES[i - 1].level <= EXAMPLES[i].level);
});

test('level sizes and unique ids', () => {
  assert.deepEqual([1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41].map((n) => atLevel(n).length), [30, 22, 33, 26, 65, 50, 80, 113, 24, 84, 46, 72, 65, 68, 46, 75, 17, 57, 60, 29, 27, 56, 51, 24, 44, 24, 10, 53, 23, 19, 68, 32, 17, 60, 7, 15, 15, 8, 13]);
  assert.ok(atLevel(5).length >= 30);
  assert.ok(atLevel(6).length >= 30);
  assert.equal(new Set(EXAMPLES.map((e) => e.id)).size, EXAMPLES.length);
});

test('brief-form examples match the stroke table', () => {
  for (const e of atLevel(2)) {
    assert.equal(e.kind, 'brief');
    assert.equal(e.id, `brief-${e.outline[0]}`);
    assert.equal(e.title, STROKE_BY_ID[e.outline[0]].briefForms.join(' / '));
  }
});

test('circle-word outlines are unique and never equal a brief form', () => {
  const seen = new Set();
  const briefs = new Set(atLevel(2).map(key));
  for (const e of [...atLevel(3), ...atLevel(4)]) {
    assert.ok(!seen.has(key(e)), `duplicate outline ${e.id}`);
    seen.add(key(e));
    assert.ok(!briefs.has(key(e)), `${e.id} equals a brief form`);
  }
});

test('Unit 2 and Unit 3 examples cite a manual page and have unique outlines in their level', () => {
  // p. 14 prints the brief form were as p. 13 prints her (e + r); p. 13 prints had as add
  const SAME = new Set(['brief-were', 'word-had']);
  for (const n of [7, 8]) {
    const seen = new Map();
    for (const e of atLevel(n)) {
      assert.match(e.source, /^Gregg Shorthand Manual \(1929\), p\. \d+$/, e.id);
      assert.ok(['word', 'brief'].includes(e.kind), e.id);
      assert.ok(!seen.has(key(e)) || SAME.has(e.id), `${e.id} has the outline of ${seen.get(key(e))}`);
      seen.set(key(e), e.id);
    }
  }
  // Unit 3 brief forms (§29) are their own kind of example.
  assert.deepEqual(atLevel(8).filter((e) => e.kind === 'brief').map((e) => e.title),
    ['when', 'any', 'were', 'where / aware', 'my', 'could', 'come', 'little', 'country']);
});

test('sentence levels follow the word count', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'sentence')) {
    const count = e.title.split(' ').length; // a joined phrase is still two words
    assert.equal(e.level, count <= 4 ? 5 : 6, e.title);
    assert.ok(count >= 2 && count <= 8, e.title);
    assert.match(e.title, /^[A-Z][a-z ]+\.$/);
  }
});

test('every example compiles (perfect-copy scoring is covered in assess.test.mjs)', () => {
  for (const e of EXAMPLES) assert.ok(compileExample(e), e.id);
});

test('§8 vowel marks: only on the Unit 1 and 2 words that print them, each just before its circle', () => {
  for (const [word, signs] of Object.entries(VOWEL_MARKS)) {
    const e = EXAMPLES.find((x) => x.id === `word-${word}`);
    assert.ok(e, word);
    assert.ok(e.level <= 8, `${word} is in Unit 1 or 2 (level ${e.level})`);
    assert.match(signs, /^[-. ]+$/, word);
    const marks = e.outline.filter((t) => t === 'v-dash' || t === 'v-dot');
    assert.equal(marks.length, signs.replace(/ /g, '').length, word);
    e.outline.forEach((t, i) => { if (t.startsWith('v-')) assert.match(e.outline[i + 1], /^[ae]$/, `${word}: a mark goes before its circle`); });
  }
  assert.deepEqual(withVowelMarks('headache', ['h', 'e', 'd', 'a', 'k']), ['h', 'v-dot', 'e', 'd', 'v-dash', 'a', 'k']);
  assert.deepEqual(withVowelMarks('constructor', ['k']), ['k'], 'words without marks are unchanged');
  assert.throws(() => withVowelMarks('gate', ['g', 't']), /1 signs for 0 circles/);
  for (const e of EXAMPLES.filter((x) => x.level > 8)) assert.ok(!e.outline.some((t) => t.startsWith('v-')), e.id);
});

test('a vowel mark sits just under its circle: the dot under its middle, the dash a little left, rising', () => {
  for (const [word, mark] of [['calm', 'v-dot'], ['gate', 'v-dash']]) {
    const c = compileExample(EXAMPLES.find((x) => x.id === `word-${word}`));
    const m = c.segments.find((s) => s.mark === mark);
    const circle = bbox({ segments: c.segments.filter((s, k) => s.type === 'cubic' && c.tokens[c.tokenOf[k]] === 'a') });
    assert.ok(m.p.y < circle.minY && m.p.y > circle.minY - 0.45, `${word}: just under the circle`);
    assert.ok(m.p.x > circle.minX - 0.1 && m.p.x < circle.maxX, `${word}: under the circle`);
    if (mark === 'v-dash') assert.ok(m.dash > 0 && m.angle > 45 && m.angle < 80, 'a short rising dash');
  }
});
