// The Reference view (#ref): the Manual's front matter, the alphabet, the brief-form chart,
// the most-used phrases and the Manual's text unit by unit, without the pad.
import { MANUAL_TEXT, FRONT_MATTER } from '../data/manual.js';
import { BRIEF_FORMS } from '../data/briefs.js';
import { renderBlocks } from './manualtext.js';
import { el, button, credit, outLink } from './dom.js';
import { AUTHOR, AUTHOR_SITE, PDF, sourceUrl } from '../data/source.js';

// The line under each section: where it came from, with a link to that page of the site.
const source = (href) => credit(`From ${AUTHOR}’s Anniversary Manual site:`, href, 'this page at greggshorthand.github.io');

const SECTIONS = [
  { id: 'beginner', title: 'A Talk with the Beginner', render: () => doc('A Talk with the Beginner', FRONT_MATTER.beginner, sourceUrl.beginner) },
  { id: 'about', title: 'About Gregg Shorthand', render: () => doc('About Gregg Shorthand', FRONT_MATTER.about, sourceUrl.about) },
  { id: 'preface', title: 'Preface', render: () => doc('Preface', FRONT_MATTER.preface, sourceUrl.preface) },
  { id: 'alphabet', title: 'The alphabet', render: () => picture('The Alphabet', ['manual/alphabet.png'], 'The Gregg alphabet: every consonant and vowel sign', sourceUrl.alphabet) },
  { id: 'briefs', title: 'Brief forms', render: briefs },
  { id: 'phrases', title: 'Most-used phrases', render: () => picture('Most-Used Anniversary Phrases', ['manual/anphras1.png', 'manual/anphras2.png'], 'Most-used phrases in shorthand', sourceUrl.phrases) },
  { id: 'units', title: 'The Manual, unit by unit', render: units },
  { id: 'thanks', title: 'Thanks', render: thanks },
];

function doc(title, blocks, href) {
  return [el('h2', { textContent: title }), el('article', { className: 'manual-text' }, ...renderBlocks(blocks)), source(href)];
}

function picture(title, srcs, alt, href) {
  return [el('h2', { textContent: title }), ...srcs.map((src) => el('img', { src, alt, className: 'ref-picture' })), source(href)];
}

// Every brief form, with a filter: type a word, or letters as the chart spells them ("a b").
function briefs() {
  const search = el('input', { type: 'search', className: 'ref-search', placeholder: 'Find a word, or letters such as “a b”', ariaLabel: 'Find a brief form' });
  const grid = el('div', { className: 'ref-briefs' });
  const count = el('div', { className: 'ex-caption' });
  const cards = BRIEF_FORMS.map(([words, letters, file, w, h]) => {
    const card = el('figure', { className: 'ref-brief' },
      el('img', { src: `manual/${file}`, alt: `Brief form for ${words}`, width: Math.round(w * 1.4), height: Math.round(h * 1.4) }),
      el('figcaption', {}, el('strong', { textContent: words }), el('span', { textContent: letters })));
    card.dataset.find = `${words} | ${letters}`.toLowerCase();
    return card;
  });
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    let n = 0;
    for (const c of cards) {
      const show = !q || c.dataset.find.includes(q);
      c.hidden = !show;
      if (show) n++;
    }
    count.textContent = `${n} of ${cards.length} brief forms`;
  };
  search.oninput = filter;
  grid.append(...cards);
  filter();
  return [el('h2', { textContent: 'Brief forms' }),
    el('p', { className: 'lesson-text', textContent: 'Every brief form of the Anniversary Manual. The letters are those the form is written with.' }),
    search, count, grid, source(sourceUrl.briefs)];
}

function units() {
  const pick = el('select', { className: 'level-select', ariaLabel: 'Unit' },
    ...Object.entries(MANUAL_TEXT).map(([u, d]) => el('option', { value: u, textContent: `Unit ${u}${d.title ? ` · ${d.title}` : ''}` })));
  const host = el('div');
  const show = () => {
    const d = MANUAL_TEXT[pick.value];
    host.replaceChildren(el('article', { className: 'manual-text' }, ...renderBlocks(d.blocks)), source(sourceUrl.unit(Number(pick.value))));
  };
  pick.onchange = show;
  show();
  return [el('h2', { textContent: 'The Manual, unit by unit' }), pick, host];
}

// A thank-you to the author of the site the Manual's text comes from.
function thanks() {
  const p = (...parts) => el('p', { className: 'lesson-text' }, ...parts);
  return [el('h2', { textContent: 'Thank you, Andrew Owen' }), el('article', { className: 'thanks' },
    p('This app could not teach from the Anniversary Manual without the work of ', outLink(AUTHOR_SITE, AUTHOR), ', whose site ',
      outLink(sourceUrl.home, 'greggshorthand.github.io'), ' keeps Gregg shorthand alive for anyone who wants to learn it.'),
    p('Every rule the lessons quote, the full text of each unit with its figures, the chart of brief forms, the most-used phrases, the keys to the reading practice, and the ',
      outLink(PDF, 'scan of the Manual'), ' the printed outlines are cut from: all of it comes from his careful transcription, typed out paragraph by paragraph and linked up so the book can be read on a screen. It is generous work, freely shared, and it is the foundation this app stands on.'),
    p('If this app helps you, please visit his site: it has much more than is here, from the earlier and later editions of Gregg to reporting notes and other languages. Each section of this app links back to the page it came from.'),
    p('Thank you, Andrew.')),
    el('p', { className: 'ex-caption', textContent: 'John Robert Gregg’s Anniversary Manual (1929) and Gregg Speed Studies (1929) are in the US public domain; the Speed Studies drills here are cut from a separate scan of that book.' })];
}

export function buildReference(root) {
  const menu = el('nav', { className: 'ref-menu', ariaLabel: 'Reference' });
  const body = el('section', { className: 'ref-body' });
  const open = (s) => {
    for (const b of menu.children) {
      b.classList.toggle('active', b.dataset.id === s.id);
      // On a phone the menu is one scrolling row: keep the open section in view.
      if (b.dataset.id === s.id) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    body.replaceChildren(...s.render());
    body.scrollTop = 0;
  };
  menu.append(...SECTIONS.map((s) => {
    const b = button(s.title, '', () => open(s));
    b.dataset.id = s.id;
    return b;
  }));
  root.replaceChildren(menu, body);
  open(SECTIONS[0]);
}
