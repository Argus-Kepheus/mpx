// Pure locale contract: no DOM, storage or network access. See
// docs/INTERNATIONALIZATION-SEMANTICS-2026-10-05.md for the full specification.
//
//   defaultLocale    configured authority (site.config.json)
//   requestedLocale  what the URL explicitly and validly asked for, or null
//   selectedLocale   what the resolution policy chose
//   renderedLocale   what was actually delivered (decided by the transaction)

export const localeQueryParameter = 'lang';
export const localeStorageKey = 'mpx-locale';

function decodeQueryComponent(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

// Raw segments are kept so that normalisation never re-encodes foreign parameters.
function querySegments(search) {
  const raw = String(search ?? '').replace(/^\?/, '');
  if (!raw) return [];
  return raw.split('&').map((segment) => {
    const separator = segment.indexOf('=');
    return {
      segment,
      key: decodeQueryComponent(separator < 0 ? segment : segment.slice(0, separator)),
      value: separator < 0 ? '' : decodeQueryComponent(segment.slice(separator + 1))
    };
  });
}

export function assertLocaleConfig(config) {
  const supported = config?.supportedLocales;
  if (!Array.isArray(supported) || !supported.length || supported.some((locale) => typeof locale !== 'string' || !locale)) {
    throw new Error('Locale configuration must declare non-empty supportedLocales');
  }
  if (new Set(supported).size !== supported.length) {
    throw new Error('Locale configuration must not repeat supportedLocales');
  }
  if (!supported.includes(config.defaultLocale)) {
    throw new Error('Locale configuration defaultLocale must be one of supportedLocales');
  }
  return config;
}

// Exact match only: no case folding and no aliases such as pt -> pt-BR.
export function isSupportedLocale(config, value) {
  return typeof value === 'string' && config.supportedLocales.includes(value);
}

export function parseLocaleRequest(search, config) {
  const values = querySegments(search)
    .filter(({ key }) => key === localeQueryParameter)
    .map(({ value }) => value);
  let status = 'valid';
  if (values.length === 0) status = 'absent';
  else if (values.length > 1) status = 'repeated';
  else if (values[0] === '') status = 'empty';
  else if (!isSupportedLocale(config, values[0])) status = 'invalid';
  return { status, requestedLocale: status === 'valid' ? values[0] : null, values };
}

// Precedence: valid explicit URL > valid persisted preference > defaultLocale.
// Absent, empty, invalid and repeated requests all resolve the same way.
export function resolveLocale({ search = '', savedLocale = null } = {}, config) {
  const request = parseLocaleRequest(search, config);
  const validSavedLocale = isSupportedLocale(config, savedLocale) ? savedLocale : null;
  let source = 'default';
  if (request.requestedLocale) source = 'url';
  else if (validSavedLocale) source = 'saved';
  return {
    defaultLocale: config.defaultLocale,
    request,
    requestedLocale: request.requestedLocale,
    savedLocale: validSavedLocale,
    selectedLocale: request.requestedLocale ?? validSavedLocale ?? config.defaultLocale,
    source
  };
}

// The only locales a transaction may deliver for a selection, in order.
export function renderableLocaleCandidates(selectedLocale, config) {
  return [...new Set([selectedLocale, config.defaultLocale])];
}

export function localeDirection(locale, config) {
  return (config.rtlLocales ?? []).includes(locale) ? 'rtl' : 'ltr';
}

// Canonical form: no lang parameter for defaultLocale, exactly one otherwise.
export function normalizeLocaleSearch(search, renderedLocale, config) {
  const segments = querySegments(search);
  const firstLocaleIndex = segments.findIndex(({ key }) => key === localeQueryParameter);
  if (firstLocaleIndex < 0 && renderedLocale === config.defaultLocale) return String(search ?? '');
  const kept = segments.map(({ segment, key }, index) => {
    if (key !== localeQueryParameter) return segment;
    if (index !== firstLocaleIndex || renderedLocale === config.defaultLocale) return null;
    return `${localeQueryParameter}=${encodeURIComponent(renderedLocale)}`;
  }).filter((segment) => segment !== null);
  if (firstLocaleIndex < 0 && renderedLocale !== config.defaultLocale) {
    kept.push(`${localeQueryParameter}=${encodeURIComponent(renderedLocale)}`);
  }
  return kept.length ? `?${kept.join('&')}` : '';
}

export function normalizeLocaleUrl(href, renderedLocale, config) {
  const url = new URL(href);
  url.search = normalizeLocaleSearch(url.search, renderedLocale, config);
  return url.href;
}

// Only an explicit choice that was actually delivered becomes the preference:
// a defensive fallback never promotes the locale that could not be rendered,
// and never overwrites an earlier valid preference.
export function shouldPersistLocale({ source, selectedLocale, renderedLocale }) {
  return (source === 'url' || source === 'selector') && selectedLocale === renderedLocale;
}
