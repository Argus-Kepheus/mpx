const storageKey = 'mpx-palette';
const lightPalette = 'blueprint';
const darkPalette = 'blueprint-dark';

function readSavedPalette() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function savePalette(value) {
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    // Palette selection still works for the current page when storage is unavailable.
  }
}

export function setupPalette(config) {
  const button = document.querySelector('#palette-toggle');
  if (!button) return;
  const paletteByCode = new Map(config.paletteOptions.map((option) => [option.code, option]));
  const available = new Set(paletteByCode.keys());
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const isAvailable = (value) => available.has(value);
  const setPalette = (value) => {
    const next = isAvailable(value) ? value : config.defaultPalette;
    document.documentElement.dataset.palette = next;
    button.setAttribute('aria-pressed', String(next === darkPalette));
    button.dataset.palette = next;
    const nextThemeColor = paletteByCode.get(next)?.themeColor;
    if (themeColor && nextThemeColor) themeColor.setAttribute('content', nextThemeColor);
  };
  const saved = readSavedPalette();
  const initial = isAvailable(saved)
    ? saved
    : (isAvailable(config.defaultPalette) ? config.defaultPalette : lightPalette);
  setPalette(initial);
  if (button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    const current = document.documentElement.dataset.palette;
    const next = current === darkPalette ? lightPalette : darkPalette;
    setPalette(next);
    savePalette(next);
  });
}
