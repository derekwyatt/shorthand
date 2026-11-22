// Renders blocks of the Manual's text (data/manual.js) as paragraphs.
// Blocks are [align, html] with only em, strong, br, img, anchor spans and cross-references:
// static content from this repository, so it is set as HTML. A cross-reference opens what it
// names in the app: another unit (data-unit), a paragraph (data-para) or a Reference section
// (data-ref).
import { el, button, credit } from './dom.js';
import { MANUAL_TEXT } from '../data/manual.js';
import { LESSONS } from '../data/lessons.js';
import { AUTHOR, sourceUrl } from '../data/source.js';

// The unit whose text holds the Manual's paragraph n. A unit's first paragraph has no anchor,
// only its bold number.
const PARA_UNIT = new Map(Object.entries(MANUAL_TEXT).flatMap(([u, d]) => d.blocks.flatMap(([, html]) => [...html.matchAll(/id="m(\d+)"|^<strong>(\d+)\./g)].map((m) => [Number(m[1] ?? m[2]), Number(u)]))));
export const unitOfParagraph = (n) => PARA_UNIT.get(n) ?? null;

// "§14" (or "§14–22") anywhere in the app's text links to that paragraph of the Manual on
// greggshorthand.github.io. Text already in a link or a control is left alone, and so is a
// Speed Studies section ("Speed Study IV §3").
const SECTION = /§\s*(\d+)(?:\s*[–-]\s*\d+)?/g;
const LEAVE = 'a, button, select, textarea, svg, script, style';
export function linkSections(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (t) => (t.data.includes('§') && !t.parentElement?.closest(LEAVE) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const texts = [];
  while (walk.nextNode()) texts.push(walk.currentNode);
  for (const t of texts) {
    const parts = [];
    let last = 0;
    for (const m of t.data.matchAll(SECTION)) {
      const n = Number(m[1]), unit = unitOfParagraph(n);
      if (!unit || /Speed Study [IVXLC]+\s*$/.test(t.data.slice(0, m.index))) continue;
      parts.push(t.data.slice(last, m.index), el('a', { href: sourceUrl.unit(unit, n), target: '_blank', rel: 'noopener', className: 'section-link', textContent: m[0], title: `Manual §${n} on ${AUTHOR}'s site` }));
      last = m.index + m[0].length;
    }
    if (!parts.length) continue;
    parts.push(t.data.slice(last));
    t.replaceWith(...parts);
  }
}

// Links sections in `root` now and in whatever is written into it later.
export function watchSections(root) {
  linkSections(root);
  new MutationObserver((records) => {
    const roots = new Set();
    for (const r of records) {
      if (r.type === 'characterData') roots.add(r.target.parentElement);
      for (const n of r.addedNodes) roots.add(n.nodeType === Node.TEXT_NODE ? n.parentElement : n);
    }
    for (const n of roots) if (n?.isConnected && n.nodeType === Node.ELEMENT_NODE) linkSections(n);
  }).observe(root, { childList: true, characterData: true, subtree: true });
}

export function renderBlocks(blocks) {
  return blocks.map(([align, html]) => {
    const p = el('p', { className: align === 'center' ? 'center' : '', innerHTML: html });
    // The site's figures are small: show them 1.4 times as large (still no wider than the text).
    for (const img of p.querySelectorAll('img[width]')) {
      img.width = Math.round(img.width * 1.4);
      img.removeAttribute('height');
    }
    for (const a of p.querySelectorAll('a[data-unit], a[data-para], a[data-ref]')) {
      a.href = a.dataset.ref ? `#ref/${a.dataset.ref}` : '#';
      a.className = 'inline-link';
      a.onclick = (e) => {
        // Whatever Manual reader is open gives way to what the link opens.
        document.querySelector('.manual-reader')?.remove();
        if (a.dataset.ref) return; // the hash opens the Reference section
        e.preventDefault();
        const para = a.dataset.para ? Number(a.dataset.para) : null;
        openManual(para ? unitOfParagraph(para) : Number(a.dataset.unit), para);
      };
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
