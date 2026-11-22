# Architecture

The app is plain ES modules loaded by `app/index.html`; there is no bundler. Modules that do not touch the DOM (`assess.js`, `repeats.js`, `join.js`, `quizgen.js`, the geometry half of `render.js`, and `data/`) are unit-tested in Node.

## Module map

| Module | Role |
| --- | --- |
| `app/js/main.js` | Entry point. Routing between views, toolbar, persistence, export. Creates the pad, the example panel, the assist overlay, the quiz, the lessons and the UI chrome. |
| `app/js/ui.js` | The chrome: themes (`THEMES`, set as `data-theme` on `<html>`; every colour in `app.css` is a token the theme redefines), the Settings menu, and the handle (`#split`) that resizes the panel against the pad (its width in landscape, its height in portrait; the pad keeps at least 40%). Kept in `gregg.ui.v1`. |
| `app/js/dom.js` | Shared DOM helpers: `el()`, `button()`, `svgEl()`, `saveFile()` (share sheet, else a download), `outLink()` and `credit()` (links out, in a new tab). |
| `app/js/ink.js` | `InkPad`: pointer capture, canvas drawing, undo/clear, `toJSON()` and `strokesFromJSON()`. |
| `app/js/assess.js` | `assessAttempt()`: scores one repeat against the model outline and produces critiques. Matches outlines with joined consonants or an s loop as whole shapes (`assessShape()`), smooths the model as well as the learner's ink, and checks the r circle for left motion. Also `guideUnits()` for the guide and shared helpers. |
| `app/js/linepicks.js` | `createLinePicks()`: the numbered per-line buttons in the pad's left column, for Practice and Lessons. |
| `app/js/repeats.js` | `assessRepeats()`: splits pad strokes into repeats, scores each, aggregates. `practiceLines()` and `repeatIndexFor()`. |
| `app/js/assist.js` | Real-time guide, live warnings, per-stroke notes, green/red check overlay. |
| `app/js/practice.js` | The example panel: enlarged and actual-size art, meaning, source, score badge, critiques. Also the pieces Lessons and Quiz share: `actualSizeStrip()`, `enlargedSVG()`, `printedOutline()` and `scoreClass()`. |
| `app/js/lessons.js` | The Lessons view: unit dropdown, read / write / choose / reading / speed steps, the full-screen Manual and reading views, and two progress bars that show where you are (the step in the unit, its place in the course). Shares the pad and reuses the example panel and `assessRepeats()`. |
| `app/js/home.js` | The Home view: the overview and the story from `app/data/home.js`. `storyWords()` writes each sentence with the outlines the app teaches (the longest phrase first, the §8 vowel marks left out) and refuses a word it has none for; each word is its own SVG on a shared rule, so a line wraps on a phone. |
| `app/js/reference.js` | The Reference view: the Manual's front matter, alphabet, brief-form chart (searchable), phrases and its text unit by unit. |
| `app/js/manualtext.js` | Renders blocks of the Manual's text (`data/manual.js`) as paragraphs, and opens the full-screen Manual reader at a paragraph (`openManual()`, `unitOfParagraph()`), used by the "read it in the Manual" buttons in Lessons and Practice. `watchSections()` (started by `main.js` on the whole page) turns every "§N" in the app's text into a link to that paragraph on greggshorthand.github.io, as the text is rendered (a MutationObserver); a plain tap shows the paragraph(s) in a small window instead (`showSection()`, cut from `data/manual.js` by `paragraphBlocks()`), whose foot links to the site in a new tab; text inside links, buttons, selects and SVG, and Speed Studies sections, is left alone. |
| `app/data/source.js` | The pages of greggshorthand.github.io the content comes from (`sourceUrl`): front matter, alphabet, brief forms, phrases, each unit at a paragraph (`#pN`), each reading key, and the scan at a printed page (`Annivman.pdf#page=p+16`, the offset `tools/plates.json` cuts with; a test keeps the two equal). Every § links to its paragraph on the site, and 'read it in the Manual' opens the app's own copy; a caption at the foot of what the site supplied links on to it (`credit()` and `outLink()` in `dom.js`). |
| `app/js/quiz.js` | Quiz UI (start screen, questions, summary) and result history. Shares the pad. |
| `app/js/quizgen.js` | Seeded quiz generation, no DOM. Used by the dev server and, as a fallback, by the browser. |
| `app/js/render.js` | Stroke primitives to cubic Bezier geometry (U, y up); SVG output and animation. An arc may carry `ctrl` (two control points) instead of the bulge/skew/spread form; the o and u hooks use it. |
| `app/js/join.js` | Joins consonant strokes, vowel circles and the h dot into one outline (Manual §11–12 for circles at the ends, §14–22 for circles between strokes and joined curves). Turns the o hook (§67) before n, m, r, l and their blends so it leaves along the next stroke; after a downstroke it starts along the downstroke's end and is drawn twice the size (the curl on the p. 36 plates). Turns the oo hook under (§94) after n, m and their blends, and after k or g before r or l, so it starts along the stroke before it; joins us and sw without an angle (§93). Beside a circle the hooks are drawn twice the size (the §112 diphthongs ū `e u`, ow `a u` and oi `o e`, and w before a vowel); after w the circle becomes a narrow loop carrying on the hook's turn (∂, as on the Unit 11 plates; `isWLoop`, `W_LOOP`). Places the §99 w dash under the vowel that follows it and the §100 a dot on the line before the outline: and draws the §233 capital mark as two short parallel dashes rising to the right under the outline, right of its middle and below its lowest point: these marks (`isMark`) are dot segments with a `mark` (and a dash a `dash` length and, if it isn't level, an `angle`), written apart like the h dot. Places a §209 disjoined prefix (the tokens before `^`) as a stroke of its own just above the start of the rest of the word; and a §230 disjoined suffix (the tokens after `_`) as a stroke of its own just under the end of the word; the scorer takes the two parts as two outlines. Puts the h dot above a hook (home, hope, who). `circleOf(tok)` gives `{ size, reversed, loop }` for a circle token: `reversed` for the §71 r circle, `loop` for the §74 s loop. Rounds the angle into one shared direction, with no corner, for fr and fl (§39; vr and vl by inference), for the Unit 6 pairs the plates round (k-sh, f-m, f-g, b-g, k-b) and for the §52 ses blend. Handles shorten on sharp turns. |
| `app/js/writer.js` | Learned writing-size scale, kept in localStorage. |
| `app/js/backup.js` | Progress backup and restore: `exportProgress()`, `importProgress()` and `backupFileName()` (no DOM). `main.js` wires the Back up and Restore buttons. |
| `app/js/gallery.js` | The Strokes view. |
| `app/data/strokes.js` | The stroke table and look-alike families. |
| `app/data/examples.js` | All practice examples, grouped in levels (one per manual unit from Unit 2, at unit + 5). Units 4 onward are built from `data/units/`. |
| `app/data/lessons.js` | The lesson steps for Manual Units 1–3; they refer to examples by id. Units 4 onward are turned into lessons from `data/units/`. |
| `app/data/units/` | Manual Units 4 onward as plain data, one module per unit. `index.js` lists them in `UNITS` and gives each unit's Practice level (`levelOfUnit()`, unit + 5). |
| `app/data/plates.js` | Which examples have a printed plate (`plateFor()`), with its page, and the section plates used by lessons (`sectionPlate()`). |
| `tools/plates.mjs` | Cuts `app/plates/*.png` from the scan using `tools/plates.json`, smoothing each crop (blur of about a scan pixel, then a tone curve). |
| `tools/upscale.mjs` | Enlarges the website's GIFs (`app/manual/`) as grayscale PNGs: Catmull-Rom resampling of the GIFs' own anti-aliased grays, a slight gamma for the hairlines, 32 levels. No threshold or local contrast, which broke faint lines into dashes and blotted soft edges. |
| `tools/png.mjs` | The PNG reader and writer the two image tools share. |
| `tools/compare.mjs` | Sheet of each outline as the app draws it, beside the manual's plate (`node tools/compare.mjs`). |
| `tools/dev-server.mjs` | Static server for `app/` with live reload and `/api/quiz`. |
| `app/sw.js` | Service worker for offline use. Registered by `main.js`. |
| `tools/precache.mjs` | Writes `app/precache.js`, the list of files `sw.js` saves with a fingerprint of each, and versions `app/index.html`: the stylesheet, `main.js` and, through an import map, every module are requested as `file?v=<fingerprint>`. |

## Plates

`app/plates/<id>.png` are images of the manual's own printed outlines, cut from the 1929 scan by `tools/plates.mjs` (`npm run plates`). `tools/plates.json` lists one crop per image: `id`, printed `page` and `box`, in 80-dpi page pixels of the printed page. The PDF page is the printed page plus 16. Each page is rendered at 300 dpi with `pdftoppm`, cleaned (light pixels set to white), trimmed to the ink with some padding, and written as an 8-bit grayscale PNG.

`plateFor(exampleId)` returns `{ src, page }` or `null` when the manual does not print the example. The example panel (`practice.js`) shows it under the drawn outline; read questions show it only after they are answered. `ALIASES` lets an example use another's plate (brief forms use the alphabet row of their letter).

Section plates (`SECTION_PLATES`) are whole figures or tables. A lesson read step lists them in its `plates` array and `lessons.js` shows them with the rule; read steps also show the plates of their `show` examples.

To add a plate: add a crop to `tools/plates.json`, run `npm run plates <id> --sheet sheet.html` and check the result by eye, then add the id and its page to `PAGES` in `data/plates.js` (or an alias, or a section plate and a lesson `plates` entry). `tests/plates.test.mjs` checks that crops, images and pages agree, and that level 7 and 8 examples citing a manual page have a plate on that page.

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
- Stroke geometry in `data/strokes.js` is described by primitives (`line`, `arc`, `circle`) with an `angle` (direction of travel), `length` and `bulge` (sagitta as a fraction of the chord; positive bulges to the left of travel), or `ctrl` (two measured control points in chord coordinates, as fractions of the chord; the o and u hooks use it, fitted to the 1200-dpi plates). `render.js` compiles these to cubic Bezier segments; `join.js` chains them with circles and dots.

## Pointer handling

`InkPad.accepts()` takes `pen` and `mouse` events always, and `touch` only when `acceptTouch` is set (the Finger ink checkbox). Other touches are ignored, which gives palm rejection. Only one stroke is tracked at a time (`pointerId`). Coalesced pointer events are used when available. iOS scroll, zoom and selection gestures are blocked on the canvas. Points are `{ x, y, t, p }`: position, milliseconds since the pad was created, and the reported pressure.

## Scoring

`assessAttempt(example, strokes, unitPx, { scale })` in `assess.js` is verification of a known target, not recognition.

1. `modelUnits(example)` turns the example into units: outlines (one pen-down each: one consonant or hook, plus optional `a`/`e` circles) and dots (the h dot, and the brief form for "a"). Outlines of two or more consonants, and outlines with an s loop, are matched as whole shapes.
2. The user's strokes are converted to U, and tiny pen bounces are dropped. A stroke counts as a dot only if it is both small (extent under `DOT_MAX`, 0.4 U) and short (under `DOT_TRAVEL_MAX`, 0.45 U of travel), so a small o hook is not taken for a dot. The w dash and a dot are scored as dots of their own, like the h dot; outlines with a w loop are scored as whole shapes, like the s loop.
3. Each learner stroke (except dots) is first smoothed (`smoothPath()`: resampled every 0.04 U and averaged over ±2 samples) so hand jitter doesn't make a short line look curved or a small circle turn the wrong way. The model outline is smoothed the same way before shapes are compared. The writer's size (`sizeRatio`) is measured from each outline's extent, not its path length, for the same reason. For each outline, the vowel circles are located first (loops at the start or end of the path). What remains is the consonant, which is measured for angle, length and bulge. The consonant is also classified against the single-stroke alphabet letters, to say what it actually reads as. The intended letter gets the benefit of the doubt: another letter only wins if it is clearer by `READS_AS_MARGIN`, so a slightly short m is critiqued as short rather than read as n. The a/e circle split has the same allowance (15%). A repeat passes at `PASS_SCORE` (70), exported from `assess.js` and used by Practice, Lessons and the Quiz.
4. Critiques are produced for: wrong direction, too flat or steep, too long or short, curved when it should be straight (or the reverse), reading as another letter, missing circle, circle turning the wrong way, circle too large or small (a versus e), and circle on the wrong side, and an r circle (`a-rev`, `e-rev`) drawn without left motion. Each has a level (`error`, `warn`, `info`) and subtracts a penalty from 100.
5. Dots are matched by position; the h dot must be above the circle. Missing parts score zero for that unit; extra strokes subtract 8 each. Outlines weigh 1, dots 0.25.
6. The result has `score` (0 to 100), `complete`, `critiques`, per-unit results, and a `sizeRatio` (how big the writer wrote relative to the example).

`scale` is the learned writer scale from `writer.js`, clamped to 0.6 to `WRITER_MAX` (1.2). The upper limit comes from the ruling: at 1.2 the tallest strokes (b, v, j, 0.87 of a line space at the example size) still fit in about one line space. To write bigger, widen the line spacing. An attempt written well above that size gets a note saying so. It is updated from each newly completed repeat, moving a quarter of the way in log space, so short and long letters are judged against your own size.

## Repeat grouping

`repeats.js` decides what counts as one repeat of the example:

- **Letters** (`kind: 'letter'`): every stroke is one repeat. Strokes smaller than 0.15 U are ignored as pen bounces, except for the h dot (`letter-h`).
- **Everything else** (brief forms, words, sentences): every line of writing is one repeat. A stroke joins the nearest existing line if its vertical centre is within 0.6 of a line spacing of that line (1.0 for dots); otherwise it starts a new line.

`assessRepeats()` scores each group with `assessAttempt()` and returns the repeats, the latest repeat, the count of completed repeats, how many scored 70 or more, the best score, the mean score of completed repeats as `score`, and the critiques (those for the latest repeat, plus up to three notes for issues that recur in two or more completed repeats). `practiceLines()` lists the lines of writing top to bottom, ignoring lines with only dots; `linepicks.js` uses it for the per-line pickers. `repeatIndexFor()` tells the guide how many outlines are already written on the current line.

## Per-line pickers

When `practiceLines()` returns two or more lines, `linepicks.js` renders one numbered button per line in `#line-picks`, positioned at the line's y. Picking a line evaluates only that line's strokes and shows that in the panel; pressing the same button again shows all lines. The pick is stored as a y position and re-matched after each change, and dropped if its line disappears or only one line remains. Practice (`main.js`) and Lessons (`lessons.js`) each create one with their own example and panel; a lesson step that scores nothing clears the column.

## Persistence

Everything is in localStorage. All keys start with `gregg.`, and Reset removes every key with that prefix.

| Key | Written by | Contents |
| --- | --- | --- |
| `gregg.practice.v2` | `main.js` | `{ lineSpacing, acceptTouch, guide, exampleId, attempts }`. `attempts` maps an example id to `{ strokes, exportedAt, assessment }`, where `strokes` is in the export stroke format below, `exportedAt` is a millisecond timestamp or `null`, and `assessment` is a short summary (`score`, `complete`, `completedCount`, `count`, `correctCount`, `best`, `critiques`). Strokes are kept per example. |
| `gregg.quiz.v1` | `quiz.js` | The last 20 quiz results (an array). |
| `gregg.lessons.v1` | `lessons.js` | `{ unit, at, done }`: the open unit, the current step per unit, and per unit the keys of the steps done (`read:<title>`, `write:<example id>`, `choose:<example id>`). |
| `gregg.writer.v1` | `writer.js` | `{ scale, updated }`. |
| `gregg.ui.v1` | `ui.js` | `{ theme, pane: { w, h } }`: the theme id and the panel's share of the area beside (w) and above (h) the pad. |

Back up writes every `gregg.` key to a JSON file `{ app: 'gregg-trainer', format: 1, exportedAt, data }`, where `data` maps each key to its raw stored string. Restore validates the file (app and format, only `gregg.` keys, string values that parse as JSON), then removes all existing `gregg.` keys and writes the file's, so a new key needs no backup code. Invalid files are rejected before anything is changed. Back up uses the share sheet when files can be shared (iPad), otherwise a download.

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
- `example.words` is present for sentence examples (a list of `{ text, tokens, brief, phrase }`). A phrase (Manual §4, `PHRASES` in `examples.js`) is two words written as one joined outline, so it is one entry and scored as one shape.
- `assessment` is `null` if scoring failed.
- The export covers the current example only. The file is named `gregg-<example id>-<yyyymmdd-hhmmss>.json`. `InkPad.strokesFromJSON()` reads the `strokes` array back, and `assessAttempt()` accepts exported strokes directly (see `tests/fixtures/word-hate-1.json`).

## Offline and GitHub Pages

`.github/workflows/pages.yml` runs the unit tests and `node tools/precache.mjs --check` on every push to `main`, then publishes `app/` as it is (no build) to GitHub Pages, under `/shorthand/`. Every URL the app uses for its own files is relative, so it works under that sub-path; `tests/offline.test.mjs` checks this for `index.html` and the manifest.

`app/sw.js` makes the app work offline. On install it saves every file listed in `app/precache.js` (generated from the contents of `app/` by `npm run precache`, each file with a fingerprint of its contents, the first 12 hex digits of its SHA-256) into a cache named for the list's version, `gregg-<version>`. A file whose saved copy in the previous cache still has that fingerprint is copied over; only the others are downloaded, so an update over a slow connection takes seconds rather than a full download of the plates and figures, and the new worker takes over sooner. Once it is active the old cache is deleted. `tests/sw.test.mjs` runs the install against a fake cache and server. A page load is then answered from the network if it responds within 3 seconds, refreshing the saved copy, and otherwise from the cache; a page load of any URL falls back to the cached app. The page's own files come from the same place as the page: from the cache for a page that came from the cache, otherwise from the network (waiting up to 20 seconds, then the cache). Without this, a slow connection could pair a new page with an old script whose code doesn't know the page's new controls. Files are saved under their plain URL, without the `?v=` the page asks for them with, and the worker is registered with `updateViaCache: 'none'`, so its own update check (`sw.js` and `precache.js`) never comes from the browser's HTTP cache, which GitHub Pages lets keep files for 10 minutes; the versioned URLs keep the page's scripts out of that cache too. It ignores other origins, non-GET requests, the dev server's live reload and `/api/`. The end-to-end test reloads the page with the network off and checks that a lesson and a plate still load.

`app/manifest.webmanifest` and the Apple meta tags in `index.html` let the app be added to the Home Screen and open full-screen. The icons in `app/icons/` show the phrase *it will* drawn by the app's own renderer.

## Dev server

`tools/dev-server.mjs` serves `app/` (blocking paths outside it), injects a small Server-Sent Events script into HTML pages for live reload, and implements `GET /api/quiz?n=&levels=&types=&seed=` by calling `generateQuiz()`. `quiz.js` calls `api/quiz` (relative, so on Pages it simply 404s) first and falls back to running `generateQuiz()` in the browser, so a plain static server works too. `PORT` defaults to 8000 and `HOST` to `0.0.0.0`.

## Adding an example

Examples live in `app/data/examples.js`. Each has `id`, `kind` (`letter`, `brief`, `word`, `phrase` or `sentence`), `level` (1 to 8, then unit + 5 for Units 4 onward), `title`, `outline` (a list of tokens), `meaning` (a list of strings) and `source`. Sentences also have `words`, a list of `{ text, tokens, brief, phrase }`. Phrase examples (Unit 6 onward) are written by the unit modules in `data/units/`, not added here.

An outline token is a stroke id from `app/data/strokes.js` (including the o and oo hooks, `o` and `u`), `a` or `e` (vowel circles), `i` (the §112 broken circle: the large circle, joined like one, ending in a short tick turned in when it ends the outline; outlines with it are scored as whole shapes), `a-rev` or `e-rev` (the §71 r circle: the a or e circle written with left motion, counter-clockwise, on straight strokes only), `a-rev-s` or `e-rev-s` (the §74 s loop: that circle made a narrow loop at the end of an outline), `h` (the dot), or the separate marks `w-dash` (§99, the dash under the following vowel), `a-dot` (§100, the dot before the outline), `cap` (§233, the capital mark, written last), `v-dot` and `v-dash` (§8, the dot of a medium vowel and the dash of a long one, just under the following circle; added to the Unit 1–2 words that print them from `VOWEL_MARKS` in `examples.js`, so they are not written into the word lists; the scorer checks one that is written and only notes one left out), `^`, which ends a §209 disjoined prefix, or `_`, which starts a §230 disjoined suffix (one of the two, once per word, never first or last). Strokes marked `verify` in the stroke table are deliberately left out of examples until they are checked against the sources (none at present).

To add a word:

1. Make sure the outline can be built by the rules in `join.js`: consonant strokes joined in order, circles at either end (Manual §11 for curves, §12 for straight strokes) or between two strokes (§14–18), and optionally a leading `h`. Outlines of one consonant are scored part by part; outlines of two or more consonants, or with an s loop, are scored as a whole shape (`assessShape()`).
2. Add an entry to `WORDS` (level 3, from the Manual) or `WORDS_3B` / `WORDS_4` (built by the same rules), as `[word, outline, rule, note]`; or to `WORDS_7` / `WORDS_8` (Manual Units 2 and 3, transcribed in `reference/`), as `[title, outline, rule, page, note]`. Use `R11` or `R12` for the rule text, and `H` as the note for words starting with h. The `source` is set by the list you add to.
3. To use the word in sentences, it is picked up automatically from those lists by `WORD_TOKENS`.

To add a sentence, add it to `SENTENCES`. Every word must be a brief form (in the `BRIEF` map) or a word in the word lists, otherwise `sentenceExample()` throws at load time. A pair of words in `PHRASES` (the manual's §4 examples: I will, he can, it will, in the) becomes one joined outline. The level is 5 for sentences of up to four words (not counting the period, and counting a phrase as two words) and 6 for longer ones. A period mark is appended automatically.

To add a brief form, add an entry to `BRIEF_STROKES` that matches the stroke's `briefForms` in the stroke table exactly (a mismatch throws), and add the word to `BRIEF` if sentences should use it.

Cite the source in the example's `source` field. Then run `npm test`: `tests/examples.test.mjs` checks the example data, and the other tests exercise rendering and scoring.

## Adding a lesson step

Lessons live in `app/data/lessons.js`, one list of steps per unit, built with `read(title, ref, text, show)`, `write(exampleId, prompt)` and `choose(exampleId, choices)`. Steps only refer to examples, so add the example first. Saved progress is keyed by `stepKey()` (the read step's title, or the type and example id), so editing a step's text keeps it; renaming a read step or changing its example resets that step. `tests/lessons.test.mjs` checks that every id exists, that keys are unique within a unit, and that each choose step has four distinctly titled choices whose wrong answers do not share the answer's outline.

## Adding a unit

Manual Units 4 onward live in `app/data/units/`, one module per unit, with the format described in the comment at the top of `index.js`. To add Unit N: transcribe the unit into `reference/manual-unitN.md`, with each outline and the reasoning behind it. Add crops of its printed outlines to `tools/plates.json`, run `npm run plates <ids> --sheet sheet.html`, check the crops by eye, and add the ids and pages to `PAGES` in `app/data/plates.js` (or an alias or section plate, as above). Write `app/data/units/unitNN.js` and add it to `UNITS` in `index.js`; its words, brief forms and phrases become Practice examples at level `unit + 5`, and its lesson appears in the Lessons dropdown. Check the outlines with `node tools/compare.mjs --level <N> --out sheet.html` and fix any join that differs from the plate. Then run `npm run precache` (the new plates are new files under `app/`) and `npm test`.
