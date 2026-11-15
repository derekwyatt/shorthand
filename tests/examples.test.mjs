// Tests for the practice levels and example content. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, LEVELS } from '../app/data/examples.js';
import { STROKE_BY_ID } from '../app/data/strokes.js';
import { compileExample } from '../app/js/join.js';

const atLevel = (n) => EXAMPLES.filter((e) => e.level === n);
const key = (e) => e.outline.join(' ');

test('six levels, every example has one, and the list is ordered by level', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), [1, 2, 3, 4, 5, 6]);
  for (const l of LEVELS) assert.ok(l.name && l.description, `level ${l.id}`);
  for (const e of EXAMPLES) assert.ok(Number.isInteger(e.level) && e.level >= 1 && e.level <= 6, e.id);
  for (let i = 1; i < EXAMPLES.length; i++) assert.ok(EXAMPLES[i - 1].level <= EXAMPLES[i].level);
});

test('level sizes and unique ids', () => {
  assert.deepEqual([1, 2, 3, 4].map((n) => atLevel(n).length), [28, 22, 34, 26]);
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

test('sentence levels follow the word count', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'sentence')) {
    const count = e.words.filter((w) => w.text !== '.').length;
    assert.equal(e.level, count <= 4 ? 5 : 6, e.title);
    assert.ok(count >= 2 && count <= 8, e.title);
    assert.match(e.title, /^[A-Z][a-z ]+\.$/);
  }
});

test('every example compiles (perfect-copy scoring is covered in assess.test.mjs)', () => {
  for (const e of EXAMPLES) assert.ok(compileExample(e), e.id);
});
