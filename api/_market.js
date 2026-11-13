// JUICE market data: company logos served from our own origin (looked up on Jupiter by the catalog mint),
// price paths for the charts (GeckoTerminal), and the SOL price. Public market data only; nothing here is stored.
const L = require('./_lib'), ST = require('./_stocks');
const MOCK = process.env.MILK_MOCK ? require(process.env.MILK_MOCK) : null;
const JUP = process.env.JUP_API_KEY ? 'https://api.jup.ag' : 'https://lite-api.jup.ag';
const JH = process.env.JUP_API_KEY ? { 'x-api-key': process.env.JUP_API_KEY } : {};
const WSOL = 'So11111111111111111111111111111111111111112';

// one Jupiter token record per mint: price, 1h/24h change, liquidity, holders, icon, decimals, token program
async function tokens(mints) {
  const want = [...new Set(mints)].filter(m => L.B58.test(m));
  if (MOCK) return MOCK.tokens(want);
  const out = {};
  for (let i = 0; i < want.length; i += 50) {
    const b = want.slice(i, i + 50);
    const j = await L.getJson(`${JUP}/tokens/v2/search?query=${b.join(',')}`, { headers: JH }, 9000, 3).catch(() => []);
    for (const t of j || []) {
      const st = k => t[k] && t[k].priceChange != null ? +t[k].priceChange : null;
      out[t.id] = { mint: t.id, symbol: t.symbol, name: t.name, icon: t.icon || '', decimals: t.decimals, program: t.tokenProgram || null,
        price: t.usdPrice ?? null, chg1h: st('stats1h'), chg24: st('stats24h'), liq: t.liquidity ?? null, mcap: t.mcap ?? null, holders: t.holderCount ?? null,
        vol24: t.stats24h ? (+t.stats24h.buyVolume || 0) + (+t.stats24h.sellVolume || 0) : null };
    }
  }
  return out;
}

// the shelf: every stock with its live numbers. A stock Jupiter doesn't answer for keeps "—" (null), never a guess.
async function stocks() {
  return L.cached('stocks', 30e3, async () => {
    const t = await tokens(ST.LIST.map(s => s.mint));
    const list = ST.LIST.map(s => {
      const x = t[s.mint] || {};
      return { id: s.id, ticker: s.ticker, name: s.name, issuer: s.issuerName, kind: s.kind, tags: s.tags, mint: s.mint, feeBps: s.feeBps,
        price: x.price ?? null, chg24: x.chg24 ?? null, chg1h: x.chg1h ?? null, liq: x.liq ?? null, holders: x.holders ?? null, vol24: x.vol24 ?? null, decimals: x.decimals ?? null, icon: !!x.icon };
    });
    return { at: Date.now(), stocks: list };
  });
}

async function solUsd() {
  return L.cached('solusd', 60e3, async () => {
    if (MOCK) return MOCK.solUsd();
    try { const j = await L.getJson(`${JUP}/price/v3?ids=${WSOL}`, { headers: JH }, 6000, 2); const p = Number(j[WSOL] && j[WSOL].usdPrice); if (p) return p; } catch {}
    const j = await L.getJson('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {}, 6000, 2);
    return (j.solana && j.solana.usd) || null;
  });
}

// icons: only for mints in the catalog (no open proxy), from the URL Jupiter publishes for that mint
async function logo(mint) {
  const s = ST.BY_MINT.get(mint); if (!s) throw L.err(404, 'not in the catalog');
  if (MOCK) return MOCK.logo(mint);
  const info = await L.cached('ticon:' + mint, 6 * 3600e3, async () => (await tokens([mint]))[mint] || null);
  if (!info || !/^https:\/\//.test(info.icon || '')) throw L.err(404, 'no icon');
  const r = await fetch(info.icon, { headers: { accept: 'image/webp,image/png,image/*' }, signal: AbortSignal.timeout(8000) });
  const ct = (r.headers.get('content-type') || '').split(';')[0];
  if (!r.ok || !/^image\/(png|webp|jpeg|gif|svg\+xml)$/.test(ct)) throw L.err(502, 'bad icon');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 800000) throw L.err(502, 'icon too big');
  return { type: ct, buf };
}

// a stock's recent price path from its deepest pool: 24h = 15-minute closes, 7d = 4-hour closes
const G = 'https://api.geckoterminal.com/api/v2/networks/solana';
async function chart(mint, tf) {
  if (!ST.BY_MINT.has(mint)) throw L.err(404, 'not in the catalog');
  if (MOCK) return MOCK.chart(mint, tf);
  return L.cached('chart:' + mint + ':' + tf, tf === '7d' ? 600e3 : 180e3, async () => {
    const pool = await L.cached('pool:' + mint, 6 * 3600e3, async () => {
      const p = await L.getJson(`${G}/tokens/${mint}/pools?page=1`, {}, 8000, 2);
      const best = (p.data || []).map(d => d.attributes || {}).sort((a, b) => (+b.reserve_in_usd || 0) - (+a.reserve_in_usd || 0))[0];
      if (!best || !best.address) throw L.err(404, 'no pool'); return best.address;
    });
    const path = tf === '7d' ? 'hour?aggregate=4&limit=42' : 'minute?aggregate=15&limit=96';
    const o = await L.getJson(`${G}/pools/${pool}/ohlcv/${path}&currency=usd&token=${mint}`, {}, 8000, 2);
    const list = (o.data && o.data.attributes && o.data.attributes.ohlcv_list) || [];
    const pts = list.map(r => [r[0], +r[4]]).filter(p => isFinite(p[1]) && p[1] > 0).sort((a, b) => a[0] - b[0]);
    if (pts.length < 3) throw L.err(404, 'not enough trades for a chart');
    return { mint, tf, pts };
  });
}

// Jupiter swap for the engine: SOL → token, the instructions only (the engine compiles, signs and sends)
async function swapIxs({ owner, inMint = WSOL, outMint, amount, slippageBps = 150 }) {
  if (MOCK) return MOCK.swapIxs({ owner, inMint, outMint, amount });
  const q = await L.getJson(`${JUP}/swap/v1/quote?inputMint=${inMint}&outputMint=${outMint}&amount=${Math.floor(amount)}&slippageBps=${slippageBps}&restrictIntermediateTokens=true&maxAccounts=40`, { headers: JH }, 9000, 4);
  if (!q || !q.outAmount) throw L.err(502, 'no route for this swap');
  if (+q.priceImpactPct > 0.05) throw L.err(400, 'price impact too high (' + (+q.priceImpactPct * 100).toFixed(1) + '%)');
  const si = await L.getJson(`${JUP}/swap/v1/swap-instructions`, { method: 'POST', headers: { 'content-type': 'application/json', ...JH },
    body: JSON.stringify({ quoteResponse: q, userPublicKey: owner, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: false }) }, 12000, 4);
  return { quote: { in: +q.inAmount, out: +q.outAmount, minOut: +q.otherAmountThreshold, impact: +q.priceImpactPct }, si };
}

module.exports = { tokens, stocks, solUsd, logo, chart, swapIxs, WSOL };
