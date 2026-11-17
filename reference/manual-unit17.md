# Manual Unit 17: the jent-pent and def-tive blends (source transcription)

Source: *Gregg Shorthand Manual, Anniversary Edition* (1929), Chapter VI, Unit 17, printed
pages 77–79 (PDF pages 93–95 of the scan at https://greggshorthand.github.io/Annivman.pdf).
A 1929 US publication, in the US public domain since 1 January 2025.

Conventions are as in `manual-unit2.md`: tokens are stroke ids plus `a` / `e` / `i`
circles, the `o` / `u` hooks and the `h` dot, written in writing order; vowel marks are
omitted. This unit uses the two blend strokes already in `app/data/strokes.js`, `jnt`
(jent, jend, pent, pend) and `def` (def, dev, div, tive), which are still marked `verify`
there (see Engine needs). Plate crop boxes (80 dpi, printed page numbers) are in
`scratchpad/u17/plates-unit17.json`, ids `word-<word>`, `brief-<first word>` and
`phrase-<first word>`. Page 79 (§144 reading and dictation practice) is connected plates
only.

## Rules, quoted from the manual

- **§140.** "By rounding off the angle, as shown in the previous blends, the following
  useful signs for syllables are obtained:" j + t "blended becomes" one curve "and
  expresses jent-d, pent-d"; d + f "blended becomes" one curve "and expresses def-v,
  -tive".
- **§141 Word drill.**
- **§142 Special business forms** (salutations and closings).
- **§143 Brief forms for common words.**
- **§144 Reading and dictation practice** (p. 79): connected text, not transcribed.

**The blends in tokens.** jent / pent = `jnt`: a deep U, written downward on the left and
up on the right (spend, gentle; the business form Gentlemen is the blend alone).
def / tive = `def`: the same curve turned over, an arch written upward on the left and
downward on the right (defer, native; the brief form differ is the blend alone).

## Words (in the manual's order)

| § | Page | Example title | Outline |
|---|---|---|---|
| 141 | 77 | spend | s-left e jnt |
| 141 | 77 | expend | e s-left e jnt |
| 141 | 77 | happened | h a jnt |
| 141 | 77 | opened | o jnt |
| 141 | 77 | cogent | k o jnt |
| 141 | 77 | legend | l e jnt |
| 141 | 77 | ripened | r i jnt |
| 141 | 77 | gentle | jnt l |
| 141 | 77 | genteel | jnt e l |
| 141 | 77 | Gentile | jnt i l |
| 141 | 77 | cheapened | ch e jnt |
| 141 | 77 | pageant | p a jnt |
| 141 | 77 | native | n a def |
| 141 | 77 | divided | def i ted |
| 141 | 77 | defraud | def r o d |
| 141 | 77 | defray | def r a |
| 141 | 77 | endeavor | n def r |
| 141 | 77 | defeat | def e t |
| 141 | 77 | defer | def r |
| 141 | 77 | defy | def i |
| 141 | 77 | divine / define | def i n |
| 141 | 77 | device | def i s-right |
| 141 | 77 | defense | def e n s-left |
| 141 | 78 | motive | m o def |

divine and define have the same outline on the plates (the blend, the broken circle, n);
the plate crop is divine's.

Brief forms (§143, p. 78), kind `brief`:

| Words | Outline |
|---|---|
| differ / different / difference | def |
| definite | def n |
| credit | k r e |
| railway / rule | r l |

Phrases (§142, p. 78), kind `phrase`:

| Words | Outline |
|---|---|
| Gentlemen | jnt |

## Words needing new marks

Proposed token: `ing-dot`, the dot for -ing written at the end of the outline (as in
Unit 12's left-out words).

| § | Page | Example title | Outline |
|---|---|---|---|
| 141 | 77 | impending | m jnt ing-dot |

## Left out, and why

- **carpenter:** the k joins the blend with no visible r or circle between them; whether
  car is written `k r` (the brief form car) or the r is dropped can't be read.
- **devout:** the plate is smudged where the ow sign meets the t.
- **deficit, division:** the endings (s and t; the zh-shun) are compressed into the end of
  the blend and can't be separated.
- **defend:** after the blend the stroke comes back down into a narrow loop; it may be
  `def e nd` or the nd blend run into the def, and the plate doesn't settle it.
- **define:** same outline as divine (merged above).
- **sensitive, positive, restive, creative, captive (§141, p. 78):** the circles and s
  signs before the -tive blend overlap; only motive is clear.
- **§142 business forms other than Gentlemen** (Dear Mr., Messrs., Yours sincerely,
  Sincerely yours, Very sincerely, Yours very sincerely, Yours respectfully, Respectfully
  yours, Very respectfully, Cordially yours, Yours cordially): very compressed phrase
  outlines whose parts (yours `u`, s signs, the r of very) can't be told apart reliably.
- **Brief forms:**
  - agent (`a j`) and spirit (`s-left p`): the same outlines as word-age and
    brief-special.
  - move: the plate shows m with only a tiny downward tick, far shorter than v; it would
    not match a `m v` model.
  - approximate, deliver / delivery, instant / instance, response / responsible,
    quality, tomorrow, influence, mistake / mistaken, altogether, appear, beauty: the
    joinings are too small or ambiguous on the plate to read stroke by stroke.

## Changes to other levels

- None needed. `strokes.js` already lists gentlemen as a brief form of `jnt`; `def` has
  no brief forms listed, and differ / different / difference could be added there.

## Inference (not stated by the manual)

- s signs follow §49: spend, expend take the left s before p (here the blend); device
  takes the right s after the circle following the def blend (ends in f); defense takes
  the left s after n.
- ex in expend is read as `e s-left` (ex is written es, §106 note in Unit 12).
- divided is read `def i ted`: the blend covers d-v, the second i is the broken circle,
  and -ded is the ted blend; the short dash before the blend on the plate is read as a
  printing artifact, not a stroke.
- ripened, Gentile, defy, divine, device take the broken circle `i`; the circles look
  large on the plates.
- credit is read `k r e` (no d visible after the circle).
- endeavor: en is the n stroke (§106).

## Engine needs

1. **Measure the two blends and clear `verify`.** `jnt` is `arc(20, 1.9, -0.5,
   { spread: 0.25, skew: -0.35 })` and `def` is `arc(-15, 1.9, 0.5, { spread: 0.25,
   skew: 0.35 })`; both are far shallower and longer in the chord than the plates.
   Measured at 1200 dpi (t = 220 px, so 1 U = 220 px) on the blends standing alone:
   - **Gentlemen (`jnt`, p. 78):** starts at the upper left, runs down and back to the
     left, round the bottom and up to the right. Start to end (the chord): about 1.05 U
     at about −11° (the end slightly lower than the start). The curve reaches about 1.7 U
     from the chord, and its deepest part lies behind the start: the left arm swings
     about 1 U left of the start point. Overall box 2.1 U wide × 1.7 U tall. A deep,
     leaning U, close to an ellipse with its long axis tilted about 60° up to the right.
   - **differ (`def`, p. 78):** the same figure turned over: starts at the lower left,
     rises up and to the right, over the top and down to an end below and left of the
     top. Chord about 1.15 U at about −11°; the curve reaches about 1.55 U from the
     chord, with its far point well beyond the end (the right arm swings out past it).
     Overall box 2.15 U × 1.75 U.
   - Both are about the size of the blends in the words (spend, gentle, defer, defy).
     Crops of both are `phrase-gentlemen` and `brief-differ`. The chord/bulge model
     with `spread`/`skew` probably can't reach this depth; a `ctrl` arc (as used for the
     o hook) fitted to the plate is likely needed.
2. **Circles before the blends.** happened, pageant: the large circle sits inside the
   top of the jnt's left arm (p then circle, or h then circle, then the blend); spend,
   legend, cheapened, ripened: the small circle (or broken circle) sits at the top of the
   left arm. These are the usual §11–§15 joins of a circle to a curve.
3. **Circles after `def`.** defy, divine, device, defense, defeat: the circle sits in the
   turn at the foot of the def's right arm, inside the curve (§11).
4. **`o` before `jnt` and `def`** (opened, cogent, motive): the o hook runs into the
   blend's downward start; whether §67 should turn it (as before n, m, r, l) needs
   checking on the comparison sheet.
5. **`ing-dot`** for impending (see above).
