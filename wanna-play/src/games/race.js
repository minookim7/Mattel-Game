import * as THREE from 'three';
import { h, wait, toast, confetti, fill } from '../ui.js';
import { sfx, tone } from '../audio.js';
import { save } from '../state.js';

// Six-lane Hot Wheels slide, stretched for gameplay. s = distance along the slide.
const LANE_W = .9, LEN = 64, RUN = 8, TOP = 9, CHEV = 7;
const height = (s) => { const u = Math.min(1, s / LEN); return TOP * (1 - u) * (1 - u) * (1 - .25 * u) + .15; };
const slope = (s) => (height(s) - height(s + .5)) / .5;
const laneX = (i) => (i - 2.5) * LANE_W;
const CARS = [['#2456d6', '#fff'], ['#FFCC19', '#111'], ['#58D141', '#111'], ['#FA001E', '#fff'], ['#662D91', '#FFCC19']];

function car(body, trim) {
  const g = new THREE.Group(), m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .35, metalness: .3 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(.6, .2, 1.3), m(body)); b.position.y = .22; g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(.5, .18, .55), m('#1c1030')); c.position.set(0, .4, -.05); g.add(c);
  const sp = new THREE.Mesh(new THREE.BoxGeometry(.62, .04, .16), m(trim)); sp.position.set(0, .46, .58); g.add(sp);
  const st = new THREE.Mesh(new THREE.BoxGeometry(.16, .205, 1.31), m(trim)); st.position.y = .22; g.add(st);
  for (const x of [-.32, .32]) for (const z of [-.42, .42]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .1, 14), m('#111')); w.rotation.z = Math.PI / 2; w.position.set(x, .13, z); g.add(w); }
  return g;
}

export function start(app, exit) {
  const { scene, camera } = app.miniScene('#7fd0ff'); scene.fog = new THREE.Fog('#7fd0ff', 40, 120);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: '#f1d9a7' })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // slide surface built from segments (travel direction is -z)
  const N = 90, pos = [], idx = [], W = LANE_W * 6;
  for (let i = 0; i <= N; i++) { const s = i / N * (LEN + RUN); pos.push(-W / 2, height(s), -s, W / 2, height(s), -s); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
  scene.add(new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: '#FF6A00', roughness: .3, side: THREE.DoubleSide })));
  const lipM = new THREE.MeshStandardMaterial({ color: '#2456d6' }), white = new THREE.MeshBasicMaterial({ color: '#fff' });
  for (let i = 0; i < N; i++) {
    const s = (i + .5) / N * (LEN + RUN), y = height(s), rot = Math.atan(slope(s)), segL = (LEN + RUN) / N + .05;
    for (let l = 0; l <= 6; l++) { const lip = new THREE.Mesh(new THREE.BoxGeometry(.07, .14, segL), lipM); lip.position.set(-W / 2 + l * LANE_W, y + .05, -s); lip.rotation.x = -rot; scene.add(lip); }
  }
  for (let c = CHEV; c < LEN; c += CHEV) for (let l = 0; l < 6; l++) { const sh = new THREE.Shape(); sh.moveTo(-.3, .25); sh.lineTo(0, -.05); sh.lineTo(.3, .25); sh.lineTo(.3, .05); sh.lineTo(0, -.25); sh.lineTo(-.3, .05); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), white); m.rotation.x = -Math.PI / 2 - Math.atan(slope(c)); m.rotation.z = Math.PI; m.position.set(laneX(l), height(c) + .03, -c); scene.add(m); }
  for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(W / 12, .4), new THREE.MeshBasicMaterial({ color: (i + j) % 2 ? '#111' : '#fff' })); q.rotation.x = -Math.PI / 2; q.position.set(-W / 2 + (i + .5) * W / 12, .17, -LEN - j * .4); scene.add(q); }
  const gantry = new THREE.Mesh(new THREE.BoxGeometry(W + 1, .5, .5), new THREE.MeshStandardMaterial({ color: '#111' })); gantry.position.set(0, TOP + 3.4, -1.5); scene.add(gantry);
  for (const x of [-W / 2 - .4, W / 2 + .4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.3, TOP + 3.4, .3), new THREE.MeshStandardMaterial({ color: '#2456d6' })); p.position.set(x, (TOP + 3.4) / 2, -1.5); scene.add(p); }

  const ME = 2, me = app.makeAvatar(); me.setPose('sit'); scene.add(me.group);
  const rivals = CARS.map(([b, t], k) => { const g = car(b, t); scene.add(g); return { g, lane: k < ME ? k : k + 1 }; });
  const place = (obj, lane, s, x = 0, lift = 0) => { obj.position.set(laneX(lane) + x, height(s) + lift, -s); obj.rotation.x = -Math.atan(slope(s)); obj.rotation.y = Math.PI; };
  let R = null; // race state
  function reset() {
    R = { phase: 'idle', t: 0, s: 0, v: 0, x: 0, drift: 0, cars: rivals.map((r, k) => ({ ...r, s: 0, v: 0, top: 13 + k * .5 + Math.random() * .9, acc: 3.6 + Math.random() * 1.2, done: 0 })), done: 0, nextChev: CHEV, cooldown: 0 };
    place(me.group, ME, 0, 0, .05); for (const c of R.cars) place(c.g, c.lane, 0);
  }
  reset(); camera.position.set(0, TOP + 3.2, 6); camera.lookAt(0, TOP - 1, -8);

  const root = h('div', { class: 'screen', style: 'justify-content:flex-start;padding-top:84px;pointer-events:none' });
  const lights = h('div', { class: 'lights panel', style: 'background:#222' }, h('i'), h('i'), h('i'));
  const hudT = h('div', { class: 'big', style: 'font-size:40px' }, '00:00.00');
  const info = h('div', { class: 'card', style: 'pointer-events:auto;margin-top:8vh' });
  root.append(lights, hudT, info); app.overlay.append(root, app.gameBar('The Ultimate Race'));
  const fmt = (t) => `00:${String(Math.floor(t)).padStart(2, '0')}.${String(Math.floor(t % 1 * 100)).padStart(2, '0')}`;

  async function countdown() {
    info.hidden = true; reset(); R.phase = 'lights'; const L = lights.children; for (const l of L) l.className = '';
    const my = R;
    for (let i = 0; i < 3; i++) { await wait(700); if (R !== my || !root.isConnected) return; L[i].className = 'red'; tone(330, .15, 'square', .2); }
    await wait(600 + Math.random() * 1400); if (R !== my || !root.isConnected) return;
    for (const l of L) l.className = 'go'; tone(660, .4, 'square', .25); R.phase = 'go'; R.goAt = performance.now();
    for (const c of R.cars) c.delay = .12 + Math.random() * .22;
  }
  app.on(window, 'keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || !R) return; e.preventDefault();
    if (R.phase === 'lights') { R.penalty = true; toast(root, 'False start! +0.5s'); sfx.bad(); }
    else if (R.phase === 'go' && !R.started) { const rt = (performance.now() - R.goAt) / 1000; R.started = true; R.v = Math.max(1.5, 6 - rt * 9); R.t = rt + (R.penalty ? .5 : 0); toast(root, `Reaction ${rt.toFixed(2)}s`, 700); sfx.whoosh(); }
    else if (R.started && !R.done && R.cooldown <= 0) {
      const near = Math.round(R.s / CHEV) * CHEV, d = Math.abs(R.s - near);
      if (near > 0 && near < LEN && d < .9) { R.v += 2.2; toast(root, 'Perfect boost!', 500); sfx.good(); }
      else if (near > 0 && near < LEN && d < 2) { R.v += 1.1; toast(root, 'Boost', 500); sfx.click(); }
      else { R.v *= .93; R.cooldown = .35; }
    }
  });
  function finish() {
    const order = [{ me: true, t: R.done }, ...R.cars.map((c) => ({ t: c.done || 99 }))].sort((a, b) => a.t - b.t), rank = order.findIndex((o) => o.me) + 1;
    const best = app.state.best.race; if (!best || R.done < best) { app.state.best.race = R.done; save(); }
    const won = rank <= 3, first = won && app.award('race'); if (won) { confetti(root); me.setPose('cheer'); }
    info.hidden = false;
    fill(info, h('h2', {}, `${['1st', '2nd', '3rd', '4th', '5th', '6th'][rank - 1]} place — ${fmt(R.done)}`), h('p', {}, (won ? (first ? 'Podium finish! You won the Ultimate Race ring.' : 'Podium finish!') : 'Finish in the top three to win the ring.') + ` Best time ${fmt(app.state.best.race)}.`),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: countdown }, 'Race again'), h('button', { class: 'btn alt', onclick: exit }, 'Done')));
  }
  app.setActive({ scene, camera, update(dt) {
    me.update(dt); if (!R) return; const k = app.keys;
    if (R.phase === 'go') {
      const el = (performance.now() - R.goAt) / 1000;
      for (const c of R.cars) { if (el < c.delay || c.done) { if (c.done) c.s += c.v * dt, c.v *= .96; continue; } c.v += (c.s < LEN ? c.acc * (1 - c.v / c.top) + slope(c.s) * 3 : -c.v * 1.5) * dt; c.s += c.v * dt; if (c.s >= LEN && !c.done) c.done = el; }
      if (R.started) {
        R.cooldown -= dt;
        if (!R.done) {
          R.t += dt; R.drift += (Math.random() - .5) * 9 * dt; R.drift *= .98;
          const steer = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
          R.x += (R.drift * .5 + steer * 1.5) * dt;
          const edge = LANE_W / 2 - .2; let fr = .12;
          if (Math.abs(R.x) > edge) { R.x = Math.sign(R.x) * edge; R.drift *= -.4; fr = 1.5; }
          R.v += (slope(R.s) * 9.8 * .55 + 1.2 - fr * R.v * .12 - R.v * R.v * .012) * dt; R.s += R.v * dt;
          hudT.textContent = fmt(R.t);
          if (R.s >= LEN) { R.done = R.t; sfx.win(); setTimeout(() => root.isConnected && finish(), 1200); }
        } else { R.v *= .95; R.s = Math.min(LEN + RUN - 1, R.s + R.v * dt); }
      }
    }
    place(me.group, ME, R.s, R.x, .05); for (const c of R.cars) place(c.g, c.lane, Math.min(c.s, LEN + RUN - 1));
    const tgt = new THREE.Vector3(laneX(ME) + R.x * .5, height(R.s) + 3.0, -R.s + 5.5); camera.position.lerp(tgt, Math.min(1, dt * 5)); camera.lookAt(laneX(ME), height(R.s + 6) + .6, -R.s - 6);
  } });
  fill(info, h('h2', {}, 'The Ultimate Race'), h('p', {}, 'Race five Hot Wheels down the six-lane slide. Top three wins the ring.'),
    h('p', { html: '<kbd>Space</kbd> on green to push off &nbsp;·&nbsp; <kbd>Space</kbd> on every white chevron to boost &nbsp;·&nbsp; <kbd>A</kbd> <kbd>D</kbd> or arrows to stay off the blue rails' }),
    h('button', { class: 'btn', onclick: countdown }, 'To the start gate'));
}
