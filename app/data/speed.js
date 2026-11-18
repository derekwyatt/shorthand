// Sections of Gregg Speed Studies (John Robert Gregg, Anniversary Edition, 1929; US public
// domain), the companion to the Manual whose Part I follows it chapter by chapter: advice on
// executing the strokes, drills to copy, and the keys the book prints for them. Each figure is a
// plate cut from the scan (tools/plates.json, source "speed"; ids ss-STUDY-SECTION-n).
// Generated from the transcriptions in the session scratchpad; text checked against the scan.
//
// { study, section (0: the study's introduction), title, pages, unit (the Manual unit it
//   supports), reading?, writing?, text: paragraphs (for writing: sentences to write),
//   figures: [{ plate, label, key?: lines, after?: paragraphs printed after the figure }] }
export const SPEED = [

];

export const speedForUnit = (unit) => SPEED.filter((s) => s.unit === unit);
