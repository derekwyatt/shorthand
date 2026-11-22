// The example panel: draws the outline to copy, at the pad's scale and on the same
// ruled lines, with its meaning underneath.
import { U_PER_LINE } from '../data/strokes.js';
import { LEVELS } from '../data/examples.js';
import { plateFor } from '../data/plates.js';
import { compileExample, translateCompiled } from './join.js';
import { bbox, renderCompiledSVG, animateStroke } from './render.js';
import { el, svgEl, outLink } from './dom.js';
import { sourceUrl } from '../data/source.js';
import { openManual, unitOfParagraph } from './manualtext.js';

const STRIP_GAP = 2.5; // U between outlines in an actual-size strip

// Examples at actual size, side by side, each resting on a rule: how they look on the pad at
// `lineSpacing`. `labels` names each one under its outline; `onPick(example)` makes each
// outline's column tappable.
export function actualSizeStrip(examples, { lineSpacing: ls, labels = true, onPick = null }) {
  const unit = ls / U_PER_LINE;
  const placed = [];
  let x = 0;
  for (const example of examples) {
    const c = compileExample(example);
    const b = bbox(c);
    placed.push({ example, c: translateCompiled(c, x - b.minX, -c.base), from: x, to: x + b.maxX - b.minX, up: b.maxY - c.base, down: c.base - b.minY });
    x += b.maxX - b.minX + STRIP_GAP;
  }
  const inkH = Math.max(...placed.map((p) => p.up)) * unit;
  const below = Math.max(...placed.map((p) => p.down)) * unit;
  // Each outline's base (§48) rests on a rule, with just enough ruled space above the ink,
  // and room below for what hangs under the line and the labels (or one more rule).
  const baselineY = Math.max(1, Math.ceil((0.35 * ls + inkH) / ls)) * ls;
  const labelY = baselineY + Math.max(0.55 * ls, 18, below + 14);
  const height = Math.max(baselineY + Math.max(0.8 * ls, 26), labelY + 8);
  const width = (x - STRIP_GAP) * unit + 32;
  const origin = { x: 16, y: baselineY };
  const compiled = { segments: placed.flatMap((p) => p.c.segments), start: placed[0].c.start, end: placed[placed.length - 1].c.end };
  const label = labels ? `Actual size: ${examples.map((e) => e.title).join(', ')}` : 'An outline at actual size';
  const svg = renderCompiledSVG(compiled, { unit, width, height, origin, strokeWidth: 2.2, label });
  for (const p of placed) {
    if (labels) {
      const text = svgEl('text', { x: origin.x + ((p.from + p.to) / 2) * unit, y: labelY, 'text-anchor': 'middle', class: 'strip-label' });
      text.textContent = p.example.title;
      text.dataset.id = p.example.id;
      svg.append(text);
    }
    if (onPick) {
      // A tap anywhere over the outline's column picks it.
      const hit = svgEl('rect', { x: origin.x + p.from * unit - 8, y: 0, width: (p.to - p.from) * unit + 16, height, fill: 'transparent', class: 'strip-hit' });
      hit.addEventListener('click', () => onPick(p.example));
      svg.append(hit);
    }
  }
  const box = el('div', { className: 'ex-actual lesson-actual' });
  box.style.height = `${height}px`;
  box.append(svg);
  return box;
}

// An example drawn enlarged to fit a box: at most `maxUnit` px per U, `width` px wide and
// `height` px of ink tall (very short or narrow outlines count as 0.3 U, so a dot is not huge).
export function enlargedSVG(example, { maxUnit, width, height, pad, strokeWidth, label = `Gregg shorthand for ${example.title}` }) {
  const compiled = compileExample(example);
  const box = bbox(compiled);
  const unit = Math.min(maxUnit, width / Math.max(box.maxX - box.minX, 0.3), height / Math.max(box.maxY - box.minY, 0.3));
  return renderCompiledSVG(compiled, { unit, pad, strokeWidth, label });
}

// The badge colour for a score.
export const scoreClass = (score) => (score >= 85 ? 'good' : score >= 65 ? 'close' : 'poor');

// The manual's printed outline for an example (an <img> with its page as `.page`), or null
// if the manual does not print it.
export function printedOutline(example) {
  const p = plateFor(example.id);
  if (!p) return null;
  const img = el('img', { srcset: p.srcset, className: 'plate', alt: `The manual's printed outline for ${example.title}, page ${p.page}`, title: `As printed in the manual, p. ${p.page}` });
  img.page = p.page;
  return img;
}

// "p. N" of the manual, linking to that page of the scan at greggshorthand.github.io.
export function pageLink(page) {
  const a = outLink(sourceUrl.page(page), `p. ${page}`);
  a.title = 'This page of the scanned Manual, at greggshorthand.github.io';
  return a;
}
export const printedCaption = (page) => el('div', { className: 'ex-caption' }, 'In the manual, ', pageLink(page));

// A source line such as "Manual §14–18; period from Manual p. 3": each page links to the scan
// (and each §, once on screen, to the source site); then a button opens the first § in the
// Manual's text in the app.
export function sourceNodes(text) {
  const nodes = text.split(/(\bp\. \d+)/).map((part) => {
    const page = /^p\. (\d+)$/.exec(part);
    return page ? pageLink(Number(page[1])) : part;
  });
  const para = /§\s*(\d+)/.exec(text);
  const unit = para && unitOfParagraph(Number(para[1]));
  if (unit) {
    const b = el('button', { type: 'button', className: 'inline-link manual-ref-inline', textContent: 'read it in the Manual ›', title: 'Show this paragraph in the full text of the unit' });
    b.onclick = () => openManual(unit, Number(para[1]));
    nodes.push(' · ', b);
  }
  return nodes;
}

export function createExamplePanel({ art, title, meaning, source, counter, score, verdict, hint, critiques }) {
  let current = null; // { example, index, total, lineSpacing }
  let svgs = [];

  // Views of the same outline: enlarged (shape and direction), as printed in the manual
  // (when it prints it), and actual size on ruled lines (how big to write it on the pad).
  const big = el('div', { className: 'ex-big' });
  const plate = el('div', { className: 'ex-plate' });
  const actual = el('div', { className: 'ex-actual' });
  const caption = (text) => el('div', { className: 'ex-caption', textContent: text });
  art.replaceChildren(caption('Enlarged: green = start, red = end'), big, plate, caption('Actual size: write it this big'), actual);

  function showPlate(example) {
    const img = printedOutline(example);
    plate.replaceChildren(...(img ? [printedCaption(img.page), img] : []));
  }

  function draw({ animate }) {
    if (!current) return;
    const { example, lineSpacing } = current;
    const unit = lineSpacing / U_PER_LINE;
    const compiled = compileExample(example);
    const box = bbox(compiled);
    const inkW = (box.maxX - box.minX) * unit;
    const inkH = (box.maxY - compiled.base) * unit; // above the line
    const below = (compiled.base - box.minY) * unit; // hanging below it

    const label = `Gregg shorthand for ${example.title}`;
    const panelW = art.clientWidth || 300;

    // Enlarged: fit the panel width, at most 60 px per U and 100 px of ink height.
    const bigSvg = enlargedSVG(example, { maxUnit: 60, width: panelW - 48, height: 100, pad: 24, strokeWidth: 4, label: `${label}, enlarged` });
    big.replaceChildren(bigSvg);

    // Actual size: the outline's base (§48) sits on a ruled line.
    const width = Math.max(panelW, inkW + 32);
    const left = Math.max(16, (width - inkW) / 2);
    const baselineIndex = Math.max(2, Math.ceil((0.75 * lineSpacing + inkH) / lineSpacing));
    const baselineY = baselineIndex * lineSpacing;
    const height = baselineY + Math.max(lineSpacing, below + 8);
    const origin = { x: left - box.minX * unit, y: baselineY + compiled.base * unit };
    const actualSvg = renderCompiledSVG(compiled, { unit, width, height, origin, strokeWidth: 2.2, label: `${label}, actual size` });
    actual.style.height = `${height}px`;
    actual.replaceChildren(actualSvg);

    svgs = [bigSvg, actualSvg];
    if (animate) svgs.forEach((s) => animateStroke(s));
  }

  new ResizeObserver(() => draw({ animate: false })).observe(art);

  return {
    show(example, { index, total, lineSpacing, animate = true }) {
      current = { example, index, total, lineSpacing };
      counter.textContent = `Level ${example.level} · ${LEVELS[example.level - 1].name} · ${index + 1} of ${total}`;
      title.textContent = example.title;
      meaning.replaceChildren(...example.meaning.map((line) => el('p', { textContent: line })));
      source.replaceChildren('Source: ', ...sourceNodes(example.source));
      showPlate(example);
      draw({ animate });
    },
    replay() {
      svgs.forEach((s) => animateStroke(s));
    },
    // Score badge, verdict and critique list for the current attempt.
    // `line` (1-based) when the stats are for one line of the pad only.
    showAssessment(result, { line = null } = {}) {
      critiques.replaceChildren();
      if (!result || result.strokes === 0) {
        score.className = 'score empty';
        score.textContent = '–';
        verdict.textContent = 'Write the example on the pad.';
        hint.textContent = '';
        return;
      }
      const letters = current?.example.kind === 'letter';
      hint.textContent = letters ? 'Write it again and again across the line.' : 'Write it again on the next line.';
      if (!result.complete) {
        score.className = 'score empty';
        score.textContent = `${result.written}/${result.expected}`;
        verdict.textContent = `${line ? `Line ${line} \u00b7 ` : ''}Keep going: ${result.written} of ${result.expected} parts written.`;
      } else {
        score.className = `score ${scoreClass(result.score)}`;
        score.textContent = String(result.score);
        const progress = result.latestComplete ? '' : ` \u00b7 repeat ${result.count} in progress`;
        verdict.textContent = `${line ? `Line ${line} \u00b7 ` : ''}${result.count} ${result.count === 1 ? 'repeat' : 'repeats'} \u00b7 ${result.correctCount} correct \u00b7 best ${result.best}${progress}`;
      }
      let items = result.critiques;
      if (!items.length) items = [{ level: 'ok', text: result.complete ? 'Every part matches the example.' : 'So far so good.' }];
      critiques.replaceChildren(...items.map((c) => el('li', { className: c.level, textContent: c.text })));
    },
  };
}
