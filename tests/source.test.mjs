import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE, PDF_PAGE_OFFSET, sourceUrl } from '../app/data/source.js';
import { MANUAL_TEXT } from '../app/data/manual.js';
import { READINGS } from '../app/data/reading.js';

test('the scan is linked at the page the plates are cut from', () => {
  const plates = JSON.parse(readFileSync(new URL('../tools/plates.json', import.meta.url)));
  assert.equal(PDF_PAGE_OFFSET, plates.pageOffset);
  assert.equal(sourceUrl.page(23), `${SITE}Annivman.pdf#page=39`);
});

test('every unit and every reading key has its page on the site', () => {
  for (const u of Object.keys(MANUAL_TEXT).map(Number)) assert.match(sourceUrl.unit(u), /\/anunit\d\d\.html$/);
  assert.equal(sourceUrl.unit(2, 14), `${SITE}anunit02.html#p14`);
  for (const r of READINGS) assert.equal(sourceUrl.readingKey(r.unit), `${SITE}trpanu${String(r.unit).padStart(2, '0')}.html`);
});
