import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuiz } from '../app/js/quizgen.js';
import { EXAMPLES, LEVELS } from '../app/data/examples.js';
import { FAMILIES } from '../app/data/strokes.js';

const BY_ID = new Map(EXAMPLES.map((e) => [e.id, e]));
const ALL = LEVELS.map((l) => l.id);
const COMBOS = [
  {}, { levels: [1] }, { levels: [2] }, { levels: [3, 4] }, { levels: [5] }, { levels: [5, 6] }, { levels: [2, 3, 6] }, { levels: [7] }, { levels: [8] }, { levels: [7, 8] },
  { types: ['read'] }, { types: ['write'] }, { types: ['series'] }, { types: ['series'], levels: [1], n: 3 }, { levels: [1], n: 12 }, { levels: [1], types: ['read'] }, { n: 5 }, { n: 20 }, { n: 99 }, { n: 0 },
];
const poolSize = (levels = ALL) => EXAMPLES.filter((e) => levels.includes(e.level)).length;

function* cases() {
  for (const opts of COMBOS) for (let seed = 1; seed <= 25; seed++) yield { opts, seed };
}

test('count, uniqueness, kinds and types are respected', () => {
  for (const { opts, seed } of cases()) {
    const quiz = generateQuiz({ ...opts, seed });
    const levels = opts.levels || ALL;
    const seriesOnly = opts.types?.length === 1 && opts.types[0] === 'series' && levels.includes(1);
    const want = Math.min(Math.max(1, Math.floor(opts.n ?? 10) || 10), 30, seriesOnly ? 10 : poolSize(levels));
    assert.equal(quiz.questions.length, want, JSON.stringify(opts));
    const ids = quiz.questions.flatMap((q) => q.exampleIds || [q.exampleId]);
    assert.equal(new Set(ids).size, ids.length);
    for (const q of quiz.questions) {
      assert.ok((opts.types || ['read', 'write', 'series']).includes(q.type) || (!levels.includes(1) && q.type !== 'series'));
      for (const id of q.exampleIds || [q.exampleId]) assert.ok(levels.includes(BY_ID.get(id).level));
    }
  }
});

test('read questions have 4 unique same-kind choices without title clashes', () => {
  for (const { opts, seed } of cases()) {
    for (const q of generateQuiz({ ...opts, seed }).questions.filter((x) => x.type === 'read')) {
      const answer = BY_ID.get(q.exampleId);
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(q.choices.includes(q.exampleId));
      const titles = q.choices.map((id) => BY_ID.get(id).title);
      assert.equal(new Set(titles).size, 4);
      for (const id of q.choices) assert.equal(BY_ID.get(id).kind, answer.kind);
    }
  }
});

test('read distractors come from the answer level and never share its title', () => {
  for (const { opts, seed } of cases()) {
    for (const q of generateQuiz({ ...opts, seed }).questions.filter((x) => x.type === 'read')) {
      const answer = BY_ID.get(q.exampleId);
      for (const id of q.choices) assert.equal(BY_ID.get(id).level, answer.level);
    }
  }
});

test('brief-form write prompts name the first word', () => {
  const quiz = generateQuiz({ levels: [2], types: ['write'], n: 22, seed: 4 });
  for (const q of quiz.questions) {
    assert.equal(q.prompt, `Write the brief form for “${BY_ID.get(q.exampleId).title.split(' / ')[0]}”.`);
  }
});

test('the kinds option still works when levels is not given', () => {
  for (let seed = 1; seed <= 10; seed++) {
    for (const q of generateQuiz({ kinds: ['word'], seed }).questions) assert.equal(BY_ID.get(q.exampleId).kind, 'word');
  }
});

test('write prompts are non-empty and do not reveal the outline', () => {
  for (const { opts, seed } of cases()) {
    for (const q of generateQuiz({ ...opts, seed }).questions.filter((x) => x.type === 'write')) {
      assert.ok(q.prompt.length > 0);
      const ex = BY_ID.get(q.exampleId);
      // Letter prompts name the letter and sentences quote real words (e.g. “men”), so only words are checked.
      if (ex.kind !== 'word') continue;
      for (const t of new Set(ex.outline.filter((x) => x.length > 1 && !ex.title.includes(x)))) assert.ok(!q.prompt.includes(t), `${q.prompt} leaks ${t}`);
    }
  }
});

test('same seed gives the same quiz; different seeds differ', () => {
  const strip = (q) => JSON.stringify({ id: q.id, seed: q.seed, questions: q.questions });
  for (let seed = 1; seed <= 20; seed++) assert.equal(strip(generateQuiz({ seed })), strip(generateQuiz({ seed })));
  const variants = new Set();
  for (let seed = 1; seed <= 20; seed++) variants.add(strip(generateQuiz({ seed })));
  assert.ok(variants.size > 15);
});

test('random seed when none is given; empty kinds/types fall back to all', () => {
  const a = generateQuiz();
  assert.ok(Number.isInteger(a.seed) && !Number.isNaN(Date.parse(a.createdAt)));
  const quiz = generateQuiz({ n: 30, levels: [], types: [], seed: 7 });
  assert.equal(quiz.questions.length, 30);
  assert.ok(new Set(quiz.questions.map((q) => BY_ID.get(q.exampleId || q.exampleIds[0]).kind)).size > 1);
  assert.deepEqual(generateQuiz({ levels: ['bogus'], seed: 3 }).questions, generateQuiz({ seed: 3 }).questions);
});

const SERIES = ['n-m', 't-d', 'k-g', 'r-l', 'p-b', 'f-v', 'sh-ch-j', 'th-over', 'th-under', 'ng-nk'];
const seriesOf = (quiz) => quiz.questions.filter((q) => q.type === 'series');

test('series questions are look-alike families, each member once, no repeats', () => {
  let seen = 0;
  for (const { opts, seed } of cases()) {
    const quiz = generateQuiz({ ...opts, seed });
    const series = seriesOf(quiz);
    seen += series.length;
    const famIds = series.map((q) => q.familyId);
    assert.equal(new Set(famIds).size, famIds.length);
    const others = new Set(quiz.questions.filter((q) => q.type !== 'series').map((q) => q.exampleId));
    for (const q of series) {
      assert.ok(SERIES.includes(q.familyId));
      const want = FAMILIES.find((f) => f.id === q.familyId).members.map((m) => `letter-${m}`);
      assert.deepEqual([...q.exampleIds].sort(), [...want].sort());
      assert.equal(q.prompts.length, q.exampleIds.length);
      assert.ok(q.prompt.length > 0);
      for (const id of q.exampleIds) assert.ok(!others.has(id));
      q.exampleIds.forEach((id, i) => {
        if (id === 'letter-s-left') assert.match(q.prompts[i], /curves like p/);
        if (id === 'letter-s-right') assert.match(q.prompts[i], /curves like f/);
        if (id === 'letter-th-over') assert.match(q.prompts[i], /over form/);
        if (id === 'letter-th-under') assert.match(q.prompts[i], /under form/);
      });
    }
  }
  assert.ok(seen > 0);
});

test('series-only quizzes are all series; no series without letters', () => {
  const quiz = generateQuiz({ types: ['series'], n: 99, seed: 5 });
  assert.equal(quiz.questions.length, 10);
  assert.ok(quiz.questions.every((q) => q.type === 'series'));
  assert.equal(generateQuiz({ types: ['series'], n: 3, seed: 5 }).questions.length, 3);
  for (let seed = 1; seed <= 25; seed++) {
    assert.equal(seriesOf(generateQuiz({ levels: [2, 3, 4, 5, 6], seed })).length, 0);
    assert.equal(seriesOf(generateQuiz({ types: ['read', 'write'], seed })).length, 0);
    assert.ok(seriesOf(generateQuiz({ n: 10, levels: [1], seed })).length >= 1);
  }
});

test('series quizzes are deterministic for a seed', () => {
  const strip = (q) => JSON.stringify(q.questions);
  for (let seed = 1; seed <= 10; seed++) assert.equal(strip(generateQuiz({ types: ['series'], seed })), strip(generateQuiz({ types: ['series'], seed })));
});
