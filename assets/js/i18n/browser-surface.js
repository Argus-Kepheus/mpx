import { applyTranslations, unresolvedTranslationKeys } from './runtime.js';
import { localeStorageKey } from './locale.js';
import { renderRuntimeRegions } from '../ui/runtime-regions.js';

export function readSavedLocale() {
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

async function typesetTechnicalMath(host) {
  if (typeof window.MathJax?.typesetPromise !== 'function') return;
  if (window.MathJax.startup?.promise) await window.MathJax.startup.promise;
  if (host) await window.MathJax.typesetPromise([host]);
}

// Browser DOM adapter for the pure locale transaction. Long-form pages carry
// one template per locale; other pages are rendered from the shared catalog.
export function createLocaleSurface(config, { afterArticleRender = () => {}, afterCommit = () => {} } = {}) {
  const articleHost = document.querySelector('[data-technical-article-host]');
  const articleTemplates = new Map(
    [...document.querySelectorAll('template[data-technical-locale]')]
      .map((template) => [template.dataset.technicalLocale, template])
  );
  let articleNeedsTypeset = false;

  const renderArticle = (locale) => {
    if (!articleHost || articleHost.dataset.currentLocale === locale) return;
    const template = articleTemplates.get(locale);
    if (typeof window.MathJax?.typesetClear === 'function') {
      window.MathJax.typesetClear([articleHost]);
    }
    articleHost.replaceChildren(template.content.cloneNode(true));
    articleHost.dataset.currentLocale = locale;
    afterArticleRender();
    document.title = template.dataset.pageTitle;
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', template.dataset.pageDescription);
    articleNeedsTypeset = true;
  };

  return {
    hasContentFor(locale) {
      if (!articleHost || articleHost.dataset.currentLocale === locale) return true;
      const template = articleTemplates.get(locale);
      return Boolean(template?.dataset.pageTitle && template.dataset.pageDescription);
    },
    missingTranslations(locale, messages) {
      const roots = [document];
      const template = articleTemplates.get(locale);
      if (articleHost && template) roots.push(template.content);
      return unresolvedTranslationKeys(messages, roots, document.documentElement.dataset.titleKey);
    },
    commit(locale, messages, direction) {
      renderArticle(locale);
      applyTranslations(messages);
      renderRuntimeRegions(messages);
      document.documentElement.lang = locale;
      document.documentElement.dir = direction;
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        document.querySelector(selector)?.setAttribute('content', document.title);
      }
      for (const selector of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) {
        document.querySelector(selector)?.setAttribute('content', description);
      }
      const structured = document.querySelector('[type="application/ld+json"]');
      if (structured) {
        const data = JSON.parse(structured.text);
        data.inLanguage = locale;
        data.description = description;
        if (data.isPartOf) data.name = document.title;
        structured.text = JSON.stringify(data).replaceAll('<', '\\u003c');
      }
      renderLocaleOptions(config, locale);
      afterCommit();
    },
    publicState() {
      return {
        document: document.documentElement.lang,
        article: articleHost ? articleHost.dataset.currentLocale : null,
        selector: document.querySelector('#locale-select')?.value ?? null
      };
    },
    currentUrl: () => window.location.href,
    replaceUrl: (href) => window.history.replaceState(window.history.state, '', href),
    persist: saveLocale,
    async typeset() {
      const host = articleNeedsTypeset ? articleHost : null;
      articleNeedsTypeset = false;
      await typesetTechnicalMath(host);
    },
    report: (error) => console.error(error)
  };
}
