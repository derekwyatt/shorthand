// Outlines written by sound: for a word the app has no printed outline for, the outline the
// Manual's rules give it, using only the rules taught by a given unit. The pronunciation comes
// from the CMU Pronouncing Dictionary (data/sounds.js); the vowels are read with the spelling,
// since the dictionary does not tell the ŏ of "rot" from the ä of "calm" (§65).
//
// soundOutline(word, unit) returns { outline, rules: [[text, [§a, §b]]] } or null when a sound or
// joining in the word is not covered here, or needs a rule taught after `unit`. Every outline is
// a derivation, not a form printed in the Manual: tests/bysound.test.mjs measures the rules
// against the words the Manual prints (data/examples.js), and the window says which it is.
//
// What is covered, with the unit that teaches it:
//   1  the strokes k g r l n m t d th, the a and e circles, h, the ing dot (§3)
//   3  the ted and men blends (§26, §27)          4  p b f v sh ch j
//   5  s, chosen by §49 and §51; ses (§52)          6  x (§57), shun (§58)
//   7  the o hook (§65)                             8  the r circle (§71, §72, §74)
//   9  th by §78; con, com (§80, §81); ly (§80)      10 the oo hook (§91), us (§93)
//   11 w (§97–100)                                  12 y (§104), ng, nk (§105), en in un em im ex (§106)
//   13 the diphthongs ū ow oi ī (§112)              14 minor vowels omitted (§121)
//   15 short u and ow omitted (§124); per pro pur, ble, ment (§127); sume (§126)
//   16 the nt-nd, mt-md and ld blends (§133–136)   17 jent-pent and def-tive (§140)
//   18 be de re dis mis (§145–147)                  19 ten-den and tem-dem (§153–156)
//   20 tern, dern (§166), ther (§168)               21 for fore fur, ful, self, age, ture (§170)
//   22 final t omitted (§174–176)                   23 d omitted (§178), sub, less (§183)
// Left out: the r omitted in "many words" (§165) and the other choices the Manual makes word by
// word. From Unit 25 the Manual abbreviates long words (§192–196): a word of more than two
// syllables is not written in full here after Unit 24.
import { SOUNDS } from '../data/sounds.js';
import { compileOutline } from './join.js';

const VOWEL = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)$/;
const LONG = new Set(['IY', 'EY', 'AY', 'OW', 'UW', 'AW', 'OY', 'AO']);
const CONSONANT = {
  K: 'k', G: 'g', R: 'r', L: 'l', N: 'n', M: 'm', T: 't', D: 'd', TH: 'th', DH: 'th',
  P: 'p', B: 'b', F: 'f', V: 'v', SH: 'sh', ZH: 'sh', CH: 'ch', JH: 'j', S: 's', Z: 's', NG: 'ng',
};
// The unit that first teaches each stroke.
const STROKE_UNIT = { p: 4, b: 4, f: 4, v: 4, sh: 4, ch: 4, j: 4, s: 5, ng: 12, nk: 12, ted: 3, men: 3, nd: 16, md: 16, ld: 16, jnt: 17, def: 17, ten: 19, tem: 19, o: 7, u: 10, i: 13 };
const STRAIGHT = new Set(['n', 'm', 't', 'd', 'sh', 'ch', 'j', 'men', 'ted', 'ng', 'nk']);
const UPWARD = new Set(['t', 'd', 'ted', 'ten', 'tem', 'nd', 'md', 'th']);
const CIRCLES = new Set(['a', 'e', 'i', 'a-rev', 'e-rev']);

const parse = (s) => s.split(' ').filter(Boolean).map((x) => {
  const m = /^([A-Z]+)(\d)?$/.exec(x);
  return { p: m[1], stress: m[2] === undefined ? null : Number(m[2]) };
});
const syllables = (phones) => (phones.match(/\d/g) ?? []).length;

// The spelling's vowel groups, one per vowel sound when they line up: "rot" → ["o"].
function vowelLetters(word, count) {
  const w = word.replace(/^y(?=[aeiou])/, '_');
  const groups = w.match(/[aeiou]+[wy]?(?![aeiou])|y(?![aeiou])/g) ?? [];
  // A final silent e (made, table) is not a vowel group of its own.
  if (groups.length === count + 1 && /[^aeiou]e$/.test(w)) groups.pop();
  return groups.length === count ? groups : Array(count).fill(null);
}

// The sounds of the word: consonants { c } and vowels { v, stress, p }. v is a, e, o, u, i (ī),
// ow, oi, yu (ū), er (an r-coloured vowel, written e) or ur (spelled with u: the oo hook).
function sounds(word, phones, afterPrefix = false) {
  const letters = vowelLetters(word, phones.filter((x) => VOWEL.test(x.p)).length);
  let k = 0;
  const out = [];
  phones.forEach((x, i) => {
    if (!VOWEL.test(x.p)) {
      if (x.p === 'HH' || x.p === 'W' || x.p === 'Y') out.push({ c: x.p.toLowerCase() });
      else out.push({ c: CONSONANT[x.p] ?? '?', p: x.p });
      return;
    }
    const letter = letters[k++];
    const has = (ch) => letter?.includes(ch) ?? false;
    let v;
    switch (x.p) {
      case 'AE': case 'EY': v = 'a'; break;
      // The dictionary's AA is both ŏ (rot, the o hook) and ä (calm, a circle); aw, au and a
      // after w (raw, caught, watch) are the aw of the o hook.
      case 'AA':
        if (letter === null) v = /o/.test(word) && !/a/.test(word) ? 'o' : 'a';
        else v = (has('o') && !has('a')) || /aw|au/.test(letter) || (letter === 'a' && phones[i - 1]?.p === 'W') ? 'o' : 'a';
        break;
      case 'AO': case 'OW': v = 'o'; break;
      case 'UH': case 'UW': v = 'u'; break;
      case 'AY': v = 'i'; break;
      case 'AW': v = 'ow'; break;
      case 'OY': v = 'oi'; break;
      case 'IH': case 'IY': v = 'e'; break;
      case 'ER':
        // around, arrive: the dictionary's ER0 is a, then r
        if (x.stress === 0 && letter === 'a' && i === 0) { out.push({ v: 'a', stress: 0, p: 'AH' }, { c: 'r', p: 'R' }); return; }
        v = letter === 'u' ? 'ur' : 'er';
        break;
      // air, care, bear: the a circle
      case 'EH': v = phones[i + 1]?.p === 'R' && has('a') ? 'a' : 'e'; break;
      case 'AH':
        if (x.stress === 1) v = 'u';
        else if (!letter) v = 'e';
        else if (i === 0 && !afterPrefix) v = has('a') ? 'a' : has('o') ? 'o' : has('u') ? 'u' : 'e';
        else v = has('a') ? 'a' : has('u') ? 'ŭ' : 'e';
        break;
      default: v = '?';
    }
    if (v === 'u' && out.at(-1)?.c === 'y' && out.length > 1) { out.pop(); v = 'yu'; }
    out.push({ v, stress: x.stress, p: x.p });
  });
  return out;
}

const isV = (s) => s && 'v' in s;
const isC = (s) => s && 'c' in s;
// A vowel a blend may take in: unaccented, or short and not r-coloured.
const light = (s) => isV(s) && !['er', 'ur'].includes(s.v) && (s.stress === 0 || !LONG.has(s.p));

// Prefixes, tried at the start of the word: spelling, sounds, what is written, unit, §. A
// prefix is only taken when a vowel follows somewhere in the rest of the word.
const REST = '(?=[A-Z]+ .*\\d)(?![A-Z]*\\d)'; // a consonant follows
const PREFIXES = [
  { spell: /^(?:comm|conn)/, re: /^K (?:AH|AA)\d (M|N) (?=[A-Z]+\d)/, out: (m) => ['k', m[1] === 'M' ? 'm' : 'n'], unit: 9, ref: [81, 81], text: 'comm and conn: k with the second m or n' },
  { spell: /^co[nm]/, re: /^K (?:AH|AA)\d (N|M) (?=[A-Z]+\d|[RL] )/, out: (m) => ['k', m[1] === 'M' ? 'm' : 'n'], unit: 9, ref: [81, 81], text: 'con and com before a vowel, r or l: kn and km' },
  { spell: /^co(?:n|m|un)/, re: new RegExp(`^K (?:AH|AA|AW)\\d (?:N|M) (?!R |L )${REST}`), out: () => ['k'], unit: 9, ref: [80, 80], text: 'con, com, coun before a consonant: k' },
  { spell: /^(?:en|in|un)/, re: new RegExp(`^(?:EH|IH|AH)\\d N (?!N )${REST}`), out: () => ['n'], unit: 12, ref: [106, 106], text: 'en, in, un before a consonant: the vowel is omitted' },
  { spell: /^(?:em|im)/, re: new RegExp(`^(?:EH|IH)\\d M (?!M )${REST}`), out: () => ['m'], unit: 12, ref: [106, 106], text: 'em, im before a consonant: the vowel is omitted' },
  { spell: /^ex/, re: /^(?:EH|IH|AH)\d (?:K S|G Z) /, out: () => ['e', 's'], unit: 12, ref: [106, 106], text: 'ex is written es' },
  { spell: /^p(?:er|ur)/, re: /^P ER\d (?=.*\d)/, out: () => ['p', 'r'], unit: 15, ref: [127, 127], text: 'per, pur: pr' },
  { spell: /^pro/, re: new RegExp(`^P R (?:AH|AA|OW)\\d (?!R |L )${REST}`), out: (m, next) => (UPWARD.has(next) || next === 'k' ? ['p', 'r', 'o'] : ['p', 'r']), unit: 15, ref: [127, 128], text: 'pro: pr (with the o before an upward stroke or k)' },
  { spell: /^be/, re: new RegExp(`^B (?:IH|IY|AH)0 ${REST}`), out: () => ['b'], unit: 18, ref: [145, 145], text: 'be: the vowel is omitted' },
  { spell: /^de/, re: new RegExp(`^D (?:IH|IY|AH)0 (?!K |G |T |D |N |M |F |V )${REST}`), out: () => ['d'], unit: 18, ref: [145, 146], text: 'de: the vowel is omitted' },
  { spell: /^re/, re: /^R (?:IH|IY|AH)[02] (?=(?:P|B|F|V|SH|CH|JH|S|Z) .*\d)/, out: () => ['r'], unit: 18, ref: [145, 147], text: 're before a downstroke: the vowel is omitted' },
  { spell: /^dis/, re: new RegExp(`^D IH\\d S ${REST}`), out: () => ['d', 's-left'], unit: 18, ref: [145, 145], text: 'dis: the vowel is omitted' },
  { spell: /^mis/, re: new RegExp(`^M IH\\d S ${REST}`), out: () => ['m', 's-left'], unit: 18, ref: [145, 145], text: 'mis: the vowel is omitted' },
  { spell: /^f(?:or|ur)/, re: new RegExp(`^F (?:AO\\d R|ER\\d) ${REST}`), out: () => ['f'], unit: 21, ref: [170, 170], text: 'for, fore, fur: f' },
  { spell: /^sub/, re: new RegExp(`^S AH\\d B ${REST}`), out: () => ['s'], unit: 23, ref: [183, 183], text: 'sub: s' },
];

// Suffixes, tried at the end: spelling, sounds, what is written, unit, §.
const SUFFIXES = [
  { spell: /ings$/, re: / IH0 NG Z$/, out: ['s-left'], unit: 12, ref: [106, 106], text: 'ings: a left s' },
  { spell: /ing$/, re: / IH0 NG$/, out: ['ing'], unit: 1, ref: [3, 3], text: 'ing: a dot at the end of the word' },
  { spell: /(?:ion|ian)$/, re: / (?:SH|ZH|CH) (?:AH0|IH0) N$/, out: ['sh'], unit: 6, ref: [58, 58], text: 'shun (sion, tion): sh' },
  { spell: /ment$/, re: / M AH0 N T$/, out: ['m'], unit: 15, ref: [127, 127], text: 'ment: m' },
  { spell: /ble$/, re: / B AH0 L$/, out: ['b'], unit: 15, ref: [127, 127], text: 'ble: b' },
  { spell: /^(?:sim|am|sam|exam)ple$/, re: / P AH0 L$/, out: ['p'], unit: 15, ref: [127, 127], text: 'ple: p' },
  { spell: /sume$/, re: / (?:S|Z) UW1 M$/, out: ['s', 'm'], bare: true, unit: 15, ref: [126, 126], text: 'sume: the u is omitted' },
  { spell: /ful$/, re: / F AH0 L$/, out: ['f'], unit: 21, ref: [170, 170], text: 'ful: f' },
  { spell: /selves$/, re: / S EH1 L V Z$/, out: ['s', 's'], unit: 21, ref: [170, 170], text: 'selves: ses' },
  { spell: /self$/, re: / S EH1 L F$/, out: ['s'], unit: 21, ref: [170, 170], text: 'self: s' },
  { spell: /ture$/, re: / CH ER0$/, out: ['t', 'r'], unit: 21, ref: [170, 170], text: 'ture: tr' },
  { spell: /age$/, re: / (?:IH0|AH0) JH$/, out: ['j'], unit: 21, ref: [170, 170], text: 'age: j' },
  { spell: /ther$/, re: / DH ER0$/, out: ['th'], unit: 20, ref: [168, 168], text: 'ther: the th sign' },
  { spell: /less$/, re: / L AH0 S$/, out: ['l'], unit: 23, ref: [183, 183], text: 'less: l' },
  { spell: /[^l]ly$/, re: / L IY0$/, out: ['e'], unit: 9, ref: [80, 80], text: 'ly: a small circle' },
];

// §176: words whose final t is written.
const T_WRITTEN = new Set(['lost', 'east', 'fast', 'dust', 'post', 'coast']);
// §174: words of one syllable whose final t is omitted.
const T_OMITTED = new Set(['best', 'rest', 'west', 'last', 'just', 'cost']);

class Skip extends Error {}
const need = (ok) => { if (!ok) throw new Skip(); };

// The tokens for a word from its sounds (no endings); `rules` collects the rules used.
function fromSounds(word, phoneStr, unit, rules) {
  const use = (u, text, ref) => { need(unit >= u); rules.push([text, ref]); };
  let phones = phoneStr;
  const head = [];
  for (const p of PREFIXES) {
    const m = unit >= p.unit && p.spell.test(word) && p.re.exec(`${phones} `);
    if (!m) continue;
    const rest = `${phones} `.slice(m[0].length).trim();
    if (!rest) continue;
    head.push(...p.out(m, CONSONANT[rest.split(' ')[0]] ?? null));
    rules.push([p.text, p.ref]);
    phones = rest;
    word = word.replace(p.spell, '');
    break;
  }
  const tail = [];
  for (const s of SUFFIXES) {
    if (unit < s.unit || !s.spell.test(word) || !s.re.test(` ${phones}`)) continue;
    const rest = ` ${phones}`.replace(s.re, '').trim();
    if (!/\d/.test(rest) && !(s.bare && head.length)) continue;
    tail.push(...s.out);
    rules.push([s.text, s.ref]);
    phones = rest;
    word = word.replace(s.spell, '');
    break;
  }
  let seq = sounds(word, parse(phones), head.length > 0);
  need(!seq.some((s) => s.c === '?' || s.v === '?'));
  // After a prefix, the rest of the word follows a consonant.
  const start = head.length ? -1 : 0;
  if (head.length) seq.unshift({ c: '§' });

  // §100: initial a before w or h is a dot.
  if (start === 0 && isV(seq[0]) && seq[0].v === 'a' && seq[0].stress === 0 && ['w', 'hh'].includes(seq[1]?.c) && isV(seq[2])) {
    use(11, 'a before w or h: a dot on the line', [100, 100]);
    seq.splice(0, 1, { c: 'a-dot' });
    if (seq[1].c === 'hh') seq.splice(1, 1);
  }
  // h: a dot over the vowel, at the start of the word (§1).
  seq.forEach((s, i) => { if (s.c === 'hh') need(i === 0 && isV(seq[1])); });
  // w (§97–100) and y (§104).
  seq = seq.flatMap((s, i) => {
    if (s.c === 'w') {
      need(isV(seq[i + 1]));
      const prev = seq[i - 1];
      if (!prev || prev.c === 'a-dot' || prev.c === '§') {
        need(['a', 'e', 'o', 'i'].includes(seq[i + 1].v));
        use(11, 'w before a vowel: the oo hook', [97, 97]);
        return [{ c: 'oo' }];
      }
      if (prev.c === 's' && ['a', 'e', 'i'].includes(seq[i + 1].v)) { use(11, 'sw before a circle: the hook for w', [99, 99]); return [{ c: 'oo' }]; }
      need(isC(prev) && ['k', 'g', 't', 'd'].includes(prev.c));
      use(11, 'w within a word: a dash under the vowel', [99, 99]);
      return [{ c: 'w-dash' }];
    }
    if (s.c === 'y') {
      need(i === 0 && ['o', 'u'].includes(seq[1]?.v));
      use(12, 'y before a hook: the small circle', [104, 104]);
      return [{ v: 'e', stress: 0, p: 'IY' }];
    }
    return [s];
  });
  // wh: the h is sounded first (§98).
  if (/^wh/.test(word) && seq[0]?.c === 'oo') seq.unshift({ c: 'hh' });
  // §121: ū after n, t, d, s, l, r is the oo hook alone (new, due).
  seq.forEach((s, i) => {
    if (s.v === 'yu' && ['n', 't', 'd', 's', 'l', 'r'].includes(seq[i - 1]?.c) && unit >= 14) { s.v = 'u'; rules.push(['the circle of ū may be omitted', [121, 121]]); }
  });
  // §121: of two vowels side by side that are not a diphthong, the minor one may be omitted.
  if (unit >= 14) {
    seq = seq.filter((s, i) => {
      if (!isV(s) || s.stress !== 0 || ['er', 'ur'].includes(s.v) || !(isV(seq[i - 1]) || isV(seq[i + 1]))) return true;
      rules.push(['the minor of two vowels side by side is omitted', [121, 121]]);
      return false;
    });
  }
  // §124: in the body of a word short u and ow are omitted before n, m (and ng, nk), and short u
  // before a straight downstroke; §125: short u is kept between n-n and n-m.
  if (unit >= 15) {
    seq = seq.filter((s, i) => {
      if (!isV(s) || i === 0 || !isC(seq[i - 1])) return true;
      const next = seq[i + 1]?.c;
      const u = s.v === 'u' && s.p === 'AH';
      const omit = ((u || s.v === 'ow') && ['n', 'm', 'ng'].includes(next) && !(seq[i - 1].c === 'n' && u))
        || (u && ['sh', 'ch', 'j'].includes(next));
      if (omit) rules.push(['short u and ow are omitted before n and m, u before sh, ch, j', [124, 124]]);
      return !omit;
    });
  }
  // Minor vowels not written: an unaccented vowel before a final n, l or m (taken, even,
  // rattle; §16), an unaccented u between consonants (supply), and the last vowel before an
  // ending written as a stroke (payable).
  seq = seq.filter((s, i) => {
    if (!isV(s) || s.stress !== 0 || ['er', 'ur'].includes(s.v) || !isC(seq[i - 1])) return true;
    const rest = seq.slice(i + 1);
    if (rest.length === 1 && ['n', 'l', 'm'].includes(rest[0].c)) return false;
    if (s.v === 'ŭ' && ['p', 'b'].includes(rest[0]?.c)) return false;
    return !(rest.length === 0 && tail[0] === 'b');
  });
  seq.forEach((s) => { if (s.v === 'ŭ') s.v = 'e'; });
  // mpt: the p is not written (prompt, empty).

  // The blends: [first consonants], [last consonants], the vowel allowed between, token.
  const oneSyllable = syllables(phoneStr) < 2;
  const blend = (firsts, lasts, tok, u, text, ref, vowel = light, keep = () => false) => {
    for (let i = 0; i < seq.length; i++) {
      if (!isC(seq[i]) || !firsts.includes(seq[i].c)) continue;
      let j = i + 1;
      const between = isV(seq[j]) && vowel(seq[j], i) ? seq[j++] : null;
      if (!isC(seq[j]) || !lasts.includes(seq[j].c) || unit < u) continue;
      rules.push([text, ref]);
      seq.splice(i, j - i + 1, ...(between && keep(between, i) ? [between] : []), { c: tok, from: seq[i].c });
    }
  };
  // §155: ten and tem are not used with a strongly accented vowel, nor in a word of one
  // syllable; but tain is ten.
  const tenVowel = (v) => light(v) || (v.p === 'EY' && /tain/.test(word));
  blend(['t', 'd'], ['n'], 'ten', 19, 'ten, den: t or d blended with n', [153, 155], tenVowel);
  blend(['t', 'd'], ['m'], 'tem', 19, 'tem, dem: t or d blended with m', [153, 155], tenVowel);
  for (let i = 0; i + 2 < seq.length; i++) {
    if (unit >= 20 && ['t', 'd'].includes(seq[i].c) && seq[i + 1].v === 'er' && seq[i + 1].stress === 0 && seq[i + 2].c === 'n') {
      rules.push(['tern, dern: ten', [166, 166]]);
      seq.splice(i, 3, { c: 'ten', from: 't' });
    }
  }
  if (!oneSyllable) blend(['t', 'd'], ['f', 'v'], 'def', 17, 'def, dev, tive: d blended with f', [140, 140], light);
  blend(['m'], ['n', 'm'], 'men', 3, 'men, mem, min: m blended with n', [27, 27], (v) => light(v));
  blend(['t', 'd'], ['t', 'd'], 'ted', 3, 'ted, ded, det: d blended with t', [26, 26], (v) => v.stress === 0 && !['er', 'ur'].includes(v.v));

  // §174–176: final t omitted after s, k, p and den; §178: d omitted in -mand, -mind, -tend,
  // -pound, -bound.
  if (unit >= 22 && seq.at(-1)?.c === 't' && !T_WRITTEN.has(word)) {
    const b = seq.at(-2)?.c;
    if (['k', 'p', 'ten'].includes(b) || b === 's' && (syllables(phoneStr) > 1 || T_OMITTED.has(word))) {
      seq.pop();
      rules.push(['t is omitted at the end of the word', [174, 175]]);
    }
  }
  if (unit >= 23 && /(?:mand|mind|tend|pound|bound)$/.test(word) && seq.at(-1)?.c === 'd') {
    seq.pop();
    rules.push(['d is omitted', [178, 178]]);
  }

  // ng, nk (§105).
  for (let i = 0; i < seq.length; i++) {
    if (seq[i].c !== 'ng') continue;
    use(12, 'ng and nk: n at a slant', [105, 105]);
    if (seq[i + 1]?.c === 'k') seq.splice(i, 2, { c: 'nk' });
  }
  // x (§57): ks within or at the end of a word is s.
  if (/x/.test(word)) {
    for (let i = 1; i + 1 < seq.length; i++) {
      if (seq[i].c === 'k' && seq[i + 1].c === 's') { use(6, 'x: s', [57, 57]); seq.splice(i, 2, { c: 's' }); }
    }
  }

  seq = seq.filter((s) => s.c !== '§');
  // -fer, -ver: r alone after f or v at the end (confer, infer, defer).
  if (seq.at(-1)?.v === 'er' && ['f', 'v', 'def'].includes(seq.at(-2)?.c)) seq.at(-1).stress = 0;
  // The tokens. An r-coloured vowel is a circle (or the oo hook for ur) before r; `ə` marks an
  // unaccented one, which the r circle may take in (rCircles).
  const toks = [];
  for (const s of seq) {
    if (isC(s)) {
      toks.push(s.c === 'hh' ? 'h' : s.c === 'oo' ? 'u' : s.c);
      continue;
    }
    switch (s.v) {
      case 'er': toks.push(s.stress === 0 ? 'ə' : 'e', 'r'); break;
      case 'ur': toks.push(s.stress === 0 ? 'ə' : 'U', 'r'); break;
      case 'a': case 'e': toks.push(s.v); break;
      case 'o': use(7, 'ŏ, aw and ō: the o hook', [65, 65]); toks.push('o'); break;
      case 'u': use(10, 'ŭ, ŏŏ and ōō: the oo hook', [91, 91]); toks.push('u'); break;
      case 'i': use(13, 'ī: the broken circle', [112, 112]); toks.push('i'); break;
      case 'ow': use(13, 'ow: the a circle and the oo hook', [112, 112]); toks.push('a', 'u'); break;
      case 'oi': use(13, 'oi: the o hook and the e circle', [112, 112]); toks.push('o', 'e'); break;
      case 'yu': use(13, 'ū: the e circle and the oo hook', [112, 112]); toks.push('e', 'u'); break;
      default: throw new Skip();
    }
  }
  // Two like circles side by side are one.
  const all = [...head, ...toks, ...tail].filter((t, i, a) => !(CIRCLES.has(t) && t === a[i - 1]));
  return blendsInTokens(all, unit, rules, { afterPrefix: head.length > 0, syll: syllables(phoneStr) });
}

// Blends of strokes side by side, after the prefixes and suffixes are in place: nt-nd, mt-md
// (§133–134), ld (§136), jent and pent (§140).
function blendsInTokens(toks, unit, rules, { afterPrefix = false, syll = 1 } = {}) {
  // mpt: the p is not written (prompt, empty)
  const out = toks.filter((t, i) => !(t === 'p' && toks[i - 1] === 'm' && toks[i + 1] === 't'));
  for (let i = 0; i + 1 < out.length; i++) {
    const [a, b] = [out[i], out[i + 1]];
    const tok = a === 'n' && (b === 't' || b === 'd') ? 'nd' : a === 'm' && (b === 't' || b === 'd') ? 'md' : a === 'l' && b === 'd' ? 'ld' : null;
    if (!tok || unit < 16) continue;
    rules.push(tok === 'ld' ? ['ld: l with an upward turn at the finish', [136, 136]] : [`${tok === 'nd' ? 'nt, nd' : 'mt, md'}: one upward curve`, [133, 134]]);
    out.splice(i, 2, tok);
    // §134: at the beginning of a word short e and i are omitted before these blends.
    if (i === 1 && out[0] === 'e' && tok !== 'ld') { out.shift(); i--; }
    // A short vowel before a final nt or nd, in a word of more than one syllable, is not
    // written (event, second, tenant).
    if (tok !== 'ld' && i === out.length - 1 && syll > 1 && i >= 2 && ['e', 'a'].includes(out[i - 1]) && !CIRCLES.has(out[i - 2]) && !['h', 'j', 'ng'].includes(out[i - 2]) && !(out[i - 2] === 'p' && out[i - 3] === 's')) { out.splice(i - 1, 1); i--; }
  }
  for (let i = 0; i + 1 < out.length; i++) {
    if (unit < 17) break;
    // jent: j, a short vowel, nt; pent: p, an unaccented vowel, nt (spend keeps its vowel
    // before the blend).
    const v = CIRCLES.has(out[i + 1]) || out[i + 1] === 'ə' ? 1 : 0;
    if (!['j', 'p'].includes(out[i]) || out[i + 1 + v] !== 'nd') continue;
    if (out[i] === 'p' && afterPrefix && i <= 1) continue;
    rules.push([out[i] === 'j' ? 'jent: j blended with nt' : 'pent: p blended with nt', [140, 140]]);
    const keep = out[i] === 'p' && v && out[i - 1] === 's' ? [out[i + 1]] : [];
    out.splice(i, 2 + v, ...(out[i] === 'p' && v && out[i - 1] === 's' ? [] : []), 'jnt');
    if (keep.length) out.splice(i, 0, ...keep);
  }
  return out;
}

// The r circle (§71, §72, §74): a circle followed by r, beside straight strokes only, is
// written with left motion for the r. Otherwise an unaccented er is r alone (paper, maker),
// and ur the oo hook and r (fur).
function rCircles(out, unit, rules) {
  const res = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (['a', 'e', 'ə', 'U'].includes(t) && out[i + 1] === 'r') {
      const prev = res.at(-1) === 'h' ? undefined : res.at(-1);
      const next = out[i + 2];
      const straight = (x) => x === undefined || STRAIGHT.has(x);
      if (unit >= 8 && straight(prev) && straight(next) && (prev || next)) {
        rules.push(['a circle with left motion expresses r after the vowel', [71, 72]]);
        const c = t === 'a' ? 'a' : 'e';
        if (next === 's' && i + 3 === out.length) { res.push(`${c}-rev-s`); rules.push(['s after the r circle: a loop', [74, 74]]); i += 2; continue; }
        res.push(`${c}-rev`);
        i++;
        continue;
      }
    }
    if (t === 'ə') continue;
    if (t === 'U') {
      need(unit >= 10);
      res.push('u');
      continue;
    }
    res.push(t);
  }
  return res;
}

// The s sign (§49, §51, §52) and the th sign (§78) for each s and th of the outline.
const LEFT_BEFORE = new Set(['p', 'b', 'r', 'l', 'ld', 'jnt']);
const LEFT_AFTER = new Set(['p', 'b', 'r', 'l', 't', 'd', 'n', 'm', 'o', 'ted', 'ten', 'tem', 'men', 'nd', 'md', 'ld', 'jnt', 'a-rev', 'e-rev']);
const isStroke = (x) => x && !CIRCLES.has(x) && !['h', 'w-dash', 'ing', 'u', 'o', 'a-dot'].includes(x);
function signs(out, rules) {
  const res = [...out];
  // the nearest stroke before i (d = -1) or after (d = 1), across circles
  const across = (i, d) => { let k = i + d; while (CIRCLES.has(res[k])) k += d; return isStroke(res[k]) || (d < 0 && res[k] === 'o') ? res[k] : undefined; };
  res.forEach((t, i) => {
    if (t !== 's') return;
    if (res[i - 1] === 's-left' || res[i - 1] === 's-right') {
      res[i] = res[i - 1] === 's-left' ? 's-right' : 's-left';
      rules.push(['ses: the two s signs blended', [52, 52]]);
      return;
    }
    const prev = res[i - 1], next = res[i + 1] === 's' ? undefined : res[i + 1];
    if (prev === 'u' || (next === 'u' && i === 0)) { res[i] = 's-right'; rules.push(['us: without an angle (the right s)', [93, 93]]); return; }
    let partner, after;
    if (prev === 'o' && !isStroke(next)) [partner, after] = ['o', true];
    else if (CIRCLES.has(prev) && isStroke(next)) [partner, after] = across(i, -1) ? [across(i, -1), true] : [next, false];
    else if (CIRCLES.has(prev) && across(i, -1) === 'o') [partner, after] = ['o', true];
    else if (CIRCLES.has(next) && isStroke(prev)) [partner, after] = [across(i, 1) ?? prev, !across(i, 1)];
    else if (isStroke(prev) && isStroke(next)) {
      // between strokes with no circle: with its syllable, here the onset of the next one
      const onset = ['t', 'p', 'k', 'm', 'n', 'l', 'ten', 'tem', 'men', 'f'].includes(next);
      [partner, after] = onset ? [next, false] : [prev, true];
    } else if (prev === 'o') [partner, after] = ['o', true];
    else if (isStroke(prev)) [partner, after] = [prev, true];
    else if (across(i, 1)) [partner, after] = [across(i, 1), false];
    else if (across(i, -1)) [partner, after] = [across(i, -1), true];
    const left = partner === 'ng' || partner === 'nk' ? false : after ? LEFT_AFTER.has(partner) : LEFT_BEFORE.has(partner);
    res[i] = left ? 's-left' : 's-right';
    rules.push([left ? 'the left s, by its joining' : 'the right s, by its joining', [49, 51]]);
  });
  res.forEach((t, i) => {
    if (t !== 'th') return;
    const under = [res[i - 1], res[i + 1]].some((x) => ['o', 'r', 'l', 'ld'].includes(x));
    res[i] = under ? 'th-under' : 'th-over';
    rules.push([under ? 'th before or after o, r, l: the left-motion th' : 'th: the right-motion th', [78, 78]]);
  });
  return res;
}

// The endings a word may be split into: its base and what is added, when the pronunciations
// agree (taking = take + ing, dared = dare + d, faces = face + s).
const ENDINGS = [
  ['ing', / IH0 NG$/, (b) => [b, `${b}e`, b.length > 2 && b.at(-1) === b.at(-2) ? b.slice(0, -1) : null]],
  ['s', / (?:S|Z|IH0 Z|AH0 Z)$/, (b) => [b]], ['s', / (?:IH0 Z|AH0 Z|Z)$/, (b) => [`${b}e`]],
  ['s', / Z$/, (b) => [`${b.replace(/ie$/, 'y')}`]],
  ['ed', / (?:T|D|IH0 D|AH0 D)$/, (b) => [b, `${b}e`, b.length > 2 && b.at(-1) === b.at(-2) ? b.slice(0, -1) : null, b.replace(/i$/, 'y')]],
  ['ly', / L IY0$/, (b) => [b, `${b}le`]],
];
const SPELLED = { ing: /ing$/, s: /(?:e?s)$/, ed: /(?<=e)d$|ed$/, ly: /ly$/ };
export function decompose(word) {
  const w = word.toLowerCase();
  const full = SOUNDS[w];
  if (!full) return null;
  for (const [ending, re, bases] of ENDINGS) {
    const m = SPELLED[ending].exec(w);
    if (!m || !re.test(` ${full}`)) continue;
    const added = ` ${full}`.match(re)[0].trim();
    const stem = ending === 's' && /ies$/.test(w) ? w.slice(0, -3) + 'ie' : w.slice(0, -m[0].length) + (ending === 's' && m[0] === 'es' ? 'e' : '') ;
    for (const b of [...new Set([...bases(w.slice(0, -m[0].length)), stem])].filter((x) => x && x.length > 1)) {
      if (SOUNDS[b] && `${SOUNDS[b]} ${added}` === full) return { base: b, ending, added };
      if (ending === 's' && SOUNDS[b] && `${SOUNDS[b]} ${added}`.replace(/ IH0 Z$| AH0 Z$/, ' Z') === full) return { base: b, ending, added };
    }
  }
  return null;
}

// An ending added to an outline: 'ing' (§3), 's' (§46–55), 'ed' (§59, `added` its sound),
// 'ly' (§80). Returns the new outline, or null.
export function withEnding(outline, ending, unit = 36, added = '') {
  const plain = outline.filter((t) => t !== 'v-dash' && t !== 'v-dot');
  let out = null;
  const last = plain.at(-1);
  if (ending === 'ing') out = [...plain, 'ing'];
  else if (ending === 'ly') out = unit >= 9 ? [...plain, 'e'] : null;
  else if (ending === 's') {
    if (unit < 5) return null;
    if ((last === 'a-rev' || last === 'e-rev') && unit >= 8) out = [...plain.slice(0, -1), `${last}-s`];
    else if (last === 's-left' || last === 's-right') out = [...plain, last === 's-left' ? 's-right' : 's-left'];
    else out = signs([...plain.map((t) => (t.startsWith('s-') ? 's' : t)), 's'], []).map((t, i) => (i < plain.length ? plain[i] : t));
  } else if (ending === 'ed') {
    if (/(?:IH0|AH0) D$/.test(added) && (last === 't' || last === 'd')) out = [...plain.slice(0, -1), 'ted'];
    else if (/(?:IH0|AH0) D$/.test(added) && last === 'ten') out = [...plain, 'd'];
    else if (/(?:IH0|AH0) D$/.test(added)) out = [...plain, 'e', 'd'];
    else out = blendsInTokens([...plain, / T$/.test(` ${added}`) ? 't' : 'd'], unit, []);
  }
  if (!out) return null;
  try {
    compileOutline(out);
    return out;
  } catch {
    return null;
  }
}

const DONE = new Map();
export function soundOutline(word, unit = 36) {
  const w = word.toLowerCase();
  const key = `${w}|${unit}`;
  if (DONE.has(key)) return DONE.get(key);
  let result = null;
  const phones = SOUNDS[w];
  if (phones && /^[a-z]+$/.test(w) && !(unit >= 25 && syllables(phones) > 2)) {
    try {
      const parts = decompose(w);
      const base = parts && soundOutline(parts.base, unit);
      if (base) {
        const out = withEnding(base.outline, parts.ending, unit, parts.added);
        if (out) result = { outline: out, rules: base.rules, base: parts.base, ending: parts.ending };
      }
      if (!result) {
        const rules = [];
        let out = fromSounds(w, phones, unit, rules);
        out = rCircles(out, unit, rules);
        out = signs(out, rules);
        for (const t of out) need((STROKE_UNIT[t.replace(/-(?:left|right|over|under|rev|rev-s)$/, '')] ?? 1) <= unit);
        need(out.some((t) => !['h', 'ing', 'w-dash', 'a-dot'].includes(t)));
        compileOutline(out);
        const seen = new Set();
        result = { outline: out, rules: rules.filter(([t]) => !seen.has(t) && seen.add(t)) };
      }
    } catch (e) {
      if (!(e instanceof Skip) && !/circle|hook|loop|join|disjoin|goes before|ends the word|stroke/i.test(e.message)) throw e;
      result = null;
    }
  }
  DONE.set(key, result);
  return result;
}

// §8: "the medium sound is marked with a dot, and the long sound with a short dash"; the short
// sound is not marked. The Manual marks them in its lists of isolated words in Units 1 and 2
// (VOWEL_MARKS in data/examples.js) and in the Speed Studies drills that go with them; its
// sentences and readings, and Unit 3 on, leave them out (wordhelp.js decides which applies).
const markOf = (v) => {
  if (v.stress === 0) return null;
  if (v.p === 'EY' || v.p === 'IY' || (v.p === 'EH' && v.v === 'a')) return 'v-dash';
  if (v.p === 'AA' || v.p === 'EH') return 'v-dot';
  return null;
};
// The outline with a mark before each a or e circle whose vowel is long or medium, read from the
// word's pronunciation; the outline unchanged when its circles and the word's vowels don't line up.
export function markVowels(word, outline) {
  const w = word.toLowerCase();
  const phones = SOUNDS[w];
  const plain = outline.filter((t) => t !== 'v-dash' && t !== 'v-dot');
  if (!phones) return plain;
  const all = sounds(w, parse(phones));
  // ĭ before r is heard as ē (ear, rear, hear: marked long, p. 13)
  all.forEach((s, i) => { if (s.p === 'IH' && s.stress && all[i + 1]?.c === 'r') s.p = 'IY'; });
  let vowels = all.filter((s) => isV(s) && (s.v === 'a' || s.v === 'e'));
  const circles = plain.filter((t) => t === 'a' || t === 'e');
  // unaccented vowels the outline leaves out (taken, rattle) go first
  while (vowels.length > circles.length && vowels.some((v) => v.stress === 0)) vowels.splice(vowels.findLastIndex((v) => v.stress === 0), 1);
  if (vowels.length !== circles.length || vowels.some((v, i) => v.v !== circles[i])) return plain;
  let k = 0;
  return plain.flatMap((t) => {
    if (t !== 'a' && t !== 'e') return [t];
    const v = vowels[k++];
    // a before rr is short (Harry, carry), though the dictionary hears it as in air
    const m = v.p === 'EH' && /arr/.test(w) ? null : markOf(v);
    return m ? [m, t] : [t];
  });
}
