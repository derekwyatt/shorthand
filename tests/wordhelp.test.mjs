import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordRows } from '../app/js/wordhelp.js';
import { READINGS } from '../app/data/reading.js';
import { unitOfParagraph } from '../app/js/manualtext.js';

const row = (rows, text) => rows.find((r) => r.text.toLowerCase() === text.toLowerCase());

test('each word or phrase gets one row, in order of first use', () => {
  const rows = wordRows('It will go well. It will go.');
  assert.deepEqual(rows.map((r) => r.text), ['It will', 'go', 'well']);
});

test('the rows say how each word is written, from what the app can stand behind', () => {
  const rows = wordRows('Dear Sir: I hear that Henry Hale is going to the meeting at Helena with Ray. Yours truly,', { unit: 2 });
  assert.equal(row(rows, 'Dear Sir').kind, 'abbr');
  assert.match(row(rows, 'Dear Sir').how, /§24/);
  assert.equal(row(rows, 'Yours truly').kind, 'abbr');
  assert.equal(row(rows, 'going').kind, 'built');
  assert.match(row(rows, 'going').how, /“go” \(g\) \+ the ing dot \(§3\)/);
  assert.equal(row(rows, 'Hale').kind, 'name', 'a capital inside a sentence is a name');
  assert.equal(row(rows, 'Helena').kind, 'name');
  assert.equal(row(rows, 'ray').kind, 'example', 'a name the app draws keeps its outline');
  assert.equal(row(rows, 'that').kind, 'chart');
  assert.match(row(rows, 'that').how, /§23/);
  assert.equal(row(rows, 'is').kind, 'example');
  assert.match(row(rows, 'is').how, /brief form \(§34\)/i);
});

test('a later unit’s phrase is not offered for an earlier text; a later outline is flagged', () => {
  const early = wordRows('I will meet you at the train. Ready to meet him.', { unit: 2 });
  assert.ok(!row(early, 'to meet'), 'the Unit 19 phrase “to meet” is not used in Unit 2');
  const delay = row(wordRows('Without delay.', { unit: 2 }), 'delay');
  assert.match(delay.how, /teaches this form in Unit 18/);
  assert.doesNotMatch(row(wordRows('Without delay.', { unit: 20 }), 'delay').how, /teaches this form/);
});

test('every reading has a row per word, and every § a row cites is a paragraph of the Manual', () => {
  for (const r of READINGS) {
    const rows = wordRows(r.passages.flatMap((p) => p.text), { unit: r.unit });
    assert.ok(rows.length > 10, `Unit ${r.unit}`);
    for (const x of rows) {
      for (const [a, b] of [...x.refs, ...(x.base?.refs ?? [])]) assert.ok(unitOfParagraph(a) && unitOfParagraph(b), `§${a}–${b} (${x.text})`);
      assert.ok(x.how.length > 10, x.text);
    }
  }
});
