// Compare sheet: each outline as the app draws it, beside the manual's printed plate, to
// check transcriptions and joining rules by eye.
//
//   node tools/compare.mjs --level 9 --out sheet.html
//   node tools/compare.mjs word-play word-pray --out sheet.html
//   node tools/compare.mjs --words words.json --out sheet.html
//
// words.json: [{ "title": "play", "tokens": ["p", "l", "a"], "plate": "plates/word-play.png" }]
// (plate paths are relative to app/). Open the sheet in a browser, or screenshot it with
// headless Chrome and --allow-file-access-from-files.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXAMPLES } from '../app/data/examples.js';
import { plateFor } from '../app/data/plates.js';
import { compileOutline } from '../app/js/join.js';
import { pathData, bbox } from '../app/js/render.js';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const UNIT = 22; // px per U on the sheet
const PAD = 10;

function svgFor(tokens) {
  const c = compileOutline(tokens);
  const b = bbox(c);
  const w = (b.maxX - b.minX) * UNIT + 2 * PAD;
  const h = (b.maxY - b.minY) * UNIT + 2 * PAD;
  const origin = { x: PAD - b.minX * UNIT, y: PAD + b.maxY * UNIT };
  const dots = c.segments.filter((s) => s.type === 'dot')
    .map((s) => (s.dash
      ? `<line x1="${origin.x + (s.p.x - (s.dash / 2) * Math.cos(((s.angle ?? 0) * Math.PI) / 180)) * UNIT}" x2="${origin.x + (s.p.x + (s.dash / 2) * Math.cos(((s.angle ?? 0) * Math.PI) / 180)) * UNIT}" y1="${origin.y - (s.p.y - (s.dash / 2) * Math.sin(((s.angle ?? 0) * Math.PI) / 180)) * UNIT}" y2="${origin.y - (s.p.y + (s.dash / 2) * Math.sin(((s.angle ?? 0) * Math.PI) / 180)) * UNIT}" stroke="#1d3c8f" stroke-width="2" stroke-linecap="round"/>`
      : `<circle cx="${origin.x + s.p.x * UNIT}" cy="${origin.y - s.p.y * UNIT}" r="2.5" fill="#1d3c8f"/>`)).join('');
  const start = c.start ? `<circle cx="${origin.x + c.start.x * UNIT}" cy="${origin.y - c.start.y * UNIT}" r="3" fill="#2e9d4f"/>` : '';
  return `<svg width="${w.toFixed(0)}" height="${h.toFixed(0)}"><path d="${pathData(c, UNIT, origin)}" fill="none" stroke="#1d3c8f" stroke-width="2" stroke-linecap="round"/>${dots}${start}</svg>`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function cell({ title, tokens, plate }) {
  let art;
  try { art = svgFor(tokens); } catch (err) { art = `<div class="err">${esc(err.message)}</div>`; }
  const img = plate ? `<img src="${esc(`file://${resolve(APP, plate)}`)}">` : '<div class="none">no plate</div>';
  return `<div class="cell"><div class="t">${esc(title)} <code>${esc(tokens.join(' '))}</code></div><div class="pair"><div>${art}</div><div>${img}</div></div></div>`;
}

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const out = opt('--out') ?? 'compare.html';
const level = opt('--level');
const wordsFile = opt('--words');
let items = [];
if (wordsFile) items = JSON.parse(readFileSync(wordsFile, 'utf8'));
const fromExample = (e) => ({ title: e.title, tokens: e.outline, plate: plateFor(e.id)?.src ?? null });
if (level) items.push(...EXAMPLES.filter((e) => e.level === Number(level) && !e.words).map(fromExample));
for (const id of args) {
  const e = EXAMPLES.find((x) => x.id === id);
  if (!e) throw new Error(`no example ${id}`);
  items.push(fromExample(e));
}

writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>
body { font: 12px sans-serif; margin: 8px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: #fff; }
.cell { border: 1px solid #ccc; padding: 4px; }
.t { margin-bottom: 4px; } code { color: #666; }
.pair { display: flex; gap: 8px; align-items: center; }
.pair img { max-height: 70px; max-width: 160px; }
.err { color: #c00; } .none { color: #999; }
</style>${items.map(cell).join('')}`);
console.log(`wrote ${out} (${items.length} outlines)`);
