// Redraws the line-art GIFs from greggshorthand.github.io at a higher resolution.
// Run (macOS, needs sips): node tools/upscale.mjs <dir of .gif> <out dir>
//
// The GIFs are 1-bit with transparency, so enlarged they show stair-stepped edges. Each is
// resampled (Catmull-Rom; 3×, or 2× when already large), softened a little and passed through
// a steep tone curve around half ink: that rebuilds smooth, anti-aliased contours without
// thickening the strokes. The output is a grayscale PNG of the same name.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('usage: node tools/upscale.mjs <gif dir> <out dir>');
const tmp = mkdtempSync(join(tmpdir(), 'upscale-'));

// The darkness (0 = paper, 1 = ink) of an 8-bit RGBA, non-interlaced PNG (what sips writes).
function readDarkness(file) {
  const buf = readFileSync(file);
  let pos = 8, w = 0, h = 0, depth = 0, type = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const kind = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9]; }
    if (kind === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const ch = { 6: 4, 2: 3, 4: 2, 0: 1 }[type];
  if (depth !== 8 || !ch) throw new Error(`${file}: PNG type ${type}/${depth}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const a = i >= ch ? px[y * stride + i - ch] : 0;
      const b = y ? px[(y - 1) * stride + i] : 0;
      const c = i >= ch && y ? px[(y - 1) * stride + i - ch] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      px[y * stride + i] = (x + pred) & 0xff;
    }
  }
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    const lum = ch >= 3 ? (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255 : px[o] / 255;
    const alpha = ch === 4 ? px[o + 3] / 255 : ch === 2 ? px[o + 1] / 255 : 1;
    d[i] = alpha * (1 - lum);
  }
  return { w, h, d };
}

const cubic = (t) => {
  const a = Math.abs(t);
  return a < 1 ? 1.5 * a ** 3 - 2.5 * a ** 2 + 1 : a < 2 ? -0.5 * a ** 3 + 2.5 * a ** 2 - 4 * a + 2 : 0;
};

function resample({ w, h, d }, s) {
  const W = w * s, H = h * s;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  const o = new Float32Array(W * H);
  for (let Y = 0; Y < H; Y++) {
    const sy = (Y + 0.5) / s - 0.5, y0 = Math.floor(sy);
    const wy = [-1, 0, 1, 2].map((k) => cubic(sy - (y0 + k)));
    for (let X = 0; X < W; X++) {
      const sx = (X + 0.5) / s - 0.5, x0 = Math.floor(sx);
      let v = 0;
      for (let j = 0; j < 4; j++) {
        if (!wy[j]) continue;
        for (let i = 0; i < 4; i++) v += wy[j] * cubic(sx - (x0 - 1 + i)) * at(x0 - 1 + i, y0 - 1 + j);
      }
      o[Y * W + X] = v;
    }
  }
  return { w: W, h: H, d: o };
}

// A small separable blur (binomial 1-2-1, applied `n` times) to round the stair steps.
function soften({ w, h, d }, n) {
  let a = d;
  for (let k = 0; k < n; k++) {
    const b = new Float32Array(w * h), c = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      b[i] = (a[i] * 2 + (x ? a[i - 1] : 0) + (x < w - 1 ? a[i + 1] : 0)) / 4;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      c[i] = (b[i] * 2 + (y ? b[i - w] : 0) + (y < h - 1 ? b[i + w] : 0)) / 4;
    }
    a = c;
  }
  return { w, h, d: a };
}

// Ink as alpha: a steep curve centred on half ink, so the strokes keep their printed weight.
const tone = (v, mid = 0.5, half = 0.17) => {
  const t = Math.min(1, Math.max(0, (v - (mid - half)) / (2 * half)));
  return t * t * (3 - 2 * t);
};

// Ink relative to the darkest ink nearby. The hairlines of the word tables never reach half
// ink once softened, so an absolute threshold would grey them out or break them into dashes;
// measured against their own darkest point they are redrawn solid, while thick strokes
// (whose neighbourhood is full ink) are unchanged.
function normalise({ w, h, d }, r) {
  const row = new Float32Array(w * h), m = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) v = Math.max(v, d[y * w + k]);
    row[y * w + x] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) v = Math.max(v, row[k * w + x]);
    m[y * w + x] = v;
  }
  return { w, h, d: d.map((v, i) => (m[i] < 0.12 ? 0 : v / m[i])) };
}
const ink = (v) => tone(v, 0.56, 0.14); // a little over half: the softening widens strokes

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, body) {
  const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}
// 8-bit grayscale PNG on white, ink rounded to 32 levels (the page blends it onto its paper
// with mix-blend-mode: multiply). Rows are filtered with "Sub" or "Up", whichever compresses
// the picture better.
function encode({ w, h, d }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const stride = w;
  const px = Buffer.alloc(stride * h);
  for (let i = 0; i < w * h; i++) px[i] = 255 - Math.min(255, Math.round(ink(d[i]) * 31) * 8.25);
  const filtered = (type) => {
    const raw = Buffer.alloc((stride + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (stride + 1)] = type;
      for (let i = 0; i < stride; i++) {
        const v = px[y * stride + i];
        const ref = type === 1 ? (i >= 1 ? px[y * stride + i - 1] : 0) : (y ? px[(y - 1) * stride + i] : 0);
        raw[y * (stride + 1) + 1 + i] = (v - ref) & 0xff;
      }
    }
    return deflateSync(raw, { level: 9 });
  };
  const [a, b] = [filtered(1), filtered(2)];
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', a.length < b.length ? a : b), chunk('IEND', Buffer.alloc(0))]);
}

let n = 0, bytes = 0;
for (const f of readdirSync(src).filter((x) => x.endsWith('.gif')).sort()) {
  const png = join(tmp, basename(f, '.gif') + '.png');
  execFileSync('sips', ['-s', 'format', 'png', join(src, f), '--out', png], { stdio: 'ignore' });
  const img = readDarkness(png);
  // Shown at 1.4× (2× on a retina screen, so 3× covers both); the large pages at 2×.
  const s = Math.max(img.w, img.h) > 250 ? 2 : 3;
  // About 0.7 of a source pixel of blur (binomial passes of variance 1/2 each) fills the
  // specks and irons out the steps; the tone curve then redraws the edges.
  const outBuf = encode(normalise(soften(resample(img, s), Math.round(2 * (0.7 * s) ** 2)), Math.round(1.5 * s)));
  writeFileSync(join(out, basename(f, '.gif') + '.png'), outBuf);
  n++; bytes += outBuf.length;
}
console.log(`${n} images, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
