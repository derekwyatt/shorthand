// Manual Unit 21 (pp. 93–94): common prefixes and suffixes, and phrasing principles. Transcribed in reference/manual-unit21.md.
export default {
  unit: 21,
  subtitle: 'Prefixes, suffixes and phrasing',
  pages: 'pp. 93–94',
  level: { name: 'Prefixes and suffixes', description: 'The prefixes and suffixes f, self, selves and age, and the phrasing principles for him, hope, want and sure (Manual §170–171)' },
  rules: {
    R170: '“The prefixes for, fore, fur are expressed by f. The suffixes ful and ify are expressed by f; self by s; selves by ses; and age by j”; the syllable ture is written tr, and the vowel in baggage is omitted to distinguish it from package (Manual §170).',
    R171: '“In phrases, the words ago, early, few, him, hope, sorry, want, sure, possible, are modified as shown below” (Manual §171).',
  },
  words: [
    ['forget', ['f', 'g', 'e', 't'], 'R170', 93],
    ['furnish', ['f', 'n', 'sh'], 'R170', 93],
    ['wonderful', ['u', 'nd', 'f'], 'R170', 93],
    ['useful', ['e', 'u', 'f'], 'R170', 93],
    ['himself', ['h', 'e', 'm', 's-left'], 'R170', 93],
    ['herself', ['h', 'e', 'r', 's-left'], 'R170', 93],
    ['itself', ['t', 's-left'], 'R170', 93],
    ['themselves', ['th-over', 'm', 's-left', 's-right'], 'R170', 93],
    ['ourselves', ['r', 's-left', 's-right'], 'R170', 93],
    ['yourselves', ['u', 's-right', 's-left'], 'R170', 93],
    ['courage', ['k', 'r', 'j'], 'R170', 93],
    ['baggage', ['b', 'g', 'j'], 'R170', 93],
    ['package', ['p', 'a', 'k', 'j'], 'R170', 93],
  ],
  brief: [],
  phrases: [
    ['to him', ['t', 'm'], 94],
    ['I told him', ['i', 't', 'm'], 94],
    ['we told him', ['u', 'e', 't', 'm'], 94],
    ['I hope', ['i', 'p'], 94],
    ['I want', ['i', 'nd'], 94],
    ['we want', ['u', 'e', 'nd'], 94],
    ['if you want', ['f', 'u', 'nd'], 94],
    ['do you want', ['d', 'u', 'nd'], 94],
    ['be sure', ['b', 'sh'], 94],
    ['we are sure', ['u', 'e', 'r', 'sh'], 94],
    ['I am sure', ['i', 'm', 'sh'], 94],
  ],
  lesson: [
    { read: ['The prefix and suffix f', 'Manual §170, p. 93', [
      '“The prefixes for, fore, fur are expressed by f. The suffixes ful and ify are expressed by f.”',
      'Forget, furnish, wonderful, useful.'
    ], ['word-forget', 'word-furnish', 'word-wonderful', 'word-useful']] },
    { write: 'word-forget' },
    { write: 'word-furnish' },
    { write: 'word-wonderful' },
    { write: 'word-useful' },
    { choose: ['word-wonderful', ['word-forget', 'word-furnish', 'word-wonderful', 'word-useful']] },
    { read: ['The suffix self', 'Manual §170, p. 93', [
      '“Self [is expressed] by s.”',
      'Himself, herself, itself.'
    ], ['word-himself', 'word-herself', 'word-itself']] },
    { write: 'word-himself' },
    { write: 'word-herself' },
    { write: 'word-itself' },
    { choose: ['word-herself', ['word-himself', 'word-herself', 'word-itself', 'word-ourselves']] },
    { read: ['The suffix selves', 'Manual §170, p. 93', [
      '“Selves [is expressed] by ses.”',
      'Themselves, ourselves, yourselves.'
    ], ['word-themselves', 'word-ourselves', 'word-yourselves']] },
    { write: 'word-themselves' },
    { write: 'word-ourselves' },
    { write: 'word-yourselves' },
    { choose: ['word-ourselves', ['word-themselves', 'word-ourselves', 'word-yourselves', 'word-himself']] },
    { read: ['The suffix age', 'Manual §170, p. 93', [
      '“Age [is expressed] by j.” “The vowel in baggage is omitted to distinguish the form from package.”',
      'Courage, baggage, package.'
    ], ['word-courage', 'word-baggage', 'word-package']] },
    { write: 'word-courage' },
    { write: 'word-baggage' },
    { write: 'word-package' },
    { choose: ['word-package', ['word-courage', 'word-baggage', 'word-package', 'word-forget']] },
    { read: ['Phrasing with him', 'Manual §171, p. 94', [
      '“In phrases, the words ago, early, few, him, hope, sorry, want, sure, possible, are modified as shown below.”',
      'To him, I told him, we told him, I hope.'
    ], ['phrase-to-him', 'phrase-i-told-him', 'phrase-we-told-him', 'phrase-i-hope']] },
    { write: 'phrase-to-him' },
    { write: 'phrase-i-told-him' },
    { write: 'phrase-we-told-him' },
    { write: 'phrase-i-hope' },
    { choose: ['phrase-i-told-him', ['phrase-to-him', 'phrase-i-told-him', 'phrase-we-told-him', 'phrase-i-hope']] },
    { read: ['Phrasing with want', 'Manual §171, p. 94', [
      'I want, we want, if you want, do you want.'
    ], ['phrase-i-want', 'phrase-we-want', 'phrase-if-you-want', 'phrase-do-you-want']] },
    { write: 'phrase-i-want' },
    { write: 'phrase-we-want' },
    { write: 'phrase-if-you-want' },
    { write: 'phrase-do-you-want' },
    { choose: ['phrase-we-want', ['phrase-i-want', 'phrase-we-want', 'phrase-if-you-want', 'phrase-do-you-want']] },
    { read: ['Phrasing with sure', 'Manual §171, p. 94', [
      'Be sure, we are sure, I am sure.'
    ], ['phrase-be-sure', 'phrase-we-are-sure', 'phrase-i-am-sure']] },
    { write: 'phrase-be-sure' },
    { write: 'phrase-we-are-sure' },
    { write: 'phrase-i-am-sure' },
    { choose: ['phrase-i-am-sure', ['phrase-be-sure', 'phrase-we-are-sure', 'phrase-i-am-sure', 'phrase-i-want']] },
  ],
};
