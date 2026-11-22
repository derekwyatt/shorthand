// The Home view (#home): what Gregg shorthand is, and a short story written in it with the
// English under each line. Tapping a line writes it out.
import { EXAMPLES } from '../data/examples.js';
import { OVERVIEW, STORY } from '../data/home.js';
import { layoutWords } from './join.js';
import { bbox, renderCompiledSVG, animateStroke } from './render.js';
import { el, svgEl } from './dom.js';

const UNIT = 20;      // px per U: a little larger than the pad's, for reading
const GAP = 1.1;      // U between words
const PAD_Y = 0.6;    // U of ruled space above the tallest outline and below the rule
const LONGEST = 6;    // most words in a phrase

// Every outline the app teaches, by word ("rid / red / read" gives all three). Running text
// leaves out the §8 vowel marks ("seldom used"); the marks the outline needs stay.
const LEXICON = new Map();
for (const e of EXAMPLES) {
  if (!['word', 'brief', 'phrase'].includes(e.kind)) continue;
  const tokens = e.outline.filter((t) => t !== 'v-dash' && t !== 'v-dot');
  for (const w of e.title.toLowerCase().split(' / ')) if (!LEXICON.has(w)) LEXICON.set(w, tokens);
}

// A sentence as the outlines it is written with: the longest phrase the app teaches at each
// point, else the word; then the period. Throws on a word the app has no outline for.
export function storyWords(sentence) {
  const raws = sentence.replace(/\.$/, '').split(' ');
  const words = [];
  for (let i = 0; i < raws.length;) {
    let n = Math.min(LONGEST, raws.length - i);
    while (n > 0 && !LEXICON.has(raws.slice(i, i + n).join(' ').toLowerCase())) n--;
    if (!n) throw new Error(`no outline for "${raws[i]}" in "${sentence}"`);
    const text = raws.slice(i, i + n).join(' ');
    words.push({ text, tokens: LEXICON.get(text.toLowerCase()) });
    i += n;
  }
  words.push({ text: '.', tokens: ['period'] });
  return words;
}

// Overview text with [label](#view) links.
function linked(text) {
  const p = el('p');
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\((#[^)]+)\)/g)) {
    p.append(text.slice(last, m.index), el('a', { href: m[2], textContent: m[1] }));
    last = m.index + m[0].length;
  }
  p.append(text.slice(last));
  return p;
}

export function buildHome(container) {
  const lines = STORY.lines.map((s) => ({ text: s, words: layoutWords(storyWords(s)).map((w) => w.compiled) }));
  // One frame for every word: each sits with its base on the rule (§48, as on the pad), and
  // the frame reaches from the tallest outline to the lowest one hanging below the line.
  const top = Math.max(...lines.flatMap((l) => l.words.map((c) => bbox(c).maxY)));
  const bottom = Math.min(0, ...lines.flatMap((l) => l.words.map((c) => bbox(c).minY)));
  const height = (top - bottom + 2 * PAD_Y) * UNIT;
  const baseline = (top + PAD_Y) * UNIT;

  const storyLines = lines.map(({ text, words }) => {
    const svgs = words.map((c) => {
      const b = bbox(c);
      const width = (b.maxX - b.minX + GAP) * UNIT;
      const svg = renderCompiledSVG(c, { unit: UNIT, width, height, origin: { x: (GAP / 2 - b.minX) * UNIT, y: baseline }, strokeWidth: 2.2 });
      svg.prepend(svgEl('line', { x1: 0, x2: width, y1: baseline + 0.5, y2: baseline + 0.5, class: 'home-rule' }));
      svg.setAttribute('aria-hidden', 'true');
      return svg;
    });
    const gregg = el('div', { className: 'home-gregg', role: 'img', ariaLabel: `Gregg shorthand: ${text}`, title: 'Tap to watch it written' }, ...svgs);
    let busy = false;
    gregg.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      for (const svg of svgs) svg.style.visibility = 'hidden';
      for (const svg of svgs) {
        svg.style.visibility = '';
        await animateStroke(svg);
      }
      busy = false;
    });
    return el('li', { className: 'home-line' }, gregg, el('p', { className: 'home-english', textContent: text }));
  });

  container.replaceChildren(el('article', { className: 'home-body' },
    el('h1', { textContent: 'Gregg shorthand' }),
    ...OVERVIEW.map(linked),
    el('h2', { textContent: STORY.title }),
    el('p', { className: 'ex-caption', textContent: 'A short story in Gregg, using only the outlines and phrases this app teaches, with the English under each line. Tap a line to watch it written.' }),
    el('ol', { className: 'home-story' }, ...storyLines)));
}
