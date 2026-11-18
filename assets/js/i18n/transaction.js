import {
  localeDirection,
  normalizeLocaleUrl,
  renderableLocaleCandidates,
  shouldPersistLocale
} from './locale.js';

// Atomic locale transaction; adapter contract: docs/FRONTEND-ARCHITECTURE.md.
export async function runLocaleTransaction({ config, selectedLocale, source, surface, loadMessages, position }) {
  const readingPosition = position?.capture() ?? null;
  const rejected = [];
  let renderedLocale = null;
  let messages = null;

  for (const candidate of renderableLocaleCandidates(selectedLocale, config)) {
    if (!surface.hasContentFor(candidate)) {
      rejected.push({ locale: candidate, reason: 'content-missing' });
      continue;
    }
    const candidateMessages = await loadMessages(candidate);
    const missingKeys = surface.missingTranslations(candidate, candidateMessages);
    if (missingKeys.length) {
      rejected.push({ locale: candidate, reason: 'catalog-incomplete', keys: missingKeys });
      continue;
    }
    renderedLocale = candidate;
    messages = candidateMessages;
    break;
  }

  if (!renderedLocale) {
    const detail = rejected.map(({ locale, reason }) => `${locale}: ${reason}`).join('; ');
    throw new Error(`No renderable locale for selection "${selectedLocale}" (${detail})`);
  }

  surface.commit(renderedLocale, messages, localeDirection(renderedLocale, config));

  for (const [facet, locale] of Object.entries(surface.publicState())) {
    if (locale !== null && locale !== renderedLocale) {
      throw new Error(`Locale transaction left ${facet} in "${locale}" while rendering "${renderedLocale}"`);
    }
  }

  const currentUrl = surface.currentUrl();
  const normalizedUrl = normalizeLocaleUrl(currentUrl, renderedLocale, config);
  if (normalizedUrl !== currentUrl) surface.replaceUrl(normalizedUrl);

  if (shouldPersistLocale({ source, selectedLocale, renderedLocale })) surface.persist(renderedLocale);

  try {
    await surface.typeset();
  } catch (error) {
    // Math layout is presentation: the locale state above is already coherent.
    surface.report(error);
  }
  await position?.restore(readingPosition);

  return { selectedLocale, renderedLocale, fallback: renderedLocale !== selectedLocale, rejected };
}
