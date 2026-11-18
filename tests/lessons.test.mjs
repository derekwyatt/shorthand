// Tests for the tutorial lessons (data/lessons.js). Run: node --test tests/
// Every write step is an example, and assess.test.mjs checks that a perfect copy of every
// example scores ~100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, stepKey, exampleFor, isTask } from '../app/data/lessons.js';
import { EXAMPLES } from '../app/data/examples.js';
import { READINGS } from '../app/data/reading.js';
import { readingPlate } from '../app/data/plates.js';
import { splitSentences, keyItems, shuffled } from '../app/js/lessons.js';
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
      if (s.type === 'speed') {
        assert.equal(s.speed.unit, l.unit, key);
      } else if (s.type === 'reading') {
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

test('Speed Studies sections: real units, cut plates, and steps after the unit’s own', async () => {
  const { SPEED } = await import('../app/data/speed.js');
  const crops = new Set(JSON.parse(fs.readFileSync(new URL('../tools/plates.json', import.meta.url), 'utf8')).crops.map((c) => c.id));
  const seen = new Set();
  for (const s of SPEED) {
    const id = `${s.study}.${s.section}`;
    assert.ok(!seen.has(id), `duplicate Speed Study section ${id}`);
    seen.add(id);
    assert.ok(s.unit >= 1 && s.unit <= 36, `${id}: unit ${s.unit}`);
    assert.ok(Math.ceil(s.unit / 3) === s.study || s.study > 12, `${id}: Speed Study ${s.study} goes with Chapter ${s.study}, not Unit ${s.unit}`);
    assert.ok(s.title && /^pp?\. \d+/.test(s.pages), `${id}: title and pages`);
    assert.ok(s.text.length || s.figures.length, `${id}: has content`);
    for (const f of s.figures) {
      assert.ok(crops.has(f.plate), `${id}: ${f.plate} is cut by tools/plates.json`);
      assert.ok(fs.existsSync(new URL(`../app/plates/${f.plate}.png`, import.meta.url)), `${id}: ${f.plate}.png`);
      assert.ok(f.label, `${id}: figure label`);
      for (const k of f.key ?? []) assert.ok(k.trim(), `${id}: empty key line`);
    }
    const steps = LESSONS[s.unit - 1].steps;
    const at = steps.findIndex((x) => x.type === 'speed' && x.speed === s);
    assert.ok(at > 0 && steps.slice(at).every((x) => x.type === 'speed' || x.type === 'reading'), `${id}: placed after Unit ${s.unit}'s own steps`);
  }
});

test('key lines hide sentence by sentence, or word by word in a word list', () => {
  assert.deepEqual(keyItems('gale, lag; kale.'), ['gale,', 'lag;', 'kale.']);
  assert.deepEqual(keyItems('The gale made him giddy. Dick will lead.'), ['The gale made him giddy.', 'Dick will lead.']);
  assert.deepEqual(keyItems('He can go, but not today.'), ['He can go, but not today.']);
  assert.deepEqual(keyItems('of: of-the, of-it, of-our.'), ['of: of-the,', 'of-it,', 'of-our.']);
});

test('the Manual text: every unit, figures that exist, paragraph anchors in order', async () => {
  const { MANUAL_TEXT } = await import('../app/data/manual.js');
  let last = 0;
  for (let u = 1; u <= 36; u++) {
    const doc = MANUAL_TEXT[u];
    assert.ok(doc && doc.blocks.length > 3, `Unit ${u} text`);
    for (const [align, html] of doc.blocks) {
      assert.ok(align === null || align === 'center', `Unit ${u}: align ${align}`);
      assert.ok(!/<(?!\/?(?:em|strong|br|img|span)\b)/.test(html), `Unit ${u}: unexpected tag in ${html.slice(0, 60)}`);
      for (const [, src] of html.matchAll(/src="([^"]+)"/g)) assert.ok(fs.existsSync(new URL(`../app/${src}`, import.meta.url)), `Unit ${u}: ${src}`);
      for (const [, n] of html.matchAll(/id="m(\d+)"/g)) {
        assert.ok(Number(n) > last, `Unit ${u}: paragraph ${n} after ${last}`);
        last = Number(n);
      }
    }
  }
  assert.ok(last >= 247, 'paragraphs run to the end of the Manual');
});

test('reading-question choices are shuffled: the answer is not always first', () => {
  const choose = LESSONS.flatMap((l) => l.steps.filter((s) => s.type === 'choose'));
  for (const s of choose.slice(0, 5)) assert.deepEqual([...shuffled(s.choices, stepKey(s))].sort(), [...s.choices].sort());
  assert.deepEqual(shuffled(['a', 'b', 'c', 'd'], 'k', 7), shuffled(['a', 'b', 'c', 'd'], 'k', 7), 'stable for a step');
  const first = choose.filter((s) => shuffled(s.choices, stepKey(s), 12345)[0] === s.example).length;
  assert.ok(first < choose.length * 0.4, `answer first in ${first} of ${choose.length}`);
});

test('the Reference brief-form chart and pictures point at real images', async () => {
  const { BRIEF_FORMS } = await import('../app/data/briefs.js');
  assert.ok(BRIEF_FORMS.length > 300);
  for (const [words, letters, file, w, h] of BRIEF_FORMS) {
    assert.ok(words && letters && w > 0 && h > 0, words);
    assert.ok(fs.existsSync(new URL(`../app/manual/${file}`, import.meta.url)), `${words}: ${file}`);
  }
  for (const f of ['alphabet.gif', 'anphras1.gif', 'anphras2.gif']) assert.ok(fs.existsSync(new URL(`../app/manual/${f}`, import.meta.url)), f);
});
