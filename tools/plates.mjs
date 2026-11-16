// Extracts small grayscale PNG "plates" of printed shorthand outlines from the scanned 1929 manual
// into app/plates/, as listed in tools/plates.json (boxes are in pixels of the page at 80 dpi).
// Usage: node tools/plates.mjs [id ...] [--sheet <file.html>] [--prune]
// Needs poppler's pdftoppm (PDFTOPPM env var overrides the binary); no npm dependencies.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const outDir = join(repo, 'app', 'plates');
const PDFTOPPM = process.env.PDFTOPPM || (existsSync('/opt/homebrew/bin/pdftoppm') ? '/opt/homebrew/bin/pdftoppm' : 'pdftoppm');
const BASE_DPI = 80;
const DPI = 300;
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

function render(page, box, tmp) {
  const k = DPI / BASE_DPI;
  const x = Math.round(box[0] * k);
  const y = Math.round(box[1] * k);
  const w = Math.round((box[2] - box[0]) * k);
  const h = Math.round((box[3] - box[1]) * k);
  const prefix = join(tmp, 'p');
  const r = spawnSync(PDFTOPPM, ['-r', DPI, '-f', page, '-l', page, '-x', x, '-y', y, '-W', w, '-H', h, '-gray', '-singlefile', pdf, prefix].map(String));
  if (r.status !== 0) throw new Error(`pdftoppm failed: ${r.stderr || r.error}`);
  return parsePgm(readFileSync(`${prefix}.pgm`));
}

// Whiten paper noise, then crop to the ink plus padding. Returns null if there is no ink.
function clean(img) {
  const { w, h, data } = img;
  for (let i = 0; i < data.length; i++) if (data[i] >= PAPER) data[i] = 255;
  const rows = new Array(h).fill(0);
  const cols = new Array(w).fill(0);
  for (let y = EDGE; y < h - EDGE; y++) {
    for (let x = EDGE; x < w - EDGE; x++) {
      if (data[y * w + x] < INK) { rows[y]++; cols[x]++; }
    }
  }
  const first = (a) => a.findIndex((n) => n >= MIN_INK);
  const last = (a) => a.length - 1 - [...a].reverse().findIndex((n) => n >= MIN_INK);
  const top = first(rows);
  const left = first(cols);
  if (top < 0 || left < 0) return null;
  const y0 = Math.max(0, top - PAD);
  const y1 = Math.min(h - 1, last(rows) + PAD);
  const x0 = Math.max(0, left - PAD);
  const x1 = Math.min(w - 1, last(cols) + PAD);
  const ow = x1 - x0 + 1;
  const oh = y1 - y0 + 1;
  const out = Buffer.alloc(ow * oh);
  for (let y = 0; y < oh; y++) data.copy(out, y * ow, (y0 + y) * w + x0, (y0 + y) * w + x0 + ow);
  return { w: ow, h: oh, data: out };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
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

// 8-bit grayscale PNG, every row filtered with "Up" (type 2).
function encodePng({ w, h, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 2;
    for (let x = 0; x < w; x++) {
      const up = y ? data[(y - 1) * w + x] : 0;
      raw[y * (w + 1) + 1 + x] = (data[y * w + x] - up) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

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
      const img = clean(render(c.page + config.pageOffset, c.box, tmp));
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
