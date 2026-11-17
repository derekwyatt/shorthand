// Manual Units 4 onward, one module per unit. Each module's default export is plain data:
//
//   unit, subtitle, pages            e.g. 4, 'The downward characters', 'pp. 18–22'
//   level: { name, description }     the Practice level for the unit's words (id = unit + 5)
//   rules: { key: text }             rule text quoted or paraphrased from the manual
//   words: [[title, outline, rule key, page, note?]]
//                                    title may name several words sharing one outline
//                                    ("rid / red / read"); the id is word-<first word>
//   brief: [[title, outline, page, note?]]   brief forms; the id is brief-<first name>
//   phrases: [[title, outline, page, note?]] joined phrases; the id is phrase-<title>
//   lesson: [step]                   { read: [title, ref, text[], show[], plates[]] },
//                                    { write: id | [id, prompt] }, { choose: [id, choices[]] }
//
// Transcriptions and the reasoning behind each outline are in reference/manual-unit<N>.md.
// Units 1–3 predate this format and live in examples.js and lessons.js.
import unit04 from './unit04.js';
import unit05 from './unit05.js';
import unit06 from './unit06.js';
import unit07 from './unit07.js';
import unit08 from './unit08.js';
import unit09 from './unit09.js';
import unit10 from './unit10.js';
import unit11 from './unit11.js';
import unit12 from './unit12.js';
import unit13 from './unit13.js';
import unit14 from './unit14.js';

export const UNITS = [unit04, unit05, unit06, unit07, unit08, unit09, unit10, unit11, unit12, unit13, unit14];

// The Practice level of a unit's words.
export const levelOfUnit = (unit) => unit + 5;
