// Lessons view: Manual Units 1–3 as step-by-step tutorials. Shares the ink pad.
//
// A unit is a list of steps (data/lessons.js): read a rule and watch its outlines, write an
// example on the pad until a repeat scores PASS_SCORE, or read an outline and pick its
// meaning. Every outline a step shows can be tried on the pad and is scored like Practice;
// read steps also show their outlines at actual size, on ruled lines like the pad's.
// Progress (current step and steps done) is kept in localStorage; strokes are not.
import { LESSONS, PASS_SCORE, stepKey, exampleFor, isTask } from '../data/lessons.js';
import { U_PER_LINE } from '../data/strokes.js';
import { compileExample, translateCompiled } from './join.js';
import { bbox, renderCompiledSVG, animateStroke } from './render.js';
import { createExamplePanel } from './practice.js';
import { assessRepeats } from './repeats.js';
import { getWriterScale, learnWriterScale } from './writer.js';

const STORE_KEY = 'gregg.lessons.v1';
const STRIP_GAP = 2.5; // U between outlines in the actual-size strip
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
const button = (text, className, onClick) => el('button', { type: 'button', className, textContent: text, onclick: onClick });

function loadProgress() {
  const defaults = { unit: LESSONS[0].id, at: {}, done: {} };
  try {
    const s = { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY)) };
    if (!LESSONS.some((l) => l.id === s.unit)) s.unit = defaults.unit;
    return s;
  } catch {
    return defaults;
  }
}

function writePrompt(example) {
  const first = example.title.split(' / ')[0];
  if (example.kind === 'letter') return `Write the letter “${example.title}”.`;
  if (example.kind === 'brief') return `Write the brief form for “${first}”.`;
  if (example.kind === 'sentence') return `Write the sentence “${example.title}”`;
  return `Write “${first}”.`;
}

export function createLessons({ panel, pad, assist, unitPx }) {
  const progress = loadProgress();
  let lesson = LESSONS.find((l) => l.id === progress.unit);
  let index = 0;
  let screen = 'step'; // 'step' or 'summary'
  let completedBefore = 0; // completed repeats on the pad when the step's last result came in
  let target = null; // id of the example being tried on the pad (null: the pad is not scored)
  let tried = new Map(); // example id -> pad strokes, for each outline tried in this step
  let strip = null; // { host, ids } of the step's actual-size strip, for redrawing
  let tryPrompt = null; // "Writing “aim” …" line, while on screen

  // One example panel, reused by every write step (its elements are re-attached).
  const parts = {
    art: el('div', { className: 'example-art' }), title: el('h2', { className: 'ex-title' }),
    meaning: el('div', { className: 'ex-meaning' }), source: el('div', { className: 'ex-source' }),
    counter: el('div'), score: el('div', { className: 'score empty' }), verdict: el('div', { className: 'verdict' }),
    hint: el('div', { className: 'repeat-hint' }), critiques: el('ul', { className: 'critiques' }),
  };
  const examplePanel = createExamplePanel(parts);
  const feedback = el('section', { className: 'feedback', ariaLabel: 'Your attempt' },
    el('div', { className: 'score-row' }, parts.score, parts.verdict, parts.hint), parts.critiques);
  let status = null; // the step's status line, while on screen
  let figures = []; // { id, fig } of the step's enlarged outlines

  const step = () => lesson.steps[index];
  const doneSet = (l = lesson) => new Set(progress.done[l.id] || []);
  const isDone = (s, l = lesson) => doneSet(l).has(stepKey(s));
  const counts = (l) => {
    const tasks = l.steps.filter(isTask);
    const done = doneSet(l);
    return { done: tasks.filter((s) => done.has(stepKey(s))).length, total: tasks.length };
  };

  function persist() {
    progress.unit = lesson.id;
    progress.at[lesson.id] = index;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch {
      // Storage unavailable: lessons still work, progress just isn't kept.
    }
  }

  function markDone(s) {
    const set = doneSet();
    if (set.has(stepKey(s))) return;
    set.add(stepKey(s));
    progress.done[lesson.id] = [...set];
    persist();
    renderTabs();
    renderNav();
  }

  function figure(id, { animate = true, caption = true } = {}) {
    const example = exampleFor(id);
    const compiled = compileExample(example);
    const box = bbox(compiled);
    const wU = Math.max(box.maxX - box.minX, 0.3);
    const hU = Math.max(box.maxY - box.minY, 0.3);
    const unit = Math.min(40, 180 / wU, 80 / hU);
    const svg = renderCompiledSVG(compiled, { unit, pad: 16, strokeWidth: 3.5, label: `Gregg shorthand for ${example.title}` });
    if (animate) animateStroke(svg);
    const fig = el('figure', { className: 'lesson-fig', title: 'Tap to replay' }, svg);
    fig.replay = () => animateStroke(svg);
    fig.onclick = fig.replay;
    if (caption) fig.append(el('figcaption', { textContent: example.title }));
    return fig;
  }

  // The outlines at actual size, side by side, each resting on a rule: how they look on the
  // pad at its line spacing. Tapping an outline tries it on the pad.
  function actualStrip(ids) {
    const ls = pad.lineSpacing;
    const unit = ls / U_PER_LINE;
    const placed = [];
    let x = 0;
    for (const id of ids) {
      const c = compileExample(exampleFor(id));
      const b = bbox(c);
      placed.push({ id, c: translateCompiled(c, x - b.minX, -b.minY), from: x, to: x + b.maxX - b.minX, h: b.maxY - b.minY });
      x += b.maxX - b.minX + STRIP_GAP;
    }
    const inkH = Math.max(...placed.map((p) => p.h)) * unit;
    // The lowest point rests on a rule, with just enough ruled space above the ink and
    // room for the labels below.
    const baselineY = Math.max(1, Math.ceil((0.35 * ls + inkH) / ls)) * ls;
    const height = baselineY + Math.max(0.8 * ls, 26);
    const width = (x - STRIP_GAP) * unit + 32;
    const origin = { x: 16, y: baselineY };
    const compiled = { segments: placed.flatMap((p) => p.c.segments), start: placed[0].c.start, end: placed[placed.length - 1].c.end };
    const svg = renderCompiledSVG(compiled, { unit, width, height, origin, strokeWidth: 2.2, label: `Actual size: ${ids.map((id) => exampleFor(id).title).join(', ')}` });
    for (const p of placed) {
      const label = document.createElementNS(SVG_NS, 'text');
      Object.entries({ x: origin.x + ((p.from + p.to) / 2) * unit, y: baselineY + Math.max(0.55 * ls, 18), 'text-anchor': 'middle', class: 'strip-label' })
        .forEach(([k, v]) => label.setAttribute(k, v));
      label.textContent = exampleFor(p.id).title;
      label.dataset.id = p.id;
      svg.append(label);
      // A tap anywhere over the outline's column picks it.
      const hit = document.createElementNS(SVG_NS, 'rect');
      Object.entries({ x: origin.x + p.from * unit - 8, y: 0, width: (p.to - p.from) * unit + 16, height, fill: 'transparent', class: 'strip-hit' })
        .forEach(([k, v]) => hit.setAttribute(k, v));
      hit.addEventListener('click', () => select(p.id));
      svg.append(hit);
    }
    const box = el('div', { className: 'ex-actual lesson-actual' }, svg);
    box.style.height = `${height}px`;
    return box;
  }

  function stripSection(ids) {
    const host = el('div');
    strip = { host, ids };
    host.append(actualStrip(ids));
    return [el('div', { className: 'ex-caption', textContent: 'Actual size on the pad: write them this big' }), host];
  }

  // The "try it" block: which outline the pad is scored against, the score and critiques.
  function trySection(ids) {
    tryPrompt = el('div', { className: 'lesson-try' });
    status = el('div', { className: 'lesson-status', ariaLive: 'polite' });
    const note = ids.length > 1 ? ' Tap another outline to try it instead.' : '';
    tryPrompt.dataset.note = note;
    return [tryPrompt, feedback, status];
  }

  // Scores the pad against example `id` from now on. Each outline keeps its own strokes
  // while the step is on screen.
  function select(id) {
    if (target === id) return;
    if (target) tried.set(target, pad.strokes.slice());
    target = id;
    const example = exampleFor(id);
    pad.load(tried.get(id) || []);
    examplePanel.show(example, { index: 0, total: 1, lineSpacing: pad.lineSpacing, animate: false });
    assist.setExample(example);
    assist.drawCheck(null);
    assist.reset();
    completedBefore = 0;
    for (const f of figures) f.fig.classList.toggle('selected', f.id === id);
    for (const t of strip?.host.querySelectorAll('.strip-label') || []) t.classList.toggle('selected', t.dataset.id === id);
    if (tryPrompt) tryPrompt.textContent = `Try it on the pad: write “${example.title.split(' / ')[0]}”.${tryPrompt.dataset.note}`;
    onPadChange();
  }

  // ---------------------------------------------------------------- frame
  const tabs = el('div', { className: 'sections lesson-tabs', role: 'tablist' });
  const heading = el('div', { className: 'lesson-head' });
  const bar = el('div', { className: 'lesson-bar' }, el('span'));
  const body = el('div', { className: 'lesson-body' });
  const nav = el('div', { className: 'ex-nav lesson-nav' });
  panel.replaceChildren(tabs, heading, bar, body, nav);

  function renderTabs() {
    tabs.replaceChildren(...LESSONS.map((l) => {
      const c = counts(l);
      const b = button('', l === lesson ? 'active' : '', () => openUnit(l));
      b.dataset.unit = String(l.unit);
      b.title = `${l.title}: ${l.subtitle}`;
      b.append(el('span', { textContent: l.title }), el('small', { textContent: `${c.done}/${c.total}` }));
      return b;
    }));
  }

  function renderHeading() {
    const where = screen === 'summary' ? 'Summary' : `Step ${index + 1} of ${lesson.steps.length}`;
    heading.replaceChildren(
      el('div', { className: 'ex-counter', textContent: `${lesson.title} · Manual ${lesson.pages} · ${where}` }),
      el('div', { className: 'lesson-subtitle', textContent: lesson.subtitle }),
    );
    const c = counts(lesson);
    bar.firstChild.style.width = `${c.total ? (100 * c.done) / c.total : 0}%`;
    bar.title = `${c.done} of ${c.total} exercises done`;
  }

  function renderNav() {
    if (screen === 'summary') {
      const nextUnit = LESSONS[LESSONS.indexOf(lesson) + 1];
      nav.replaceChildren(
        button('◀ Back', '', () => goTo(lesson.steps.length - 1)),
        nextUnit ? button(`${nextUnit.title} ▶`, '', () => openUnit(nextUnit)) : button('Practice ▶', '', () => { location.hash = '#pad'; }),
      );
      return;
    }
    const s = step();
    const last = index === lesson.steps.length - 1;
    const forward = isTask(s) && !isDone(s) ? 'Skip ▶' : 'Next ▶';
    const back = button('◀ Back', '', () => goTo(index - 1));
    back.disabled = index === 0;
    const replay = button('Replay', '', replayAll);
    replay.disabled = s.type === 'choose' && !isDone(s);
    nav.replaceChildren(back, replay, button(last ? 'Finish ▶' : forward, 'lesson-next', next));
  }

  // ---------------------------------------------------------------- steps
  let replayers = [];
  const replayAll = () => replayers.forEach((f) => f());

  function renderRead(s) {
    markDone(s);
    figures = s.show.map((id) => {
      const fig = figure(id);
      fig.title = 'Tap to replay and try it on the pad';
      fig.onclick = () => {
        fig.replay();
        select(id);
      };
      return { id, fig };
    });
    replayers = figures.map(({ fig }) => fig.replay);
    pad.load([]);
    body.replaceChildren(
      el('h2', { className: 'lesson-title', textContent: s.title }),
      el('div', { className: 'ex-source', textContent: s.ref }),
      ...s.text.map((t) => el('p', { className: 'lesson-text', textContent: t })),
      ...(figures.length ? [
        el('div', { className: 'ex-caption', textContent: 'Enlarged: green dot = start, red arrow = end' }),
        el('div', { className: 'lesson-figs' }, ...figures.map((f) => f.fig)),
        ...stripSection(s.show),
        ...trySection(s.show),
      ] : []),
    );
    if (s.show.length) select(s.show[0]);
  }

  function renderWrite(s) {
    const example = exampleFor(s.example);
    status = el('div', { className: 'lesson-status', ariaLive: 'polite' });
    body.replaceChildren(
      el('div', { className: 'quiz-prompt', textContent: s.prompt || writePrompt(example) }),
      feedback, status, parts.art, parts.meaning, parts.source,
    );
    replayers = [() => examplePanel.replay()];
    select(s.example);
    examplePanel.replay();
  }

  function renderChoose(s) {
    const example = exampleFor(s.example);
    const answerLine = el('div', { className: 'lesson-status', ariaLive: 'polite' });
    const meaning = el('div', { className: 'ex-meaning' });
    const after = el('div', { className: 'lesson-body' });
    const fig = figure(s.example, { caption: false });
    replayers = [fig.replay];
    const answered = isDone(s);
    const choices = el('div', { className: 'quiz-choices' }, ...s.choices.map((id) => {
      const b = button(exampleFor(id).title, 'choice', () => pick(id, b));
      b.dataset.id = id;
      if (answered && id === s.example) b.classList.add('correct');
      return b;
    }));
    // Once answered, the outline is shown at actual size and can be tried on the pad.
    const reveal = () => {
      for (const b of choices.children) b.disabled = true;
      meaning.replaceChildren(...example.meaning.map((line) => el('p', { textContent: line })));
      after.replaceChildren(...stripSection([s.example]), ...trySection([s.example]));
      select(s.example);
    };
    function pick(id, b) {
      if (id === s.example) {
        b.classList.add('correct', 'chosen');
        answerLine.textContent = '✓ Right.';
        answerLine.className = 'lesson-status good';
        markDone(s);
        reveal();
      } else {
        b.classList.add('wrong');
        b.disabled = true;
        answerLine.textContent = `✗ Not “${exampleFor(id).title}”. Try again.`;
        answerLine.className = 'lesson-status bad';
      }
    }
    pad.load([]);
    body.replaceChildren(el('div', { className: 'quiz-prompt', textContent: 'What does this say?' }), el('div', { className: 'ex-big' }, fig), choices, answerLine, meaning, after);
    if (answered) reveal();
  }

  function render() {
    status = null;
    replayers = [];
    target = null;
    tried = new Map();
    strip = null;
    tryPrompt = null;
    figures = [];
    assist.drawCheck(null);
    assist.reset();
    renderTabs();
    if (screen === 'summary') renderSummary();
    else {
      const s = step();
      if (s.type === 'read') renderRead(s);
      else if (s.type === 'write') renderWrite(s);
      else renderChoose(s);
    }
    renderHeading();
    renderNav();
    panel.scrollTop = 0;
  }

  function renderSummary() {
    const c = counts(lesson);
    const left = lesson.steps.map((s, i) => ({ s, i })).filter(({ s }) => isTask(s) && !isDone(s));
    const label = ({ s }) => `${s.type === 'write' ? 'Write' : 'Read'} “${exampleFor(s.example).title}”`;
    body.replaceChildren(
      el('h2', { className: 'lesson-title', textContent: c.done === c.total ? `${lesson.title} complete` : `${lesson.title}: ${c.done} of ${c.total} done` }),
      el('p', { className: 'lesson-text', textContent: c.done === c.total
        ? 'Every exercise in this unit is done. Keep practising the words in the Practice view, or move on.'
        : 'These exercises were skipped. Tap one to go back to it.' }),
      ...(left.length ? [el('ul', { className: 'lesson-left' }, ...left.map((x) => el('li', {}, button(label(x), 'choice', () => goTo(x.i)))))] : []),
    );
    pad.load([]);
  }

  // ---------------------------------------------------------------- navigation
  function goTo(i) {
    if (i < 0 || i >= lesson.steps.length) return;
    index = i;
    screen = 'step';
    persist();
    render();
  }

  function next() {
    if (index < lesson.steps.length - 1) goTo(index + 1);
    else {
      screen = 'summary';
      render();
    }
  }

  function openUnit(l) {
    lesson = l;
    index = Math.min(progress.at[l.id] ?? 0, l.steps.length - 1);
    screen = 'step';
    persist();
    render();
  }

  // Re-scores the pad against the outline being tried.
  function onPadChange() {
    const s = screen === 'step' ? step() : null;
    if (!s || !target) return null;
    let result = null;
    try {
      result = assessRepeats(exampleFor(target), pad.strokes, { unitPx: unitPx(), lineSpacing: pad.lineSpacing, scale: getWriterScale() });
    } catch (err) {
      console.error('assessment failed', err);
    }
    if (result?.lastCompleted && result.completedCount > completedBefore) learnWriterScale(result.lastCompleted);
    completedBefore = result?.completedCount ?? 0;
    examplePanel.showAssessment(result);
    assist.drawCheck(result);
    const passed = (result?.correctCount ?? 0) > 0;
    if (s.type !== 'write') {
      // Trying an outline from a rule or a reading question: score it, nothing to pass.
      if (status) {
        const written = result && result.strokes > 0;
        status.textContent = passed ? `✓ That matches (best ${result.best}).` : written ? 'Compare your ink with the green and red pattern under it.' : '';
        status.className = `lesson-status${passed ? ' good' : ''}`;
      }
      return result;
    }
    if (passed) markDone(s);
    if (status) {
      if (passed) {
        status.textContent = `✓ Passed (${result.best}). Write it again for practice, or go on.`;
        status.className = 'lesson-status good';
      } else {
        status.textContent = isDone(s) ? '✓ Done before. Write it again for practice, or go on.' : `Write it on the pad. A score of ${PASS_SCORE} or more passes.`;
        status.className = `lesson-status${isDone(s) ? ' good' : ''}`;
      }
    }
    return result;
  }

  return {
    show() {
      openUnit(lesson);
    },
    // The example being tried on the pad, if any (for the guide).
    example() {
      return screen === 'step' && target ? exampleFor(target) : null;
    },
    onPadChange,
    next,
    prev: () => (screen === 'summary' ? goTo(lesson.steps.length - 1) : goTo(index - 1)),
    // The pad's line spacing changed: redraw the actual-size art and re-score.
    refresh() {
      const ex = this.example();
      if (!ex) return;
      examplePanel.show(ex, { index: 0, total: 1, lineSpacing: pad.lineSpacing, animate: false });
      if (strip) {
        strip.host.replaceChildren(actualStrip(strip.ids));
        for (const t of strip.host.querySelectorAll('.strip-label')) t.classList.toggle('selected', t.dataset.id === target);
      }
      onPadChange();
    },
  };
}
