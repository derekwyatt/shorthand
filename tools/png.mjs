// Minimal PNG reading and writing for the image tools (tools/plates.mjs, tools/upscale.mjs):
// 8-bit grayscale out, 8-bit gray/RGB(A) non-interlaced in. No dependencies.
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

// The filter's prediction for a byte: a = left, b = above, c = above-left.
const predict = (type, a, b, c) => [0, a, b, (a + b) >> 1, paeth(a, b, c)][type];

// An 8-bit grayscale PNG of `px` (w×h bytes, 0 = black). Rows are filtered with whichever of
// `filters` (PNG filter types: 1 Sub, 2 Up, 4 Paeth) compresses the picture best.
export function encodeGray(w, h, px, filters = [1, 2, 4]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const filtered = (type) => {
    const raw = Buffer.alloc((w + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w + 1)] = type;
      for (let x = 0; x < w; x++) {
        const a = x ? px[y * w + x - 1] : 0, b = y ? px[(y - 1) * w + x] : 0, c = x && y ? px[(y - 1) * w + x - 1] : 0;
        raw[y * (w + 1) + 1 + x] = (px[y * w + x] - predict(type, a, b, c)) & 0xff;
      }
    }
    return deflateSync(raw, { level: 9 });
  };
  const idat = filters.map(filtered).reduce((m, x) => (x.length < m.length ? x : m));
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// { w, h, channels, px } of an 8-bit, non-interlaced PNG (gray, gray+alpha, RGB or RGBA).
export function decodePng(buf) {
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const kind = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') [w, h, depth, type, interlace] = [body.readUInt32BE(0), body.readUInt32BE(4), body[8], body[9], body[12]];
    if (kind === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const channels = { 0: 1, 4: 2, 2: 3, 6: 4 }[type];
  if (depth !== 8 || !channels || interlace) throw new Error(`unsupported PNG (type ${type}, depth ${depth}, interlace ${interlace})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? px[y * stride + i - channels] : 0;
      const b = y ? px[(y - 1) * stride + i] : 0;
      const c = i >= channels && y ? px[(y - 1) * stride + i - channels] : 0;
      px[y * stride + i] = (raw[y * (stride + 1) + 1 + i] + predict(f, a, b, c)) & 0xff;
    }
  }
  return { w, h, channels, px };
}
