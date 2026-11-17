// Manual Unit 18 (pp. 80–83): the prefixes be, de, re, dis, mis. Transcribed in reference/manual-unit18.md.
export default {
  unit: 18,
  subtitle: 'The prefixes be, de, re, dis, mis',
  pages: 'pp. 80–83',
  level: { name: 'Prefixes be de re dis mis', description: 'The word-beginnings be, de, re, dis and mis with the vowel omitted, the phrase I had, and brief forms (Manual §145, §148, §150)' },
  rules: {
    R145: '“The vowel is omitted in the syllables be, de, re, dis, and mis.” (Manual §145).',
    R148: '“The word had when following a pronoun is expressed as shown in the following illustrations”: I had is the broken circle and d (Manual §148).',
    R150: 'Brief forms for common words (Manual §150).',
  },
  words: [
    ['delay', ['d', 'l', 'a'], 'R145', 80],
    ['deceit', ['d', 's-right', 'e', 't'], 'R145', 80],
    ['decision', ['d', 's-right', 'e', 'sh'], 'R145', 80],
    ['depress', ['d', 'p', 'r', 'e', 's-left'], 'R145', 80],
    ['depart', ['d', 'p', 't'], 'R145', 80],
    ['depend', ['d', 'p', 'nd'], 'R145', 80],
    ['discover', ['d', 's-left', 'k', 'v'], 'R145', 80],
    ['dispel', ['d', 's-left', 'p', 'l'], 'R145', 80],
    ['dispatch', ['d', 's-left', 'p', 'a', 'ch'], 'R145', 80],
    ['display', ['d', 's-left', 'p', 'l', 'a'], 'R145', 80],
    ['dismiss', ['d', 's-left', 'm', 'e', 's-left'], 'R145', 80],
    ['repair', ['r', 'p', 'a', 'r'], 'R145', 80],
    ['resign', ['r', 's-right', 'i', 'n'], 'R145', 80],
    ['reform', ['r', 'f', 'm'], 'R145', 80],
    ['reason', ['r', 's-right', 'n'], 'R145', 80],
    ['reasonable', ['r', 's-right', 'n', 'b'], 'R145', 80],
    ['reception', ['r', 's-left', 'e', 'p', 'sh'], 'R145', 80],
    ['replace', ['r', 'p', 'l', 'a', 's-left'], 'R145', 80],
    ['repent', ['r', 'p', 'nd'], 'R145', 80],
    ['mislaid', ['m', 's-left', 'l', 'a', 'd'], 'R145', 80],
  ],
  brief: [
    ['record', ['r', 'd'], 81],
    ['nevertheless / envelope', ['n', 'v', 'l'], 81, 'Nevertheless and envelope share one outline.'],
    ['insure / insurance', ['n', 'sh'], 81, 'Insure and insurance share one outline.'],
    ['educate / education', ['e', 'd', 'k'], 81, 'Educate and education share one outline.'],
    ['difficult / difficulty', ['def', 'k'], 81, 'Difficult and difficulty share one outline.'],
    ['newspaper / inspect', ['n', 's-left', 'p'], 81, 'Newspaper and inspect share one outline.'],
  ],
  phrases: [
    ['I had', ['i', 'd'], 81],
  ],
  lesson: [
    { read: ['The prefixes be, de, re, dis, mis', 'Manual §145, p. 80', [
      '“The vowel is omitted in the syllables be, de, re, dis, and mis.”',
      'The prefix is written as its consonant alone: be is b, de is d, re is r, dis is d and mis is m, the last two followed by the s of the syllable.'
    ], []] },
    { read: ['The prefix de', 'Manual §145, p. 80', [
      'Delay, deceit, decision, depress, depart, depend.'
    ], ['word-delay', 'word-deceit', 'word-decision', 'word-depress', 'word-depart', 'word-depend']] },
    { write: 'word-delay' },
    { write: 'word-deceit' },
    { write: 'word-decision' },
    { write: 'word-depart' },
    { choose: ['word-depart', ['word-delay', 'word-deceit', 'word-depress', 'word-depart']] },
    { read: ['The prefixes dis and mis', 'Manual §145, p. 80', [
      'Discover, dispel, dispatch, display, dismiss, mislaid.'
    ], ['word-discover', 'word-dispel', 'word-dispatch', 'word-display', 'word-dismiss', 'word-mislaid']] },
    { write: 'word-discover' },
    { write: 'word-dispel' },
    { write: 'word-display' },
    { write: 'word-mislaid' },
    { choose: ['word-dispatch', ['word-discover', 'word-dispel', 'word-dispatch', 'word-dismiss']] },
    { read: ['The prefix re', 'Manual §145, p. 80', [
      'Repair, resign, reform, reason, reasonable.'
    ], ['word-repair', 'word-resign', 'word-reform', 'word-reason', 'word-reasonable']] },
    { write: 'word-repair' },
    { write: 'word-resign' },
    { write: 'word-reform' },
    { write: 'word-reason' },
    { choose: ['word-resign', ['word-repair', 'word-resign', 'word-reform', 'word-reason']] },
    { read: ['The prefix re: more words', 'Manual §145, p. 80', [
      'Reception, replace, repent.'
    ], ['word-reception', 'word-replace', 'word-repent']] },
    { write: 'word-reception' },
    { write: 'word-replace' },
    { write: 'word-repent' },
    { choose: ['word-replace', ['word-reasonable', 'word-reception', 'word-replace', 'word-repent']] },
    { read: ['Brief forms', 'Manual §150, p. 81', [
      'Brief forms for common words: record, nevertheless / envelope, insure / insurance, educate / education, difficult / difficulty, newspaper / inspect.'
    ], ['brief-record', 'brief-nevertheless', 'brief-insure', 'brief-educate', 'brief-difficult', 'brief-newspaper']] },
    { write: 'brief-record' },
    { write: 'brief-nevertheless' },
    { write: 'brief-insure' },
    { write: 'brief-educate' },
    { choose: ['brief-insure', ['brief-record', 'brief-insure', 'brief-difficult', 'brief-newspaper']] },
    { read: ['Phrasing', 'Manual §148, p. 81', [
      '“The word had when following a pronoun is expressed as shown in the following illustrations.” The phrase I had is one outline.'
    ], ['phrase-i-had']] },
    { write: 'phrase-i-had' },
  ],
};
