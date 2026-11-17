# Manual Unit 6: x, the suffix shun, the past tense, brief forms (source transcription)

Source: *Gregg Shorthand Manual, Anniversary Edition* (1929), Chapter II, Unit 6, printed
pages 29–33 (PDF pages 45–49 of the scan at https://greggshorthand.github.io/Annivman.pdf).
A 1929 US publication, in the US public domain since 1 January 2025.

Conventions are as in `manual-unit2.md`: tokens are stroke ids plus `a` / `e` circles and
the `h` dot, written in writing order; vowel marks are omitted. A large circle is `a`
(the §7 A group), a small circle `e` (the E group). Plate crop boxes (80 dpi) are in
`scratchpad/u6/plates-unit6.json`. Pages 32–33 (§63 reading, §64 writing practice) are text only.

## Rules, quoted from the manual

- **§57 The Letter X.** "When x occurs at the end of or within words, it is expressed by s
  slightly modified in slant, thus:" Note: "The plural is formed by adding s as shown in
  mixes, taxes."
- **§58 Simple suffixes.** "The suffix shun (sion, tion) is expressed by sh:" Token: `sh`.
- **§59 The Past Tense.** "The past tense is expressed by t or d:
  1. After most abbreviated words a disjoined t placed close to the preceding character is
  used to express the past tense, thus:
  2. In all other cases join t or d if a distinctive and facile joining is possible;
  otherwise, disjoin t (as in glared, tapered) to express the past tense, thus:"
- **§60 Brief forms for common words.** Footnote: "The s is added to tell by changing the
  circle into a loop, thus: tells".
- **§61 Brief forms as prefixes.** "A brief form is frequently used as a prefix or as part
  of another word, as illustrated in the following:"
- **§62 Frequent phrases.** Footnote to *to be*: "Before a downstroke, to is expressed by t."

## Words (in the manual's order)

| § | Page | Example title | Outline |
|---|---|---|---|
| 58 | 29 | mention | men sh |
| 58 | 29 | fashion | f a sh |
| 58 | 29 | vision | v e sh |
| 58 | 29 | nation | n a sh |
| 58 | 29 | action | a k sh |
| 58 | 29 | mission | m e sh |
| 58 | 29 | faction | f a k sh |
| 58 | 29 | evasion | e v a sh |
| 58 | 29 | diction | d e k sh |
| 59 | 30 | mentioned | men sh d |
| 59 | 30 | checked | ch e k t |
| 61 | 31 | inform | n f m |
| 61 | 31 | formal | f m l |
| 61 | 31 | income | n k m |
| 61 | 31 | forgot | f g t |

Brief forms (§60, p. 30), kind `brief`:

| Words | Outline |
|---|---|
| present / presence | p r |
| big / beg | b g |
| got | g t |
| gave | g a |
| tell / till | t e |

Phrases (§62, p. 31), kind `brief` (crop ids `phrase-<slug>`):

| Words | Outline |
|---|---|
| would be | d b |
| to be | t b |
| can be | k b |
| I have | a v |

## Left out, and why

- **mix, fix, tax, mixes, fixes, taxes (§57), fixed (§59):** the plate's x is an s tick
  only slightly steeper than s; at the scan's resolution the difference from `s-left` /
  `s-right` cannot be measured reliably enough to define `x-left` / `x-right` geometry.
- **session, section (§58):** the initial s sign (left or right) is not legible.
- **affection (§58):** the circle between f and k is not distinguishable from the turn.
- **changed, timed, liked, willed (§59.1); glared, tapered, feared (§59.2):** disjoined t.
- **passed, raced, praised, risked, traced, visited (§59.2):** the s sign before the joined
  t is not legible. **shaped, reached, labored:** the final t / d is not clear on the plate.
- **Brief forms:** also, until, another, woman, soon, name, still, next (o / oo hooks, an
  unsettled th form, or an s sign that is not legible); nothing, morning (ing dot);
  between, letter / let, give / given (the final part is not clear enough to transcribe);
  tells (the s loop).
- **§61:** almost, anyone, increase, instead, overwork, undergo, ago (hooks or unclear s);
  handle (h dot without a circle); begin, began, forgive (the final circle / give hook is
  not clear at this resolution).
- **§62:** for the, with the, there is, of his, of this, of your, of all, for you, if you,
  from the, as the, you have, there are, in this, in our, may be, and that (th forms,
  hooks, s signs or overlapping plates).

## Changes to other levels

None.

## Inference (not stated by the manual)

- **x:** on the plates (mix, fix, tax) x is a short s-sized tick after the vowel circle,
  written a little more upright than s; mixes and taxes add a second tick. No angle can be
  stated, so no x token is proposed.
- Circle size follows the vowel group: fashion, nation, action, faction, evasion (second
  circle) are `a`; vision, mission, diction, checked, evasion (first circle), tell are `e`.
  The printed circles agree.
- **Joinings that differ from `join.js`:** the plates round k into sh (action, faction,
  diction), f into m / g (formal, forgot), p into r (present), b into g (big) and k into b
  (can be) with no corner, like the §39 fr / fl rule; the engine rounds only f/v + r/l, so
  it will draw angles there.
