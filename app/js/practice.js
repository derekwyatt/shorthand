// The example panel: draws the outline to copy, at the pad's scale and on the same
// ruled lines, with its meaning underneath.
import { U_PER_LINE } from '../data/strokes.js';
import { LEVELS } from '../data/examples.js';
import { compileExample } from './join.js';
import { bbox, renderCompiledSVG, animateStroke } from './render.js';


export function createExamplePanel({ art, title, meaning, source, counter, score, verdict, hint, critiques }) {
  let current = null; // { example, index, total, lineSpacing }
  let svgs = [];

  // Two views of the same outline: enlarged (shape and direction) and actual size on
  // ruled lines (how big to write it on the pad).
  const big = Object.assign(document.createElement('div'), { className: 'ex-big' });
  const actual = Object.assign(document.createElement('div'), { className: 'ex-actual' });
  const caption = (text) => Object.assign(document.createElement('div'), { className: 'ex-caption', textContent: text });
  art.replaceChildren(caption('Enlarged: green dot = start, red arrow = end'), big, caption('Actual size: write it this big'), actual);

  function draw({ animate }) {
    if (!current) return;
    const { example, lineSpacing } = current;
    const unit = lineSpacing / U_PER_LINE;
    const compiled = compileExample(example);
    const box = bbox(compiled);
    const inkW = (box.maxX - box.minX) * unit;
    const inkH = (box.maxY - box.minY) * unit;

    const label = `Gregg shorthand for ${example.title}`;
    const panelW = art.clientWidth || 300;

    // Enlarged: fit the panel width, at most 60 px per U and 100 px of ink height.
    const wU = Math.max(box.maxX - box.minX, 0.3);
    const hU = Math.max(box.maxY - box.minY, 0.3);
    const bigUnit = Math.min(60, (panelW - 48) / wU, 100 / hU);
    const bigSvg = renderCompiledSVG(compiled, { unit: bigUnit, pad: 24, strokeWidth: 4, label: `${label}, enlarged` });
    big.replaceChildren(bigSvg);

    // Actual size: the lowest point of the outline sits on a ruled line.
    const width = Math.max(panelW, inkW + 32);
    const left = Math.max(16, (width - inkW) / 2);
    const baselineIndex = Math.max(2, Math.ceil((0.75 * lineSpacing + inkH) / lineSpacing));
    const baselineY = baselineIndex * lineSpacing;
    const height = baselineY + lineSpacing;
    const origin = { x: left - box.minX * unit, y: baselineY + box.minY * unit };
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
      meaning.replaceChildren(...example.meaning.map((line) => Object.assign(document.createElement('p'), { textContent: line })));
      source.textContent = `Source: ${example.source}`;
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
        let cls = 'poor';
        if (result.score >= 85) cls = 'good';
        else if (result.score >= 65) cls = 'close';
        score.className = `score ${cls}`;
        score.textContent = String(result.score);
        const progress = result.latestComplete ? '' : ` \u00b7 repeat ${result.count} in progress`;
        verdict.textContent = `${line ? `Line ${line} \u00b7 ` : ''}${result.count} ${result.count === 1 ? 'repeat' : 'repeats'} \u00b7 ${result.correctCount} correct \u00b7 best ${result.best}${progress}`;
      }
      let items = result.critiques;
      if (!items.length) items = [{ level: 'ok', text: result.complete ? 'Every part matches the example.' : 'So far so good.' }];
      critiques.replaceChildren(...items.map((c) => Object.assign(document.createElement('li'), { className: c.level, textContent: c.text })));
    },
  };
}
