// J. Andrew Owen's Anniversary Manual site, the source of the Manual's text and figures, the
// brief-form chart, the phrases, the reading keys and the scan the plates are cut from. Where
// the app shows something from it, it links to the page it came from.
export const SITE = 'https://greggshorthand.github.io/';
export const AUTHOR = 'J. Andrew Owen';
export const AUTHOR_SITE = 'https://www.jandrewowen.com/';

// The scan of the Manual on the site; printed page p is page p + PDF_PAGE_OFFSET of the file
// (tools/plates.json cuts the plates from the same file with the same offset).
export const PDF = `${SITE}Annivman.pdf`;
export const PDF_PAGE_OFFSET = 16;

const two = (n) => String(n).padStart(2, '0');

export const sourceUrl = {
  home: SITE,
  beginner: `${SITE}antwtbgr.html`,
  about: `${SITE}anaboutg.html`,
  preface: `${SITE}anprface.html`,
  alphabet: `${SITE}analphbt.html`,
  briefs: `${SITE}anbfs.html`,
  phrases: `${SITE}anphrase.html`,
  editor: `${SITE}aneditor.html`,
  // A unit of the Manual, at paragraph `para` if given (the site anchors each as #pN).
  unit: (n, para = null) => `${SITE}anunit${two(n)}.html${para ? `#p${para}` : ''}`,
  // The transcription of a unit's Reading and Dictation Practice.
  readingKey: (n) => `${SITE}trpanu${two(n)}.html`,
  // The scan at a printed page of the Manual.
  page: (p) => `${PDF}#page=${p + PDF_PAGE_OFFSET}`,
};
