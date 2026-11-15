# Stroke geometry research

Purpose: reduce the "accuracy of stroke geometry" risk in PLAN.md §10 by checking the
§3 stroke table against independent sources and measuring the proportions.

## Sources

| # | Source | Status | Use |
|---|---|---|---|
| M | **Gregg Shorthand Manual, Anniversary Edition (1929)**. Scan at https://greggshorthand.github.io/Annivman.pdf (192 pp, image only, no text layer). Alphabet chart = PDF p. 16; Chapter I = PDF p. 17–18. | Primary. A 1929 US publication, so in the US public domain since 1 Jan 2025. | **Authoritative proportions.** The manual itself says (p. 2): *"The size of the characters given in this manual will be a safe standard to adopt."* |
| P | Gregg, **The Basic Principles of Gregg Shorthand** (1922), https://greggshorthand.github.io/principles.pdf (has a text layer). | Primary, public domain. | What Gregg says about slant and the ellipse. |
| C | `grggsmry.gif` (Wikimedia chart of the Simplified strokes, in this folder). | Secondary, a small redrawing. | Cross-check. |
| W | **Wyess/shorthand_editor** `gregg.js`, https://github.com/Wyess/shorthand_editor (MIT). An open-source Gregg renderer that uses hand-tuned cubic Béziers. | Secondary, an implementer's choices. | Cross-check, and a model for the renderer data. |

The sources don't cover the 1949 Simplified manual: archive.org only has it as
lending-library scans (`greggshorthandma0000john`, `greggshorthandma0000unse_q4r9`), which
you have to borrow. No published stroke-trajectory dataset exists for Gregg. The
Gregg-1916 recognition corpus (github.com/anonimously/Gregg1916-Recognition) is one image
per word, so it's no use for checking pen direction or size.

## Verbatim statements (M, P)

- M p. 1: *"The consonants are arranged in pairs, according to their affinity of sound,
  and are distinguished by a difference in length."*
- M p. 1: *"The characters for the consonants in this lesson are derived from an
  elliptical figure"* (it draws an ellipse tilted about 30°, long axis left–right).
- M p. 1: *"All these consonants are written forward from left to right; th and t and d
  are struck upwards from the line of writing."*
- M p. 16 (the alphabet chart) puts K G R L N M T D TH under **"Written forward"** and
  P B F V CH J S SH under **"Written downward"**.
- P p. 5: Gregg *"is written with a uniform slope, as in longhand … we do not mean any
  particular slope; we simply mean that whatever slope is adopted the writing is uniform
  in slope."* → **Gregg prescribes no absolute slant.** Measure the slant per writer
  rather than hard-coding it.

## Measurements

Method: I took connected components of the ink in each image. The length is the chord
from end to end along the principal axis. The angle is measured from horizontal (0° =
rightwards, positive = rising to the right). Downward strokes are given as the angle of
their line, so a `/`-shaped stroke written downward reads about 55°. Lengths are
normalised to **t = 1**. Accuracy is about ±10% (raster scans, pixel-level chords).

### Lengths (t = 1)

| Stroke | M 1929 manual | C chart | W renderer |
|---|---|---|---|
| s (either form) | 0.68 | 0.52 | 0.75 |
| sh | 0.85 | 0.60 | 1.00 |
| n | 0.91 | 0.72 | 1.97 |
| **t** | **1.00** | **1.00** | **1.00** |
| th (either form) | 1.05 | 0.82–0.86 | 1.00 |
| ng | 1.16 | 0.82 | 1.25 |
| r | 1.62 | 0.98 | 1.75 |
| k | 1.68 | 1.03 | 1.75 |
| p | 1.71 | 1.25 | 1.75 |
| ch | 1.73 | 1.34 | 1.75 |
| f | 1.90 | 1.22 | 1.75 |
| nk | 2.16 | 2.10 | 2.50 |
| m | 2.24 | 1.69 | 3.22 |
| d | 2.58 | 1.92 | 2.50 |
| j | 3.08 | 1.94 | 3.50 |
| v | 3.18 | 1.92 | 3.50 |
| b | 3.19 | 2.09 | 3.50 |
| l | 3.22 | 2.11 | 3.73 |
| g | 3.48 | 2.18 | 3.72 |
| ten/den | | 1.88 | 2.28 |
| nd/nt | | 1.86 | 2.50 |
| md/mt | | 2.53 | 3.75 |
| tem/dem | | 2.92 | 4.25 |
| men/mem | | 3.49 | |
| ted/ded | | 3.37 | |

### Ratio of long to short within a pair

| Pair | M | C | W |
|---|---|---|---|
| k→g | 2.08 | 2.12 | 2.13 |
| r→l | 1.98 | 2.15 | 2.13 |
| p→b | 1.86 | 1.67 | 2.00 |
| f→v | 1.68 | 1.58 | 2.00 |
| ch→j | 1.78 | 1.45 | 2.00 |
| n→m | 2.46 | 2.33 | 1.64 |
| t→d | 2.58 | 1.92 | 2.50 |
| ng→nk | 1.86 | 2.56 | 2.00 |
| sh→ch | 2.03 | 2.22 | 1.75 |
| s→p | 2.5 | 2.4 | 2.3 |

### Angles (degrees from horizontal)

| Group | M | C | W |
|---|---|---|---|
| t, d (upward) | 26–27 | 32–35 | 30 |
| th (both forms), ten/tem, nd/md (upward) | 31–38 | 32–40 | 30–36 |
| p, b, f, v, ch, j, sh, s (downward) | 44–59, mean ≈ 52 | 54–58 | 45–60 |
| n, m, k, g, r, l (forward) | 0–9 (curves: the chord) | 0–11 | 0–5 |
| ng, nk (down to the right) | −26 to −28 | −13 to −17 | −30 |

### Circles and hooks (t = 1)

| | M | C | W |
|---|---|---|---|
| a circle | 1.05 wide × 0.80 high, long axis tilted ≈ 15–35° | 0.95 wide | ≈ 0.75 |
| e circle | 0.40 | 0.36 | ≈ 0.2 |
| u/oo hook | ≈ 0.6 wide | ≈ 0.6 | 0.4 |

## Conclusions for the app

1. **The structure is confirmed. The plan's single U ladder is wrong.** Each consonant
   pair has a short and a long member, and the long one is **about 2× the short one
   (1.7–2.6×)**. But the short members of different families are *not* the same size.
   The sources give these absolute size classes (t = 1):
   - **tiny:** s ≈ 0.7
   - **small:** n, t, sh, th, ng ≈ 0.85–1.15
   - **medium:** k, r, p, f, ch ≈ 1.6–1.9; nk ≈ 2.2; m ≈ 2.2; d ≈ 2.6
   - **long:** g, l, b, v, j ≈ 3.1–3.5; ted, men, tem ≈ 3–3.5

   A short **curve** (k, r, p, f) is about 1.7× a short **line** (t, n, sh).
   Store a nominal length per stroke, not a size word per family.
2. **Decide short or long relative to the family.** Use a threshold at the geometric mean
   of the two calibrated lengths in each pair. For k (1.68) and g (3.48) that is ≈ 2.4.
   This leaves a margin of about 40% on each side, and it absorbs differences in writer
   scale. Calibrate one short curve (k) and one short line (t) at least, not t alone.
3. **The slant is per writer, so calibrate it.** Gregg says so explicitly (P). Strokes that
   share a slant must stay distinguishable *relative to each other*, not to a fixed angle:
   - upward t/d ≈ 30°, downward strokes ≈ 55°. **Direction (up vs down) already separates
     them**, so a wide angle band is fine.
   - forward n/m ≈ 0°, upward t/d ≈ 30°, down-right ng/nk ≈ −27°. The sign of the slope
     separates them. The closest gap is 0° to 27°, so use about ±12° bands around each
     calibrated centre.
   - Straight vs curved (t vs th, sh vs s, ch vs p) depends on **curvature**, not angle.
     This is the tightest distinction, so check it with the fixtures.
4. **Circles are larger than the plan assumed, and elliptical.** The a circle is about as
   wide as t (≈ 1.0 U, not 0.6 U). The e circle is ≈ 0.4 U (not 0.25 U). The a:e ratio is
   ≈ 2.6. The circles are ovals tilted with the writing slope.
5. **The Wikimedia chart (C) underestimates.** Its long/short ratios and short curves come
   out about 20–40% smaller than the manual's. Use M as the source of truth and C only to
   check shape and direction.
6. **Downward strokes** slant about 55° from horizontal (about 35° from vertical). That is
   more than "slightly", so the §3 wording was corrected.
7. **Wyess `gregg.js` (MIT)** has ready-made Bézier control points for every letter and
   blend, written as `m 0 0 c …` paths with an end offset. It's a good start for `render.js`
   data. Rescale it to the M proportions, especially n/m, which W draws much longer.

## Still open

- **A check against the 1949 Simplified manual.** All the sources say the alphabet is the
  same across editions (Wikipedia), and C (a Simplified chart) agrees in shape with M. To
  close this, borrow one of the archive.org scans above and look at the Lesson 1–3
  alphabet plates.
- **The o and u hooks, ī, and the def/pent blends** have only been checked for shape (M
  p. 16), not measured carefully.
- **Measured numbers aren't handwriting.** These figures are printed ideals. Real tolerance
  bands still have to come from recorded Pencil fixtures (milestone 3).
- Edition aside: the 1929 Anniversary manual is **public domain in the US** (since 2025),
  but the 1949 Simplified is not. That favours Anniversary for the content and licensing
  question (§10 "Edition choice").
