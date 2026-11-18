import { assertLocaleConfig, isSupportedLocale, resolveLocale } from './i18n/locale.js';
import { runLocaleTransaction } from './i18n/transaction.js';
import { setupPalette } from './ui/palette.js';
import {
  captureInitialReadingPosition,
  captureReadingPosition,
  restoreInitialReadingPosition,
  restoreReadingPosition
} from './i18n/reading-position.js';
import { setupBackToTop } from './ui/back-to-top.js';
import { setupArticleToc } from './ui/article-toc.js';
import { createLocaleSurface, readSavedLocale } from './i18n/browser-surface.js';
import { syncTechnicalLayerNavigation } from './ui/technical-axis-nav.js';

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}

function markCurrentNavigation() {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.site-nav a, .site-nav-mobile-list a').forEach((link) => {
    const target = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, '') || '/';
    const isCurrent = target === '/technical'
      ? currentPath === target || currentPath.startsWith(`${target}/`)
      : currentPath === target;
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function reportFallback(result) {
  if (result.rejected.length) console.warn('Locale fallback applied', result);
}

async function init() {
  const config = assertLocaleConfig(await loadJson('/assets/site.config.json'));
  setupPalette(config);
  markCurrentNavigation();
  setupBackToTop();
  if (document.querySelector('#reference-filters')) {
    const { setupReferences } = await import('./ui/references.js');
    setupReferences();
  }
  // Before the first locale transaction, so a hash target is restored against
  // the layout the reader will actually see.
  const syncArticleToc = setupArticleToc();
  const mobileMenu = document.querySelector('.site-nav-mobile');
  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.open = false;
    });
  });
  // A keyboard reader who tabs out of the open disclosure must not carry an
  // expanded sticky header over the document content. Keep the native details
  // control, but collapse it once focus leaves the disclosure.
  mobileMenu?.addEventListener('focusout', (event) => {
    if (!event.relatedTarget || !mobileMenu.contains(event.relatedTarget)) {
      mobileMenu.open = false;
    }
  });

  const surface = createLocaleSurface(config, {
    afterArticleRender: syncArticleToc,
    afterCommit: syncTechnicalLayerNavigation
  });
  const loadMessages = (locale) => loadJson(`/assets/locales/${locale}.json`);
  const resolution = resolveLocale({ search: window.location.search, savedLocale: readSavedLocale() }, config);
  let current = await runLocaleTransaction({
    config,
    selectedLocale: resolution.selectedLocale,
    source: resolution.source,
    surface,
    loadMessages,
    position: { capture: captureInitialReadingPosition, restore: restoreInitialReadingPosition }
  });
  reportFallback(current);

  // The selector is inert in the static HTML and only becomes operational
  // once a locale has been applied successfully.
  const localeSelect = document.querySelector('#locale-select');
  if (!localeSelect) return;
  localeSelect.addEventListener('change', async () => {
    const nextLocale = localeSelect.value;
    if (!isSupportedLocale(config, nextLocale) || nextLocale === current.renderedLocale) {
      localeSelect.value = current.renderedLocale;
      return;
    }
    localeSelect.disabled = true;
    try {
      current = await runLocaleTransaction({
        config,
        selectedLocale: nextLocale,
        source: 'selector',
        surface,
        loadMessages,
        position: { capture: captureReadingPosition, restore: restoreReadingPosition }
      });
      reportFallback(current);
    } catch (error) {
      console.error(error);
      localeSelect.value = current.renderedLocale;
    } finally {
      localeSelect.disabled = false;
    }
  });
  localeSelect.disabled = false;
}

init().catch((error) => {
  console.error(error);
  document.body.dataset.appError = 'true';
});
