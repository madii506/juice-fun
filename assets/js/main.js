// JUICE: the router (/, /launch), the nav (X, the phone menu) and smooth scroll
import { $, config, reduced } from './core.js';
import { smooth, scrollTo, ScrollTrigger, gsap } from './motion.js';

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
    (await import('./launch.js?v=1')).launch(appEl);
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
  const H = await import('./home.js?v=1');
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
route(false);
