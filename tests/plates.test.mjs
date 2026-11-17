// Tests for the manual plates (data/plates.js, tools/plates.json, app/plates/*.png).
// Run: node --test tests/
// The images are cut from the scan by tools/plates.mjs; these tests check that every crop has
// its image, that the lookup only points at real files and pages, and that the pages agree
// with the source citations of the examples.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { plateFor, sectionPlate, SECTION_PLATES } from '../app/data/plates.js';
import { EXAMPLES } from '../app/data/examples.js';
import { LESSONS } from '../app/data/lessons.js';

const PLATES_DIR = new URL('../app/plates/', import.meta.url);
const CROPS = JSON.parse(fs.readFileSync(new URL('../tools/plates.json', import.meta.url), 'utf8')).crops;
const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]));
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const fileOf = (p) => new URL(p.src, new URL('../app/', import.meta.url));
const idOf = (p) => p.src.replace(/^plates\//, '').replace(/\.png$/, '');

test('every crop has a PNG image, 8-bit grayscale, and there are no stray images', () => {
  assert.equal(new Set(CROPS.map((c) => c.id)).size, CROPS.length, 'duplicate crop ids');
  for (const c of CROPS) {
    const buf = fs.readFileSync(new URL(`${c.id}.png`, PLATES_DIR));
    assert.ok(buf.subarray(0, 8).equals(SIGNATURE), `${c.id}: PNG signature`);
    assert.equal(buf.toString('latin1', 12, 16), 'IHDR', `${c.id}: IHDR first`);
    assert.equal(buf[24], 8, `${c.id}: bit depth`);
    assert.equal(buf[25], 0, `${c.id}: colour type (grayscale)`);
  }
  const files = fs.readdirSync(PLATES_DIR).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
  for (const f of files) assert.ok(CROP_BY_ID.has(f), `stray image ${f}.png is not in plates.json`);
});

test('every plateFor() result points at an existing file and a page of the manual', () => {
  let n = 0;
  for (const ex of EXAMPLES) {
    const p = plateFor(ex.id);
    if (!p) continue;
    n++;
    assert.ok(fs.existsSync(fileOf(p)), `${ex.id}: missing ${p.src}`);
    assert.ok(Number.isInteger(p.page) && p.page >= 1 && p.page <= 176, `${ex.id}: page ${p.page}`);
  }
  assert.ok(n > 100, 'plates are found for the examples');
});

test('aliases resolve to the plate they name', () => {
  assert.equal(plateFor('brief-k').src, plateFor('letter-k').src);
  assert.equal(plateFor('brief-k').src, 'plates/letter-k.png');
  assert.equal(plateFor('brief-th-over').src, 'plates/letter-th.png');
  assert.equal(plateFor('letter-th-under').src, 'plates/letter-th.png');
  assert.equal(plateFor('brief-men').src, 'plates/letter-men.png');
});

test('plates are keyed by real examples, and their pages match plates.json', () => {
  for (const ex of EXAMPLES) {
    const p = plateFor(ex.id);
    if (!p) continue;
    const crop = CROP_BY_ID.get(idOf(p));
    assert.ok(crop, `${ex.id}: no crop for ${p.src}`);
    assert.equal(crop.page, p.page, `${ex.id}: page in plates.js vs plates.json`);
  }
  // No plate keyed by a typo: every crop that is not a section plate belongs to an example
  // (directly, or through an alias).
  const reached = new Set(EXAMPLES.map((e) => plateFor(e.id)).filter(Boolean).map(idOf));
  for (const c of CROPS) {
    if (SECTION_PLATES[c.id]) continue;
    assert.ok(reached.has(c.id), `crop ${c.id} is not used by any example (typo in plates.js?)`);
  }
});

test('cited manual pages on levels 7 and 8 have a plate on that page', () => {
  let n = 0;
  for (const ex of EXAMPLES) {
    if (ex.level !== 7 && ex.level !== 8) continue;
    const m = /^Gregg Shorthand Manual \(1929\), p\. (\d+)$/.exec(ex.source ?? '');
    if (!m) continue;
    n++;
    const p = plateFor(ex.id);
    assert.ok(p, `${ex.id} (${ex.source}) has no plate`);
    assert.equal(p.page, Number(m[1]), `${ex.id}: plate page vs source`);
  }
  assert.ok(n > 50);
});

test('lesson plate ids resolve, and every section plate is used by a lesson', () => {
  const used = new Set();
  for (const l of LESSONS) {
    for (const s of l.steps) {
      if (s.type !== 'read') continue;
      for (const id of s.plates ?? []) {
        used.add(id);
        const p = sectionPlate(id);
        assert.ok(p, `${l.id}: unknown section plate ${id}`);
        assert.ok(fs.existsSync(fileOf(p)), `${id}: missing image`);
        assert.equal(CROP_BY_ID.get(id)?.page, p.page, `${id}: page`);
      }
    }
  }
  for (const id of Object.keys(SECTION_PLATES)) assert.ok(used.has(id), `section plate ${id} is not used by a lesson`);
  assert.equal(sectionPlate('nope'), null);
});

test('plateFor is null for examples the manual does not print', () => {
  const sentence = EXAMPLES.find((e) => e.kind === 'sentence');
  assert.ok(sentence);
  assert.equal(plateFor(sentence.id), null);
  assert.equal(plateFor('no-such-example'), null);
});
