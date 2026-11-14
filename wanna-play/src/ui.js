export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function toast(root, text, ms = 900) {
  const t = h('div', { class: 'toast' }, text); root.append(t);
  t.animate([{ opacity: 0, transform: 'translateX(-50%) scale(.6)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }, { opacity: 0, transform: 'translateX(-50%) scale(1.15)' }], { duration: ms });
  setTimeout(() => t.remove(), ms - 20);
}
export function confetti(root, ms = 3500) {
  const cv = h('canvas', { class: 'confetti' }); root.append(cv);
  cv.width = innerWidth; cv.height = innerHeight; const g = cv.getContext('2d');
  const cols = ['#FA001E', '#FFCC19', '#3146E4', '#58D141', '#FF1F9E'];
  const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * cv.width, y: -Math.random() * cv.height * .5, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, r: 5 + Math.random() * 7, c: cols[Math.random() * 5 | 0], a: Math.random() * 6 }));
  const t0 = performance.now();
  (function tick() {
    const t = performance.now() - t0; if (t > ms || !cv.isConnected) { cv.remove(); return; }
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.a += .1; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); }
    requestAnimationFrame(tick);
  })();
}

export function fill(el, ...kids) { el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false)); }
