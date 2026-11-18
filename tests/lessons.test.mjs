// Tests for the tutorial lessons (data/lessons.js). Run: node --test tests/
// Every write step is an example, and assess.test.mjs checks that a perfect copy of every
// example scores ~100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, stepKey, exampleFor, isTask } from '../app/data/lessons.js';
import { EXAMPLES } from '../app/data/examples.js';
import { READINGS } from '../app/data/reading.js';
import { readingPlate } from '../app/data/plates.js';
import { splitSentences } from '../app/js/lessons.js';
import fs from 'node:fs';

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
      if (s.type === 'reading') {
        assert.equal(s.reading.unit, l.unit, key);
        assert.equal(s, l.steps.at(-1), `${key} closes the unit`);
      } else if (s.type === 'read') {
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

test('every unit closes with its Reading and Dictation Practice page and key', () => {
  assert.deepEqual(READINGS.map((r) => r.unit), LESSONS.map((l) => l.unit));
  const crops = new Set(JSON.parse(fs.readFileSync(new URL('../tools/plates.json', import.meta.url), 'utf8')).crops.map((c) => c.id));
  for (const r of READINGS) {
    assert.equal(LESSONS[r.unit - 1].steps.at(-1).type, 'reading', `Unit ${r.unit}`);
    assert.ok(Number.isInteger(r.section) && /^pp?\. \d+/.test(r.pages), `Unit ${r.unit}: section and pages`);
    for (const id of r.plates) {
      assert.ok(crops.has(id), `Unit ${r.unit}: ${id} is cut by tools/plates.json`);
      assert.ok(fs.existsSync(new URL(`../app/${readingPlate(id).src}`, import.meta.url)), `Unit ${r.unit}: ${id}.png`);
    }
    assert.ok(r.passages.length > 0, `Unit ${r.unit}: passages`);
    for (const p of r.passages) {
      assert.ok(p.words > 0 && p.text.every((x) => x.trim()), `Unit ${r.unit}: passage`);
      // The key's own word count is close to the text's (figures, initials and hyphens differ).
      const n = p.text.join(' ').split(/\s+/).length;
      assert.ok(Math.abs(n - p.words) <= p.words * 0.12 + 3, `Unit ${r.unit}: ${n} words in the key, ${p.words} counted`);
    }
  }
});

test('key paragraphs split into sentences, not at titles or initials', () => {
  assert.deepEqual(splitSentences('Dear Mr. Ames: I am here. Are you? Yes! J. A. Smith came.'), ['Dear Mr. Ames: I am here.', 'Are you?', 'Yes!', 'J. A. Smith came.']);
  assert.deepEqual(splitSentences('One. Two'), ['One.', 'Two']);
});
