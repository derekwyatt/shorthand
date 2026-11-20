import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORY, OVERVIEW } from '../app/data/home.js';
import { storyWords } from '../app/js/home.js';
import { compileOutline } from '../app/js/join.js';

test('the story is eight sentences, each written only with outlines the app teaches', () => {
  assert.equal(STORY.lines.length, 8);
  for (const line of STORY.lines) {
    assert.match(line, /^[A-Z][^.]*\.$/, line);
    const words = storyWords(line);
    assert.equal(words.at(-1).text, '.');
    // Every word is covered, in order, and every outline compiles.
    assert.equal(words.slice(0, -1).map((w) => w.text).join(' '), line.slice(0, -1));
    for (const w of words) assert.ok(compileOutline(w.tokens).segments.length, `${w.text} in "${line}"`);
    // Running text leaves out the optional §8 vowel marks.
    for (const w of words) assert.ok(!w.tokens.includes('v-dash') && !w.tokens.includes('v-dot'), w.text);
  }
});

test('the Manual\'s phrases are joined, and an unknown word is refused', () => {
  assert.deepEqual(storyWords('I am sure she will go far.').map((w) => w.text), ['I am sure', 'she', 'will', 'go', 'far', '.']);
  assert.deepEqual(storyWords('In a week or two she could write fast.')[0].text, 'In a week or two');
  assert.throws(() => storyWords('The xylophone is good.'), /no outline for "xylophone"/);
});

test('the overview is two paragraphs whose links go to views of the app', () => {
  assert.equal(OVERVIEW.length, 2);
  for (const href of OVERVIEW.join(' ').matchAll(/\]\((#[^)]+)\)/g)) assert.match(href[1], /^#(learn|pad|quiz|strokes|ref)(\/\w+)?$/);
});
