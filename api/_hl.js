// Hyperliquid stock perps (HIP-3 dexes): the live menu of real stocks a JUICE coin can hold a position in,
// and the candles behind every chart. Public info API, no key. Logos come from the stock catalog (by ticker).
const L = require('./_lib'), ST = require('./_stocks');
const MOCK = process.env.JUICE_MOCK ? require(process.env.JUICE_MOCK) : null;
const INFO = 'https://api.hyperliquid.xyz/info';
async function info(body, ms = 9000) {
  if (MOCK) return MOCK.info(body);
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(INFO, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
      if (r.ok) return await r.json();
      last = new Error('hyperliquid ' + r.status);
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  throw L.err(502, 'Hyperliquid did not answer: ' + L.clean(last && last.message, 60));
}
// HL tickers that differ from the catalog's
const ALIAS = { OAI: 'OPENAI', OPENAI: 'OPENAI', ANTH: 'ANTHROPIC', ANTHROPIC: 'ANTHROPIC', SPACEX: 'SPCX', SPCX: 'SPCX', 'BRK.B': 'BRK.B', BRKB: 'BRK.B', GOOG: 'GOOGL', FB: 'META' };
// names for the menu items that are not single stocks
const OTHER = {
  XYZ100: ['Nasdaq 100 index', 'index'], SP500: ['S&P 500 index', 'index'], US500: ['S&P 500 index', 'index'], SP500: ['S&P 500 index', 'index'], NDX: ['Nasdaq 100 index', 'index'], JP225: ['Nikkei 225', 'index'], KR200: ['KOSPI 200', 'index'], DXY: ['US dollar index', 'index'],
  GOLD: ['Gold', 'commodity'], SILVER: ['Silver', 'commodity'], COPPER: ['Copper', 'commodity'], PLATINUM: ['Platinum', 'commodity'], PALLADIUM: ['Palladium', 'commodity'], CL: ['Crude oil', 'commodity'], OIL: ['Crude oil', 'commodity'], BRENT: ['Brent crude', 'commodity'], NATGAS: ['Natural gas', 'commodity'], URANIUM: ['Uranium', 'commodity'], URNM: ['Uranium miners', 'commodity'],
  EUR: ['Euro', 'fx'], JPY: ['Japanese yen', 'fx'], GBP: ['British pound', 'fx'],
  SOXL: ['Semiconductors 3x ETF', 'index'], KORU: ['South Korea 3x ETF', 'index'], SMH: ['Semiconductor ETF', 'index'], TLT: ['20+ year Treasury ETF', 'index'], XLE: ['Energy ETF', 'index'], MAGS: ['Magnificent 7 ETF', 'index'], NIFTY: ['Nifty 50 index', 'index'], EWY: ['South Korea ETF', 'index'], EWJ: ['Japan ETF', 'index'], EWT: ['Taiwan ETF', 'index'],
  BRENTOIL: ['Brent crude', 'commodity'], HO: ['Heating oil', 'commodity'],
};
const NAMES = { TSLA: 'Tesla', NVDA: 'NVIDIA', AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', META: 'Meta', NFLX: 'Netflix', AMD: 'AMD', INTC: 'Intel', MU: 'Micron', ORCL: 'Oracle', PLTR: 'Palantir', COIN: 'Coinbase', HOOD: 'Robinhood', MSTR: 'Strategy', CRCL: 'Circle', TSM: 'TSMC', GME: 'GameStop', BABA: 'Alibaba', RIVN: 'Rivian', LLY: 'Eli Lilly', SNDK: 'SanDisk', COST: 'Costco', CRWV: 'CoreWeave', SMCI: 'Supermicro', AVGO: 'Broadcom', UBER: 'Uber', DIS: 'Disney', SHOP: 'Shopify', RDDT: 'Reddit', HIMS: 'Hims & Hers', SNOW: 'Snowflake', ARM: 'Arm', ASML: 'ASML', NKE: 'Nike', JPM: 'JPMorgan', V: 'Visa', MA: 'Mastercard', WMT: 'Walmart', KO: 'Coca-Cola', PYPL: 'PayPal', SQ: 'Block', XYZ: 'Block', BMNR: 'BitMine', SBET: 'SharpLink', OPENAI: 'OpenAI', ANTHROPIC: 'Anthropic', SPCX: 'SpaceX',
  SKHX: 'SK Hynix', SMSN: 'Samsung', ANT: 'Ant Group', UNITREE: 'Unitree', CXMT: 'CXMT', KIOXIA: 'Kioxia', ZHIPU: 'Zhipu AI', LITE: 'Lumentum', AMAT: 'Applied Materials', AAOI: 'Applied Optoelectronics', USAR: 'USA Rare Earth', MINIMAX: 'MiniMax', WDC: 'Western Digital', GIGADEV: 'GigaDevice', QCOM: 'Qualcomm', NET: 'Cloudflare', SOFTBANK: 'SoftBank', HYUNDAI: 'Hyundai', CRWD: 'CrowdStrike', BX: 'Blackstone', ZM: 'Zoom', TWST: 'Twist Bioscience', NOW: 'ServiceNow', SHEIN: 'Shein', CAMBRICON: 'Cambricon', CVX: 'Chevron', GEV: 'GE Vernova', UMC: 'UMC', LRCX: 'Lam Research', GLW: 'Corning', EBAY: 'eBay', ICE: 'Intercontinental Exchange', NBIS: 'Nebius', MRVL: 'Marvell', CBRS: 'Cerebras', STX: 'Seagate', COHR: 'Coherent', CIFR: 'Cipher Mining', CRDO: 'Credo', VST: 'Vistra', DRAM: 'Roundhill Memory ETF', MRNA: 'Moderna', SP500: 'S&P 500 index' };
const CRYPTO = new Set('BTC ETH SOL HYPE XRP DOGE BNB SUI ADA AVAX LINK LTC TRX TON PEPE WIF BONK PUMP FARTCOIN ENA AAVE UNI ARB OP TIA SEI APT NEAR DOT ATOM FIL INJ JUP PENGU TRUMP KPEPE KBONK WLD ZEC XMR XLM BCH ETC HBAR ONDO VIRTUAL'.split(' '));
const STOCK_DEX = new Set(['xyz', 'vntl']); // trade.xyz (equities, indices, commodities) and Ventuals (pre-IPO)
// the catalog entry that carries the logo for a ticker (xStocks first: they publish the cleanest icons)
const RANK = { xstocks: 0, backpack: 1, ondo: 2, prestocks: 3, tessera: 4 };
const BY_TK = new Map();
for (const s of ST.LIST.slice().sort((a, b) => (RANK[a.issuer] ?? 9) - (RANK[b.issuer] ?? 9))) if (!BY_TK.has(s.ticker)) BY_TK.set(s.ticker, s);

async function dexes() {
  return L.cached('hl:dexes', 3600e3, async () => {
    const d = await info({ type: 'perpDexs' });
    return (Array.isArray(d) ? d : []).filter(Boolean).map(x => x.name).filter(n => typeof n === 'string' && /^[a-z0-9]{1,12}$/i.test(n)).slice(0, 16);
  });
}
async function menu() {
  return L.cached('hl:menu', 20e3, async () => {
    const names = await dexes();
    const res = await Promise.all(names.map(dex => info({ type: 'metaAndAssetCtxs', dex }).then(r => [dex, r]).catch(() => [dex, null])));
    const best = new Map();
    for (const [dex, r] of res) {
      if (!Array.isArray(r) || !r[0] || !Array.isArray(r[0].universe)) continue;
      const uni = r[0].universe, ctx = r[1] || [];
      uni.forEach((u, i) => {
        if (!u || u.isDelisted) return;
        const c = ctx[i] || {}, raw = String(u.name || ''), base = raw.includes(':') ? raw.split(':')[1] : raw;
        const tk = ALIAS[base] || base, cat = BY_TK.get(tk), other = OTHER[base];
        if (CRYPTO.has(base) || CRYPTO.has(base.replace(/^K/, ''))) return;
        if (!cat && !other && !NAMES[tk] && !STOCK_DEX.has(dex)) return;
        const px = Number(c.markPx), prev = Number(c.prevDayPx);
        if (!(px > 0)) return;
        const item = {
          id: tk, coin: raw, dex, ticker: tk, name: (cat && cat.name) || NAMES[tk] || (other && other[0]) || tk,
          kind: other ? other[1] : cat ? (cat.kind === 'etf' ? 'index' : cat.kind) : 'stock', tags: cat ? cat.tags : '',
          mint: cat ? cat.mint : null, icon: !!cat,
          price: px, prev: prev > 0 ? prev : null, chg24: prev > 0 ? (px / prev - 1) * 100 : null, oracle: Number(c.oraclePx) || null,
          vol24: Number(c.dayNtlVlm) || 0, oi: (Number(c.openInterest) || 0) * px, funding: c.funding != null ? Number(c.funding) : null,
          maxLev: Number(u.maxLeverage) || null, onlyIsolated: !!u.onlyIsolated, szDecimals: u.szDecimals,
        };
        item.liq = item.vol24;
        const was = best.get(tk);
        if (!was || item.vol24 > was.vol24) best.set(tk, item);
      });
    }
    const list = [...best.values()].sort((a, b) => b.vol24 - a.vol24);
    if (!list.length) throw L.err(502, 'Hyperliquid returned no stock perps right now.');
    return { at: Date.now(), dexes: names, stocks: list };
  });
}
// 24h = 15-minute closes, 7d = 1-hour closes: [[unix seconds, close], …]
async function candles(coin, tf) {
  const m = await menu();
  const it = m.stocks.find(s => s.coin === coin); if (!it) throw L.err(404, 'not on the menu');
  return L.cached('hl:c:' + coin + ':' + tf, tf === '7d' ? 600e3 : 120e3, async () => {
    const end = Date.now(), start = end - (tf === '7d' ? 7 * 864e5 : 864e5);
    const r = await info({ type: 'candleSnapshot', req: { coin, interval: tf === '7d' ? '1h' : '15m', startTime: start, endTime: end } });
    const pts = (Array.isArray(r) ? r : []).map(k => [Math.round(Number(k.t) / 1000), Number(k.c)]).filter(p => p[1] > 0);
    return { coin, tf, pts };
  });
}
module.exports = { info, menu, candles, dexes };
