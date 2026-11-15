import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = 8791;
const base = `http://127.0.0.1:${PORT}`;
const root = fileURLToPath(new URL('..', import.meta.url));
const child = spawn('node', ['tools/dev-server.mjs'], { cwd: root, env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' }, stdio: 'ignore' });
after(() => child.kill());

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/index.html`)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('dev server did not start');
}

test('GET /api/quiz returns a quiz', async () => {
  await waitUp();
  const res = await fetch(`${base}/api/quiz?n=5&levels=3,4&types=read`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const quiz = await res.json();
  assert.equal(quiz.questions.length, 5);
  assert.ok(quiz.questions.every((q) => q.type === 'read' && q.exampleId.startsWith('word-')));
  const other = await (await fetch(`${base}/api/quiz?n=5&levels=3,4&types=read`)).json();
  assert.notEqual(quiz.seed, other.seed);
});

test('bad parameters still give a valid quiz', async () => {
  await waitUp();
  const res = await fetch(`${base}/api/quiz?n=abc&levels=nope`);
  assert.equal(res.status, 200);
  const quiz = await res.json();
  assert.ok(quiz.questions.length >= 1 && quiz.id);
});

test('types=series gives series questions', async () => {
  await waitUp();
  const quiz = await (await fetch(`${base}/api/quiz?types=series&n=3`)).json();
  assert.equal(quiz.questions.length, 3);
  assert.ok(quiz.questions.every((q) => q.type === 'series' && q.exampleIds.length >= 2));
});
