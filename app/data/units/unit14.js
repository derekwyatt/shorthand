// Manual Unit 14 (pp. 65–67): other vowel combinations, omission of minor vowels. Transcribed in reference/manual-unit14.md.
export default {
  unit: 14,
  subtitle: 'Vowel combinations',
  pages: 'pp. 65–67',
  level: { name: 'Vowel combinations', description: 'Omission of minor vowels, the ū circle dropped before a stroke, and brief forms (Manual §121–122)' },
  rules: {
    R118: '“In a few words, vowels follow one another consecutively without forming diphthongs, as in poem, radio, showy. In such words the signs for the sounds are written in the order in which the sounds occur.” (Manual §118).',
    R121: '“When two vowels not forming a pure diphthong come together, the minor vowel may be omitted. For convenience in writing many common words, the circle may be omitted in the diphthong u, as in new, due, music.” (Manual §121).',
    R122: 'Brief forms for common words: dollar, please, object, progress, opportunity, various, enclose, address, wonder (Manual §122).',
  },
  words: [
    ['theory', ['th-over', 'e', 'r', 'e'], 'R121', 66],
    ['idea', ['a', 'd', 'e'], 'R121', 66, 'The long i is the large circle; the a of idea is a minor vowel and is omitted.'],
    ['ideal', ['a', 'd', 'e', 'l'], 'R121', 66],
    ['genuine', ['j', 'e', 'n', 'u', 'n'], 'R121', 66],
    ['renew', ['r', 'e', 'n', 'u'], 'R121', 66],
    ['new', ['n', 'u'], 'R121', 66],
    ['avenue', ['a', 'v', 'n', 'u'], 'R121', 66],
    ['renewal', ['r', 'e', 'n', 'u', 'l'], 'R121', 66],
  ],
  brief: [
    ['dollar', ['d', 'o', 'l'], 66],
    ['please', ['p', 'l'], 66],
    ['object', ['o', 'b'], 66],
    ['progress', ['p', 'r', 'g'], 66],
    ['opportunity', ['o', 'p'], 66],
    ['various', ['v', 'a', 'r', 's-left'], 66],
    ['enclose', ['n', 'k'], 66],
    ['address', ['a', 'd', 'r'], 66],
    ['wonder', ['u', 'nd'], 66],
  ],
  lesson: [
    { read: ['Vowels in sequence', 'Manual §118, p. 65', [
      '“In a few words, vowels follow one another consecutively without forming diphthongs, as in poem, radio, showy. In such words the signs for the sounds are written in the order in which the sounds occur.”'
    ], [], []] },
    { read: ['A vowel after the diphthong i', 'Manual §119–120, p. 65', [
      '“Any vowel following the diphthong i is expressed by a small circle within the large circle.”',
      '“Short i followed by a, as in mania, is expressed by a large circle with a dot placed within it; e followed by the large circle vowel, as in create, is expressed by a large circle with a dash within it. These distinctions are seldom necessary, however.”'
    ], [], []] },
    { read: ['Omission of minor vowels', 'Manual §121, p. 66', [
      '“When two vowels not forming a pure diphthong come together, the minor vowel may be omitted.”',
      'So theory, genuine and renewal are written with the vowels that carry the sound and without the minor one.'
    ], ['word-theory', 'word-genuine', 'word-renewal']] },
    { read: ['Idea and ideal', 'Manual §121, p. 66', [
      '“The long i in idea and ideal is expressed by the large circle.”'
    ], ['word-idea', 'word-ideal']] },
    { write: 'word-idea' },
    { write: 'word-ideal' },
    { write: 'word-theory' },
    { choose: ['word-ideal', ['word-theory', 'word-idea', 'word-ideal', 'word-genuine']] },
    { read: ['The ū circle dropped', 'Manual §121, p. 66', [
      '“For convenience in writing many common words, the circle may be omitted in the diphthong u, as in new, due, music.”',
      'The oo hook alone stands for ū: new, renew, genuine, avenue, renewal.'
    ], ['word-new', 'word-renew', 'word-genuine', 'word-avenue', 'word-renewal']] },
    { write: 'word-new' },
    { write: 'word-renew' },
    { write: 'word-genuine' },
    { write: 'word-avenue' },
    { write: 'word-renewal' },
    { choose: ['word-avenue', ['word-new', 'word-renew', 'word-avenue', 'word-renewal']] },
    { read: ['Brief forms', 'Manual §122, p. 66', [
      'Brief forms for common words: dollar, please, object, progress, opportunity.'
    ], ['brief-dollar', 'brief-please', 'brief-object', 'brief-progress', 'brief-opportunity']] },
    { write: 'brief-dollar' },
    { write: 'brief-please' },
    { write: 'brief-object' },
    { write: 'brief-progress' },
    { write: 'brief-opportunity' },
    { choose: ['brief-object', ['brief-dollar', 'brief-please', 'brief-object', 'brief-progress']] },
    { read: ['More brief forms', 'Manual §122, p. 66', [
      'And various, enclose, address, wonder.'
    ], ['brief-various', 'brief-enclose', 'brief-address', 'brief-wonder']] },
    { write: 'brief-various' },
    { write: 'brief-enclose' },
    { write: 'brief-address' },
    { write: 'brief-wonder' },
    { choose: ['brief-address', ['brief-various', 'brief-enclose', 'brief-address', 'brief-wonder']] },
  ],
};
