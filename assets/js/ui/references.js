export const normalizeSearch = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function matchesReference(row, filters) {
  const words = normalizeSearch(filters.q || '').trim().split(/\s+/).filter(Boolean);
  return words.every((word) => normalizeSearch(row.search).includes(word))
    && (!filters.topic || row.topics.split(' ').includes(filters.topic))
    && (!filters.type || row.type === filters.type)
    && (!filters.access || row.access === filters.access)
    && (!filters.from || Number(row.year) >= Number(filters.from))
    && (!filters.to || Number(row.year) <= Number(filters.to));
}

export function setupReferences() {
  const form = document.querySelector('#reference-filters');
  if (!form) return;
  const items = [...document.querySelectorAll('[data-reference]')];
  const apply = () => {
    const filters = Object.fromEntries(new FormData(form));
    let shown = 0;
    for (const item of items) {
      item.hidden = !matchesReference(item.dataset, filters);
      if (!item.hidden) shown++;
    }
    document.querySelector('#reference-count').textContent = String(shown) + ' / ' + items.length;
    document.querySelector('#reference-empty').hidden = shown !== 0;
  };
  form.hidden = false;
  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  form.addEventListener('submit', (event) => event.preventDefault());
  form.querySelector('[data-clear]').addEventListener('click', () => { form.reset(); apply(); });
  apply();
}
