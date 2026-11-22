// "How each word is written": for a reading, a drill or a sentence, a table with one row per
// word or phrase (in the order they first occur): its outline and how it is written, with the
// Manual's paragraphs. Rows come from what the app can stand behind:
//   example  an outline the app draws (Practice), with its rule and the unit that teaches it
//   chart    a brief form from the chart at greggshorthand.github.io (its printed image)
//   abbr     a business abbreviation (§24, §44), shown in the Manual
//   built    one of those with an ending the Manual teaches: ing (§3), s (§46–55), the past
//            tense (§59), ly (§80–82)
//   sound    not printed in the Manual's lists: the outline the rules taught so far give it
//            (js/bysound.js), marked as derived
//   name     a capitalised word not at the start of a sentence: written by sound, capital mark
//   unknown  none of these: written by sound with the rules taught so far
import { el, outLink } from './dom.js';
import { EXAMPLES, spell as spellOutline } from '../data/examples.js';
import { BRIEF_FORMS } from '../data/briefs.js';
import { MANUAL_TEXT } from '../data/manual.js';
import { sourceUrl } from '../data/source.js';
import { openPopup, linkSections, unitOfParagraph } from './manualtext.js';
import { taughtIn, joiningNotes } from './explain.js';
import { soundOutline, withEnding, decompose } from './bysound.js';
import { enlargedSVG } from './practice.js';

const sec = ([a, b]) => `§${a}${b > a ? `–${b}` : ''}`;

// The paragraph of each unit that lists its brief forms, and of the units with frequent phrases.
const HEADED = (re) => new Map(Object.entries(MANUAL_TEXT).flatMap(([u, d]) => d.blocks.flatMap(([, h]) => {
  const m = re.exec(h.replace(/<[^>]+>/g, ''));
  return m ? [[Number(u), Number(m[1])]] : [];
})));
const BRIEF_PARA = new Map([[1, 3], [2, 23], ...HEADED(/^(\d+)\. Brief Forms for Common Words/)]);
const PHRASE_PARA = new Map([[1, 4], [3, 31], ...HEADED(/^(\d+)\. Frequent Phrases/)]);

// Outlines the app draws: words, brief forms and phrases by each of their titles; phrases also
// from the sentences (the §4 phrases joined in them).
const EXAMPLE = new Map();
for (const kind of ['phrase', 'brief', 'word']) {
  for (const e of EXAMPLES.filter((x) => x.kind === kind)) {
    for (const t of e.title.split(' / ')) if (!EXAMPLE.has(t.toLowerCase())) EXAMPLE.set(t.toLowerCase(), e);
  }
}
for (const s of EXAMPLES.filter((x) => x.kind === 'sentence')) {
  for (const w of s.words.filter((x) => x.phrase)) {
    const key = w.text.toLowerCase();
    if (!EXAMPLE.has(key)) EXAMPLE.set(key, { id: `${s.id}:${key}`, kind: 'phrase', title: w.text, outline: w.tokens, meaning: [`The phrase “${w.text}”, written as one outline (Manual §4).`] });
  }
}
const CHART = new Map(BRIEF_FORMS.flatMap((f) => f[0].split(/[,;]\s*/).map((w) => [w.trim().toLowerCase().replace(/\.$/, ''), f])));
const ABBR = new Map([['dear sir', 24], ['yours truly', 24], ['mr', 24], ['dear madam', 44], ['very truly yours', 44], ['yours very truly', 44]]);
const LONGEST = Math.max(...[...EXAMPLE.keys(), ...ABBR.keys()].map((k) => k.split(' ').length));

// The spelled outline of an example ("k + a + t"), from the first line of its meaning.
const spelled = (e) => (/: ([^:]+?)(?: \(Manual[^)]*\))?\.$/.exec(e.meaning[0]) ?? [])[1] ?? e.outline?.join(' + ') ?? '';

// `unit`: the unit of the text being read. An outline the lessons only teach later is still
// shown, with a warning that this earlier page may write the word otherwise.
function exampleRow(e, unit) {
  const t = taughtIn(e.id);
  const later = unit && t && t.unit > unit ? ` The app teaches this form in Unit ${t.unit}; this earlier page may write the word otherwise.` : '';
  // A brief form's own paragraph: from its source line, else its unit's brief-form paragraph.
  const own = /§(\d+)/.exec(e.source ?? '');
  const unitPara = (map) => (t && map.get(t.unit)) || null;
  const spell = spelled(e);
  // A brief form's spelling is a sentence ("the single stroke r stands for …"); a word's, its strokes.
  const lead = !spell ? '' : spell.startsWith('the ') ? `T${spell.slice(1)}. ` : `Written ${spell}. `;
  if (e.kind === 'brief') {
    const p = own ? Number(own[1]) : unitPara(BRIEF_PARA) ?? 23;
    return { kind: 'example', example: e, spell: spelled(e), how: `${lead}A brief form (§${p}).${e.meaning[1] ? ` ${e.meaning[1]}` : ''}${later}`, refs: [[p, p]] };
  }
  if (e.kind === 'phrase') {
    const p = unitPara(PHRASE_PARA) ?? 4;
    return { kind: 'example', example: e, spell: spelled(e), how: `${lead}A phrase, written as one outline (§${p}).${e.meaning[1] ? ` ${e.meaning[1]}` : ''}${later}`, refs: [[p, p]] };
  }
  return { kind: 'example', example: e, spell: spelled(e), how: `${lead}${e.meaning.slice(1).join(' ')}${later}`.trim(), refs: [] };
}

// A phrase the lessons only teach after `unit` is not offered for that unit's text: its words
// are looked up one by one instead.
const phraseFits = (key, unit) => {
  const e = EXAMPLE.get(key);
  const t = e && taughtIn(e.id);
  return !unit || !t || t.unit <= unit;
};

function direct(w, unit) {
  if (EXAMPLE.has(w)) return exampleRow(EXAMPLE.get(w), unit);
  if (ABBR.has(w)) {
    const p = ABBR.get(w);
    return { kind: 'abbr', chart: CHART.get(w) ?? null, how: `A business abbreviation (§${p}).`, refs: [[p, p]] };
  }
  if (CHART.has(w)) return { kind: 'chart', chart: CHART.get(w), spell: CHART.get(w)[1], how: 'A brief form (what a brief form is: §23); its outline is the one on the brief-form chart.', refs: [[23, 23]] };
  return null;
}

// Endings the Manual teaches, tried in turn: [suffix, bases, what is added, §, the ending for
// withEnding()].
const ENDINGS = [
  ['ings', (b) => [b, `${b}e`], 'ings, a left s', [106, 106], 'ings'],
  ['ing', (b) => [b, `${b}e`, b.length > 2 && b.at(-1) === b.at(-2) ? b.slice(0, -1) : null], 'the ing dot', [3, 3], 'ing'],
  ['ies', (b) => [`${b}y`], 's', [46, 55], 's'],
  ['es', (b) => [b, `${b}e`], 's', [46, 55], 's'],
  ['s', (b) => [b], 's', [46, 55], 's'],
  ['ied', (b) => [`${b}y`], 'the past tense', [59, 59], 'ed'],
  ['ed', (b) => [b, `${b}e`, b.length > 2 && b.at(-1) === b.at(-2) ? b.slice(0, -1) : null], 'the past tense (t or d)', [59, 59], 'ed'],
  ['d', (b) => [b], 'the past tense (t or d)', [59, 59], 'ed'],
  ['ly', (b) => [b, `${b}le`], 'ly, a small circle', [80, 82], 'ly'],
];

// §61: a brief form used as part of another word (inform, become): [prefix, its strokes, unit].
const BRIEF_PREFIXES = [['in', ['n'], 6], ['con', ['k'], 9], ['com', ['k'], 9], ['un', ['n'], 12], ['be', ['b'], 18], ['re', ['r'], 18]];

const outlineOf = (row) => row?.example?.outline ?? row?.outline ?? null;
const SOUND_NOTE = 'Not in the Manual’s word lists: the outline the rules so far give it; the printed page may write it otherwise.';

// A word written by sound (js/bysound.js): its outline, the rules used, and the joinings.
function soundRow(w, unit) {
  const s = soundOutline(w, unit ?? 36);
  if (!s) return null;
  const rules = s.rules.filter(([, [a]]) => a > 1);
  const joins = joiningNotes(s.outline).filter(([, [a]]) => !rules.some(([, [b]]) => b === a));
  const all = [...rules, ...joins];
  return {
    kind: 'sound', outline: s.outline, example: { id: `sound-${w}`, kind: 'word', title: w, outline: s.outline },
    how: `By sound: ${spellOutline(s.outline)}.${all.length ? ` ${all.map(([t, r]) => `${t[0].toUpperCase()}${t.slice(1)} (${sec(r)})`).join('. ')}.` : ''} ${SOUND_NOTE}`,
    refs: [[1, 1], ...all.map(([, r]) => r)],
  };
}

function resolve(w, unit, depth = 0, bySound = true) {
  const hit = direct(w, unit);
  if (hit || depth > 1) return hit;
  // A base the Manual prints comes first; a base by sound only when the pronunciations agree
  // that the word is it plus the ending (taking is take + ing, not "tak").
  const split = decompose(w);
  for (const pass of bySound ? [false, true] : [false])
  for (const [suffix, bases, added, refs, ending] of ENDINGS) {
    if (!w.endsWith(suffix) || w.length - suffix.length < 2) continue;
    for (const b of bases(w.slice(0, -suffix.length)).filter(Boolean)) {
      if (pass && split?.base !== b) continue;
      const base = resolve(b, unit, depth + 1, pass);
      if (!base) continue;
      // The whole outline, when the base has one: the ending joined to it.
      const parts = decompose(w);
      const baseOutline = outlineOf(base);
      const outline = baseOutline && (ending === 'ings'
        ? (unit ?? 36) >= 12 ? [...baseOutline.filter((t) => !t.startsWith('v-')), 's-left'] : null
        : withEnding(baseOutline, ending, unit ?? 36, parts?.base === b ? parts.added : ending === 'ed' ? (/[td]$/.test(b) ? 'IH0 D' : 'D') : ''));
      return {
        kind: 'built', base: { ...base, text: b }, outline: outline ?? null,
        example: outline ? { id: `built-${w}`, kind: 'word', title: w, outline } : null,
        how: `“${b}” (${baseOutline ? spellOutline(baseOutline) : base.spell ?? 'its outline'}) + ${added} (${sec(refs)}).${base.kind === 'sound' ? ` ${SOUND_NOTE}` : ''}`,
        refs: [refs, ...base.refs],
      };
    }
  }
  for (const [prefix, strokes, u] of BRIEF_PREFIXES) {
    const rest = EXAMPLE.get(w.slice(prefix.length));
    if (!w.startsWith(prefix) || !rest || rest.kind !== 'brief' || w.length - prefix.length < 3 || (unit ?? 36) < u) continue;
    const outline = [...strokes, ...rest.outline];
    return {
      kind: 'built', outline, example: { id: `built-${w}`, kind: 'word', title: w, outline },
      how: `“${prefix}” (${spellOutline(strokes)}) + the brief form for “${rest.title.split(' / ')[0]}” (${spellOutline(rest.outline)}): a brief form used as part of another word (§61).`,
      refs: [[61, 61]],
    };
  }
  return bySound ? soundRow(w, unit) : null;
}

function rowFor(key, word, initial, unit) {
  const name = /^[A-Z]/.test(word) && !initial;
  const hit = resolve(key, unit, 0, !name);
  if (hit) return hit;
  const parts = key.split('-');
  if (parts.length > 1 && parts.every((p) => resolve(p, unit))) {
    return { kind: 'built', parts: parts.map((p) => ({ ...resolve(p, unit), text: p })), how: `${parts.map((p) => `“${p}”`).join(' + ')}, joined.`, refs: parts.flatMap((p) => resolve(p, unit).refs) };
  }
  if (name) {
    const s = soundOutline(key, unit ?? 36);
    const outline = s && [...s.outline, 'cap'];
    return {
      kind: 'name', outline, example: outline ? { id: `name-${key}`, kind: 'word', title: word, outline } : null,
      how: `A name: written by sound (§1)${s ? `, ${spellOutline(s.outline)},` : ''} with the capital mark, two short dashes, under it (§5).`,
      refs: [[1, 1], [5, 5]],
    };
  }
  return { kind: 'unknown', how: `Written by sound (§1)${unit ? ` with the rules of Units 1–${unit}` : ''}. A sound or joining in it is beyond what the app can derive, so it has no outline here.`, refs: [[1, 1]] };
}

// Rows for `text` (a string or paragraphs): each word or phrase once, in order of first use.
// `unit`: the unit the text belongs to, for the words the app has no outline for.
export function wordRows(text, { unit = null } = {}) {
  const rows = new Map();
  const paras = Array.isArray(text) ? text : [text];
  for (const para of paras) {
    // Runs of words between punctuation (a phrase never crosses it); a word is `initial` at the
    // start of a sentence: after . ? ! :, a numbered item or the start of the paragraph.
    const runs = [[]];
    let initial = true;
    for (const [tok] of para.matchAll(/[A-Za-z][A-Za-z'’-]*|\d+|[.?!:;,"“”()—]/g)) {
      if (/^[A-Za-z]/.test(tok)) {
        runs.at(-1).push({ word: tok, initial });
        initial = false;
      } else {
        if (runs.at(-1).length) runs.push([]);
        if (/^[.?!:]$|^\d/.test(tok)) initial = true;
      }
    }
    for (const run of runs) {
      for (let i = 0; i < run.length;) {
        let taken = 0;
        for (let n = Math.min(LONGEST, run.length - i); n >= 2 && !taken; n--) {
          const key = run.slice(i, i + n).map((x) => x.word).join(' ').toLowerCase();
          if (EXAMPLE.has(key) && phraseFits(key, unit) || ABBR.has(key)) {
            if (!rows.has(key)) rows.set(key, { text: run.slice(i, i + n).map((x) => x.word).join(' '), ...direct(key, unit) });
            taken = n;
          }
        }
        if (taken) { i += taken; continue; }
        const { word, initial: first } = run[i];
        const key = word.toLowerCase().replace(/’/g, '\'');
        if (!rows.has(key)) rows.set(key, { text: word, ...rowFor(key, word, first, unit) });
        i++;
      }
    }
  }
  return [...rows.values()];
}

// ---------------------------------------------------------------- the window

function drawing(row) {
  if (row.example && (row.kind === 'sound' || (row.kind === 'built' || row.kind === 'name') && row.outline)) {
    try {
      const svg = enlargedSVG(row.example, { maxUnit: 16, width: 120, height: 44, pad: 4, strokeWidth: 2, label: `Gregg shorthand for ${row.example.title}` });
      svg.classList.add('word-help-svg');
      return el('span', { className: 'word-help-derived' }, svg, ...(row.kind === 'sound' || row.kind === 'name' || row.base?.kind === 'sound' ? [el('span', { className: 'word-help-tag', textContent: 'by sound' })] : []));
    } catch { /* fall through */ }
  }
  if (row.example) {
    const svg = enlargedSVG(row.example, { maxUnit: 16, width: 120, height: 44, pad: 4, strokeWidth: 2, label: `Gregg shorthand for ${row.example.title}` });
    svg.classList.add('word-help-svg');
    return svg;
  }
  if (row.chart) {
    const [words, , file, w, h] = row.chart;
    return el('img', { src: `manual/${file}`, alt: `Brief form for ${words}`, width: Math.round(w * 0.9), height: Math.round(h * 0.9), className: 'word-help-img' });
  }
  if (row.base) return el('span', { className: 'word-help-sum' }, drawing(row.base), el('span', { textContent: ' +' }));
  if (row.parts) return el('span', { className: 'word-help-sum' }, ...row.parts.flatMap((p, i) => [...(i ? [' + '] : []), drawing(p)]));
  return el('span', { className: 'ex-caption', textContent: '—' });
}

const LEGEND = 'Outlines drawn in colour are the app’s; black ones are printed on the brief-form chart. Those marked “by sound” are not in the Manual’s word lists: the app derives them from the rules taught so far, so check them against the page. “—” marks a word the app cannot derive: work it out by sound.';

export function wordTable(rows) {
  return el('table', { className: 'word-help' },
    el('thead', {}, el('tr', {}, ...['Word', 'Outline', 'How it is written'].map((t) => el('th', { textContent: t })))),
    el('tbody', {}, ...rows.map((r) => el('tr', { className: `word-help-${r.kind}` },
      el('td', { className: 'word-help-word', textContent: r.text }),
      el('td', { className: 'word-help-outline' }, drawing(r)),
      el('td', { textContent: r.how })))));
}

// The window: `groups` are [{ caption, text }]; `warn` says when the table gives a key away.
export function showWordHelp({ title, groups, unit = null, warn = true, note = null, links = [] }) {
  const tables = groups.map((g) => ({ caption: g.caption, rows: wordRows(g.text, { unit }) }));
  const all = tables.flatMap((t) => t.rows);
  const known = all.filter((r) => r.kind !== 'unknown').length;
  const refs = [...new Map(all.flatMap((r) => [...r.refs, ...(r.base?.refs ?? [])]).map((r) => [sec(r), r])).values()].sort((a, b) => a[0] - b[0]);
  const body = el('div', { className: 'section-pop-body explain-body' },
    ...(warn ? [el('p', { className: 'ex-caption', textContent: 'This table is a key: read the shorthand first, then use it to check a word or to see why it is written as it is.' })] : []),
    ...(note ? [el('p', { className: 'ex-caption', textContent: note })] : []),
    el('p', { className: 'ex-caption', textContent: `${all.length} words and phrases, ${known} with how they are written. ${LEGEND}` }),
    ...tables.flatMap((t) => [...(t.caption ? [el('h3', { className: 'explain-h', textContent: t.caption })] : []), wordTable(t.rows)]),
    el('p', { className: 'ex-caption', textContent: 'Tap a § to read the Manual’s own words.' }));
  linkSections(body);
  openPopup({
    title, body, className: 'explain-pop word-help-pop',
    reopen: () => showWordHelp({ title, groups, unit, warn, note, links }),
    foot: [el('span', { className: 'explain-foot' }, 'On greggshorthand.github.io: ',
      ...[...refs.filter(([a]) => unitOfParagraph(a)).map(([a, b]) => outLink(sourceUrl.unit(unitOfParagraph(a), a), sec([a, b]))),
        outLink(sourceUrl.briefs, 'brief-form chart'), ...links].flatMap((a, i) => (i ? [' · ', a] : [a])))],
  });
}

export function wordHelpLink(options, text = 'How each word is written') {
  const b = el('button', { type: 'button', className: 'inline-link explain-link', textContent: `ⓘ ${text}`, title: 'Every word with its outline and the Manual’s paragraphs' });
  b.onclick = (e) => {
    e.stopPropagation();
    showWordHelp(options);
  };
  return b;
}
