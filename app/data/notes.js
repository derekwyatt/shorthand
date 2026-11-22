// Study notes for the "About this outline" window (js/explain.js): what each part of an
// outline is and the joining rules it brings in, each with the Manual paragraphs (§) that
// teach it. The notes summarise the 1929 Manual; the § links lead to its own words.

// One note per outline token: [name, note, [first §, last §]].
export const TOKEN_NOTES = {
  a: ['The large circle (a)', 'The A group of vowels: a as in mat, calm and came. Which side of a stroke the circle goes on depends on the joining.', [7, 8]],
  e: ['The small circle (e)', 'The E group of vowels: short i as in kit, e as in get, long e as in need. Which side of a stroke the circle goes on depends on the joining.', [7, 8]],
  i: ['The ī circle', 'The diphthong ī. The Manual’s sign is a large circle with an indentation; in many common words it is written as a plain large circle.', [112, 114]],
  'a-rev': ['The reversed large circle', 'A circle written with left motion, against the usual way, adds r after the vowel: on and between straight strokes.', [71, 72]],
  'e-rev': ['The reversed small circle', 'A circle written with left motion, against the usual way, adds r after the vowel: on and between straight strokes.', [71, 72]],
  'a-rev-s': ['The loop (large)', 'A final left-motion circle on a straight stroke becomes a loop to add s.', [74, 74]],
  'e-rev-s': ['The loop (small)', 'A final left-motion circle on a straight stroke becomes a loop to add s.', [74, 74]],
  ing: ['The ing dot', '“A dot at the end of a word expresses ing.”', [3, 3]],
  'a-dot': ['The a dot', 'In words beginning with a-h or a-w, the a is a dot on the line close to the next character.', [100, 100]],
  'v-dot': ['The vowel dot', 'A dot under a circle marks the medium sound of the vowel (a as in calm). Marks are seldom used: only to make an unfamiliar or isolated word certain.', [8, 8]],
  'v-dash': ['The vowel dash', 'A short dash under a circle marks the long sound of the vowel (a as in came). Marks are seldom used: only to make an unfamiliar or isolated word certain.', [8, 8]],
  'w-dash': ['The w dash', 'In the body of a word, w is a short dash under the vowel that follows it, added after the outline is written.', [99, 99]],
  h: ['The dot', 'Over a vowel, a dot is the aspirate h. On the line by itself it is the article a or an.', [3, 3]],
  n: ['n', 'A short straight line written forward along the line. M is the same line, longer.', [2, 3]],
  m: ['m', 'A longer straight line written forward along the line. N is the same line, short.', [2, 3]],
  men: ['The men blend', 'M and n blended into one long forward line: men, mem, and similar sounds such as min in minute and mun in money.', [27, 27]],
  t: ['t', 'A short straight line struck upward to the right from the line of writing. D is the same line, longer.', [2, 3]],
  d: ['d', 'A longer straight line struck upward to the right. T is the same line, short.', [2, 3]],
  ted: ['The ted blend', 'D and t blended into one long upward line: ted, ded, det.', [26, 26]],
  k: ['k', 'A short forward curve that bulges upward (right motion). G is the same curve, longer.', [2, 10]],
  g: ['g', 'A long forward curve that bulges upward (right motion): the hard g of game. K is the same curve, short.', [2, 10]],
  r: ['r', 'A short forward curve that bulges downward (left motion). L is the same curve, longer.', [2, 10]],
  l: ['l', 'A long forward curve that bulges downward (left motion). R is the same curve, short.', [2, 10]],
  ld: ['The ld combination', 'L with a swinging upward turn at the finish.', [136, 136]],
  p: ['p', 'A short downward curve that bulges to the left (left motion), like a small left parenthesis. B is the same curve, longer.', [34, 35]],
  b: ['b', 'A long downward curve that bulges to the left (left motion). P is the same curve, short.', [34, 35]],
  f: ['f', 'A short downward curve that bulges to the right (right motion). V is the same curve, longer.', [34, 35]],
  v: ['v', 'A long downward curve that bulges to the right (right motion). F is the same curve, short.', [34, 35]],
  's-left': ['s (left s)', 'A very small downward curve with left motion, like a tiny p; it also writes z. Before and after p, b, r and l, and after t, d, n, m and o, the left s is used; in other cases the right s. Between strokes, s goes with the syllable it belongs to.', [46, 51]],
  's-right': ['s (right s)', 'A very small downward curve with right motion, like a tiny f; it also writes z. Before and after p, b, r and l, and after t, d, n, m and o, the left s is used; in all other cases the right s. Between strokes, s goes with the syllable it belongs to.', [46, 51]],
  sh: ['sh', 'A very short straight line written downward. Ch is the same line, longer; j longer still.', [34, 35]],
  ch: ['ch', 'A straight line written downward, longer than sh and shorter than j.', [34, 35]],
  j: ['j', 'A long straight line written downward: j and soft g. Sh and ch are the shorter lines.', [34, 35]],
  'th-over': ['th (over form)', 'T curved upward, bulging up and to the left (right motion). The left-motion th is used before and after o, r and l; in other cases this right-motion th.', [22, 79]],
  'th-under': ['th (under form)', 'T curved upward, bulging down and to the right (left motion). It is used before and after o, r and l; in other cases the right-motion th.', [22, 79]],
  ten: ['The ten blend', 'T or d blended with n into one upward curve: ten, den, tn, dn. Not used where the syllable has a strongly accented vowel.', [153, 156]],
  tem: ['The tem blend', 'T or d blended with m into one longer upward curve: tem, dem, tm, dm.', [153, 156]],
  nd: ['The nd blend', 'N and t or d with the angle slurred into one upward curve as long as f: nt, nd, ent, end.', [133, 134]],
  md: ['The md blend', 'M and t or d with the angle slurred into one upward curve as long as v: mt, md, emt, emd.', [133, 134]],
  o: ['The o hook', 'The lower half of a small ellipse: ŏ as in rot, aw as in raw, ō as in wrote. Before n, m, r and l its slant is modified to avoid an angle.', [65, 67]],
  u: ['The oo hook', 'The upper half of a small ellipse: ŭ as in tuck, oo as in took and tomb; also w. After n and m it is turned under.', [91, 97]],
  ng: ['ng', 'N written at a slight downward slant: ng as in ring.', [105, 105]],
  nk: ['nk', 'A longer stroke on the same downward slant as ng: nk as in bank.', [105, 105]],
  def: ['The def blend', 'D and f with the angle rounded off into one sign: def, dev, and the ending tive.', [140, 140]],
  jnt: ['The jent / pent blend', 'J or p and the nt blend with the angle rounded off into one sign: jent, jend, pent, pend.', [140, 140]],
  period: ['The period', 'A short stroke slanting down to the right.', [5, 5]],
  cap: ['The capital mark', 'Two short dashes under a word mark a capital or a proper name.', [5, 5]],
  '^': ['A disjoined beginning', 'The word-beginning before the break is written apart from the rest of the word, generally above its start.', [209, 216]],
  '_': ['A disjoined ending', 'The word-ending after the break is written apart from the rest of the word, close to its end; the vowel before it is understood.', [230, 231]],
};

// How pairs of strokes join, by the two tokens written one after the other: [note, [§, §]].
export const JOIN_NOTES = [
  [['k', 'r'], 'K and r are equal curves: made a little flatter than usual when joined.', [19, 19]],
  [['g', 'l'], 'G and l are equal curves: made a little flatter than usual when joined.', [19, 19]],
  [['g', 'r'], 'Curves of unequal length joining without an angle: the difference in length must show. Gr is written with a movement like a longhand y.', [20, 20]],
  [['k', 'l'], 'Curves of unequal length joining without an angle: the difference in length must show. Kl is written with a movement like a longhand h.', [20, 20]],
  [['r', 'k'], 'R and k are of equal length, so the curves are somewhat flatter, as with kr.', [21, 21]],
  [['l', 'k'], 'Lk joins like rk, with flatter curves; it is very infrequent.', [21, 21]],
  [['p', 'r'], 'Pr: start to the left, and write it with one sweep of the pen.', [37, 37]],
  [['p', 'l'], 'Pl: start to the left, and write it with one sweep of the pen.', [37, 37]],
  [['b', 'r'], 'Br: start down, and write it with one sweep of the pen.', [38, 38]],
  [['b', 'l'], 'Bl: start down, and write it with one sweep of the pen.', [38, 38]],
  [['f', 'r'], 'Fr: the angle is rounded to give fluency.', [39, 39]],
  [['f', 'l'], 'Fl: the angle is rounded to give fluency.', [39, 39]],
];

// The circle rules (§11–18), used when an outline has a vowel circle.
export const CIRCLE_NOTES = {
  curve: ['At the beginning or end of a single curve, the circle goes inside the curve.', [11, 11]],
  straight: ['At the beginning or end of a single straight stroke, the circle is written with right motion (clockwise).', [12, 12]],
  between: ['Between strokes: where the joining makes an angle, the circle goes outside the angle; where a straight stroke and a curve, or two curves of the same motion, join without an angle, it goes inside the curve; between straight strokes in the same direction it is written with right motion; between opposite curves it is turned back on the first curve.', [14, 18]],
};

// What a kind of example is, for the kinds that are more than their strokes.
export const KIND_NOTES = {
  brief: ['A brief form', 'A comparatively small number of very common words make up a large part of the language. Each has a short outline, often a single stroke, to be learned as a whole.', [23, 23]],
  phrase: ['A phrase', 'Short, common words that make good sense together are joined into one outline without lifting the pen: this helps both speed and accuracy.', [30, 30]],
  sentence: ['A sentence', 'Each word is its own outline except common pairs joined as phrases; the period ends the sentence.', [4, 5]],
};
