export function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

export function applyTranslations(messages) {
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = getPath(messages, node.dataset.i18n);
    if (typeof value !== 'string') return;
    const attributes = node.dataset.i18nAttr
      ? node.dataset.i18nAttr.split(',').map((attribute) => attribute.trim()).filter(Boolean)
      : [];
    if (attributes.length) {
      for (const attribute of attributes) node.setAttribute(attribute, value);
    } else {
      node.textContent = value;
    }
  });
  const titleKey = document.documentElement.dataset.titleKey;
  const translatedTitle = titleKey ? getPath(messages, titleKey) : null;
  if (typeof translatedTitle === 'string') document.title = translatedTitle;
}

// Keys that `messages` cannot resolve for the given roots. A locale whose
// catalog leaves any reference unresolved would keep default-locale fallback
// text under a foreign <html lang>, so it is not renderable for the page.
export function unresolvedTranslationKeys(messages, roots, titleKey = '') {
  const unresolved = new Set();
  for (const root of roots) {
    root.querySelectorAll('[data-i18n]').forEach((node) => {
      if (typeof getPath(messages, node.dataset.i18n) !== 'string') unresolved.add(node.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-runtime]').forEach((node) => {
      if (!Array.isArray(getPath(messages, node.dataset.i18nRuntime))) unresolved.add(node.dataset.i18nRuntime);
    });
  }
  if (titleKey && typeof getPath(messages, titleKey) !== 'string') unresolved.add(titleKey);
  return [...unresolved];
}
