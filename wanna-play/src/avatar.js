import * as THREE from 'three';

export const SKINS = ['#f8d7bd', '#e9b68e', '#c98d62', '#8f5c3c', '#5a3825'];
export const HAIR_STYLES = ['short', 'bob', 'pony', 'afro', 'bun', 'none'];
export const HAIR_COLORS = ['#1d1412', '#3b2416', '#8a5a2b', '#e8c46a', '#d9482b', '#FF1F9E', '#3146E4'];
export const COLORS = ['#FA001E', '#FF5200', '#FFCC19', '#58D141', '#1BE8C0', '#3146E4', '#662D91', '#FF1F9E', '#ffffff', '#1c1030'];
export const ACCS = ['none', 'cap', 'headband', 'shades', 'medal'];
export const BOTTOMS = ['shorts', 'pants', 'skirt'];
export const TOPS = ['tee', 'tank'];

// Pose values: a = arm [forward, raise], e = elbow [bend forward, bend up], l = leg [forward, side], k = knee bend
export const POSES = {
  idle: { aL: [0, .1], aR: [0, .1] },
  star: { aL: [0, 2.35], aR: [0, 2.35], lL: [0, .38], lR: [0, .38] },
  victory: { aR: [0, 2.95], aL: [0, .55], eL: [0, 1.5] },
  arabesque: { aL: [0, 1.57], aR: [0, 1.57], lR: [-1.15, 0], lean: .45 },
  flex: { aL: [0, 1.57], aR: [0, 1.57], eL: [0, 2.1], eR: [0, 2.1] },
  salute: { aR: [.2, 1.75], eR: [0, 2.3], aL: [0, .08] },
  lunge: { aL: [1.5, .2], aR: [-1.1, .2], lL: [1.0, 0], kL: 1.0, lR: [-.7, 0], kR: .5, y: -.14 },
  cheer: { aL: [0, 2.8], aR: [0, 2.8], bounce: 1 },
  sad: { aL: [.1, .05], aR: [.1, .05], lean: .25, head: .5 },
  sit: { aL: [.5, .5], aR: [.5, .5], lL: [1.45, .08], lR: [1.45, .08], kL: .25, kR: .25, lean: -.35, y: -.62 },
  shoot: { aL: [2.7, .1], aR: [2.7, .1], eL: [.5, 0], eR: [.5, 0] },
  ready: { aL: [1.2, .2], aR: [1.2, .2], eL: [1.2, 0], eR: [1.2, 0], kL: .4, kR: .4, lL: [.3, 0], lR: [.3, 0], y: -.06 },
  wave: { aR: [0, 2.5], eR: [0, .6], aL: [0, .1], wave: 1 },
  swing: { aR: [1.4, 1.2], eR: [.4, .3], aL: [.3, .5], lean: .1 },
};

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: 0 });
function limb(r, len, m) { const g = new THREE.CapsuleGeometry(r, len - r * 2, 4, 10); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, m); }

export function makeAvatar(cfg0) {
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const M = { skin: mat('#fff'), top: mat('#fff'), sleeve: mat('#fff'), bottom: mat('#fff'), shin: mat('#fff'), shoes: mat('#fff'), hair: mat('#222'), acc: mat('#FFCC19'), dark: mat('#222') };

  // torso (front of the UV wrap faces +z)
  const tg = new THREE.CylinderGeometry(.2, .165, .5, 24, 1); tg.rotateY(Math.PI);
  const torso = new THREE.Mesh(tg, M.top); torso.scale.z = .68; torso.position.y = 1.2; body.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.top); shoulders.scale.set(1, .35, .68); shoulders.position.y = 1.45; body.add(shoulders);
  const hipsM = new THREE.Mesh(new THREE.SphereGeometry(.172, 16, 10), M.bottom); hipsM.scale.set(1, .6, .7); hipsM.position.y = .95; body.add(hipsM);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.17, .3, .26, 20, 1, true), M.bottom); skirt.position.y = .85; skirt.material.side = THREE.DoubleSide; body.add(skirt);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .06, .1), M.skin); neck.position.y = 1.5; body.add(neck);

  const head = new THREE.Group(); head.position.y = 1.55; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.19, 24, 18), M.skin); skull.position.y = .17; skull.scale.set(1, 1.05, 1); head.add(skull);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 8), M.dark); e.position.set(s * .07, .19, .172); head.add(e); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.05, .01, 6, 12, Math.PI), M.dark); smile.rotation.z = Math.PI; smile.position.set(0, .12, .175); head.add(smile);
  const hair = new THREE.Group(); hair.position.y = .17; head.add(hair);
  const acc = new THREE.Group(); head.add(acc);
  const medal = new THREE.Group(); body.add(medal);

  const J = {};
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const sh = new THREE.Group(); sh.position.set(s * .245, 1.42, 0); body.add(sh);
    sh.add(limb(.055, .29, M.sleeve));
    const el = new THREE.Group(); el.position.y = -.27; sh.add(el);
    el.add(limb(.048, .27, M.skin));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.058, 10, 10), M.skin); hand.position.y = -.29; el.add(hand);
    const hip = new THREE.Group(); hip.position.set(s * .095, .93, 0); body.add(hip);
    hip.add(limb(.075, .44, M.bottom));
    const kn = new THREE.Group(); kn.position.y = -.42; hip.add(kn);
    kn.add(limb(.062, .42, M.shin));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(.11, .09, .24), M.shoes); shoe.position.set(0, -.45, .05); kn.add(shoe);
    J['a' + k] = sh; J['e' + k] = el; J['l' + k] = hip; J['k' + k] = kn; J['s' + k] = s;
  }

  let cfg = {}, teeTex = null, teeCanvas = null, pose = POSES.idle, t = 0, walk = 0;

  function buildHair(style) {
    hair.clear();
    const add = (geo, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, M.hair); m.position.set(x, y, z); m.scale.set(sx, sy, sz); hair.add(m); return m; };
    const cap = new THREE.SphereGeometry(.205, 20, 12, 0, Math.PI * 2, 0, Math.PI * .52);
    if (style === 'none') return;
    add(cap, 0, .01, -.012);
    if (style === 'bob') add(new THREE.SphereGeometry(.215, 18, 12, Math.PI * 1.0, Math.PI, 0, Math.PI * .8), 0, -.01, -.01, 1, 1.05, 1);
    if (style === 'pony') { add(new THREE.SphereGeometry(.07, 10, 10), 0, .1, -.21); add(new THREE.CapsuleGeometry(.05, .22, 4, 8), 0, -.06, -.26).rotation.x = .35; }
    if (style === 'afro') add(new THREE.SphereGeometry(.27, 18, 14), 0, .06, -.04);
    if (style === 'bun') add(new THREE.SphereGeometry(.09, 12, 10), 0, .22, -.06);
  }
  function buildAcc(kind) {
    acc.clear(); medal.clear();
    if (kind === 'cap') { const c = new THREE.Mesh(new THREE.SphereGeometry(.215, 18, 10, 0, Math.PI * 2, 0, Math.PI * .45), M.acc); c.position.y = .185; acc.add(c); const b = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .015, 16, 1, false, -Math.PI / 2, Math.PI), M.acc); b.position.set(0, .22, .15); b.rotation.x = .15; acc.add(b); }
    if (kind === 'headband') { const b = new THREE.Mesh(new THREE.TorusGeometry(.195, .022, 8, 24), M.acc); b.rotation.x = Math.PI / 2 - .25; b.position.y = .24; acc.add(b); }
    if (kind === 'shades') { for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(.085, .05, .02), M.dark); g.position.set(s * .07, .195, .185); acc.add(g); } const br = new THREE.Mesh(new THREE.BoxGeometry(.06, .012, .015), M.dark); br.position.set(0, .2, .185); acc.add(br); }
    if (kind === 'medal') { const r = new THREE.Mesh(new THREE.TorusGeometry(.13, .012, 6, 20), mat('#3146E4')); r.position.set(0, 1.38, .06); r.rotation.x = 1.2; r.scale.y = 1.5; medal.add(r); const d = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .015, 20), new THREE.MeshStandardMaterial({ color: '#FFCC19', metalness: .8, roughness: .25 })); d.rotation.x = Math.PI / 2; d.position.set(0, 1.2, .16); medal.add(d); }
  }
  function refreshTop() {
    if (teeCanvas && cfg.wearTee) {
      if (!teeTex) { teeTex = new THREE.CanvasTexture(teeCanvas); teeTex.colorSpace = THREE.SRGBColorSpace; }
      teeTex.image = teeCanvas; teeTex.needsUpdate = true;
      M.top.map = teeTex; M.top.color.set('#ffffff');
      const g = teeCanvas.getContext('2d').getImageData(4, 4, 1, 1).data;
      M.sleeve.color.setRGB(g[0] / 255, g[1] / 255, g[2] / 255, THREE.SRGBColorSpace);
    } else { M.top.map = null; M.top.color.set(cfg.top); M.sleeve.color.set(cfg.topType === 'tank' ? SKINS[cfg.skin] : cfg.top); }
    M.top.needsUpdate = true;
  }
  function setConfig(c) {
    cfg = { ...cfg, ...c };
    M.skin.color.set(SKINS[cfg.skin] || SKINS[1]);
    M.bottom.color.set(cfg.bottom); M.shoes.color.set(cfg.shoes); M.hair.color.set(cfg.hairColor);
    M.shin.color.set(cfg.bottomType === 'pants' ? cfg.bottom : SKINS[cfg.skin]);
    skirt.visible = cfg.bottomType === 'skirt';
    buildHair(cfg.hair); buildAcc(cfg.acc); refreshTop();
  }
  // Design canvas (square) is centred on the chest; the wrap texture is 2:1.
  function setTee(designCanvas, baseColor) {
    if (!designCanvas) { teeCanvas = null; refreshTop(); return; }
    if (!teeCanvas) { teeCanvas = document.createElement('canvas'); teeCanvas.width = 1024; teeCanvas.height = 512; }
    const g = teeCanvas.getContext('2d'); g.fillStyle = baseColor || '#fff'; g.fillRect(0, 0, 1024, 512);
    g.drawImage(designCanvas, 512 - 190, 40, 380, 380);
    refreshTop();
  }
  function setPose(p) { pose = typeof p === 'string' ? (POSES[p] || POSES.idle) : p; }

  const cur = {};
  const lerpTo = (key, v, a) => { cur[key] = (cur[key] ?? v) + (v - (cur[key] ?? v)) * a; return cur[key]; };
  function update(dt, moving = false) {
    t += dt; walk += dt * (moving ? 9 : 0);
    const a = Math.min(1, dt * 10), sw = moving ? Math.sin(walk) : 0;
    const p = moving ? POSES.idle : pose;
    for (const k of ['L', 'R']) {
      const s = J['s' + k], ph = k === 'L' ? 1 : -1;
      const ar = p['a' + k] || [0, .1], el = p['e' + k] || [0, 0], lg = p['l' + k] || [0, 0], kn = p['k' + k] || 0;
      const wv = p.wave && k === 'R' ? Math.sin(t * 9) * .35 : 0;
      J['a' + k].rotation.set(lerpTo('ax' + k, -ar[0] + sw * ph * -.7, a), 0, lerpTo('az' + k, s * (ar[1] + wv), a));
      J['e' + k].rotation.set(lerpTo('ex' + k, -el[0] - (moving ? .4 : 0), a), 0, lerpTo('ez' + k, s * el[1], a));
      J['l' + k].rotation.set(lerpTo('lx' + k, -lg[0] + sw * ph * .75, a), 0, lerpTo('lz' + k, s * lg[1], a));
      J['k' + k].rotation.x = lerpTo('kx' + k, kn + (moving ? Math.max(0, -sw * ph) * .9 : 0), a);
    }
    body.rotation.x = lerpTo('lean', p.lean || 0, a);
    head.rotation.x = lerpTo('head', p.head || 0, a);
    const bob = moving ? Math.abs(Math.sin(walk)) * .04 : Math.sin(t * 2) * .008;
    body.position.y = lerpTo('y', p.y || 0, a) + bob + (p.bounce ? Math.abs(Math.sin(t * 8)) * .18 : 0);
  }
  setConfig(cfg0);
  update(0);
  return { group, setConfig, setTee, setPose, update, get cfg() { return cfg; } };
}

export const GYMNAST = { skin: 3, hair: 'bun', hairColor: '#1d1412', top: '#FF1F9E', topType: 'tank', bottom: '#FF1F9E', bottomType: 'shorts', shoes: '#f8d7bd', acc: 'none' };
export const RIVAL = { skin: 0, hair: 'pony', hairColor: '#e8c46a', top: '#FF1F9E', topType: 'tank', bottom: '#ffffff', bottomType: 'skirt', shoes: '#FF1F9E', acc: 'headband' };
