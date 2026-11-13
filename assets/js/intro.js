// the intro: juice pours into the screen around the pixel juice box. The level follows what is really loading (fonts,
// the live Hyperliquid menu, the 3D box). Real company logos from the live menu rain into the juice, splash and float
// back up as bubbles; when the screen is full the juice becomes the site.
// No text: just the pour. Click, tap or any key skips it.
const CREAM = '#fff6ec', OR = '#ff6f12', OR2 = '#f25f05', JU = '#ffd23f', INK = '#2a1609';

export function runIntro({ tasks = [], logos = Promise.resolve([]) } = {}) {
  const el = document.getElementById('jintro'), cv = el.querySelector('canvas'), g = cv.getContext('2d');

  let W = 0, H = 0, D = 1;
  const size = () => { D = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * D); cv.height = Math.round(H * D); };
  size(); addEventListener('resize', size);

  // what is really loading
  let done = 0; const total = tasks.length || 1;
  const line = () => {};
  tasks.forEach(([p, label]) => Promise.resolve(p).then(v => { done++; const t = typeof label === 'function' ? label(v) : label; if (t) line(t); }, () => { done++; }));

  // logo bubbles (real company logos from the menu)
  const imgs = [];
  logos.then(list => list.slice(0, 28).forEach(s => { const im = new Image(); im.onload = () => imgs.push({ im, tk: s.ticker }); im.src = '/api/logo?m=' + encodeURIComponent(s.mint); })).catch(() => {});
  const bubbles = [], dots = [], drops = [], fallers = [];
  let deck = [];
  const nextLogo = () => { if (!deck.length) deck = imgs.slice().sort(() => Math.random() - .5); return deck.pop(); };
  const R = () => (W < 700 ? 14 + Math.random() * 14 : 20 + Math.random() * 22);
  function logo(x, y, r) { g.save(); g.beginPath(); g.arc(x, y, r + Math.max(2, r * .1), 0, 7); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip(); g.drawImage(this.im, x - r, y - r, r * 2, r * 2); g.restore(); }
  function drawBubbles(t, dt, lv, clipTop) {
    for (const b of bubbles) {
      b.vy = Math.max(b.rise, b.vy - 520 * dt); b.y += b.vy * dt; const x = b.x + Math.sin(t * 1.6 + b.p) * 10, top = clipTop ? surf(x, t, lv) : -1e9;
      if (b.y - b.r < top + 2) { b.r *= .8; if (b.r < 4) b.dead = true; }
      if (!clipTop && b.y < -b.r * 2) b.dead = true;
      logo.call(b.k, x, b.y, b.r);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].dead) bubbles.splice(i, 1);
  }
  let skip = false, t0 = performance.now(), level = 0, phase = 0, revealAt = 0, raf = 0, resolveDone;
  const finished = new Promise(r => { resolveDone = r; });
  const onSkip = () => { skip = true; };
  el.addEventListener('pointerdown', onSkip); addEventListener('keydown', onSkip, { once: true });

  const ease = x => 1 - Math.pow(1 - x, 3);
  const surf = (x, t, lv) => H * (1 - lv) + Math.sin(x / 120 + t * 2.1) * 9 + Math.sin(x / 47 - t * 3.3) * 4;
  function wave(t, lv, off, amp) {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 12; x += 12) g.lineTo(x, surf(x + off, t + off / 300, lv) - amp);
    g.lineTo(W, H); g.closePath();
  }
  // the pixel juice box (the same sprite as the logo), drawn as one shape
  const BOX = ['...............SS...', '..............SS....', '.............SS.....', '.............S......', '.............S......', '.............S......', '.....TTTTTTTTSTTTT..', '....TTTTTTTTTTTTTT..', '...############DDD..', '...############DDD..', '...############DDD..', '...#######GG###DDD..', '...######G#####DDD..', '...####OOOO####DDD..', '...###OwOOOO###DDD..', '...###OOOOOO###DDD..', '...###OOOOOO###DDD..', '...###OOOOOO###DDD..', '...####OOOO####DDD..', '...############DDD..', '...############DDD..', '...############DDD..', '...############DDD..', '...############DD...'];
  function word(color, dy = 0, sc = 1, a = 1, hole) {
    const c = Math.max(4, Math.round(Math.min(W * (W < 700 ? .5 : .26), H * .5) / 24 * sc)), w = 17 * c, h = 24 * c;
    const x0 = Math.round(W / 2 - w / 2 - 2 * c), y0 = Math.round(H * .46 - h / 2 + dy);
    g.save(); g.globalAlpha = a;
    BOX.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch === '.') continue; const inner = ch === 'O' || ch === 'w' || ch === 'G'; g.fillStyle = inner ? hole : ch === 'D' ? 'rgba(42,22,9,.12)' : color; if (inner && !hole) continue; g.fillRect(x0 + x * c, y0 + y * c, c + .5, c + .5); if (ch === 'D') { g.fillStyle = color; g.globalAlpha = a * .82; g.fillRect(x0 + x * c, y0 + y * c, c + .5, c + .5); g.globalAlpha = a; } } });
    g.restore();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000, ready = done / total;
    g.setTransform(D, 0, 0, D, 0, 0);
    // the level: time-paced, never ahead of what has really loaded
    const k = Math.max(0, Math.min(1, (t - .7) / 2.2)), inout = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    let want = ready >= 1 ? inout * 1.08 : Math.min(inout * 1.08, .12 + .8 * ready);
    if (skip) want = 1.08;
    if (t > 7) want = 1.08;
    level += (want - level) * Math.min(1, (skip ? .2 : .09));
    // background + the wordmark in orange (above the juice)
    g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
    const pop = Math.min(1, t / .5), sc = .86 + .14 * ease(pop);
    word(OR, 0, sc, pop, CREAM);
    // the pour: a stream from the top that lands on the surface
    const sx = W * (W < 700 ? .92 : .8) + Math.sin(t * 9) * 1.5, sy = Math.max(0, Math.min(1, (t - .3) / .45));
    const surfY = surf(sx, t, level);
    if (phase === 0 && level < 1) {
      const sw = Math.max(14, W * .018);
      const sh = Math.min(surfY + 12, sy * (H + 20));
      g.fillStyle = OR; g.fillRect(sx - sw / 2, -10, sw, sh);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(sx - sw / 2 + 3, -10, 3, sh);
      if (sy >= 1 && Math.random() < .75) for (let i = 0; i < 2; i++) drops.push({ x: sx, y: surfY, vx: (Math.random() - .5) * 260, vy: -120 - Math.random() * 260, r: 2 + Math.random() * 4 });
    }
    // back wave, front wave
    g.fillStyle = OR2; wave(t, level, 140, 10); g.fill();
    g.fillStyle = OR; wave(t, level, 0, 0); g.fill();
    // inside the juice: the wordmark in white, bubbles, logos
    g.save(); wave(t, level, 0, 0); g.clip();
    word('#ffffff', 0, sc, pop, OR);
    if (level > .12) {
      if (Math.random() < .5 && dots.length < 70) dots.push({ x: Math.random() * W, y: H + 10, r: 1.5 + Math.random() * 4, v: 40 + Math.random() * 90, p: Math.random() * 6 });
      if (imgs.length && Math.random() < .07 && bubbles.length < 24) { const r = R(); bubbles.push({ k: nextLogo(), x: W * (.06 + Math.random() * .88), y: H + r + 10, r, vy: -60, rise: -(70 + Math.random() * 90), p: Math.random() * 6 }); }
    }
    const dt = 1 / 60;
    for (const d of dots) { d.y -= d.v * dt; const x = d.x + Math.sin(t * 2 + d.p) * 6; g.beginPath(); g.arc(x, d.y, d.r, 0, 7); g.fillStyle = 'rgba(255,255,255,.32)'; g.fill(); if (d.y < surf(x, t, level) + 4) d.dead = true; }
    drawBubbles(t, dt, level, true);
    for (let i = dots.length - 1; i >= 0; i--) if (dots[i].dead) dots.splice(i, 1);
    g.restore();
    // logos raining in with the pour: they splash into the juice and float back up as bubbles
    if (phase === 0 && sy >= 1 && imgs.length && level < .98 && fallers.length < 12 && Math.random() < .16) {
      const r = R(), x = Math.random() < .35 ? sx + (Math.random() - .5) * 30 : W * (.06 + Math.random() * .88);
      fallers.push({ k: nextLogo(), x, y: -r - 10, vy: 120 + Math.random() * 220, r, spin: (Math.random() - .5) * .6 });
    }
    for (const f of fallers) {
      f.vy += 900 * dt; f.y += f.vy * dt;
      const top = surf(f.x, t, level);
      if (f.y > top - f.r * .2) {
        f.dead = true;
        bubbles.push({ k: f.k, x: f.x, y: f.y, r: f.r, vy: Math.min(260, f.vy * .35), rise: -(60 + Math.random() * 80), p: Math.random() * 6 });
        for (let i = 0; i < 6; i++) drops.push({ x: f.x, y: top, vx: (Math.random() - .5) * 320, vy: -140 - Math.random() * 260, r: 2 + Math.random() * 4 });
      } else logo.call(f.k, f.x, f.y, f.r);
    }
    for (let i = fallers.length - 1; i >= 0; i--) if (fallers[i].dead) fallers.splice(i, 1);
    // splash drops above the surface
    for (const d of drops) { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y > surf(d.x, t, level) + 6) d.dead = true; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fillStyle = OR; g.fill(); }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].dead) drops.splice(i, 1);
    // full: the juice becomes the site
    if (phase === 0 && level > 1.04 && (skip || t > 2.7)) { phase = 1; revealAt = now; el.classList.add('out'); document.documentElement.classList.remove('intro'); resolveDone(); }
    if (phase === 1) {
      const k = Math.min(1, (now - revealAt) / 650);
      g.fillStyle = OR; g.fillRect(0, 0, W, H);
      drawBubbles(t, 1 / 60, 2, false);
      word('#ffffff', -k * H * .08, 1 + k * .18, 1 - k, OR);
      if (k >= 1) { cancelAnimationFrame(raf); el.remove(); removeEventListener('resize', size); }
    }
  }
  raf = requestAnimationFrame(frame);
  return finished;
}
