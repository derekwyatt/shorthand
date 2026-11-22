// Manual Unit 34 (pp. 146–150): states and territories; principal cities. Transcribed in reference/manual-unit34.md.
export default {
  unit: 34,
  subtitle: 'States and principal cities',
  pages: 'pp. 146–150',
  level: { name: 'States and cities', description: 'Post Office abbreviations of states and territories, and the names of principal cities (Manual §238–239)' },
  rules: {
    R238: '“The abbreviations used in the following list are those adopted by the Post Office Department” (Manual §238).',
    R239: '“The following names of cities are arranged in the order of their population” (Manual §239).',
  },
  words: [
    ['Ala.', ['a', 'l', 'a'], 'R238', 146],
    ['Calif.', ['k', 'a', 'l'], 'R238', 146],
    ['Del.', ['d', 'e', 'l'], 'R238', 146],
    ['Fla.', ['f', 'l', 'a'], 'R238', 146],
    ['Idaho', ['i', 'd', 'o'], 'R238', 146],
    ['Md.', ['m', 'd'], 'R238', 146],
    ['Mich.', ['m', 'sh'], 'R238', 146],
    ['Mo.', ['m', 'o'], 'R238', 146],
    ['N. Dak.', ['n', 'd', 'a', 'k'], 'R238', 146],
    ['Okla.', ['o', 'k', 'l', 'a'], 'R238', 147],
    ['P. I.', ['p', 'i'], 'R238', 147],
    ['Vt.', ['v', 't'], 'R238', 147],
    ['Va.', ['v', 'a'], 'R238', 147],
    ['Omaha', ['o', 'm', 'a'], 'R239', 148],
    ['Erie', ['e', 'r', 'e'], 'R239', 149],
  ],
  brief: [],
  phrases: [],
  lesson: [
    { read: ['States, territories and cities', 'Manual §238, pp. 146–147', [
      '“The abbreviations used in the following list are those adopted by the Post Office Department”',
      'Each state is written as its Post Office abbreviation, not as the full name.',
      'Ala., Md., Okla., Va.'
    ], ['word-ala', 'word-md', 'word-okla', 'word-va']] },
    { read: ['States: m, n and d', 'Manual §238, p. 146', [
      'Md., Mich., Mo., N. Dak. and Del. are each written from the letters of the abbreviation.',
      'Md., Mich., Mo., N. Dak., Del.'
    ], ['word-md', 'word-mich', 'word-mo', 'word-n-dak', 'word-del']] },
    { write: ['word-md', 'Write the abbreviation for “Md.”.'] },
    { write: ['word-mich', 'Write the abbreviation for “Mich.”.'] },
    { write: ['word-mo', 'Write the abbreviation for “Mo.”.'] },
    { write: ['word-n-dak', 'Write the abbreviation for “N. Dak.”.'] },
    { write: ['word-del', 'Write the abbreviation for “Del.”.'] },
    { choose: ['word-mich', ['word-mich', 'word-md', 'word-mo', 'word-del']] },
    { read: ['States: a, k, f, i, o, p and v', 'Manual §238, pp. 146–147', [
      'Ala., Calif., Fla., Idaho, Okla., P. I., Vt. and Va. are each written from the letters of the abbreviation.',
      'Ala., Calif., Fla., Idaho, Okla., P. I., Vt., Va.'
    ], ['word-ala', 'word-calif', 'word-fla', 'word-idaho', 'word-okla', 'word-p-i', 'word-vt', 'word-va']] },
    { write: ['word-ala', 'Write the abbreviation for “Ala.”.'] },
    { write: ['word-calif', 'Write the abbreviation for “Calif.”.'] },
    { write: ['word-fla', 'Write the abbreviation for “Fla.”.'] },
    { write: ['word-idaho', 'Write the abbreviation for “Idaho”.'] },
    { write: ['word-okla', 'Write the abbreviation for “Okla.”.'] },
    { write: ['word-p-i', 'Write the abbreviation for “P. I.”.'] },
    { write: ['word-vt', 'Write the abbreviation for “Vt.”.'] },
    { write: ['word-va', 'Write the abbreviation for “Va.”.'] },
    { choose: ['word-vt', ['word-vt', 'word-va', 'word-fla', 'word-ala']] },
    { read: ['Principal cities', 'Manual §239, pp. 147–149', [
      '“The following names of cities are arranged in the order of their population”',
      'Omaha and Erie are written in full, as outlines.',
      'Omaha, Erie.'
    ], ['word-omaha', 'word-erie']] },
    { write: ['word-omaha', 'Write “Omaha”.'] },
    { write: ['word-erie', 'Write “Erie”.'] },
    { choose: ['word-erie', ['word-erie', 'word-omaha', 'word-idaho', 'word-okla']] },
  ],
};
