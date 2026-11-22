// The numbered buttons down the pad's left gutter, one per line of writing: tapping one shows
// that line's stats in the panel, tapping it again shows every line's. Used by Practice and
// Lessons, each with its own example and panel.
import { practiceLines } from './repeats.js';
import { el } from './dom.js';

// box: the gutter element. evaluate(strokes): the assessment of those strokes (or null).
// show(result, { line }): puts a result in the panel (`line` is 1-based, or null for all).
export function createLinePicks({ box, pad, unitPx, evaluate, show }) {
  let pickedY = null; // y (px) of the picked line; null shows every line

  const lines = () => practiceLines(pad.strokes, { unitPx: unitPx(), lineSpacing: pad.lineSpacing });

  // The picked line ({ line, number }), found again after the strokes change; the pick is
  // dropped once its line is gone or only one line is left.
  function pickedLine(all) {
    if (pickedY === null || all.length < 2) {
      pickedY = null;
      return null;
    }
    let best = null;
    all.forEach((line, i) => {
      if (!best || Math.abs(line.y - pickedY) < Math.abs(best.line.y - pickedY)) best = { line, number: i + 1 };
    });
    if (Math.abs(best.line.y - pickedY) > pad.lineSpacing / 2) {
      pickedY = null;
      return null;
    }
    pickedY = best.line.y;
    return best;
  }

  // One button per line of writing; at most one is pressed, and pressing it again unpicks it.
  function render(all, picked) {
    if (all.length < 2) {
      box.replaceChildren();
      return;
    }
    box.replaceChildren(...all.map((line, i) => {
      const n = i + 1;
      const b = el('button', { type: 'button', className: 'line-pick', textContent: String(n), title: picked === n ? 'Show stats for every line' : `Show stats for line ${n} only` });
      b.style.top = `${line.y}px`;
      b.setAttribute('aria-pressed', String(picked === n));
      b.addEventListener('click', () => {
        pickedY = picked === n ? null : line.y;
        update(evaluate(pad.strokes));
      });
      return b;
    }));
  }

  // Shows `full` (the result for every line) or the picked line's, and redraws the buttons.
  function update(full) {
    const all = lines();
    const picked = pickedLine(all);
    show(picked ? evaluate(picked.line.strokes) : full, { line: picked?.number ?? null });
    render(all, picked?.number ?? null);
  }

  return {
    update,
    reset() { pickedY = null; },
    // Nothing on the pad is scored: no buttons.
    clear() {
      pickedY = null;
      box.replaceChildren();
    },
  };
}
