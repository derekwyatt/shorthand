// Tests for progress backup/restore (app/js/backup.js). Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportProgress, importProgress, backupFileName } from '../app/js/backup.js';

// Minimal in-memory Storage.
function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m),
  };
}

const SAMPLE = { 'gregg.practice.v2': '{"a":1}', 'gregg.writer.v1': '{"scale":1.1}', other: 'keep' };
const NOW = new Date('2026-03-04T12:00:00Z');

test('export picks only gregg.* keys and round-trips', () => {
  const backup = exportProgress(fakeStorage(SAMPLE), NOW);
  assert.equal(backup.app, 'gregg-trainer');
  assert.equal(backup.format, 1);
  assert.equal(backup.exportedAt, '2026-03-04T12:00:00.000Z');
  assert.deepEqual(Object.keys(backup.data).sort(), ['gregg.practice.v2', 'gregg.writer.v1']);
  const target = fakeStorage();
  const n = importProgress(target, JSON.parse(JSON.stringify(backup)));
  assert.equal(n, 2);
  assert.deepEqual(target.dump(), { 'gregg.practice.v2': '{"a":1}', 'gregg.writer.v1': '{"scale":1.1}' });
});

test('import replaces gregg.* keys and leaves others alone', () => {
  const target = fakeStorage({ 'gregg.quiz.v1': '[]', 'gregg.writer.v1': '{"scale":0.7}', other: 'keep' });
  importProgress(target, exportProgress(fakeStorage(SAMPLE), NOW));
  assert.deepEqual(target.dump(), { other: 'keep', 'gregg.practice.v2': '{"a":1}', 'gregg.writer.v1': '{"scale":1.1}' });
});

test('invalid backups throw and leave storage untouched', () => {
  const good = () => exportProgress(fakeStorage(SAMPLE), NOW);
  const bad = [
    { ...good(), app: 'other' },
    { ...good(), format: 2 },
    { ...good(), data: { other: '1' } },
    { ...good(), data: { 'gregg.x': 5 } },
    { ...good(), data: { 'gregg.x': 'not json' } },
    { app: 'gregg-trainer', format: 1 },
    { ...good(), data: [] },
    null,
  ];
  for (const b of bad) {
    const target = fakeStorage({ 'gregg.quiz.v1': '[]', other: 'keep' });
    assert.throws(() => importProgress(target, b), Error);
    assert.deepEqual(target.dump(), { 'gregg.quiz.v1': '[]', other: 'keep' });
  }
});

test('backupFileName uses the local date', () => {
  assert.equal(backupFileName(new Date(2026, 0, 5, 23, 30)), 'gregg-progress-2026-01-05.json');
});
