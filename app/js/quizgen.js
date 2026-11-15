// Quiz generation: pure functions (no DOM), seeded so a quiz can be reproduced.
import { EXAMPLES, LEVELS } from '../data/examples.js';
import { STROKE_BY_ID, FAMILIES } from '../data/strokes.js';

const ALL_KINDS = ['letter', 'brief', 'word', 'sentence'];
const ALL_LEVELS = LEVELS.map((l) => l.id);
const ALL_TYPES = ['read', 'write', 'series'];
const SINGLE_TYPES = ['read', 'write'];
const SERIES_IDS = ['n-m', 't-d', 'k-g', 'r-l', 'p-b', 'f-v', 'sh-ch-j', 'th-over', 'th-under', 'ng-nk'];
const SERIES_PROMPT = 'Write each look-alike when asked. Results appear at the end.';
const MEMBER_PROMPTS = {
  's-left': 'Write “s” (the form that curves like p).',
  's-right': 'Write “s” (the form that curves like f).',
  'th-over': 'Write “th” (over form).',
  'th-under': 'Write “th” (under form).',
};
const CHOICES = 4;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pickValid = (list, allowed) => {
  const ok = Array.isArray(list) ? [...new Set(list.filter((x) => allowed.includes(x)))] : [];
  return ok.length ? ok : allowed;
};

const strokeIdOf = (example) => example.id.replace(/^(letter|brief)-/, '');
const familyOf = (example) => FAMILIES.find((f) => f.members.includes(strokeIdOf(example)))?.id;
const shares = (a, b) => a.outline.some((t) => b.outline.includes(t));
const sharesWord = (a, b) => (a.words || []).some((w) => (b.words || []).some((v) => v.text.toLowerCase() === w.text.toLowerCase() && w.text !== '.'));

// Higher = more confusable with the answer.
function similarity(answer, other) {
  if (answer.kind === 'letter' || answer.kind === 'brief') {
    const sameFamily = familyOf(answer) !== undefined && familyOf(answer) === familyOf(other) ? 10 : 0;
    return sameFamily + (answer.outline.length === other.outline.length ? 1 : 0);
  }
  if (answer.kind === 'word') return shares(answer, other) ? 5 : 0;
  return sharesWord(answer, other) ? 5 : 0;
}

function pickChoices(answer, pool, rng) {
  const inPool = (e) => e.title !== answer.title;
  const sameLevel = pool.filter((e) => e.level === answer.level && inPool(e));
  const sameKind = sameLevel.length >= CHOICES - 1 ? sameLevel : pool.filter((e) => e.kind === answer.kind && inPool(e));
  const scored = shuffle(sameKind, rng).map((e) => ({ e, s: similarity(answer, e) }));
  scored.sort((a, b) => b.s - a.s);
  const picked = [];
  const titles = new Set([answer.title]);
  for (const { e } of scored) {
    if (picked.length === CHOICES - 1) break;
    if (titles.has(e.title)) continue;
    titles.add(e.title);
    picked.push(e);
  }
  return shuffle([answer, ...picked], rng).map((e) => e.id);
}

function writePrompt(example, rng) {
  if (example.kind === 'letter') {
    const forms = STROKE_BY_ID[strokeIdOf(example)]?.briefForms || [];
    if (forms.length && rng() < 0.5) return `Write the brief form for “${forms[Math.floor(rng() * forms.length)]}”.`;
    return `Write the letter “${example.title}”.`;
  }
  if (example.kind === 'brief') return `Write the brief form for “${example.title.split(' / ')[0]}”.`;
  if (example.kind === 'word') return `Write the word “${example.title}”.`;
  return `Write the sentence: “${example.title}”`;
}

function makeQuestion(example, type, pool, rng) {
  if (type === 'read') {
    return { type, exampleId: example.id, prompt: 'What does this say?', choices: pickChoices(example, pool, rng) };
  }
  return { type, exampleId: example.id, prompt: writePrompt(example, rng) };
}

const BY_ID = new Map(EXAMPLES.map((e) => [e.id, e]));

// Look-alike families whose members all exist as letter examples.
function seriesFamilies() {
  return FAMILIES.filter((f) => SERIES_IDS.includes(f.id))
    .map((f) => ({ id: f.id, ids: f.members.map((m) => `letter-${m}`) }))
    .filter((f) => f.ids.every((id) => BY_ID.has(id)));
}

function makeSeries(family, rng) {
  const exampleIds = shuffle(family.ids, rng);
  const prompts = exampleIds.map((id) => MEMBER_PROMPTS[strokeIdOf(BY_ID.get(id))] || `Write “${BY_ID.get(id).title}”.`);
  return { type: 'series', familyId: family.id, prompt: SERIES_PROMPT, exampleIds, prompts };
}

export function generateQuiz({ n = 10, levels, kinds, types = ALL_TYPES, seed } = {}) {
  // `kinds` is kept for backward compatibility; it only applies when `levels` is not given.
  const useLevels = Array.isArray(levels) && levels.length ? pickValid(levels.map(Number), ALL_LEVELS) : ALL_LEVELS;
  const useKinds = pickValid(kinds, ALL_KINDS);
  const byLevels = Array.isArray(levels) && levels.length;
  const useTypes = pickValid(types, ALL_TYPES);
  const realSeed = Number.isFinite(Number(seed)) && seed !== undefined && seed !== null && seed !== ''
    ? Number(seed) >>> 0
    : Math.floor(Math.random() * 4294967296);
  const rng = mulberry32(realSeed);
  const pool = EXAMPLES.filter((e) => (byLevels ? useLevels.includes(e.level) : useKinds.includes(e.kind)));
  const families = (byLevels ? useLevels.includes(1) : useKinds.includes('letter')) && useTypes.includes('series') ? seriesFamilies() : [];
  const singleTypes = useTypes.filter((t) => SINGLE_TYPES.includes(t));
  const wanted = Math.min(Math.max(1, Math.floor(Number(n)) || 10), 30);
  const seriesOnly = families.length > 0 && !singleTypes.length;
  const useSingles = singleTypes.length ? singleTypes : SINGLE_TYPES;
  const count = seriesOnly ? Math.min(wanted, families.length) : Math.min(wanted, pool.length);
  let seriesCount = 0;
  if (seriesOnly) seriesCount = count;
  else if (families.length) seriesCount = Math.min(families.length, count, Math.max(count >= 3 ? 1 : 0, Math.round(count / 4)));
  const chosenFamilies = shuffle(families, rng).slice(0, seriesCount);
  const used = new Set(chosenFamilies.flatMap((f) => f.ids));
  const singlePool = pool.filter((e) => !used.has(e.id));
  const chosen = shuffle(singlePool, rng).slice(0, count - seriesCount);
  const singles = chosen.map((example, i) => {
    // Alternate types from a shuffled start so the mix is roughly balanced.
    const type = useSingles.length === 1 ? useSingles[0] : useSingles[(i + Math.floor(rng() * 2)) % useSingles.length];
    return makeQuestion(example, type, pool, rng);
  });
  const series = chosenFamilies.map((family) => makeSeries(family, rng));
  const questions = shuffle([...singles, ...series], rng);
  return { id: `quiz-${realSeed.toString(36)}`, seed: realSeed, createdAt: new Date().toISOString(), questions };
}
