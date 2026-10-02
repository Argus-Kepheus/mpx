import { applyTranslations } from './i18n/runtime.js';
import { setupPalette } from './ui/palette.js';
import { captureReadingPosition, restoreReadingPosition } from './i18n/reading-position.js';
import { setupBackToTop } from './ui/back-to-top.js';

const localeStorageKey = 'mpx-locale';

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}

function renderArchitecture(layers = []) {
  const host = document.querySelector('#architecture-layers');
  if (!host) return;
  host.replaceChildren();
  for (const layer of layers) {
    const section = document.createElement('section');
    section.className = 'arch-layer';
    const title = document.createElement('h3');
    title.textContent = layer.title;
    const list = document.createElement('ul');
    for (const item of layer.items) {
      const li = document.createElement('li'); li.textContent = item; list.appendChild(li);
    }
    section.append(title, list); host.appendChild(section);
  }
}

function renderStates(selector, states = []) {
  const host = document.querySelector(selector);
  if (!host) return;
  host.replaceChildren();
  for (const state of states) {
    const row = document.createElement('div'); row.className = 'state-row';
    row.setAttribute('role', 'listitem');
    const name = document.createElement('span'); name.textContent = state.name;
    const badge = document.createElement('span'); badge.className = 'state-badge'; badge.textContent = state.state;
    row.append(name, badge); host.appendChild(row);
  }
}

function renderCollaboration(groups = []) {
  const host = document.querySelector('#collaboration-groups');
  if (!host) return;
  host.replaceChildren();
  for (const group of groups) {
    const card = document.createElement('section'); card.className = 'collab-card';
    card.setAttribute('role', 'listitem');
    const title = document.createElement('h3'); title.textContent = group.title;
    const list = document.createElement('ul');
    for (const item of group.items) { const li = document.createElement('li'); li.textContent = item; list.appendChild(li); }
    card.append(title, list); host.appendChild(card);
  }
}

function readSavedLocale() {
  try {
    return localStorage.getItem(localeStorageKey);
  } catch {
    return null;
  }
}

function saveLocale(value) {
  try {
    localStorage.setItem(localeStorageKey, value);
  } catch {
    // The current locale still applies when storage is unavailable.
  }
}

function chooseLocale(config) {
  const supported = new Set(config.supportedLocales);
  const requested = new URLSearchParams(window.location.search).get('lang');
  const saved = readSavedLocale();
  if (supported.has(requested)) return requested;
  if (supported.has(saved)) return saved;
  return config.defaultLocale;
}

function renderLocaleOptions(config, selected) {
  const select = document.querySelector('#locale-select');
  if (!select) return;
  select.replaceChildren();
  for (const option of config.localeOptions) {
    const element = document.createElement('option');
    element.value = option.code;
    element.textContent = option.label;
    element.selected = option.code === selected;
    select.appendChild(element);
  }
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

function updateLocaleUrl(locale) {
  const url = new URL(window.location.href);
  if (locale === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', locale);
  window.history.replaceState(null, '', url);
}

async function init() {
  const config = await loadJson('/assets/site.config.json');
  let locale = chooseLocale(config);
  renderLocaleOptions(config, locale);
  setupPalette(config);
  markCurrentNavigation();
  setupBackToTop();

  const applyLocale = (messages) => {
    document.documentElement.lang = locale;
    document.documentElement.dir = config.rtlLocales.includes(locale) ? 'rtl' : 'ltr';
    applyTranslations(messages);
    renderLocaleOptions(config, locale);
    renderArchitecture(messages.home?.architecture?.layers);
    renderStates('#method-states', messages.home?.current?.methods);
    renderStates('#engine-states', messages.home?.current?.engines);
    renderCollaboration(messages.home?.collaborate?.groups);
  };

  applyLocale(await loadJson(`/assets/locales/${locale}.json`));
  const localeSelect = document.querySelector('#locale-select');
  localeSelect?.addEventListener('change', async () => {
    const nextLocale = localeSelect.value;
    if (!config.supportedLocales.includes(nextLocale) || nextLocale === locale) return;
    localeSelect.disabled = true;
    const readingPosition = captureReadingPosition();
    try {
      const nextMessages = await loadJson(`/assets/locales/${nextLocale}.json`);
      locale = nextLocale;
      saveLocale(locale);
      updateLocaleUrl(locale);
      applyLocale(nextMessages);
      await restoreReadingPosition(readingPosition);
    } finally {
      localeSelect.disabled = false;
    }
  });
  document.querySelectorAll('.site-nav-mobile a').forEach((link) => {
    link.addEventListener('click', () => {
      const menu = link.closest('details');
      if (menu) menu.open = false;
    });
  });
}

init().catch((error) => {
  console.error(error);
  document.body.dataset.appError = 'true';
});
