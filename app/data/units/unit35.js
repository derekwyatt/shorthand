// Manual Unit 35 (pp. 151–154): name terminations; "State of". Transcribed in reference/manual-unit35.md.
export default {
  unit: 35,
  subtitle: 'Name terminations; "State of"',
  pages: 'pp. 151–154',
  level: { name: 'Name endings; State of', description: 'Name terminations such as port, ford and ham, and the words State of joined to the name of a state (Manual §241, §243)' },
  rules: {
    R241: '“The terminations burg, ville, field, port may generally be expressed by the first letter, joined or disjoined as convenient; ford, by fd; ington, by a disjoined tn; and ingham, by a disjoined m” (Manual §241).',
    R243: '“When the words ‘State of’ precede the name of a state, omit of and join the words, if convenient” (Manual §243).',
  },
  words: [
    ['Newport', ['n', 'u', '_', 'p'], 'R241', 151],
    ['Rockford', ['r', 'o', 'k', 'f', 'd'], 'R241', 151],
    ['Milford', ['m', 'e', 'l', 'f', 'd'], 'R241', 151],
    ['Birmingham', ['b', 'e', 'r', '_', 'm'], 'R241', 151],
  ],
  brief: [],
  phrases: [
    ['State of Pa.', ['s-right', 't', 'p', 'a'], 152],
    ['State of La.', ['s-right', 't', 'l', 'a'], 152],
    ['State of Ga.', ['s-right', 't', 'j', 'a'], 152],
    ['State of Minn.', ['s-right', 't', 'm', 'n'], 152],
  ],
  lesson: [
    { read: ['Name terminations', 'Manual §241, p. 151', [
      '“The terminations burg, ville, field, port may generally be expressed by the first letter, joined or disjoined as convenient; ford, by fd; ington, by a disjoined tn; and ingham, by a disjoined m”',
      'The ending is cut down to its first letter, or to a short sign for ford, ington and ingham.',
      'Newport, Rockford, Milford, Birmingham.'
    ], ['word-newport', 'word-rockford', 'word-milford', 'word-birmingham']] },
    { read: ['Names ending -port', 'Manual §241, p. 151', [
      'port is expressed by its first letter, p, written as a separate stroke under the end of the word.',
      'Newport.'
    ], ['word-newport']] },
    { write: ['word-newport', 'Write “Newport”.'] },
    { choose: ['word-newport', ['word-newport', 'word-rockford', 'word-milford', 'word-birmingham']] },
    { read: ['Names ending -ford', 'Manual §241, p. 151', [
      'ford is expressed by fd, joined to the name.',
      'Rockford, Milford.'
    ], ['word-rockford', 'word-milford']] },
    { write: ['word-rockford', 'Write “Rockford”.'] },
    { write: ['word-milford', 'Write “Milford”.'] },
    { choose: ['word-milford', ['word-milford', 'word-rockford', 'word-newport', 'word-birmingham']] },
    { read: ['Names ending -ham', 'Manual §241, p. 151', [
      'ingham is expressed by a disjoined m, written under the end of the name.',
      'Birmingham.'
    ], ['word-birmingham']] },
    { write: ['word-birmingham', 'Write “Birmingham”.'] },
    { read: ["Cities and states joined", "Manual §242, p. 152", [
      "“The names of cities and states often may be joined”: Buffalo, N. Y.; St. Paul, Minn.; Boston, Mass.; Chicago, Ill.; and more in the table below.",
      "The app cannot draw or score these outlines yet, so there is no writing practice for them here: study the forms in the Manual below and copy them on the pad.",
    ], []], manual: [242, 242] },
    { read: ['State of', 'Manual §243, p. 152', [
      'When the words State of precede the name of a state, “omit of and join the words, if convenient”',
      'State is its brief form, and the name of the state is joined to its t.',
      'State of Pa., State of La., State of Ga., State of Minn.'
    ], ['phrase-state-of-pa', 'phrase-state-of-la', 'phrase-state-of-ga', 'phrase-state-of-minn']] },
    { write: ['brief-state', 'Write the brief form for “state”.'] },
    { write: ['word-md', 'Write the abbreviation for “Md.”.'] },
    { write: ['word-mich', 'Write the abbreviation for “Mich.”.'] },
    { write: ['word-mo', 'Write the abbreviation for “Mo.”.'] },
    { write: ['word-del', 'Write the abbreviation for “Del.”.'] },
    { write: ['phrase-state-of-pa', 'Write “State of Pa.”.'] },
    { write: ['phrase-state-of-la', 'Write “State of La.”.'] },
    { write: ['phrase-state-of-ga', 'Write “State of Ga.”.'] },
    { write: ['phrase-state-of-minn', 'Write “State of Minn.”.'] },
    { choose: ['phrase-state-of-pa', ['phrase-state-of-pa', 'phrase-state-of-la', 'phrase-state-of-ga', 'phrase-state-of-minn']] },
    { choose: ['phrase-state-of-minn', ['phrase-state-of-minn', 'phrase-state-of-pa', 'phrase-state-of-la', 'phrase-state-of-ga']] },
    { read: ["Canadian provinces and cities", "Manual §244, p. 153", [
      "The Manual’s forms for the Canadian provinces and principal cities, including Newfoundland and Labrador.",
      "The app cannot draw or score these outlines yet, so there is no writing practice for them here: study the forms in the Manual below and copy them on the pad.",
    ], []], manual: [244, 244] },
  ],
};
