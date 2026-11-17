// Manual Unit 24 (pp. 104–105): words omitted in phrases. Transcribed in reference/manual-unit24.md.
export default {
  unit: 24,
  subtitle: 'Words omitted in phrases',
  pages: 'pp. 104–105',
  level: { name: 'Words omitted in phrases', description: 'Unimportant words such as or, of, the and a left out of common phrases where the sense restores them (Manual §189)' },
  rules: {
    R189: '“Any unimportant word may be omitted where the sense requires its restoration in transcribing” (Manual §189).',
  },
  words: [],
  brief: [],
  phrases: [
    ['more or less', ['m', 'l', 'e', 's-left'], 104],
    ['little or no', ['l', 'e', 't', 'n', 'o'], 104],
    ['one or two', ['u', 'n', 't', 'u'], 104],
    ['week or two', ['e', 'k', 't', 'u'], 104],
    ['some of them', ['s-right', 'm', 'th-over', 'm'], 104],
    ['in a week or two', ['n', 'e', 'k', 't', 'u'], 104],
    ['on the question', ['o', 'n', 'k', 'sh'], 105],
    ['in the matter', ['n', 'm', 'a', 't'], 105],
    ['more and more', ['m', 'nd', 'm'], 105],
    ['I am of the opinion', ['i', 'm', 'o', 'p', 'n'], 105],
  ],
  lesson: [
    { read: ['Or omitted', 'Manual §189, p. 104', [
      '“Any unimportant word may be omitted where the sense requires its restoration in transcribing:”',
      'More or less, little or no.'
    ], ['phrase-more-or-less', 'phrase-little-or-no']] },
    { write: 'phrase-more-or-less' },
    { write: 'phrase-little-or-no' },
    { choose: ['phrase-little-or-no', ['phrase-little-or-no', 'phrase-more-or-less', 'phrase-one-or-two', 'phrase-week-or-two']] },
    { read: ['Or omitted: two', 'Manual §189, p. 104', [
      'One or two, week or two.'
    ], ['phrase-one-or-two', 'phrase-week-or-two']] },
    { write: 'phrase-one-or-two' },
    { write: 'phrase-week-or-two' },
    { choose: ['phrase-one-or-two', ['phrase-one-or-two', 'phrase-week-or-two', 'phrase-more-or-less', 'phrase-little-or-no']] },
    { read: ['Of omitted', 'Manual §189, p. 104', [
      'Some of them, I am of the opinion.'
    ], ['phrase-some-of-them', 'phrase-i-am-of-the-opinion']] },
    { write: 'phrase-some-of-them' },
    { write: 'phrase-i-am-of-the-opinion' },
    { choose: ['phrase-some-of-them', ['phrase-some-of-them', 'phrase-i-am-of-the-opinion', 'phrase-on-the-question', 'phrase-in-the-matter']] },
    { read: ['The and a omitted', 'Manual §189, p. 104', [
      'In a week or two, on the question, in the matter.'
    ], ['phrase-in-a-week-or-two', 'phrase-on-the-question', 'phrase-in-the-matter']] },
    { write: 'phrase-in-a-week-or-two' },
    { write: 'phrase-on-the-question' },
    { write: 'phrase-in-the-matter' },
    { choose: ['phrase-in-the-matter', ['phrase-in-the-matter', 'phrase-on-the-question', 'phrase-some-of-them', 'phrase-i-am-of-the-opinion']] },
    { read: ['Repetition', 'Manual §189, p. 105', [
      'More and more keeps and (nd).'
    ], ['phrase-more-and-more']] },
    { write: 'phrase-more-and-more' },
    { choose: ['phrase-more-and-more', ['phrase-more-and-more', 'phrase-more-or-less', 'phrase-in-a-week-or-two', 'phrase-little-or-no']] },
  ],
};
