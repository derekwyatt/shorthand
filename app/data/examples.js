// Practice examples: what the learner copies on the pad.
//
// Accuracy policy: only outlines that can be drawn correctly from verified sources.
//   - Single letters: the stroke table (data/strokes.js), checked against the 1929
//     Anniversary manual and the Simplified chart. Brief-form meanings come from the
//     Gregg Simplified chart. Strokes still marked `verify` there (standalone circles,
//     o/u hooks, the def/jent blends) are left out until they are checked.
//   - Words: exactly the words the 1929 manual prints with §11 and §12 (p. 5), built with
//     those two joining rules (js/join.js). Vowel marks (§8: "seldom used") are omitted,
//     so words that differ only by marks share one example.
import { STROKE_BY_ID } from './strokes.js';

const SOUND = {
  k: 'k as in kit', g: 'hard g as in go', r: 'r as in run', l: 'l as in let',
  n: 'n as in no', m: 'm as in me', t: 't as in top', d: 'd as in day',
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
  'men', 'ted', 'ten', 'tem', 'nd', 'md',
];

export const LEVELS = [
  { id: 1, name: 'Alphabet', kinds: ['letter'], description: 'Single strokes of the alphabet' },
  { id: 2, name: 'Brief forms', description: 'One stroke stands for a whole word' },
  { id: 3, name: 'Circle words I', description: 'Circles on k g r l n m t d (Manual §11–12)' },
  { id: 4, name: 'Circle words II', description: 'The same circle rules on p b f v sh ch j nk and the blends' },
  { id: 5, name: 'Short sentences', description: 'Two to four words' },
  { id: 6, name: 'Long sentences', description: 'Five to eight words' },
];

const quote = (words) => words.map((w) => `“${w}”`).join(', ');

const letters = LETTER_ORDER.map((id) => {
  const s = STROKE_BY_ID[id];
  if (s.verify) throw new Error(`example uses unverified stroke ${id}`);
  const lines = [`The sound ${SOUND[id]}.`];
  if (s.briefForms.length) lines.push(`Written alone, it is the brief form for ${quote(s.briefForms)}.`);
  return { id: `letter-${id}`, kind: 'letter', level: 1, title: s.label, outline: [id], meaning: lines, source: 'Stroke chart' };
});

// Level 2: one example per brief-form stroke (Simplified chart), in chart order.
const BRIEF_STROKES = [
  ['k', ['can']], ['g', ['go', 'good']], ['r', ['are', 'our']], ['l', ['will', 'well']],
  ['n', ['in', 'not']], ['m', ['am', 'more']], ['t', ['it', 'at']], ['d', ['would']],
  ['th-over', ['the']], ['th-under', ['their', 'there']], ['h', ['a', 'an']],
  ['s-right', ['is', 'his']], ['p', ['put']], ['b', ['be', 'by']], ['f', ['for']], ['v', ['have']],
  ['sh', ['shall']], ['ch', ['which']], ['men', ['men']], ['ted', ['did', 'date']],
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
  ['any', ['e', 'n', 'e'], R12], ['eighty', ['a', 't', 'e'], R12],
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

function tokenName(t) {
  if (t === 'a' || t === 'e') return `${t}-circle`;
  if (t === 'h') return 'h-dot';
  return STROKE_BY_ID[t].label;
}
const spell = (outline) => outline.map(tokenName).join(' + ');

const wordExample = (level, source) => ([word, outline, rule, note]) => ({
  id: `word-${word}`, kind: 'word', level, title: word, outline,
  meaning: [`The word “${word}”: ${spell(outline)}.`, rule, ...(note ? [note] : [])],
  source,
});

export const EXAMPLES = [
  ...letters,
  ...briefs,
  ...WORDS.map(wordExample(3, 'Gregg Shorthand Manual (1929), p. 5')),
  ...WORDS_3B.map(wordExample(3, BUILT_SOURCE)),
  ...WORDS_4.map(wordExample(4, BUILT_SOURCE)),
];

// ---------------------------------------------------------------- sentences
// Built only from verified pieces: brief forms (single strokes, Simplified chart) and the
// Manual p. 5 words and words built by §11–12 above. Every word is its own outline; experienced writers often join
// common phrases ("phrasing"), which these examples leave out.
const BRIEF = {
  a: ['h'], an: ['h'], is: ['s-right'], his: ['s-right'], for: ['f'], have: ['v'],
  in: ['n'], not: ['n'], am: ['m'], more: ['m'], men: ['men'], it: ['t'], at: ['t'],
  would: ['d'], did: ['ted'], date: ['ted'], are: ['r'], our: ['r'], will: ['l'], well: ['l'],
  put: ['p'], be: ['b'], by: ['b'], can: ['k'], go: ['g'], good: ['g'], shall: ['sh'],
  which: ['ch'], the: ['th-over'], time: ['tem'], their: ['th-under'], there: ['th-under'],
  and: ['nd'], end: ['nd'],
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
  const words = text.replace(/\.$/, '').split(' ').map((raw) => {
    const w = raw.toLowerCase();
    const tokens = BRIEF[w] || WORD_TOKENS[w];
    if (!tokens) throw new Error(`no verified outline for "${raw}" in "${text}"`);
    return { text: raw, tokens, brief: !!BRIEF[w] };
  });
  words.push({ text: '.', tokens: ['period'], brief: false });
  const parts = words.map((w) => {
    if (w.text === '.') return 'period = \\';
    const piece = w.tokens.length === 1 && w.tokens[0] === 'h' ? 'dot' : spell(w.tokens);
    return `${w.text.toLowerCase()} = ${piece}`;
  });
  const briefs = [...new Set(words.filter((w) => w.brief).map((w) => w.text.toLowerCase()))];
  return {
    id: `sentence-${text.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`,
    kind: 'sentence', level: words.length - 1 <= 4 ? 5 : 6, title: text, words,
    outline: words.flatMap((w) => w.tokens),
    meaning: [
      `“${text}”`,
      parts.join(' · '),
      ...(briefs.length ? [`Brief forms: ${briefs.join(', ')}.`] : []),
      'Write each word as its own outline, in order, and end with the period mark.',
    ],
    source: 'Brief forms (Simplified chart) and words built by Manual §11–12; period from Manual p. 2',
  };
}

EXAMPLES.push(...SENTENCES.map(sentenceExample));
// Keep the list ordered by level (stable, so each level keeps its own order).
EXAMPLES.sort((a, b) => a.level - b.level);
