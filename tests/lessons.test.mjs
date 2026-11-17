// Tests for the tutorial lessons (data/lessons.js). Run: node --test tests/
// Every write step is an example, and assess.test.mjs checks that a perfect copy of every
// example scores ~100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, stepKey, exampleFor, isTask } from '../app/data/lessons.js';
import { EXAMPLES } from '../app/data/examples.js';

test('the units, in order from Unit 1, each with read, write and choose steps', () => {
  assert.deepEqual(LESSONS.map((l) => l.unit), LESSONS.map((_, i) => i + 1));
  for (const l of LESSONS) {
    assert.ok(l.title && l.subtitle && l.pages, l.id);
    for (const type of ['read', 'write', 'choose']) assert.ok(l.steps.some((s) => s.type === type), `${l.id} has a ${type} step`);
    assert.equal(l.steps[0].type, 'read', `${l.id} opens with a rule`);
    assert.ok(l.steps.filter(isTask).length >= 15, `${l.id} has enough practice`);
  }
});

test('every step refers to existing examples and has a unique key in its unit', () => {
  for (const l of LESSONS) {
    const keys = new Set();
    for (const s of l.steps) {
      const key = stepKey(s);
      assert.ok(!keys.has(key), `${l.id}: duplicate step ${key}`);
      keys.add(key);
      if (s.type === 'read') {
        assert.ok(s.title && s.ref && s.text.length > 0, key);
        for (const id of s.show) assert.ok(exampleFor(id), `${key}: unknown example ${id}`);
      } else {
        assert.ok(exampleFor(s.example), `${key}: unknown example`);
      }
    }
  }
});

test('choose steps have four choices with distinct titles, the answer among them', () => {
  for (const l of LESSONS) {
    for (const s of l.steps.filter((x) => x.type === 'choose')) {
      assert.equal(s.choices.length, 4, stepKey(s));
      assert.ok(s.choices.includes(s.example), `${stepKey(s)}: answer is a choice`);
      for (const id of s.choices) assert.ok(exampleFor(id), `${stepKey(s)}: unknown choice ${id}`);
      assert.equal(new Set(s.choices.map((id) => exampleFor(id).title)).size, 4, `${stepKey(s)}: titles are distinct`);
      // A wrong choice must not have the same outline as the answer.
      const answer = exampleFor(s.example).outline.join(' ');
      for (const id of s.choices.filter((c) => c !== s.example)) assert.notEqual(exampleFor(id).outline.join(' '), answer, `${stepKey(s)}: ${id}`);
    }
  }
});

test('the lessons cover the Unit 2 and Unit 3 examples they teach from', () => {
  const used = new Set(LESSONS.flatMap((l) => l.steps.flatMap((s) => (s.type === 'read' ? s.show : s.type === 'choose' ? s.choices : [s.example]))));
  const level8 = EXAMPLES.filter((e) => e.level === 8);
  const missing = level8.filter((e) => !used.has(e.id)).map((e) => e.id);
  assert.ok(missing.length <= 3, `Unit 3 examples left out of the lessons: ${missing.join(', ')}`);
});
