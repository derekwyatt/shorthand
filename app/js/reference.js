// The Reference view (#ref): the Manual's front matter, the alphabet, the brief-form chart,
// the most-used phrases and the Manual's text unit by unit, without the pad.
import { MANUAL_TEXT, FRONT_MATTER } from '../data/manual.js';
import { BRIEF_FORMS } from '../data/briefs.js';
import { renderBlocks } from './manualtext.js';

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const SOURCE = 'From J. Andrew Owen’s Anniversary Manual site, greggshorthand.github.io.';

const SECTIONS = [
  { id: 'beginner', title: 'A Talk with the Beginner', render: () => doc('A Talk with the Beginner', FRONT_MATTER.beginner) },
  { id: 'about', title: 'About Gregg Shorthand', render: () => doc('About Gregg Shorthand', FRONT_MATTER.about) },
  { id: 'preface', title: 'Preface', render: () => doc('Preface', FRONT_MATTER.preface) },
  { id: 'alphabet', title: 'The alphabet', render: () => picture('The Alphabet', ['manual/alphabet.gif'], 'The Gregg alphabet: every consonant and vowel sign') },
  { id: 'briefs', title: 'Brief forms', render: briefs },
  { id: 'phrases', title: 'Most-used phrases', render: () => picture('Most-Used Anniversary Phrases', ['manual/anphras1.gif', 'manual/anphras2.gif'], 'Most-used phrases in shorthand') },
  { id: 'units', title: 'The Manual, unit by unit', render: units },
];

function doc(title, blocks) {
  return [el('h2', { textContent: title }), el('article', { className: 'manual-text' }, ...renderBlocks(blocks)), el('p', { className: 'ex-caption', textContent: SOURCE })];
}

function picture(title, srcs, alt) {
  return [el('h2', { textContent: title }), ...srcs.map((src) => el('img', { src, alt, className: 'ref-picture' })), el('p', { className: 'ex-caption', textContent: SOURCE })];
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
    search, count, grid, el('p', { className: 'ex-caption', textContent: SOURCE })];
}

function units() {
  const pick = el('select', { className: 'level-select', ariaLabel: 'Unit' },
    ...Object.entries(MANUAL_TEXT).map(([u, d]) => el('option', { value: u, textContent: `Unit ${u}${d.title ? ` · ${d.title}` : ''}` })));
  const host = el('div');
  const show = () => {
    const d = MANUAL_TEXT[pick.value];
    host.replaceChildren(el('article', { className: 'manual-text' }, ...renderBlocks(d.blocks)));
  };
  pick.onchange = show;
  show();
  return [el('h2', { textContent: 'The Manual, unit by unit' }), pick, host,
    el('p', { className: 'ex-caption', textContent: `The Anniversary Manual (1929). ${SOURCE}` })];
}

export function buildReference(root) {
  const menu = el('nav', { className: 'ref-menu', ariaLabel: 'Reference' });
  const body = el('section', { className: 'ref-body' });
  const open = (s) => {
    for (const b of menu.children) b.classList.toggle('active', b.dataset.id === s.id);
    body.replaceChildren(...s.render());
    body.scrollTop = 0;
  };
  menu.append(...SECTIONS.map((s) => {
    const b = el('button', { type: 'button', textContent: s.title });
    b.dataset.id = s.id;
    b.onclick = () => open(s);
    return b;
  }));
  root.replaceChildren(menu, body);
  open(SECTIONS[0]);
}
