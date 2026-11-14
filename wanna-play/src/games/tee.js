import { h, toast, fill } from '../ui.js';
import { sfx } from '../audio.js';
import { state, save } from '../state.js';

const PAINTS = ['#FA001E', '#FF5200', '#FFCC19', '#58D141', '#1BE8C0', '#3146E4', '#662D91', '#FF1F9E', '#1c1030', '#ffffff'];
const BASES = ['#ffffff', '#1c1030', '#FFCC19', '#FF1F9E', '#3146E4', '#FA001E', '#58D141'];
const STICKERS = ['star', 'burst', 'bolt', 'heart', 'ring', 'ball'];
const S = 512;

function drawSticker(g, kind, x, y, r, color) {
  g.save(); g.translate(x, y); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = r * .22; g.beginPath();
  if (kind === 'star') for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - 1.571, rr = i % 2 ? r * .45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  if (kind === 'burst') for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, rr = i % 2 ? r * .8 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  if (kind === 'bolt') { g.moveTo(r * .2, -r); g.lineTo(-r * .6, r * .15); g.lineTo(-r * .05, r * .15); g.lineTo(-r * .25, r); g.lineTo(r * .6, -r * .2); g.lineTo(r * .05, -r * .2); }
  if (kind === 'heart') { g.moveTo(0, r * .9); g.bezierCurveTo(-r * 1.6, -r * .2, -r * .5, -r * 1.2, 0, -r * .35); g.bezierCurveTo(r * .5, -r * 1.2, r * 1.6, -r * .2, 0, r * .9); }
  if (kind === 'ring') { g.arc(0, 0, r * .8, 0, 7); g.stroke(); g.restore(); return; }
  if (kind === 'ball') { g.arc(0, 0, r, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = r * .12; g.beginPath(); g.arc(-r * 1.1, 0, r, -.9, .9); g.stroke(); g.beginPath(); g.arc(r * 1.1, 0, r, Math.PI - .9, Math.PI + .9); g.stroke(); g.restore(); return; }
  g.closePath(); g.fill(); g.restore();
}
function splat(g, x, y, r, color) {
  g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, d = r * (.7 + Math.random() * 1.3), rr = r * (.08 + Math.random() * .28); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 7); g.fill(); if (Math.random() < .5) { g.lineWidth = rr * 1.2; g.strokeStyle = color; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); g.stroke(); } }
}
function teePath(g, w, hh) { // tee silhouette inside w x hh
  const p = [[.3, .04], [.4, .1], [.6, .1], [.7, .04], [.98, .2], [.88, .4], [.76, .34], [.76, .98], [.24, .98], [.24, .34], [.12, .4], [.02, .2]];
  g.beginPath(); p.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x * w, y * hh)); g.closePath();
}

export function start(app, exit) {
  const design = document.createElement('canvas'); design.width = design.height = S; const dg = design.getContext('2d');
  let base = state.teeBase || '#ffffff', color = PAINTS[0], tool = 'serve', sticker = 'star', history = [], balls = 12, drag = null, fly = null;
  if (state.tee) { const im = new Image(); im.onload = () => { dg.drawImage(im, 0, 0, S, S); }; im.src = state.tee; } else { dg.fillStyle = base; dg.fillRect(0, 0, S, S); }
  const snap = () => { history.push(dg.getImageData(0, 0, S, S)); if (history.length > 20) history.shift(); };

  const root = h('div', { class: 'screen', style: 'background:linear-gradient(#bfe6ff,#3987D3);flex-direction:row;gap:26px;padding-top:76px' });
  const cv = h('canvas', { width: 620, height: 680, style: 'border-radius:24px;background:#2e7bd0;box-shadow:0 10px 0 rgba(0,0,0,.15);cursor:crosshair;touch-action:none;max-height:calc(100vh - 120px);width:auto' }); const g = cv.getContext('2d');
  const panel = h('div', { class: 'panel', style: 'width:330px;text-align:left' });
  root.append(cv, panel); app.overlay.append(root, app.gameBar('Game. Set. Design.'));
  // tee print area on the big canvas
  const TX = 60, TY = 20, TW = 500, TH = 500, PX = TX + TW * .26, PY = TY + TH * .16, PS = TW * .48;
  const toDesign = (x, y) => [(x - PX) / PS * S, (y - PY) / PS * S];
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  const BALL0 = [310, 620];

  function ui() {
    const opt = (id, label) => h('button', { class: 'opt' + (tool === id ? ' sel' : ''), onclick: () => { tool = id; sfx.click(); ui(); } }, label);
    fill(panel, 
      h('h2', { style: 'margin:0;color:#FA001E' }, 'Your serve. Your design.'),
      h('div', { style: 'font-size:15px;margin:6px 0 10px' }, tool === 'serve' ? `Pull back from the ball and let go to serve paint at the tee. ${balls} balls left.` : tool === 'sticker' ? 'Click the tee to place a sticker.' : tool === 'draw' ? 'Drag on the tee to draw.' : 'Type your text, then click the tee to place it.'),
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, opt('serve', 'Serve paint'), opt('sticker', 'Stickers'), opt('draw', 'Draw'), opt('text', 'Text')),
      tool === 'sticker' && h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px;margin-top:10px' }, STICKERS.map((s) => h('button', { class: 'opt' + (sticker === s ? ' sel' : ''), onclick: () => { sticker = s; ui(); } }, s))),
      tool === 'text' && h('input', { id: 'teetext', maxlength: 14, value: 'PLAY', style: 'margin-top:10px;font:700 20px Matty,sans-serif;padding:8px 12px;border-radius:12px;border:3px solid #e5e5ea;width:100%' }),
      h('h3', { style: 'margin:14px 0 6px;font-size:13px;color:#777;text-transform:uppercase' }, 'Colour'),
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, PAINTS.map((c) => h('button', { class: 'swatch' + (color === c ? ' sel' : ''), style: `background:${c}`, 'aria-label': c, onclick: () => { color = c; ui(); } }))),
      h('h3', { style: 'margin:14px 0 6px;font-size:13px;color:#777;text-transform:uppercase' }, 'Tee colour (clears the design)'),
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, BASES.map((c) => h('button', { class: 'swatch' + (base === c ? ' sel' : ''), style: `background:${c}`, 'aria-label': c, onclick: () => { snap(); base = c; dg.fillStyle = c; dg.fillRect(0, 0, S, S); balls = 12; ui(); } }))),
      h('div', { class: 'row', style: 'margin-top:18px;justify-content:flex-start' },
        h('button', { class: 'btn alt small', onclick: () => { const im = history.pop(); if (im) dg.putImageData(im, 0, 0); } }, 'Undo'),
        h('button', { class: 'btn alt small', onclick: download }, 'Download PNG')),
      h('div', { style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: wear }, 'Print it & wear it')),
    );
  }
  function teeImage(scale = 2) { // full tee picture for download
    const c = document.createElement('canvas'); c.width = TW * scale; c.height = TH * scale; const x = c.getContext('2d'); x.scale(scale, scale);
    teePath(x, TW, TH); x.fillStyle = base; x.fill(); x.save(); x.clip(); x.drawImage(design, TW * .26, TH * .16, PS, PS); x.restore();
    teePath(x, TW, TH); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; x.stroke(); return c;
  }
  function download() { const a = document.createElement('a'); a.download = 'wanna-play-tee.png'; a.href = teeImage().toDataURL('image/png'); a.click(); sfx.good(); }
  function wear() {
    state.tee = design.toDataURL('image/png'); state.teeBase = base; state.wearTee = true; save();
    app.world.refreshAvatar(); sfx.win(); toast(root, 'Printed! You are wearing it.', 1400); setTimeout(() => root.isConnected && exit(), 1300);
  }
  cv.addEventListener('pointerdown', (e) => {
    const [x, y] = pt(e), [dx, dy] = toDesign(x, y); cv.setPointerCapture(e.pointerId);
    if (tool === 'serve') { if (balls > 0 && !fly && Math.hypot(x - BALL0[0], y - BALL0[1]) < 70) drag = { x, y }; return; }
    if (dx < 0 || dy < 0 || dx > S || dy > S) return; snap();
    if (tool === 'sticker') { drawSticker(dg, sticker, dx, dy, 46, color); sfx.click(); }
    if (tool === 'text') { const t = (document.getElementById('teetext')?.value || 'PLAY').toUpperCase(); dg.fillStyle = color; dg.font = '700 64px Matty, sans-serif'; dg.textAlign = 'center'; dg.textBaseline = 'middle'; dg.fillText(t, dx, dy, S - 20); sfx.click(); }
    if (tool === 'draw') drag = { x: dx, y: dy, draw: true };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return; const [x, y] = pt(e);
    if (drag.draw) { const [dx, dy] = toDesign(x, y); dg.strokeStyle = color; dg.lineWidth = 12; dg.lineCap = 'round'; dg.beginPath(); dg.moveTo(drag.x, drag.y); dg.lineTo(dx, dy); dg.stroke(); drag.x = dx; drag.y = dy; }
    else { drag.cx = x; drag.cy = y; }
  });
  cv.addEventListener('pointerup', () => {
    if (!drag) return; const d = drag; drag = null; if (d.draw || d.cx == null) return;
    const vx = (BALL0[0] - d.cx) * 3.2, vy = (BALL0[1] - d.cy) * 3.2; if (Math.hypot(vx, vy) < 60) return;
    const tx = BALL0[0] + vx, ty = BALL0[1] + vy; balls--; fly = { t: 0, tx, ty, power: Math.min(1, Math.hypot(vx, vy) / 700), color }; sfx.whoosh(); ui();
  });
  let raf = 0, last = performance.now();
  (function frame() {
    if (!root.isConnected) return; raf = requestAnimationFrame(frame); const now = performance.now(), dt = (now - last) / 1000; last = now;
    g.clearRect(0, 0, 620, 680);
    g.fillStyle = '#2e7bd0'; g.fillRect(0, 0, 620, 680); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; g.strokeRect(30, 540, 560, 200); g.beginPath(); g.moveTo(310, 540); g.lineTo(310, 680); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(20, 530, 580, 6); // net tape
    g.save(); g.translate(TX, TY); teePath(g, TW, TH); g.fillStyle = base; g.fill(); g.clip(); g.drawImage(design, PX - TX, PY - TY, PS, PS); g.restore();
    g.save(); g.translate(TX, TY); teePath(g, TW, TH); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 3; g.stroke(); g.restore();
    g.setLineDash([8, 8]); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(PX, PY, PS, PS); g.setLineDash([]);
    if (tool === 'serve') {
      let bx = BALL0[0], by = BALL0[1], br = 20;
      if (drag?.cx != null) { bx = drag.cx; by = drag.cy; g.strokeStyle = '#fff'; g.lineWidth = 4; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(bx, by); g.lineTo(BALL0[0] + (BALL0[0] - bx) * 3.2, BALL0[1] + (BALL0[1] - by) * 3.2); g.stroke(); g.setLineDash([]); }
      if (fly) { fly.t += dt * 2.6; const u = Math.min(1, fly.t); bx = BALL0[0] + (fly.tx - BALL0[0]) * u; by = BALL0[1] + (fly.ty - BALL0[1]) * u - Math.sin(u * Math.PI) * 60; br = 20 - u * 8;
        if (u >= 1) { const [dx, dy] = toDesign(fly.tx, fly.ty); if (dx > -40 && dy > -40 && dx < S + 40 && dy < S + 40) { snap(); splat(dg, dx, dy, 26 + fly.power * 40, fly.color); sfx.bounce(); } else { toast(root, 'Out!', 600); sfx.bad(); } fly = null; } }
      if (balls > 0 || fly) { g.fillStyle = fly ? fly.color : color; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(bx - br * 1.1, by, br, -.8, .8); g.stroke(); }
    }
  })();
  ui();
}
