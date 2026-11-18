// Stroke gallery: every family side by side at one scale, each stroke animated in its
// writing direction (green = start, red = end). Tap a card to replay it.
import { FAMILIES, STROKE_BY_ID } from '../data/strokes.js';
import { renderStrokeSVG, animateStroke } from './render.js';
import { el } from './dom.js';

export function buildGallery(container, { unit = 28 } = {}) {
  const svgs = [];
  const card = (id) => {
    const stroke = STROKE_BY_ID[id];
    const svg = renderStrokeSVG(stroke, { unit });
    svgs.push(svg);
    const node = el('button', { type: 'button', className: 'card', onclick: () => animateStroke(svg) },
      el('div', { className: 'art' }, svg),
      el('div', { className: 'label', textContent: stroke.label }),
      el('div', { className: 'sounds', textContent: stroke.sounds.join(', ') }),
      ...(stroke.briefForms.length ? [el('div', { className: 'brief', textContent: stroke.briefForms.join(', ') })] : []),
      ...(stroke.verify ? [el('div', { className: 'verify', textContent: `⚠ verify: ${stroke.verify}` })] : []));
    node.dataset.stroke = id;
    return node;
  };
  container.replaceChildren(
    el('p', { className: 'gallery-intro', textContent: 'Green = where the pen starts. Red = where it ends. Tap a stroke to replay it. All strokes are drawn at the same scale.' }),
    ...FAMILIES.map((family) => el('section', { className: 'family' },
      el('h2', { textContent: family.name }),
      el('div', { className: 'cards' }, ...family.members.map(card)))));
  return {
    replayAll: () => Promise.all(svgs.map((svg) => animateStroke(svg))),
  };
}
