# Manual Unit 33: initials; intersection (source transcription)

Source: *Gregg Shorthand Manual, Anniversary Edition* (1929), Chapter XI, Unit 33, printed
pages 141–145 (PDF pages 157–161 of the scan at https://greggshorthand.github.io/Annivman.pdf).
A 1929 US publication, in the US public domain since 1 January 2025.

Conventions are as in `manual-unit31.md`: tokens are stroke ids plus `a` / `e` / `i`
circles, the `o` / `u` hooks, the `h` dot and the `w-dash`, written in writing order; vowel
marks are omitted. `^` ends a disjoined prefix and `_` starts a disjoined suffix. `cap` (written
last) is the §233 capital mark. Plate crop boxes (80 dpi, printed page numbers) are in
`scratchpad/u33/plates-unit33.json`, ids `word-initial-<letter>`; they cover the Words table
only. Page 144 (§236) is reading and dictation
practice and page 145 (§237) writing practice.

## Rules, quoted from the manual

- **§233 Initials.** "As there is no context to initials, accuracy in writing them is of
  prime importance:" The plate gives each capital letter A–Z as its shorthand sign with a
  small double dash under it.
- **§234 Initials in longhand.** "Many writers prefer to write initials in longhand, and if
  this is done, a great saving in time may be effected by writing them in small letters and
  joining the letters, thus:" A. B. Smith, C. D. Brown, E. F. Jones (the initials in joined
  longhand, the surname in shorthand).
- **§235 Intersection.** "The expedient known as intersection, or the writing of one
  character through another, is sometimes useful for special phrases. In applying this
  expedient the writer must rely very largely upon his own judgment." "Very often the
  writing of one character through another will meet the exigency. The following are useful
  examples:" A. D., A. M., P. M., C. O. D., price list, list price, vice versa, bank draft,
  order blank, Associated Press, Democratic party, Republican party, political party,
  Baltimore & Ohio (B. & O.), New York Central, Michigan Central, Illinois Central, endowment
  policy (p. 142); Grand Trunk, selling price, market price, Union Pacific, School Board,
  member banks, curb market, stock market, Great Britain, enclosed blank, General Manager,
  Assistant General Manager, bills payable, bills receivable, profit and loss, Board of
  Trade, indemnity policy, Canadian Pacific, Northern Pacific, application blank, bond and
  mortgage, chairman of the board, Federal Reserve Board, Board of Managers, Board of
  Management, commercial paper, account current, chattel mortgage, certificate of deposit,
  commercial draft, Board of Education, Chamber of Commerce (p. 143).
- **§236 Reading and dictation practice**: connected text, not transcribed.
- **§237 Writing practice**: longhand sentences only.

## Words (in the manual's order)

The §233 initials whose letter reads as a single existing token, each followed by `cap`, the
capital mark (two short parallel dashes rising to the right, under the outline's lowest
point). Titles are "initial B" etc., so the ids are `word-initial-b` and so on.

| § | page | word | outline |
|---|---|---|---|
| 233 | 141 | initial B | b cap |
| 233 | 141 | initial D | d cap |
| 233 | 141 | initial F | f cap |
| 233 | 141 | initial G | g cap |
| 233 | 141 | initial H | h cap |
| 233 | 141 | initial J | j cap |
| 233 | 141 | initial K | k cap |
| 233 | 141 | initial L | l cap |
| 233 | 141 | initial M | m cap |
| 233 | 141 | initial N | n cap |
| 233 | 141 | initial O | o cap |
| 233 | 141 | initial P | p cap |
| 233 | 141 | initial R | r cap |
| 233 | 141 | initial S | s-right cap |
| 233 | 141 | initial T | t cap |
| 233 | 141 | initial V | v cap |

## Brief forms

None new.

## Phrases

None (the §235 phrases are all intersections; below).

## Words needing new marks

### §233 initials not yet drawable (p. 141)

| § | page | initial | proposed outline | note |
|---|---|---|---|---|
| 233 | 141 | A, E, I, Y | `a cap`, `e cap`, `i cap`, `? cap` | a lone circle (I the broken circle, Y a narrow loop): a lone circle is not supported |
| 233 | 141 | U | `u e cap`? | the oo hook with a closed loop at its end; the loop can't be read as a joined circle with certainty |
| 233 | 141 | W | `u ? cap` | a hook with a short tail; can't be split into tokens without guessing |
| 233 | 141 | C | — | a small curl with a loop at its foot; not readable as tokens without guessing |
| 233 | 141 | Q | `k u ? cap` | a k with a loop; not readable without guessing |
| 233 | 141 | X | — | a small hook-like curve with a tail, too close to S to tell apart without guessing |
| 233 | 141 | Z | — | a small s with a tick; not readable without guessing |

### §235 intersection: one character written through another (pp. 142–143)

Proposed token `x`, between two parts: the part after `x` is written as its own stroke
straight through the part before it, crossing it near its middle (the A. M. line through
the middle of the a circle; the P. M. line through the top third of the p; the D of A. D.
through the circle and beyond it at both ends). The crossing point varies from form to form
("the writer must rely very largely upon his own judgment"), so each form would need its own
crossing position, not one rule. Readings that seem clear:

| § | page | phrase | proposed outline |
|---|---|---|---|
| 235 | 142 | A. D. | `a x d` |
| 235 | 142 | A. M. | `a x m` |
| 235 | 142 | P. M. | `p x m` |
| 235 | 142 | price list | `p x l` |
| 235 | 142 | Associated Press | `a x p` (s?) |

The other forms combine several strokes on each side (Democratic party, New York Central,
Board of Managers) and are not read.

## Left out, and why

- **§233, A, E, I, Y:** lone circles (or the broken circle and a loop), which the engine
  can't compile alone.
- **§233, C, Q, U, W, X, Z:** small combined signs that can't be read into tokens without
  guessing (see the table above).
- **§233, S:** on the plate its direction can't be told from x with certainty.
- **§234:** the initials are longhand, not shorthand.
- **§235, every form:** intersection has no placement in the engine (above).
- **§236, §237:** reading and writing practice only.

## Changes to other levels

None.

## Inference (not stated by the manual)

- **S** is read as `s-right`: the small curve opens left like f, unlike the p-like s-left.
- The capital mark's size and position are measured from the p. 141 plate at 600 dpi (t ≈
  110 px a U): dashes about 45 px long and 10–12 px apart, about 40 px under the letter.
- Reading the intersections' parts as letters (A. M. = a circle and m) follows the initials
  they stand for; the manual gives no key.

## Engine needs

- None for the initials in the Words table: `cap` draws the capital mark. It could also bring
  in the Unit 25 capital words (England, America, U.S., U.S.A.).
- A lone circle as a whole outline (A, E, I, Y), which is the same gap as Unit 13's high and
  why and Unit 29's incl.
- An `x` intersection placement, with a per-form crossing point.
