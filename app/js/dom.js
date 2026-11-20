// Small DOM helpers shared by the views.

export const SVG_NS = 'http://www.w3.org/2000/svg';

// An HTML element with properties (className, textContent, onclick …) and children.
export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export const button = (text, className, onClick) => el('button', { type: 'button', className, textContent: text, onclick: onClick });

// An SVG element; SVG takes attributes, not properties.
export function svgEl(name, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

// Hands a file to the user: the share sheet where there is one (on the iPad: AirDrop, Files,
// Mail), otherwise a download. Resolves false if the user cancelled the share sheet.
export async function saveFile(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (err) {
      if (err?.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = el('a', { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// A link out of the app, opened in a new tab.
export const outLink = (href, text) => el('a', { href, target: '_blank', rel: 'noopener', className: 'out-link', textContent: `${text} ↗` });

// A caption crediting where something came from, with a link to that page.
export const credit = (text, href, linkText) => el('p', { className: 'ex-caption credit' }, `${text} `, outLink(href, linkText));
