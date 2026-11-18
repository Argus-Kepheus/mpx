import { getPath } from '../i18n/runtime.js';

const text = (value) => {
  if (typeof value !== 'string') throw new Error('Region content must be text');
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
};
const list = (items) => `<ul>${items.map((item) => `<li>${text(item)}</li>`).join('')}</ul>`;

// One representation for both the static no-JavaScript page and locale changes.
export function runtimeRegionHtml(id, values) {
  if (!Array.isArray(values)) throw new Error(`Region ${id} must resolve to an array`);
  if (id === 'architecture-layers' || id === 'collaboration-groups') {
    const attributes = id === 'architecture-layers' ? 'class="arch-layer"' : 'class="collab-card" role="listitem"';
    return values.map(({ title, items }) => `<section ${attributes}><h3>${text(title)}</h3>${list(items)}</section>`).join('');
  }
  if (id === 'method-states' || id === 'engine-states') {
    return values.map(({ name, state }) => `<div class="state-row" role="listitem"><span>${text(name)}</span><span class="state-badge">${text(state)}</span></div>`).join('');
  }
  throw new Error(`Unknown catalog region: ${id}`);
}

export function renderRuntimeRegions(messages) {
  document.querySelectorAll('[data-i18n-runtime]').forEach((host) => {
    host.innerHTML = runtimeRegionHtml(host.id, getPath(messages, host.dataset.i18nRuntime));
  });
}
