// Renders blocks of the Manual's text (data/manual.js) as paragraphs.
// Blocks are [align, html] with only em, strong, br, img and anchor spans: static content
// from this repository, so it is set as HTML.
import { el, button, credit } from './dom.js';
import { MANUAL_TEXT } from '../data/manual.js';
import { LESSONS } from '../data/lessons.js';
import { AUTHOR, sourceUrl } from '../data/source.js';

// The unit whose text holds the Manual's paragraph n.
const PARA_UNIT = new Map(Object.entries(MANUAL_TEXT).flatMap(([u, d]) => d.blocks.flatMap(([, html]) => [...html.matchAll(/id="m(\d+)"/g)].map((m) => [Number(m[1]), Number(u)]))));
export const unitOfParagraph = (n) => PARA_UNIT.get(n) ?? null;

export function renderBlocks(blocks) {
  return blocks.map(([align, html]) => {
    const p = el('p', { className: align === 'center' ? 'center' : '', innerHTML: html });
    // The site's figures are small: show them 1.4 times as large (still no wider than the text).
    for (const img of p.querySelectorAll('img[width]')) {
      img.width = Math.round(img.width * 1.4);
      img.removeAttribute('height');
    }
    return p;
  });
}

// The Manual's own text of a unit, with its figures, full screen; scrolled to paragraph `para`.
// Its last line links to the same unit on greggshorthand.github.io.
export function openManual(unit, para = null) {
  const doc = MANUAL_TEXT[unit];
  if (!doc) return;
  const l = LESSONS.find((x) => x.unit === unit);
  const text = el('article', { className: 'manual-text' },
    el('h2', { textContent: `Unit ${unit}${doc.title ? `: ${doc.title}` : ''}` }),
    ...renderBlocks(doc.blocks),
    credit(`The Anniversary Manual (1929), as transcribed by ${AUTHOR}:`, sourceUrl.unit(unit, para), `Unit ${unit} at greggshorthand.github.io`));
  const close = () => shade.remove();
  const shade = el('div', { className: 'reader manual-reader', role: 'dialog', ariaLabel: `Manual, Unit ${unit}` },
    el('div', { className: 'reader-bar' },
      el('strong', { textContent: `Manual · Unit ${unit} · ${l?.pages ?? ''}` }),
      ...[unit - 1, unit + 1].filter((u) => MANUAL_TEXT[u]).map((u) => button(u < unit ? `◀ Unit ${u}` : `Unit ${u} ▶`, 'quiz-btn key-btn', () => { close(); openManual(u); })),
      button('Close ✕', 'quiz-btn key-btn', close)),
    el('div', { className: 'reader-key manual-scroll' }, text));
  document.body.append(shade);
  const target = para && text.querySelector(`#m${para}`);
  if (target) {
    const block = target.closest('p');
    block.classList.add('flash');
    block.scrollIntoView({ block: 'start' });
  }
}
