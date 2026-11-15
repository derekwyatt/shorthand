# Manual Unit 2: joined outlines (source transcription for level 7)

Source: *Gregg Shorthand Manual, Anniversary Edition* (1929), Chapter I, Unit 2, printed
pages 7–9 (PDF pages 23–25 of the scan at https://greggshorthand.github.io/Annivman.pdf).
A 1929 US publication, in the US public domain since 1 January 2025.

This file is the source of truth for the level 7 examples in `app/data/examples.js` and
the joining rules in `app/js/join.js`. Everything below is read off the scan; nothing is
added that the manual does not print.

## Conventions used in the outlines

- Tokens are the stroke ids of `app/data/strokes.js`, plus `a` (large circle) and `e`
  (small circle). Vowel groups follow §7: the A group (at, calm, came) takes the large
  circle; the E group (kit, get, need) the small circle.
- Vowel marks (§8, "seldom used") are omitted, as in levels 3–4. Words whose outlines
  differ only by marks share one example (rid / red / read, tack / take, glean / glen).
- §16: "Some vowels are so obscure or neutral that they are omitted when they do not
  contribute to speed or legibility. For example, the e in the words taken and maker is
  absolutely useless, and is omitted." Hence `taken` = t a k n, `maker` = m a k r.

## Rules, quoted from the manual

- **§14 Circles Between Strokes.** "Where an angle, or a point, is formed at the junction
  of consonants, the circle goes outside the angle."
- **§15.** "Where straight strokes and curves join without an angle, or where two
  similar-motion curves join without an angle, the circle is placed inside the curve."
- **§17.** "Between straight strokes in the same direction the circle is written with
  right motion."
- **§18.** "Between opposite curves the circle is turned back on the first curve."
- **§19 Kr and Gl Combinations.** "K and r, and g and l, are equal curves and are made a
  little flatter than usual when joined."
- **§20 Gr and Kl Combinations.** "Where curves of unequal length join without an angle,
  as in the following, note how a distinction in length is positively shown. The movement
  in writing gr is similar to that in writing y in longhand; kl to that in writing h."
- **§21 Rk and Lk Combinations.** "Since r and k are of equal length, the curves are
  somewhat flatter, as with kr and gl. Lk is very infrequent."
- **§22 The Signs for Th.** "The sign for t is curved to express th."

### Reading §14 and §18 off the plates (checked at 450 dpi)

- §14, "outside the angle": the circle is on the outer side of the turn at the joint.
  When the path turns left (counter-clockwise) the circle hangs on the right of travel,
  so it is written clockwise; a right turn gives a counter-clockwise circle above.
  Matches every §14 plate: below the joint in make, gate, get, calm, kick, cake, met,
  maid; above it in rain, rim, rear, team, tale, dream.
- §18, "turned back on the first curve": the circle lies inside the *second* curve,
  against the first. After r or l (bowed downward) it hangs below the joint (wreck, rag,
  lake); after k (bowed upward) it sits above (kill).

## Words (in the manual's order)

| § | Page | Example title | Outline |
|---|---|---|---|
| 14 | 7 | kick | k e k |
| 14 | 7 | cake | k a k |
| 14 | 7 | get | g e t |
| 14 | 7 | gate | g a t |
| 14 | 7 | calm | k a m |
| 14 | 7 | make | m a k |
| 14 | 7 | met | m e t |
| 14 | 7 | maid | m a d |
| 14 | 7 | team | t e m |
| 14 | 7 | rear | r e r |
| 14 | 7 | rain | r a n |
| 14 | 7 | rim | r e m |
| 14 | 7 | tale | t a l |
| 14 | 7 | rainy | r a n e |
| 14 | 7 | dream | d r e m |
| 15 | 7 | writ | r e t |
| 15 | 7 | rid / red / read | r e d |
| 15 | 7 | rate | r a t |
| 15 | 7 | raid | r a d |
| 15 | 7 | ticket | t e k e t |
| 15 | 7 | tack / take | t a k |
| 15 | 7 | deck | d e k |
| 15 | 7 | dig | d e g |
| 15 | 7 | tag | t a g |
| 15 | 7 | taken | t a k n |
| 15 | 7 | rattle | r a t l |
| 15 | 7 | riddle | r e d l |
| 17 | 8 | deed | d e d |
| 17 | 8 | dad | d a d |
| 17 | 8 | mean | m e n |
| 17 | 8 | main | m a n |
| 18 | 8 | wreck | r e k |
| 18 | 8 | rag | r a g |
| 18 | 8 | lake | l a k |
| 18 | 8 | kill | k e l |
| 19 | 8 | cream | k r e m |
| 19 | 8 | crane | k r a n |
| 19 | 8 | creed | k r e d |
| 19 | 8 | crate | k r a t |
| 19 | 8 | eagle | e g l |
| 19 | 8 | glee | g l e |
| 19 | 8 | glean / glen | g l e n |
| 19 | 8 | gleam | g l e m |
| 19 | 8 | glare | g l a r |
| 19 | 8 | acre | a k r |
| 19 | 8 | maker | m a k r |
| 20 | 9 | gray | g r a |
| 20 | 9 | grain | g r a n |
| 20 | 9 | greed | g r e d |
| 20 | 9 | green | g r e n |
| 20 | 9 | greet | g r e t |
| 20 | 9 | grim | g r e m |
| 20 | 9 | eager | e g r |
| 20 | 9 | clay | k l a |
| 20 | 9 | clan | k l a n |
| 21 | 9 | ark | a r k |
| 21 | 9 | dark | d a r k |
| 21 | 9 | mark | m a r k |
| 21 | 9 | milk | m e l k |
| 22 | 9 | tick | t e k |
| 22 | 9 | thick | th-over e k |

## Left out, and why

- **hath, wrath, myth (§22):** the final th is too small on the plate to tell the over
  form from the under form, and the manual gives the rule for choosing between them only
  in Unit 9 (§78). Added when Unit 9 is transcribed.
- **hat, rat (§22):** shown only for comparison; hat is already in level 3 (as "hate",
  same outline) and rat has the same outline as rate.
- **Words in §23–24 (brief forms) and §25 (reading practice):** brief forms are a
  separate topic; the reading plates have no English key to check outlines against.

## Inference (not stated by the manual)

- How much flatter §19/§21 curves are: the manual says only "a little flatter" and
  "somewhat flatter". `join.js` uses one tunable factor for kr, gl, rk and lk.
- Where "without an angle" ends and "an angle" begins: `join.js` uses an angle threshold
  between the joining tangents, chosen so that every word above falls under the section
  the manual lists it in. A test checks this for every word.
