// Initial state follows CSS; subsequent state belongs to the reader across locale changes.
const initialStateProperty = '--article-toc-initial';

export function setupArticleToc({ documentRef = document, windowRef = window } = {}) {
  const find = () => documentRef.querySelector('details.article-toc');
  const first = find();
  if (!first) return () => {};

  let open = windowRef.getComputedStyle(first).getPropertyValue(initialStateProperty).trim() !== 'closed';

  const sync = () => {
    const toc = find();
    if (!toc) return;
    toc.open = open;
    if (toc.dataset.tocBound === 'true') return;
    toc.dataset.tocBound = 'true';
    toc.addEventListener('toggle', () => { open = toc.open; });
  };

  sync();
  return sync;
}
