// shared helpers for the juice function: JSON replies, body parsing, a tiny TTL cache, per-IP limits, fetch with timeouts
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ZADDR = /^(u1[02-9ac-hj-np-z]{100,}|zs1[02-9ac-hj-np-z]{75}|t1[1-9A-HJ-NP-Za-km-z]{33}|t3[1-9A-HJ-NP-Za-km-z]{33})$/;
class HttpErr extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const err = (code, msg) => new HttpErr(code, msg);
const clean = (s, n = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

function send(res, code, obj, cache) {
  res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', cache || 'no-store'); res.end(JSON.stringify(obj));
}
async function body(req, max = 64e3) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { if (req.body.length > max) throw err(413, 'request too large'); try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > max) throw err(413, 'request too large'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}
function query(req) { const u = new URL(req.url, 'http://x'); return Object.fromEntries(u.searchParams.entries()); }
const ip = req => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'anon';
const country = req => String(req.headers['x-vercel-ip-country'] || '').toUpperCase();

// cache: key → {t, v} (or an in-flight promise so a burst shares one upstream call)
const C = new Map();
async function cached(key, ttlMs, fn) {
  const hit = C.get(key), now = Date.now();
  if (hit && hit.v !== undefined && now - hit.t < ttlMs) return hit.v;
  if (hit && hit.p) return hit.p;
  const p = (async () => fn())();
  C.set(key, { ...(hit || {}), p });
  try { const v = await p; C.set(key, { t: Date.now(), v }); return v; }
  catch (e) { if (hit && hit.v !== undefined) { C.set(key, hit); return hit.v; } C.delete(key); throw e; }
  finally { if (C.size > 600) for (const k of [...C.keys()].slice(0, 200)) C.delete(k); }
}
const bust = prefix => { for (const k of [...C.keys()]) if (k.startsWith(prefix)) C.delete(k); };
const RL = new Map();
function limited(key, n, windowMs) {
  const now = Date.now(), a = (RL.get(key) || []).filter(t => now - t < windowMs);
  a.push(now); RL.set(key, a); if (RL.size > 5000) RL.clear(); return a.length > n;
}
async function getJson(url, opt = {}, ms = 9000, tries = 4) {
  const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(ms), headers: { accept: 'application/json', 'user-agent': 'juice/1.0', ...(opt.headers || {}) } });
  // public APIs (Jupiter's lite endpoints especially) answer 429 under load: back off and try again before giving up
  if (r.status === 429 && tries > 1) { await new Promise(res => setTimeout(res, (5 - tries) * 900 + Math.random() * 400)); return getJson(url, opt, ms, tries - 1); }
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = null; }
  if (!r.ok) throw err(r.status >= 500 ? 502 : r.status, clean((j && (j.message || j.error || j.msg)) || t || ('upstream ' + r.status), 180));
  if (j === null) throw err(502, 'upstream sent something that is not JSON');
  return j;
}
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
module.exports = { B58, ZADDR, err, clean, send, body, query, ip, country, cached, bust, limited, getJson, num };
