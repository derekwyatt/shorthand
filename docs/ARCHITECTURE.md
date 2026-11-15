# Architecture

The app is plain ES modules loaded by `app/index.html`; there is no bundler. Modules that do not touch the DOM (`assess.js`, `repeats.js`, `join.js`, `quizgen.js`, the geometry half of `render.js`, and `data/`) are unit-tested in Node.

## Module map

| Module | Role |
| --- | --- |
| `app/js/main.js` | Entry point. Routing between views, toolbar, persistence, export, per-line pickers. Creates the pad, the example panel, the assist overlay and the quiz. |
| `app/js/ink.js` | `InkPad`: pointer capture, canvas drawing, undo/clear, `toJSON()` and `strokesFromJSON()`. |
| `app/js/assess.js` | `assessAttempt()`: scores one repeat against the model outline and produces critiques. Also `guideUnits()` for the guide and shared helpers. |
| `app/js/repeats.js` | `assessRepeats()`: splits pad strokes into repeats, scores each, aggregates. `practiceLines()` and `repeatIndexFor()`. |
| `app/js/assist.js` | Real-time guide, live warnings, per-stroke notes, green/red check overlay. |
| `app/js/practice.js` | The example panel: enlarged and actual-size art, meaning, source, score badge, critiques. |
| `app/js/lessons.js` | The Lessons view: unit tabs, read / write / choose steps, progress. Shares the pad and reuses the example panel and `assessRepeats()`. |
| `app/js/quiz.js` | Quiz UI (start screen, questions, summary) and result history. Shares the pad. |
| `app/js/quizgen.js` | Seeded quiz generation, no DOM. Used by the dev server and, as a fallback, by the browser. |
| `app/js/render.js` | Stroke primitives to cubic Bezier geometry (U, y up); SVG output and animation. |
| `app/js/join.js` | Joins consonant strokes, vowel circles and the h dot into one outline (Manual §11–12 for circles at the ends, §14–22 for circles between strokes and joined curves). |
| `app/js/writer.js` | Learned writing-size scale, kept in localStorage. |
| `app/js/gallery.js` | The Strokes view. |
| `app/data/strokes.js` | The stroke table and look-alike families. |
| `app/data/examples.js` | All practice examples, grouped in eight levels. |
| `app/data/lessons.js` | The lesson steps for Manual Units 1–3; they refer to examples by id. |
| `tools/dev-server.mjs` | Static server for `app/` with live reload and `/api/quiz`. |

## Data flow

```text
pointer events (pen, mouse, optionally touch)
  -> InkPad.onDown / onMove / onUp
       hooks during the stroke: onStrokeStart / onStrokeMove -> assist (live warnings, guide)
       on pen-up the finished stroke is pushed to pad.strokes
  -> onChange(stroke)                                   (main.js)
       in Quiz view: quiz.onPadChange() and nothing else
       otherwise:
         assessRepeats(example, pad.strokes, { unitPx, lineSpacing, scale })
           -> groupRepeats -> assessAttempt per repeat -> aggregate result
         learnWriterScale() when a new repeat has been completed
         persist() to localStorage
         panel.showAssessment(result)      score, verdict, critiques
         assist.drawCheck(result)          green/red overlay
         assist.afterStroke(result, stroke)
```

Undo and Clear also call `onChange(null)`, so the same path re-evaluates the pad. Changing the line spacing re-renders the example panel and re-assesses the existing strokes.

## Coordinates and units

- On the pad, points are CSS pixels relative to the canvas, y down. Each stroke records the `lineSpacing` it was written at.
- In assessment and rendering geometry, lengths are in **U**, where 1 U is the length of the letter t, and y is up. Angles are degrees in the maths convention (0 is rightwards, 90 is up).
- `unitPx = lineSpacing / U_PER_LINE`, with `U_PER_LINE = 3` (defined in `app/data/strokes.js`). The pad's default line spacing is 48 px, so 1 U is 16 px by default.
- `toUserStrokes()` in `assess.js` converts pad strokes to U: `x / unitPx`, `-y / unitPx`. It accepts both live points (`{x, y, t}`) and exported points (`[x, y, t, p]`).
- Stroke geometry in `data/strokes.js` is described by primitives (`line`, `arc`, `circle`) with an `angle` (direction of travel), `length` and `bulge` (sagitta as a fraction of the chord; positive bulges to the left of travel). `render.js` compiles these to cubic Bezier segments; `join.js` chains them with circles and dots.

## Pointer handling

`InkPad.accepts()` takes `pen` and `mouse` events always, and `touch` only when `acceptTouch` is set (the Finger ink checkbox). Other touches are ignored, which gives palm rejection. Only one stroke is tracked at a time (`pointerId`). Coalesced pointer events are used when available. iOS scroll, zoom and selection gestures are blocked on the canvas. Points are `{ x, y, t, p }`: position, milliseconds since the pad was created, and the reported pressure.

## Scoring

`assessAttempt(example, strokes, unitPx, { scale })` in `assess.js` is verification of a known target, not recognition.

1. `modelUnits(example)` turns the example into units: outlines (one pen-down each, one consonant plus optional `a`/`e` circles) and dots (the h dot, and the brief form for "a").
2. The user's strokes are converted to U, and tiny pen bounces are dropped. Strokes smaller than `DOT_MAX` (0.4 U) count as dots.
3. For each outline, the vowel circles are located first (loops at the start or end of the path). What remains is the consonant, which is measured for angle, length and bulge. The consonant is also classified against the single-stroke alphabet letters, to say what it actually reads as.
4. Critiques are produced for: wrong direction, too flat or steep, too long or short, curved when it should be straight (or the reverse), reading as another letter, missing circle, circle turning the wrong way, circle too large or small (a versus e), and circle on the wrong side. Each has a level (`error`, `warn`, `info`) and subtracts a penalty from 100.
5. Dots are matched by position; the h dot must be above the circle. Missing parts score zero for that unit; extra strokes subtract 8 each. Outlines weigh 1, dots 0.25.
6. The result has `score` (0 to 100), `complete`, `critiques`, per-unit results, and a `sizeRatio` (how big the writer wrote relative to the example).

`scale` is the learned writer scale from `writer.js` (clamped to 0.6 to 2.2). It is updated from each newly completed repeat, moving a quarter of the way in log space, so short and long letters are judged against your own size.

## Repeat grouping

`repeats.js` decides what counts as one repeat of the example:

- **Letters** (`kind: 'letter'`): every stroke is one repeat. Strokes smaller than 0.15 U are ignored as pen bounces, except for the h dot (`letter-h`).
- **Everything else** (brief forms, words, sentences): every line of writing is one repeat. A stroke joins the nearest existing line if its vertical centre is within 0.6 of a line spacing of that line (1.0 for dots); otherwise it starts a new line.

`assessRepeats()` scores each group with `assessAttempt()` and returns the repeats, the latest repeat, the count of completed repeats, how many scored 80 or more, the best score, the mean score of completed repeats as `score`, and the critiques (those for the latest repeat, plus up to three notes for issues that recur in two or more completed repeats). `practiceLines()` lists the lines of writing top to bottom, ignoring lines with only dots; `main.js` uses it for the per-line pickers. `repeatIndexFor()` tells the guide how many outlines are already written on the current line.

## Per-line pickers

When `practiceLines()` returns two or more lines, `main.js` renders one numbered button per line in `#line-picks`, positioned at the line's y. Picking a line evaluates only that line's strokes and shows that in the panel; pressing the same button again shows all lines. The pick is stored as a y position and re-matched after each change, and dropped if its line disappears or only one line remains.

## Persistence

Everything is in localStorage. All keys start with `gregg.`, and Reset removes every key with that prefix.

| Key | Written by | Contents |
| --- | --- | --- |
| `gregg.practice.v2` | `main.js` | `{ lineSpacing, acceptTouch, guide, exampleId, attempts }`. `attempts` maps an example id to `{ strokes, exportedAt, assessment }`, where `strokes` is in the export stroke format below, `exportedAt` is a millisecond timestamp or `null`, and `assessment` is a short summary (`score`, `complete`, `completedCount`, `count`, `correctCount`, `best`, `critiques`). Strokes are kept per example. |
| `gregg.quiz.v1` | `quiz.js` | The last 20 quiz results (an array). |
| `gregg.lessons.v1` | `lessons.js` | `{ unit, at, done }`: the open unit, the current step per unit, and per unit the keys of the steps done (`read:<title>`, `write:<example id>`, `choose:<example id>`). |
| `gregg.writer.v1` | `writer.js` | `{ scale, updated }`. |

If storage is full or unavailable the app keeps working but nothing survives a reload.

## Export JSON format

`buildExport()` in `main.js` returns `InkPad.toJSON()` plus two fields:

```json
{
  "format": "gregg-ink",
  "version": 1,
  "created": "2026-01-01T12:00:00.000Z",
  "units": { "xy": "css-px", "t": "ms", "p": "0..1" },
  "canvas": { "width": 800, "height": 600, "devicePixelRatio": 2 },
  "userAgent": "...",
  "strokes": [
    {
      "pointerType": "pen",
      "lineSpacing": 48,
      "points": [[x, y, t, p], [x, y, t, p]]
    }
  ],
  "example": {
    "id": "word-hate",
    "kind": "word",
    "title": "hate",
    "outline": ["h", "a", "t"],
    "meaning": ["..."],
    "source": "Gregg Shorthand Manual (1929), p. 5"
  },
  "assessment": {
    "score": 90,
    "complete": true,
    "completedCount": 3,
    "count": 3,
    "correctCount": 3,
    "best": 95,
    "critiques": [{ "level": "info", "text": "..." }]
  }
}
```

- `points` entries are `[x, y, t, p]`: x and y in CSS pixels (y down, rounded to 0.01), `t` in milliseconds since the pad was created (rounded to 0.1), `p` pressure from 0 to 1 as reported by the device.
- `example.words` is present for sentence examples (a list of `{ text, tokens, brief }`).
- `assessment` is `null` if scoring failed.
- The export covers the current example only. The file is named `gregg-<example id>-<yyyymmdd-hhmmss>.json`. `InkPad.strokesFromJSON()` reads the `strokes` array back, and `assessAttempt()` accepts exported strokes directly (see `tests/fixtures/word-hate-1.json`).

## Dev server

`tools/dev-server.mjs` serves `app/` (blocking paths outside it), injects a small Server-Sent Events script into HTML pages for live reload, and implements `GET /api/quiz?n=&levels=&types=&seed=` by calling `generateQuiz()`. `quiz.js` calls `/api/quiz` first and falls back to running `generateQuiz()` in the browser, so a plain static server works too. `PORT` defaults to 8000 and `HOST` to `0.0.0.0`.

## Adding an example

Examples live in `app/data/examples.js`. Each has `id`, `kind` (`letter`, `brief`, `word` or `sentence`), `level` (1 to 8), `title`, `outline` (a list of tokens), `meaning` (a list of strings) and `source`. Sentences also have `words`, a list of `{ text, tokens, brief }`.

An outline token is a stroke id from `app/data/strokes.js`, `a` or `e` (vowel circles), or `h` (the dot). Strokes marked `verify` in the stroke table are deliberately left out of examples until they are checked against the sources.

To add a word:

1. Make sure the outline can be built by the rules in `join.js`: consonant strokes joined in order, circles at either end (Manual §11 for curves, §12 for straight strokes) or between two strokes (§14–18), and optionally a leading `h`. Outlines of one consonant are scored part by part; outlines of two or more are scored as a whole shape (`assessShape()`).
2. Add an entry to `WORDS` (level 3, from the Manual) or `WORDS_3B` / `WORDS_4` (built by the same rules), as `[word, outline, rule, note]`; or to `WORDS_7` / `WORDS_8` (Manual Units 2 and 3, transcribed in `reference/`), as `[title, outline, rule, page, note]`. Use `R11` or `R12` for the rule text, and `H` as the note for words starting with h. The `source` is set by the list you add to.
3. To use the word in sentences, it is picked up automatically from those lists by `WORD_TOKENS`.

To add a sentence, add it to `SENTENCES`. Every word must be a brief form (in the `BRIEF` map) or a word in the word lists, otherwise `sentenceExample()` throws at load time. The level is 5 for sentences of up to four words (not counting the period) and 6 for longer ones. A period mark is appended automatically.

To add a brief form, add an entry to `BRIEF_STROKES` that matches the stroke's `briefForms` in the stroke table exactly (a mismatch throws), and add the word to `BRIEF` if sentences should use it.

Cite the source in the example's `source` field. Then run `npm test`: `tests/examples.test.mjs` checks the example data, and the other tests exercise rendering and scoring.

## Adding a lesson step

Lessons live in `app/data/lessons.js`, one list of steps per unit, built with `read(title, ref, text, show)`, `write(exampleId, prompt)` and `choose(exampleId, choices)`. Steps only refer to examples, so add the example first. Saved progress is keyed by `stepKey()` (the read step's title, or the type and example id), so editing a step's text keeps it; renaming a read step or changing its example resets that step. `tests/lessons.test.mjs` checks that every id exists, that keys are unique within a unit, and that each choose step has four distinctly titled choices whose wrong answers do not share the answer's outline.
