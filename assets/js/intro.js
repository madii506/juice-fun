// the intro, no text: a pixel juice box pops onto a cream screen, juice pours in and slowly fills it, real company
// logos from the live menu rain into the juice and float back up. When the screen is full the site gets ready under
// the juice (the 3D box, the live sections), then the juice becomes the site. Click, tap or any key fast-forwards it.
const CREAM = '#fff6ec', OR = '#ff6f12', OR2 = '#ec5a04', HI = 'rgba(255,255,255,.22)';
const PRE = ['XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu', 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL', 'AMD8XwJXgQ9WV45Wyj9yFLejxzf2J6VM1PJY8bJEjeES', 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu', 'XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg', 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ', 'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1', 'XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4', 'MUxEsUKSMACyw5fZf68wxf5FLnZVhtU9CwH8uNNGay1', 'XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM', 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF', 'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw', 'Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8', 'SNDKbwMUQvZhnLnxLduradgLHG5KrPuKwpnrkkGRhfH', 'XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo', 'XsafvsGtzFqqHgTnA3aPC83EAMkacU5mcGtcSayhpVV', 'Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc', 'Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH', 'BABANGA4JE7Kkam4nTrALAwAVgsNJUuFJnnkF7S16BZp'];
const BOX = ['...............SS...', '..............SS....', '.............SS.....', '.............S......', '.............S......', '.............S......', '.....TTTTTTTTSTTTT..', '....TTTTTTTTTTTTTT..', '...############DDD..', '...############DDD..', '...############DDD..', '...#######GG###DDD..', '...######G#####DDD..', '...####OOOO####DDD..', '...###OwOOOO###DDD..', '...###OOOOOO###DDD..', '...###OOOOOO###DDD..', '...###OOOOOO###DDD..', '...####OOOO####DDD..', '...############DDD..', '...############DDD..', '...############DDD..', '...############DDD..', '...############DD...'];
// timeline (seconds on the intro clock)
const T_STREAM = .55, T_FILL0 = 1.0, T_FILL1 = 5.2, T_MIN_REVEAL = 5.5, REVEAL_MS = 1050;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const inOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const outBack = x => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export function runIntro({ tasks = [], logos = Promise.resolve([]), startAfter = Promise.resolve(), beforeReveal = () => Promise.resolve() } = {}) {
  const el = document.getElementById('jintro'), cv = el.querySelector('canvas'), g = cv.getContext('2d');
  let W = 0, H = 0, D = 1, C = 8, boxA = null, boxB = null;
  // the pixel box, drawn once per size into two sprites: orange on cream (above the juice), white on orange (in it)
  function sprite(color, hole) {
    const c = document.createElement('canvas'); c.width = Math.ceil(20 * C * D); c.height = Math.ceil(24 * C * D);
    const x = c.getContext('2d'); x.scale(D, D);
    BOX.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.') continue;
      x.fillStyle = ch === 'O' || ch === 'w' || ch === 'G' ? hole : color; x.fillRect(i * C, y * C, C + .4, C + .4);
      if (ch === 'D') { x.fillStyle = 'rgba(42,22,9,.1)'; x.fillRect(i * C, y * C, C + .4, C + .4); } } });
    return c;
  }
  const size = () => {
    D = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * D); cv.height = Math.round(H * D);
    C = Math.max(4, Math.round(Math.min(W * (W < 700 ? .5 : .26), H * .5) / 24));
    boxA = sprite(OR, CREAM); boxB = sprite('#ffffff', OR);
  };
  size(); addEventListener('resize', size);
  function drawBox(img, sc = 1, dy = 0, a = 1) {
    const w = 20 * C * sc, h = 24 * C * sc;
    g.globalAlpha = a; g.drawImage(img, W / 2 - 10.5 * C * sc, H * .46 - h / 2 + dy, w, h); g.globalAlpha = 1;
  }

  // what is really loading
  let done = 0; const total = tasks.length || 1;
  tasks.forEach(([p]) => Promise.resolve(p).then(() => { done++; }, () => { done++; }));

  // real company logos: the big names at once, the rest of the live menu when it arrives; each drawn once into a round sprite
  const logosReady = [], seen = new Set();
  const load = mint => {
    if (!mint || seen.has(mint) || seen.size >= 40) return; seen.add(mint);
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      const S = 132, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
      x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fillStyle = '#fff'; x.fill();
      x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 6, 0, 7); x.clip(); x.drawImage(im, 6, 6, S - 12, S - 12); x.restore();
      logosReady.push(c);
    };
    im.src = '/api/logo?m=' + encodeURIComponent(mint);
  };
  PRE.forEach(load);
  logos.then(list => list.forEach(s => load(s.mint))).catch(() => {});
  let deck = [];
  const nextLogo = () => { if (!deck.length) deck = logosReady.slice().sort(() => Math.random() - .5); return deck.pop(); };
  const R = () => (W < 700 ? 15 + Math.random() * 13 : 20 + Math.random() * 22);

  const bubbles = [], dots = [], drops = [], fallers = [];
  let skip = false, clock = 0, last = 0, level = 0, phase = 'fill', holdAt = 0, revealAt = 0, raf = 0, prepDone = false, tailAt = 0, resolveDone;
  const finished = new Promise(r => { resolveDone = r; });
  const onSkip = () => { skip = true; };
  el.addEventListener('pointerdown', onSkip); addEventListener('keydown', onSkip, { once: true });

  const surf = (x, t, lv) => H * (1 - lv) + Math.sin(x / 150 + t * 1.7) * 8 + Math.sin(x / 63 - t * 2.6) * 4 + Math.sin(x / 31 + t * 3.9) * 1.6;
  function wave(t, lv, off, lift) {
    g.beginPath(); g.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 16; x += 16) g.lineTo(x, surf(x + off, t + off / 400, lv) - lift);
    g.lineTo(W + 16, H + 10); g.closePath();
  }
  function edge(t, lv) {
    g.beginPath();
    for (let x = -10; x <= W + 16; x += 16) { const y = surf(x, t, lv) + 5; x === -10 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.strokeStyle = HI; g.lineWidth = 3; g.stroke();
  }
  const logoAt = (s, x, y, r) => g.drawImage(s, x - r, y - r, r * 2, r * 2);
  function stepBubbles(t, dt, lv, inJuice) {
    for (const b of bubbles) {
      b.vy = Math.max(b.rise, b.vy - 520 * dt); b.y += b.vy * dt; b.age += dt;
      const x = b.x + Math.sin(t * 1.4 + b.p) * 9, top = inJuice ? surf(x, t, lv) : -1e9;
      if (b.y - b.r < top + 3) { b.pop += dt * 6; if (b.pop >= 1) b.dead = true; }
      if (!inJuice && b.y < -b.r * 2) b.dead = true;
      const sc = Math.min(1, b.age * 4) * (1 - inOut(clamp(b.pop)) * .9);
      logoAt(b.s, x, b.y, b.r * sc);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].dead) bubbles.splice(i, 1);
  }

  async function begin() {
    // the page sets itself up first, while the screen is still a plain cream (so no frame of the pour ever stutters)
    await Promise.race([startAfter, new Promise(r => setTimeout(r, 1400))]).catch(() => {});
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, .001, .05); last = now;
    clock += dt * (skip && phase === 'fill' ? 4 : 1);
    const t = clock, ready = done >= total;
    g.setTransform(D, 0, 0, D, 0, 0);

    if (phase !== 'reveal') {
      // the level: one smooth curve; if something is still loading near the top it waits there, gently
      let want = inOut(clamp((t - T_FILL0) / (T_FILL1 - T_FILL0))) * 1.07;
      if (!ready && t < 9) want = Math.min(want, .9);
      level += (want - level) * (1 - Math.exp(-dt * 7));
      // the cream screen and the box popping in
      g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
      const pop = clamp(t / .7), sc = .55 + .45 * outBack(pop);
      drawBox(boxA, sc, 0, clamp(t / .25));
      // the pour: the head falls in, the tail lifts off when the juice is nearly at the top
      const sx = W * (W < 700 ? .9 : .8) + Math.sin(t * 7) * 1.4, sw = Math.max(14, Math.min(26, W * .017)), surfY = surf(sx, t, level);
      if (level > .94 && !tailAt) tailAt = t;
      if (t > T_STREAM) {
        const head = Math.min(surfY + 10, 1300 * Math.pow(t - T_STREAM, 2)), tail = tailAt ? 1500 * Math.pow(t - tailAt, 2) : -20;
        if (head > tail) {
          g.fillStyle = OR; g.fillRect(sx - sw / 2, tail, sw, head - tail);
          g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(sx - sw / 2 + 3, tail, 3, head - tail);
          if (head >= surfY && Math.random() < dt * 40) drops.push({ x: sx, y: surfY, vx: (Math.random() - .5) * 240, vy: -110 - Math.random() * 230, r: 2 + Math.random() * 3.5 });
        }
      }
      // logos raining in: into the stream and all over, then they float back up
      if (t > T_STREAM + .3 && !tailAt && logosReady.length && fallers.length < 14 && Math.random() < dt * (W < 700 ? 7 : 11)) {
        const r = R(), near = Math.random() < .3;
        fallers.push({ s: nextLogo(), x: near ? sx + (Math.random() - .5) * 26 : W * (.05 + Math.random() * .9), y: -r - 8, vy: 60 + Math.random() * 160, r });
      }
      // the juice: back wave, front wave, a light edge
      g.fillStyle = OR2; wave(t, level, 170, 9); g.fill();
      g.fillStyle = OR; wave(t, level, 0, 0); g.fill();
      edge(t, level);
      // inside the juice: the box in white, pulp, logo bubbles
      g.save(); wave(t, level, 0, 0); g.clip();
      drawBox(boxB, sc, 0, 1);
      if (level > .06) {
        if (Math.random() < dt * 28 && dots.length < 70) dots.push({ x: Math.random() * W, y: H + 10, r: 1.4 + Math.random() * 3.6, v: 40 + Math.random() * 80, p: Math.random() * 6 });
        if (logosReady.length && Math.random() < dt * 4.5 && bubbles.length < 26) { const r = R(); bubbles.push({ s: nextLogo(), x: W * (.05 + Math.random() * .9), y: H + r + 12, r, vy: -40, rise: -(60 + Math.random() * 80), p: Math.random() * 6, age: 0, pop: 0 }); }
      }
      g.fillStyle = 'rgba(255,255,255,.3)';
      for (const d of dots) { d.y -= d.v * dt; const x = d.x + Math.sin(t * 1.8 + d.p) * 6; if (d.y < surf(x, t, level) + 4) { d.dead = true; continue; } g.beginPath(); g.arc(x, d.y, d.r, 0, 7); g.fill(); }
      for (let i = dots.length - 1; i >= 0; i--) if (dots[i].dead) dots.splice(i, 1);
      stepBubbles(t, dt, level, true);
      g.restore();
      // falling logos above the juice; a splash where they land
      for (const f of fallers) {
        f.vy += 820 * dt; f.y += f.vy * dt;
        const top = surf(f.x, t, level);
        if (f.y > top - f.r * .15) {
          f.dead = true;
          bubbles.push({ s: f.s, x: f.x, y: f.y, r: f.r, vy: Math.min(240, f.vy * .32), rise: -(55 + Math.random() * 75), p: Math.random() * 6, age: 1, pop: 0 });
          for (let i = 0; i < 6; i++) drops.push({ x: f.x, y: top, vx: (Math.random() - .5) * 300, vy: -130 - Math.random() * 240, r: 2 + Math.random() * 3.5 });
        } else logoAt(f.s, f.x, f.y, f.r);
      }
      for (let i = fallers.length - 1; i >= 0; i--) if (fallers[i].dead) fallers.splice(i, 1);
      g.fillStyle = OR;
      for (const d of drops) { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y > surf(d.x, t, level) + 6) { d.dead = true; continue; } g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill(); }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].dead) drops.splice(i, 1);

      // full: get the site ready under the juice (the 3D box, the live sections), then hand over
      if (phase === 'fill' && level > 1.03) {
        phase = 'hold'; holdAt = t;
        Promise.race([Promise.resolve().then(beforeReveal), new Promise(r => setTimeout(r, 2600))]).catch(() => {}).then(() => { prepDone = true; });
      }
      if (phase === 'hold' && prepDone && (t >= T_MIN_REVEAL || skip) && t - holdAt > .25) {
        phase = 'reveal'; revealAt = now;
        el.classList.add('out'); document.documentElement.classList.remove('intro'); resolveDone();
      }
      return;
    }
    // the reveal: the juice becomes the site; the box rises out of view, the bubbles keep going
    const k = clamp((now - revealAt) / REVEAL_MS), e = inOut(k);
    g.fillStyle = OR; g.fillRect(0, 0, W, H);
    stepBubbles(t, dt, 2, false);
    drawBox(boxB, 1 + e * .22, -e * H * .1, 1 - e);
    if (k >= 1) { cancelAnimationFrame(raf); el.remove(); removeEventListener('resize', size); }
  }
  begin();
  return finished;
}
