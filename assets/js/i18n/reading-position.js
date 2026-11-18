const readingLineRatio = 0.35;
const restoreBehavior = 'instant';

const restoredSectionContinuity = new WeakMap();

export const readingAnchorSelector = ':is(h1, h2, h3, h4, h5, h6, section, article, aside)[id]';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentMaxScroll(documentRef, windowRef) {
  return Math.max(0, documentRef.documentElement.scrollHeight - windowRef.innerHeight);
}

function isRendered(node) {
  return typeof node.getClientRects === 'function' && node.getClientRects().length > 0;
}

function readingAnchors(documentRef) {
  const main = documentRef.querySelector('main');
  if (!main) return [];
  return [...main.querySelectorAll(readingAnchorSelector)]
    .filter((node) => node.id && typeof node.getBoundingClientRect === 'function' && isRendered(node));
}

function hashTarget(documentRef, windowRef) {
  const rawHash = windowRef.location?.hash?.slice(1);
  if (!rawHash) return null;
  let id;
  try {
    id = decodeURIComponent(rawHash);
  } catch {
    id = rawHash;
  }
  return documentRef.getElementById(id);
}

function hashAnchor(documentRef, windowRef, anchors) {
  const node = hashTarget(documentRef, windowRef);
  if (!node || !anchors.includes(node)) return null;
  const { top } = node.getBoundingClientRect();
  return top >= -windowRef.innerHeight && top <= windowRef.innerHeight * 2 ? node : null;
}

function neighbours(anchors, readingLine) {
  let preceding = null;
  let following = null;
  for (const node of anchors) {
    const top = node.getBoundingClientRect().top;
    if (!Number.isFinite(top)) continue;
    if (top <= readingLine && (!preceding || top > preceding.top)) preceding = { node, top };
    if (top > readingLine && (!following || top < following.top)) following = { node, top };
  }
  return { preceding, following };
}

function contentEnd(documentRef) {
  const bottom = documentRef.querySelector('main')?.getBoundingClientRect?.().bottom;
  return Number.isFinite(bottom) ? bottom : null;
}

function preserveRestoredSectionFraction(context, windowRef) {
  const previous = restoredSectionContinuity.get(windowRef);
  restoredSectionContinuity.delete(windowRef);
  if (!previous) return context;

  const readerStayedPut = Number.isFinite(previous.scrollY)
    && Number.isFinite(windowRef.scrollY)
    && Math.abs(windowRef.scrollY - previous.scrollY) <= 1;
  const sameSection = context.anchorId === previous.anchorId
    && context.sectionEndId === previous.sectionEndId
    && Number.isFinite(context.sectionFraction)
    && Number.isFinite(previous.sectionFraction);

  if (readerStayedPut && sameSection) context.sectionFraction = previous.sectionFraction;
  return context;
}

function rememberRestoredSectionFraction(context, windowRef) {
  if (context?.anchorId && Number.isFinite(context.sectionFraction)) {
    restoredSectionContinuity.set(windowRef, {
      anchorId: context.anchorId,
      sectionEndId: context.sectionEndId,
      sectionFraction: context.sectionFraction,
      scrollY: windowRef.scrollY
    });
  } else {
    restoredSectionContinuity.delete(windowRef);
  }
}

export function captureReadingPosition({ documentRef = document, windowRef = window } = {}) {
  const anchors = readingAnchors(documentRef);
  const readingLine = windowRef.innerHeight * readingLineRatio;
  const maxScroll = currentMaxScroll(documentRef, windowRef);
  const context = {
    anchorId: null,
    anchorViewportTop: null,
    sectionEndId: null,
    sectionFraction: null,
    beforeFirstAnchor: false,
    readingLine,
    scrollY: windowRef.scrollY,
    scrollProgress: maxScroll > 0 ? clamp(windowRef.scrollY / maxScroll, 0, 1) : 0
  };

  const explicit = hashAnchor(documentRef, windowRef, anchors);
  const { preceding, following } = explicit ? { preceding: null, following: null } : neighbours(anchors, readingLine);
  const anchor = explicit ?? preceding?.node ?? null;
  if (!anchor) {
    context.beforeFirstAnchor = Boolean(following);
    return preserveRestoredSectionFraction(context, windowRef);
  }
  context.anchorId = anchor.id;
  context.anchorViewportTop = anchor.getBoundingClientRect().top;

  if (preceding && preceding.top < 0) {
    const end = following ? following.top : contentEnd(documentRef);
    if (end !== null && end > preceding.top) {
      context.sectionEndId = following ? following.node.id : null;
      context.sectionFraction = clamp((readingLine - preceding.top) / (end - preceding.top), 0, 1);
    }
  }
  return preserveRestoredSectionFraction(context, windowRef);
}

function restorationDelta(context, documentRef) {
  const anchor = context.anchorId ? documentRef.getElementById(context.anchorId) : null;
  if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return null;
  const top = anchor.getBoundingClientRect().top;

  if (Number.isFinite(context.sectionFraction) && Number.isFinite(context.readingLine)) {
    const endNode = context.sectionEndId ? documentRef.getElementById(context.sectionEndId) : null;
    const end = endNode && typeof endNode.getBoundingClientRect === 'function'
      ? endNode.getBoundingClientRect().top
      : (context.sectionEndId ? null : contentEnd(documentRef));
    if (end !== null && end > top) return top + context.sectionFraction * (end - top) - context.readingLine;
  }
  return Number.isFinite(context.anchorViewportTop) ? top - context.anchorViewportTop : null;
}

function restoreOnce(context, documentRef, windowRef) {
  if (!context) return 'none';

  const delta = restorationDelta(context, documentRef);
  if (delta !== null) {
    if (Math.abs(delta) > 0.5) {
      windowRef.scrollTo({
        top: Math.max(0, windowRef.scrollY + delta),
        left: windowRef.scrollX ?? 0,
        behavior: restoreBehavior
      });
    }
    return 'anchor';
  }

  const maxScroll = currentMaxScroll(documentRef, windowRef);
  if (context.beforeFirstAnchor && Number.isFinite(context.scrollY)) {
    const top = clamp(context.scrollY, 0, maxScroll);
    if (Math.abs(top - windowRef.scrollY) > 0.5) {
      windowRef.scrollTo({ top, left: windowRef.scrollX ?? 0, behavior: restoreBehavior });
    }
    return 'top-offset';
  }

  const target = maxScroll > 0
    ? clamp(context.scrollProgress * maxScroll, 0, maxScroll)
    : 0;
  windowRef.scrollTo({
    top: target,
    left: windowRef.scrollX ?? 0,
    behavior: restoreBehavior
  });
  return 'scroll-progress';
}

export async function restoreReadingPosition(context, { documentRef = document, windowRef = window } = {}) {
  restoreOnce(context, documentRef, windowRef);
  await new Promise((resolve) => windowRef.requestAnimationFrame(resolve));
  const result = restoreOnce(context, documentRef, windowRef);
  rememberRestoredSectionFraction(context, windowRef);
  return result;
}

export function captureInitialReadingPosition({ documentRef = document, windowRef = window } = {}) {
  const target = hashTarget(documentRef, windowRef);
  if (!target) return null;
  const context = { hashTargetId: target.id, readerMoved: false };
  const markMoved = () => { context.readerMoved = true; };
  for (const type of ['wheel', 'touchmove', 'keydown', 'pointerdown']) {
    windowRef.addEventListener(type, markMoved, { once: true, passive: true });
  }
  return context;
}

export async function restoreInitialReadingPosition(context, { documentRef = document, windowRef = window } = {}) {
  for (let pass = 0; pass < 2; pass += 1) {
    if (!context || context.readerMoved) return 'none';
    const target = documentRef.getElementById(context.hashTargetId);
    if (!target || typeof target.scrollIntoView !== 'function') return 'none';
    target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: restoreBehavior });
    if (pass === 0) await new Promise((resolve) => windowRef.requestAnimationFrame(resolve));
  }
  return 'hash';
}
