// The writer's natural size relative to the examples (1 = exactly the example size).
// Learned slowly from finished attempts and kept in localStorage, so short/long letters
// (t vs d, k vs g, n vs m) are judged against how big *you* write, consistently across
// the whole attempt.
const KEY = 'gregg.writer.v1';
// The pad's ruling sets the largest size: the tallest strokes (b, v, j ≈ 0.87 of a line
// space at the example size) should stay within about one line space, so a writer whose
// short strokes run large is told so instead of being expected to write b through the
// next line. To write bigger, widen the line spacing.
export const WRITER_MAX = 1.2;
const MIN = 0.6, MAX = WRITER_MAX;
const RATE = 0.25; // how far one finished attempt moves the estimate (in log space)

const clamp = (v) => Math.min(MAX, Math.max(MIN, v));

export function getWriterScale() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))?.scale;
    return Number.isFinite(s) ? clamp(s) : 1;
  } catch {
    return 1;
  }
}

// Call with an assessAttempt() result once the attempt is complete.
export function learnWriterScale(result) {
  if (!result?.complete || !Number.isFinite(result.sizeRatio)) return getWriterScale();
  const prev = getWriterScale();
  // One wildly sized attempt (e.g. a g written for a k) only nudges the estimate.
  const target = clamp(Math.min(prev * 2, Math.max(prev / 2, result.sizeRatio)));
  const next = clamp(Math.exp((1 - RATE) * Math.log(prev) + RATE * Math.log(target)));
  try {
    localStorage.setItem(KEY, JSON.stringify({ scale: next, updated: new Date().toISOString() }));
  } catch {
    // Storage unavailable: keep using the previous estimate.
  }
  return next;
}
