// the home page: hero (a live 3D juice box, real company logos, live tape), how it works (the phone plays it),
// the menu (Hyperliquid stock perps: spotlight, cards, map), the concentrate (split + pour a box), the shelf
// (test boxes that follow live prices), $JUICE, FAQ, end.
import { $, $$, esc, api, logo, usd, pct, chgClass, num, stocks, config, on, reduced, toast, copy } from './core.js';
import { gsap, ScrollTrigger, lenis, revealAll, countTo, magnetic } from './motion.js';
import { openStock } from './drawer.js';

const isTouch = matchMedia('(pointer: coarse)').matches;
const RM = reduced();
const isMobile = () => innerWidth < 861;
let PC = null, LIST = [];

// ---------------------------------------------------------------- the live menu
const byVol = l => l.slice().sort((a, b) => (b.vol24 || 0) - (a.vol24 || 0));
const featured = l => byVol(l).filter(s => s.price != null);
const TECH = new Set('NVDA AAPL MSFT GOOGL AMZN META NFLX AMD INTC MU ORCL PLTR TSM AVGO SNDK SMCI CRWV ARM ASML SNOW SHOP UBER RDDT SKHY TSLA'.split(' '));
const CRYPTO = new Set('COIN HOOD MSTR CRCL BMNR SBET GLXY RIOT MARA CLSK BLSH GEMI'.split(' '));
const lg = (s, cls = '') => s.mint ? `<img class="${cls}" src="${logo(s.mint)}" alt="${esc(s.ticker)}" loading="lazy">` : `<span class="lt ${cls}">${esc(s.ticker.slice(0, 4))}</span>`;
const levs = s => [2, 3, 5, 10, 20].filter(x => x <= (s.maxLev || 3));
// maintenance margin on Hyperliquid is half the initial margin at max leverage
const mmrOf = s => 1 / (2 * (s.maxLev || 10));
const liqDist = (lev, s) => Math.max(0, 1 / lev - mmrOf(s));
const px = v => usd(v);

// ---------------------------------------------------------------- hero
function hero() {
  addEventListener('pointermove', e => { if (PC) PC.setMouse(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); }, { passive: true });
  new IntersectionObserver(([en]) => PC && PC.setVisible(en.isIntersecting)).observe($('#hero'));
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => PC && PC.setScroll(s.progress * .6) });
  if (!RM) gsap.to('.hero-in', { yPercent: -12, opacity: .3, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  // squeeze the box
  const h = $('#hero'), hint = $('#sqHint');
  let hov = false;
  h.addEventListener('pointermove', e => { if (!PC || e.target.closest('a,button')) return; const on = PC.hit(e); if (on !== hov) { hov = on; h.style.cursor = on ? 'pointer' : ''; } }, { passive: true });
  h.addEventListener('pointerdown', e => { if (!PC || e.target.closest('a,button,.tape')) return; if (PC.hit(e)) { PC.squeeze(); hint.classList.add('gone'); } });
}
let PC_STARTED = false;
async function startPC() {
  if (PC_STARTED) return; PC_STARTED = true;
  const cv = $('#pc');
  try {
    if (!window.WebGLRenderingContext) throw new Error('no webgl');
    const mod = await import('./box3d.js?v=2');
    await (window.__intro || Promise.resolve());
    PC = mod.start({ canvas: cv, lite: /[?&]shot\b/.test(location.search) });
    if (LIST.length) feedBox(LIST);
    if (!RM) gsap.fromTo(cv, { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 1.1, ease: 'bounce.out', onStart: () => setTimeout(() => PC && PC.squeeze(), 650) }); else gsap.set(cv, { opacity: 1 });
    setTimeout(() => $('#sqHint').classList.add('on'), 2600);
  } catch (e) { cv.replaceWith(Object.assign(document.createElement('img'), { src: '/assets/img/favicon-512.png', className: 'pc-fallback', alt: '' })); PC = null; }
}
function feedBox(list) {
  if (!PC) return;
  PC.setStocks(featured(list).filter(s => s.ticker.length <= 9).slice(0, 14).map((s, i) => { const o = levs(s); return { ticker: s.ticker, side: i % 5 === 3 ? 'SHORT' : 'LONG', lev: o[(i * 2 + 1) % o.length] + 'X' }; }));
}

// real company logos floating around the box
const ORB = [];
function orbit(list) {
  const box = $('#orbit');
  const pick = featured(list).filter(s => s.mint).slice(0, 9);
  box.innerHTML = ''; ORB.length = 0;
  pick.forEach((s, i) => {
    const el = document.createElement('button');
    el.className = 'ob'; el.type = 'button'; el.title = s.ticker + ' · ' + s.name; el.style.pointerEvents = 'auto';
    el.innerHTML = `<img src="${logo(s.mint)}" alt="${esc(s.ticker)}" loading="lazy">`;
    el.addEventListener('click', () => openStock(s.id));
    box.appendChild(el);
    ORB.push({ el, a: i / 9 * Math.PI * 2 + .4, r: .85 + (i % 3) * .14, z: .5 + (i % 4) * .2, s: 46 + (i % 3) * 12, ph: Math.random() * 6 });
  });
  layoutOrbit();
  if (ORB_WANT) orbitIn();
}
let MX = 0, MY = 0;
addEventListener('pointermove', e => { MX = e.clientX / innerWidth - .5; MY = e.clientY / innerHeight - .5; }, { passive: true });
function layoutOrbit() {
  const W = innerWidth, H = $('#hero').offsetHeight, m = isMobile();
  const cx = m ? W * .5 : W * .735, cy = m ? H * .73 : H * .5, rx = m ? W * .4 : Math.min(W * .2, 330), ry = m ? H * .15 : Math.min(H * .32, 290);
  ORB.forEach((o, i) => { Object.assign(o, { cx, cy, rx, ry, minX: m ? 8 : W * .565, maxX: W - 16, minY: m ? H * .6 : 96, maxY: H - 150 }); const sz = m ? o.s * .78 : o.s; o.el.style.width = o.el.style.height = sz + 'px'; o.sz = sz; o.el.style.display = m && i > 5 ? 'none' : ''; });
}
addEventListener('resize', layoutOrbit);
let ORB_ON = false, ORB_WANT = false;
function orbitIn() {
  ORB_WANT = true; if (!ORB.length || ORB_ON) return;
  ORB_ON = true;
  ORB.forEach((o, i) => gsap.fromTo(o.el, { opacity: 0, scale: .2 }, { opacity: 1, scale: 1, duration: .9, ease: 'back.out(2)', delay: .4 + i * .07 }));
  if (RM) return;
  gsap.ticker.add(() => {
    if (scrollY > innerHeight * 1.2) return;
    const t = performance.now() / 1000;
    for (const o of ORB) {
      const a = o.a + t * .07 * (o.z > .8 ? 1 : .75);
      const x = Math.max(o.minX, Math.min(o.maxX - o.sz, o.cx + Math.cos(a) * o.rx * o.r + MX * 40 * o.z - o.sz / 2));
      const y = Math.max(o.minY, Math.min(o.maxY - o.sz, o.cy + Math.sin(a) * o.ry * o.r + Math.sin(t * 1.3 + o.ph) * 6 + MY * 30 * o.z - o.sz / 2)) - scrollY * (.15 + o.z * .25);
      o.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      const back = Math.sin(a) < 0; o.el.style.zIndex = back ? 1 : 3;
      o.el.classList.toggle('bh', (back || isMobile()) && Math.abs(x + o.sz / 2 - o.cx) < (isMobile() ? 92 : 150));
    }
  });
}

// a strip that moves on its own, faster while you scroll
function marquee(el, speed = .9) {
  let x = 0, half = 0; new ResizeObserver(() => { half = el.scrollWidth / 2; }).observe(el);
  let hover = false; el.addEventListener('pointerenter', () => hover = true); el.addEventListener('pointerleave', () => hover = false);
  let vis = true; new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(el);
  if (RM) return;
  gsap.ticker.add((t, dt) => { if (!vis) return; const v = lenis ? Math.min(40, Math.abs(lenis.velocity || 0)) : 0; x -= (hover ? .15 : speed + v * .6) * dt / 16; if (half && -x > half) x += half; el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`; });
}
function tape(list) {
  const tr = $('#tape .tape-track');
  const items = featured(list).slice(0, 26);
  if (!items.length) { tr.innerHTML = '<span class="ti">—</span>'; return; }
  const row = items.map(s => `<span class="ti" data-id="${esc(s.id)}">${lg(s)}<b>${esc(s.ticker)}</b><span class="p" data-p>${px(s.price)}</span><span class="chg ${chgClass(s.chg24)}" data-c>${pct(s.chg24)}</span><span class="lv">${s.maxLev || '—'}x</span></span>`).join('');
  tr.innerHTML = row + row;
  tr.onclick = e => { const t = e.target.closest('.ti'); if (t) openStock(t.dataset.id); };
  marquee(tr);
}
on('stocks', ({ list, prev }) => {
  if (!prev) return;
  LIST = list;
  const old = new Map(prev.map(s => [s.id, s.price]));
  $$('#tape .ti').forEach(el => {
    const s = list.find(x => x.id === el.dataset.id); if (!s) return;
    const p = el.querySelector('[data-p]'), c = el.querySelector('[data-c]'), was = old.get(s.id);
    if (p.textContent !== px(s.price)) { p.textContent = px(s.price); el.classList.remove('flash-up', 'flash-dn'); void el.offsetWidth; el.classList.add(s.price > was ? 'flash-up' : 'flash-dn'); }
    c.textContent = pct(s.chg24); c.className = 'chg ' + chgClass(s.chg24);
  });
  $$('#sgrid2 .sk2').forEach(el => { const s = list.find(x => x.id === el.dataset.id); if (!s) return; const p = el.querySelector('.px'), was = old.get(s.id); if (p.textContent !== px(s.price)) { p.textContent = px(s.price); el.classList.remove('flash-up', 'flash-dn'); void el.offsetWidth; el.classList.add(s.price > was ? 'flash-up' : 'flash-dn'); } const c = el.querySelector('.chg'); c.textContent = pct(s.chg24); c.className = 'chg ' + chgClass(s.chg24); });
  if (VIEW === 'map') drawMap(false);
  SPOT.refresh(list);
  SHELF.tick();
  TODAY.update(list);
});

// ---------------------------------------------------------------- 01 how it works: the phone plays the four steps
function how() {
  const items = $$('#hsteps li'), bars = $$('#hsteps .bar i'), screens = $$('.ps'), chip = $('#phChip');
  const nameEl = $('#phName'), tkEl = $('#phTk'), btn = $('.ph-btn'), ring = $('#phRing');
  const trades = $('#phTrades'), prog = $('#phProg'), dot = $('.sw-line i'), bought = $('#phBought'), fill = $('#phFill'), dist = $('#phDist'), pay = $('#phPay');
  const JB = '<svg viewBox="2 0 17 24"><use href="#jmono"/></svg>';
  trades.innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="tr"><span class="d ${i % 3 === 1 ? 's' : 'b'}">${i % 3 === 1 ? 'S' : 'B'}</span><span class="l"><i style="width:${30 + (i * 37) % 60}%"></i></span><span class="f">${JB}</span></div>`).join('');
  const STEPS = [['TSLA up', 'position'], ['Profit taken', 'USDC'], ['Swapped', 'to SOL'], ['Bought back', '$TJUICE'], ['Burned', 'on-chain']];
  pay.innerHTML = STEPS.map(([a, b], i) => `<div class="py"><span class="a" style="background:${['#ffd23f', '#ffffff', '#ffb37a', '#ffd23f', '#2a1609'][i]}"></span><span class="l"><b><i data-w="${[92, 74, 58, 44, 30][i]}"></i></b><span>${a} · ${b}</span></span><span class="ok">✓</span></div>`).join('');
  const trRows = $$('.tr', trades), payRows = $$('.py', pay);
  let cur = -1;
  const NAME = 'Tesla Juice', TK = '$TJUICE';
  const D = 1 / 5 - 1 / 20; // 5x on a 10x market: spills 15% away
  function render(i, sub) {
    bars.forEach((b, j) => { b.style.width = j === i ? (sub * 100) + '%' : '0%'; });
    if (i !== cur) {
      const prev = cur; cur = i;
      items.forEach((li, j) => li.classList.toggle('on', j === i));
      screens.forEach((s, j) => { if (j === i) { s.classList.add('on'); gsap.fromTo(s, { opacity: 0, x: prev < i ? 30 : -30 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out', overwrite: true }); } else s.classList.remove('on'); });
      if (!RM) gsap.fromTo('#phone', { rotate: prev < i ? -1.5 : 1.5 }, { rotate: 0, duration: .8, ease: 'elastic.out(1,.5)' });
    }
    const s1 = i > 0 ? 1 : sub;
    nameEl.textContent = NAME.slice(0, Math.round(Math.min(1, s1 * 2.2) * NAME.length));
    tkEl.textContent = s1 > .4 ? TK.slice(0, Math.round(Math.min(1, (s1 - .4) * 5) * TK.length)) : '';
    btn.classList.toggle('done', s1 > .78);
    chip.textContent = i === 0 && s1 <= .78 ? 'New coin' : 'Juiced'; chip.classList.toggle('is-live', !(i === 0 && s1 <= .78));
    const s2 = i > 1 ? 1 : i === 1 ? sub : 0;
    ring.style.strokeDashoffset = String(201 * (1 - Math.min(1, s2 * 1.15)));
    trRows.forEach((r, j) => { const on = s2 * 10 > j; r.style.opacity = on ? 1 : 0; r.style.transform = on ? 'none' : 'translateY(-14px)'; r.style.transition = 'opacity .35s, transform .35s'; });
    const s3 = i > 2 ? 1 : i === 2 ? sub : 0;
    prog.style.width = Math.min(100, s3 * 125) + '%'; dot.style.left = `calc(${Math.min(100, s3 * 125)}% - 6px)`;
    bought.classList.toggle('on', s3 > .8);
    const f = Math.min(1, Math.max(0, (s3 - .3) * 1.6));
    fill.style.height = (f * D / .5 * 100 + (1 - f) * 0).toFixed(1) + '%';
    dist.textContent = s3 > .35 ? '−' + (D * 100 * Math.min(1, f + .001)).toFixed(1) + '%' : '—';
    const s4 = i === 3 ? sub : 0;
    payRows.forEach((r, j) => { const on = s4 * 6.5 > j; const b = r.querySelector('b i'); b.style.width = on ? b.dataset.w + '%' : '0%'; b.style.transition = 'width .6s cubic-bezier(.2,.7,.2,1)'; const ok = r.querySelector('.ok'); ok.style.opacity = on ? 1 : 0; ok.style.transform = on ? 'scale(1)' : 'scale(.6)'; ok.style.transition = 'opacity .3s, transform .4s cubic-bezier(.34,1.56,.64,1)'; });
  }
  const STEP = 3.4; let i = 0, t = 0, vis = false, last = 0;
  render(0, 0);
  $('#hsteps').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; i = +b.dataset.i; t = 0; render(i, 0); });
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: .35 }).observe($('#how'));
  if (RM) { render(3, 1); return; }
  gsap.ticker.add(() => {
    const now = performance.now(), dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    if (!vis || document.hidden) return;
    t += dt; if (t >= STEP) { t = 0; i = (i + 1) % 4; }
    render(i, Math.min(1, t / (STEP * .82)));
  });
}

// ---------------------------------------------------------------- 03 the menu: cards (real logos) or the market map
let FILTER = 'top', QUERY = '', VIEW = 'cards', SHOWALL = false;
function stockList() {
  const L = LIST.filter(s => s.price != null);
  const q = QUERY.toLowerCase();
  let f = L;
  if (q) f = L.filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  else if (FILTER === 'preipo') f = L.filter(s => s.kind === 'preipo');
  else if (FILTER === 'tech') f = L.filter(s => TECH.has(s.ticker));
  else if (FILTER === 'crypto') f = L.filter(s => CRYPTO.has(s.ticker));
  else if (FILTER === 'etf') f = L.filter(s => /index|commodity|fx/.test(s.kind));
  const u = byVol(f);
  if (FILTER === 'up') return u.filter(s => s.chg24 != null).sort((a, b) => b.chg24 - a.chg24);
  if (FILTER === 'down') return u.filter(s => s.chg24 != null).sort((a, b) => a.chg24 - b.chg24);
  return u;
}
const card = s => `<button class="sk2${s.kind === 'preipo' ? ' pre' : ''}" data-id="${esc(s.id)}" type="button">
  <span class="top"><span class="lg">${lg(s)}</span><span class="iss">up to ${s.maxLev || '—'}x</span></span>
  <span class="tkr">${esc(s.ticker)}</span><span class="nm">${esc(s.name)}</span>
  <span class="row"><span class="px">${px(s.price)}</span><span class="chg ${chgClass(s.chg24)}">${pct(s.chg24)}</span></span>
  <span class="vb"><span>vol ${usd(s.vol24, 0)}</span><span>${s.funding != null ? 'fund ' + (s.funding * 100).toFixed(4) + '%' : ''}</span></span></button>`;
function drawStocks(animate) {
  const grid = $('#sgrid2'), all = stockList();
  const n = SHOWALL || QUERY ? all.length : (isMobile() ? 8 : 12);
  if (VIEW === 'cards') {
    grid.innerHTML = all.slice(0, n).map(card).join('') || '<p class="muted">Nothing matches that.</p>';
    if (animate && !RM) gsap.fromTo($$('.sk2', grid), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: 'power3.out', stagger: .025 });
    $('.smore').hidden = QUERY || all.length <= n && !SHOWALL;
    $('#moreStocks').innerHTML = SHOWALL ? 'Show fewer' : `Show all <span>${all.length}</span>`;
  } else drawMap(animate);
}
function stocksSec() {
  const grid = $('#sgrid2');
  const pick = id => { const s = LIST.find(x => x.id === id); if (!s) return; SPOT.show(s, true); const r = $('#spot').getBoundingClientRect(); if (r.top < 60 || r.top > innerHeight * .5) lenis ? lenis.scrollTo('#spot', { offset: -90, duration: 1.1 }) : $('#spot').scrollIntoView({ behavior: 'smooth' }); };
  grid.onclick = e => { const c = e.target.closest('.sk2'); if (c) pick(c.dataset.id); };
  $('#mapBox').onclick = e => { const t = e.target.closest('.mt'); if (t) pick(t.dataset.id); };
  tilt(grid);
  $('#stockChips').onclick = e => { const b = e.target.closest('.chip'); if (!b || b.classList.contains('on')) return; $$('#stockChips .chip').forEach(x => x.classList.toggle('on', x === b)); FILTER = b.dataset.k; SHOWALL = false; QUERY = ''; $('#stockQ').value = ''; drawStocks(true); };
  let qt = null; $('#stockQ').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { QUERY = e.target.value.trim(); drawStocks(false); }, 120); });
  $('#viewSeg').onclick = e => { const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return; $$('#viewSeg button').forEach(x => x.classList.toggle('on', x === b)); VIEW = b.dataset.v; $('#sgrid2').hidden = VIEW !== 'cards'; $('#mapBox').hidden = VIEW !== 'map'; $('.smore').hidden = VIEW !== 'cards'; drawStocks(true); ScrollTrigger.refresh(); };
  $('#moreStocks').onclick = () => { SHOWALL = !SHOWALL; drawStocks(false); ScrollTrigger.refresh(); if (!SHOWALL) $('#stocks').scrollIntoView({ block: 'start' }); };
  let rt = null; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => VIEW === 'map' && drawMap(false), 200); });
}
// the spotlight: one market big, with its live chart; it cycles through the top names until you pick one
const SPOT = (() => {
  const box = $('#spot'), cv = $('#spCv'), g = cv.getContext('2d'), tip = $('#spTip'), note = $('#spNote'), pickBox = $('#spPick');
  let cur = null, tf = '24h', pts = null, auto = true, picks = [], idx = 0, t0 = 0, vis = false, wipe = 1, hover = -1;
  const cache = new Map();
  const DPR = Math.min(2, devicePixelRatio || 1);
  function size() { const r = cv.getBoundingClientRect(); if (!r.width) return; cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR); draw(); }
  new ResizeObserver(size).observe(cv);
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: .25 }).observe(box);
  const fmtT = ms => { const d = new Date(ms * 1000); return tf === '24h' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit' }); };
  function geo() {
    const W = cv.width, H = cv.height, ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * .14 || hi * .01;
    return { W, H, lo, hi, X: i => 8 * DPR + i / (pts.length - 1) * (W - 16 * DPR), Y: v => H - 14 * DPR - (v - lo + pad) / (hi - lo + pad * 2) * (H - 28 * DPR) };
  }
  function draw() {
    const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.09)'; for (let i = 1; i < 4; i++) g.fillRect(0, Math.round(H * i / 4), W, Math.max(1, DPR));
    if (!pts) return;
    const { X, Y } = geo(), n = Math.max(2, Math.round(pts.length * wipe));
    const line = () => { g.moveTo(X(0), Y(pts[0][1])); for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(X(i), Y(pts[i][1]), (X(i) + X(i + 1)) / 2, (Y(pts[i][1]) + Y(pts[i + 1][1])) / 2); g.lineTo(X(n - 1), Y(pts[n - 1][1])); };
    g.beginPath(); line(); g.lineTo(X(n - 1), H); g.lineTo(X(0), H); g.closePath(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
    g.beginPath(); line();
    g.strokeStyle = '#fff'; g.lineWidth = 3 * DPR; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
    const k = hover >= 0 && wipe >= 1 ? hover : n - 1, x = X(k), y = Y(pts[k][1]);
    if (hover >= 0) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(Math.round(x), 0, Math.max(1, DPR), H); }
    g.beginPath(); g.arc(x, y, 7 * DPR, 0, 7); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.arc(x, y, 3.2 * DPR, 0, 7); g.fillStyle = '#ff6f12'; g.fill();
  }
  cv.addEventListener('pointermove', e => {
    if (!pts) return; const r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;
    hover = Math.max(0, Math.min(pts.length - 1, Math.round(fx * (pts.length - 1)))); auto = false; draw();
    const p = pts[hover]; tip.hidden = false; tip.textContent = `${px(p[1])} · ${fmtT(p[0])}`;
    const tx = Math.min(r.width - tip.offsetWidth - 6, Math.max(6, e.clientX - r.left - tip.offsetWidth / 2)); tip.style.transform = `translateX(${tx}px)`;
  });
  cv.addEventListener('pointerleave', () => { hover = -1; tip.hidden = true; draw(); });
  async function loadChart(s) {
    const key = s.coin + tf; note.innerHTML = '&nbsp;';
    if (!cache.has(key)) cache.set(key, api.get('chart', { c: s.coin, tf }).then(r => r.pts).catch(() => null));
    const p = await cache.get(key); if (cur !== s && (!cur || cur.id !== s.id)) return;
    pts = p && p.length > 2 ? p : null; hover = -1;
    if (!pts) { cache.delete(key); draw(); note.textContent = 'No chart right now: Hyperliquid did not answer.'; $('#spRange').hidden = true; return; }
    const ch = (pts[pts.length - 1][1] / pts[0][1] - 1) * 100, ys = pts.map(q => q[1]), lo = Math.min(...ys), hi = Math.max(...ys), last = ys[ys.length - 1];
    note.textContent = tf === '24h' ? `15-minute candles · Hyperliquid · ${s.coin}` : `7d ${pct(ch)} · 1-hour candles · Hyperliquid`;
    $('#srLbl').textContent = tf + ' range'; $('#srLo').textContent = px(lo); $('#srHi').textContent = px(hi);
    $('#srDot').style.left = (hi > lo ? (last - lo) / (hi - lo) * 100 : 50).toFixed(1) + '%'; $('#spRange').hidden = false;
    if (RM) { wipe = 1; draw(); return; }
    const o = { k: 0 }; gsap.to(o, { k: 1, duration: .9, ease: 'power2.out', onUpdate: () => { wipe = o.k; draw(); } });
  }
  function show(s, manual) {
    if (!s) return; if (manual) auto = false; cur = s; t0 = performance.now();
    const im = $('#spLogo'), lt = $('#spLetter');
    if (s.mint) { im.src = logo(s.mint); im.hidden = false; lt.hidden = true; } else { im.hidden = true; lt.hidden = false; lt.textContent = s.ticker.slice(0, 4); }
    $('#spTk').textContent = s.ticker; $('#spName').textContent = s.name + ' · ' + (s.kind === 'preipo' ? 'pre-IPO perp' : 'perp') + ' · up to ' + (s.maxLev || '—') + 'x';
    $('#spPx').textContent = px(s.price); const c = $('#spChg'); c.textContent = pct(s.chg24) + ' 24h'; c.className = 'chg ' + chgClass(s.chg24);
    const f = s.funding != null ? s.funding * 100 : null;
    $('#spStats').innerHTML = [['Max leverage', s.maxLev ? s.maxLev + 'x' : '—'], ['24h volume', usd(s.vol24)], ['Open interest', usd(s.oi)], ['Funding / 1h', f != null ? f.toFixed(4) + '%' : '—'], ['Funding / yr', f != null ? (f * 24 * 365).toFixed(1) + '%' : '—'], ['5x spills at', pct(-liqDist(Math.min(5, s.maxLev || 5), s) * 100, 1)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('#spGo').href = '/launch?stock=' + encodeURIComponent(s.id); $('#spGo').innerHTML = `Juice a coin with ${esc(s.ticker)} <i class="arr">→</i>`;
    $$('button', pickBox).forEach(b => b.classList.toggle('on', b.dataset.id === s.id));
    if (!RM) gsap.fromTo(['#spLogo', '#spLetter', '#spTk', '#spName', '#spPx', '#spChg'], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out', stagger: .04, overwrite: true });
    loadChart(s);
  }
  $('#spTf').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return; $$('#spTf button').forEach(x => x.classList.toggle('on', x === b)); tf = b.dataset.tf; auto = false; if (cur) loadChart(cur); });
  pickBox.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const s = picks.find(x => x.id === b.dataset.id); idx = picks.indexOf(s); show(s, true); });
  function setList(list) {
    const top = featured(list).filter(s => s.mint).slice(0, 4);
    const pre = featured(list).filter(s => s.kind === 'preipo' && s.mint).slice(0, 1);
    const idx2 = featured(list).filter(s => /index|commodity/.test(s.kind)).slice(0, 1);
    picks = [...top.slice(0, 2), ...pre, ...top.slice(2), ...idx2].filter((s, i, a) => a.findIndex(x => x.id === s.id) === i).slice(0, 6);
    pickBox.innerHTML = picks.map(s => `<button type="button" data-id="${esc(s.id)}" title="${esc(s.name)}">${lg(s)}<i></i></button>`).join('');
    if (!cur && picks.length) show(picks[0]);
  }
  gsap.ticker.add(() => {
    const b = $('button.on > i:last-child', pickBox); const k = auto && cur ? Math.min(1, (performance.now() - t0) / 7000) : 0;
    if (b) b.style.transform = `scaleX(${k})`;
    if (!auto || !vis || document.hidden || !picks.length || RM) { if (!vis || document.hidden) t0 = performance.now() - (auto ? Math.min(7000, performance.now() - t0) : 0); return; }
    if (performance.now() - t0 > 7000) { idx = (picks.findIndex(x => x.id === cur.id) + 1) % picks.length; show(picks[idx]); }
  });
  return { show, setList, refresh(list) { if (!cur) return; const s = list.find(x => x.id === cur.id); if (s) { cur = s; $('#spPx').textContent = px(s.price); const c = $('#spChg'); c.textContent = pct(s.chg24) + ' 24h'; c.className = 'chg ' + chgClass(s.chg24); } } };
})();

// cards lean toward the cursor
function tilt(root) {
  if (RM || isTouch) return;
  root.addEventListener('pointermove', e => {
    const c = e.target.closest('.sk2, .ft, .vs-col, .sbox, .td-c'); if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(700px) rotateY(${(x * 9).toFixed(2)}deg) rotateX(${(-y * 9).toFixed(2)}deg) translateY(-4px)`;
  });
  root.addEventListener('pointerout', e => { const c = e.target.closest('.sk2, .ft, .vs-col, .sbox, .td-c'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
}

// 02 why: the two columns come in row by row
function why() {
  tilt($('#vs'));
  if (RM) return;
  const rows = $$('#vs li');
  gsap.set(rows, { opacity: 0, y: 18 }); gsap.set('.vs-mid span', { scale: 0 });
  ScrollTrigger.create({ trigger: '#vs', start: 'top 78%', once: true, onEnter: () => {
    gsap.to('.vs-a li', { opacity: 1, y: 0, duration: .55, ease: 'power3.out', stagger: .07 });
    gsap.to('.vs-b li', { opacity: 1, y: 0, duration: .55, ease: 'power3.out', stagger: .07, delay: .25 });
    gsap.to('.vs-mid span', { scale: 1, duration: .7, ease: 'back.out(2.4)', delay: .15 });
  } });
}

// faint pixel boxes drift as you scroll
function drops() {
  if (RM) return;
  $$('.bgdrop').forEach((d, i) => gsap.fromTo(d, { y: 120, rotate: i % 2 ? -8 : 8 }, { y: -120, rotate: i % 2 ? 6 : -6, ease: 'none', scrollTrigger: { trigger: d.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
}

// the market map: every stock in the filter, sized by liquidity, colored by its day
function squarify(items, x, y, w, h) {
  const out = [], total = items.reduce((a, b) => a + b.v, 0); if (!total) return out;
  const scale = w * h / total; let rest = items.map(i => ({ ...i, a: i.v * scale })), rx = x, ry = y, rw = w, rh = h;
  while (rest.length) {
    const sh = Math.min(rw, rh); let row = [], best = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const r = [...row, rest[i]], sum = r.reduce((a, b) => a + b.a, 0);
      const worst = Math.max(...r.map(t => Math.max(sh * sh * t.a / (sum * sum), sum * sum / (sh * sh * t.a))));
      if (worst > best && row.length) break; best = worst; row = r;
    }
    const sum = row.reduce((a, b) => a + b.a, 0);
    if (rw >= rh) { const cw = sum / rh; let yy = ry; for (const t of row) { const th = t.a / cw; out.push({ ...t, x: rx, y: yy, w: cw, h: th }); yy += th; } rx += cw; rw -= cw; }
    else { const ch = sum / rw; let xx = rx; for (const t of row) { const tw = t.a / ch; out.push({ ...t, x: xx, y: ry, w: tw, h: ch }); xx += tw; } ry += ch; rh -= ch; }
    rest = rest.slice(row.length);
  }
  return out;
}

const heat = c => { if (c == null || !isFinite(c)) return '#c94a00'; const k = Math.min(1, Math.abs(c) / 6); return c >= 0 ? `hsl(152 ${50 + k * 25}% ${20 + k * 16}%)` : `hsl(3 ${58 + k * 22}% ${27 + k * 17}%)`; };
function drawMap(animate) {
  const box = $('#mapBox'); if (!box || box.hidden || !LIST.length) return;
  const W = box.clientWidth, H = box.clientHeight, G = 3;
  const items = stockList().filter(s => s.vol24).slice(0, isMobile() ? 34 : 64).map(s => ({ s, v: Math.sqrt(s.vol24) }));
  box.innerHTML = squarify(items, 0, 0, W, H).map(r => {
    const s = r.s, fs = Math.max(12, Math.min(30, r.w / 6.2, r.h / 3.2)), fits = r.h > 54 && (s.ticker.length * fs * .62 + 60) < r.w, xs = r.w < 46 || r.h < 40;
    return `<div class="mt${fits ? '' : ' s'}${xs ? ' xs' : ''}${s.kind === 'preipo' ? ' pre' : ''}" data-id="${esc(s.id)}" title="${esc(s.ticker)} · ${esc(s.name)} · ${pct(s.chg24)}" style="--fs:${fs.toFixed(1)}px;left:${(r.x + G / 2).toFixed(1)}px;top:${(r.y + G / 2).toFixed(1)}px;width:${Math.max(0, r.w - G).toFixed(1)}px;height:${Math.max(0, r.h - G).toFixed(1)}px;background:${heat(s.chg24)}"><div class="tp">${s.mint ? `<img src="${logo(s.mint)}" alt="" loading="lazy">` : ''}<b>${esc(s.ticker)}</b></div><span class="p">${pct(s.chg24)}</span></div>`;
  }).join('');
  if (animate && !RM) gsap.fromTo($$('.mt', box), { scale: .3, opacity: 0 }, { scale: 1, opacity: 1, duration: .7, ease: 'back.out(1.6)', stagger: { each: .012 } });
}

// ---------------------------------------------------------------- 04 the split + pour a box (the math)
function split() {
  const segs = $('#dSegs'), items = $$('#legend li'), C = 2 * Math.PI * 80;
  let acc = 0;
  const parts = items.map(li => { const n = +li.querySelector('b').dataset.n, c = li.dataset.c; li.querySelector('i').style.background = c; const p = { n, c, off: acc }; acc += n; return p; });
  segs.innerHTML = parts.map((p, i) => `<circle class="d-seg" data-i="${i}" cx="100" cy="100" r="80" stroke="${p.c}" stroke-dasharray="0 ${C}" stroke-dashoffset="${-C * p.off / 100}"/>`).join('');
  const circles = $$('.d-seg', segs);
  const draw = k => circles.forEach((c, i) => { const p = parts[i], len = Math.max(0, Math.min(p.n, k * 100 - p.off)) / 100 * C; c.setAttribute('stroke-dasharray', `${Math.max(0, len - (len > 3 ? 2.5 : 0))} ${C}`); });
  if (RM) draw(1);
  else ScrollTrigger.create({ trigger: '#donut', start: 'top 85%', once: true, onEnter: () => { const o = { k: 0 }; gsap.to(o, { k: 1, duration: 1.6, ease: 'power3.inOut', onUpdate: () => draw(o.k) }); items.forEach((li, i) => setTimeout(() => countTo(li.querySelector('b'), parts[i].n, { dur: 1.2 }), 200 + i * 140)); } });
  const mid = $('#dPct'), lbl = $('#dLbl');
  const hot = i => { circles.forEach((c, j) => c.classList.toggle('hot', j === i)); items.forEach((li, j) => li.classList.toggle('hot', j === i)); if (i == null) { mid.textContent = '100%'; lbl.textContent = 'of every creator fee'; } else { mid.textContent = parts[i].n + '%'; lbl.textContent = items[i].querySelector('em').textContent; } };
  items.forEach((li, i) => { li.addEventListener('pointerenter', () => hot(i)); li.addEventListener('pointerleave', () => hot(null)); });
  circles.forEach((c, i) => { c.style.pointerEvents = 'stroke'; c.addEventListener('pointerenter', () => hot(i)); c.addEventListener('pointerleave', () => hot(null)); });
}
// a liquid in an SVG box: level 0..1, with a moving surface
function liquid(rect, wave, top, bottom) {
  let lvl = 0, want = 0, vis = true;
  new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(rect.ownerSVGElement);
  const tick = () => {
    if (!vis) return;
    lvl += (want - lvl) * .08;
    const y = bottom - (bottom - top) * lvl, t = performance.now() / 600;
    rect.setAttribute('y', y.toFixed(2));
    let d = `M0 ${y + 4}`;
    for (let x = 0; x <= 120; x += 6) d += ` L${x} ${(y + Math.sin(t + x / 14) * 2.4 * (lvl > .02 ? 1 : 0)).toFixed(2)}`;
    wave.setAttribute('d', d + ` L120 ${y + 6} L0 ${y + 6}Z`);
  };
  if (RM) return { set(v) { lvl = want = v; tick(); } };
  gsap.ticker.add(tick);
  return { set(v) { want = v; } };
}
async function calc(list) {
  const cfg = await config();
  const feeBps = cfg && cfg.pumpCreatorFeeBps != null ? cfg.pumpCreatorFeeBps : null, posPct = cfg ? cfg.split.position : 70;
  const top = featured(list).filter(s => s.mint).slice(0, 4), ix = featured(list).find(s => /index|commodity/.test(s.kind));
  const picks = ix ? [...top.slice(0, 3), ix, ...top.slice(3)] : top;
  let sel = picks[0], lev = 5;
  const box = $('#cStock'), lb = $('#cLev');
  box.innerHTML = picks.map((s, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-id="${esc(s.id)}">${lg(s)}${esc(s.ticker)}</button>`).join('');
  const drawLev = () => { const o = levs(sel || {}); if (!o.includes(lev)) lev = o.filter(x => x <= lev).pop() || o[0]; lb.innerHTML = [2, 3, 5, 10, 20].map(x => `<button type="button" data-l="${x}" class="${x === lev ? 'on' : ''}" ${o.includes(x) ? '' : 'disabled'}>${x}x</button>`).join(''); };
  box.onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('button', box).forEach(x => x.classList.toggle('on', x === b)); sel = LIST.find(s => s.id === b.dataset.id) || sel; drawLev(); upd(); gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); };
  lb.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; lev = +b.dataset.l; $$('button', lb).forEach(x => x.classList.toggle('on', x === b)); upd(); gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); };
  const vol = $('#cVol'), big = $('#oDay');
  const L = liquid($('#cjLiquid'), $('#cjWave'), 40, 164);
  const V = () => Math.pow(10, 3 + 4 * vol.value / 100);
  function upd() {
    vol.style.setProperty('--p', vol.value + '%');
    const v = V(); $('#oVol').textContent = usd(v, 0);
    if (!sel) return;
    const d = liqDist(lev, sel); L.set(Math.max(.03, Math.min(1, d / .5)));
    $('#cjPct').textContent = '−' + (d * 100).toFixed(1) + '%';
    $('#oLiq').textContent = (sel.price ? `${pct(-d * 100, 1)} · ${px(sel.price * (1 - d))}` : pct(-d * 100, 1));
    if (feeBps == null) { big.textContent = '—'; $('#oPos').textContent = '—'; $('#oWin').textContent = '—'; $('#oMonth').textContent = '—'; $('#oNote').textContent = 'pump.fun creator fee: could not read it from the chain right now'; return; }
    const m = v * feeBps / 1e4 * posPct / 100;
    big.textContent = usd(m) + ' / day';
    $('#oPos').textContent = `a ${usd(m * lev)} long on ${sel.ticker} at ${lev}x`;
    $('#oWin').textContent = usd(m * lev * .05);
    $('#oMonth').textContent = usd(m * 30) + ' margin';
    $('#oNote').textContent = `creator fee ${(feeBps / 100).toFixed(2)}% (read on-chain) · ${posPct}% pours into ${sel.ticker} at ${lev}x · maintenance ${(mmrOf(sel) * 100).toFixed(1)}% · math, not a promise`;
  }
  vol.oninput = upd; drawLev(); upd();
  on('stocks', ({ list }) => { sel = list.find(s => s.id === sel.id) || sel; upd(); });
}

// ---------------------------------------------------------------- 05 the shelf: test boxes that follow live prices
const SHELF = (() => {
  const KEY = 'juice:boxes';
  let boxes = []; try { boxes = JSON.parse(localStorage.getItem(KEY) || '[]').filter(b => b && b.id && b.entry > 0).slice(0, 6); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(boxes)); } catch {} };
  let sel = null, lev = 5, side = 'long', ready = false;
  const shelf = () => $('#shelf');
  const SVG = (id, lvl, col) => `<svg viewBox="0 0 120 170" aria-hidden="true"><defs><clipPath id="c${id}"><rect x="14" y="40" width="92" height="124" rx="9"/></clipPath></defs><path d="M86 40V6l18-4" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="40" width="92" height="124" rx="9" fill="rgba(42,22,9,.22)" stroke="#fff" stroke-width="5"/><g clip-path="url(#c${id})"><rect class="lq" x="10" y="${(164 - 124 * lvl).toFixed(1)}" width="100" height="130" fill="${col}"/></g></svg>`;
  function state(b) {
    const s = LIST.find(x => x.id === b.id), mark = s ? s.price : null;
    if (mark == null) return { s, mark, pnl: null, lvl: .5, spilled: false };
    const r = (mark / b.entry - 1) * (b.side === 'short' ? -1 : 1), eq = 1 + b.lev * r, mm = b.mmr * b.lev;
    const spilled = b.spilled || eq <= mm;
    return { s, mark, pnl: b.lev * r * 100, lvl: spilled ? 0 : Math.max(.02, Math.min(1, (eq - mm) / (1 - mm) * (1 / b.lev - b.mmr) / .5)), spilled, dist: spilled ? 0 : (eq - mm) / b.lev };
  }
  function render() {
    const el = shelf(); if (!el) return;
    if (!boxes.length) { el.innerHTML = `<div class="sh-empty"><span class="she-box"><svg viewBox="2 0 17 24"><use href="#jmono"/></svg></span><b>Your boxes stand here.</b><span>Pour one: it opens at the live price.</span></div>`; return; }
    el.innerHTML = boxes.map((b, i) => {
      const st = state(b); if (st.spilled && !b.spilled) { b.spilled = true; save(); }
      const col = st.spilled ? 'transparent' : st.pnl >= 0 ? '#ffd23f' : '#ffb37a';
      return `<div class="sbox${st.spilled ? ' spilled' : ''}" data-i="${i}"><button class="sb-x" type="button" data-x="${i}" aria-label="Remove">×</button>
        <div class="sb-svg">${SVG('b' + i, st.lvl, col)}<span class="sb-lg">${st.s ? lg(st.s) : ''}</span></div>
        <div class="sb-t"><b>${esc(b.id)}</b><span>${b.lev}x ${b.side}</span></div>
        <div class="sb-n"><span class="chg ${chgClass(st.pnl)}">${st.pnl == null ? '—' : pct(st.pnl, 1)}</span><span class="mono">${st.spilled ? 'spilled' : st.dist != null ? (st.dist * 100).toFixed(1) + '% to spill' : '—'}</span></div>
        <div class="sb-m mono">in ${px(b.entry)} · now ${px(st.mark)}</div>
        ${st.spilled ? `<button class="btn btn-sm btn-white sb-re" type="button" data-re="${i}">Refill at ${px(st.mark)}</button>` : ''}</div>`;
    }).join('');
  }
  function tick() { if (!ready) return; $$('#shelf .sbox').forEach(el => { const b = boxes[+el.dataset.i]; if (!b) return; const st = state(b); const q = el.querySelector('.lq'); if (q) { q.setAttribute('y', (164 - 124 * st.lvl).toFixed(1)); q.setAttribute('fill', st.spilled ? 'transparent' : st.pnl >= 0 ? '#ffd23f' : '#ffb37a'); } const c = el.querySelector('.chg'); c.textContent = st.pnl == null ? '—' : pct(st.pnl, 1); c.className = 'chg ' + chgClass(st.pnl); el.querySelector('.sb-n .mono').textContent = st.spilled ? 'spilled' : st.dist != null ? (st.dist * 100).toFixed(1) + '% to spill' : '—'; el.querySelector('.sb-m').textContent = `in ${px(b.entry)} · now ${px(st.mark)}`; if (st.spilled && !b.spilled) { b.spilled = true; save(); render(); } }); }
  function setup(list) {
    const picks = featured(list).slice(0, 7);
    sel = picks[0];
    const sb = $('#prStock'), lb = $('#prLev');
    sb.innerHTML = picks.map((s, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-id="${esc(s.id)}">${lg(s)}${esc(s.ticker)}</button>`).join('');
    const drawLev = () => { const o = levs(sel || {}); if (!o.includes(lev)) lev = o.filter(x => x <= lev).pop() || o[0]; lb.innerHTML = [2, 3, 5, 10, 20].map(x => `<button type="button" data-l="${x}" class="${x === lev ? 'on' : ''}" ${o.includes(x) ? '' : 'disabled'}>${x}x</button>`).join(''); };
    drawLev();
    sb.onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('button', sb).forEach(x => x.classList.toggle('on', x === b)); sel = LIST.find(s => s.id === b.dataset.id) || sel; drawLev(); };
    lb.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; lev = +b.dataset.l; $$('button', lb).forEach(x => x.classList.toggle('on', x === b)); };
    $('#prSide').onclick = e => { const b = e.target.closest('button'); if (!b) return; side = b.dataset.s; $$('#prSide button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#prGo').onclick = async () => {
      if (!sel) return;
      const fresh = (await stocks(true).catch(() => LIST)).find(s => s.id === sel.id) || sel;
      if (!fresh.price) { toast('No live price right now. Try again in a moment.', true); return; }
      boxes.unshift({ id: fresh.id, lev, side, entry: fresh.price, at: Date.now(), mmr: mmrOf(fresh) }); boxes = boxes.slice(0, 6); save(); render();
      const first = $('#shelf .sbox'); if (first && !RM) { gsap.fromTo(first, { y: -60, opacity: 0, rotate: -8 }, { y: 0, opacity: 1, rotate: 0, duration: .8, ease: 'bounce.out' }); const q = first.querySelector('.lq'); if (q) { const y = q.getAttribute('y'); gsap.fromTo(q, { attr: { y: 164 } }, { attr: { y }, duration: 1.4, ease: 'power2.out', delay: .3 }); } }
      toast(`Poured: ${fresh.ticker} ${lev}x ${side} at ${px(fresh.price)}`);
    };
    shelf().addEventListener('click', async e => {
      const x = e.target.closest('[data-x]'), re = e.target.closest('[data-re]');
      if (x) { boxes.splice(+x.dataset.x, 1); save(); render(); }
      if (re) { const b = boxes[+re.dataset.re], s = LIST.find(q => q.id === b.id); if (s && s.price) { Object.assign(b, { entry: s.price, at: Date.now(), spilled: false }); save(); render(); toast(`Refilled at ${px(s.price)}`); } }
    });
    tilt(shelf());
    ready = true; render();
    // while the shelf is on screen, prices refresh every 10 s
    let vis = false; new IntersectionObserver(([e]) => vis = e.isIntersecting).observe($('#live'));
    setInterval(() => { if (vis && !document.hidden) stocks(true).catch(() => {}); }, 10000);
  }
  return { setup, tick, render };
})();

// ---------------------------------------------------------------- hero: pulp and bubbles rising behind everything
function bubbles() {
  const cv = $('#bub'); if (!cv || RM) return;
  const g = cv.getContext('2d'); let W = 0, H = 0, D = 1, vis = true, last = 0;
  const size = () => { D = Math.min(1.5, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * D | 0; cv.height = H * D | 0; };
  size(); addEventListener('resize', size);
  new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(cv);
  const B = Array.from({ length: isMobile() ? 18 : 34 }, () => ({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 9, v: .015 + Math.random() * .04, p: Math.random() * 6, z: .3 + Math.random() * .7, ring: Math.random() < .55 }));
  gsap.ticker.add(() => {
    const now = performance.now(); if (!vis || document.hidden || now - last < 33) return; const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    g.setTransform(D, 0, 0, D, 0, 0); g.clearRect(0, 0, W, H);
    const t = now / 1000;
    for (const b of B) {
      b.y -= b.v * dt * (1 + b.z); if (b.y < -.05) { b.y = 1.05; b.x = Math.random(); }
      const x = b.x * W + Math.sin(t * .9 + b.p) * 14 * b.z + MX * -40 * b.z, y = b.y * H + MY * -30 * b.z, r = b.r * b.z;
      g.beginPath(); g.arc(x, y, r, 0, 7);
      if (b.ring) { g.strokeStyle = `rgba(255,255,255,${.22 * b.z})`; g.lineWidth = 1.6; g.stroke(); } else { g.fillStyle = `rgba(255,255,255,${.14 * b.z})`; g.fill(); }
    }
  });
}

// ---------------------------------------------------------------- 02 the squeeze: one box, pinned and scrubbed by the scroll
const SQZ = (() => {
  const TOP = 200, BOT = 540, L = { v: 0 }, G = { v: 0 }, ST = { head: 0, tail: 0 };
  let gain = null, mk = null, tl = null, vis = false;
  const lq = () => $('#sqzLq'), wave = () => $('#sqzWave');
  function draw(t = performance.now() / 1000) {
    const y = BOT - (BOT - TOP) * L.v; if (!lq()) return;
    lq().setAttribute('y', y.toFixed(1));
    let d = `M100 ${y + 6}`; for (let x = 100; x <= 372; x += 9) d += ` L${x} ${(y + Math.sin(t * 2.4 + x / 26) * 5 * (L.v > .02 ? 1 : 0)).toFixed(1)}`;
    wave().setAttribute('d', d + ` L372 ${y + 8} L100 ${y + 8}Z`);
    const top = -30 + ST.tail * 234, bot = -30 + ST.head * 234, sm = $('#sqzStream');
    sm.setAttribute('y', top.toFixed(1)); sm.setAttribute('height', Math.max(0, bot - top).toFixed(1));
  }
  function step(p) {
    const i = Math.min(3, Math.floor(p * 4.05));
    $$('#sqzSteps li').forEach((li, j) => li.classList.toggle('on', j === i));
    $('#sqzBar').style.transform = `scaleX(${p.toFixed(3)})`;
    $('#sqzTag').textContent = ['fees → margin', 'margin → position', mk ? `${mk.ticker} ${pct(mk.chg24)} today` : 'the stock moves', 'profit → buy back → burn'][i];
  }
  function init() {
    if (!$('#squeeze')) return;
    draw();
    new IntersectionObserver(([e]) => vis = e.isIntersecting).observe($('#squeeze'));
    if (!RM) gsap.ticker.add(() => { if (vis) draw(); });
    if (RM) { L.v = .6; draw(); gsap.set(['#sqzChip', '#sqzGain', '#sqzBurn span'], { autoAlpha: 1 }); return; }
    gsap.set(['#sqzChip', '#sqzGain'], { autoAlpha: 0 }); gsap.set('#sqzBurn span', { autoAlpha: 0, y: 10 });
    const drops = $$('#sqzDrops circle'); gsap.set(drops, { attr: { cx: 398, cy: 34 }, autoAlpha: 0 });
    tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '#squeeze', start: 'top top', end: () => '+=' + Math.round(innerHeight * (isMobile() ? 2.2 : 2.6)), pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: s => step(s.progress) } });
    tl.to(ST, { head: 1, duration: .35, ease: 'power1.in' }, 0)
      .to(L, { v: .5, duration: .95 }, .25)
      .to(ST, { tail: 1, duration: .3, ease: 'power1.in' }, 1.15)
      .to('#sqzChip', { autoAlpha: 1, duration: .25 }, 1.35).fromTo('#sqzChip', { y: 24, scale: .9 }, { y: 0, scale: 1, duration: .35, ease: 'back.out(2.2)' }, 1.35)
      .to('#sqzChart', { strokeDashoffset: 0, duration: 1.05 }, 2.0)
      .to(L, { v: .86, duration: 1.05 }, 2.0)
      .to('#sqzGain', { autoAlpha: 1, duration: .2 }, 2.0)
      .to(G, { v: 1, duration: 1.05, onUpdate: () => { $('#sqzPct').textContent = gain == null ? '—' : pct(gain * G.v, 1); } }, 2.0)
      .to('#sqzBox', { scaleY: .86, scaleX: 1.07, svgOrigin: '235 540', duration: .22, ease: 'power2.in' }, 3.1)
      .to('#sqzBox', { scaleY: 1, scaleX: 1, svgOrigin: '235 540', duration: .4, ease: 'elastic.out(1,.4)' }, 3.32)
      .to(L, { v: .5, duration: .45, ease: 'power2.out' }, 3.12);
    drops.forEach((c, i) => {
      const tx = 470 + i * 38, ty = 560;
      tl.to(c, { autoAlpha: 1, duration: .05 }, 3.14 + i * .045)
        .to(c, { attr: { cx: tx }, duration: .5, ease: 'none' }, 3.14 + i * .045)
        .to(c, { keyframes: [{ attr: { cy: -10 - i * 6 }, duration: .2, ease: 'power1.out' }, { attr: { cy: ty }, duration: .3, ease: 'power2.in' }] }, 3.14 + i * .045)
        .to(c, { autoAlpha: 0, duration: .08 }, 3.62 + i * .045);
    });
    $$('#sqzBurn span').forEach((b, i) => tl.to(b, { autoAlpha: 1, y: 0, duration: .18, ease: 'back.out(2)' }, 3.5 + i * .17));
    tl.to({}, { duration: .3 });
  }
  // the story uses today's real biggest mover among the busiest markets: long if it rose, short if it fell
  async function setList(list) {
    if (!$('#squeeze')) return;
    const pool = featured(list).filter(s => s.mint && s.chg24 != null).slice(0, 16);
    mk = pool.slice().sort((a, b) => Math.abs(b.chg24) - Math.abs(a.chg24))[0] || null;
    if (!mk) return;
    const lev = levs(mk).filter(x => x <= 5).pop() || 2, side = mk.chg24 >= 0 ? 'long' : 'short';
    gain = lev * Math.abs(mk.chg24);
    $('#sqzLg').innerHTML = lg(mk); $('#sqzPos').textContent = `${side.toUpperCase()} ${mk.ticker} ${lev}x`;
    $('#sqzGl').textContent = `${mk.ticker} ${pct(mk.chg24)} · ${lev}x ${side}`;
    $('#sqzOpen').textContent = `This box: a ${lev}x ${side} on ${mk.name}, today's biggest mover among the busiest markets on Hyperliquid.`;
    $('#sqzMove').textContent = `${mk.ticker} moved ${pct(mk.chg24)} in 24 hours. At ${lev}x ${side}, that is ${pct(gain, 1)} on the box.`;
    const r = await api.get('chart', { c: mk.coin, tf: '24h' }).catch(() => null);
    const pts = r && r.pts && r.pts.length > 3 ? r.pts : null, path = $('#sqzChart');
    if (!pts) return;
    const ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), X = i => 410 + i / (pts.length - 1) * 320, Y = v => 400 - (v - lo) / ((hi - lo) || 1) * 230;
    let d = `M${X(0).toFixed(1)} ${Y(ys[0]).toFixed(1)}`; for (let i = 1; i < pts.length; i++) d += ` L${X(i).toFixed(1)} ${Y(ys[i]).toFixed(1)}`;
    path.setAttribute('d', d);
    const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = tl ? len * (1 - Math.min(1, Math.max(0, (tl.time() - 2) / 1.05))) : 0;
    if (tl) { tl.invalidate(); tl.scrollTrigger && tl.scrollTrigger.refresh(); }
  }
  return { init, setList };
})();

// ---------------------------------------------------------------- 05 today: a box on every busy market, opened at yesterday's price
const TODAY = (() => {
  let lev = 5, side = 'long', list = [], shown = false;
  const BOX = (id, col) => `<svg viewBox="0 0 120 170" aria-hidden="true"><defs><clipPath id="t${id}"><rect x="14" y="40" width="92" height="124" rx="9"/></clipPath></defs><path d="M86 40V6l18-4" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="40" width="92" height="124" rx="9" fill="rgba(42,22,9,.22)" stroke="#fff" stroke-width="5"/><g clip-path="url(#t${id})"><rect class="lq" x="10" y="164" width="100" height="130" fill="${col}"/></g></svg>`;
  function calc(s) {
    if (!s.prev || !s.price) return null;
    const L = Math.min(lev, s.maxLev || lev), r = (s.price / s.prev - 1) * (side === 'short' ? -1 : 1), dist = Math.max(.001, 1 / L - mmrOf(s));
    const spilled = r <= -dist;
    return { L, r, pnl: L * r * 100, spilled, lvl: spilled ? 0 : Math.max(.03, Math.min(1, .5 * (1 + r / dist))), left: spilled ? 0 : (dist + r) * 100 };
  }
  const pick = () => featured(list).filter(s => s.prev).slice(0, isMobile() ? 12 : 16);
  function render(animate) {
    const grid = $('#tdGrid'); if (!grid) return;
    const rows = pick().map(s => ({ s, c: calc(s) })).filter(x => x.c).sort((a, b) => b.c.pnl - a.c.pnl);
    if (!rows.length) { grid.innerHTML = '<p class="muted">No prices right now: Hyperliquid did not answer.</p>'; return; }
    grid.innerHTML = rows.map(({ s, c }, i) => {
      const st = c.spilled ? 'sp' : c.pnl > 0 ? 'up' : 'dn', col = st === 'up' ? '#ffd23f' : '#ffb37a';
      return `<button class="td-c ${st}" type="button" data-id="${esc(s.id)}"><span class="td-svg">${BOX('d' + i, col)}<span class="sb-lg">${lg(s)}</span></span>
        <span class="td-t"><b>${esc(s.ticker)}</b><span class="chg ${chgClass(s.chg24)}">${pct(s.chg24)}</span></span>
        <span class="td-r"><b>${pct(c.pnl, 1)}</b><em>${st === 'up' ? 'squeezed · burn' : st === 'sp' ? 'spilled · refills' : c.left.toFixed(1) + '% to a spill'}</em></span>
        <span class="td-l mono">${c.L}x ${side}${c.L < lev ? ' · max' : ''}</span></button>`;
    }).join('');
    const lqs = $$('.lq', grid);
    rows.forEach(({ c }, i) => { const y = 164 - 124 * c.lvl; if (animate && !RM) gsap.fromTo(lqs[i], { attr: { y: 164 } }, { attr: { y }, duration: 1.3, ease: 'power3.out', delay: .15 + i * .04 }); else lqs[i].setAttribute('y', y.toFixed(1)); });
    if (animate && !RM) gsap.fromTo($$('.td-c', grid), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out', stagger: .035 });
    const up = rows.filter(r => !r.c.spilled && r.c.pnl > 0), sp = rows.filter(r => r.c.spilled), dn = rows.length - up.length - sp.length;
    countTo($('#tdUp'), up.length, { dur: .8 }); countTo($('#tdDn'), dn, { dur: .8 }); countTo($('#tdSp'), sp.length, { dur: .8 });
    const b = rows[0]; $('#tdBest').innerHTML = b && b.c.pnl > 0 ? `${lg(b.s)}${esc(b.s.ticker)} ${pct(b.c.pnl, 1)}` : '—';
    $('#tdNote').textContent = `${rows.length} busiest markets · opened at yesterday's price (24h ago) · spill = maintenance margin, half of max leverage · math on live prices, not a promise`;
  }
  function update(l) {
    list = l; if (!shown) return;
    const grid = $('#tdGrid'); if (!grid) return;
    const map = new Map(pick().map(s => [s.id, s]));
    $$('.td-c', grid).forEach(el => { const s = map.get(el.dataset.id); if (!s) return; const c = calc(s); if (!c) return; el.querySelector('.td-r b').textContent = pct(c.pnl, 1); const ch = el.querySelector('.chg'); ch.textContent = pct(s.chg24); ch.className = 'chg ' + chgClass(s.chg24); gsap.to(el.querySelector('.lq'), { attr: { y: 164 - 124 * c.lvl }, duration: .9, ease: 'power2.out' }); });
  }
  function init() {
    const sec = $('#today'); if (!sec) return;
    $('#tdLev').onclick = e => { const b = e.target.closest('button'); if (!b) return; lev = +b.dataset.l; $$('#tdLev button').forEach(x => x.classList.toggle('on', x === b)); render(true); };
    $('#tdSide').onclick = e => { const b = e.target.closest('button'); if (!b) return; side = b.dataset.s; $$('#tdSide button').forEach(x => x.classList.toggle('on', x === b)); render(true); };
    $('#tdGrid').onclick = e => { const c = e.target.closest('.td-c'); if (c) openStock(c.dataset.id); };
    tilt($('#tdGrid'));
    ScrollTrigger.create({ trigger: '#tdGrid', start: 'top 88%', once: true, onEnter: () => { shown = true; if (list.length) render(true); } });
    let vis = false; new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(sec);
    setInterval(() => { if (vis && !document.hidden) stocks(true).catch(() => {}); }, 15000);
  }
  return { init, update, setList(l) { list = l; if (shown) render(true); } };
})();

// the dice: a random market, straight into a launch
function surprise(listP) {
  $('#surprise').addEventListener('click', async () => {
    const l = featured(await listP).slice(0, 40); if (!l.length) return;
    const s = l[Math.floor(Math.random() * l.length)];
    if (PC) PC.squeeze();
    toast(`${s.ticker} it is.`);
    setTimeout(() => { const a = document.createElement('a'); a.href = '/launch?stock=' + encodeURIComponent(s.id); a.setAttribute('data-link', ''); document.body.appendChild(a); a.click(); a.remove(); }, 750);
  });
}

// ---------------------------------------------------------------- 06 $JUICE: the pixel box squeezes into the burn
async function juiceBand() {
  const cfg = await config();
  if (cfg && cfg.ca) { $('#ca').hidden = false; $('#caTxt').textContent = cfg.ca; $('#caCopy').onclick = () => copy(cfg.ca); const m = $('#stJuice'); m.classList.remove('wait'); m.querySelector('em').textContent = 'live'; }
  pour($('#dripCv'));
}
function pour(cv) {
  const g = cv.getContext('2d'), P = 6, W = cv.width / P | 0, H = cv.height / P | 0;
  const BOX = ['...............SS...', '..............SS....', '.............SS.....', '.............S......', '.............S......', '.............S......', '.....TTTTTTTTSTTTT..', '....TTTTTTTTTTTTTT..', '...############DDD..', '...############DDD..', '...############DDD..', '...#######GG###DDD..', '...######G#####DDD..', '...####OOOO####DDD..', '...###OwOOOO###DDD..', '...###OOOOOO###DDD..', '...###OOOOOO###DDD..', '...###OOOOOO###DDD..', '...####OOOO####DDD..', '...############DDD..', '...############DDD..', '...############DDD..', '...############DDD..', '...############DD...'];
  const COL = { S: '#ffffff', T: '#fff1df', '#': '#ffffff', D: '#ffd9b8', O: '#ff6f12', w: '#ffc48a', G: '#2fbf5b' };
  const S = 3, ox = (W - 20 * S) / 2 - 4 | 0, oy = 8, drops = [], splash = [];
  let t0 = 0, vis = false, puddle = 0, squeeze = 0;
  new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(cv);
  const px2 = (x, y, c) => { g.fillStyle = c; g.fillRect(x * P, y * P, P, P); };
  const cell = (x, y) => BOX[y] && BOX[y][x] && BOX[y][x] !== '.';
  const tipX = ox + 15 * S + 2, tipY = oy + 1;
  cv.addEventListener('pointerdown', () => { squeeze = 1; for (let i = 0; i < 6; i++) drops.push({ x: tipX + 2, y: tipY, vx: .6 + Math.random() * .8, vy: -1.4 - Math.random(), v: 0 }); });
  function frame(now) {
    requestAnimationFrame(frame);
    if (!vis || now - t0 < 40) return; t0 = now;
    g.clearRect(0, 0, cv.width, cv.height);
    squeeze = Math.max(0, squeeze - .06);
    const sq = Math.round(Math.sin(now / 700) * .5 + squeeze * 2);
    BOX.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; const dy = y > 7 ? sq : 0; for (const [ex, ey] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!cell(x + ex, y + ey)) for (let a = 0; a < S; a++) px2(ox + (x + ex) * S + (ex ? (ex < 0 ? S - 1 : 0) : a), oy + (y + ey) * S + (ey ? (ey < 0 ? S - 1 : 0) : a) + dy, '#2a1609'); }));
    BOX.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) px2(ox + x * S + a, oy + y * S + b + (y > 7 ? sq : 0), COL[ch]); }));
    if (Math.random() < .07 && drops.length < 6) drops.push({ x: tipX + 2, y: tipY, vx: .5 + Math.random() * .5, vy: -.6 - Math.random() * .6 });
    const floor = H - 8;
    for (const d of drops) { d.vy += .12; d.x += d.vx; d.y += d.vy; if (d.y >= floor - 2) { d.dead = true; puddle = Math.min(1, puddle + .07); for (let i = 0; i < 5; i++) splash.push({ x: d.x, y: floor - 1, vx: (Math.random() - .5) * 1.6, vy: -Math.random() * 1.6, life: 16 }); } }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].dead) drops.splice(i, 1);
    drops.forEach(d => { const X = d.x | 0, Y = d.y | 0; for (const [a, b] of [[-1, 0], [2, 0], [-1, -1], [2, -1], [-1, 1], [2, 1], [0, -2], [1, -2], [0, 2], [1, 2]]) px2(X + a, Y + b, '#2a1609'); for (const [a, b] of [[0, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]) px2(X + a, Y + b, a === 1 && b === -1 ? '#fff6c8' : '#ffd23f'); });
    splash.forEach(s => { s.vy += .15; s.x += s.vx; s.y += s.vy; s.life--; if (s.y < floor) px2(s.x | 0, s.y | 0, '#ffd23f'); });
    for (let i = splash.length - 1; i >= 0; i--) if (splash[i].life <= 0) splash.splice(i, 1);
    const cx = tipX + 14, pw = Math.round(10 + puddle * 22);
    for (let x = -pw - 1; x <= pw + 1; x++) px2(cx + x, floor + 2, '#2a1609');
    for (let x = -pw; x <= pw; x++) { const h = x * x < (pw - 5) * (pw - 5) ? 2 : 1; for (let y = 0; y < h; y++) px2(cx + x, floor + 2 - h + y, '#ffd23f'); }
    puddle = Math.max(0, puddle - .002);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- 07 FAQ
const QA = [
  ['What is JUICE?', 'A pump.fun launchpad where every coin holds its own leveraged position on a real stock, paid for by its trading fees. When the trade wins, the profit buys the coin back and burns it.'],
  ['Where does the money come from?', 'pump.fun\'s creator fee on every trade. A JUICE coin shares it on-chain: 10% to the creator, 90% to the engine, which pours it into the coin\'s position.'],
  ['Which stocks?', 'Hyperliquid\'s stock perps: US stocks like TSLA and NVDA, indices, gold, oil and pre-IPO names. Every price on this page is live from Hyperliquid.'],
  ['What is a spill?', 'A liquidation. If the stock moves far enough against the position, its margin is gone. The coin keeps trading and its next fees pour a new position.'],
  ['How is the leverage picked?', 'The creator picks it at launch, from 2x up to the market\'s maximum. More leverage means bigger squeezes and earlier spills.'],
  ['What is $JUICE?', '15% of every coin\'s fees buys $JUICE on the open market and burns it.'],
  ['Who holds the keys?', 'You sign your launch with your own wallet. The engine moves fees only by the rules above, and every transfer, trade and burn goes on a public ledger.'],
  ['When can I launch?', 'As soon as the position engine is live on mainnet. Everything else on this page already runs on live Hyperliquid data.'],
];
function faq() {
  const box = $('#qa');
  box.innerHTML = QA.map(([q, a], i) => `<div class="q rv"><button type="button" aria-expanded="false" aria-controls="qa${i}">${esc(q)}<i>+</i></button><div class="a" id="qa${i}" role="region"><p>${esc(a)}</p></div></div>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const q = b.parentElement, a = q.querySelector('.a'), open = !q.classList.contains('open');
    q.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
    a.style.height = open ? a.scrollHeight + 'px' : '0px';
    setTimeout(() => ScrollTrigger.refresh(), 480);
  });
}

// ---------------------------------------------------------------- end: the giant wordmark
function megaIn() { if (!RM) gsap.from('.mega span', { yPercent: 70, opacity: 0, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: '.mega', start: 'top 95%', end: 'top 50%', scrub: .8 } }); }

// ---------------------------------------------------------------- nav: active section, hide on scroll down
function navWatch() {
  const nav = $('#nav'), links = $$('.links a');
  const setOn = a => links.forEach(l => l.classList.toggle('on', l === a));
  ['#how', '#stocks', '#today', '#live', '#juice', '#faq'].forEach(id => ScrollTrigger.create({ trigger: id, start: 'top 55%', end: 'bottom 55%', onToggle: s => { if (s.isActive) setOn(links.find(l => l.getAttribute('href') === '/' + id)); } }));
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom 55%', onToggle: s => { if (s.isActive) setOn(null); } });
  let last = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { const y = s.scroll(); nav.classList.toggle('scrolled', y > 40); if (Math.abs(y - last) > 6) { nav.classList.toggle('hide', y > last && y > innerHeight * .6); last = y; } } });
}

export async function home() {
  const listP = stocks().catch(() => []);
  hero(); startPC(); bubbles(); (window.__intro || Promise.resolve()).then(orbitIn);
  how(); why(); stocksSec(); split(); faq(); megaIn(); drops(); tilt($('.feats')); SQZ.init(); TODAY.init();
  revealAll($('#home'));
  magnetic();
  navWatch();
  juiceBand(); surprise(listP);
  listP.then(async list => {
    LIST = list;
    $('#nStocks').textContent = list.length || '—';
    feedBox(list);
    orbit(list); tape(list); drawStocks(true); SPOT.setList(list); SHELF.setup(list); SQZ.setList(list); TODAY.setList(list); await calc(list).catch(e => console.error(e));
    ScrollTrigger.refresh();
  });
  ScrollTrigger.refresh();
  return listP;
}
