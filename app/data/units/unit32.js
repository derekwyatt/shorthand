// Manual Unit 32 (pp. 137–140): analogical word-endings, disjoined. Transcribed in reference/manual-unit32.md.
export default {
  unit: 32,
  subtitle: 'Analogical word-endings, disjoined',
  pages: 'pp. 137–140',
  level: { name: 'Disjoined word-endings', description: 'Disjoined endings written as their own stroke under the end of the word, as in -lity, -rity and -ship, and the joined -ward words (Manual §230)' },
  rules: {
    R230: '“In most of the disjoined word-endings the vowel preceding the ending is understood, as in art(i)cle, barn(a)cle, dom(e)stic, cal(a)mity, extr(e)mity, auth(o)rity, sec(u)rity”. The footnote to -ward: “In the words forward, afterward, upward, backward the suffix is joined; in other words, it is disjoined.” (Manual §230).',
  },
  words: [
    ['locality', ['l', 'o', 'k', '_', 'l'], 'R230', 137],
    ['formality', ['f', 'm', '_', 'l'], 'R230', 137],
    ['security', ['s-right', 'e', 'k', '_', 'r'], 'R230', 137],
    ['popularity', ['p', 'o', 'p', '_', 'r'], 'R230', 137],
    ['township', ['t', 'n', '_', 'sh'], 'R230', 138],
    ['forward', ['f', 'd'], 'R230', 138],
    ['afterward', ['a', 'f', 'd'], 'R230', 138],
  ],
  brief: [],
  phrases: [],
  lesson: [
    { read: ['Analogical word-endings, disjoined', 'Manual §230, p. 137', [
      '“In most of the disjoined word-endings the vowel preceding the ending is understood, as in art(i)cle, barn(a)cle, dom(e)stic, cal(a)mity, extr(e)mity, auth(o)rity, sec(u)rity”',
      'The ending is written apart, as its own stroke, just under the end of the word.',
      'Locality, security, township, forward.'
    ], ['word-locality', 'word-security', 'word-township', 'word-forward']] },
    { read: ['Words ending -lity and -rity', 'Manual §230, p. 137', [
      '-lity and -rity: the l or r is a separate stroke written just under the end of the word.',
      'Write the base word first (local, secure, popular), then lift the pen and add the ending.',
      'Locality, formality, security, popularity.'
    ], ['word-locality', 'word-formality', 'word-security', 'word-popularity']] },
    { write: 'word-local' },
    { write: 'word-locality' },
    { write: 'word-formality' },
    { write: 'word-secure' },
    { write: 'word-security' },
    { write: 'word-popular' },
    { write: 'word-popularity' },
    { choose: ['word-locality', ['word-locality', 'word-formality', 'word-security', 'word-popularity']] },
    { choose: ['word-popularity', ['word-popularity', 'word-locality', 'word-formality', 'word-security']] },
    { read: ['Words ending -ship', 'Manual §230, p. 138', [
      '-ship: the sh is a separate stroke written under the end of the word.',
      'Township.'
    ], ['word-township']] },
    { write: 'word-town' },
    { write: 'word-township' },
    { choose: ['word-township', ['word-township', 'word-locality', 'word-formality', 'word-security']] },
    { read: ['Words ending -ward, joined', 'Manual §230, p. 138', [
      '“In the words forward, afterward, upward, backward the suffix is joined; in other words, it is disjoined.”',
      'Forward, afterward: the -ward sign is an upward d joined to the word.'
    ], ['word-forward', 'word-afterward']] },
    { write: 'word-forward' },
    { write: 'word-afterward' },
    { choose: ['word-afterward', ['word-afterward', 'word-forward', 'word-township', 'word-security']] },
  ],
};
