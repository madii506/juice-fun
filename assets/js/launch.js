// /launch: build a juiced coin. Name, picture, the stock it holds, the strength (leverage) and the side, with the
// live spill math. Launching opens when the position engine is live on mainnet; the setup is kept in this browser.
import { $, $$, esc, logo, usd, pct, chgClass, stocks, toast } from './core.js';
import { gsap, magnetic } from './motion.js';
import { browse } from './drawer.js';

const JB = '<svg viewBox="2 0 17 24"><use href="#jbox"/></svg>';
const QUICK = ['TSLA', 'NVDA', 'XYZ100', 'GOLD', 'OPENAI', 'COIN'];
const KEY = 'juice:draft';
const S = { name: '', symbol: '', description: '', image: null, stock: null, lev: 5, side: 'long' };
const lg = s => s.mint ? `<img src="${logo(s.mint)}" alt="${esc(s.ticker)}">` : `<span class="lt">${esc(s.ticker.slice(0, 4))}</span>`;
const levs = s => [2, 3, 5, 10, 20].filter(x => x <= ((s && s.maxLev) || 3));
const dist = s => Math.max(0, 1 / S.lev - 1 / (2 * ((s && s.maxLev) || 10)));

export async function launch(root) {
  const list = (await stocks().catch(() => [])).slice().sort((a, b) => (b.vol24 || 0) - (a.vol24 || 0));
  let d = {}; try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  const want = new URLSearchParams(location.search).get('stock') || d.stock;
  S.stock = list.find(s => s.id === want) || list.find(s => s.ticker === 'TSLA') || list[0] || null;
  Object.assign(S, { name: d.name || '', symbol: d.symbol || '', description: d.description || '', lev: d.lev || 5, side: d.side === 'short' ? 'short' : 'long' });
  const quick = QUICK.map(t => list.find(s => s.ticker === t && s.price != null)).filter(Boolean);
  root.innerHTML = `<div class="wrap">
    <header class="app-head"><span class="eyebrow">Launch</span><h1>Juice a coin.</h1><p>Pick a stock and a strength. Its fees hold the position. Every win burns it.</p></header>
    <div class="launch">
      <div>
        <section class="panel"><h2><span class="n">1</span>Your coin</h2><p class="sub">As it shows on pump.fun.</p>
          <div class="pic"><label class="pic-box" id="picBox" for="pic">${JB}</label><input type="file" id="pic" accept="image/png,image/jpeg,image/webp,image/gif" hidden><div><b>Picture</b><small>Cropped square, in your browser.</small></div></div>
          <div class="f2"><div class="f"><label for="fName">Name</label><input id="fName" maxlength="32" placeholder="Tesla Juice" autocomplete="off" value="${esc(S.name)}"></div><div class="f"><label for="fSym">Ticker</label><input id="fSym" maxlength="10" placeholder="TJUICE" autocomplete="off" style="text-transform:uppercase" value="${esc(S.symbol)}"></div></div>
          <div class="f"><label for="fDesc">Description <span class="muted">(optional)</span></label><textarea id="fDesc" maxlength="400" placeholder="What's the story?">${esc(S.description)}</textarea></div>
        </section>
        <section class="panel"><h2><span class="n">2</span>The stock it holds</h2><p class="sub">A live perp on Hyperliquid.</p>
          <div class="pickd" id="pickd" tabindex="0" role="button"></div>
          <div class="quick" id="quick">${quick.map(s => `<button type="button" data-id="${esc(s.id)}">${lg(s)}${esc(s.ticker)}</button>`).join('')}<button type="button" id="more">All ${list.length} →</button></div>
        </section>
        <section class="panel"><h2><span class="n">3</span>Strength</h2><p class="sub">The leverage and the side. Set at launch.</p>
          <div class="buyrow" id="levRow"></div>
          <div class="seg lside" id="sideSeg"><button data-s="long" type="button">Long</button><button data-s="short" type="button">Short</button></div>
          <div class="spillbox" id="spill"></div>
        </section>
      </div>
      <aside class="preview">
        <div class="pv" id="pv">
          <div class="pv-top"><div class="im" id="pvIm">${JB}</div><div><b id="pvName">Your coin</b><span id="pvSym">$TICKER</span></div></div>
          <div class="pv-box"><div class="pvb-svg"><svg viewBox="0 0 120 170" aria-hidden="true"><defs><clipPath id="pvClip"><rect x="14" y="40" width="92" height="124" rx="9"/></clipPath></defs><path d="M86 40V6l18-4" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="40" width="92" height="124" rx="9" fill="rgba(42,22,9,.22)" stroke="#fff" stroke-width="5"/><g clip-path="url(#pvClip)"><rect id="pvLq" x="10" y="164" width="100" height="130" fill="#ffd23f"/></g></svg><span class="pvb-lg" id="pvLg"></span></div>
            <div class="pvb-t"><span>holds</span><b id="pvPos">—</b><em id="pvSpill">—</em></div></div>
          <div class="pv-split"><div class="ph-lbl" style="color:rgba(255,255,255,.8)">EVERY CREATOR FEE, SPLIT ON-CHAIN</div><div class="ph-bar"><i style="width:10%"></i><i style="width:90%"></i></div><div class="ph-legend"><span>You 10%</span><span>Its position 70% · $JUICE 15% · engine 5%</span></div></div>
          <p class="pv-desc" id="pvDesc"></p>
        </div>
        <div class="panel pv-go" id="go">
          <button class="btn btn-blue btn-lg" id="launchBtn" type="button" disabled>Launches open with the engine</button>
          <p class="pv-fine">The position engine is in final testing on mainnet. Your setup is saved in this browser, so it is ready when launches open.</p>
          <a class="btn btn-line" id="shareX" href="#" target="_blank" rel="noopener">Share your setup on X</a>
        </div>
      </aside>
    </div></div>`;
  bind(list);
  gsap.from($$('.panel, .pv', root), { y: 40, opacity: 0, duration: .8, ease: 'power3.out', stagger: .07 });
  magnetic(root);
}

function save() { try { localStorage.setItem(KEY, JSON.stringify({ name: S.name, symbol: S.symbol, description: S.description, stock: S.stock && S.stock.id, lev: S.lev, side: S.side })); } catch {} }
function bind(list) {
  const name = $('#fName'), sym = $('#fSym'), desc = $('#fDesc');
  const sync = () => {
    S.name = name.value.trim(); S.symbol = sym.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); S.description = desc.value.trim();
    $('#pvName').textContent = S.name || 'Your coin'; $('#pvSym').textContent = '$' + (S.symbol || 'TICKER'); $('#pvDesc').textContent = S.description;
    share(); save();
  };
  [name, sym, desc].forEach(i => i.addEventListener('input', sync));
  sym.addEventListener('input', () => { const p = sym.selectionStart; sym.value = sym.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); sym.setSelectionRange(p, p); });
  $('#pic').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 8e6) return toast('That picture is too large. Use one under 8 MB.', true);
    try { S.image = await square(f); $('#picBox').innerHTML = `<img src="${S.image}" alt="">`; $('#pvIm').innerHTML = `<img src="${S.image}" alt="">`; gsap.fromTo('#pvIm', { scale: .7, rotate: -8 }, { scale: 1, rotate: 0, duration: .7, ease: 'back.out(2.2)' }); }
    catch { toast('That file could not be read as a picture.', true); }
  });
  const levRow = $('#levRow');
  const paint = () => {
    const s = S.stock, o = levs(s);
    if (!o.includes(S.lev)) S.lev = o.filter(x => x <= S.lev).pop() || o[0];
    levRow.innerHTML = [2, 3, 5, 10, 20].map(x => `<button type="button" data-l="${x}" class="${x === S.lev ? 'on' : ''}" ${o.includes(x) ? '' : 'disabled'}>${x}x</button>`).join('');
    $$('#sideSeg button').forEach(b => b.classList.toggle('on', b.dataset.s === S.side));
    $('#pickd').innerHTML = s ? `${lg(s)}<div><b>${esc(s.ticker)}</b><span>${esc(s.name)} · up to ${s.maxLev || '—'}x · ${esc(s.coin)}</span></div><div class="px">${usd(s.price)}<br><span class="chg ${chgClass(s.chg24)}">${pct(s.chg24)}</span></div>` : '<b>Pick a stock</b>';
    $$('#quick button[data-id]').forEach(b => b.classList.toggle('on', s && b.dataset.id === s.id));
    const d = dist(s), sp = s && s.price ? s.price * (S.side === 'long' ? 1 - d : 1 + d) : null;
    $('#spill').innerHTML = `<div><span>Spills if ${esc(s ? s.ticker : 'it')} ${S.side === 'long' ? 'falls' : 'rises'}</span><b>${(d * 100).toFixed(1)}%</b><em>${sp ? 'to ' + usd(sp) : '—'}</em></div><div><span>A 5% move ${S.side === 'long' ? 'up' : 'down'} earns</span><b>${(S.lev * 5).toFixed(0)}%</b><em>on the margin poured</em></div>`;
    $('#pvPos').textContent = s ? `${s.ticker} ${S.lev}x ${S.side}` : '—';
    $('#pvSpill').textContent = `spills at ${S.side === 'long' ? '−' : '+'}${(d * 100).toFixed(1)}%`;
    $('#pvLg').innerHTML = s ? lg(s) : '';
    gsap.to('#pvLq', { attr: { y: 164 - 124 * Math.max(.04, Math.min(1, d / .5)) }, duration: .9, ease: 'power3.out' });
    share(); save();
  };
  levRow.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; S.lev = +b.dataset.l; paint(); gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); };
  $('#sideSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.side = b.dataset.s; paint(); };
  $('#quick').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'more') return pick(); S.stock = list.find(s => s.id === b.dataset.id) || S.stock; paint(); };
  const pick = () => browse({ selected: S.stock && S.stock.id, onPick: s => { S.stock = s; paint(); } });
  $('#pickd').onclick = pick; $('#pickd').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
  sync(); paint();
}
function share() {
  const s = S.stock, a = $('#shareX'); if (!a) return;
  const t = `Juicing ${S.symbol ? '$' + S.symbol : 'my coin'}: a ${S.lev}x ${S.side} on ${s ? s.ticker : 'a stock'}. Every win buys it back and burns it.\n\nEvery coin gets juiced.`;
  a.href = 'https://x.com/intent/post?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(location.origin);
}
function square(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), m = Math.min(im.width, im.height); g.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, n, n); URL.revokeObjectURL(url); res(c.toDataURL('image/webp', .9)); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    im.src = url;
  });
}
