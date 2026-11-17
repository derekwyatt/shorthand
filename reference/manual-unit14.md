# Manual Unit 14: other vowel combinations, omission of minor vowels (source transcription)

Source: *Gregg Shorthand Manual, Anniversary Edition* (1929), Chapter V, Unit 14, printed
pages 65–67 (PDF pages 81–83 of the scan at https://greggshorthand.github.io/Annivman.pdf).
A 1929 US publication, in the US public domain since 1 January 2025.

Conventions are as in `manual-unit2.md`: tokens are stroke ids plus `a` / `e` circles, the
`o` / `u` hooks, the §71 `a-rev`, and the `h` dot, written in writing order; vowel marks
(the small ticks under poet, poem, snowy, showy, radio, folio) are omitted. Plate crop
boxes (80 dpi, printed page numbers) are in `scratchpad/u14/plates-unit14.json`, ids
`word-<word>` and `brief-<first word>`. Page 67 (§123 reading and dictation practice) is
connected plates only.

## Rules, quoted from the manual

- **§118.** "In a few words, vowels follow one another consecutively without forming
  diphthongs, as in poem, radio, showy. In such words the signs for the sounds are written
  in the order in which the sounds occur." Footnote to snowy: "When necessary, the long
  sound of o in oe is marked to distinguish it from the diphthong oi."
- **§119.** "Any vowel following the diphthong i is expressed by a small circle within the
  large circle."
- **§120.** "Short i followed by a, as in mania, is expressed by a large circle with a dot
  placed within it; e followed by the large circle vowel, as in create, is expressed by a
  large circle with a dash within it. These distinctions are seldom necessary, however."
- **§121 Omission of Minor Vowels.** "When two vowels not forming a pure diphthong come
  together, the minor vowel may be omitted. For convenience in writing many common words,
  the circle may be omitted in the diphthong u, as in new, due, music." Footnote to idea
  and ideal: "The long i in idea and ideal is expressed by the large circle."
- **§122 Brief forms for common words.** Footnote to dollar: "After numerals, dollars is
  expressed by d."

## Words (in the manual's order)

| § | Page | Example title | Outline |
|---|---|---|---|
| 118 | 65 | poet | p o e t |
| 118 | 65 | snowy | s-right n o e |
| 118 | 65 | radio | r a d e o |
| 118 | 65 | poem | p o e m |
| 118 | 65 | showy | sh o e |
| 118 | 65 | folio | f o l e o |
| 121 | 66 | theory | th-over e r e |
| 121 | 66 | idea | a d e |
| 121 | 66 | genius | j e n u s-right |
| 121 | 66 | music | m u s-right e k |
| 121 | 66 | ideal | a d e l |
| 121 | 66 | arduous | a-rev d u s-right |
| 121 | 66 | amuse | a m u s-right |
| 121 | 66 | genuine | j e n u n |
| 121 | 66 | tedious | t e d u s-right |
| 121 | 66 | reduce | r e d u s-right |
| 121 | 66 | renew | r e n u |
| 121 | 66 | new | n u |
| 121 | 66 | avenue | a v n u |
| 121 | 66 | renewal | r e n u l |

Brief forms (§122, p. 66), kind `brief`:

| Words | Outline |
|---|---|
| dollar | d o l |
| respect / respectful | r s-left p |
| please | p l |
| object | o b |
| progress | p r g |
| trust | t r s-left |
| opportunity | o p |
| various | v a r s-left |
| enclose | n k |
| address | a d r |
| wonder | u nd |

31 examples, one crop each.

## Words needing new marks

| Word(s) | § | Mark needed | Outline without the mark |
|---|---|---|---|
| via, fiat, science, diet, riot, prior | 119 | a small circle inside the large (diphthong i) circle | needs the diphthong i token too (Unit 13) |
| aria, alias, cereal, serial, mania, piano | 120 | a dot inside the large circle (ia) | aria `a r a`, alias `a l a s-left`, cereal / serial `s-left e r a l`, mania `m a n a`, piano `p a n o` (readings, not checked stroke by stroke) |
| area, create, creation | 120 | a short dash inside the large circle (ea) | area `a r a`, create `k r a t`, creation `k r a sh` (readings) |

The §120 plates all carry the dot or dash, so a copy of the plate would include a mark the
engine would score as an extra stroke; the manual says the distinction is "seldom
necessary", so the words could also be given without the mark once the scorer ignores
it.

## Left out, and why

- **due (§121):** `d u` is the outline of `word-do` (Unit 10); the plates are the same.
- **arrange / arrangement (§122):** `a r a` is the outline of `word-array`.
- **consider / consideration (§122):** the plate reads `k s-right`, the outline of
  `brief-cause`; the extra curl at the end of the s cannot be read as a separate sign.
- **advantage (§122):** `a v` is the outline of `phrase-i-have`.
- **mail (§122):** the plate shows m and a circle (`m a`, the outline of `word-may` /
  `brief-my`); no l can be seen.
- **strange, throughout (§122):** the opening signs (s–t–r before j; th–r before the hook)
  are too small on the plate to transcribe.
- **across (§122):** the k–r–s ending is a flat wave and a small curl; whether r is written
  cannot be told.
- **dollars after numerals (footnote):** a number plus d; not a word example.
- **poet, snowy, radio, poem, showy, folio, genius, music, arduous, amuse, tedious, reduce (and brief forms respect, trust):** drawn by the engine, but not as the plate shows: the vowel sequences of §118 (the hook and circle are placed differently and carry marks) and the us endings after a dropped ū circle (§121), printed larger than in Unit 10; left out until those joinings are measured.
- **§119, §120:** see "Words needing new marks".

## Changes to other levels

None.

## Engine needs

- **Hook then circle (§118 poet, poem, snowy, showy):** the e circle written inside the
  end of the `o` hook, then (poet, poem) the next stroke. Check the `o e` joining reads
  like the plate (the circle sits in the turn of the hook).
- **Circle then hook at the end (radio, folio):** `e o` final, the hook turned off the
  circle.
- **`u` hook between strokes and before s:** genius, music, amuse, arduous, tedious, reduce
  use `u s-right` (the §93 rounded join); genuine uses `u n`; renewal `u l`. The hook is
  turned under after n and m (§94); after d (arduous, tedious, reduce) it sits on top of the
  upstroke.
- **`a-rev` before d (arduous):** as in art (`a-rev t`, Unit 8).
- **please:** the plate has a small dot under the outline, about mid-length. It is not
  explained by the text and is taken as a printing speck; it is left out of the outline.

## Inference (not stated by the manual)

- §118 words: the order of hook and circle follows the sound order ("written in the order
  in which the sounds occur"); the ticks under the outlines are the long-vowel marks the
  footnote refers to.
- idea, ideal: the footnote's large circle is the plain `a` circle; the final small
  circle is e (the a of idea, a minor vowel, is omitted).
- arduous: no r stroke is visible; the initial circle is read as the §71 reversed circle
  (ar), as in art.
- avenue: no e circle is visible between v and n (minor vowel omitted).
- theory: the first stroke is read as `th-over`; the plate is small enough that the under
  form cannot be ruled out.
- Least sure: dollar (`d o l`, the hook and l are tiny), respect (`r s-left p`, read as an
  s–p loop), progress (`p r g`, the r is merged into a long curve), wonder (`u nd`),
  opportunity and object (`o p` / `o b`, the hook written above the downstroke), various
  (`v a r s-left`, the circle could be e).
