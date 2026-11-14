import * as THREE from 'three';
import { h, wait, toast, confetti, fill } from '../ui.js';
import { sfx, tone } from '../audio.js';
import { GYMNAST } from '../avatar.js';

const MOVES = [['star', 'Star jump'], ['victory', 'Victory'], ['arabesque', 'Arabesque'], ['flex', 'Flex'], ['salute', 'Salute'], ['lunge', 'Lunge']];
const NOTES = [523, 587, 659, 784, 880, 988];
const GOAL = 6;

export function start(app, exit) {
  const { scene, camera } = app.miniScene('#ff7a3c');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#ffb48a' })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), new THREE.MeshBasicMaterial({ color: '#FA001E' })); wall.position.set(0, 2.1, -1.6); scene.add(wall);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6), new THREE.MeshBasicMaterial({ color: '#2a0f4a' })); screen.position.set(-2.2, 2.1, -1.55); scene.add(screen);
  const gym = app.makeAvatar(GYMNAST); gym.group.position.set(-2.2, .25, -1.2); gym.group.scale.setScalar(1.55); scene.add(gym.group);
  const me = app.makeAvatar(); me.group.position.set(1.9, 0, .4); scene.add(me.group);
  camera.position.set(0, 1.5, 8.6); camera.lookAt(-.1, .75, 0);
  app.setActive({ scene, camera, update(dt) { gym.update(dt); me.update(dt); } });

  // pose thumbnails rendered from the same character
  const { scene: ts, camera: tc } = app.miniScene('#ffe3ef'); const thumb = app.makeAvatar(GYMNAST); ts.add(thumb.group); tc.position.set(0, 1.05, 3.6); tc.lookAt(0, 1.0, 0);
  const thumbs = MOVES.map(([p]) => { thumb.setPose(p); for (let i = 0; i < 30; i++) thumb.update(.05); return app.snapshot(ts, tc, 120, 140).toDataURL(); });

  const root = h('div', { class: 'screen', style: 'justify-content:flex-end;padding-bottom:40px' });
  const status = h('div', { class: 'big', style: 'font-size:30px;position:absolute;top:70px' }, '');
  const btns = h('div', { class: 'row' }, MOVES.map(([p, label], i) => h('button', { class: 'posebtn', onclick: () => pick(i) }, h('img', { src: thumbs[i], alt: '' }), label)));
  const bar = h('div', { style: 'width:420px;height:10px;background:rgba(255,255,255,.4);border-radius:9px;overflow:hidden' }, h('i', { style: 'display:block;height:100%;background:#fff;width:100%' }));
  const info = h('div', { class: 'card' });
  root.append(status, info, bar, btns); app.overlay.append(root, app.gameBar('Simone Says'));
  let seq = [], at = 0, accepting = false, deadline = 0, timer = 0, alive = true;
  const lock = (on) => { for (const b of btns.children) b.disabled = on; btns.style.opacity = on ? .5 : 1; };

  function menu(msg, sub) {
    lock(true); bar.style.visibility = 'hidden'; info.hidden = false; status.textContent = '';
    fill(info, h('h2', {}, msg), h('p', {}, sub), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { info.hidden = true; seq = []; round(); } }, seq.length ? 'Play again' : 'Start'), seq.length ? h('button', { class: 'btn alt', onclick: exit }, 'Done') : null));
  }
  async function round() {
    seq.push(Math.random() * MOVES.length | 0); accepting = false; lock(true); bar.style.visibility = 'hidden';
    status.textContent = `Round ${seq.length} — watch`; me.setPose('idle'); await wait(700);
    for (const m of seq) {
      if (!root.isConnected) return;
      gym.setPose(MOVES[m][0]); tone(NOTES[m], .3, 'triangle', .3); await wait(Math.max(420, 800 - seq.length * 40));
      gym.setPose('idle'); await wait(180);
    }
    if (!root.isConnected) return;
    status.textContent = 'Your turn — repeat the sequence'; at = 0; accepting = true; lock(false); bar.style.visibility = 'visible'; arm();
  }
  function arm() { deadline = performance.now() + 4000; cancelAnimationFrame(timer); (function tick() { if (!accepting || !root.isConnected) return; const left = (deadline - performance.now()) / 4000; bar.firstChild.style.width = Math.max(0, left * 100) + '%'; if (left <= 0) return fail('Too slow!'); timer = requestAnimationFrame(tick); })(); }
  function pick(i) {
    if (!accepting) return; me.setPose(MOVES[i][0]);
    if (i !== seq[at]) return fail('Not quite!');
    tone(NOTES[i], .25, 'triangle', .3); at++;
    if (at < seq.length) return arm();
    accepting = false; lock(true); sfx.good(); toast(root, 'Nailed it!');
    if (seq.length === GOAL && app.award('simone')) { confetti(root); toast(root, 'Ring won!', 1600); }
    setTimeout(() => root.isConnected && round(), 1000);
  }
  function fail(msg) {
    accepting = false; sfx.bad(); me.setPose('sad'); gym.setPose('idle');
    const n = seq.length - 1; app.state.best.simone = Math.max(app.state.best.simone || 0, n);
    menu(msg, `You cleared ${n} round${n === 1 ? '' : 's'}. Clear ${GOAL} to win the ring. Best: ${app.state.best.simone}.`);
  }
  seq = []; menu('Simone Says', 'Watch the gymnast on the big screen, then repeat her poses in the same order. The sequence grows by one every round.');
}
