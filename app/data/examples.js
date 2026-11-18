// Practice examples: what the learner copies on the pad.
//
// Accuracy policy: only outlines that can be drawn correctly from verified sources.
//   - Single letters: the stroke table (data/strokes.js), checked against the 1929
//     Anniversary manual and the Simplified chart. Brief-form meanings come from the
//     Gregg Simplified chart. Strokes still marked `verify` there (standalone circles,
//     o/u hooks, the def/jent blends) are left out until they are checked.
//   - Words: exactly the words the 1929 manual prints with §11 and §12 (p. 5), built with
//     those two joining rules (js/join.js). Vowel marks (§8: "seldom used") are added where
//     the manual prints them (VOWEL_MARKS: the word lists of Units 1 and 2).
import { STROKE_BY_ID } from './strokes.js';

const SOUND = {
  k: 'k as in kit', g: 'hard g as in go', r: 'r as in run', l: 'l as in let',
  u: 'ŭ as in tuck, ŏŏ as in took, ōō as in tomb (Manual §91)', o: 'ŏ as in rot, aw as in raw, ō as in wrote (Manual §65)', n: 'n as in no', m: 'm as in me', t: 't as in top', d: 'd as in day',
  'th-over': 'th as in thin or then (the "over" form)', 'th-under': 'th as in thin or then (the "under" form)',
  h: 'h as in hat. Written as a dot above the vowel that follows',
  's-left': 's or z as in see, zoo (the left-curving form)', 's-right': 's or z as in see, zoo (the right-curving form)',
  p: 'p as in pay', b: 'b as in bay', f: 'f as in fee', v: 'v as in vow',
  sh: 'sh as in she (also zh as in measure)', ch: 'ch as in chin', j: 'j as in jam, soft g as in gem',
  ng: 'ng as in sing', nk: 'nk as in sink',
  men: 'the blend m-n or m-m, as in men, memory', ted: 'the blend t-d or d-d, as in dated, added',
  ten: 'the blend t-n or d-n, as in written, sudden', tem: 'the blend t-m or d-m, as in item, random',
  nd: 'the blend n-d or n-t, as in and, sent', md: 'the blend m-d or m-t, as in named, dreamt',
};

const LETTER_ORDER = [
  // Manual Chapter I, Unit 1 first, then the rest of the alphabet.
  'k', 'g', 'r', 'l', 'n', 'm', 't', 'd', 'th-over', 'th-under', 'h',
  's-left', 's-right', 'p', 'b', 'f', 'v', 'sh', 'ch', 'j', 'ng', 'nk',
  'men', 'ted', 'ten', 'tem', 'nd', 'md', 'o', 'u',
];

import { UNITS, levelOfUnit } from './units/index.js';

export const LEVELS = [
  { id: 1, name: 'Alphabet', kinds: ['letter'], description: 'Single strokes of the alphabet' },
  { id: 2, name: 'Brief forms', description: 'One stroke stands for a whole word' },
  { id: 3, name: 'Circle words I', description: 'Circles on k g r l n m t d (Manual §11–12)' },
  { id: 4, name: 'Circle words II', description: 'The same circle rules on p b f v sh ch j nk and the blends' },
  { id: 5, name: 'Short sentences', description: 'Two to four words' },
  { id: 6, name: 'Long sentences', description: 'Five to eight words' },
  { id: 7, unit: 2, name: 'Joined words', description: 'Circles between strokes and joined curves (Manual §14–22)' },
  { id: 8, unit: 3, name: 'Blends and drill', description: 'The ted and men blends, the frequent-word drill and brief forms (Manual §26–29)' },
  ...UNITS.map((u) => ({ id: levelOfUnit(u.unit), unit: u.unit, ...u.level })),
];

const quote = (words) => words.map((w) => `“${w}”`).join(', ');

const letters = LETTER_ORDER.map((id) => {
  const s = STROKE_BY_ID[id];
  if (s.verify) throw new Error(`example uses unverified stroke ${id}`);
  const lines = [`The sound ${SOUND[id]}.`];
  if (s.briefForms.length) lines.push(`Written alone, it is the brief form for ${quote(s.briefForms)}.`);
  // The two th forms share a label; the title says which form it is.
  const title = id.startsWith('th-') ? `${s.label} (${id.slice(3)})` : s.label;
  return { id: `letter-${id}`, kind: 'letter', level: 1, title, outline: [id], meaning: lines, source: 'Stroke chart' };
});

// Level 2: one example per brief-form stroke (Simplified chart), in chart order.
const BRIEF_STROKES = [
  ['k', ['can']], ['g', ['go', 'good']], ['r', ['are', 'our']], ['l', ['will', 'well']],
  ['n', ['in', 'not']], ['m', ['am', 'more']], ['t', ['it', 'at']], ['d', ['would']],
  ['th-over', ['the']], ['th-under', ['their', 'there']], ['h', ['a', 'an']],
  ['s-right', ['is', 'his']], ['p', ['put']], ['b', ['be', 'by', 'but']], ['f', ['for']], ['v', ['have']],
  ['sh', ['shall', 'ship']], ['ch', ['which', 'change']], ['men', ['men']], ['ted', ['did', 'date']],
  ['tem', ['time']], ['nd', ['and', 'end']],
];

const briefs = BRIEF_STROKES.map(([id, forms]) => {
  const s = STROKE_BY_ID[id];
  if (s.briefForms.join('|') !== forms.join('|')) throw new Error(`brief forms of ${id} differ from the chart list`);
  return {
    id: `brief-${id}`, kind: 'brief', level: 2, title: forms.join(' / '), outline: [id],
    meaning: [`A brief form: the single stroke ${s.label} stands for the word${forms.length > 1 ? 's' : ''} ${forms.map((w) => `“${w}”`).join(' or ')}.`],
    source: 'Brief forms (Gregg Simplified chart)',
  };
});

const R11 = 'A circle at the beginning or end of a curve goes inside the curve (Manual §11).';
const R12 = 'A circle at the beginning or end of a straight stroke is written clockwise (Manual §12).';
const H = 'The h is a dot above the vowel.';

// [word, outline, rule, extra note]
const WORDS = [
  ['eke', ['e', 'k'], R11], ['egg', ['e', 'g'], R11], ['ache', ['a', 'k'], R11], ['key', ['k', 'e'], R11],
  ['gay', ['g', 'a'], R11], ['ear', ['e', 'r'], R11], ['ill', ['e', 'l'], R11], ['air', ['a', 'r'], R11],
  ['ail', ['a', 'l'], R11], ['ray', ['r', 'a'], R11], ['array', ['a', 'r', 'a'], R11], ['airy', ['a', 'r', 'e'], R11],
  ['alley', ['a', 'l', 'e'], R11], ['hack', ['h', 'a', 'k'], R11, H], ['hag', ['h', 'a', 'g'], R11, H],
  ['aim', ['a', 'm'], R12], ['ate', ['a', 't'], R12], ['add', ['a', 'd'], R12], ['eat', ['e', 't'], R12],
  ['tea', ['t', 'e'], R12], ['day', ['d', 'a'], R12], ['may', ['m', 'a'], R12], ['me', ['m', 'e'], R12],
  ['eddy', ['e', 'd', 'e'], R12], ['ham', ['h', 'a', 'm'], R12, H], ['heat', ['h', 'e', 't'], R12, H],
  ['head', ['h', 'e', 'd'], R12, `${H} “Hid” and “heed” have the same outline (vowel marks omitted).`],
  ['hate', ['h', 'a', 't'], R12, H],
];

// Level 3 extras and all of level 4: built by the same two rules (no manual page of their own).
const BUILT_SOURCE = 'Built by the rules of Manual §11–12';
const WORDS_3B = [
  ['era', ['e', 'r', 'a'], R11], ['lay', ['l', 'a'], R11], ['knee', ['n', 'e'], R12], ['nay', ['n', 'a'], R12],
  ['eighty', ['a', 't', 'e'], R12],
];
const WORDS_4 = [
  ['pay', ['p', 'a'], R11], ['pea', ['p', 'e'], R11], ['ape', ['a', 'p'], R11], ['happy', ['h', 'a', 'p', 'e'], R11, H],
  ['bay', ['b', 'a'], R11], ['bee', ['b', 'e'], R11], ['ebb', ['e', 'b'], R11], ['abbey', ['a', 'b', 'e'], R11],
  ['fee', ['f', 'e'], R11], ['if', ['e', 'f'], R11], ['eve', ['e', 'v'], R11], ['heavy', ['h', 'e', 'v', 'e'], R11, H],
  ['she', ['sh', 'e'], R12], ['ash', ['a', 'sh'], R12], ['each', ['e', 'ch'], R12], ['itchy', ['e', 'ch', 'e'], R12],
  ['age', ['a', 'j'], R12], ['edge', ['e', 'j'], R12], ['jay', ['j', 'a'], R12], ['ink', ['e', 'nk'], R12],
  ['inky', ['e', 'nk', 'e'], R12], ['eaten', ['e', 'ten'], R11], ['aunt', ['a', 'nd'], R11],
  ['aimed', ['a', 'md'], R11], ['many', ['men', 'e'], R11], ['amen', ['a', 'men'], R11],
];

// Level 7: Manual Unit 2 (pp. 7–9). The words and outlines are transcribed in
// reference/manual-unit2.md; each carries the rule of the § it is printed under.
const R14 = 'Where an angle, or a point, is formed at the junction of consonants, the circle goes outside the angle (Manual §14).';
const R15 = 'Where straight strokes and curves join without an angle, or where two similar-motion curves join without an angle, the circle is placed inside the curve (Manual §15).';
const R17 = 'Between straight strokes in the same direction the circle is written with right motion (Manual §17).';
const R18 = 'Between opposite curves the circle is turned back on the first curve (Manual §18).';
const R19 = 'K and r, and g and l, are equal curves and are made a little flatter than usual when joined (Manual §19).';
const R20 = 'Where curves of unequal length join without an angle, note how a distinction in length is positively shown. The movement in writing gr is similar to that in writing y in longhand; kl to that in writing h (Manual §20).';
const R21 = 'Since r and k are of equal length, the curves are somewhat flatter, as with kr and gl (Manual §21).';
const R22 = 'The sign for t is curved to express th (Manual §22).';
const N16 = 'The e in the words taken and maker is absolutely useless, and is omitted (Manual §16).';

// [word(s), outline, rule, page, extra note]
const WORDS_7 = [
  ['kick', ['k', 'e', 'k'], R14, 7],
  ['cake', ['k', 'a', 'k'], R14, 7],
  ['get', ['g', 'e', 't'], R14, 7],
  ['gate', ['g', 'a', 't'], R14, 7],
  ['calm', ['k', 'a', 'm'], R14, 7],
  ['make', ['m', 'a', 'k'], R14, 7],
  ['met', ['m', 'e', 't'], R14, 7],
  ['maid', ['m', 'a', 'd'], R14, 7],
  ['team', ['t', 'e', 'm'], R14, 7],
  ['rear', ['r', 'e', 'r'], R14, 7],
  ['rain', ['r', 'a', 'n'], R14, 7],
  ['rim', ['r', 'e', 'm'], R14, 7],
  ['tale', ['t', 'a', 'l'], R14, 7],
  ['rainy', ['r', 'a', 'n', 'e'], R14, 7],
  ['dream', ['d', 'r', 'e', 'm'], R14, 7],
  ['writ', ['r', 'e', 't'], R15, 7],
  ['rid / red / read', ['r', 'e', 'd'], R15, 7],
  ['rate', ['r', 'a', 't'], R15, 7],
  ['raid', ['r', 'a', 'd'], R15, 7],
  ['ticket', ['t', 'e', 'k', 'e', 't'], R15, 7],
  ['tack / take', ['t', 'a', 'k'], R15, 7],
  ['deck', ['d', 'e', 'k'], R15, 7],
  ['dig', ['d', 'e', 'g'], R15, 7],
  ['tag', ['t', 'a', 'g'], R15, 7],
  ['taken', ['t', 'a', 'k', 'n'], R15, 7, N16],
  ['rattle', ['r', 'a', 't', 'l'], R15, 7],
  ['riddle', ['r', 'e', 'd', 'l'], R15, 7],
  ['deed', ['d', 'e', 'd'], R17, 8],
  ['dad', ['d', 'a', 'd'], R17, 8],
  ['mean', ['m', 'e', 'n'], R17, 8],
  ['main', ['m', 'a', 'n'], R17, 8],
  ['wreck', ['r', 'e', 'k'], R18, 8],
  ['rag', ['r', 'a', 'g'], R18, 8],
  ['lake', ['l', 'a', 'k'], R18, 8],
  ['kill', ['k', 'e', 'l'], R18, 8],
  ['cream', ['k', 'r', 'e', 'm'], R19, 8],
  ['crane', ['k', 'r', 'a', 'n'], R19, 8],
  ['creed', ['k', 'r', 'e', 'd'], R19, 8],
  ['crate', ['k', 'r', 'a', 't'], R19, 8],
  ['eagle', ['e', 'g', 'l'], R19, 8],
  ['glee', ['g', 'l', 'e'], R19, 8],
  ['glean / glen', ['g', 'l', 'e', 'n'], R19, 8],
  ['gleam', ['g', 'l', 'e', 'm'], R19, 8],
  ['glare', ['g', 'l', 'a', 'r'], R19, 8],
  ['acre', ['a', 'k', 'r'], R19, 8],
  ['maker', ['m', 'a', 'k', 'r'], R19, 8, N16],
  ['gray', ['g', 'r', 'a'], R20, 9],
  ['grain', ['g', 'r', 'a', 'n'], R20, 9],
  ['greed', ['g', 'r', 'e', 'd'], R20, 9],
  ['green', ['g', 'r', 'e', 'n'], R20, 9],
  ['greet', ['g', 'r', 'e', 't'], R20, 9],
  ['grim', ['g', 'r', 'e', 'm'], R20, 9],
  ['eager', ['e', 'g', 'r'], R20, 9],
  ['clay', ['k', 'l', 'a'], R20, 9],
  ['clan', ['k', 'l', 'a', 'n'], R20, 9],
  ['ark', ['a', 'r', 'k'], R21, 9],
  ['dark', ['d', 'a', 'r', 'k'], R21, 9],
  ['mark', ['m', 'a', 'r', 'k'], R21, 9],
  ['milk', ['m', 'e', 'l', 'k'], R21, 9],
  ['tick', ['t', 'e', 'k'], R22, 9],
  ['thick', ['th-over', 'e', 'k'], R22, 9],
];

// Level 8: Manual Unit 3 (pp. 12–14), transcribed in reference/manual-unit3.md. Drill
// words whose outline is already an example elsewhere (eight = ate, came = calm, ...) are
// not repeated here; the lessons point to the existing example.
const R26 = 'By blending d and t into one long stroke the syllables ted, ded, det are expressed (Manual §26).';
const R27 = 'By blending m and n into one long stroke the syllables men, mem are expressed; the blend also stands for similar sounds, such as min in minute, mun in money (Manual §27).';
const R28 = 'A word from the frequent-word drill: the circles join by the rules of Units 1 and 2 (Manual §28).';
const N26 = 'The combination det usually occurs at the beginning of words, as in detect, detach, while ted or ded usually occurs at the end of a word (Manual §26).';

// [word(s), outline, rule, page, extra note]
const WORDS_8 = [
  ['added', ['a', 'ted'], R26, 12],
  ['hated', ['h', 'a', 'ted'], R26, 12],
  ['rated', ['r', 'a', 'ted'], R26, 12],
  ['needed', ['n', 'e', 'ted'], R26, 12],
  ['today', ['ted', 'a'], R26, 12, N26],
  ['treated', ['t', 'r', 'e', 'ted'], R26, 12],
  ['meant', ['men', 't'], R27, 12],
  ['mend', ['men', 'd'], R27, 12],
  ['minute', ['men', 'e', 't'], R27, 12],
  ['mimic', ['men', 'e', 'k'], R27, 12],
  ['memory', ['men', 'r', 'e'], R27, 12],
  ['remain', ['r', 'e', 'men'], R27, 12],
  ['emanate', ['e', 'men', 'a', 't'], R27, 12],
  ['mental', ['men', 't', 'l'], R27, 12],
  ['minimum', ['men', 'e', 'men'], R27, 12],
  ['had', ['h', 'a', 'd'], R28, 13],
  ['him', ['h', 'e', 'm'], R28, 13],
  ['net', ['n', 'e', 't'], R28, 13],
  ['need', ['n', 'e', 'd'], R28, 13],
  ['tin', ['t', 'e', 'n'], R28, 13],
  ['tan', ['t', 'a', 'n'], R28, 13],
  ['cat', ['k', 'a', 't'], R28, 13],
  ['kid', ['k', 'e', 'd'], R28, 13],
  ['her / here', ['h', 'e', 'r'], R28, 13],
  ['ready', ['r', 'e', 'd', 'e'], R28, 13],
  ['led', ['l', 'e', 'd'], R28, 14],
  ['late', ['l', 'a', 't'], R28, 14],
  ['laid', ['l', 'a', 'd'], R28, 14],
  ['mill', ['m', 'e', 'l'], R28, 14],
  ['tree', ['t', 'r', 'e'], R28, 14],
  ['train', ['t', 'r', 'a', 'n'], R28, 14],
  ['clean', ['k', 'l', 'e', 'n'], R28, 14],
  ['leg', ['l', 'e', 'g'], R28, 14],
  ['attack', ['a', 't', 'a', 'k'], R28, 14],
  ['headache', ['h', 'e', 'd', 'a', 'k'], R28, 14],
];

// Manual §29 brief forms that use only strokes in the stroke table (p. 14). Left out:
// other, all, what, those, truth (hooks and th), into, like (see the reference file).
// [words, outline, note]
const BRIEF_8 = [
  ['when', ['e', 'n'], 'Wh is omitted in when.'],
  ['any', ['n', 'e']],
  ['were', ['e', 'r'], 'W is omitted in were.'],
  ['where / aware', ['a', 'r'], 'Wh is omitted in where.'],
  ['my', ['m', 'a'], 'For convenience, the long i in my is expressed by a large circle.'],
  ['could', ['k', 'd']],
  ['come', ['k', 'm']],
  ['little', ['l', 'e', 't']],
  ['country', ['k', 't']],
];

function tokenName(t) {
  if (t === 'a' || t === 'e') return `${t}-circle`;
  if (t === 'a-rev' || t === 'e-rev') return `${t[0]}-circle with left motion (r)`;
  if (t === 'i') return 'ī (the broken circle)';
  if (t === 'a-rev-s' || t === 'e-rev-s') return `${t[0]}-circle with left motion made a loop (r + s)`;
  if (t === 'h') return 'h-dot';
  if (t === 'w-dash') return 'w-dash (below the vowel)';
  if (t === 'a-dot') return 'a-dot (before the outline)';
  if (t === 'cap') return 'the capital mark (two dashes under the outline)';
  if (t === '^') return 'pen lifted, the rest written just below';
  if (t === '_') return 'pen lifted, the ending written under the end of the word';
  return STROKE_BY_ID[t].label;
}
// A vowel mark is named with its circle: "e-circle with a dash under it (long ē)".
const MARK_NAME = { 'v-dash': 'a dash under it (long sound)', 'v-dot': 'a dot under it (medium sound)' };
const spell = (outline) => outline.flatMap((t, i) => {
  if (MARK_NAME[t]) return [];
  const mark = MARK_NAME[outline[i - 1]];
  return [mark ? `${tokenName(t)} with ${mark}` : tokenName(t)];
}).join(' + ');

// §8 vowel marks, as printed in the word lists of Units 1 and 2 (pp. 3–13; later units print
// none): one sign per a / e circle of the outline, in order. '-' is the dash of a long
// sound (ā, ē), '.' the dot of a medium one (ä, ĕ), ' ' no mark.
export const VOWEL_MARKS = {
  ache: '-', key: '-', air: '-', ail: '-', ray: '-', array: ' -', airy: '- ', tea: '-', day: '-',
  eddy: '. ', hate: '-', gate: '-', calm: '.', make: '-', maid: '-', rear: '-', rain: '-', tale: '-',
  rainy: '- ', rate: '-', raid: '-', ticket: ' .', deck: '.', taken: '-', deed: '-', main: '-',
  wreck: '.', lake: '-', cream: '-', crane: '-', creed: '-', crate: '-', eagle: '-', glee: '-',
  glean: '-', gleam: '-', glare: '-', acre: '-', maker: '-', gray: '-', grain: '-', greed: '-',
  green: '-', greet: '-', clay: '-', ark: '.', dark: '.', mark: '.', net: '.', need: '-',
  ready: '. ', led: '.', late: '-', laid: '-', tree: '-', train: '-', clean: '-', leg: '.',
  headache: '.-', eke: '-', egg: '.', gay: '-', ear: '-', aim: '-', ate: '-', eat: '-', may: '-',
  me: '-', heat: '-', head: '.', get: '.', met: '.', team: '-', dream: '-', mean: '-', eager: '-',
  today: '-',
};
const MARK_TOKEN = { '-': 'v-dash', '.': 'v-dot' };

// The outline with its printed vowel marks, each just before its circle.
export function withVowelMarks(word, outline) {
  const signs = Object.hasOwn(VOWEL_MARKS, word) ? VOWEL_MARKS[word] : null;
  if (!signs) return outline;
  let k = 0;
  const out = outline.flatMap((t) => {
    if (t !== 'a' && t !== 'e') return [t];
    const sign = signs[k++];
    return MARK_TOKEN[sign] ? [MARK_TOKEN[sign], t] : [t];
  });
  if (k !== signs.length) throw new Error(`vowel marks for “${word}”: ${signs.length} signs for ${k} circles`);
  return out;
}

const wordExample = (level, source) => ([word, plain, rule, note]) => {
  const outline = withVowelMarks(word, plain);
  return {
    id: `word-${word}`, kind: 'word', level, title: word, outline,
    meaning: [`The word “${word}”: ${spell(outline)}.`, rule, ...(note ? [note] : [])],
    source,
  };
};

// Level 7 and 8 titles may name several words that share one outline ("rid / red / read").
const wordExampleAt = (level) => ([title, plain, rule, page, note]) => {
  const names = title.split(' / ');
  const outline = withVowelMarks(names[0], plain);
  // The mark is that of the first word; the others share the outline without it.
  const marked = outline.length > plain.length && names.length > 1;
  return {
    id: `word-${names[0]}`, kind: 'word', level, title, outline,
    meaning: [`The word${names.length > 1 ? 's' : ''} ${quote(names)}: ${spell(outline)}.`, rule, ...(note ? [note] : []),
      ...(marked ? [`The mark (Manual §8) is that of “${names[0]}”: without it the outline reads ${quote(names.slice(1))} too.`] : [])],
    source: `Gregg Shorthand Manual (1929), p. ${page}`,
  };
};

const briefExample8 = ([title, outline, note]) => {
  const names = title.split(' / ');
  return {
    id: `brief-${names[0]}`, kind: 'brief', level: 8, title, outline,
    meaning: [`A brief form for the word${names.length > 1 ? 's' : ''} ${quote(names)}: ${spell(outline)} (Manual §29).`, ...(note ? [note] : [])],
    source: 'Gregg Shorthand Manual (1929), p. 14',
  };
};

// Words, brief forms and phrases of the unit modules (data/units/). Ids are
// <kind>-<first name>, with spaces as dashes ("have been" -> brief-have-been).
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function unitExamples(u) {
  const level = levelOfUnit(u.unit);
  const source = (page) => `Gregg Shorthand Manual (1929), p. ${page}`;
  const words = u.words.map(([title, outline, rule, page, note]) => {
    if (!(rule in u.rules)) throw new Error(`Unit ${u.unit}: no rule "${rule}" for ${title}`);
    return { ...wordExampleAt(level)([title, outline, u.rules[rule], page, note]), id: `word-${slug(title.split(' / ')[0])}` };
  });
  const brief = (u.brief ?? []).map(([title, outline, page, note]) => {
    const names = title.split(' / ');
    return {
      id: `brief-${slug(names[0])}`, kind: 'brief', level, title, outline,
      meaning: [`A brief form for ${names.length > 1 ? 'the words ' : ''}${quote(names)}: ${spell(outline)} (Manual, Unit ${u.unit}).`, ...(note ? [note] : [])],
      source: source(page),
    };
  });
  const phrases = (u.phrases ?? []).map(([title, outline, page, note]) => ({
    id: `phrase-${slug(title)}`, kind: 'phrase', level, title, outline,
    meaning: [`The phrase “${title}”, written as one outline: ${spell(outline)} (Manual, Unit ${u.unit}).`, ...(note ? [note] : [])],
    source: source(page),
  }));
  return [...words, ...brief, ...phrases];
}

export const EXAMPLES = [
  ...letters,
  ...briefs,
  ...WORDS.map(wordExample(3, 'Gregg Shorthand Manual (1929), p. 5')),
  ...WORDS_3B.map(wordExample(3, BUILT_SOURCE)),
  ...WORDS_4.map(wordExample(4, BUILT_SOURCE)),
  ...WORDS_7.map(wordExampleAt(7)),
  ...WORDS_8.map(wordExampleAt(8)),
  ...BRIEF_8.map(briefExample8),
  ...UNITS.flatMap(unitExamples),
];

// ---------------------------------------------------------------- sentences
// Built only from verified pieces: brief forms (single strokes, Simplified chart; "any"
// from Manual §29) and the Manual p. 5 words and words built by §11–12 above. Each word is
// its own outline, except the phrases the manual joins (§4).
const BRIEF = {
  a: ['h'], an: ['h'], is: ['s-right'], his: ['s-right'], for: ['f'], have: ['v'],
  in: ['n'], not: ['n'], am: ['m'], more: ['m'], men: ['men'], it: ['t'], at: ['t'],
  would: ['d'], did: ['ted'], date: ['ted'], are: ['r'], our: ['r'], will: ['l'], well: ['l'],
  put: ['p'], be: ['b'], by: ['b'], can: ['k'], go: ['g'], good: ['g'], shall: ['sh'], any: ['n', 'e'],
  which: ['ch'], the: ['th-over'], time: ['tem'], their: ['th-under'], there: ['th-under'],
  and: ['nd'], end: ['nd'],
};
// §4 Phrasing (p. 2): "The joining of simple words is a great help to accuracy and speed".
// These are the manual's own examples; a phrase is written as one outline.
export const PHRASES = {
  'i will': ['a', 'l'], 'he can': ['e', 'k'], 'it will': ['t', 'l'], 'in the': ['n', 'th-over'],
};
const WORD_TOKENS = Object.fromEntries([...WORDS, ...WORDS_3B, ...WORDS_4].map(([w, o]) => [w, o]));

const SENTENCES = [
  'It will be good.',
  'It is good.',
  'Have a good day.',
  'It may be good.',
  'It is a good day.',
  'It would be a good day.',
  'The day will be good.',
  'It will be there.',
  'There will be more.',
  'It is time.',
  'Have a good time.',
  'More men will go.',
  'The men ate.',
  'The men will have the key.',
  // Added with the levels (short = level 5, long = level 6; the level follows the word count).
  'The men go.',
  'Our men are good.',
  'The tea is good.',
  'She is happy.',
  'It is heavy.',
  'His key is good.',
  'Our day is good.',
  'Eat the egg.',
  'Eat in time.',
  'Put the key in.',
  'Go by the alley.',
  'The men are happy.',
  'She ate the egg.',
  'She will be happy.',
  'The air is good.',
  'Heat the tea.',
  'Eat the ham.',
  'The ape is happy.',
  'Many men go.',
  'The aunt is well.',
  'The aunt will go.',
  'The men are ill.',
  'She is ill.',
  'Pay the men.',
  'Eighty men will go.',
  'Any day is good.',
  'It is not good.',
  'The ink is good.',
  'The tea is good for the men.',
  'The men will have the ham.',
  'Put the ink by the key.',
  'The happy men will go by the alley.',
  'It would be good for the men.',
  'It is time for tea.',
  'Our aunt is not happy.',
  'The aunt and the men will go.',
  'The jay ate the egg.',
  'The ape ate the egg and the ham.',
  'The bee is in the air.',
  'The air is not heavy in the alley.',
  'The ham and the tea are good.',
  'His aunt will be happy.',
  'His aunt is not well.',
  'Eat the ham and the egg.',
  'Put it by the edge.',
  'The ache is in his ear.',
  'His knee is not well.',
  'The pay is not good.',
  'Pay the men for the time.',
  'Many men are in the alley.',
  'Many men will have the tea.',
  'There will be many men.',
  'There are many men in the alley.',
  'Their men are well and happy.',
  'It will be a good time for men.',
  'Have a good time and be happy.',
  'The men shall go in time.',
  'The men did not go.',
  'Our men did not have the ink.',
  'The date is good for the men.',
  'The heavy air is not good.',
  'Go and have the tea.',
  'The men can go by the alley.',
  'The aunt would go in time.',
  'It is a happy time for the men.',
];

function sentenceExample(text) {
  const raws = text.replace(/\.$/, '').split(' ');
  const words = [];
  for (let i = 0; i < raws.length; i++) {
    const pair = raws.slice(i, i + 2).join(' ');
    if (PHRASES[pair.toLowerCase()]) {
      words.push({ text: pair, tokens: PHRASES[pair.toLowerCase()], brief: true, phrase: true });
      i++;
      continue;
    }
    const w = raws[i].toLowerCase();
    const tokens = BRIEF[w] || WORD_TOKENS[w];
    if (!tokens) throw new Error(`no verified outline for "${raws[i]}" in "${text}"`);
    words.push({ text: raws[i], tokens, brief: !!BRIEF[w] });
  }
  words.push({ text: '.', tokens: ['period'], brief: false });
  const parts = words.map((w) => {
    if (w.text === '.') return 'period = \\';
    const piece = w.tokens.length === 1 && w.tokens[0] === 'h' ? 'dot' : spell(w.tokens);
    return `${w.text.toLowerCase()} = ${piece}${w.phrase ? ' (joined)' : ''}`;
  });
  const briefs = [...new Set(words.filter((w) => w.brief && !w.phrase).map((w) => w.text.toLowerCase()))];
  const phrases = words.filter((w) => w.phrase).map((w) => `“${w.text.toLowerCase()}”`);
  return {
    id: `sentence-${text.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`,
    kind: 'sentence', level: raws.length <= 4 ? 5 : 6, title: text, words,
    outline: words.flatMap((w) => w.tokens),
    meaning: [
      `“${text}”`,
      parts.join(' · '),
      ...(briefs.length ? [`Brief forms: ${briefs.join(', ')}.`] : []),
      ...(phrases.length ? [`Phrase (Manual §4): write ${phrases.join(' and ')} as one outline, without lifting the pen.`] : []),
      `Write each ${phrases.length ? 'other ' : ''}word as its own outline, in order, and end with the period mark.`,
    ],
    source: `Brief forms (Simplified chart) and words built by Manual §11–12; ${phrases.length ? 'phrasing from Manual §4, ' : ''}period from Manual p. 2`,
  };
}

EXAMPLES.push(...SENTENCES.map(sentenceExample));
// Keep the list ordered by level (stable, so each level keeps its own order).
EXAMPLES.sort((a, b) => a.level - b.level);
