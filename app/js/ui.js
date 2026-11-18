// The app's chrome: the colour theme, the settings menu and the handle that resizes the
// panel against the pad. Choices are kept in localStorage (gregg.ui.v1).
import { button } from './dom.js';

const STORE_KEY = 'gregg.ui.v1';

// The themes of css/app.css. "auto" sets no data-theme and follows the device.
export const THEMES = [
  { id: 'auto', label: 'Auto', note: 'Paper by day, Dusk when the device is dark' },
  { id: 'paper', label: 'Paper', note: 'Cream paper, blue ink' },
  { id: 'white', label: 'White', note: 'Plain white paper' },
  { id: 'sepia', label: 'Sepia', note: 'Warm, low-glare paper' },
  { id: 'dusk', label: 'Dusk', note: 'Dark grey, for dim rooms' },
  { id: 'night', label: 'Night', note: 'Black, for the dark' },
];
export const DEFAULT_THEME = 'paper';

// The panel's share of the main area: its width beside the pad (landscape), its height
// above it (portrait). The pad always keeps at least padMin of the area.
export const PANE = { w: 0.36, h: 0.42, minPx: 120, padMin: 0.4 };

export function loadUi(storage = globalThis.localStorage) {
  const defaults = { theme: DEFAULT_THEME, pane: { w: PANE.w, h: PANE.h } };
  try {
    const s = JSON.parse(storage.getItem(STORE_KEY)) ?? {};
    return {
      theme: THEMES.some((t) => t.id === s.theme) ? s.theme : defaults.theme,
      pane: { w: validShare(s.pane?.w) ?? PANE.w, h: validShare(s.pane?.h) ?? PANE.h },
    };
  } catch {
    return defaults;
  }
}

const validShare = (x) => (Number.isFinite(x) && x > 0 && x < 1 ? x : null);

function saveUi(ui) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(ui));
  } catch {
    // Storage unavailable: the choice lasts until the page is reloaded.
  }
}

// The panel's share for a drag to `px` from the start of an area `size` px long:
// at least PANE.minPx, and never so much that the pad gets less than PANE.padMin.
export function clampShare(px, size) {
  if (!(size > 0)) return null;
  const min = Math.min(PANE.minPx / size, 1 - PANE.padMin);
  return Math.min(Math.max(px / size, min), 1 - PANE.padMin);
}

// `onTheme()` runs after the theme changes (the pad redraws its ink in the new pen colour).
export function createUi({ menuButton, menu, themes, split, area, onTheme = () => {} }) {
  const ui = loadUi();
  const root = document.documentElement;

  // ---------------------------------------------------------------- theme
  const picks = THEMES.map((t) => {
    const b = button(t.label, 'theme-pick', () => setTheme(t.id));
    b.dataset.theme = t.id;
    b.title = t.note;
    b.setAttribute('role', 'radio');
    return b;
  });
  themes.replaceChildren(...picks);
  function setTheme(id) {
    ui.theme = id;
    if (id === 'auto') delete root.dataset.theme;
    else root.dataset.theme = id;
    for (const b of picks) b.setAttribute('aria-checked', String(b.dataset.theme === id));
    // The browser's own bar takes the toolbar's colour.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bar').trim());
    saveUi(ui);
    onTheme();
  }
  setTheme(ui.theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => ui.theme === 'auto' && setTheme('auto'));

  // ---------------------------------------------------------------- menu
  const open = (show) => {
    // Just under the toolbar, which is taller when it wraps on a phone.
    if (show) menu.style.top = `${menuButton.closest('header').getBoundingClientRect().bottom}px`;
    menu.hidden = !show;
    menuButton.setAttribute('aria-expanded', String(show));
  };
  menuButton.addEventListener('click', () => open(menu.hidden));
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !menuButton.contains(e.target)) open(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) open(false);
  });

  // ---------------------------------------------------------------- split
  // Stacked (portrait) or side by side, as the stylesheet lays out the area.
  const stacked = () => getComputedStyle(area).flexDirection === 'column';
  const apply = () => {
    area.style.setProperty('--pane-w', `${(ui.pane.w * 100).toFixed(2)}%`);
    area.style.setProperty('--pane-h', `${(ui.pane.h * 100).toFixed(2)}%`);
  };
  const setShare = (share) => {
    if (share === null) return;
    ui.pane[stacked() ? 'h' : 'w'] = share;
    apply();
  };
  apply();
  let drag = null;
  split.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    split.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, rect: area.getBoundingClientRect() };
    split.classList.add('dragging');
  });
  split.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { rect } = drag;
    setShare(stacked() ? clampShare(e.clientY - rect.top, rect.height) : clampShare(e.clientX - rect.left, rect.width));
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    split.classList.remove('dragging');
    saveUi(ui);
  };
  split.addEventListener('pointerup', end);
  split.addEventListener('pointercancel', end);
  split.addEventListener('dblclick', () => {
    ui.pane = { w: PANE.w, h: PANE.h };
    apply();
    saveUi(ui);
  });
  // Arrow keys move the handle 5% at a time.
  split.addEventListener('keydown', (e) => {
    const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = area.getBoundingClientRect();
    const size = stacked() ? rect.height : rect.width;
    setShare(clampShare((ui.pane[stacked() ? 'h' : 'w'] + step * 0.05) * size, size));
    saveUi(ui);
  });

  return { setTheme, theme: () => ui.theme, pane: () => ({ ...ui.pane }) };
}
