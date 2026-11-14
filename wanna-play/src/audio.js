let ctx = null, master = null, muted = false;
export function audio() {
  if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : .5; master.connect(ctx.destination); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function out() { audio(); return master; }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : .5; }
export function isMuted() { return muted; }
export function tone(freq, dur = .15, type = 'sine', vol = .3, when = 0, dest) {
  const c = audio(), t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(dest || master); o.start(t); o.stop(t + dur + .05); return o;
}
export function noise(dur = .1, vol = .3, when = 0, hp = 4000, dest) {
  const c = audio(), t = c.currentTime + when, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(dest || master); s.start(t); return s;
}
export const sfx = {
  good() { tone(660, .1, 'triangle'); tone(990, .16, 'triangle', .3, .08); },
  bad() { tone(200, .25, 'sawtooth', .2); tone(150, .3, 'sawtooth', .2, .1); },
  click() { tone(520, .05, 'square', .12); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .3, i * .11)); },
  swish() { noise(.25, .25, 0, 2500); },
  bounce() { tone(110, .12, 'sine', .4); },
  whoosh() { noise(.5, .2, 0, 800); },
};
