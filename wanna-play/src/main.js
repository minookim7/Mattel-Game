import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { state, save, RINGS } from './state.js';
import { h, confetti, toast, fill } from './ui.js';
import { audio, setMuted, isMuted, sfx } from './audio.js';
import { makeAvatar } from './avatar.js';
import { createWorld } from './world.js';
import { runIntro } from './intro.js';
import { openCreator } from './creator.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), .04).texture;

const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const listeners = [];

export const app = {
  renderer, envMap, overlay, state, active: null, world: null, inGame: false, keys: new Set(),
  setActive(a) { this.active = a; resize(); },
  // listeners registered here are removed automatically when the current game closes
  on(target, type, fn, opts) { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); },
  makeAvatar(cfg) { const a = makeAvatar(cfg || { ...state.avatar, wearTee: state.wearTee }); if (!cfg) applyTee(a); return a; },
  miniScene(bg = '#ffd9ea') {
    const scene = new THREE.Scene(); scene.background = new THREE.Color(bg); scene.environment = envMap; scene.environmentIntensity = .5;
    scene.add(new THREE.HemisphereLight('#ffffff', '#ffb6d0', 1.6));
    const d = new THREE.DirectionalLight('#fff', 1.8); d.position.set(3, 6, 4); scene.add(d);
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 300);
    return { scene, camera };
  },
  // render a scene to an offscreen 2D canvas (used for pose thumbnails and photos)
  snapshot(scene, camera, w, h2) {
    const pr = renderer.getPixelRatio(), full = new THREE.Vector2(); renderer.getSize(full);
    w = Math.min(w, full.x); h2 = Math.min(h2, full.y);
    const asp = camera.aspect; camera.aspect = w / h2; camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, w, h2); renderer.setScissor(0, 0, w, h2); renderer.setScissorTest(true);
    renderer.render(scene, camera);
    const out = document.createElement('canvas'); out.width = w * pr; out.height = h2 * pr;
    out.getContext('2d').drawImage(canvas, 0, canvas.height - h2 * pr, w * pr, h2 * pr, 0, 0, w * pr, h2 * pr);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, full.x, full.y);
    camera.aspect = asp; camera.updateProjectionMatrix();
    return out;
  },
  award(id) {
    if (state.rings[id]) return false;
    state.rings[id] = true; save(); drawRings(); sfx.win();
    return true;
  },
  async openGame(id) {
    if (this.inGame) return; this.inGame = true; hud.hidden = true; audio();
    const mods = {
      quiz: () => import('./games/quiz.js'), uno: () => import('./games/uno.js'), simone: () => import('./games/simone.js'),
      court: () => import('./games/court.js'), race: () => import('./games/race.js'), tee: () => import('./games/tee.js'),
      photo: () => import('./games/photo.js'), dress: null,
    };
    if (id === 'dress') { openCreator(app, () => { app.world.refreshAvatar(); app.closeGame(); }); return; }
    const m = await mods[id](); m.start(app, () => app.closeGame());
  },
  closeGame() {
    for (const [t, ty, fn, o] of listeners.splice(0)) t.removeEventListener(ty, fn, o);
    fill(overlay, ); this.inGame = false; hud.hidden = false;
    this.world.resume(); this.setActive(this.world.view); this.keys.clear();
    if (RINGS.every((r) => state.rings[r.id]) && !state.medal) medalMoment();
  },
  gameBar(title, onExit) {
    return h('div', { class: 'gamebar' }, h('div', { class: 'title' }, title), h('button', { class: 'btn alt small', onclick: () => { sfx.click(); (onExit || (() => app.closeGame()))(); } }, 'Back to the Playhouse'));
  },
};

export function applyTee(avatar) {
  if (!state.tee) { avatar.setTee(null); return; }
  const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(img, 0, 0, 512, 512); avatar.setTee(c, state.teeBase); avatar.setConfig({ wearTee: state.wearTee }); };
  img.src = state.tee;
}

function drawRings() {
  const el = document.getElementById('rings'); fill(el, );
  for (const r of RINGS) el.append(h('div', { class: 'ring' + (state.rings[r.id] ? ' on' : ''), style: state.rings[r.id] ? `border-color:${r.color};color:${r.color}` : '', title: r.label }));
  el.append(h('b', { style: 'margin-left:6px;font-size:14px' }, `${RINGS.filter((r) => state.rings[r.id]).length}/5 rings`));
}
function medalMoment() {
  state.medal = true; save(); sfx.win(); setTimeout(sfx.win, 500);
  const s = h('div', { class: 'screen dim' },
    h('div', { class: 'big' }, '5 RINGS FOR YOU!'),
    h('div', { class: 'card' }, h('h2', {}, 'Gold medal in play'), h('p', {}, 'You played every game in the Wanna Playhouse. A gold medal has been added to your character — head to the rings for your podium photo.'),
      h('button', { class: 'btn', onclick: () => s.remove() }, 'Keep playing')));
  overlay.append(s); confetti(s, 6000);
  state.avatar.acc = 'medal'; save(); app.world.refreshAvatar();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  const c = app.active?.camera; if (c) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
}
addEventListener('resize', resize);
addEventListener('keydown', (e) => { app.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && e.target.tagName !== 'INPUT') e.preventDefault(); });
addEventListener('keyup', (e) => app.keys.delete(e.code));
addEventListener('blur', () => app.keys.clear());

document.getElementById('mute').onclick = (e) => { setMuted(!isMuted()); e.target.textContent = 'Sound: ' + (isMuted() ? 'off' : 'on'); e.target.blur(); };
document.getElementById('help').onclick = (e) => { e.target.blur(); showHelp(); };
function showHelp() {
  const s = h('div', { class: 'screen dim' }, h('div', { class: 'card' }, h('h2', {}, 'How to play'),
    h('p', { html: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys to walk' }),
    h('p', { html: 'Stand on a red burst, then press <kbd>Space</kbd> or click to play' }),
    h('p', {}, 'Win a ring at Simone Says, The Ultimate Race, Club UNO, the Dream Court and the Creator Studio. Collect all five.'),
    h('button', { class: 'btn', onclick: () => s.remove() }, 'Got it')));
  overlay.append(s);
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05);
  const a = app.active; if (!a) return;
  a.update?.(dt);
  renderer.render(a.scene, a.camera);
}
resize(); loop();

// boot: load the world while the intro plays
const worldReady = createWorld(app, (p) => window.dispatchEvent(new CustomEvent('world-progress', { detail: p })));
async function enterWorld() {
  fill(overlay, );
  app.world = await worldReady;
  app.world.refreshAvatar(); app.world.resume(); app.setActive(app.world.view);
  hud.hidden = false; drawRings();
  if (!state.created) { state.created = true; save(); showHelp(); }
}
// ?skip jumps straight into the world (handy while developing)
if (location.search.includes('skip')) { state.created = true; enterWorld(); }
else runIntro(app, worldReady, () => openCreator(app, enterWorld, true));
window.__app = app;
