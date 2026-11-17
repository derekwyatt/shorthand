// Manual Unit 23 (pp. 100–103): omission of d; ul, al, sub, less. Transcribed in reference/manual-unit23.md.
export default {
  unit: 23,
  subtitle: 'Omission of d; ul, al, sub, less',
  pages: 'pp. 100–103',
  level: { name: 'Omission of d; ul, al, sub, less', description: 'The d omitted in many words, before m or v and after n, and the syllables ul, al, sub and less (Manual §178–185)' },
  rules: {
    R178: '“When slightly enunciated, d is often omitted” (Manual §178).',
    R179: '“The d is written in the following words”: commend, contend, attend (Manual §179).',
    R180: '“D is omitted when it immediately precedes m or v” (Manual §180).',
    R181: '“In the words admire, advice, advise, advance, coming under this rule, the initial vowel also is omitted to facilitate phrasing”: we admire, in advance, we advise (Manual §181).',
    R182: '“Where the last letter of a primitive form is omitted, the past tense is indicated by a disjoined t” (Manual §182).',
    R183: '“The syllable ul is expressed by the oo-hook; al (pronounced aw-l), by the o-hook”; “Sub is expressed by a joined s; less, by l” (Manual §183).',
    R185: '“When sub is followed by a circle vowel, s is disjoined and placed on the line close to the following character” (Manual §185).',
  },
  words: [
    ['remind', ['r', 'e', 'm', 'i', 'n'], 'R178', 100],
    ['command', ['k', 'm', 'a', 'n'], 'R178', 100],
    ['demand', ['tem', 'a', 'n'], 'R178', 100],
    ['diamond', ['d', 'i', 'men'], 'R178', 100],
    ['intend', ['n', 'ten'], 'R178', 100],
    ['extends', ['e', 's-right', 'ten', 's-left'], 'R178', 100],
    ['compound', ['k', 'p', 'n'], 'R178', 100],
    ['compounds', ['k', 'p', 'n', 's-left'], 'R178', 100],
    ['commend', ['k', 'men', 'd'], 'R179', 100],
    ['contend', ['k', 'ten', 'd'], 'R179', 100],
    ['attend', ['a', 'ten', 'd'], 'R179', 100],
    ['admit', ['a', 'm', 'e', 't'], 'R180', 100],
    ['admitted', ['a', 'm', 'e', 'ted'], 'R180', 100],
    ['admonish', ['a', 'men', 'sh'], 'R180', 100],
    ['advance', ['v', 'a', 'n', 's-left'], 'R180', 100],
    ['advise', ['v', 'i', 's-right'], 'R180', 100],
    ['subway', ['s-right', 'u', 'a'], 'R183', 101],
    ['submit', ['s-right', 'm', 'e', 't'], 'R183', 101],
    ['almanac', ['o', 'men', 'a', 'k'], 'R183', 101],
    ['thoughtless', ['th-over', 'o', 't', 'l'], 'R183', 101],
    ['homeless', ['h', 'o', 'm', 'l'], 'R183', 101],
    ['needless', ['n', 'e', 'd', 'l'], 'R183', 101],
  ],
  brief: [],
  phrases: [
    ['we admire', ['u', 'e', 'm', 'i'], 101],
    ['in advance', ['n', 'v', 'a', 'n', 's-left'], 101],
  ],
  lesson: [
    { read: ['d omitted', 'Manual §178, p. 100', [
      '“When slightly enunciated, d is often omitted”.',
      'Remind, command, demand, diamond, intend.'
    ], ['word-remind', 'word-command', 'word-demand', 'word-diamond', 'word-intend']] },
    { write: 'word-remind' },
    { write: 'word-command' },
    { write: 'word-demand' },
    { write: 'word-diamond' },
    { choose: ['word-demand', ['word-demand', 'word-diamond', 'word-intend', 'word-command']] },
    { read: ['d omitted: more', 'Manual §178, p. 100', [
      'Extends, compound, compounds.'
    ], ['word-extends', 'word-compound', 'word-compounds']] },
    { write: 'word-extends' },
    { write: 'word-compound' },
    { write: 'word-compounds' },
    { choose: ['word-compound', ['word-compound', 'word-compounds', 'word-extends', 'word-remind']] },
    { read: ['d is written', 'Manual §179, p. 100', [
      '“The d is written in the following words”:',
      'Commend, contend, attend.'
    ], ['word-commend', 'word-contend', 'word-attend']] },
    { write: 'word-commend' },
    { write: 'word-contend' },
    { write: 'word-attend' },
    { choose: ['word-attend', ['word-attend', 'word-commend', 'word-contend', 'word-intend']] },
    { read: ['d before m or v', 'Manual §180, p. 100', [
      '“D is omitted when it immediately precedes m or v”.',
      'Admit, admitted, admonish, advance, advise.'
    ], ['word-admit', 'word-admitted', 'word-admonish', 'word-advance', 'word-advise']] },
    { write: 'word-admit' },
    { write: 'word-admitted' },
    { write: 'word-advance' },
    { write: 'word-advise' },
    { choose: ['word-advance', ['word-advance', 'word-admit', 'word-admonish', 'word-advise']] },
    { read: ['sub and al', 'Manual §183, p. 101', [
      '“The syllable ul is expressed by the oo-hook; al (pronounced aw-l), by the o-hook”.',
      '“Sub is expressed by a joined s; less, by l”.',
      'Subway, submit, almanac.'
    ], ['word-subway', 'word-submit', 'word-almanac']] },
    { write: 'word-subway' },
    { write: 'word-submit' },
    { write: 'word-almanac' },
    { choose: ['word-submit', ['word-submit', 'word-subway', 'word-almanac', 'word-command']] },
    { read: ['less', 'Manual §183, p. 101', [
      'Thoughtless, homeless, needless.'
    ], ['word-thoughtless', 'word-homeless', 'word-needless']] },
    { write: 'word-thoughtless' },
    { write: 'word-homeless' },
    { write: 'word-needless' },
    { choose: ['word-homeless', ['word-homeless', 'word-needless', 'word-thoughtless', 'word-subway']] },
    { read: ['Disjoined t for the past tense', 'Manual §182, p. 101', [
      '“Where the last letter of a primitive form is omitted, the past tense is indicated by a disjoined t, thus:”',
      'Contested, insisted, extended, requested, demanded, compounded.'
    ], [], []] },
    { read: ['Disjoined s for sub', 'Manual §185, p. 101', [
      '“When sub is followed by a circle vowel, s is disjoined and placed on the line close to the following character, thus:”',
      'Subeditor, subhead.'
    ], [], []] },
    { read: ['Phrases with admire, advance', 'Manual §181, p. 101', [
      '“In the words admire, advice, advise, advance, coming under this rule, the initial vowel also is omitted to facilitate phrasing, as illustrated in the following useful phrases:”',
      'We admire, in advance.'
    ], ['phrase-we-admire', 'phrase-in-advance']] },
    { write: 'phrase-we-admire' },
    { write: 'phrase-in-advance' },
    { choose: ['phrase-in-advance', ['phrase-in-advance', 'phrase-we-admire', 'word-advance', 'word-admit']] },
  ],
};
