// Tests for the practice levels and example content. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, LEVELS } from '../app/data/examples.js';
import { STROKE_BY_ID } from '../app/data/strokes.js';
import { compileExample } from '../app/js/join.js';

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
  assert.deepEqual([1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38].map((n) => atLevel(n).length), [30, 22, 33, 26, 61, 44, 80, 113, 24, 84, 46, 72, 65, 68, 46, 75, 17, 57, 60, 29, 27, 56, 51, 24, 44, 24, 10, 53, 23, 19, 68, 32, 17, 60, 7, 15]);
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
  for (const n of [7, 8]) {
    const seen = new Map();
    for (const e of atLevel(n)) {
      assert.match(e.source, /^Gregg Shorthand Manual \(1929\), p\. \d+$/, e.id);
      assert.ok(['word', 'brief'].includes(e.kind), e.id);
      assert.ok(!seen.has(key(e)), `${e.id} has the outline of ${seen.get(key(e))}`);
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
