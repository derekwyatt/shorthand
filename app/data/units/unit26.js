// Manual Unit 26 (pp. 113–115): the abbreviating principle, continued; vowel omitted before shun. Transcribed in reference/manual-unit26.md.
export default {
  unit: 26,
  subtitle: 'The abbreviating principle, continued; shun',
  pages: 'pp. 113–115',
  level: { name: 'Abbreviating principle, continued; shun', description: 'Writing through the consonant after the accented syllable, and the vowel omitted before shun (Manual §198–199)' },
  rules: {
    R198: '“Write through the consonant following the accented syllable, if writing through the accented syllable does not give a sufficiently distinctive form”: abs for absent (Manual §198).',
    R199: '“The vowel is omitted in the terminations tition, tation, dition, dation, nition, nation, mission, mation” (Manual §199).',
  },
  words: [
    ['absent', ['a', 'b', 's-left'], 'R198', 113],
    ['accomplish', ['a', 'k', 'm', 'p'], 'R198', 113],
    ['attitude', ['a', 't', 'e', 't'], 'R198', 113],
    ['corporation', ['k', 'o', 'r', 'p'], 'R198', 113],
    ['frequent', ['f', 'r', 'e', 'k'], 'R198', 113],
    ['indicate', ['nd', 'e', 'k'], 'R198', 113],
    ['local', ['l', 'o', 'k'], 'R198', 113],
    ['splendid', ['s-left', 'p', 'l', 'e', 'nd'], 'R198', 113],
    ['permanent', ['p', 'r', 'm'], 'R198', 114],
    ['similar', ['s-right', 'm', 'e', 'l'], 'R198', 114],
    ['title', ['t', 'i', 't'], 'R198', 114],
    ['station', ['s-right', 't', 'sh'], 'R199', 114],
    ['quotation', ['k', 'w-dash', 'o', 't', 'sh'], 'R199', 114],
    ['notation', ['n', 'o', 't', 'sh'], 'R199', 114],
    ['edition', ['e', 'd', 'sh'], 'R199', 114],
    ['addition', ['a', 'd', 'sh'], 'R199', 114],
    ['condition', ['k', 'd', 'sh'], 'R199', 114],
    ['foundation', ['f', 'nd', 'sh'], 'R199', 114],
    ['commission', ['k', 'm', 'sh'], 'R199', 114],
    ['information', ['n', 'f', 'm', 'sh'], 'R199', 114],
    ['permission', ['p', 'r', 'm', 'sh'], 'R199', 114],
    ['intimation', ['n', 'tem', 'sh'], 'R199', 114],
    ['definition', ['def', 'n', 'sh'], 'R199', 114],
  ],
  brief: [],
  phrases: [],
  lesson: [
    { read: ['Through the consonant after the accent', 'Manual §198, p. 113', [
      '“Write through the consonant following the accented syllable, if writing through the accented syllable does not give a sufficiently distinctive form.”',
      'Absent, accomplish, attitude, corporation.'
    ], ['word-absent', 'word-accomplish', 'word-attitude', 'word-corporation']] },
    { write: ['word-absent', 'Write absent, stopping where the parenthesis begins: abs(ent)'] },
    { write: 'word-accomplish' },
    { write: 'word-attitude' },
    { write: 'word-corporation' },
    { choose: ['word-accomplish', ['word-accomplish', 'word-absent', 'word-attitude', 'word-corporation']] },
    { read: ['Through the consonant after the accent: more (2)', 'Manual §198, p. 113', [
      'Frequent, indicate, local, splendid.'
    ], ['word-frequent', 'word-indicate', 'word-local', 'word-splendid']] },
    { write: 'word-frequent' },
    { write: 'word-indicate' },
    { write: 'word-local' },
    { write: 'word-splendid' },
    { choose: ['word-local', ['word-local', 'word-frequent', 'word-indicate', 'word-splendid']] },
    { read: ['Through the consonant after the accent: more (3)', 'Manual §198, p. 114', [
      'Permanent, similar, title.'
    ], ['word-permanent', 'word-similar', 'word-title']] },
    { write: 'word-permanent' },
    { write: 'word-similar' },
    { write: 'word-title' },
    { choose: ['word-similar', ['word-similar', 'word-permanent', 'word-title', 'word-absent']] },
    { read: ['Omission of the vowel before shun', 'Manual §199, p. 114', [
      '“The vowel is omitted in the terminations tition, tation, dition, dation, nition, nation, mission, mation”.',
      'Station, quotation, notation, edition.'
    ], ['word-station', 'word-quotation', 'word-notation', 'word-edition']] },
    { write: 'word-station' },
    { write: 'word-quotation' },
    { write: 'word-notation' },
    { write: 'word-edition' },
    { choose: ['word-quotation', ['word-quotation', 'word-station', 'word-notation', 'word-edition']] },
    { read: ['Omission of the vowel before shun: more (2)', 'Manual §199, p. 114', [
      'Addition, condition, foundation, commission.'
    ], ['word-addition', 'word-condition', 'word-foundation', 'word-commission']] },
    { write: 'word-addition' },
    { write: 'word-condition' },
    { write: 'word-foundation' },
    { write: 'word-commission' },
    { choose: ['word-condition', ['word-condition', 'word-addition', 'word-foundation', 'word-commission']] },
    { read: ['Omission of the vowel before shun: more (3)', 'Manual §199, p. 114', [
      'Information, permission, intimation, definition.'
    ], ['word-information', 'word-permission', 'word-intimation', 'word-definition']] },
    { write: 'word-information' },
    { write: 'word-permission' },
    { write: 'word-intimation' },
    { write: 'word-definition' },
    { choose: ['word-permission', ['word-permission', 'word-information', 'word-intimation', 'word-definition']] },
  ],
};
