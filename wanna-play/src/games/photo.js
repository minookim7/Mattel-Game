import * as THREE from 'three';
import { h, toast, fill } from '../ui.js';
import { sfx } from '../audio.js';

const MOVES = [['wave', 'Wave'], ['star', 'Star jump'], ['victory', 'Victory'], ['flex', 'Flex'], ['salute', 'Salute'], ['cheer', 'Cheer']];
// camera presets in Blender ground coords: [camera x, y, height] looking at the rings podium
const ANGLES = [['Front', [-16.8, 0.2, 1.7]], ['Wide', [-18.4, -3.4, 2.6]], ['Low hero', [-15.2, -2.4, .6]]];

export function start(app, exit) {
  const w = app.world, av = w.avatar, { scene } = w, saved = { pos: w.pos.clone(), rot: av.group.rotation.y };
  const cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 500);
  w.showMarkers(false); const spot = w.B(-12.4, -0.9); av.group.position.copy(spot); av.group.rotation.y = -Math.PI / 2; av.setPose('wave');
  let angle = 0;
  const aim = () => { const [x, y, hh] = ANGLES[angle][1], p = w.B(x, y); cam.position.set(p.x, hh, p.z); const t = w.B(-10.6, .6); cam.lookAt(t.x, 1.5, t.z); };
  aim();
  app.setActive({ scene, camera: cam, update(dt) { av.update(dt); } });

  const root = h('div', { class: 'screen', style: 'justify-content:flex-end;padding-bottom:36px;pointer-events:none' });
  const frame = h('div', { style: 'position:absolute;inset:70px 8% 150px;border:6px solid #fff;border-radius:18px;box-shadow:0 0 0 2000px rgba(0,0,0,.25);pointer-events:none' });
  const bar = h('div', { class: 'panel row', style: 'pointer-events:auto' });
  const draw = () => fill(bar, 
    ...MOVES.map(([p, l]) => h('button', { class: 'opt', onclick: () => { av.setPose(p); sfx.click(); } }, l)), h('span', { style: 'width:14px' }),
    ...ANGLES.map(([l], i) => h('button', { class: 'opt' + (i === angle ? ' sel' : ''), onclick: () => { angle = i; aim(); draw(); } }, l)), h('span', { style: 'width:14px' }),
    h('button', { class: 'btn small', onclick: snap }, 'Snap photo'));
  draw(); root.append(frame, bar);
  app.overlay.append(root, app.gameBar("Let's Play! — photo op", () => { av.group.position.copy(saved.pos); av.group.rotation.y = saved.rot; av.setPose('idle'); w.showMarkers(true); exit(); }));

  async function snap() {
    sfx.click(); const W = 1280, H = 720, shot = app.snapshot(scene, cam, Math.min(W, innerWidth), Math.min(H, Math.round(Math.min(W, innerWidth) * 9 / 16)));
    const c = document.createElement('canvas'); c.width = W; c.height = H + 110; const g = c.getContext('2d');
    g.fillStyle = '#FA001E'; g.fillRect(0, 0, c.width, c.height); g.drawImage(shot, 18, 18, W - 36, H - 18);
    const logo = new Image(); logo.src = import.meta.env.BASE_URL + 'assets/ui/wannaplay_outline.png'; await logo.decode().catch(() => {});
    g.fillStyle = '#fff'; g.font = '700 40px Matty, sans-serif'; g.textBaseline = 'middle'; g.fillText('I played at the Wanna Playhouse', 30, H + 56);
    if (logo.naturalWidth) { const lh = 96, lw = lh * logo.naturalWidth / logo.naturalHeight; g.drawImage(logo, W - lw - 24, H + 6, lw, lh); }
    const a = document.createElement('a'); a.download = 'wanna-play-photo.png'; a.href = c.toDataURL('image/png'); a.click();
    const fl = document.getElementById('flash'); fl.classList.add('on'); setTimeout(() => fl.classList.remove('on'), 120); toast(root, 'Photo saved!', 1200);
  }
}
