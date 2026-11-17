// Manual Unit 30 (pp. 129–133): phrasing principles. Transcribed in reference/manual-unit30.md.
export default {
  unit: 30,
  subtitle: 'Phrasing principles',
  pages: 'pp. 129–133',
  level: { name: 'Phrasing principles', description: 'Prefixes over the next word, done as den, than as n, and modified forms in phrases (Manual §219–221, §224)' },
  rules: {
    R219: '“The words extra, enter, over, under, short, center, counter, agree, grand are expressed by the prefixal forms placed over the next word” (Manual §219).',
    R220: '“The word done is expressed by the den blend in many phrases” (Manual §220).',
    R221: '“In many phrases the word than is expressed by n” (Manual §221).',
    R224: '“In a number of phrases the word forms are modified or a word is omitted where the grammatical construction of the sentence would compel its restoration when transcribing” (Manual §224).',
  },
  words: [],
  brief: [],
  phrases: [
    ['enter the', ['n', '^', 'th-over'], 129],
    ['enter into', ['n', '^', 'nd'], 129],
    ['over the', ['o', '^', 'th-over'], 129],
    ['under any', ['u', '^', 'n', 'e'], 129],
    ['under consideration', ['u', '^', 'k', 's-right', 'sh'], 129],
    ['extra fare', ['e', 's-right', '^', 'f', 'a', 'r'], 129],
    ['short time', ['sh', '^', 'tem'], 129],
    ['center line', ['s-right', 'n', '^', 'l', 'a', 'n'], 129],
    ['have done', ['v', 'ten'], 130],
    ['will be done', ['l', 'b', 'ten'], 130],
    ['would be done', ['d', 'b', 'ten'], 130],
    ['should be done', ['sh', 'd', 'b', 'ten'], 130],
    ['nearer than', ['n', 'e-rev', 'n'], 130],
    ['sooner than', ['s-right', 'n', 'e-rev', 'n'], 130],
    ['I always', ['i', 'l', 's-left'], 131],
    ['on hand', ['h', 'o', 'nd'], 131],
    ['whole lot', ['h', 'o', 'l', 'o', 't'], 131],
  ],
  lesson: [
    { read: ['Prefixes over the next word', 'Manual §219, p. 129', [
      '“The words extra, enter, over, under, short, center, counter, agree, grand are expressed by the prefixal forms placed over the next word:”',
      'Enter the, enter into, over the, under any.'
    ], ['phrase-enter-the', 'phrase-enter-into', 'phrase-over-the', 'phrase-under-any']] },
    { write: 'phrase-enter-the' },
    { write: 'phrase-enter-into' },
    { write: 'phrase-over-the' },
    { write: 'phrase-under-any' },
    { choose: ['phrase-over-the', ['phrase-enter-the', 'phrase-enter-into', 'phrase-over-the', 'phrase-under-any']] },
    { read: ['Prefixes over the next word: more', 'Manual §219, p. 129', [
      '“The words extra, enter, over, under, short, center, counter, agree, grand are expressed by the prefixal forms placed over the next word:”',
      'Under consideration, extra fare, short time, center line.'
    ], ['phrase-under-consideration', 'phrase-extra-fare', 'phrase-short-time', 'phrase-center-line']] },
    { write: 'phrase-under-consideration' },
    { write: 'phrase-extra-fare' },
    { write: 'phrase-short-time' },
    { write: 'phrase-center-line' },
    { choose: ['phrase-short-time', ['phrase-under-consideration', 'phrase-extra-fare', 'phrase-short-time', 'phrase-center-line']] },
    { read: ['Done as den', 'Manual §220, p. 130', [
      '“The word done is expressed by the den blend in many phrases:”',
      'Have done, will be done, would be done, should be done.'
    ], ['phrase-have-done', 'phrase-will-be-done', 'phrase-would-be-done', 'phrase-should-be-done']] },
    { write: 'phrase-have-done' },
    { write: 'phrase-will-be-done' },
    { write: 'phrase-would-be-done' },
    { write: 'phrase-should-be-done' },
    { choose: ['phrase-would-be-done', ['phrase-have-done', 'phrase-will-be-done', 'phrase-would-be-done', 'phrase-should-be-done']] },
    { read: ['Than as n', 'Manual §221, p. 130', [
      '“In many phrases the word than is expressed by n.”',
      'Nearer than, sooner than.'
    ], ['phrase-nearer-than', 'phrase-sooner-than']] },
    { write: 'phrase-nearer-than' },
    { write: 'phrase-sooner-than' },
    { choose: ['phrase-sooner-than', ['phrase-nearer-than', 'phrase-sooner-than', 'phrase-have-done', 'phrase-under-any']] },
    { read: ['Modified forms', 'Manual §224, p. 131', [
      '“In a number of phrases the word forms are modified or a word is omitted where the grammatical construction of the sentence would compel its restoration when transcribing:”',
      'I always, on hand, whole lot.'
    ], ['phrase-i-always', 'phrase-on-hand', 'phrase-whole-lot']] },
    { write: 'phrase-i-always' },
    { write: 'phrase-on-hand' },
    { write: 'phrase-whole-lot' },
    { choose: ['phrase-on-hand', ['phrase-i-always', 'phrase-on-hand', 'phrase-whole-lot', 'phrase-sooner-than']] },
  ],
};
