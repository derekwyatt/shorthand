// "About this outline": a small window that gathers what a learner needs for the outline in
// front of them (what it says, what each part is, how the parts join, the rule it shows and
// where the Manual teaches it), every point with its § so the Manual's own words are a tap
// away. And "Unit in brief": the rules of a lesson unit on one page.
import { el, button, outLink } from './dom.js';
import { openPopup, linkSections, unitOfParagraph, openManual } from './manualtext.js';
import { TOKEN_NOTES, JOIN_NOTES, CIRCLE_NOTES, KIND_NOTES } from '../data/notes.js';
import { LESSONS } from '../data/lessons.js';
import { sourceUrl } from '../data/source.js';
import { pageLink } from './practice.js';
import { wordRows, wordTable } from './wordhelp.js';

const sec = ([a, b]) => `§${a}${b > a ? `–${b}` : ''}`;

// Where each example is first met in the lessons: { unit, title, ref } of the read step
// before it (or showing it).
const TAUGHT = new Map();
for (const l of LESSONS) {
  let last = null;
  for (const s of l.steps) {
    if (s.type === 'read') last = s;
    const ids = s.type === 'read' ? s.show : s.example ? [s.example] : [];
    for (const id of ids) if (!TAUGHT.has(id)) TAUGHT.set(id, { unit: l.unit, title: last?.title ?? l.subtitle, ref: last?.ref ?? '' });
  }
}
export const taughtIn = (id) => TAUGHT.get(id) ?? null;

const tokensOf = (example) => example.outline ?? example.words?.flatMap((w) => w.tokens) ?? [];

const CIRCLES = new Set(['a', 'e', 'i']);
const CURVES = new Set(['k', 'g', 'r', 'l', 'p', 'b', 'f', 'v', 's-left', 's-right', 'th-over', 'th-under', 'ten', 'tem', 'nd', 'md', 'ld', 'def', 'jnt']);
const STRAIGHT = new Set(['n', 'm', 'men', 't', 'd', 'ted', 'sh', 'ch', 'j', 'ng', 'nk']);
const isStroke = (t) => CURVES.has(t) || STRAIGHT.has(t);

// The joining notes for one outline: the pairs of strokes it joins (§19–21, §37–39), and the
// circle rules (§11–18) when it has a vowel circle.
export function joiningNotes(tokens) {
  const out = [];
  const seen = new Set();
  const add = (text, range) => { if (!seen.has(text)) { seen.add(text); out.push([text, range]); } };
  for (let i = 1; i < tokens.length; i++) {
    const hit = JOIN_NOTES.find(([[a, b]]) => tokens[i - 1] === a && tokens[i] === b);
    if (hit) add(hit[1], hit[2]);
  }
  // A sentence's words are separate outlines: the circle rules go by each word's strokes.
  const strokes = tokens.filter(isStroke);
  tokens.forEach((t, i) => {
    if (!CIRCLES.has(t)) return;
    const before = tokens.slice(0, i).reverse().find((x) => isStroke(x) || x === 'period');
    const after = tokens.slice(i + 1).find((x) => isStroke(x) || x === 'period');
    const neighbours = [before, after].filter((x) => x && x !== 'period');
    if (neighbours.length === 2 && strokes.length > 1) add(...CIRCLE_NOTES.between);
    else if (neighbours.length) add(...CIRCLE_NOTES[CURVES.has(neighbours[0]) ? 'curve' : 'straight']);
  });
  return out;
}

// The parts of an outline, each once, in writing order.
export function partNotes(tokens) {
  return [...new Set(tokens)].filter((t) => TOKEN_NOTES[t]).map((t) => TOKEN_NOTES[t]);
}

const heading = (text) => el('h3', { className: 'explain-h', textContent: text });
const para = (text) => el('p', { textContent: text });
const withSec = (text, range) => el('p', {}, `${text} (${sec(range)})`);

// The § ranges a set of notes cites, for the footer's links to the source site.
function siteLinks(ranges) {
  const key = (r) => sec(r);
  const unique = [...new Map(ranges.map((r) => [key(r), r])).values()].sort((x, y) => x[0] - y[0]);
  return unique.filter(([a]) => unitOfParagraph(a)).map(([a, b]) => outLink(sourceUrl.unit(unitOfParagraph(a), a), sec([a, b])));
}

// The window for one example.
export function showExplain(example) {
  const tokens = tokensOf(example);
  const kind = KIND_NOTES[example.kind];
  const parts = partNotes(tokens);
  // A joining rule the example's own rule line already gives is not repeated.
  const own = new Set([...example.meaning.join(' ').matchAll(/§(\d+)/g)].map((m) => Number(m[1])));
  const joins = joiningNotes(tokens).filter(([, [a]]) => !own.has(a));
  const taught = taughtIn(example.id);
  const page = /p\. (\d+)/.exec(example.source ?? '');
  const cited = [...parts.map((p) => p[2]), ...joins.map((j) => j[1]), ...(kind ? [kind[2]] : [])];
  for (const m of [...example.meaning.join(' ').matchAll(/§(\d+)(?:[–-](\d+))?/g), ...(taught?.ref ?? '').matchAll(/§(\d+)(?:[–-](\d+))?/g)]) cited.push([Number(m[1]), Number(m[2] ?? m[1])]);

  const body = el('div', { className: 'section-pop-body explain-body' },
    heading('What it is'),
    ...example.meaning.map(para),
    ...(kind ? [withSec(`${kind[0]}: ${kind[1]}`, kind[2])] : []),
    ...(parts.length ? [heading('Its parts'), el('ul', { className: 'explain-list' }, ...parts.map(([name, text, range]) => el('li', {}, el('b', { textContent: name }), `: ${text} (${sec(range)})`)))] : []),
    ...(joins.length ? [heading('How the parts join'), el('ul', { className: 'explain-list' }, ...joins.map(([text, range]) => el('li', { textContent: `${text} (${sec(range)})` })))] : []),
    // A sentence: every word, with its outline and how it is written.
    ...(example.kind === 'sentence' ? [heading('Each word'), wordTable(wordRows(example.title, { unit: taught?.unit ?? null }))] : []),
    heading('Where it is taught'),
    el('p', {}, ...(taught ? [`Unit ${taught.unit}, “${taught.title}”${taught.ref ? ` (${taught.ref})` : ''}.`] : ['Practice only.']),
      ...(page ? [' Printed in the Manual on ', pageLink(Number(page[1])), '.'] : [])),
    el('p', { className: 'ex-caption', textContent: 'Tap a § to read the Manual’s own words.' }));
  linkSections(body);
  openPopup({
    title: `About “${example.title}”`,
    body,
    className: 'explain-pop',
    reopen: () => showExplain(example),
    foot: [el('span', { className: 'explain-foot' }, 'On greggshorthand.github.io: ', ...siteLinks(cited).flatMap((a, i) => (i ? [' · ', a] : [a])))],
  });
}

// The inline button that opens it.
export function explainLink(example, text = 'About this outline') {
  const b = el('button', { type: 'button', className: 'inline-link explain-link', textContent: `ⓘ ${text}`, title: `What to know about “${example.title}”, with the Manual’s paragraphs` });
  b.onclick = (e) => {
    e.stopPropagation();
    showExplain(example);
  };
  return b;
}

// The first sentence or two of a step's text, for the overview.
function gist(text) {
  if (text.length <= 260) return text;
  const cut = text.slice(0, 260);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.” '), cut.lastIndexOf('; '));
  return `${end > 80 ? cut.slice(0, end + 1) : cut.trimEnd()} …`;
}

const SKIP = /^(Reading practice|Writing Practice|Putting it together)$/;

// "Unit in brief": every rule step of the unit, with its § and the gist of its explanation.
export function showUnitOverview(lesson) {
  const rules = lesson.steps.filter((s) => s.type === 'read' && !SKIP.test(s.title));
  const body = el('div', { className: 'section-pop-body explain-body' },
    el('p', { className: 'ex-caption', textContent: `Manual ${lesson.pages}. Each point gives the § where the Manual teaches it: tap one for its own words.` }),
    el('ol', { className: 'explain-list' }, ...rules.map((s) => el('li', {},
      el('b', { textContent: s.title }), ` (${s.ref.replace(/^Manual /, '')})`,
      el('br'), gist(s.text[0] ?? '')))));
  linkSections(body);
  const close = openPopup({
    title: `${lesson.title} in brief`,
    body,
    className: 'explain-pop',
    reopen: () => showUnitOverview(lesson),
    foot: [
      outLink(sourceUrl.unit(lesson.unit), `Unit ${lesson.unit} on greggshorthand.github.io`),
      button('Whole unit ›', 'inline-link', () => { close(); openManual(lesson.unit); }),
    ],
  });
}
