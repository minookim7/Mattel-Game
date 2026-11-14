import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { state, save } from './state.js';
import { applyTee } from './main.js';
import { sfx } from './audio.js';

// Blender (x, y) on the ground -> three.js (x, 0, -y)
const B = (x, y) => new THREE.Vector3(x, 0, -y);

// Zone triggers, positions in Blender ground coordinates taken from the open scene
export const ZONES = [
  { id: 'simone', label: 'Simone Says', sub: 'Repeat the sequence', at: [-23.6, 9.6] },
  { id: 'photo', label: "Let's Play!", sub: 'Rings photo op', at: [-13.4, 1.3] },
  { id: 'tee', label: 'Game. Set. Design.', sub: 'Design your tee', at: [-15.4, 6.6] },
  { id: 'race', label: 'The Ultimate Race', sub: 'Hot Wheels slide race', at: [-9.2, 8.6] },
  { id: 'uno', label: 'Club UNO', sub: 'Rhythm game', at: [-5.9, 1.4] },
  { id: 'quiz', label: 'Creator Studio', sub: 'Mattel trivia', at: [-4.6, -7.2] },
  { id: 'court', label: 'Barbie Dream Court', sub: 'B-A-R-B-I-E', at: [-12.6, -6.4] },
  { id: 'dress', label: 'Fit For the Games', sub: 'Change your look', at: [-17.4, -5.6] },
];
// Solid boxes [xmin, xmax, ymin, ymax] in Blender ground coordinates
const BLOCKS = [
  [-20.4, -19.4, -14.4, -1.0], [-20.4, -19.4, 3.5, 16.8], // LED wall either side of the portal
  [-11.7, -8.7, -2.4, 4.9], // rings podium
  [-1.7, 1.0, -1.9, 4.4], // Club UNO
  [-2.4, 1.5, -9.8, -5.6], // Creator Studio desk + wall
  [-7.8, 1.3, 7.5, 16.4], // Hot Wheels slide and tower
  [-19.3, -18.6, 7.7, 11.7], // Game. Set. Design. LED wall
  [-17.75, -17.5, 8.1, 10.8], // tennis net
];
const BOUNDS = { xmin: -31, xmax: 2.3, ymin: -16.2, ymax: 16.3 };

function labelSprite(text, sub) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 176; const g = c.getContext('2d');
  g.fillStyle = '#FA001E'; g.beginPath(); g.roundRect(4, 4, 632, 168, 84); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 58px Matty, sans-serif'; g.fillText(text, 320, 84, 580);
  g.font = '400 34px Matty, sans-serif'; g.fillText(sub, 320, 136, 560);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2.9, .8, 1); s.renderOrder = 10;
  return s;
}
function burstMesh(r = 1.25, color = '#FA001E') {
  const sh = new THREE.Shape(), n = 24;
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * .82 : r; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;
}

export async function createWorld(app, onProgress) {
  const scene = new THREE.Scene();
  const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256; const sg = sky.getContext('2d');
  const gr = sg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#3fa9f5'); gr.addColorStop(.6, '#bfe6ff'); gr.addColorStop(1, '#ffe9c9'); sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  scene.environment = app.envMap; scene.environmentIntensity = .55;
  scene.fog = new THREE.Fog('#d9efff', 70, 260);
  scene.add(new THREE.HemisphereLight('#ffffff', '#f2d6a8', 1.5));
  const sun = new THREE.DirectionalLight('#fff4dc', 2.4); sun.position.set(-30, 40, 20); scene.add(sun);

  // Venice Beach surroundings: sand and ocean beyond the boardwalk
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(90, 400), new THREE.MeshStandardMaterial({ color: '#f1d9a7', roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(-79, .05, 0); scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 800), new THREE.MeshStandardMaterial({ color: '#2aa7d8', roughness: .25, metalness: .1 })); sea.rotation.x = -Math.PI / 2; sea.position.set(-380, .08, 0); scene.add(sea);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.load(import.meta.env.BASE_URL + 'assets/playhouse.glb', res, (e) => onProgress?.(e.total ? e.loaded / e.total : .5), rej));
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, .35); }
      m.envMapIntensity = .6;
    }
  });
  scene.add(gltf.scene);

  await Promise.all([document.fonts.load('700 58px Matty'), document.fonts.load('400 34px Matty')]).catch(() => {});
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 600);
  let avatar = app.makeAvatar(); scene.add(avatar.group);
  const pos = B(-27, 1.24), SPAWN_YAW = Math.PI / 2; let yaw = SPAWN_YAW, camYaw = yaw;
  avatar.group.position.copy(pos);

  const markers = ZONES.map((z) => {
    const p = B(...z.at), b = burstMesh(); b.position.set(p.x, .09, p.z); scene.add(b);
    const l = labelSprite(z.label, z.sub); l.position.set(p.x, 3.1, p.z); scene.add(l);
    return { z, p, b, l };
  });

  const prompt = document.getElementById('prompt'), flash = document.getElementById('flash');
  let near = null, paused = true, cooldown = 0, t = 0, wasOutside = true;
  prompt.onclick = () => near && app.openGame(near.z.id);
  addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat && near && !paused && performance.now() > cooldown && !app.inGame) app.openGame(near.z.id); });

  function collide(p) {
    const r = .35; let x = p.x, y = -p.z;
    for (const [x0, x1, y0, y1] of BLOCKS) {
      const cx = Math.max(x0, Math.min(x, x1)), cy = Math.max(y0, Math.min(y, y1)), dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); x = cx + dx / d * r; y = cy + dy / d * r; }
        else { // centre is inside the box: push out through the nearest face
          const l = x - x0, rr = x1 - x, b2 = y - y0, tt = y1 - y, m = Math.min(l, rr, b2, tt);
          if (m === l) x = x0 - r; else if (m === rr) x = x1 + r; else if (m === b2) y = y0 - r; else y = y1 + r;
        }
      }
    }
    p.x = Math.max(BOUNDS.xmin, Math.min(BOUNDS.xmax, x)); p.z = -Math.max(BOUNDS.ymin, Math.min(BOUNDS.ymax, y));
  }

  function update(dt) {
    t += dt;
    const k = app.keys, fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0), turn = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0);
    const moving = !paused && (fwd !== 0 || turn !== 0);
    if (!paused) {
      yaw += turn * 2.4 * dt;
      if (fwd) { const sp = fwd > 0 ? 5.2 : 2.6; pos.x += Math.sin(yaw) * fwd * sp * dt; pos.z += Math.cos(yaw) * fwd * sp * dt; collide(pos); }
      const outside = pos.x < -19.9;
      if (wasOutside && !outside) { flash.classList.add('on'); sfx.whoosh(); setTimeout(() => flash.classList.remove('on'), 180); }
      wasOutside = outside;
    }
    avatar.group.position.copy(pos); avatar.group.rotation.y = yaw; avatar.update(dt, moving && fwd !== 0);
    // follow camera
    let d = yaw - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 4);
    const target = new THREE.Vector3(pos.x - Math.sin(camYaw) * 6.2, 3.6, pos.z - Math.cos(camYaw) * 6.2);
    camera.position.lerp(target, Math.min(1, dt * 6)); camera.lookAt(pos.x, 1.9, pos.z);
    // zones
    near = null;
    for (const m of markers) {
      m.b.rotation.z = t * .5; const s = 1 + Math.sin(t * 3) * .06; m.b.scale.set(s, s, 1);
      const dist = Math.hypot(m.p.x - pos.x, m.p.z - pos.z);
      m.l.material.opacity = THREE.MathUtils.clamp((dist - 3.5) / 2, 0, 1);
      if (dist < 1.7) near = m;
    }
    if (near && !paused) {
      prompt.hidden = false; prompt.innerHTML = `${near.z.label}<small>Press SPACE or click to play</small>`;
    } else prompt.hidden = true;
  }

  const world = {
    view: { scene, camera, update }, scene, camera, B,
    get avatar() { return avatar; }, get pos() { return pos; },
    showMarkers(v) { for (const m of markers) { m.b.visible = v; m.l.visible = v; } },
    pause() { paused = true; prompt.hidden = true; },
    resume() { paused = false; cooldown = performance.now() + 600; },
    refreshAvatar() { avatar.setConfig({ ...state.avatar, wearTee: state.wearTee }); applyTee(avatar); avatar.setPose('idle'); },
    place(x, y, face) { pos.copy(B(x, y)); yaw = camYaw = face; camera.position.set(pos.x - Math.sin(yaw) * 6.2, 3.6, pos.z - Math.cos(yaw) * 6.2); },
  };
  const origOpen = app.openGame.bind(app);
  app.openGame = (id) => { world.pause(); return origOpen(id); };
  return world;
}
