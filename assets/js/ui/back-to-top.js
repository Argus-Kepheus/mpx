const defaultThresholdPx = 320;

function prefersReducedMotion(windowRef) {
  return Boolean(windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function setVisibility(control, visible) {
  control.dataset.visible = visible ? 'true' : 'false';
  if (visible) control.removeAttribute('tabindex');
  else control.setAttribute('tabindex', '-1');
}

export function setupBackToTop({
  documentRef = document,
  windowRef = window,
  thresholdPx = defaultThresholdPx
} = {}) {
  const control = documentRef.querySelector('#back-to-top');
  if (!control) return () => {};

  let framePending = false;
  const update = () => {
    framePending = false;
    const dynamicThreshold = Math.max(thresholdPx, windowRef.innerHeight * 0.5);
    setVisibility(control, windowRef.scrollY > dynamicThreshold);
  };

  const scheduleUpdate = () => {
    if (framePending) return;
    framePending = true;
    windowRef.requestAnimationFrame(update);
  };

  const activate = (event) => {
    event.preventDefault();
    windowRef.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion(windowRef) ? 'auto' : 'smooth'
    });
  };

  control.addEventListener('click', activate);
  windowRef.addEventListener('scroll', scheduleUpdate, { passive: true });
  windowRef.addEventListener('resize', scheduleUpdate, { passive: true });
  update();

  return () => {
    control.removeEventListener('click', activate);
    windowRef.removeEventListener('scroll', scheduleUpdate);
    windowRef.removeEventListener('resize', scheduleUpdate);
  };
}
