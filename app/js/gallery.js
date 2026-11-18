// Stroke gallery: every family side by side at one scale, each stroke animated in its
// writing direction (green = start, red = end). Tap a card to replay it.
import { FAMILIES, STROKE_BY_ID } from '../data/strokes.js';
import { renderStrokeSVG, animateStroke } from './render.js';

export function buildGallery(container, { unit = 28 } = {}) {
  const cards = [];
  container.replaceChildren();

  const intro = document.createElement('p');
  intro.className = 'gallery-intro';
  intro.textContent = 'Green = where the pen starts. Red = where it ends. Tap a stroke to replay it. All strokes are drawn at the same scale.';
  container.append(intro);

  for (const family of FAMILIES) {
    const section = document.createElement('section');
    section.className = 'family';
    const h = document.createElement('h2');
    h.textContent = family.name;
    const row = document.createElement('div');
    row.className = 'cards';
    section.append(h, row);

    for (const id of family.members) {
      const stroke = STROKE_BY_ID[id];
      const svg = renderStrokeSVG(stroke, { unit });
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.stroke = id;
      const art = document.createElement('div');
      art.className = 'art';
      art.append(svg);
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = stroke.label;
      const sounds = document.createElement('div');
      sounds.className = 'sounds';
      sounds.textContent = stroke.sounds.join(', ');
      card.append(art, label, sounds);
      if (stroke.briefForms.length) {
        const bf = document.createElement('div');
        bf.className = 'brief';
        bf.textContent = stroke.briefForms.join(', ');
        card.append(bf);
      }
      if (stroke.verify) {
        const v = document.createElement('div');
        v.className = 'verify';
        v.textContent = `⚠ verify: ${stroke.verify}`;
        card.append(v);
      }
      card.addEventListener('click', () => animateStroke(svg));
      row.append(card);
      cards.push(svg);
    }
    container.append(section);
  }

  return {
    replayAll: () => Promise.all(cards.map((svg) => animateStroke(svg))),
  };
}
