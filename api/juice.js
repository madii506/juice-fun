// JUICE API: one function, routed by ?op=. Every coin gets juiced: its creator fees hold a leveraged position on a
// real stock perp on Hyperliquid; wins buy the coin back and burn it.
// Reads: health, config, stocks (the live Hyperliquid stock menu), chart (candles), logo, sol.
const L = require('./_lib'), M = require('./_market'), H = require('./_hl'), ST = require('./_stocks');
const VERSION = '1.0.0';
const SPLIT = { position: 70, juice: 15, creator: 10, engine: 5 };
// pump.fun's creator fee for a new coin right now, read from the chain (pump-fees market-cap schedule)
async function creatorFeeBps() {
  if (process.env.JUICE_MOCK) return 30;
  return L.cached('cfee', 600e3, async () => {
    const S = require('./_sol'), SDK = require('@pump-fun/pump-sdk'), { PublicKey } = require('@solana/web3.js');
    const ai = a => a ? { data: S.b64(a.data[0]), executable: a.executable, lamports: a.lamports, owner: new PublicKey(a.owner), rentEpoch: a.rentEpoch || 0 } : null;
    const [g, fc] = await S.accounts([SDK.GLOBAL_PDA.toBase58(), SDK.PUMP_FEE_CONFIG_PDA.toBase58()]);
    if (!g) return null;
    const global = SDK.PUMP_SDK.decodeGlobal(ai(g)), feeConfig = fc ? SDK.PUMP_SDK.decodeFeeConfig(ai(fc)) : null;
    const r = SDK.computeFeesBps({ global, feeConfig, mintSupply: global.tokenTotalSupply, virtualQuoteReserves: global.initialVirtualSolReserves, virtualTokenReserves: global.initialVirtualTokenReserves });
    return Number(r.creatorFeeBps.toString());
  });
}
module.exports = async (req, res) => {
  const q = L.query(req), op = q.op || '';
  try {
    if (req.method === 'OPTIONS') return L.send(res, 204, {});
    if (op === 'health') {
      const m = await H.menu().catch(e => ({ error: e.message }));
      return L.send(res, 200, { ok: true, version: VERSION, menu: m.stocks ? m.stocks.length : m.error, dexes: m.dexes || null });
    }
    if (op === 'config') {
      return L.send(res, 200, { split: SPLIT, pumpCreatorFeeBps: await creatorFeeBps().catch(() => null), ca: process.env.JUICE_CA || null, x: process.env.JUICE_X || null, engine: { live: !!process.env.JUICE_ENGINE_LIVE } }, 'public, max-age=60');
    }
    if (op === 'stocks') {
      const r = await H.menu();
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=15, stale-while-revalidate=120');
      return L.send(res, 200, r, 'public, max-age=10');
    }
    if (op === 'chart') {
      const coin = L.clean(q.c, 40); if (!/^[a-z0-9]{1,12}:[A-Z0-9.]{1,20}$/i.test(coin)) throw L.err(404, 'bad coin');
      const tf = q.tf === '7d' ? '7d' : '24h';
      const r = await H.candles(coin, tf);
      res.setHeader('CDN-Cache-Control', `public, s-maxage=${tf === '7d' ? 600 : 90}, stale-while-revalidate=1800`);
      return L.send(res, 200, r, 'public, max-age=45');
    }
    if (op === 'logo') {
      const mint = String(q.m || ''); if (!L.B58.test(mint)) throw L.err(404, 'bad mint');
      const { type, buf } = await M.logo(mint);
      res.statusCode = 200; res.setHeader('content-type', type); res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('cache-control', 'public, max-age=86400'); res.setHeader('CDN-Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
      return res.end(buf);
    }
    if (op === 'sol') return L.send(res, 200, { usd: await M.solUsd() }, 'public, max-age=60');
    throw L.err(404, 'unknown op');
  } catch (e) {
    const code = e.code && e.code >= 400 && e.code < 600 ? e.code : 500;
    return L.send(res, code, { error: code === 500 ? 'Something went wrong. Try again.' : e.message });
  }
};
