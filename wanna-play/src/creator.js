import * as THREE from 'three';
import { h, fill } from './ui.js';
import { state, save } from './state.js';
import { sfx } from './audio.js';
import { SKINS, HAIR_STYLES, HAIR_COLORS, COLORS, ACCS, BOTTOMS, TOPS } from './avatar.js';

// "Fit For the Games" character creator. Used before entering and at the Dress to Impress booth.
export function openCreator(app, done, first = false) {
  const { scene, camera } = app.miniScene('#ffd1e6');
  const av = app.makeAvatar(); scene.add(av.group);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, .16, 40), new THREE.MeshStandardMaterial({ color: '#FA001E' })); ped.position.y = -.08; scene.add(ped);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshStandardMaterial({ color: '#ff9ec6' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.16; scene.add(floor);
  camera.position.set(.9, 1.35, 4.4); camera.lookAt(.9, .95, 0);
  av.setPose('wave');
  let spin = 0;
  app.setActive({ scene, camera, update(dt) { spin += dt * .5; av.group.rotation.y = Math.sin(spin) * .7 - .25; av.update(dt); } });

  const c = state.avatar;
  const set = (k, v) => { c[k] = v; av.setConfig({ ...c, wearTee: state.wearTee }); sfx.click(); save(); draw(); };
  const sw = (k, list) => h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, list.map((col, i) => {
    const val = k === 'skin' ? i : col;
    return h('button', { class: 'swatch' + (c[k] === val ? ' sel' : ''), style: `background:${col}`, 'aria-label': `${k} ${col}`, onclick: () => set(k, val) });
  }));
  const op = (k, list) => h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, list.map((v) => h('button', { class: 'opt' + (c[k] === v ? ' sel' : ''), onclick: () => set(k, v) }, v)));
  const panel = h('div', { class: 'panel creator' });
  function draw() {
    fill(panel, 
      h('h2', {}, 'Fit For the Games'), h('div', { style: 'font-size:15px' }, first ? 'Build your player, then step through the portal.' : 'Change your look any time.'),
      h('h3', {}, 'Skin'), sw('skin', SKINS),
      h('h3', {}, 'Hair'), op('hair', HAIR_STYLES), h('div', { style: 'height:8px' }), sw('hairColor', HAIR_COLORS),
      h('h3', {}, 'Top'), op('topType', TOPS), h('div', { style: 'height:8px' }), sw('top', COLORS),
      state.tee && h('label', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px;font-size:15px' }, h('input', { type: 'checkbox', checked: state.wearTee || null, onchange: (e) => { state.wearTee = e.target.checked; save(); av.setConfig({ wearTee: state.wearTee }); } }), 'Wear my custom tee'),
      h('h3', {}, 'Bottom'), op('bottomType', BOTTOMS), h('div', { style: 'height:8px' }), sw('bottom', COLORS),
      h('h3', {}, 'Shoes'), sw('shoes', COLORS),
      h('h3', {}, 'Extra'), op('acc', ACCS),
      h('div', { style: 'margin-top:18px;text-align:center' }, h('button', { class: 'btn', onclick: () => { sfx.good(); done(); } }, first ? "Done — let's go" : 'Done')),
    );
  }
  draw(); app.overlay.append(panel);
}
