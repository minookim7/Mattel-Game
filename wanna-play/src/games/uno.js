import { h, confetti, fill } from '../ui.js';
import { audio, out, sfx } from '../audio.js';

const LANES = [
  { key: 'KeyF', label: 'F', color: '#1f6fe0' }, { key: 'KeyG', label: 'G', color: '#2fae4a' },
  { key: 'KeyH', label: 'H', color: '#f5c518' }, { key: 'KeyJ', label: 'J', color: '#e5252b' },
];
const BPM = 120, BEAT = 60 / BPM, BARS = 30, LEAD_IN = 3, TRAVEL = 1.7;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Original track written for this game: Am - F - C - G, with a pentatonic lead that doubles as the note chart.
function compose() {
  let seed = 28; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], scale = [69, 72, 74, 76, 79, 81, 84, 86];
  const ev = [], chart = []; let idx = 3;
  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * 4 * BEAT, ch = chords[bar % 4], dense = bar >= 22 ? .55 : bar >= 12 ? .35 : bar >= 4 ? .15 : 0;
    for (let b = 0; b < 4; b++) {
      ev.push({ t: t0 + b * BEAT, kind: 'kick' }); ev.push({ t: t0 + (b + .5) * BEAT, kind: 'hat' });
      if (b % 2) ev.push({ t: t0 + b * BEAT, kind: 'snare' });
      ev.push({ t: t0 + b * BEAT, kind: 'bass', f: midi(ch[0] - 12), d: BEAT * .9 });
      if (b === 0 || b === 2) for (const n of ch) ev.push({ t: t0 + (b + .5) * BEAT, kind: 'pad', f: midi(n), d: BEAT * .8 });
    }
    if (bar < 2) continue; // two bars of intro
    if (bar % 4 === 3) { // WILD card on beat 3 of every fourth bar
      const t = t0 + 2 * BEAT; ev.push({ t, kind: 'crash' }); chart.push({ t, lane: 4 });
      for (const b of [0, 1]) { idx = Math.max(0, Math.min(7, idx + (rnd() < .5 ? -1 : 1))); ev.push({ t: t0 + b * BEAT, kind: 'lead', f: midi(scale[idx]), d: BEAT * .8 }); chart.push({ t: t0 + b * BEAT, lane: idx % 4 }); }
      continue;
    }
    for (let s = 0; s < 8; s++) {
      const on = s % 2 === 0 ? rnd() < .85 : rnd() < dense; if (!on) continue;
      idx = Math.max(0, Math.min(7, idx + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)]));
      const t = t0 + s * BEAT / 2; ev.push({ t, kind: 'lead', f: midi(scale[idx]), d: BEAT * .45 }); chart.push({ t, lane: idx % 4 });
    }
  }
  chart.sort((a, b) => a.t - b.t);
  return { ev, chart, length: BARS * 4 * BEAT };
}

export function start(app, exit) {
  const root = h('div', { class: 'screen', style: 'background:#14091f' }); app.overlay.append(root, app.gameBar('Club UNO', quit));
  const cv = h('canvas', { class: 'fill' }); root.append(cv); const g = cv.getContext('2d');
  const info = h('div', { class: 'card', style: 'position:relative' }); root.append(info);
  let W, H, playing = false, raf = 0, bus = null, song, t0 = 0, stats, flashes = [], pressed = {}, judge = { text: '', t: -9 };
  const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; fit(); app.on(window, 'resize', fit);

  function menu(result) {
    info.hidden = false;
    fill(info, h('h2', {}, result ? `${result.acc}% accuracy` : 'Party (and Party) On'),
      h('p', { html: result ? (result.won ? (result.first ? 'UNO! You won the Club UNO ring.' : 'UNO! Smooth set.') : 'Hit 70% to win the ring.') + `<br>Best combo: ${result.combo}` : 'Cards fall to the beat. Hit the matching key when a card reaches the line.<br><br><kbd>F</kbd> blue &nbsp; <kbd>G</kbd> green &nbsp; <kbd>H</kbd> yellow &nbsp; <kbd>J</kbd> red &nbsp; <kbd>Space</kbd> wild' }),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: begin }, result ? 'Play again' : 'Drop the beat'), result && h('button', { class: 'btn alt', onclick: exit }, 'Done')));
    if (result?.won) confetti(root);
  }
  function begin() {
    info.hidden = true; const c = audio(); song = compose();
    bus = c.createGain(); bus.gain.value = .9; bus.connect(out()); t0 = c.currentTime + LEAD_IN;
    const osc = (f, t, d, type, vol) => { const o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(vol, t + .01); a.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(a).connect(bus); o.start(t); o.stop(t + d + .05); };
    const nz = (t, d, vol, hp) => { const n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), dd = b.getChannelData(0); for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2; const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const a = c.createGain(); a.gain.value = vol; s.connect(f).connect(a).connect(bus); s.start(t); };
    for (const e of song.ev) {
      const t = t0 + e.t;
      if (e.kind === 'kick') { const o = c.createOscillator(), a = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); a.gain.setValueAtTime(.6, t); a.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(a).connect(bus); o.start(t); o.stop(t + .2); }
      else if (e.kind === 'hat') nz(t, .04, .12, 7000);
      else if (e.kind === 'snare') nz(t, .14, .28, 1500);
      else if (e.kind === 'crash') nz(t, .9, .3, 3000);
      else if (e.kind === 'bass') osc(e.f, t, e.d, 'sawtooth', .16);
      else if (e.kind === 'pad') osc(e.f, t, e.d, 'triangle', .07);
      else if (e.kind === 'lead') osc(e.f, t, e.d, 'square', .09);
    }
    for (const n of song.chart) { n.hit = false; n.missed = false; }
    stats = { score: 0, combo: 0, best: 0, hits: 0, total: song.chart.length }; playing = true; flashes = [];
    cancelAnimationFrame(raf); frame();
  }
  function stop() { playing = false; if (bus) { try { bus.gain.setValueAtTime(0, audio().currentTime); bus.disconnect(); } catch { /* already stopped */ } bus = null; } }
  function quit() { stop(); cancelAnimationFrame(raf); exit(); }
  function finish() {
    stop(); const acc = Math.round(stats.score / stats.total * 100), won = acc >= 70, first = won && app.award('uno');
    if (won && !first) sfx.win();
    menu({ acc, won, first, combo: stats.best });
  }
  function press(lane) {
    if (!playing) return; const now = audio().currentTime - t0; let best = null, bd = .2;
    for (const n of song.chart) { if (n.hit || n.missed || n.lane !== lane) continue; const d = Math.abs(n.t - now); if (d < bd) { bd = d; best = n; } if (n.t > now + .3) break; }
    if (!best) { stats.combo = 0; judge = { text: 'Miss', t: now, c: '#888' }; return; }
    best.hit = true; stats.hits++; stats.combo++; stats.best = Math.max(stats.best, stats.combo);
    const q = bd < .06 ? ['Perfect!', 1, '#fff'] : bd < .12 ? ['Great', .8, '#FFCC19'] : ['OK', .5, '#9fd'];
    stats.score += q[1]; judge = { text: q[0], t: now, c: q[2] }; flashes.push({ lane, t: now });
  }
  app.on(window, 'keydown', (e) => { if (e.repeat) return; const i = LANES.findIndex((l) => l.key === e.code); if (i >= 0) { pressed[i] = true; press(i); } if (e.code === 'Space') { pressed[4] = true; press(4); e.preventDefault(); } });
  app.on(window, 'keyup', (e) => { const i = LANES.findIndex((l) => l.key === e.code); if (i >= 0) pressed[i] = false; if (e.code === 'Space') pressed[4] = false; });

  function card(x, y, w, hh, color, label) {
    g.save(); g.translate(x, y); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-w / 2, -hh / 2, w, hh, 10); g.fill();
    g.fillStyle = color; g.beginPath(); g.roundRect(-w / 2 + 5, -hh / 2 + 5, w - 10, hh - 10, 7); g.fill();
    g.fillStyle = '#fff'; g.save(); g.rotate(-.5); g.beginPath(); g.ellipse(0, 0, w * .32, hh * .42, 0, 0, 7); g.fill(); g.restore();
    g.fillStyle = color === '#111' ? '#111' : color; g.font = `700 ${hh * .42}px Matty, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, 2); g.restore();
  }
  function frame() {
    raf = requestAnimationFrame(frame); if (!root.isConnected) { stop(); cancelAnimationFrame(raf); return; }
    const now = audio().currentTime - t0, lw = Math.min(130, W / 6), x0 = W / 2 - lw * 2, hitY = H - 150, top = 70;
    g.fillStyle = '#14091f'; g.fillRect(0, 0, W, H);
    const pulse = playing ? Math.max(0, 1 - ((now / BEAT) % 1) * 2) : 0;
    LANES.forEach((l, i) => {
      g.fillStyle = l.color; g.globalAlpha = .13 + (pressed[i] ? .2 : 0) + pulse * .04; g.fillRect(x0 + i * lw, 0, lw - 4, H); g.globalAlpha = 1;
      g.fillStyle = l.color; g.beginPath(); g.roundRect(x0 + i * lw + 8, hitY + 44, lw - 20, 54, 12); g.fill();
      g.fillStyle = '#fff'; g.font = '700 30px Matty, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l.label, x0 + i * lw + lw / 2 - 2, hitY + 72);
    });
    g.fillStyle = pressed[4] ? '#fff' : 'rgba(255,255,255,.75)'; g.fillRect(x0 - 10, hitY - 4, lw * 4 + 16, 8);
    g.fillStyle = '#fff'; g.font = '400 16px Matty, sans-serif'; g.fillText('SPACE = WILD', W / 2, hitY + 122);
    if (playing) {
      for (const n of song.chart) {
        const dt = n.t - now; if (dt > TRAVEL) break; if (n.hit) continue;
        if (dt < -.2 && !n.missed) { n.missed = true; stats.combo = 0; judge = { text: 'Miss', t: now, c: '#888' }; }
        if (dt < -.5) continue;
        const y = hitY - (dt / TRAVEL) * (hitY - top); g.globalAlpha = n.missed ? .3 : 1;
        if (n.lane === 4) { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x0 - 2, y - 22, lw * 4, 44, 12); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.roundRect(x0 + 3, y - 17, lw * 4 - 10, 34, 9); g.fill(); const cw = (lw * 4 - 30) / 4; LANES.forEach((l, i) => { g.fillStyle = l.color; g.fillRect(x0 + 12 + i * cw, y + 8, cw - 6, 5); }); g.fillStyle = '#fff'; g.font = '700 20px Matty, sans-serif'; g.fillText('WILD', W / 2, y - 3); }
        else card(x0 + n.lane * lw + lw / 2 - 2, y, lw * .62, 78, LANES[n.lane].color, 1 + (Math.round(n.t * 7) % 9));
        g.globalAlpha = 1;
      }
      flashes = flashes.filter((f) => now - f.t < .25);
      for (const f of flashes) { const a = 1 - (now - f.t) / .25; g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); if (f.lane === 4) g.roundRect(x0 - 10 - 20 * (1 - a), hitY - 30, lw * 4 + 16 + 40 * (1 - a), 60, 16); else g.arc(x0 + f.lane * lw + lw / 2, hitY, 30 + 50 * (1 - a), 0, 7); g.stroke(); g.globalAlpha = 1; }
      if (now - judge.t < .5) { g.fillStyle = judge.c; g.font = '700 42px Matty, sans-serif'; g.fillText(judge.text, W / 2, hitY - 90 - (now - judge.t) * 40); }
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 22px Matty, sans-serif'; g.fillText(`Combo ${stats.combo}`, x0 + lw * 4 + 30, 120); g.fillText(`${Math.round(stats.score / stats.total * 100)}%`, x0 + lw * 4 + 30, 152); g.textAlign = 'center';
      if (now < 0) { g.font = '700 90px Matty, sans-serif'; g.fillStyle = '#fff'; g.fillText(Math.ceil(-now), W / 2, H / 2 - 60); }
      const last = song.chart[song.chart.length - 1].t;
      if (now > last - 1.5 && now < last + .6) { g.font = '700 70px Matty, sans-serif'; g.fillStyle = '#FFCC19'; g.fillText('UNO!', W / 2, 190); }
      if (now > last + 1.6) finish();
    }
  }
  frame(); menu();
}
