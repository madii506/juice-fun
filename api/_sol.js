// Solana reads for JUICE: JSON-RPC with fallbacks, simulation, account fetches, NFT ownership checks and
// pump.fun bonding-curve reads. Local dev routes every call through the dev mock (no network needed).
const { PublicKey } = require('@solana/web3.js');
const L = require('./_lib');
const MOCK = process.env.MILK_MOCK ? require(process.env.MILK_MOCK) : null;

// RPC_URL (e.g. a Helius URL) first; publicnode answers most calls fast but refuses indexed ones,
// so indexed calls (token accounts by owner, history) go to mainnet-beta first.
const PUBLICNODE = 'https://solana-rpc.publicnode.com', BETA = 'https://api.mainnet-beta.solana.com';
const INDEXED = new Set(['getSignaturesForAddress', 'getTransaction', 'getTokenAccountsByOwner', 'getTokenLargestAccounts', 'getProgramAccounts']);
const order = method => [process.env.RPC_URL, ...(INDEXED.has(method) ? [BETA, PUBLICNODE] : [PUBLICNODE, BETA])].filter(Boolean);
const UNAVAILABLE = /personal token|request blocked|not available|unsupported|method not found|too many|rate limit|access forbidden/i;

async function rpc(method, params, ms = 12000) {
  if (MOCK) return MOCK.rpc(method, params);
  let last;
  for (const url of order(method)) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(ms) });
      if (r.status === 429 || r.status === 403 || r.status >= 500) { last = new Error('rpc ' + r.status); continue; }
      const j = await r.json();
      if (j.error) { const e = L.err(400, L.clean(j.error.message || 'rpc error', 220)); e.rpc = j.error; if (UNAVAILABLE.test(j.error.message || '')) { last = e; continue; } throw e; }
      return j.result;
    } catch (e) { if (e.code === 400) throw e; last = e; }
  }
  throw L.err(502, 'the Solana RPC did not answer' + (last ? ': ' + L.clean(last.message, 80) : ''));
}

// simulate without signatures and with a fresh blockhash: proves the transaction would land, moves nothing.
// `watch` = addresses whose post-simulation lamports we want (the payer, to show the real cost).
async function simulate(txB64, watch = []) {
  const cfg = { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' };
  if (watch.length) cfg.accounts = { encoding: 'base64', addresses: watch };
  const r = await rpc('simulateTransaction', [txB64, cfg], 20000);
  const v = r.value || {};
  return {
    ok: !v.err, err: v.err ? L.clean(JSON.stringify(v.err), 200) : null, units: v.unitsConsumed || null,
    logs: (v.logs || []).slice(-8).map(l => L.clean(l, 160)), post: (v.accounts || []).map(a => a ? a.lamports : null),
  };
}

const b64 = s => Buffer.from(s, 'base64');
async function account(addr, encoding = 'base64') {
  const r = await rpc('getAccountInfo', [addr, { encoding, commitment: 'confirmed' }]);
  return r && r.value ? r.value : null;
}
async function accounts(addrs) {
  const out = [];
  for (let i = 0; i < addrs.length; i += 100) {
    const r = await rpc('getMultipleAccounts', [addrs.slice(i, i + 100), { encoding: 'base64', commitment: 'confirmed' }]);
    out.push(...(r.value || []));
  }
  return out;
}
async function balance(addr) { const r = await rpc('getBalance', [addr, { commitment: 'confirmed' }]); return r.value; }
async function blockhash() { return (await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value; }

// ---------------------------------------------------------------- NFT ownership, straight from the chain
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const CORE = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d', ATA = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const ataOf = (owner, mint, prog) => PublicKey.findProgramAddressSync([new PublicKey(owner).toBuffer(), new PublicKey(prog).toBuffer(), new PublicKey(mint).toBuffer()], new PublicKey(ATA))[0].toBase58();
// token account layout: mint 0..32, owner 32..64, amount u64 at 64
const tokAcc = d => ({ mint: new PublicKey(d.subarray(0, 32)).toBase58(), owner: new PublicKey(d.subarray(32, 64)).toBase58(), amount: d.readBigUInt64LE(64) });

// Does `owner` hold the NFT `mint` right now? Works for Metaplex NFTs and pNFTs (SPL / Token-2022, supply 1,
// decimals 0) and Metaplex Core assets (owner stored in the asset account). Compressed NFTs need DAS.
async function holds(owner, mint) {
  const m = await account(mint);
  if (!m) return { ok: false, why: 'This NFT does not exist on-chain (compressed NFTs are not supported yet).' };
  const d = b64(m.data[0]);
  if (m.owner === CORE) {
    // Core AssetV1: key (1 byte) then owner pubkey
    const o = new PublicKey(d.subarray(1, 33)).toBase58();
    return o === owner ? { ok: true, standard: 'core' } : { ok: false, why: 'Your wallet does not hold this NFT.', holder: o, standard: 'core' };
  }
  if (m.owner !== TOKEN && m.owner !== TOKEN22) return { ok: false, why: 'This address is not an NFT.' };
  // mint layout: supply u64 at 36, decimals at 44
  const supply = d.readBigUInt64LE(36), decimals = d[44];
  if (supply !== 1n || decimals !== 0) return { ok: false, why: 'This token is not a 1-of-1 NFT.' };
  const a = await account(ataOf(owner, mint, m.owner));
  if (a) { const t = tokAcc(b64(a.data[0])); if (t.owner === owner && t.mint === mint && t.amount === 1n) return { ok: true, standard: m.owner === TOKEN22 ? 'token-2022' : 'token' }; }
  // not in the usual account: ask the indexed call
  try {
    const r = await rpc('getTokenAccountsByOwner', [owner, { mint }, { encoding: 'base64', commitment: 'confirmed' }]);
    for (const x of (r.value || [])) { const t = tokAcc(b64(x.account.data[0])); if (t.amount === 1n) return { ok: true, standard: m.owner === TOKEN22 ? 'token-2022' : 'token' }; }
  } catch (e) { if (e.code !== 400) throw e; }
  return { ok: false, why: 'Your wallet does not hold this NFT.' };
}

// ---------------------------------------------------------------- pump.fun bonding curves
const PUMP = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', RTOK0 = 793100000000000n;
const curveOf = mint => PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), new PublicKey(mint).toBuffer()], new PublicKey(PUMP))[0].toBase58();
// layout: 8 discriminator, vTok, vSol, rTok, rSol, supply (u64 LE), complete (bool), creator (32)
function curve(buf) {
  if (!buf || buf.length < 49) return null;
  const u = o => buf.readBigUInt64LE(o);
  const vTok = u(8), vSol = u(16), rTok = u(24), rSol = u(32), supply = u(40), complete = buf[48] === 1;
  const price = vTok > 0n ? (Number(vSol) / 1e9) / (Number(vTok) / 1e6) : 0;           // SOL per token
  return {
    complete, solIn: Number(rSol) / 1e9, price, mcap: price * (Number(supply) / 1e6),
    progress: complete ? 1 : Math.max(0, Math.min(1, Number(RTOK0 - rTok) / Number(RTOK0))),
    creator: buf.length >= 81 ? new PublicKey(buf.subarray(49, 81)).toBase58() : null,
  };
}
async function curves(mints) {
  const keys = mints.map(curveOf), r = await accounts(keys), out = {};
  mints.forEach((m, i) => { out[m] = r[i] ? curve(b64(r[i].data[0])) : null; });
  return out;
}

module.exports = { rpc, simulate, account, accounts, balance, blockhash, holds, curves, curveOf, PUMP, TOKEN, TOKEN22, CORE, b64 };
