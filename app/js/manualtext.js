// Renders blocks of the Manual's text (data/manual.js) as paragraphs.
// Blocks are [align, html] with only em, strong, br, img and anchor spans: static content
// from this repository, so it is set as HTML.
export function renderBlocks(blocks) {
  return blocks.map(([align, html]) => {
    const p = document.createElement('p');
    if (align === 'center') p.className = 'center';
    p.innerHTML = html;
    // The site's figures are small: show them 1.4 times as large (still no wider than the text).
    for (const img of p.querySelectorAll('img[width]')) {
      img.width = Math.round(img.width * 1.4);
      img.removeAttribute('height');
    }
    return p;
  });
}
