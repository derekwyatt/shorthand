# Manual Unit 3: blends, frequent words, brief forms (source transcription for level 8)

Source: *Gregg Shorthand Manual, Anniversary Edition* (1929), Chapter I, Unit 3, printed
pages 12–14 (PDF pages 28–30 of the scan at https://greggshorthand.github.io/Annivman.pdf).
A 1929 US publication, in the US public domain since 1 January 2025.

This file is the source of truth for the level 8 examples in `app/data/examples.js` and
the Unit 3 lesson in `app/data/lessons.js`. Conventions are as in `manual-unit2.md`:
tokens are stroke ids plus `a` / `e` circles and the `h` dot; vowel marks are omitted.

## Rules, quoted from the manual

- **§26.** "By blending d and t into one long stroke the syllables ted, ded, det are
  expressed." Note: "The combination det usually occurs at the beginning of words, as in
  detect, detach, while ted or ded usually occurs at the end of a word." Token: `ted`.
- **§27.** "By blending m and n into one long stroke the syllables men, mem are expressed.
  In addition to men, mem this blend represents similar sounds, such as min in minute, mun
  in money." Token: `men`.
- **§28 Frequent-word drill.** The manual prints each word with its sound spelling
  (eight "ā t", had "h ă d", ...), which gives the outline directly.
- **§29 Brief forms.** Note: "W is omitted in the word were, and wh in where, when, what;
  other is expressed by ŭth; all, by aw placed on its side; time, by the tem blend; into,
  by blending in and to. For convenience, the long i in my is expressed by a large circle."

## Words (in the manual's order)

| § | Page | Example title | Outline |
|---|---|---|---|
| 26 | 12 | added | a ted |
| 26 | 12 | hated | h a ted |
| 26 | 12 | rated | r a ted |
| 26 | 12 | needed | n e ted |
| 26 | 12 | today | ted a |
| 26 | 12 | treated | t r e ted |
| 27 | 12 | meant | men t |
| 27 | 12 | mend | men d |
| 27 | 12 | minute | men e t |
| 27 | 12 | mimic | men e k |
| 27 | 12 | memory | men r e |
| 27 | 12 | remain | r e men |
| 27 | 12 | emanate | e men a t |
| 27 | 12 | mental | men t l |
| 27 | 12 | minimum | men e men |
| 28 | 13 | had | a d (printed without the h dot: the outline of add) |
| 28 | 13 | him | e m (printed without the h dot) |
| 28 | 13 | net | n e t |
| 28 | 13 | need | n e d |
| 28 | 13 | tin | t e n |
| 28 | 13 | tan | t a n |
| 28 | 13 | cat | k a t |
| 28 | 13 | kid | k e d |
| 28 | 13 | aid | a d (dash) |
| 28 | 13 | meet | m e t (dash) |
| 28 | 13 | man | m a n |
| 28 | 13 | came | k a m (dash) |
| 28 | 13 | her | e r (printed without the h dot) |
| 28 | 13 | here | h e r (dash) |
| 28 | 14 | lack | l a k |
| 28 | 13 | ready | r e d e |
| 28 | 14 | led | l e d |
| 28 | 14 | late | l a t |
| 28 | 14 | laid | l a d |
| 28 | 14 | mill | m e l |
| 28 | 14 | tree | t r e |
| 28 | 14 | train | t r a n |
| 28 | 14 | clean | k l e n |
| 28 | 14 | leg | l e g |
| 28 | 14 | attack | a t a k |
| 28 | 14 | headache | h e d a k |

Brief forms (§29, p. 14), kind `brief`:

| Words | Outline |
|---|---|
| when | e n |
| any | n e |
| were | e r |
| where / aware | a r |
| my | m a |
| could | k d |
| come | k m |
| little | l e t |
| country | k t |

Did / date (`ted`) and time (`tem`) are already level 2 brief forms.

## Left out, and why

- **Drill words with the outline of an existing example** (not repeated in level 8; the
  lesson uses the existing example and says so): eight = ate, add, tea, day, me, may,
  met, made = maid, mean, make, get, take, air, head, read, rate, cream, milk. (aid, meet,
  man, came and lack differ from add, met, main, calm and lake by their vowel marks, §8, so
  they are examples of their own.)
- **many, money (§27):** both are `men e`, the level 4 example "many".
- **month (§27):** the final th is too small on the plate to tell the over form from the
  under form (as with hath, wrath, myth in Unit 2).
- **mineral (§27):** the plate's r–l junction is not clear enough to transcribe.
- **other, all, what, those, truth, like, into (§29):** they need the o and u hooks or a
  th form that is not settled yet, or (into, like) a joining the plate does not make clear.

## Changes to other levels

- **any:** level 3 had a built outline `e n e`. The manual's brief form is `n e` (§29),
  so the built word is removed and the sentence "Any day is good." uses the brief form.
- Brief forms that share an outline with a word are the manual's own: any = knee,
  were = ear, where = air, my = may. They are in a different level, so a quiz never offers
  both as choices for one outline.

## Inference (not stated by the manual)

- Circles between a blend and another stroke follow the Unit 2 rules in `join.js`
  (needed, minute, remain: outside the angle; minimum: §17, right motion). The placement
  matches the plates.
