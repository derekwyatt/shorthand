// The PNG writer and reader shared by the image tools.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { crc32, encodeGray, decodePng } from '../tools/png.mjs';

const picture = (w, h) => Buffer.from(Array.from({ length: w * h }, (_, i) => ((i % w) * 37 + Math.floor(i / w) * 11) & 0xff));

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('a grayscale picture survives encoding and decoding, with every filter', () => {
  const [w, h] = [13, 7];
  const px = picture(w, h);
  for (const filters of [[1], [2], [4], [1, 2, 4]]) {
    const out = decodePng(encodeGray(w, h, px, filters));
    assert.deepEqual({ w: out.w, h: out.h, channels: out.channels }, { w, h, channels: 1 });
    assert.deepEqual(out.px, px);
  }
});

test('the encoder keeps the smallest of the filters it tries', () => {
  const [w, h] = [40, 40];
  const px = picture(w, h);
  const size = (f) => encodeGray(w, h, px, f).length;
  assert.equal(size([1, 2, 4]), Math.min(size([1]), size([2]), size([4])));
});

test('every row of the image data starts with a filter type the encoder offered', () => {
  const [w, h] = [9, 5];
  const png = encodeGray(w, h, picture(w, h), [2]);
  const idat = png.subarray(8 + 25 + 8, png.length - 12 - 4);
  const raw = inflateSync(idat);
  for (let y = 0; y < h; y++) assert.equal(raw[y * (w + 1)], 2);
});

test('the decoder refuses what it cannot read', () => {
  const png = Buffer.from(encodeGray(2, 2, Buffer.alloc(4)));
  png[8 + 8 + 8] = 16; // bit depth
  assert.throws(() => decodePng(png), /unsupported PNG/);
});
