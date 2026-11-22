import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soundOutline, withEnding, decompose, markVowels } from '../app/js/bysound.js';
import { EXAMPLES, VOWEL_MARKS } from '../app/data/examples.js';
import { wordRows } from '../app/js/wordhelp.js';
import { taughtIn } from '../app/js/explain.js';
import { unitOfParagraph } from '../app/js/manualtext.js';

const plain = (o) => o.filter((t) => t !== 'v-dash' && t !== 'v-dot').join(' ');
const out = (w, unit = 36) => soundOutline(w, unit)?.outline.join(' ') ?? null;

// The words the Manual prints for Units 1–19, written by the rules taught by their unit, agree
// with the printed outlines. (From Unit 20 the Manual's examples are mostly the word-by-word
// choices the rules leave out, such as the r omitted in "many words", §165.)
test('the rules give the Manual’s own outlines for the words of Units 1–19', () => {
  let n = 0, ok = 0;
  const wrong = [];
  for (const e of EXAMPLES.filter((x) => x.kind === 'word')) {
    const w = e.title.split(' / ')[0];
    const u = taughtIn(e.id)?.unit;
    if (!/^[a-z]+$/.test(w) || !u || u > 19) continue;
    const g = soundOutline(w, u);
    if (!g) continue;
    n++;
    if (plain(g.outline) === plain(e.outline)) ok++;
    else wrong.push(w);
  }
  assert.ok(n > 500, `${n} words derived`);
  assert.ok(ok / n >= 0.9, `${ok} of ${n} agree; not: ${wrong.join(', ')}`);
});

test('the rules of the drill words (Speed Studies, Review Drill on Circle Joinings, checked on the plate)', () => {
  assert.equal(out('deem', 2), 'd e m');
  assert.equal(out('realm', 2), 'r e l m');
  assert.equal(out('enemy', 2), 'e n e m e');
  assert.equal(out('leaky', 2), 'l e k e');
  assert.equal(out('gaining', 2), 'g a n ing');
});

test('each rule waits for the unit that teaches it', () => {
  assert.equal(out('sun', 4), null, 's is taught in Unit 5');
  assert.equal(out('sun', 15), 's-right n', '§124: short u omitted before n');
  assert.equal(out('home', 6), null, 'the o hook is taught in Unit 7');
  assert.equal(out('tart', 7), 't a r t');
  assert.equal(out('tart', 8), 't a-rev t', '§71: the r circle');
  assert.equal(out('sudden', 18), 's-right u d n', 'before Unit 19: d and n written in full');
  assert.equal(out('sudden', 19), 's-right u ten');
  assert.match(out('tenant', 19), /^ten /, '§153: ten');
  assert.equal(out('faces', 5), 'f a s-right s-left', '§52: ses');
  assert.equal(out('nation', 6), 'n a sh', '§58: shun');
  assert.equal(out('those', 9), 'th-under o s-left', '§78: th before o');
  assert.equal(out('deliberately', 25), null, 'long words are abbreviated from Unit 25');
});

test('endings are added to a base when the pronunciations agree', () => {
  assert.deepEqual(decompose('taking'), { base: 'take', ending: 'ing', added: 'IH0 NG' });
  assert.equal(decompose('hard'), null);
  assert.deepEqual(withEnding(['t', 'a', 'k'], 'ing'), ['t', 'a', 'k', 'ing']);
  assert.deepEqual(withEnding(['n', 'e', 'd'], 'ed', 36, 'IH0 D'), ['n', 'e', 'ted']);
  assert.deepEqual(withEnding(['f', 'a', 's-right'], 's'), ['f', 'a', 's-right', 's-left']);
});

test('every rule cites paragraphs of the Manual', () => {
  for (const w of ['nation', 'tenant', 'faces', 'those', 'taking', 'prevent', 'happened', 'confer']) {
    for (const [, [a, b]] of soundOutline(w)?.rules ?? []) assert.ok(unitOfParagraph(a) && unitOfParagraph(b), `${w}: §${a}–${b}`);
  }
});

test('§8 marks: long vowels a dash, medium a dot, where the Manual prints them', () => {
  let n = 0, ok = 0;
  for (const e of EXAMPLES.filter((x) => x.kind === 'word')) {
    const w = e.title.split(' / ')[0];
    if (!Object.hasOwn(VOWEL_MARKS, w)) continue;
    n++;
    if (markVowels(w, e.outline).join(' ') === e.outline.join(' ')) ok++;
  }
  assert.ok(ok / n >= 0.95, `${ok} of ${n}`);
  const of = (text, unit, w) => wordRows(text, { unit }).find((r) => r.text === w)?.example.outline.join(' ');
  // a Unit 2 drill of isolated words (Speed Studies, Review Drill on Circle Joinings) is marked
  const drill = 'deem, meat, rare, realm, gaining, taking, raid, Harry';
  assert.equal(of(drill, 2, 'deem'), 'd v-dash e m');
  assert.equal(of(drill, 2, 'realm'), 'r v-dot e l m');
  assert.equal(of(drill, 2, 'taking'), 't v-dash a k ing');
  assert.equal(of(drill, 2, 'raid'), 'r v-dash a d', 'a printed example keeps its marks');
  assert.equal(of(drill, 2, 'Harry'), 'h a r e cap');
  // its sentences, the readings and Unit 3 on are not
  assert.equal(of('Dick will lead the airmen in the raid.', 2, 'raid'), 'r a d');
  assert.equal(of('Deem it done, Ed.', 2, 'Deem'), 'd e m');
  assert.equal(of('limb, lemon, raid, rated, aid, aided.', 3, 'raid'), 'r a d', 'Unit 3 prints no marks');
  assert.match(wordRows('He came in the raid.', { unit: 2 })[3].how, /^Written r \+ a-circle \+ d\./);
  assert.equal(markVowels('harry', ['h', 'a', 'r', 'e']).join(' '), 'h a r e', 'ă before rr is short');
});
