// Quiz mode: start screen, questions (read / write / look-alike series), summary. Shares the ink pad.
import { EXAMPLES, LEVELS } from '../data/examples.js';
import { compileExample } from './join.js';
import { bbox, renderCompiledSVG, animateStroke, cubicPoint, pathData } from './render.js';
import { assessAttempt, PASS_SCORE } from './assess.js';
import { generateQuiz } from './quizgen.js';
import { actualSizeStrip, scoreClass, printedOutline } from './practice.js';
import { getWriterScale, learnWriterScale } from './writer.js';
import { el, button, svgEl } from './dom.js';

const STORE_KEY = 'gregg.quiz.v1';
const KEEP = 20;
const SHOW_RECENT = 5;
const LENGTHS = [5, 10, 20];
const LEVEL_OPTIONS = LEVELS.map((l) => [String(l.id), `${l.id} · ${l.name}`]);
const TYPE_OPTIONS = [['read', 'Read'], ['write', 'Write'], ['series', 'Look-alike series']];
const SERIES_UNIT = 22; // px per U, shared by every row of a series reveal
const SERIES_MARGIN = 10;
const BY_ID = new Map(EXAMPLES.map((e) => [e.id, e]));

const meaningLines = (example) => example.meaning.map((line) => el('p', { textContent: line }));

function loadResults() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveResult(result) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...loadResults(), result].slice(-KEEP)));
  } catch {
    // Storage unavailable: the quiz still works, history just isn't kept.
  }
}

const checkedValues = (box) => [...box.querySelectorAll('input:checked')].map((i) => i.value);

function scoreBlock(result) {
  const cls = scoreClass(result.score);
  const badge = el('div', { className: `score ${result.complete ? cls : 'empty'}`, textContent: result.complete ? String(result.score) : `${result.written}/${result.expected}` });
  const items = (result.complete ? result.critiques : result.critiques.filter((c) => !c.text.startsWith('Missing'))).slice(0, 4);
  const list = el('ul', { className: 'critiques' }, ...items.map((c) => el('li', { className: c.level, textContent: c.text })));
  return el('section', { className: 'feedback' }, el('div', { className: 'score-row' }, badge), list);
}

function choiceButton(id, onPick) {
  const ex = BY_ID.get(id);
  const b = el('button', { type: 'button', className: 'choice', onclick: () => onPick(id) }, ex.title);
  b.dataset.id = id;
  if (ex.kind === 'letter') b.append(el('small', { textContent: ex.meaning[0] }));
  return b;
}

const questionPoints = (question) => (question.type === 'series' ? question.exampleIds.length : 1);
const answerPoints = (answer) => (answer?.members ? answer.members.filter((m) => m.correct).length : Number(!!answer?.correct));

// Learner ink (pad px, y down) as U-space points (y up).
const inkInU = (strokes, unitPx) => strokes.map((s) => s.points.map((p) => ({ x: p.x / unitPx, y: -p.y / unitPx })));

function overlayBounds(ink, check) {
  const pts = ink.flat();
  for (const c of check) {
    if (c.kind === 'dot') pts.push(c.p);
    for (const seg of c.segments || []) for (let i = 0; i <= 8; i++) pts.push(cubicPoint(seg, i / 8));
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// One small SVG: the learner's ink (blue) over the correct pattern (green/red), at SERIES_UNIT px per U.
function overlaySVG(strokes, result, unitPx) {
  const ink = inkInU(strokes, unitPx);
  const check = result?.check || [];
  const b = overlayBounds(ink, check);
  const w = Math.max((b.maxX - b.minX) * SERIES_UNIT, 4) + SERIES_MARGIN * 2;
  const h = Math.max((b.maxY - b.minY) * SERIES_UNIT, 4) + SERIES_MARGIN * 2;
  const origin = { x: SERIES_MARGIN - b.minX * SERIES_UNIT, y: SERIES_MARGIN + b.maxY * SERIES_UNIT };
  const px = (p) => `${(origin.x + p.x * SERIES_UNIT).toFixed(1)},${(origin.y - p.y * SERIES_UNIT).toFixed(1)}`;
  const svg = svgEl('svg', { class: 'series-art', width: Math.ceil(w), height: Math.ceil(h), viewBox: `0 0 ${Math.ceil(w)} ${Math.ceil(h)}`, role: 'img' });
  for (const c of check) {
    const colour = c.ok ? '#2e7d32' : '#c62828';
    if (c.kind === 'dot') svg.append(svgEl('circle', { cx: origin.x + c.p.x * SERIES_UNIT, cy: origin.y - c.p.y * SERIES_UNIT, r: 3, fill: colour }));
    else svg.append(svgEl('path', { d: pathData({ segments: c.segments }, SERIES_UNIT, origin), fill: 'none', stroke: colour, 'stroke-width': 2, 'stroke-linecap': 'round' }));
  }
  for (const pts of ink) svg.append(svgEl('polyline', { points: pts.map(px).join(' '), fill: 'none', stroke: '#1565c0', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}

export function createQuiz({ panel, pad, assist, unitPx }) {
  const options = { levels: LEVELS.map((l) => l.id), types: TYPE_OPTIONS.map(([t]) => t), n: 10 };
  let quiz = null; // { questions: [{ question, example }], index, answers: [], local }; series questions have example null
  let screen = 'start';
  let checkBtn = null; // the write question's Check button, while it is on screen

  function setPad(strokes) {
    pad.load(strokes);
    assist.drawCheck(null);
    assist.reset();
  }

  function enlarged(example, animate) {
    const compiled = compileExample(example);
    const box = bbox(compiled);
    const wU = Math.max(box.maxX - box.minX, 0.3);
    const hU = Math.max(box.maxY - box.minY, 0.3);
    const unit = Math.min(60, ((panel.clientWidth || 300) - 80) / wU, 100 / hU);
    const svg = renderCompiledSVG(compiled, { unit, pad: 24, strokeWidth: 4, label: `Gregg shorthand for ${example.title}` });
    if (animate) animateStroke(svg);
    return el('div', { className: 'ex-big' }, svg);
  }

  // ---------------------------------------------------------------- start
  function optionGroup(title, list, selected) {
    const box = el('div', { className: 'quiz-opts' });
    for (const [value, label] of list) {
      const input = el('input', { type: 'checkbox', value, checked: selected.includes(value) });
      box.append(el('label', { className: 'quiz-opt' }, input, label));
    }
    return { heading: el('h3', { textContent: title }), box };
  }

  function recentList() {
    const recent = loadResults().slice(-SHOW_RECENT).toReversed();
    if (!recent.length) return el('p', { className: 'quiz-note', textContent: 'No quizzes yet.' });
    const when = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
    return el('ul', { className: 'quiz-recent' }, ...recent.map((r) => el('li', {}, el('span', { textContent: when(r.date) }), el('b', { textContent: `${r.correct}/${r.total}` }))));
  }

  function renderStart() {
    screen = 'start';
    checkBtn = null;
    setPad([]);
    const levels = optionGroup('Levels', LEVEL_OPTIONS, options.levels.map(String));
    const types = optionGroup('Question types', TYPE_OPTIONS, options.types);
    const lens = el('div', { className: 'quiz-len' });
    for (const n of LENGTHS) {
      const b = button(String(n), n === options.n ? 'active' : '', () => {
        options.n = n;
        for (const o of lens.children) o.classList.toggle('active', o === b);
      });
      lens.append(b);
    }
    const start = button('Start quiz', 'quiz-btn big', () => {
      options.levels = checkedValues(levels.box).map(Number);
      options.types = checkedValues(types.box);
      begin();
    });
    panel.replaceChildren(
      el('h2', { textContent: 'Quiz' }),
      levels.heading, levels.box, types.heading, types.box,
      el('h3', { textContent: 'Length' }), lens, start,
      el('h3', { textContent: 'Last quizzes' }), recentList(),
    );
  }

  // ---------------------------------------------------------------- loading
  async function fetchQuiz() {
    const query = new URLSearchParams({ n: options.n, levels: options.levels.join(','), types: options.types.join(',') });
    try {
      // The dev server's quiz API; elsewhere (GitHub Pages, offline) the quiz is made here.
      const res = await fetch(`api/quiz?${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data?.questions)) throw new Error('not a quiz');
      return { data, local: false };
    } catch {
      return { data: generateQuiz({ n: options.n, levels: options.levels, types: options.types }), local: true };
    }
  }

  async function begin() {
    panel.replaceChildren(el('p', { className: 'quiz-note', textContent: 'Preparing quiz…' }));
    const { data, local } = await fetchQuiz();
    const isSeries = (question) => question.type === 'series' && Array.isArray(question.exampleIds);
    const questions = data.questions
      .map((question) => ({ question, example: isSeries(question) ? null : BY_ID.get(question.exampleId) }))
      .filter((q) => (isSeries(q.question) ? q.question.exampleIds.every((id) => BY_ID.has(id)) : q.example));
    if (!questions.length) {
      renderStart();
      return;
    }
    quiz = { questions, index: 0, answers: [], local };
    renderQuestion();
  }

  // ---------------------------------------------------------------- questions
  const correctCount = () => quiz.answers.reduce((sum, a) => sum + answerPoints(a), 0);
  const totalPoints = () => quiz.questions.reduce((sum, { question }) => sum + questionPoints(question), 0);

  function header(extra = '') {
    return el('div', { className: 'quiz-progress' },
      el('span', { textContent: `Question ${quiz.index + 1} of ${quiz.questions.length}${extra}` }),
      el('span', { textContent: `${correctCount()} correct` }));
  }

  function next() {
    quiz.index++;
    if (quiz.index >= quiz.questions.length) renderSummary();
    else renderQuestion();
  }

  const nextButton = () => button(quiz.index + 1 >= quiz.questions.length ? 'Finish' : 'Next', 'quiz-btn big', next);

  function renderQuestion() {
    const { question, example } = quiz.questions[quiz.index];
    const answer = quiz.answers[quiz.index];
    screen = 'question';
    checkBtn = null;
    if (question.type === 'series') renderSeries(question, answer);
    else if (question.type === 'read') renderRead(question, example, answer);
    else renderWrite(question, example, answer);
  }

  function renderRead(question, example, answer) {
    setPad([]);
    const status = el('div', { className: 'quiz-result' });
    const reveal = el('div', { className: 'ex-meaning' });
    const choices = el('div', { className: 'quiz-choices' });

    function lock(chosenId) {
      const correct = chosenId === example.id;
      quiz.answers[quiz.index] = { correct, chosenId };
      for (const b of choices.children) {
        b.disabled = true;
        b.classList.toggle('chosen', b.dataset.id === chosenId);
        b.classList.toggle('correct', b.dataset.id === example.id);
        b.classList.toggle('wrong', b.dataset.id === chosenId && !correct);
      }
      status.className = `quiz-result ${correct ? 'good' : 'bad'}`;
      status.textContent = correct ? 'Correct' : `Not quite: it says “${example.title}”`;
      // The manual's printed outline (it names the word, so only after answering).
      const printed = printedOutline(example);
      reveal.replaceChildren(...meaningLines(example), ...(printed ? [
        el('div', { className: 'ex-caption', textContent: `In the manual, p. ${printed.page}` }),
        el('div', { className: 'ex-plate' }, printed),
      ] : []));
      panel.append(nextButton());
    }

    choices.append(...question.choices.filter((id) => BY_ID.has(id)).map((id) => choiceButton(id, lock)));
    // The outline on ruled lines too, unlabelled: its size against the rules tells similar strokes apart.
    const ruled = [el('div', { className: 'ex-caption', textContent: 'On the pad, at actual size' }), actualSizeStrip([example], { lineSpacing: pad.lineSpacing, labels: false })];
    panel.replaceChildren(header(), el('div', { className: 'quiz-prompt', textContent: question.prompt }), enlarged(example, !answer), ...ruled, choices, status, reveal);
    if (answer) lock(answer.chosenId);
  }

  function renderWrite(question, example, answer) {
    setPad(answer?.strokes || []);
    const status = el('div', { className: 'quiz-result' });
    const feedback = el('div', {});
    const actions = el('div', { className: 'quiz-actions' });

    function showResult(result, correct) {
      actions.remove();
      checkBtn = null;
      status.className = `quiz-result ${correct ? 'good' : 'bad'}`;
      status.textContent = correct ? 'Correct' : 'Not quite';
      feedback.replaceChildren(...(result ? [scoreBlock(result)] : []), enlarged(example, true), el('div', { className: 'ex-meaning' }, ...meaningLines(example)));
      panel.append(nextButton());
      if (result) assist.drawCheck(result);
    }

    function grade(result) {
      const correct = !!result && result.complete && result.score >= PASS_SCORE;
      if (result) learnWriterScale(result);
      quiz.answers[quiz.index] = { correct, result, strokes: [...pad.strokes] };
      showResult(result, correct);
    }

    checkBtn = button('Check', 'quiz-btn', () => grade(assess(example, pad.strokes)));
    checkBtn.disabled = !pad.strokes.length;
    actions.append(checkBtn, button('I don’t know', 'quiz-btn alt', () => grade(null)));
    panel.replaceChildren(header(), el('div', { className: 'quiz-prompt', textContent: question.prompt }), actions, status, feedback);
    if (answer) showResult(answer.result, answer.correct);
  }

  // ---------------------------------------------------------------- look-alike series
  function renderSeries(question, answer) {
    if (answer?.members) {
      renderSeriesReveal(question, answer);
      return;
    }
    const state = answer || { strokes: [], members: null };
    quiz.answers[quiz.index] = state;
    const step = state.strokes.length;
    const total = question.exampleIds.length;
    const last = step + 1 >= total;
    setPad([]);
    const nextBtn = button(last ? 'Reveal' : 'Next', 'quiz-btn big', () => {
      state.strokes.push(structuredClone(pad.strokes));
      if (state.strokes.length >= total) finishSeries(question, state);
      else renderSeries(question, state);
    });
    nextBtn.disabled = !pad.strokes.length;
    checkBtn = nextBtn;
    panel.replaceChildren(
      header(` · Look-alikes: ${step + 1} of ${total}`),
      el('div', { className: 'quiz-note', textContent: question.prompt }),
      el('div', { className: 'quiz-prompt', textContent: question.prompts[step] }),
      nextBtn,
    );
  }

  // A scored attempt, or null if it could not be assessed.
  function assess(example, strokes) {
    try {
      return assessAttempt(example, strokes, unitPx(), { scale: getWriterScale() });
    } catch (err) {
      console.error('assessment failed', err);
      return null;
    }
  }

  function finishSeries(question, state) {
    state.members = question.exampleIds.map((id, i) => {
      const result = assess(BY_ID.get(id), state.strokes[i]);
      const correct = !!result && result.complete && result.score >= PASS_SCORE;
      return { id, result, correct };
    });
    renderSeriesReveal(question, state);
  }

  function seriesRow(question, state, i) {
    const example = BY_ID.get(question.exampleIds[i]);
    const { result, correct } = state.members[i];
    const qualifier = /\(([^)]*)\)/.exec(question.prompts[i]);
    const label = `${example.title}${qualifier ? ` (${qualifier[1]})` : ''}`;
    const first = result?.critiques?.[0]?.text || (result ? '' : 'Could not be assessed');
    return el('li', { className: `series-row ${correct ? 'good' : 'bad'}` },
      el('b', { className: 'series-label', textContent: label }),
      overlaySVG(state.strokes[i], result, unitPx()),
      el('span', { className: 'series-mark', textContent: correct ? '✓' : '✗' }),
      el('span', { className: 'series-score', textContent: result ? String(result.score) : '–' }),
      el('span', { className: 'series-note', textContent: first }));
  }

  function renderSeriesReveal(question, state) {
    setPad([]);
    checkBtn = null;
    const got = state.members.filter((m) => m.correct).length;
    const rows = question.exampleIds.map((_, i) => seriesRow(question, state, i));
    panel.replaceChildren(
      header(),
      el('div', { className: 'quiz-prompt', textContent: `Look-alikes: ${got} of ${state.members.length} correct` }),
      el('ul', { className: 'series-list' }, ...rows),
      el('p', { className: 'quiz-note', textContent: 'Blue is your ink; green/red is the correct pattern, all at the same scale.' }),
      nextButton(),
    );
  }

  // ---------------------------------------------------------------- summary
  function renderSummary() {
    screen = 'summary';
    setPad([]);
    const total = totalPoints();
    const correct = correctCount();
    saveResult({ date: new Date().toISOString(), correct, total, levels: options.levels, types: options.types });
    const missed = quiz.questions.flatMap(({ question, example }, i) => {
      const answer = quiz.answers[i];
      if (question.type !== 'series') return answer?.correct ? [] : [`${question.prompt} → ${example.title}`];
      return question.exampleIds.flatMap((id, k) => (answer?.members?.[k]?.correct ? [] : [`${question.prompts[k]} → ${BY_ID.get(id).title}`]));
    });
    const list = el('ol', { className: 'quiz-missed' }, ...missed.map((text) => el('li', { textContent: text })));
    panel.replaceChildren(
      el('h2', { textContent: `You got ${correct} of ${total}` }),
      el('h3', { textContent: missed.length ? 'Missed' : 'Perfect score!' }),
      ...(missed.length ? [list] : []),
      button('New quiz', 'quiz-btn big', begin),
      button('Back', 'quiz-btn big alt', renderStart),
      ...(quiz.local ? [el('p', { className: 'quiz-note', textContent: 'Generated on this device' })] : []),
    );
  }

  return {
    // A finished quiz (or none) shows the start screen; an unfinished one resumes.
    show() {
      if (screen === 'question') renderQuestion();
      else renderStart();
    },
    onPadChange() {
      if (checkBtn) checkBtn.disabled = !pad.strokes.length;
    },
  };
}
