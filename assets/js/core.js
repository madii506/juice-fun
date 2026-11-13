// shared bits: the API client, a tiny event bus, storage, formatting, DOM helpers, toasts
const BUS = new Map();
export const on = (e, f) => { (BUS.get(e) || BUS.set(e, []).get(e)).push(f); return () => BUS.set(e, (BUS.get(e) || []).filter(x => x !== f)); };
export const emit = (e, v) => (BUS.get(e) || []).forEach(f => { try { f(v); } catch (err) { console.error(err); } });
export const store = {
  get(k) { try { return localStorage.getItem('milk:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('milk:' + k, v); } catch {} },
  del(k) { try { localStorage.removeItem('milk:' + k); } catch {} },
};
export const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
export const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function call(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { accept: 'application/json', ...(opt.body ? { 'content-type': 'application/json' } : {}) } });
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((j && j.error) || 'Something went wrong. Try again.'); e.status = r.status; e.sim = j && j.sim; throw e; }
  return j;
}
export const api = {
  get: (op, q = {}) => call('/api/' + op + (Object.keys(q).length ? '?' + new URLSearchParams(q) : '')),
  post: (op, body) => call('/api/' + op, { method: 'POST', body: JSON.stringify(body || {}) }),
};

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const logo = mint => '/api/logo?m=' + encodeURIComponent(mint);
export const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// numbers: "—" when unknown, never a guess
export function usd(v, d) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return '$' + (v / 1e3).toFixed(1) + 'K';
  if (a >= 100) return '$' + v.toFixed(d ?? 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (a >= 1) return '$' + v.toFixed(d ?? 2);
  if (a >= .01) return '$' + v.toFixed(d ?? 3);
  if (a === 0) return '$0';
  return '$' + v.toPrecision(2);
}
export const pct = (v, d = 2) => v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(d) + '%';
export const chgClass = v => v == null || !isFinite(v) ? 'fl' : v > .05 ? 'up' : v < -.05 ? 'dn' : 'fl';
export function sol(v, d) { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); return (a >= 100 ? v.toFixed(0) : a >= 1 ? v.toFixed(d ?? 2) : a === 0 ? '0' : v.toFixed(d ?? 3)) + ' SOL'; }
export function num(v) { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (a >= 1e4) return (v / 1e3).toFixed(1) + 'K'; return Math.round(v).toLocaleString('en-US'); }
export function ago(ms) { if (!ms) return '—'; const s = Math.max(1, (Date.now() - ms) / 1000); if (s < 60) return Math.floor(s) + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }
export const solscan = (x, kind = 'tx') => `https://solscan.io/${kind}/${x}`;

let TT = null;
export function toast(msg, err = false) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on');
  clearTimeout(TT); TT = setTimeout(() => t.classList.remove('on'), err ? 6000 : 3200);
}
export async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Copy failed: select it by hand', true); } }

// the stock catalog with live prices, shared by every page (refreshes every 30 s while the tab is open)
let STOCKS = null, SP = null;
export async function stocks(force = false) {
  if (STOCKS && !force) return STOCKS;
  if (SP && !force) return SP;
  SP = api.get('stocks').then(r => { const prev = STOCKS; STOCKS = r.stocks; emit('stocks', { list: STOCKS, prev }); SP = null; return STOCKS; }).catch(e => { SP = null; throw e; });
  return SP;
}
setInterval(() => { if (!document.hidden && STOCKS) stocks(true).catch(() => {}); }, 30000);
let CFG = null;
export async function config() { if (CFG) return CFG; CFG = await api.get('config').catch(() => null); return CFG; }
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
