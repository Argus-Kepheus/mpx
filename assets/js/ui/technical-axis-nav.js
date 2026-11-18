function revealLayerLink(link, list) {
  if (!link || list.scrollWidth <= list.clientWidth) return;
  const listRect = list.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const leftOverflow = linkRect.left - listRect.left;
  const rightOverflow = linkRect.right - listRect.right;

  if (leftOverflow < -1) list.scrollLeft += leftOverflow;
  else if (rightOverflow > 1) list.scrollLeft += rightOverflow;
}

// Reapply orientation after a locale commit and bind the current strip once.
// Moving focus to another layer scrolls only this strip, never the page.
export function syncTechnicalLayerNavigation() {
  const list = document.querySelector('.technical-axis-nav ul');
  if (!list) return;
  if (list.dataset.focusBound !== 'true') {
    list.addEventListener('focusin', (event) => revealLayerLink(event.target.closest('a'), list));
    list.dataset.focusBound = 'true';
  }
  revealLayerLink(list.querySelector('a[aria-current="location"]'), list);
}
