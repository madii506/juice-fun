// smooth scroll (Lenis) driven by GSAP's ticker, plus the shared reveal helpers
import { gsap, ScrollTrigger, Lenis } from './vendor-motion.js?v=1';
import { $$, reduced } from './core.js';
export { gsap, ScrollTrigger };

export let lenis = null;
export function smooth() {
  if (reduced()) { document.documentElement.classList.add('no-motion'); return null; }
  lenis = new Lenis({ lerp: .095, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  window.__lenis = lenis;
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
export function scrollTo(target, opt = {}) {
  if (lenis) lenis.scrollTo(target, { offset: opt.offset ?? 0, duration: opt.duration ?? 1.4, easing: t => 1 - Math.pow(1 - t, 4), immediate: !!opt.immediate });
  else { const el = typeof target === 'string' ? document.querySelector(target) : target; if (typeof target === 'number') window.scrollTo(0, target); else el && el.scrollIntoView({ behavior: opt.immediate ? 'auto' : 'smooth' }); }
}

// wrap every word in a mask so it can rise into place
export function splitWords(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.w>span')];
  el.dataset.split = '1';
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
        for (const p of parts) { if (!p) continue; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); continue; } const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('span'); i.textContent = p; w.appendChild(i); frag.appendChild(w); }
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
    });
  };
  walk(el);
  return [...el.querySelectorAll('.w>span')];
}
export function rise(el, opt = {}) {
  const words = splitWords(el);
  if (reduced()) return;
  gsap.set(words, { yPercent: 115, rotate: 4 });
  const play = () => gsap.to(words, { yPercent: 0, rotate: 0, duration: opt.duration || 1.05, ease: 'expo.out', stagger: opt.stagger || .055, delay: opt.delay || 0 });
  if (opt.now) return play();
  ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: play });
}
export function revealAll(root = document) {
  $$('.split', root).forEach(el => rise(el));
  if (reduced()) return;
  ScrollTrigger.batch($$('.rv', root).filter(e => !e.closest('.hero')), {
    start: 'top 90%', once: true,
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .08, overwrite: true }),
  });
}
// numbers that count up to their real value (never to a made-up one)
export function countTo(el, to, { dur = 1.4, fmt = v => Math.round(v).toLocaleString('en-US') } = {}) {
  if (to == null || !isFinite(to)) { el.textContent = '—'; return; }
  if (reduced()) { el.textContent = fmt(to); return; }
  const o = { v: Number(el.dataset.v || 0) };
  gsap.to(o, { v: to, duration: dur, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } });
  el.dataset.v = to;
}
// buttons that lean toward the cursor
export function magnetic(root = document) {
  if (reduced() || matchMedia('(pointer: coarse)').matches) return;
  $$('.mag', root).forEach(b => {
    if (b.dataset.mag) return; b.dataset.mag = '1';
    const qx = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .22); qy((e.clientY - r.top - r.height / 2) * .3); });
    b.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}
