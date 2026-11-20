// Redraws the line-art GIFs from greggshorthand.github.io at a higher resolution.
// Run (macOS, needs sips): node tools/upscale.mjs <dir of .gif> <out dir>
//
// The GIFs are grayscale and already anti-aliased: most of their ink pixels are part-grey.
// Each is resampled with Catmull-Rom (3×, or 2× when already large), which keeps those grey
// levels as the original's edges, then given a slight gamma so the thinnest hairlines are not
// washed out. No threshold or local contrast: either breaks faint lines into dashes and turns
// soft edges into blots. The output is a grayscale PNG of the same name.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { decodePng, encodeGray } from './png.mjs';

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('usage: node tools/upscale.mjs <gif dir> <out dir>');
const tmp = mkdtempSync(join(tmpdir(), 'upscale-'));

// The darkness (0 = paper, 1 = ink) of a PNG (what sips writes), transparency counting as paper.
function readDarkness(file) {
  const { w, h, channels: ch, px } = decodePng(readFileSync(file));
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

// Ink as alpha, a little darker in the faint range (gamma 0.85) so hairlines stay visible;
// the overshoot of the cubic is clipped.
const ink = (v) => Math.min(1, Math.max(0, v)) ** 0.85;

// Grayscale on white, ink rounded to 32 levels (the page blends it onto its paper with
// mix-blend-mode: multiply).
const encode = ({ w, h, d }) => encodeGray(w, h, Buffer.from(Array.from(d, (v) => 255 - Math.round(ink(v) * 31) * 8.226)), [1, 2]);

let n = 0, bytes = 0;
for (const f of readdirSync(src).filter((x) => x.endsWith('.gif')).sort()) {
  const png = join(tmp, basename(f, '.gif') + '.png');
  execFileSync('sips', ['-s', 'format', 'png', join(src, f), '--out', png], { stdio: 'ignore' });
  const img = readDarkness(png);
  // Shown at 1.4× (2× on a retina screen, so 3× covers both); the large pages at 2×.
  const s = Math.max(img.w, img.h) > 250 ? 2 : 3;
  const outBuf = encode(resample(img, s));
  writeFileSync(join(out, basename(f, '.gif') + '.png'), outBuf);
  n++; bytes += outBuf.length;
}
console.log(`${n} images, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
