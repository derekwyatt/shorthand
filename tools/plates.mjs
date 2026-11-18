// Extracts small grayscale PNG "plates" of printed shorthand outlines from the scanned 1929 manual
// into app/plates/, as listed in tools/plates.json (boxes are in pixels of the page at 80 dpi;
// a crop's optional `dpi` overrides the 300 dpi it is cut at, e.g. for whole reading pages).
// A crop with `source` is cut from another book in `sources` instead: its `page` is then the
// page of that PDF, and the book's grey paper is whitened (`paper`: lighter becomes white,
// `black`: darker becomes black, in between is stretched to full contrast).
// Usage: node tools/plates.mjs [id ...] [--sheet <file.html>] [--prune]
// Needs poppler's pdftoppm (PDFTOPPM env var overrides the binary); no npm dependencies.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodeGray } from './png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const outDir = join(repo, 'app', 'plates');
const PDFTOPPM = process.env.PDFTOPPM || (existsSync('/opt/homebrew/bin/pdftoppm') ? '/opt/homebrew/bin/pdftoppm' : 'pdftoppm');
const BASE_DPI = 80;
const DPI = 300;
const HI_DPI = 600; // word, letter and section plates (shown at 300 dpi, as 2x images)
const PAPER = 200; // lighter than this becomes white
const INK = 140; // darker than this counts as ink
const MIN_INK = 2; // ink pixels needed for a row or column to count
const EDGE = 3; // ignored border, px
const PAD = 14;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  args.splice(i, 1);
  return true;
};
const sheetIdx = args.indexOf('--sheet');
let sheetFile = null;
if (sheetIdx >= 0) {
  sheetFile = args[sheetIdx + 1];
  if (!sheetFile) { console.error('--sheet needs a file'); process.exit(2); }
  args.splice(sheetIdx, 2);
}
const prune = flag('--prune');
const only = args;

const config = JSON.parse(readFileSync(join(here, 'plates.json'), 'utf8'));
const pdf = join(repo, config.pdf);

// Parse a binary PGM (P5, maxval 255).
function parsePgm(buf) {
  let pos = 0;
  const token = () => {
    while (/\s/.test(String.fromCharCode(buf[pos]))) pos++;
    if (buf[pos] === 0x23) { while (buf[pos] !== 0x0a) pos++; return token(); }
    let s = '';
    while (!/\s/.test(String.fromCharCode(buf[pos]))) s += String.fromCharCode(buf[pos++]);
    return s;
  };
  if (token() !== 'P5') throw new Error('not a P5 PGM');
  const w = Number(token());
  const h = Number(token());
  token();
  pos++;
  return { w, h, data: buf.subarray(pos, pos + w * h) };
}

function render(page, box, tmp, dpi = DPI, file = pdf) {
  const k = dpi / BASE_DPI;
  const x = Math.round(box[0] * k);
  const y = Math.round(box[1] * k);
  const w = Math.round((box[2] - box[0]) * k);
  const h = Math.round((box[3] - box[1]) * k);
  const prefix = join(tmp, 'p');
  const r = spawnSync(PDFTOPPM, ['-r', dpi, '-f', page, '-l', page, '-x', x, '-y', y, '-W', w, '-H', h, '-gray', '-singlefile', file, prefix].map(String));
  if (r.status !== 0) throw new Error(`pdftoppm failed: ${r.stderr || r.error}`);
  return parsePgm(readFileSync(`${prefix}.pgm`));
}

// The Manual's scan is only about 190 ppi: cut at 300 dpi or more its strokes are blocky,
// with stair-stepped edges and specks of paper inside them. `smooth` redraws a cut made at
// `s` times the wanted resolution: a blur about a scan pixel wide fills the specks and
// rounds the steps off, a steep tone curve around half ink redraws crisp edges (hairlines,
// which never reach half ink, keep a strengthened copy of themselves), and averaging s×s
// blocks back down anti-aliases them.
const SCAN_PPI = 190;
function boxBlur(d, w, h, r) {
  const out = new Float32Array(w * h), tmp = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += d[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / n;
      acc += d[y * w + Math.min(w - 1, x + r + 1)] - d[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / n;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}
function smooth({ w, h, data }, s, dpi) {
  let d = Float32Array.from(data, (v) => 1 - v / 255);
  // Three box passes of radius r: a near-Gaussian of about one scan pixel.
  const r = Math.max(1, Math.round((1.0 * dpi / SCAN_PPI) / 1.15));
  for (let k = 0; k < 3; k++) d = boxBlur(d, w, h, r);
  const tone = (v) => {
    const t = Math.min(1, Math.max(0, (v - 0.4) / 0.3));
    return Math.max(t * t * (3 - 2 * t), Math.min(1, Math.max(0, v - 0.2) * 1.6));
  };
  const W = Math.floor(w / s), H = Math.floor(h / s);
  const out = Buffer.alloc(W * H);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    let n = 0;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) n += tone(d[(Y * s + j) * w + X * s + i]);
    out[Y * W + X] = Math.round(255 * (1 - n / (s * s)));
  }
  return { w: W, h: H, data: out };
}

// Whiten paper noise, then crop to the ink plus padding. Returns null if there is no ink.
function clean(img, { paper = PAPER, black = null, ink = INK, pad = PAD } = {}) {
  const { w, h, data } = img;
  for (let i = 0; i < data.length; i++) {
    if (data[i] >= paper) data[i] = 255;
    else if (black !== null) data[i] = Math.round((Math.max(0, data[i] - black) * 255) / (paper - black));
  }
  const rows = new Array(h).fill(0);
  const cols = new Array(w).fill(0);
  for (let y = EDGE; y < h - EDGE; y++) {
    for (let x = EDGE; x < w - EDGE; x++) {
      if (data[y * w + x] < ink) { rows[y]++; cols[x]++; }
    }
  }
  const first = (a) => a.findIndex((n) => n >= MIN_INK);
  const last = (a) => a.length - 1 - [...a].reverse().findIndex((n) => n >= MIN_INK);
  const top = first(rows);
  const left = first(cols);
  if (top < 0 || left < 0) return null;
  const y0 = Math.max(0, top - pad);
  const y1 = Math.min(h - 1, last(rows) + pad);
  const x0 = Math.max(0, left - pad);
  const x1 = Math.min(w - 1, last(cols) + pad);
  const ow = x1 - x0 + 1;
  const oh = y1 - y0 + 1;
  const out = Buffer.alloc(ow * oh);
  for (let y = 0; y < oh; y++) data.copy(out, y * ow, (y0 + y) * w + x0, (y0 + y) * w + x0 + ow);
  return { w: ow, h: oh, data: out };
}

// 16 grey levels: plenty for ink edges, and half the size.
const encodePng = ({ w, h, data }) => encodeGray(w, h, Buffer.from(data.map((v) => Math.round(v / 17) * 17)));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function writeSheet(file, crops) {
  const figs = crops.map((c) => {
    const src = pathToFileURL(join(outDir, `${c.id}.png`)).href;
    return `<figure><img src="${src}"><figcaption>${esc(c.id)} (p. ${c.page})</figcaption></figure>`;
  });
  writeFileSync(file, `<!doctype html>
<meta charset="utf-8">
<title>Plates</title>
<style>
  body { background: #fff; margin: 16px; font: 12px system-ui, sans-serif; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; }
  figure { margin: 0; border: 1px solid #ccc; padding: 6px; }
  figcaption { margin-top: 4px; color: #333; }
</style>
<div class="grid">
${figs.join('\n')}
</div>
`);
  console.log(`wrote ${resolve(file)}`);
}

mkdirSync(outDir, { recursive: true });
const crops = only.length ? config.crops.filter((c) => only.includes(c.id)) : config.crops;
for (const id of only) if (!config.crops.some((c) => c.id === id)) console.log(`unknown id ${id}`);

const tmp = mkdtempSync(join(tmpdir(), 'shorthand-plates-'));
let failed = only.some((id) => !config.crops.some((c) => c.id === id));
const done = [];
try {
  for (const c of crops) {
    try {
      const src = c.source ? config.sources[c.source] : null;
      const img = src
        ? clean(render(c.page, c.box, tmp, c.dpi, join(repo, src.pdf)), { paper: src.paper, black: src.black, ink: src.ink })
        : clean(smooth(render(c.page + config.pageOffset, c.box, tmp, (c.dpi ?? HI_DPI) * 2), 2, (c.dpi ?? HI_DPI) * 2), { pad: c.dpi ? PAD : PAD * 2 });
      if (!img) throw new Error('no ink found');
      const png = encodePng(img);
      writeFileSync(join(outDir, `${c.id}.png`), png);
      console.log(`${c.id} ${img.w}x${img.h} ${(png.length / 1024).toFixed(1)} KB`);
      done.push(c);
    } catch (err) {
      console.log(`${c.id} FAIL ${err.message}`);
      failed = true;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (prune) {
  const keep = new Set(config.crops.map((c) => `${c.id}.png`));
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.png') && !keep.has(f)) { unlinkSync(join(outDir, f)); console.log(`pruned ${f}`); }
  }
}
if (sheetFile) writeSheet(sheetFile, done);
process.exit(failed ? 1 : 0);
