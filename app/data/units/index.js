// Manual Units 4 onward, one module per unit. Each module's default export is plain data:
//
//   unit, subtitle, pages            e.g. 4, 'The downward characters', 'pp. 18–22'
//   level: { name, description }     the Practice level for the unit's words (id = unit + 5)
//   rules: { key: text }             rule text quoted or paraphrased from the manual
//   words: [[title, outline, rule key, page, note?]]
//                                    title may name several words sharing one outline
//                                    ("knees / niece"); the id is word-<first word>
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
import unit15 from './unit15.js';
import unit16 from './unit16.js';
import unit17 from './unit17.js';
import unit18 from './unit18.js';
import unit19 from './unit19.js';
import unit20 from './unit20.js';
import unit21 from './unit21.js';
import unit22 from './unit22.js';
import unit23 from './unit23.js';
import unit24 from './unit24.js';
import unit25 from './unit25.js';
import unit26 from './unit26.js';
import unit27 from './unit27.js';
import unit28 from './unit28.js';
import unit29 from './unit29.js';
import unit30 from './unit30.js';
import unit31 from './unit31.js';
import unit32 from './unit32.js';
import unit33 from './unit33.js';
import unit34 from './unit34.js';
import unit35 from './unit35.js';
import unit36 from './unit36.js';

export const UNITS = [unit04, unit05, unit06, unit07, unit08, unit09, unit10, unit11, unit12, unit13, unit14, unit15, unit16, unit17, unit18, unit19, unit20, unit21, unit22, unit23, unit24, unit25, unit26, unit27, unit28, unit29, unit30, unit31, unit32, unit33, unit34, unit35, unit36];

// The Practice level of a unit's words.
export const levelOfUnit = (unit) => unit + 5;
