// Tutorial lessons: Manual Chapter I, Units 1–3, as a sequence of steps per unit.
//
// Step types:
//   read    a rule from the manual, with outlines to watch (`show`, example ids)
//   write   write an example on the pad; passed when a repeat scores PASS_SCORE or more
//   choose  read an outline: pick its meaning from `choices` (example ids, answer included)
//
// Text in quotes is the manual's own wording (1929, US public domain); the rest is a short
// paraphrase. Every example id must exist in data/examples.js (tests/lessons.test.mjs).
import { EXAMPLES } from './examples.js';

export { PASS_SCORE } from '../js/assess.js';

// `plates`: section plates (data/plates.js) shown with the rule, e.g. a table of the manual.
const read = (title, ref, text, show = [], plates = []) => ({ type: 'read', title, ref, text, show, plates });
const write = (example, prompt = null) => ({ type: 'write', example, prompt });
const choose = (example, choices) => ({ type: 'choose', example, choices });
const writeAll = (...ids) => ids.map((id) => write(id));

const UNIT_1 = [
  read('Written by sound', 'Manual §1, p. 1', [
    '“Shorthand is written by sound; thus aim is written am (long sound of a), cat is written kat, knee is written ne.”',
    'Each figure shows an outline enlarged: the green dot is where the pen starts and the red arrow where it ends. Under the figures the same outlines are drawn at actual size, on rules spaced like the pad’s: write them that big.',
    'Every outline in a lesson can be tried on the pad: write it and the score and notes appear below. Tap another outline to try that one instead.',
  ], ['word-aim', 'word-knee']),
  read('Consonants in pairs', 'Manual §2–3, p. 1', [
    '“The consonants are arranged in pairs, according to their affinity of sound, and are distinguished by a difference in length.”',
    'K and g are forward curves that bulge upward; r and l are forward curves that bulge downward. In each pair the second letter is the long one.',
    '“All these consonants are written forward from left to right.”',
  ], ['letter-k', 'letter-g', 'letter-r', 'letter-l']),
  write('letter-k', 'Write k: a short forward curve, bulging upward.'),
  write('letter-g', 'Write g: the same curve as k, about twice as long.'),
  write('letter-r', 'Write r: a short forward curve, bulging downward.'),
  write('letter-l', 'Write l: the same curve as r, about twice as long.'),
  choose('letter-g', ['letter-k', 'letter-g', 'letter-r', 'letter-l']),
  read('Straight lines', 'Manual §2–3, p. 1', [
    'N and m are a short and a longer straight line written forward along the line of writing.',
    '“Th and t and d are struck upwards from the line of writing”: t is short, d is longer.',
  ], ['letter-n', 'letter-m', 'letter-t', 'letter-d']),
  write('letter-n', 'Write n: a short straight line, left to right.'),
  write('letter-m', 'Write m: a longer straight line, left to right.'),
  write('letter-t', 'Write t: a short line struck upward to the right.'),
  write('letter-d', 'Write d: a longer line struck upward to the right.'),
  choose('letter-t', ['letter-t', 'letter-d', 'letter-n', 'letter-m']),
  read('Th and h', 'Manual §2–3, p. 1; §22, p. 9; §78, p. 42', [
    'Th is the t stroke curved: short, and struck upward from the line like t. “The sign for t is curved to express th” (§22). It can curve either way, so th has two forms.',
    'The over form bulges up and to the left: the pen rises and rolls over to the right, turning clockwise. That is right motion, like k and g. Written alone it is the brief form for “the”.',
    'The under form bulges down and to the right: the pen dips, then swings up, turning counter-clockwise. That is left motion, like r and l. Written alone it stands for “there” and “their”.',
    'Both say th; which one a word takes is a matter of joining, given in Unit 9: “The left-motion th is used before and after o, r, l. In other cases the right-motion th is used” (§78). So thin, teeth and thick take the over form; though, throw and earth the under form.',
    '“The aspirate h is indicated by a dot placed over the vowel.”',
  ], ['letter-th-over', 'letter-th-under', 'letter-h'], ['p42-th']),
  write('letter-th-over', 'Write th, the over form: a short upward curve that bulges up to the left (right motion).'),
  write('letter-th-under', 'Write th, the under form: a short upward curve that bulges down to the right (left motion).'),
  read('Brief forms', 'Manual §3, pp. 1–2', [
    '“Many frequently recurring words are represented by simple alphabetic characters. Some of these signs represent two and even three words; for example, the sign for r represents are, our, hour.”',
    '“A dot on the line of writing represents the articles a, an.”',
  ], ['brief-k', 'brief-r', 'brief-l']),
  ...writeAll('brief-k', 'brief-g', 'brief-l', 'brief-n', 'brief-t', 'brief-d', 'brief-th-over'),
  choose('brief-l', ['brief-r', 'brief-l', 'brief-k', 'brief-g']),
  choose('brief-m', ['brief-n', 'brief-m', 'brief-t', 'brief-d']),
  read('Sentences and the period', 'Manual §4–6, p. 2', [
    'The period is a short stroke slanting down to the right. “Capitals and proper names are indicated by two short dashes beneath the word.”',
    '“The joining of simple words is a great help to accuracy and speed in writing shorthand, and its acquirement should not be deferred until the habit of writing common words separately has been formed” (§4). So common pairs are written as one outline, without lifting the pen: I will (a large circle running into l), he can (a small circle into k), it will (t up, then straight on into the long l) and in the (n, then th rising off its end).',
    'In “It will be good” the first two words are one phrase: t and l joined, then be, good and the period, each on its own.',
  ], ['sentence-it-will-be-good'], ['p2-phrasing', 'p2-punctuation']),
  write('sentence-it-will-be-good'),
  read('Vowels: the A and E groups', 'Manual §7–8, pp. 3–4', [
    '“In shorthand there are twelve distinct vowel sounds, which are arranged in four groups … In this lesson we have the first two groups.”',
    'The A group (a as in mat, calm, came) is a large circle; the E group (i as in kit, e as in get, e as in need) is a small circle.',
    'Dots and dashes can mark the exact sound, but “otherwise they are seldom used”, so they are left out here.',
  ], ['word-day', 'word-tea'], ['p3-a-group', 'p3-e-group']),
  read('Writing motion', 'Manual §9–10, p. 4', [
    '“The curved characters in this lesson are taken from horizontal ovals, one written with right motion, the other with left.”',
    'K and g are right-motion strokes; r and l are left-motion strokes. “The terms ‘left motion’ and ‘right motion’ refer to the rotation in movement, and not to the direction.”',
  ], ['letter-k', 'letter-r'], ['p4-motion', 'p4-kg-rl']),
  read('Circles on curves', 'Manual §11, p. 5', [
    '“At the beginning or end of a single curve, the circle is placed inside the curve.”',
    'So the circle hangs below k and g, and sits above r and l.',
  ], ['word-key', 'word-ear']),
  ...writeAll('word-key', 'word-egg', 'word-air', 'word-ray', 'word-alley', 'word-hack'),
  choose('word-ache', ['word-ache', 'word-eke', 'word-egg', 'word-gay']),
  read('Circles on straight strokes', 'Manual §12, p. 5', [
    '“At the beginning or end of a single straight stroke, the circle is written with right motion”: clockwise.',
  ], ['word-aim', 'word-day']),
  ...writeAll('word-ate', 'word-me', 'word-may', 'word-tea', 'word-head', 'word-ham'),
  choose('word-me', ['word-me', 'word-may', 'word-knee', 'word-nay']),
  read('Reading practice', 'Manual §13, p. 6', [
    'The manual closes the unit with a page of shorthand to read and take from dictation. Name each outline below.',
  ]),
  choose('word-hate', ['word-hate', 'word-heat', 'word-ham', 'word-head']),
  choose('word-alley', ['word-alley', 'word-ail', 'word-ill', 'word-airy']),
  choose('word-eddy', ['word-eddy', 'word-eat', 'word-add', 'word-day']),
  choose('word-array', ['word-array', 'word-era', 'word-ray', 'word-airy']),
];

const UNIT_2 = [
  read('Circles between strokes', 'Manual §14, p. 7', [
    '“Where an angle, or a point, is formed at the junction of consonants, the circle goes outside the angle.”',
    'When the pen turns left at the joint the circle hangs below it (make); when it turns right the circle sits above (rain).',
  ], ['word-make', 'word-rain']),
  ...writeAll('word-cake', 'word-gate', 'word-team', 'word-rim', 'word-dream'),
  choose('word-get', ['word-get', 'word-kick', 'word-cake', 'word-gate']),
  read('Joined without an angle', 'Manual §15, p. 7', [
    '“Where straight strokes and curves join without an angle, or where two similar-motion curves join without an angle, the circle is placed inside the curve.”',
  ], ['word-rate', 'word-tag']),
  ...writeAll('word-deck', 'word-rid', 'word-ticket', 'word-riddle'),
  read('Obscure vowels', 'Manual §16, p. 7', [
    '“Some vowels are so obscure or neutral that they are omitted when they do not contribute to speed or legibility. For example, the e in the words taken and maker is absolutely useless, and is omitted.”',
  ], ['word-taken', 'word-maker']),
  write('word-taken'),
  read('Straight strokes in line', 'Manual §17, p. 8', [
    '“Between straight strokes in the same direction the circle is written with right motion.”',
  ], ['word-deed', 'word-mean']),
  ...writeAll('word-dad', 'word-main'),
  read('Opposite curves', 'Manual §18, p. 8', [
    '“Between opposite curves the circle is turned back on the first curve.”',
    'The circle lies inside the second curve, against the first: below the joint after r or l, above it after k.',
  ], ['word-wreck', 'word-kill']),
  ...writeAll('word-rag', 'word-lake'),
  choose('word-rag', ['word-rag', 'word-wreck', 'word-lake', 'word-kill']),
  read('Kr and gl', 'Manual §19, p. 8', [
    '“K and r, and g and l, are equal curves and are made a little flatter than usual when joined.”',
  ], ['word-cream', 'word-glee'], ['p8-kr-gl']),
  ...writeAll('word-crane', 'word-gleam', 'word-acre'),
  read('Gr and kl', 'Manual §20, p. 9', [
    '“Where curves of unequal length join without an angle … note how a distinction in length is positively shown. The movement in writing gr is similar to that in writing y in longhand; kl to that in writing h.”',
  ], ['word-gray', 'word-clay'], ['p9-gr-kl']),
  ...writeAll('word-grain', 'word-clan', 'word-eager'),
  choose('word-gray', ['word-gray', 'word-glee', 'word-clay', 'word-cream']),
  read('Rk and lk', 'Manual §21, p. 9', [
    '“Since r and k are of equal length, the curves are somewhat flatter, as with kr and gl. Lk is very infrequent.”',
  ], ['word-dark', 'word-milk']),
  ...writeAll('word-mark', 'word-milk'),
  read('The signs for th', 'Manual §22, p. 9', [
    '“The sign for t is curved to express th.” Compare tick and thick.',
  ], ['word-tick', 'word-thick']),
  write('word-thick'),
  choose('word-dark', ['word-dark', 'word-mark', 'word-ark', 'word-milk']),
  choose('word-deed', ['word-deed', 'word-dad', 'word-mean', 'word-main']),
  choose('word-greet', ['word-greet', 'word-greed', 'word-green', 'word-grim']),
];

const UNIT_3 = [
  read('The ted blend', 'Manual §26, p. 12', [
    '“By blending d and t into one long stroke the syllables ted, ded, det are expressed.”',
    '“The combination det usually occurs at the beginning of words, as in detect, detach, while ted or ded usually occurs at the end of a word.”',
  ], ['letter-ted', 'word-added', 'word-today']),
  ...writeAll('word-hated', 'word-needed', 'word-rated', 'word-treated'),
  choose('word-today', ['word-today', 'word-added', 'word-rated', 'word-needed']),
  read('The men blend', 'Manual §27, p. 12', [
    '“By blending m and n into one long stroke the syllables men, mem are expressed. In addition to men, mem this blend represents similar sounds, such as min in minute, mun in money.”',
    'Many and money share one outline: the blend and a small circle.',
  ], ['letter-men', 'word-meant', 'word-mend']),
  write('word-many', 'Write “many” (money has the same outline).'),
  ...writeAll('word-minute', 'word-memory', 'word-remain', 'word-emanate', 'word-mental'),
  choose('word-mend', ['word-mend', 'word-meant', 'word-minute', 'word-mental']),
  read('Frequent-word drill', 'Manual §28, pp. 13–14', [
    'The drill spells the most common words by sound: eight is ā t, had is h ă d, him is h ĭ m. Write each one until it comes without hesitation.',
    'Some drill words share an outline you already know: eight = ate, aid = add, meet = met, made = maid, man = main, came = calm, lack = lake, read = red.',
  ], ['word-had', 'word-train']),
  write('word-ate', 'Write “eight” (the same outline as ate).'),
  ...writeAll('word-had', 'word-him', 'word-net', 'word-need', 'word-tin', 'word-cat', 'word-kid', 'word-her'),
  write('word-calm', 'Write “came” (the same outline as calm).'),
  ...writeAll('word-ready', 'word-late', 'word-mill', 'word-tree', 'word-train', 'word-clean', 'word-leg', 'word-attack', 'word-headache'),
  choose('word-tin', ['word-tin', 'word-tan', 'word-net', 'word-need']),
  choose('word-late', ['word-late', 'word-laid', 'word-led', 'word-leg']),
  choose('word-kid', ['word-kid', 'word-cat', 'word-get', 'word-need']),
  read('Brief forms', 'Manual §29, p. 14', [
    '“W is omitted in the word were, and wh in where, when, what … time, by the tem blend … For convenience, the long i in my is expressed by a large circle.”',
    'Did and date are the ted blend on its own.',
  ], ['brief-when', 'brief-were', 'brief-where']),
  ...writeAll('brief-ted', 'brief-tem', 'brief-when', 'brief-any', 'brief-were', 'brief-where', 'brief-my', 'brief-could', 'brief-come', 'brief-little', 'brief-country'),
  choose('brief-were', ['brief-were', 'brief-where', 'brief-when', 'brief-any']),
  choose('brief-could', ['brief-could', 'brief-country', 'brief-come', 'brief-k']),
  read('Putting it together', 'Built from Manual §1–12 and §29', [
    'A sentence with the brief form for any. Write each word as its own outline, then the period.',
  ], ['sentence-any-day-is-good']),
  write('sentence-any-day-is-good'),
];

// A step's key is stable while the lesson text changes, so saved progress survives edits.
export function stepKey(step) {
  return step.type === 'read' ? `read:${step.title}` : `${step.type}:${step.example}`;
}

export const LESSONS = [
  { id: 'unit-1', unit: 1, title: 'Unit 1', subtitle: 'The first consonants, vowel circles and how circles join', pages: 'pp. 1–6', steps: UNIT_1 },
  { id: 'unit-2', unit: 2, title: 'Unit 2', subtitle: 'Circles between strokes and joined curves', pages: 'pp. 7–11', steps: UNIT_2 },
  { id: 'unit-3', unit: 3, title: 'Unit 3', subtitle: 'The ted and men blends, the frequent-word drill and brief forms', pages: 'pp. 12–14', steps: UNIT_3 },
];

// Steps that must be done (written or answered) to finish a unit; read steps are done on sight.
export const isTask = (step) => step.type !== 'read';

const BY_ID = new Map(EXAMPLES.map((e) => [e.id, e]));
export const exampleFor = (id) => BY_ID.get(id);
