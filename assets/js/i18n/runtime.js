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
