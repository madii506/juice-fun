// JUICE: the intro, the router (/, /launch), the nav (X, the phone menu) and smooth scroll
import { $, config, reduced, stocks } from './core.js';
import { smooth, scrollTo, ScrollTrigger, gsap } from './motion.js';

// ---------------------------------------------------------------- the intro: juice pours in while the real things load
(() => {
  const el = document.getElementById('jintro');
  const home = (location.pathname.replace(/\/+$/, '') || '/') === '/';
  const want = el && home && !reduced() && !/[?&]shot\b/.test(location.search);
  if (!want) { document.documentElement.classList.remove('intro'); if (el) el.remove(); window.__intro = Promise.resolve(); return; }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.__homeSetup = new Promise(r => { window.__homeSetupDone = r; });
  window.scrollTo(0, 0);
  const list = stocks().catch(() => []);
  const box = import('./box3d.js?v=2').catch(() => null);
  const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
  const logos = list.then(l => l.filter(s => s.mint).slice(0, 28).map((s, i) => ({ mint: s.mint, ticker: s.ticker, lev: [2, 3, 5, 10, 20].filter(x => x <= (s.maxLev || 3))[(i * 2 + 1) % [2, 3, 5, 10, 20].filter(x => x <= (s.maxLev || 3)).length] })));
  window.__intro = import('./intro.js?v=5').then(m => m.runIntro({
    tasks: [[fonts], [list], [box]],
    logos,
    startAfter: window.__homeSetup,
    beforeReveal: () => (window.__juicePrep ? window.__juicePrep() : null),
  })).catch(() => { document.documentElement.classList.remove('intro'); if (el) el.remove(); });
})();

const homeEl = $('#home'), appEl = $('#app'), nav = $('#nav');
let homeReady = null;

// ---------------------------------------------------------------- routes
async function route(push) {
  const p = location.pathname.replace(/\/+$/, '') || '/';
  setSheet(false);
  if (p === '/launch') {
    homeEl.hidden = true; appEl.hidden = false;
    nav.classList.remove('on-light', 'hide'); nav.classList.add('on-app');
    ScrollTrigger.getAll().forEach(t => t.disable(false));
    scrollTo(0, { immediate: true });
    appEl.innerHTML = '';
    (await import('./launch.js?v=2')).launch(appEl);
    document.title = 'JUICE';
    return;
  }
  if (p !== '/') history.replaceState(null, '', '/' + location.hash);
  nav.classList.remove('on-app');
  appEl.hidden = true; appEl.innerHTML = ''; homeEl.hidden = false;
  ScrollTrigger.getAll().forEach(t => t.enable());
  if (!homeReady) homeReady = startHome();
  await homeReady;
  ScrollTrigger.refresh();
  const sec = location.hash;
  if (sec && /^#[a-z]+$/.test(sec) && $(sec)) setTimeout(() => scrollTo(sec, { immediate: !push, offset: -10 }), push ? 50 : 300);
}
async function startHome() {
  const H = await import('./home.js?v=4');
  await H.home();
}

// links: same-page sections scroll smoothly; app links route without a reload
document.addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  const href = a.getAttribute('href') || ''; if (!href.startsWith('/')) return;
  const u = new URL(href, location.origin);
  e.preventDefault();
  const onHome = !homeEl.hidden;
  if (u.pathname === '/' && u.hash && onHome) { history.pushState(null, '', u.hash); scrollTo(u.hash, { offset: -10 }); return; }
  if (u.pathname + u.search + u.hash === location.pathname + location.search + location.hash && !u.hash) { scrollTo(0); return; }
  history.pushState(null, '', u.pathname + u.search + u.hash);
  route(true);
});
addEventListener('popstate', () => route(false));

// ---------------------------------------------------------------- the nav: X once it is set
config().then(c => { if (!c || !c.x) return; const x = $('#navX'); x.hidden = false; x.href = /^https?:/.test(c.x) ? c.x : 'https://x.com/' + c.x.replace(/^@/, ''); });

// ---------------------------------------------------------------- the phone menu
const mb = $('#menuBtn'), ms = $('#mSheet');
function setSheet(open) {
  if (!ms || ms.hidden === !open) return;
  ms.hidden = !open; mb.setAttribute('aria-expanded', String(open)); document.documentElement.classList.toggle('menu-open', open);
  if (window.__lenis) open ? __lenis.stop() : __lenis.start();
  if (open && !reduced()) gsap.fromTo(ms.querySelectorAll('.ml, .ms-cta'), { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: 'expo.out', stagger: .04 });
}
mb.addEventListener('click', () => setSheet(ms.hidden));
ms.addEventListener('click', e => { if (e.target.closest('a')) setSheet(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setSheet(false); });

// a company logo that fails to load becomes a letter tile
document.addEventListener('error', e => {
  const im = e.target; if (!im || im.tagName !== 'IMG' || !/\/api\/logo/.test(im.src || '')) return;
  if (im.id) { im.style.visibility = 'hidden'; return; }
  const t = document.createElement('span'); t.className = 'lt ' + (im.className || ''); t.textContent = (im.alt || '').slice(0, 4); im.replaceWith(t);
}, true);

smooth();
if (document.documentElement.classList.contains('intro') && window.__lenis) { __lenis.stop(); window.__intro.then(() => { __lenis.start(); ScrollTrigger.refresh(); }); }
route(false);
