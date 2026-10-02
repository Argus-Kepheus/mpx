const readingLineRatio = 0.35;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentMaxScroll(documentRef, windowRef) {
  return Math.max(0, documentRef.documentElement.scrollHeight - windowRef.innerHeight);
}

function stableReadingAnchors(documentRef) {
  const main = documentRef.querySelector('main');
  if (!main) return [];
  return [...main.querySelectorAll('[id]')].filter((node) => node.id && typeof node.getBoundingClientRect === 'function');
}

function hashAnchor(documentRef, windowRef) {
  const rawHash = windowRef.location?.hash?.slice(1);
  if (!rawHash) return null;
  let id;
  try {
    id = decodeURIComponent(rawHash);
  } catch {
    id = rawHash;
  }
  const node = documentRef.getElementById(id);
  if (!node || typeof node.getBoundingClientRect !== 'function') return null;
  const rect = node.getBoundingClientRect();
  return rect.bottom >= -windowRef.innerHeight && rect.top <= windowRef.innerHeight * 2 ? node : null;
}

function closestReadingAnchor(documentRef, windowRef) {
  const explicit = hashAnchor(documentRef, windowRef);
  if (explicit) return explicit;

  const anchors = stableReadingAnchors(documentRef);
  if (!anchors.length) return null;

  const readingLine = windowRef.innerHeight * readingLineRatio;
  let preceding = null;
  let following = null;
  for (const node of anchors) {
    const top = node.getBoundingClientRect().top;
    if (!Number.isFinite(top)) continue;
    if (top <= readingLine && (!preceding || top > preceding.top)) preceding = { node, top };
    if (top > readingLine && (!following || top < following.top)) following = { node, top };
  }
  return preceding?.node ?? following?.node ?? null;
}

export function captureReadingPosition({ documentRef = document, windowRef = window } = {}) {
  const anchor = closestReadingAnchor(documentRef, windowRef);
  const maxScroll = currentMaxScroll(documentRef, windowRef);
  return {
    anchorId: anchor?.id ?? null,
    anchorViewportTop: anchor ? anchor.getBoundingClientRect().top : null,
    scrollY: windowRef.scrollY,
    scrollProgress: maxScroll > 0 ? clamp(windowRef.scrollY / maxScroll, 0, 1) : 0
  };
}

function restoreOnce(context, documentRef, windowRef) {
  if (!context) return 'none';

  const anchor = context.anchorId ? documentRef.getElementById(context.anchorId) : null;
  if (anchor && typeof anchor.getBoundingClientRect === 'function' && Number.isFinite(context.anchorViewportTop)) {
    const delta = anchor.getBoundingClientRect().top - context.anchorViewportTop;
    if (Math.abs(delta) > 0.5) {
      windowRef.scrollTo({
        top: Math.max(0, windowRef.scrollY + delta),
        left: windowRef.scrollX ?? 0,
        behavior: 'auto'
      });
    }
    return 'anchor';
  }

  const maxScroll = currentMaxScroll(documentRef, windowRef);
  const target = maxScroll > 0
    ? clamp(context.scrollProgress * maxScroll, 0, maxScroll)
    : 0;
  windowRef.scrollTo({
    top: target,
    left: windowRef.scrollX ?? 0,
    behavior: 'auto'
  });
  return 'scroll-progress';
}

export async function restoreReadingPosition(context, { documentRef = document, windowRef = window } = {}) {
  restoreOnce(context, documentRef, windowRef);
  await new Promise((resolve) => windowRef.requestAnimationFrame(resolve));
  return restoreOnce(context, documentRef, windowRef);
}
