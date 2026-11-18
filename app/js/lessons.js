// Lessons view: Manual Units 1–3 as step-by-step tutorials. Shares the ink pad.
//
// A unit is a list of steps (data/lessons.js): read a rule and watch its outlines, write an
// example on the pad until a repeat scores PASS_SCORE, or read an outline and pick its
// meaning. Every outline a step shows can be tried on the pad and is scored like Practice;
// read steps also show their outlines at actual size, on ruled lines like the pad's.
// Progress (current step and steps done) is kept in localStorage; strokes are not.
import { LESSONS, PASS_SCORE, stepKey, exampleFor, isTask } from '../data/lessons.js';
import { plateFor, sectionPlate, readingPlate } from '../data/plates.js';
import { compileExample } from './join.js';
import { bbox, renderCompiledSVG, animateStroke } from './render.js';
import { createExamplePanel, actualSizeStrip } from './practice.js';
import { assessRepeats } from './repeats.js';
import { getWriterScale, learnWriterScale } from './writer.js';

const STORE_KEY = 'gregg.lessons.v1';

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
// Sentences of a key paragraph, splitting after . ? ! (not after Mr., Mrs., Dr., St. or initials).
export function splitSentences(text) {
  const out = [];
  let start = 0;
  const re = /[.?!]["”’)]?\s+(?=["“(]?[A-Z0-9])/g;
  for (let m; (m = re.exec(text));) {
    const before = text.slice(start, m.index + 1);
    if (/(?:\b(?:Mr|Mrs|Messrs|Dr|St|No|Co|Inc)|\b[A-Z])\.$/.test(before)) continue;
    out.push(text.slice(start, m.index + m[0].trimEnd().length));
    start = m.index + m[0].length;
  }
  out.push(text.slice(start));
  return out.filter((x) => x.trim());
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
  if (example.kind === 'phrase') return `Write the phrase “${example.title}”.`;
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
    renderUnits();
    renderNav();
  }

  // The manual's printed outline for an example, or null if it does not print it.
  function plateImg(id) {
    const p = plateFor(id);
    if (!p) return null;
    const example = exampleFor(id);
    return el('img', { src: p.src, className: 'plate', alt: `The manual's printed outline for ${example.title}, page ${p.page}`, title: `As printed in the manual, p. ${p.page}` });
  }

  // Section plates of a rule: whole figures or tables from the manual.
  function sectionPlates(ids) {
    if (!ids.length) return [];
    return [
      el('div', { className: 'ex-caption', textContent: 'From the manual' }),
      ...ids.map((id) => {
        const p = sectionPlate(id);
        return el('figure', { className: 'lesson-plate' },
          el('img', { src: p.src, className: 'plate', alt: `${p.caption}, as printed in the manual, page ${p.page}` }),
          el('figcaption', { textContent: `${p.caption} (p. ${p.page})` }));
      }),
    ];
  }

  function figure(id, { animate = true, caption = true, plate = caption } = {}) {
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
    const printed = plate ? plateImg(id) : null;
    if (printed) fig.append(printed);
    if (caption) fig.append(el('figcaption', { textContent: example.title }));
    return fig;
  }

  // The outlines at actual size on rules spaced like the pad's. Tapping one tries it.
  const actualStrip = (ids, labels) => actualSizeStrip(ids.map(exampleFor), { lineSpacing: pad.lineSpacing, labels, onPick: (ex) => select(ex.id) });

  // `labels: false` hides the words (a reading question that is not answered yet).
  function stripSection(ids, { labels = true } = {}) {
    const host = el('div');
    strip = { host, ids, labels };
    host.append(actualStrip(ids, labels));
    const text = labels ? 'Actual size on the pad: write them this big' : 'On the pad, at actual size';
    return [el('div', { className: 'ex-caption', textContent: text }), host];
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
  const units = el('select', { className: 'lesson-unit' });
  units.setAttribute('aria-label', 'Unit');
  units.addEventListener('change', () => openUnit(LESSONS.find((l) => String(l.unit) === units.value)));
  const heading = el('div', { className: 'lesson-head' });
  const bar = el('div', { className: 'lesson-bar' }, el('span'));
  const body = el('div', { className: 'lesson-body' });
  const nav = el('div', { className: 'ex-nav lesson-nav' });
  // Navigation sits at the top, below the unit picker, and stays there as the step scrolls.
  panel.replaceChildren(units, nav, heading, bar, body);

  function renderUnits() {
    units.replaceChildren(...LESSONS.map((l) => {
      const c = counts(l);
      return el('option', { value: String(l.unit), textContent: `${l.title} · ${l.subtitle} (${c.done}/${c.total})` });
    }));
    units.value = String(lesson.unit);
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
    replay.disabled = (s.type === 'choose' && !isDone(s)) || s.type === 'reading';
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
      ...sectionPlates(s.plates),
      ...(figures.length ? [
        el('div', { className: 'ex-caption', textContent: 'Enlarged (green dot = start, red arrow = end), and as printed in the manual' }),
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
    const ruled = el('div', { className: 'lesson-body' });
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
      const printed = plateImg(s.example);
      ruled.replaceChildren(...stripSection([s.example]));
      after.replaceChildren(
        ...(printed ? [el('div', { className: 'ex-caption', textContent: `In the manual, p. ${plateFor(s.example).page}` }), el('div', { className: 'ex-plate' }, printed)] : []),
        ...trySection([s.example]));
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
    // The outline on ruled lines too: its size against the rules tells similar strokes apart.
    ruled.replaceChildren(...stripSection([s.example], { labels: false }));
    body.replaceChildren(el('div', { className: 'quiz-prompt', textContent: 'What does this say?' }), el('div', { className: 'ex-big' }, fig), ruled, choices, answerLine, meaning, after);
    if (answered) reveal();
  }

  // The unit's page of connected shorthand. The key is hidden sentence by sentence: read a
  // sentence on the page, then tap it (or "Show next") to check.
  function renderReading(s) {
    markDone(s);
    const r = s.reading;
    pad.load([]);
    const keyBox = readingKey(r);
    const alt = `Reading and Dictation Practice, Manual §${r.section}: a page of shorthand`;
    const open = () => openReader(r, keyBox, () => body.contains(slot) && slot.replaceWith(keyBox), alt);
    const slot = el('div');
    body.replaceChildren(
      el('h2', { className: 'lesson-title', textContent: 'Reading and Dictation Practice' }),
      el('div', { className: 'ex-source', textContent: `Manual §${r.section}, ${r.pages}` }),
      el('p', { className: 'lesson-text', textContent: 'The manual closes every unit with a page of connected shorthand to read, and later to take from dictation. Read it a sentence at a time and check each against the key. Full screen puts the page and the key side by side. Copying outlines onto the pad as you read fixes the forms.' }),
      button('Read full screen', 'quiz-btn', () => { keyBox.replaceWith(slot); open(); }),
      ...r.plates.map((id) => {
        const img = el('img', { src: readingPlate(id).src, className: 'plate reading-plate', alt, title: 'Tap to read full screen' });
        img.onclick = () => { keyBox.replaceWith(slot); open(); };
        return img;
      }),
      keyBox,
    );
  }

  // The key of a reading page, every sentence hidden until tapped.
  function readingKey(r) {
    const sentences = [];
    const passages = r.passages.map((p, i) => el('section', { className: 'reading-passage' },
      el('div', { className: 'ex-caption', textContent: r.passages.length > 1 ? `Passage ${i + 1} · ${p.words} words` : `${p.words} words` }),
      ...p.text.map((para) => el('p', { className: 'reading-key' }, ...splitSentences(para).flatMap((text) => {
        const span = el('span', { className: 'key-hidden', textContent: text, title: 'Tap to show' });
        span.onclick = () => { span.classList.remove('key-hidden'); sync(); };
        sentences.push(span);
        return [span, ' '];
      })))));
    const hidden = () => sentences.filter((x) => x.classList.contains('key-hidden'));
    const all = button('Show all', 'quiz-btn key-btn', () => {
      const hide = !hidden().length;
      for (const x of sentences) x.classList.toggle('key-hidden', hide);
      sync();
    });
    const nextBtn = button('Show next', 'quiz-btn key-btn', () => { hidden()[0]?.classList.remove('key-hidden'); sync(); });
    function sync() {
      all.textContent = hidden().length ? 'Show all' : 'Hide all';
      nextBtn.disabled = !hidden().length;
    }
    return el('div', { className: 'reading-keybox' },
      el('div', { className: 'reading-tools' }, el('strong', { textContent: 'Key' }), nextBtn, all),
      ...passages,
      el('p', { className: 'ex-caption', textContent: 'Transcription key: J. Andrew Owen, greggshorthand.github.io.' }));
  }

  // Full screen: the page (tap it to switch between fitting the width and 2×) beside the key.
  function openReader(r, keyBox, restore, alt) {
    const page = el('div', { className: 'reader-page' }, ...r.plates.map((id) => el('img', { src: readingPlate(id).src, className: 'plate', alt })));
    page.onclick = () => page.classList.toggle('big');
    const close = () => { shade.remove(); restore(); };
    const shade = el('div', { className: 'reader', role: 'dialog', ariaLabel: alt },
      el('div', { className: 'reader-bar' },
        el('strong', { textContent: `Unit ${r.unit} · Reading and Dictation Practice (§${r.section}, ${r.pages})` }),
        button('Close ✕', 'quiz-btn key-btn', close)),
      page, el('div', { className: 'reader-key' }, keyBox));
    document.body.append(shade);
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
    renderUnits();
    if (screen === 'summary') renderSummary();
    else {
      const s = step();
      if (s.type === 'read') renderRead(s);
      else if (s.type === 'reading') renderReading(s);
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
        strip.host.replaceChildren(actualStrip(strip.ids, strip.labels));
        for (const t of strip.host.querySelectorAll('.strip-label')) t.classList.toggle('selected', t.dataset.id === target);
      }
      onPadChange();
    },
  };
}
