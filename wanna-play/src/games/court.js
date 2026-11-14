import * as THREE from 'three';
import { h, wait, toast, confetti, fill } from '../ui.js';
import { sfx } from '../audio.js';
import { RIVAL } from '../avatar.js';

const WORD = 'BARBIE', G = 9.8, HOOP = new THREE.Vector3(0, 3.05, -6), RIM = .27, BALL_R = .12;
// Star spots: [x, z, label, AI make chance]
const SPOTS = [[-2.6, -3.6, '2-pt left', .62], [0, -1.8, '2-pt top', .6], [2.6, -3.6, '2-pt right', .62], [-4.4, -.4, '3-pt left', .42], [4.4, -.4, '3-pt right', .42]];

function starMesh(r, color) {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * .45 : r; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color })); m.rotation.x = -Math.PI / 2; return m;
}

export function start(app, exit) {
  const { scene, camera } = app.miniScene('#ffc4de');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#ff7fb8', roughness: .8 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const key = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5), new THREE.MeshStandardMaterial({ color: '#ff4fa0' })); key.rotation.x = -Math.PI / 2; key.position.set(0, .01, -4.2); scene.add(key);
  const arc = new THREE.Mesh(new THREE.RingGeometry(5.9, 6.0, 48, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#fff', side: THREE.DoubleSide })); arc.rotation.x = -Math.PI / 2; arc.rotation.z = Math.PI; arc.position.set(0, .012, -6); scene.add(arc);
  const wallM = new THREE.MeshStandardMaterial({ color: '#b3126f' }); const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 4, .3), wallM); wall.position.set(0, 2, -8.2); scene.add(wall);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, .06), new THREE.MeshStandardMaterial({ color: '#fff' })); board.position.set(0, 3.45, -6.42); scene.add(board);
  const sq = new THREE.Mesh(new THREE.PlaneGeometry(.6, .45), new THREE.MeshBasicMaterial({ color: '#FF1F9E', wireframe: false })); sq.position.set(0, 3.3, -6.38); sq.scale.set(1, 1, 1); scene.add(sq);
  const sq2 = new THREE.Mesh(new THREE.PlaneGeometry(.5, .35), new THREE.MeshBasicMaterial({ color: '#fff' })); sq2.position.set(0, 3.3, -6.375); scene.add(sq2);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 3.5), new THREE.MeshStandardMaterial({ color: '#fff' })); pole.position.set(0, 1.75, -6.9); scene.add(pole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(RIM, .022, 8, 28), new THREE.MeshStandardMaterial({ color: '#FF5200' })); rim.rotation.x = Math.PI / 2; rim.position.copy(HOOP); scene.add(rim);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(RIM, RIM * .6, .45, 14, 3, true), new THREE.MeshBasicMaterial({ color: '#fff', wireframe: true })); net.position.set(0, HOOP.y - .23, HOOP.z); scene.add(net);
  const stars = SPOTS.map(([x, z]) => { const s = starMesh(.55, '#FFCC19'); s.position.set(x, .02, z); scene.add(s); return s; });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 20, 16), new THREE.MeshStandardMaterial({ color: '#FF5200', roughness: .7 })); scene.add(ball);
  const me = app.makeAvatar(), ai = app.makeAvatar(RIVAL); scene.add(me.group, ai.group);
  const dots = Array.from({ length: 9 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 8), new THREE.MeshBasicMaterial({ color: '#FFCC19', depthTest: false })); d.renderOrder = 5; d.visible = false; scene.add(d); return d; });

  let spot = 1, vel = null, flight = null, camTarget = new THREE.Vector3(), camPos = new THREE.Vector3(0, 2.4, 6);
  const spotPos = (i) => new THREE.Vector3(SPOTS[i][0], 0, SPOTS[i][1]);
  function ideal(from) { const d = HOOP.clone().sub(from), dist = Math.hypot(d.x, d.z), T = .95 + dist * .07; return new THREE.Vector3(d.x / T, (d.y + .5 * G * T * T) / T, d.z / T); }
  function hand(i) { const p = spotPos(i); const dir = HOOP.clone().sub(p).setY(0).normalize(); return p.clone().addScaledVector(dir, .3).setY(2.05); }
  function stand(av, i, side) { const p = spotPos(i), dir = HOOP.clone().sub(p).setY(0).normalize(); av.group.position.copy(p).addScaledVector(new THREE.Vector3(-dir.z, 0, dir.x), side); av.group.rotation.y = Math.atan2(dir.x, dir.z); }
  function frameCam(i) { const p = spotPos(i), dir = HOOP.clone().sub(p).setY(0).normalize(); camPos.copy(p).addScaledVector(dir, -5.4).setY(3.5); camTarget.copy(HOOP).setY(2.3).lerp(p.clone().setY(1.4), .3); }

  function simulate(v, from) { // returns { made, path duration }
    const p = from.clone(), vv = v.clone(); let made = false, tt = 0; const dt = 1 / 240;
    for (; tt < 4; tt += dt) {
      const py = p.y; vv.y -= G * dt; p.addScaledVector(vv, dt);
      if (p.z < -6.42 + .03 + BALL_R && Math.abs(p.x) < .9 && p.y > 2.9 && p.y < 4.0 && vv.z < 0) { vv.z *= -.5; p.z = -6.42 + .03 + BALL_R; }
      if (py >= HOOP.y && p.y < HOOP.y && vv.y < 0) { const d = Math.hypot(p.x - HOOP.x, p.z - HOOP.z); if (d < RIM - BALL_R * .55) { made = true; } else if (d < RIM + BALL_R) { vv.y *= -.4; vv.x += (p.x - HOOP.x) * 6; vv.z += (p.z - HOOP.z) * 6; p.y = HOOP.y + .01; continue; } }
      if (p.y < BALL_R) break;
    }
    return made;
  }
  function launch(v, from) { return new Promise((res) => { const made = simulate(v, from); flight = { p: from.clone(), v: v.clone(), made, res, scored: false }; sfx.whoosh(); }); }

  app.setActive({ scene, camera, update(dt) {
    me.update(dt); ai.update(dt);
    camera.position.lerp(camPos, Math.min(1, dt * 3)); camera.lookAt(camTarget);
    if (flight) {
      const f = flight, steps = 4, sdt = dt / steps;
      for (let s = 0; s < steps; s++) {
        const py = f.p.y; f.v.y -= G * sdt; f.p.addScaledVector(f.v, sdt);
        if (f.p.z < -6.42 + .03 + BALL_R && Math.abs(f.p.x) < .9 && f.p.y > 2.9 && f.p.y < 4.0 && f.v.z < 0) { f.v.z *= -.5; f.p.z = -6.42 + .03 + BALL_R; sfx.bounce(); }
        if (py >= HOOP.y && f.p.y < HOOP.y && f.v.y < 0) { const d = Math.hypot(f.p.x - HOOP.x, f.p.z - HOOP.z); if (d < RIM - BALL_R * .55) { if (!f.scored) { f.scored = true; sfx.swish(); f.v.x *= .3; f.v.z *= .3; } } else if (d < RIM + BALL_R) { f.v.y *= -.4; f.v.x += (f.p.x - HOOP.x) * 6; f.v.z += (f.p.z - HOOP.z) * 6; f.p.y = HOOP.y + .01; sfx.bounce(); } }
        if (f.p.y < BALL_R) { f.p.y = BALL_R; flight = null; sfx.bounce(); f.res(f.scored); break; }
      }
      ball.position.copy(f.p);
    }
  } });

  // --- UI
  const root = h('div', { class: 'screen', style: 'justify-content:flex-end;padding-bottom:34px;pointer-events:none' });
  const score = h('div', { class: 'panel', style: 'position:absolute;top:76px;left:18px;display:flex;flex-direction:column;gap:8px;text-align:left' });
  const msg = h('div', { class: 'big', style: 'font-size:28px;position:absolute;bottom:96px' });
  const spotsUI = h('div', { class: 'row', style: 'pointer-events:auto' });
  const info = h('div', { class: 'card', style: 'pointer-events:auto' });
  root.append(score, msg, info, spotsUI); app.overlay.append(root, app.gameBar('Barbie Dream Court'));
  const letters = { me: 0, ai: 0 };
  const lt = (n) => `<span class="letters">${[...WORD].map((c, i) => i < n ? `<b>${c}</b>` : `<i>${c}</i>`).join('')}</span>`;
  const drawScore = () => { score.innerHTML = `<div>You<br>${lt(letters.me)}</div><div>Dream Team<br>${lt(letters.ai)}</div>`; };

  let aiming = false, drag = null, shotRes = null;
  function playerShot(i, text) {
    spot = i; stand(me, i, 0); stand(ai, i, 1.6); ai.setPose('idle'); me.setPose('ready'); frameCam(i); ball.position.copy(hand(i)); msg.textContent = text; aiming = true;
    return new Promise((res) => { shotRes = res; });
  }
  const launchFromDrag = (d) => { const v0 = ideal(hand(spot)), pow = THREE.MathUtils.clamp(1 + (-d.y - 190) / 190 * .35, .6, 1.4), ang = THREE.MathUtils.clamp(-d.x / 900, -.5, .5); return v0.clone().multiplyScalar(pow).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); };
  app.on(window, 'pointerdown', (e) => { if (!aiming || e.target.closest('button')) return; drag = { x0: e.clientX, y0: e.clientY, x: 0, y: 0 }; });
  app.on(window, 'pointermove', (e) => {
    if (!drag) return; drag.x = e.clientX - drag.x0; drag.y = e.clientY - drag.y0;
    const v = launchFromDrag(drag), p = hand(spot).clone(); // show only the start of the arc
    dots.forEach((d, k) => { const t = (k + 1) * .06; d.position.set(p.x + v.x * t, p.y + v.y * t - .5 * G * t * t, p.z + v.z * t); d.visible = drag.y < -20; });
  });
  app.on(window, 'pointerup', async () => {
    if (!drag) return; const d = drag; drag = null; dots.forEach((x) => (x.visible = false));
    if (d.y > -40 || !aiming) return; aiming = false; me.setPose('shoot');
    const made = await launch(launchFromDrag(d), hand(spot)); const r = shotRes; shotRes = null; r?.(made);
  });
  async function aiShot(i, text) {
    spot = i; stand(ai, i, 0); stand(me, i, -1.6); me.setPose('idle'); ai.setPose('ready'); frameCam(i); ball.position.copy(hand(i)); msg.textContent = text; await wait(1100);
    const want = Math.random() < SPOTS[i][3]; let v, tries = 0;
    do { v = ideal(hand(i)); if (!want) { v.multiplyScalar(1 + (Math.random() < .5 ? -1 : 1) * (.05 + Math.random() * .06)); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * .12); } } while (simulate(v, hand(i)) !== want && ++tries < 30);
    ai.setPose('shoot'); return launch(v, hand(i));
  }
  function chooseSpot() {
    return new Promise((res) => { msg.textContent = 'Your call — pick a star'; camPos.set(0, 7, 5.5); camTarget.set(0, 1, -3.5);
      fill(spotsUI, ...SPOTS.map((s, i) => h('button', { class: 'btn alt small', onclick: () => { fill(spotsUI, ); sfx.click(); res(i); } }, s[2]))); });
  }
  async function game() {
    letters.me = letters.ai = 0; drawScore(); info.hidden = true; let lead = 'me';
    while (letters.me < 6 && letters.ai < 6 && root.isConnected) {
      if (lead === 'me') {
        const i = await chooseSpot(); stars.forEach((s, k) => s.material.color.set(k === i ? '#fff' : '#FFCC19'));
        const made = await playerShot(i, 'Drag up toward the hoop and release to shoot'); me.setPose(made ? 'cheer' : 'sad'); made ? sfx.good() : sfx.bad(); await wait(1000);
        if (!made) { toast(root, 'Miss — Dream Team leads'); lead = 'ai'; await wait(900); continue; }
        toast(root, 'Bucket! Can they match it?'); await wait(900);
        const m2 = await aiShot(i, 'Dream Team must match your shot'); ai.setPose(m2 ? 'cheer' : 'sad'); await wait(900);
        if (!m2) { letters.ai++; drawScore(); toast(root, `Dream Team gets a ${WORD[letters.ai - 1]}`); await wait(1000); }
      } else {
        const i = Math.random() * SPOTS.length | 0; stars.forEach((s, k) => s.material.color.set(k === i ? '#fff' : '#FFCC19'));
        const made = await aiShot(i, `Dream Team calls ${SPOTS[i][2]}`); ai.setPose(made ? 'cheer' : 'sad'); await wait(900);
        if (!made) { toast(root, 'They missed — your lead'); lead = 'me'; await wait(900); continue; }
        const m2 = await playerShot(i, 'Match the shot or take a letter'); me.setPose(m2 ? 'cheer' : 'sad'); m2 ? sfx.good() : sfx.bad(); await wait(900);
        if (!m2) { letters.me++; drawScore(); toast(root, `You get a ${WORD[letters.me - 1]}`); await wait(1000); }
      }
    }
    if (!root.isConnected) return;
    const won = letters.ai >= 6, first = won && app.award('court'); if (won) { confetti(root); me.setPose('cheer'); }
    msg.textContent = ''; info.hidden = false;
    fill(info, h('h2', {}, won ? 'You win!' : 'B-A-R-B-I-E'), h('p', {}, won ? (first ? 'Dream Team spelled BARBIE first. The Dream Court ring is yours.' : 'Dream Team spelled BARBIE first.') : 'You spelled BARBIE first. On the Dream Court there is always more than one way to win — go again.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: game }, 'Rematch'), h('button', { class: 'btn alt', onclick: exit }, 'Done')));
  }
  stand(me, 1, 0); stand(ai, 1, 1.6); frameCam(1); ball.position.copy(hand(1)); drawScore(); camera.position.copy(camPos);
  fill(info, h('h2', {}, 'B-A-R-B-I-E'), h('p', {}, 'It is HORSE, Dream Court style. Call a star and shoot. If you score, Dream Team has to match it or take a letter — and the same goes for you. First to spell BARBIE loses.'),
    h('p', {}, 'To shoot: press anywhere, drag up toward the hoop (further = more power, left or right to aim), then let go.'), h('button', { class: 'btn', onclick: game }, 'Tip off'));
}
