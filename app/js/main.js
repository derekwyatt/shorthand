import { InkPad, sampleRate } from './ink.js';
import { buildGallery } from './gallery.js';
import { buildReference } from './reference.js';
import { createExamplePanel } from './practice.js';
import { EXAMPLES, LEVELS } from '../data/examples.js';
import { U_PER_LINE } from '../data/strokes.js';
import { assessRepeats, repeatIndexFor } from './repeats.js';
import { createAssist } from './assist.js';
import { createQuiz } from './quiz.js';
import { createLessons } from './lessons.js';
import { createLinePicks } from './linepicks.js';
import { watchSections } from './manualtext.js';
import { exportProgress, importProgress, backupFileName } from './backup.js';
import { getWriterScale, learnWriterScale } from './writer.js';
import { el, saveFile } from './dom.js';
import { createUi } from './ui.js';
import { buildHome } from './home.js';

// v2: strokes are kept per example. (v1 kept one global page; it is ignored.)
const STORE_KEY = 'gregg.practice.v2';
const $ = (id) => document.getElementById(id);

const saved = loadSaved();
const spacingInput = $('spacing');
const penInput = $('pen-width');
const fingerInput = $('finger');
let index = Math.min(Math.max(0, EXAMPLES.findIndex((e) => e.id === saved.exampleId)), EXAMPLES.length - 1);
const currentExample = () => EXAMPLES[index];
// The example the guide follows: the practice example, or the lesson's write step.
const guidedExample = () => (inLessons() ? lessons.example() : currentExample());

const guideInput = $('guide-on');
const unitPx = () => pad.lineSpacing / U_PER_LINE;
const inQuiz = () => document.body.classList.contains('view-quiz');
const inLessons = () => document.body.classList.contains('view-learn');

const pad = new InkPad($('ink'), {
  lineSpacing: saved.lineSpacing,
  lineWidth: saved.penWidth,
  acceptTouch: saved.acceptTouch,
  onStrokeStart: (stroke) => { if (!inQuiz()) assist.strokeStart(stroke, pad.strokes); },
  onStrokeMove: (stroke) => { if (!inQuiz()) assist.strokeMove(stroke); },
  onChange: (stroke) => {
    if (inQuiz()) {
      quiz.onPadChange();
      return;
    }
    if (inLessons()) {
      const result = lessons.onPadChange();
      if (stroke && result) assist.afterStroke(result, stroke);
      if (!pad.strokes.length) assist.reset();
      return;
    }
    const id = currentExample().id;
    const prev = saved.attempts[id];
    const result = evaluate();
    // Learn the writer's size each time another repeat is completed.
    if (result?.lastCompleted && result.completedCount > (prev?.assessment?.completedCount ?? 0)) learnWriterScale(result.lastCompleted);
    saved.attempts[id] = { strokes: pad.toJSON().strokes, exportedAt: prev?.exportedAt ?? null, assessment: summary(result) };
    persist();
    showStats(stroke);
    showStatus();
    showAssessment(result);
    assist.drawCheck(result);
    if (stroke) assist.afterStroke(result, stroke);
    if (!pad.strokes.length) assist.reset();
  },
});

const panel = createExamplePanel({
  art: $('ex-art'), title: $('ex-title'), meaning: $('ex-meaning'), source: $('ex-source'), counter: $('ex-counter'),
  score: $('ex-score'), verdict: $('ex-verdict'), hint: $('ex-repeat-hint'), critiques: $('ex-critiques'),
});
const assist = createAssist({ overlay: $('guide'), check: $('check'), hint: $('hint'), model: $('model'), modelOf: () => ({ example: inQuiz() ? null : guidedExample(), scale: getWriterScale(), lineSpacing: pad.lineSpacing }), unitPx, nextIndex: (strokes, point) => repeatIndexFor(guidedExample(), strokes, point, { unitPx: unitPx(), lineSpacing: pad.lineSpacing, scale: getWriterScale() }), enabled: () => guideInput.checked && !inQuiz() && !!guidedExample() });
createUi({ menuButton: $('menu-btn'), menu: $('menu'), themes: $('themes'), split: $('split'), area: $('practice'), onTheme: () => pad.redraw() });
const quiz = createQuiz({ panel: $('quiz-panel'), pad, assist, unitPx });
const practicePicks = createLinePicks({ box: $('line-picks'), pad, unitPx, evaluate, show: (r, opts) => panel.showAssessment(r, opts) });
const lessons = createLessons({ panel: $('lesson-panel'), pad, assist, unitPx, linePicks: $('line-picks') });

spacingInput.value = saved.lineSpacing;
fingerInput.checked = saved.acceptTouch;
penInput.value = saved.penWidth;
$('pen-width-out').value = `${saved.penWidth}px`;
guideInput.checked = saved.guide;
guideInput.addEventListener('change', () => {
  saved.guide = guideInput.checked;
  if (!guideInput.checked) assist.reset();
  assist.drawModel();
  persist();
});
// Levels with a manual unit are grouped apart from the basics.
const levelSelect = $('level-select');
for (const [label, levels] of [['Basics', LEVELS.filter((l) => !l.unit)], ['Manual units', LEVELS.filter((l) => l.unit)]]) {
  if (!levels.length) continue;
  levelSelect.append(el('optgroup', { label }, ...levels.map((l) => el('option', { value: String(l.id), textContent: `${l.id} · ${l.name}`, title: l.description }))));
}
levelSelect.addEventListener('change', () => goTo(EXAMPLES.findIndex((e) => e.level === Number(levelSelect.value))));
applySpacing(saved.lineSpacing);
goTo(index, { animate: true });

spacingInput.addEventListener('input', () => {
  applySpacing(Number(spacingInput.value));
  if (inLessons()) lessons.refresh();
  else {
    showPanel(false);
    refreshAssessment();
  }
  assist.drawModel();
  persist();
});
penInput.addEventListener('input', () => {
  pad.lineWidth = Number(penInput.value);
  $('pen-width-out').value = `${pad.lineWidth}px`;
  pad.redraw();
  persist();
});
fingerInput.addEventListener('change', () => {
  pad.acceptTouch = fingerInput.checked;
  persist();
});
$('undo').addEventListener('click', () => pad.undo());
$('clear').addEventListener('click', () => pad.clear());
$('export').addEventListener('click', exportJSON);
$('ex-prev').addEventListener('click', () => goTo(index - 1));
$('ex-next').addEventListener('click', () => goTo(index + 1));
$('ex-replay').addEventListener('click', () => panel.replay());
// Back up: share sheet where available (lets the user pick Drive / Files), else a download.
$('backup').addEventListener('click', () => {
  const text = JSON.stringify(exportProgress(localStorage), null, 2);
  saveFile(new File([text], backupFileName(new Date()), { type: 'application/json' }));
});
$('restore').addEventListener('click', () => $('restore-file').click());
$('restore-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (!window.confirm(`Restore progress from ${file.name}?\n\nThis replaces all progress on this device: lessons, practice, quiz history and your learned writing size.`)) return;
    importProgress(localStorage, backup);
    location.reload();
  } catch (err) {
    window.alert('That file could not be restored: ' + err.message);
  }
});
$('reset-all').addEventListener('click', () => {
  const ok = window.confirm('Reset everything?\n\nThis clears all practice strokes and scores, quiz history, export marks, settings and your learned writing size. It can’t be undone.');
  if (!ok) return;
  for (const key of Object.keys(localStorage)) if (key.startsWith('gregg.')) localStorage.removeItem(key);
  location.hash = '#pad';
  location.reload();
});

// Routing between views: #home (default), #pad (practice), #learn and #quiz (both share the
// pad), #strokes and #ref.
const VIEWS = ['home', 'pad', 'learn', 'strokes', 'quiz', 'ref'];
let home = null;
let gallery = null;
let reference = null;
let lastView = null;
// An address is #view, or #ref/<section> to open a Reference section.
function route() {
  const [name, section] = location.hash.slice(1).split('/');
  const view = VIEWS.includes(name) ? name : 'home';
  for (const v of VIEWS) document.body.classList.toggle(`view-${v}`, v === view);
  for (const m of document.querySelectorAll('.view')) m.hidden = !m.dataset.view.split(' ').includes(view);
  const wasElsewhere = lastView !== null && lastView !== 'pad';
  lastView = view;
  if (view === 'quiz') quiz.show();
  else if (view === 'learn') lessons.show();
  else if (wasElsewhere && view === 'pad') goTo(index, { animate: false });
  for (const a of document.querySelectorAll('.modes a')) a.classList.toggle('active', a.dataset.view === view);
  assist.drawModel();
  if (view === 'home') home ??= buildHome($('home'));
  if (view === 'ref') {
    reference ??= buildReference($('reference'));
    if (section) reference.open(section);
  }
  if (view === 'strokes') {
    const first = !gallery;
    gallery ??= buildGallery($('gallery'));
    if (first) gallery.replayAll();
  }
}
// Every § in the app's text links to the Manual on the source site.
watchSections(document.body);
window.addEventListener('hashchange', route);
route();
$('replay-all').addEventListener('click', () => gallery?.replayAll());

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    pad.undo();
  } else if (document.body.classList.contains('view-pad') && e.key === 'ArrowRight') {
    goTo(index + 1);
  } else if (document.body.classList.contains('view-pad') && e.key === 'ArrowLeft') {
    goTo(index - 1);
  } else if (inLessons() && e.key === 'ArrowRight') {
    lessons.next();
  } else if (inLessons() && e.key === 'ArrowLeft') {
    lessons.prev();
  }
});
// iOS Safari ignores user-scalable=no; block pinch and double-tap zoom on the whole page.
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

function goTo(i, { animate = true } = {}) {
  if (i < 0 || i >= EXAMPLES.length) return;
  index = i;
  const ex = currentExample();
  saved.exampleId = ex.id;
  practicePicks.reset();
  pad.load(InkPad.strokesFromJSON({ strokes: saved.attempts[ex.id]?.strokes || [] }));
  showPanel(animate);
  assist.setExample(ex);
  refreshAssessment();
  levelSelect.value = String(ex.level);
  $('ex-prev').disabled = index === 0;
  $('ex-next').disabled = index === EXAMPLES.length - 1;
  persist();
  showStats(null);
  showStatus();
}

// The panel counts examples within the current level.
function showPanel(animate) {
  const ex = currentExample();
  const same = EXAMPLES.filter((e) => e.level === ex.level);
  panel.show(ex, { index: same.indexOf(ex), total: same.length, lineSpacing: pad.lineSpacing, animate });
}

function evaluate(strokes = pad.strokes) {
  try {
    return assessRepeats(currentExample(), strokes, { unitPx: unitPx(), lineSpacing: pad.lineSpacing, scale: getWriterScale() });
  } catch (err) {
    console.error('assessment failed', err);
    return null;
  }
}

function refreshAssessment() {
  if (inQuiz() || inLessons()) return;
  const result = evaluate();
  showAssessment(result);
  assist.drawCheck(result);
}

// The panel shows the stats for every line, or for the one line picked on the pad.
function showAssessment(full) {
  practicePicks.update(full);
}

const summary = (r) => (r ? { score: r.score, complete: r.complete, completedCount: r.completedCount, count: r.count, correctCount: r.correctCount, best: r.best, critiques: r.critiques.map(({ level, text }) => ({ level, text })) } : null);

function applySpacing(px) {
  pad.lineSpacing = px;
  document.documentElement.style.setProperty('--line-spacing', `${px}px`);
  $('spacing-out').value = `${px}px`;
}

function showStats(stroke) {
  const n = pad.strokes.length;
  let text = `${n} stroke${n === 1 ? '' : 's'}`;
  if (stroke) {
    text += ` · last: ${stroke.points.length} pts, ${Math.round(sampleRate(stroke))} Hz, ${stroke.pointerType}`;
  }
  $('stats').textContent = text;
}

function showStatus() {
  const done = Object.values(saved.attempts).filter((a) => a.exportedAt).length;
  const at = saved.attempts[currentExample().id]?.exportedAt;
  const mine = at ? `Exported ✓ ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
  $('ex-status').textContent = [mine, `${done} of ${EXAMPLES.length} exported`].filter(Boolean).join(' · ');
}

function loadSaved() {
  const defaults = { lineSpacing: 48, penWidth: 2.2, acceptTouch: false, guide: true, exampleId: null, attempts: {} };
  try {
    const s = { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY)) };
    s.attempts ??= {};
    return s;
  } catch {
    return defaults;
  }
}

function persist() {
  saved.lineSpacing = pad.lineSpacing;
  saved.acceptTouch = pad.acceptTouch;
  saved.penWidth = pad.lineWidth;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
  } catch {
    // Storage full or unavailable (private mode): the pad still works, it just won't survive a reload.
  }
}

// What Export writes: the pad's strokes plus the example they copy.
export function buildExport() {
  const ex = currentExample();
  return {
    ...pad.toJSON(),
    example: { id: ex.id, kind: ex.kind, title: ex.title, outline: ex.outline, meaning: ex.meaning, source: ex.source, ...(ex.words ? { words: ex.words } : {}) },
    assessment: summary(evaluate()),
  };
}

async function exportJSON() {
  const payload = buildExport();
  const json = JSON.stringify(payload);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const name = `gregg-${payload.example.id}-${stamp}.json`;
  const file = new File([json], name, { type: 'application/json' });

  if (!(await saveFile(file))) return;
  saved.attempts[payload.example.id] = { strokes: payload.strokes, exportedAt: Date.now() };
  persist();
  showStatus();
}

// Offline: the service worker keeps every file of the app on the device (see sw.js).
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch((err) => console.warn('offline support unavailable', err));
