// The Gregg alphabet as geometry. This one table drives both the SVG renderer and
// (later) the recogniser.
//
// Units and conventions
//   - Lengths are in U, where 1 U = the length of t. Values come from measuring the
//     1929 Anniversary manual's alphabet chart (see reference/stroke-geometry.md).
//   - Angles are degrees, math convention: 0 = rightwards, 90 = up, -90 = down.
//     A primitive's `angle` is the direction of travel from its start to its end,
//     so it also encodes the writing direction.
//   - Arcs bulge to the LEFT of the direction of travel when `bulge` > 0 and to the
//     right when < 0. `bulge` is the sagitta (apex height) as a fraction of the chord.
//     `skew` > 0 moves the apex toward the end of the stroke, < 0 toward the start.
//     `spread` > 0 lets the curve overhang its chord (for hooks and loops).
//
// `verify` marks shapes I have only checked by eye, not measured.

// About how many U fit in one steno line. The long strokes (g, l, b, v, j ≈ 3.1–3.5 U)
// are drawn about one line-space tall/long in the manual's plates. Inference, tunable.
export const U_PER_LINE = 3;

const UP = 30;        // t, d, ted: upward and forward, ≈ 27–33° in the sources
const TH = 35;        // th and its blends: upward and forward, ≈ 31–38°
const DOWN = -125;    // downward strokes: top-right to bottom-left, 55° from horizontal
const NG = -27;       // ng, nk: forward and down

const line = (angle, length) => ({ type: 'line', angle, length });
const arc = (angle, length, bulge, extra = {}) => ({ type: 'arc', angle, length, bulge, ...extra });

export const FAMILIES = [
  { id: 'circles',    name: 'Vowel circles',               members: ['a', 'e', 'i'] },
  { id: 'n-m',        name: 'Forward lines',               members: ['n', 'm', 'men'] },
  { id: 't-d',        name: 'Upward lines',                members: ['t', 'd', 'ted'] },
  { id: 'k-g',        name: 'Forward curves, convex up',   members: ['k', 'g'] },
  { id: 'r-l',        name: 'Forward curves, convex down', members: ['r', 'l'] },
  { id: 'p-b',        name: 'Downward curves, convex left',  members: ['s-left', 'p', 'b'] },
  { id: 'f-v',        name: 'Downward curves, convex right', members: ['s-right', 'f', 'v'] },
  { id: 'sh-ch-j',    name: 'Downward lines',              members: ['sh', 'ch', 'j'] },
  { id: 'th-over',    name: 'Upward curves, convex up-left',    members: ['th-over', 'ten', 'tem'] },
  { id: 'th-under',   name: 'Upward curves, convex down-right', members: ['th-under', 'nd', 'md'] },
  { id: 'ld',         name: 'The ld blend',                members: ['ld'] },
  { id: 'hooks',      name: 'Vowel hooks',                 members: ['o', 'u'] },
  { id: 'ng-nk',      name: 'Down-forward lines',          members: ['ng', 'nk'] },
  { id: 'blends',     name: 'Loop blends',                 members: ['def', 'jnt'] },
  { id: 'marks',      name: 'Marks',                       members: ['h', 'period'] },
];

export const STROKES = [
  // Vowel circles. Ovals tilted with the writing slope. Isolated direction: verify.
  { id: 'a', label: 'a', sounds: ['a (as in at, arm, ate)'], size: 'large',
    primitives: [{ type: 'circle', width: 1.05, height: 0.8, tilt: 25, dir: 'ccw' }],
    briefForms: [], verify: 'direction of an isolated circle' },
  { id: 'e', label: 'e', sounds: ['e (as in pet, peat), short i'], size: 'small',
    primitives: [{ type: 'circle', width: 0.4, height: 0.34, tilt: 25, dir: 'ccw' }],
    briefForms: [], verify: 'direction of an isolated circle' },
  { id: 'i', label: 'ī', sounds: ['long i (as in ice)'], size: 'large',
    primitives: [{ type: 'circle', width: 1.05, height: 0.8, tilt: 25, dir: 'ccw', indent: true }],
    briefForms: ['I'], verify: 'shape and depth of the indent' },

  // Forward lines.
  { id: 'n', label: 'n', sounds: ['n'], size: 'short', primitives: [line(0, 0.9)], briefForms: ['in', 'not'] },
  { id: 'm', label: 'm', sounds: ['m'], size: 'medium', primitives: [line(0, 2.2)], briefForms: ['am', 'more'] },
  { id: 'men', label: 'men', sounds: ['men', 'mem'], size: 'long', primitives: [line(0, 4.5)], briefForms: ['men'] },

  // Upward lines.
  { id: 't', label: 't', sounds: ['t'], size: 'short', primitives: [line(UP, 1.0)], briefForms: ['it', 'at'] },
  { id: 'd', label: 'd', sounds: ['d'], size: 'medium', primitives: [line(UP, 2.6)], briefForms: ['would'] },
  { id: 'ted', label: 'ted', sounds: ['ted', 'ded', 'det'], size: 'long', primitives: [line(UP, 4.5)], briefForms: ['did', 'date'] },

  // Forward curves, convex upward (top of the Gregg ellipse: deeper toward the end).
  { id: 'k', label: 'k', sounds: ['k'], size: 'short', primitives: [arc(0, 1.7, 0.18, { skew: 0.3 })], briefForms: ['can'] },
  { id: 'g', label: 'g', sounds: ['g (hard)'], size: 'long', primitives: [arc(0, 3.5, 0.17, { skew: 0.3 })], briefForms: ['go', 'good'] },

  // Forward curves, convex downward (bottom of the ellipse: deeper toward the start).
  { id: 'r', label: 'r', sounds: ['r'], size: 'short', primitives: [arc(0, 1.6, -0.18, { skew: -0.3 })], briefForms: ['are', 'our'] },
  { id: 'l', label: 'l', sounds: ['l'], size: 'long', primitives: [arc(0, 3.2, -0.15, { skew: -0.3 })], briefForms: ['will', 'well'] },
  // §136 ld: "giving l a swinging upward turn at the finish" (old, fold, held, p. 74): the l
  // runs on nearly level, then rises steeply at the end, about 70° on the plates.
  { id: 'ld', label: 'ld', sounds: ['ld'], size: 'long', primitives: [arc(22, 3.4, -0.1725, { ctrl: [[0.3, -0.21], [0.8, -0.25]] })], briefForms: [] },

  // Downward curves, convex left, "(".
  { id: 's-left', label: 's', sounds: ['s', 'z'], size: 'tiny', primitives: [arc(DOWN, 0.7, -0.25)], briefForms: [] },
  { id: 'p', label: 'p', sounds: ['p'], size: 'short', primitives: [arc(DOWN, 1.7, -0.2)], briefForms: ['put'] },
  { id: 'b', label: 'b', sounds: ['b'], size: 'long', primitives: [arc(DOWN, 3.2, -0.2)], briefForms: ['be', 'by', 'but'] },

  // Downward curves, convex right, ")".
  { id: 's-right', label: 's', sounds: ['s', 'z'], size: 'tiny', primitives: [arc(DOWN, 0.7, 0.25)], briefForms: ['is', 'his'] },
  { id: 'f', label: 'f', sounds: ['f'], size: 'short', primitives: [arc(DOWN, 1.9, 0.2)], briefForms: ['for'] },
  { id: 'v', label: 'v', sounds: ['v'], size: 'long', primitives: [arc(DOWN, 3.2, 0.2)], briefForms: ['have'] },

  // Downward lines.
  { id: 'sh', label: 'sh', sounds: ['sh', 'zh'], size: 'short', primitives: [line(DOWN, 0.85)], briefForms: ['shall', 'ship'] },
  { id: 'ch', label: 'ch', sounds: ['ch'], size: 'medium', primitives: [line(DOWN, 1.7)], briefForms: ['which', 'change'] },
  { id: 'j', label: 'j', sounds: ['j', 'soft g'], size: 'long', primitives: [line(DOWN, 3.1)], briefForms: [] },

  // Upward curves, convex up-left.
  { id: 'th-over', label: 'th', sounds: ['th'], size: 'short', primitives: [arc(TH, 1.05, 0.25)], briefForms: ['the'] },
  { id: 'ten', label: 'ten', sounds: ['ten', 'den', 'tn', 'dn'], size: 'medium', primitives: [arc(TH, 2.3, 0.22)], briefForms: [] },
  { id: 'tem', label: 'tem', sounds: ['tem', 'dem', 'tm', 'dm'], size: 'long', primitives: [arc(TH, 3.8, 0.2)], briefForms: ['time'] },

  // Upward curves, convex down-right.
  { id: 'th-under', label: 'th', sounds: ['th'], size: 'short', primitives: [arc(TH, 1.05, -0.25)], briefForms: ['their', 'there'] },
  { id: 'nd', label: 'nd', sounds: ['nd', 'nt', 'ent', 'end'], size: 'medium', primitives: [arc(TH, 2.4, -0.22)], briefForms: ['and', 'end'] },
  { id: 'md', label: 'md', sounds: ['md', 'mt', 'emt', 'emd'], size: 'long', primitives: [arc(TH, 3.4, -0.2)], briefForms: [] },

  // Vowel hooks, written left to right.
  // The o hook (Manual §65): a small deep hook opening up and to the right. From its start
  // the pen goes steeply down and back, turns in a narrow bottom and rises at about 30°.
  // Control points are the mean least-squares fit of four 1200 dpi plates (lone ŏ, no,
  // law, low; p. 34); depth ≈ 0.9 of the chord. Size: the chord is ≈ 0.28 U, between the
  // scales given by the n (0.25) and the d (0.32) printed beside the hooks.
  { id: 'o', label: 'o', sounds: ['o (as in on, own, ought)'], size: 'small',
    primitives: [arc(-6, 0.28, -0.9, { ctrl: [[-1.4, -1.42], [0.36, -0.97]] })], briefForms: ['of', 'all'] },
  // The oo hook (Manual §91): "the upper part" of the same figure, the o hook turned over and
  // written the other way: it rises at about 30°, turns over a narrow top and comes down
  // steeply back. Mirrored control points, (a, b) -> (1 - a, -b), agree with fits of who
  // and blue (p. 48); the lone ŭ and ŏ in the two tables are the same size. Joinings:
  // §93–94 in join.js.
  { id: 'u', label: 'u', sounds: ['u (as in up, use, ooze)', 'initial w'], size: 'small',
    primitives: [arc(-6, 0.28, 0.9, { ctrl: [[0.64, 0.97], [2.4, 1.42]] })], briefForms: ['you', 'your'] },

  // Down-forward lines.
  { id: 'ng', label: 'ng', sounds: ['ng'], size: 'short', primitives: [line(NG, 1.15)], briefForms: [] },
  { id: 'nk', label: 'nk', sounds: ['nk'], size: 'long', primitives: [line(NG, 2.15)], briefForms: [] },

  // Loop blends: two strokes merged into one large curve.
  { id: 'def', label: 'def', sounds: ['def', 'dev', 'tive'], size: 'large',
    primitives: [arc(-15, 1.9, 0.5, { spread: 0.25, skew: 0.35 })], briefForms: [], verify: 'loop proportions' },
  { id: 'jnt', label: 'jent', sounds: ['jent', 'jend', 'pent', 'pend'], size: 'large',
    primitives: [arc(20, 1.9, -0.5, { spread: 0.25, skew: -0.35 })], briefForms: ['gentlemen'], verify: 'loop proportions and end height' },

  // Marks.
  { id: 'h', label: 'h', sounds: ['h (dot above the line)'], size: 'dot', primitives: [{ type: 'dot' }], briefForms: ['a', 'an'] },
  // Punctuation (Manual p. 2): the period is a short stroke slanting down to the right.
  { id: 'period', label: '.', sounds: ['period (full stop)'], size: 'mark', primitives: [line(-55, 0.7)], briefForms: [] },
];

export const STROKE_BY_ID = Object.fromEntries(STROKES.map((s) => [s.id, s]));
