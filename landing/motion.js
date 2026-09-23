const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const animated = new Set();
const targets = document.querySelectorAll([
  '.hero-copy > *', '.hero-index',
  '.concept-intro > *',
  '.custom-copy', '.custom-diagram',
  '.community-content > *', '.site-footer',
].join(', '));

// Content stays visible without JavaScript or animation support.
if ('IntersectionObserver' in window && 'animate' in Element.prototype) {
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (reducedMotion.matches || target.contains(document.activeElement)) continue;

      const animation = target.animate([
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], {
        duration: 500,
        delay: Math.min(order++, 3) * 70,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'backwards',
      });
      const stop = () => animation.cancel();
      const cleanup = () => {
        animated.delete(animation);
        target.removeEventListener('focusin', stop);
      };
      animated.add(animation);
      target.addEventListener('focusin', stop);
      animation.addEventListener('finish', cleanup, { once: true });
      animation.addEventListener('cancel', cleanup, { once: true });
    }
  }, { threshold: 0.08 });

  if (!reducedMotion.matches) targets.forEach((target) => observer.observe(target));
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    observer.disconnect();
    animated.forEach((animation) => animation.cancel());
  });
}

const root = document.documentElement;
const header = document.querySelector('.site-header');
const navLinks = [...header.querySelectorAll('nav a[href^="#"]')];
const sections = navLinks.map((link) => document.querySelector(link.hash));
let scrollFrame = 0;
let navigationFrame = 0;

function updateScroll() {
  scrollFrame = 0;
  const maxScroll = root.scrollHeight - innerHeight;
  const progress = Math.max(0, Math.min(1, maxScroll > 0 ? scrollY / maxScroll : 0));
  root.style.setProperty('--reading-progress', progress);
  const boundary = header.getBoundingClientRect().bottom + 80;
  let active = -1;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= boundary) active = index;
  });
  if (progress > .99) active = sections.length - 1;
  navLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function scheduleScroll() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}
function measureHeader() {
  root.style.setProperty('--header-height', `${header.offsetHeight}px`);
  scheduleScroll();
}
new ResizeObserver(measureHeader).observe(header);
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', measureHeader);
window.addEventListener('load', scheduleScroll);
reducedMotion.addEventListener('change', scheduleScroll);
measureHeader();
updateScroll();

// A deliberate ease makes anchor navigation perceptible even on short sections.
// Manual scrolling stays native and immediately interrupts an anchor animation.
function cancelNavigation() {
  cancelAnimationFrame(navigationFrame);
  navigationFrame = 0;
}
window.addEventListener('wheel', cancelNavigation, { passive: true });
window.addEventListener('touchstart', cancelNavigation, { passive: true });
window.addEventListener('pointerdown', cancelNavigation, { passive: true });
window.addEventListener('popstate', cancelNavigation);
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'].includes(event.key)) cancelNavigation();
});
reducedMotion.addEventListener('change', cancelNavigation);

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;
  cancelNavigation();
  if (reducedMotion.matches || link.classList.contains('skip-link')) return;
  event.preventDefault();
  const start = scrollY;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const end = Math.max(0, Math.min(root.scrollHeight - innerHeight,
    target.getBoundingClientRect().top + start - header.offsetHeight - 24 - margin));
  const duration = Math.min(1350, 750 + Math.abs(end - start) * .18);
  const started = performance.now();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  function step(now) {
    const elapsed = Math.min(1, (now - started) / duration);
    const eased = elapsed < .5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
    window.scrollTo({ top: start + (end - start) * eased, behavior: 'instant' });
    if (elapsed < 1) navigationFrame = requestAnimationFrame(step);
    else {
      navigationFrame = 0;
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      target.focus({ preventScroll: true });
    }
  }
  navigationFrame = requestAnimationFrame(step);
});

// Draw connectors from actual element positions, including the stacked mobile layout.
const network = document.querySelector('.flow-network');
const funnels = [...network.querySelectorAll('.funnel')];
const core = network.querySelector('.shared-core');
const handoff = document.querySelector('.human-handoff');
const connectorSvg = network.querySelector('.core-connectors');
const connectorPaths = [...connectorSvg.querySelectorAll(':scope > path')];
const reveals = [...connectorSvg.querySelectorAll('.connector-reveal')];
function measureConnections() {
  const box = network.getBoundingClientRect();
  const destination = core.getBoundingClientRect();
  connectorSvg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  funnels.forEach((funnel, index) => {
    const source = funnel.getBoundingClientRect();
    const x = source.left - box.left + source.width / 2;
    const y = source.bottom - box.top;
    const endX = destination.left - box.left + destination.width / 2;
    const endY = destination.top - box.top;
    const stacked = innerWidth <= 800;
    const last = funnels.at(-1).getBoundingClientRect();
    const d = stacked
      ? (index === 1 ? `M${endX} ${last.bottom - box.top + 12} V${endY}` : '')
      : `M${x} ${y + 18} C${x} ${y + 62} ${endX} ${endY - 50} ${endX} ${endY}`;
    connectorPaths[index].setAttribute('d', d);
    reveals[index].setAttribute('d', d);
  });
}
new ResizeObserver(measureConnections).observe(network);
window.addEventListener('resize', measureConnections);
measureConnections();

if ('IntersectionObserver' in window && 'animate' in Element.prototype && !reducedMotion.matches) {
  const pending = new Set([...funnels, core, handoff]);
  let lastFlowEnd = 0;
  let coreEnd = 0;
  pending.forEach(el => el.classList.add('flow-pending'));
  network.classList.add('lines-pending');
  const run = (el, frames, duration, delay = 0) => {
    const animation = el.animate(frames, { duration, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    animated.add(animation);
    animation.finished.catch(() => {}).finally(() => animated.delete(animation));
  };
  const enter = (el, delay) => run(el, [
    { opacity: 0, transform: 'translateY(16px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], 550, delay);
  const sequence = new IntersectionObserver(entries => {
    let order = 0;
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      sequence.unobserve(target);
      pending.delete(target);
      target.classList.remove('flow-pending');
      const now = performance.now();
      if (funnels.includes(target)) {
        const delay = innerWidth > 800 ? order++ * 400 : 0;
        enter(target, delay);
        target.querySelectorAll('.stages li').forEach((stage, index) => enter(stage, delay + 100 + index * 120));
        lastFlowEnd = Math.max(lastFlowEnd, now + delay + 800);
      } else if (target === core) {
        const delay = Math.max(0, lastFlowEnd - now);
        network.classList.remove('lines-pending');
        reveals.forEach((path, index) => run(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 850, delay + index * 160));
        enter(core, delay + 1000);
        core.querySelectorAll('li').forEach((item, index) => enter(item, delay + 1150 + index * 100));
        coreEnd = now + delay + 1800;
      } else {
        enter(handoff, Math.max(0, coreEnd - now));
      }
    }
  }, { threshold: .15 });
  pending.forEach(el => sequence.observe(el));
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    sequence.disconnect();
    pending.forEach(el => el.classList.remove('flow-pending'));
    network.classList.remove('lines-pending');
  });
}
