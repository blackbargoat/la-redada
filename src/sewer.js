// NIGHT 2 — Under the City. The storm drain under Hammerline: a maze, green water, rats, an old man who lives down here.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792081431';
import { tex, textTex, rng } from './textures.js?v=1792081431';
import { makeCharacter, animateWalk, makeGlow, makeBeam, std } from './models.js?v=1792081431';

const VO = {
  h1: { id: 's_h1', who: 'Old man', text: 'Easy... easy, mijo. Get that light out of my eyes. I\'m not one of them.' },
  j1: { id: 's_j1', who: 'Juan', text: 'Perdón. I\'m just trying to get out. They\'re in the store up there.' },
  h2: { id: 's_h2', who: 'Old man', text: 'They never come down here. Too proud to get their boots wet. Eleven years I been down here. Nobody comes.' },
  h3: { id: 's_h3', who: 'Old man', text: 'Keep the wall on your right hand. Always the right. When you hear the trucks over your head, you\'re close. There\'s a ladder.' },
  h4: { id: 's_h4', who: 'Old man', text: 'And mijo... don\'t come back down here. This is mine.' },
  h5: { id: 's_h5', who: 'Old man', text: 'MINE! ...Heh. Heh heh. Go on. Go up your ladder.' },
  j2: { id: 's_j2', who: 'Juan', text: '(gasping) Dios mío... Dios mío.' },
};
export const SEWER_VO = Object.values(VO).map((l) => l.id);

const N = 9, CS = 4, W = N * CS + 1; // maze cells, cell pitch (3m tunnel + 1m wall), world size
const cc = (i) => i * CS + 2.5;       // cell center

export function createSewer(G) {
  const { audio, ui, P, game } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020604);
  scene.fog = new THREE.FogExp2(0x0a1a0e, 0.1);
  const grid = new Grid(W, W, 0, 0);
  grid.fillAll(1, 1);
  const L = { scene, grid, interactables: [], allowFlashlight: true, surface: 'wet', allowSprint: true, speedMul: 1 };
  const r = rng(90210);
  ui.post.exposure.value = 0.85; ui.post.sat.value = 0.62; ui.post.contrast.value = 1.16; ui.post.tint.value.set(0.86, 1.0, 0.86); ui.post.lift.value.set(0.0, 0.016, 0.006); ui.post.levels.value = 26;

  // ---------------- the maze (seeded depth-first) ----------------
  const open = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ e: false, s: false, seen: false })));
  { const st = [[0, 0]]; open[0][0].seen = true;
    while (st.length) {
      const [i, j] = st[st.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !open[a][b].seen);
      if (!nb.length) { st.pop(); continue; }
      const [a, b] = nb[(r() * nb.length) | 0];
      if (a > i) open[i][j].e = true; else if (a < i) open[a][b].e = true; else if (b > j) open[i][j].s = true; else open[a][b].s = true;
      open[a][b].seen = true; st.push([a, b]);
    } }
  const linked = (i, j, a, b) => (a === i + 1 ? open[i][j].e : a === i - 1 ? open[a][b].e : b === j + 1 ? open[i][j].s : open[a][b].s);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    grid.rect(i * CS + 1, j * CS + 1, i * CS + 3, j * CS + 3, 0, 0);
    if (open[i][j].e) grid.rect(i * CS + 4, j * CS + 1, i * CS + 4, j * CS + 3, 0, 0);
    if (open[i][j].s) grid.rect(i * CS + 1, j * CS + 4, i * CS + 3, j * CS + 4, 0, 0);
  }
  // the way through, cell by cell (for placing the old man)
  const solve = (() => { const prev = {}, q = [[0, 0]], key = (i, j) => i + ',' + j; prev[key(0, 0)] = null;
    while (q.length) { const [i, j] = q.shift(); if (i === N - 1 && j === N - 1) break; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (a >= 0 && b >= 0 && a < N && b < N && !(key(a, b) in prev) && linked(i, j, a, b)) { prev[key(a, b)] = [i, j]; q.push([a, b]); } }
    const path = []; let c = [N - 1, N - 1]; while (c) { path.unshift(c); c = prev[key(c[0], c[1])]; } return path; })();

  // ---------------- geometry ----------------
  const wallM = std(0x5a6450, { map: tex('brick', [1, 3]), roughness: 0.85 });
  const m4 = new THREE.Matrix4();
  const walls = [];
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (grid.solid[z * W + x]) {
    // only walls that touch a tunnel need drawing
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const xx = x + a, zz = z + b; return xx >= 0 && zz >= 0 && xx < W && zz < W && !grid.solid[zz * W + xx]; })) walls.push([x + 0.5, z + 0.5]);
  }
  const wallIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 3.2, 1), wallM, walls.length);
  walls.forEach(([x, z], k) => { m4.makeTranslation(x, 1.6, z); wallIM.setMatrixAt(k, m4); }); wallIM.receiveShadow = true; scene.add(wallIM);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, W), std(0x4a5446, { map: tex('concrete', [10, 10]), roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, W / 2); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, W), std(0x1a2018, { roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(W / 2, 3.1, W / 2); scene.add(ceil);
  // the water channel down the middle of every tunnel: green, faintly glowing, always moving
  const wc = document.createElement('canvas'); wc.width = wc.height = 64; const wx = wc.getContext('2d');
  wx.fillStyle = '#20401e'; wx.fillRect(0, 0, 64, 64); for (let k = 0; k < 220; k++) { wx.fillStyle = `rgba(${120 + r() * 80},${200 + r() * 55},${100 + r() * 60},${0.05 + r() * 0.12})`; wx.fillRect(r() * 64, r() * 64, 2 + r() * 6, 1); }
  const waterT = new THREE.CanvasTexture(wc); waterT.wrapS = waterT.wrapT = THREE.RepeatWrapping; waterT.colorSpace = THREE.SRGBColorSpace; waterT.magFilter = THREE.NearestFilter;
  const waterM = new THREE.MeshStandardMaterial({ color: 0x3a6a34, map: waterT, emissive: 0x3a9a3a, emissiveMap: waterT, emissiveIntensity: 1.6, roughness: 0.08, metalness: 0.4 });
  const wet = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    wet.push([cc(i), cc(j), 1.3, 1.3]);
    if (open[i][j].e) wet.push([cc(i) + CS / 2, cc(j), CS, 1.3]);
    if (open[i][j].s) wet.push([cc(i), cc(j) + CS / 2, 1.3, CS]);
  }
  const waterIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), waterM, wet.length);
  const s3 = new THREE.Vector3(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3();
  wet.forEach(([x, z, w, d], k) => { m4.compose(v3.set(x, 0.025, z), q0, s3.set(w, 1, d)); waterIM.setMatrixAt(k, m4); }); scene.add(waterIM);
  // pipes along some of the walls
  const pipeM = std(0x3a3a32, { metalness: 0.5, roughness: 0.6 });
  const pipes = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (r() < 0.35) { const ns = r() < 0.5; pipes.push(ns ? [i * CS + 1.15, cc(j), 0] : [cc(i), j * CS + 1.15, 1]); }
  const pipeIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), pipeM, pipes.length);
  pipes.forEach(([x, z, ew], k) => { m4.compose(v3.set(x, 2.5, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(ew ? 0 : Math.PI / 2, 0, ew ? Math.PI / 2 : 0)), s3.set(1, 1, 1)); pipeIM.setMatrixAt(k, m4); }); scene.add(pipeIM);

  // ---------------- sewer lights: caged bulbs, weak, a lot of them dead ----------------
  const fixtures = [];
  const bulbM = std(0x222222, { emissive: 0xd8e090, emissiveIntensity: 1.4 });
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (r() < 0.32 && !(i === 0 && j === 0)) continue; // dead
    const x = cc(i) + (r() - 0.5) * 1.2, z = cc(j) + (r() - 0.5) * 1.2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbM.clone()); bulb.position.set(x, 2.85, z); scene.add(bulb);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 8, 1, true), std(0x2a2a24, { metalness: 0.6, side: THREE.DoubleSide })); shade.position.set(x, 2.95, z); scene.add(shade);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 4), std(0x2a2a24)); stem.position.set(x, 3.03, z); scene.add(stem);
    const gl = makeGlow(0xc8d890, 0.9, 0.55); gl.position.set(x, 2.8, z); scene.add(gl);
    fixtures.push({ x, z, bulb, gl, f: 1, flick: r() < 0.3, on: true });
  }
  const pool = Array.from({ length: 7 }, () => { const l = new THREE.PointLight(0xc8d890, 0, 10, 1.5); scene.add(l); return l; });
  const hemi = new THREE.HemisphereLight(0x3a5a3a, 0x0a140a, 0.12); scene.add(hemi);
  let poolT = 0, lightsOn = true;
  function updatePool(dt) {
    poolT -= dt;
    if (poolT <= 0) {
      poolT = 0.25;
      const near = fixtures.filter((f) => f.on).map((f) => [f, Math.hypot(f.x - P.pos.x, f.z - P.pos.z)]).sort((a, b) => a[1] - b[1]).slice(0, pool.length);
      pool.forEach((l, k) => { const n = near[k]; l.userData.f = n ? n[0] : null; if (n) l.position.set(n[0].x, 2.7, n[0].z); });
    }
    for (const f of fixtures) if (f.on && f.flick) {
      f.f = Math.random() < 0.05 ? Math.random() * 0.25 : Math.min(1, f.f + dt * 4);
      f.gl.material.opacity = 0.55 * f.f; f.bulb.material.emissiveIntensity = 1.4 * f.f;
      if (f.f < 0.3 && Math.random() < 0.25 && Math.hypot(f.x - P.pos.x, f.z - P.pos.z) < 12) audio.flicker({ x: f.x, y: 2.8, z: f.z }, 0.7);
    }
    pool.forEach((l) => { const f = l.userData.f; l.intensity = f && f.on && lightsOn ? 11 * f.f : 0; });
  }

  // ---------------- start: under the hatch ----------------
  const shaft = makeBeam(4, 0.6, 0x9ab0a0, 0.08); shaft.position.set(cc(0), 3.6, cc(0)); shaft.rotation.x = Math.PI / 2; scene.add(shaft);
  for (let k = 0; k < 8; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), std(0x5a4a3a, { metalness: 0.6 })); rung.position.set(cc(0), 0.4 + k * 0.35, 1.05); scene.add(rung); }
  // a maintenance map bolted to the wall at the start
  const mapPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), std(0xb8b090, { roughness: 0.9 })); mapPlate.position.set(1.04, 1.5, cc(0)); mapPlate.rotation.y = Math.PI / 2; scene.add(mapPlate);
  // ---------------- the exit: a ladder up to a manhole, street light coming down ----------------
  const EX = cc(N - 1), EZ = cc(N - 1);
  const LADX = EX, LADZ = (N - 1) * CS + 3.95;
  for (let k = 0; k < 8; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), std(0x6a5a40, { metalness: 0.6 })); rung.position.set(LADX, 0.4 + k * 0.35, LADZ - 0.1); scene.add(rung); }
  for (const s of [-0.25, 0.25]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3, 0.04), std(0x6a5a40, { metalness: 0.6 })); rail.position.set(LADX + s, 1.5, LADZ - 0.1); scene.add(rail); }
  const holeBeam = makeBeam(4, 0.7, 0xe8c890, 0.1); holeBeam.position.set(LADX, 3.6, LADZ - 0.5); holeBeam.rotation.x = Math.PI / 2; scene.add(holeBeam);
  const holeL = new THREE.SpotLight(0xe8c890, 14, 6, 0.5, 0.6, 1.4); holeL.position.set(LADX, 3.5, LADZ - 0.5); holeL.target.position.set(LADX, 0, LADZ - 0.6); scene.add(holeL); scene.add(holeL.target);

  // ---------------- the old man ----------------
  const mid = solve[Math.floor(solve.length * 0.48)], nxt = solve[Math.floor(solve.length * 0.48) + 1] || mid;
  const along = nxt[0] !== mid[0] ? 'x' : 'z';
  const HX = cc(mid[0]) + (along === 'z' ? 1.0 : 0), HZ = cc(mid[1]) + (along === 'x' ? 1.0 : 0);
  const hobo = makeCharacter('hobo', { shirt: 0x4a4a2a, pants: 0x3a3022, skin: 0x8a6a52, hair: 0x9a9a8a }, 1.68);
  hobo.group.position.set(HX, 0, HZ); scene.add(hobo.group); animateWalk(hobo, 0, 0, false);
  hobo.group.traverse((m) => { if (m.isMesh && m.material) m.material.color.multiplyScalar(0.85); });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.85, 10), std(0x3a2a1a, { metalness: 0.5, roughness: 0.7 }));
  const BX = HX + (along === 'z' ? 0 : 0.9), BZ = HZ + (along === 'x' ? 0 : 0.9);
  barrel.position.set(BX - (along === 'z' ? 0 : 0) , 0.43, BZ); scene.add(barrel); grid.rect(Math.floor(BX), Math.floor(BZ), Math.floor(BX), Math.floor(BZ), 1, 0);
  const fire = makeGlow(0xff8a30, 0.7, 0.9); fire.position.set(BX, 0.95, BZ); scene.add(fire);
  const fireL = new THREE.PointLight(0xff8a30, 5, 7, 1.6); fireL.position.set(BX, 1.2, BZ); scene.add(fireL);
  // his things: a shopping cart, a mattress, cans
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 1.0), std(0x8a8e90, { metalness: 0.8, roughness: 0.3, wireframe: true })); cart.position.set(HX + (along === 'x' ? 1.4 : -0.3), 0.6, HZ + (along === 'z' ? 1.4 : -0.3)); scene.add(cart);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? 1.8 : 0.9, 0.15, along === 'x' ? 0.9 : 1.8), std(0x6a5a40, { roughness: 1 })); mattress.position.set(HX - (along === 'x' ? 1.4 : 0), 0.08, HZ - (along === 'z' ? 1.4 : 0)); scene.add(mattress);
  let hoboState = 'wait', hoboT = 0;

  // ---------------- rats ----------------
  const ratM = std(0x2a2622, { roughness: 0.8 });
  const rats = [];
  for (let k = 0; k < 18; k++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.24), ratM); b.position.y = 0.05; g.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.09), ratM); h.position.set(0, 0.06, 0.15); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.25), std(0x6a5048)); t.position.set(0, 0.03, -0.24); g.add(t);
    for (const s of [-0.02, 0.02]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: 0x8a2a1a })); e.position.set(s, 0.075, 0.2); g.add(e); }
    const i = (r() * N) | 0, j = (r() * N) | 0;
    if (i + j < 2) continue;
    const side = r() < 0.5 ? -1 : 1, onX = r() < 0.5;
    g.position.set(cc(i) + (onX ? side * 1.25 : (r() - 0.5) * 2), 0, cc(j) + (!onX ? side * 1.25 : (r() - 0.5) * 2)); g.rotation.y = r() * 6;
    scene.add(g); rats.push({ g, state: 'idle', t: r() * 3, vx: 0, vz: 0 });
  }

  // ---------------- story ----------------
  const events = []; let tl = 0, stage = 'walk', cutT = -1, scareT = -1, truckCD = 0;
  const at = (t, fn) => events.push({ t: tl + t, fn });
  const say = (...k) => ui.say(k.map((x) => (x.startsWith('h') ? { ...VO[x], pos: { x: hobo.group.position.x, y: 1.6, z: hobo.group.position.z } } : VO[x])));
  audio.preloadVo(SEWER_VO);
  audio.waterBed(); audio.setLoop('water', 0.22, 3);
  audio.droneBed(); audio.setLoop('drone', 0.25, 4);
  audio.sirenBed(); audio.setLoop('siren', 0.008, 3);
  ui.clock('10:47 PM');
  P.pos.set(cc(0), 0, cc(0) - 0.4); P.yaw = Math.PI; P.pitch = -0.2; P.flashlight = false;
  P.battery = Math.max(P.battery, 0.45);
  at(0.4, () => { audio.splash({ x: P.pos.x, y: 0.2, z: P.pos.z }, 2); ui.shake(0.03, 0.3); audio.clunk({ x: cc(0), y: 3.2, z: 1.2 }, 0.5); });
  at(1.6, () => { ui.objective('Find a way out. Press TAB for the drain map.'); });
  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 1.9, z: cc(0), r: 1.6, label: 'Read the maintenance map', action: () => { const c = document.createElement('canvas'); c.width = 560; c.height = 560; L.drawMap(c.getContext('2d'), 560, 560); ui.note(`<h3>L.A. COUNTY STORM DRAIN — SECTOR 7 (MAINTENANCE)</h3><img src="${c.toDataURL()}" style="width:100%;display:block">`); } });
  it({ x: LADX, z: LADZ - 0.9, r: 1.6, label: 'Climb the ladder', enabled: () => stage === 'climb', action: async () => {
    stage = 'out'; ui.objective(''); P.frozen = true; P.lookLock = { yaw: Math.PI, pitch: 1.2, k: 2 };
    audio.clunk({ x: LADX, y: 3, z: LADZ }, 0.6);
    await new Promise((res) => setTimeout(res, 1200));
    game.saveHere();
    audio.noise({ dur: 3, type: 'lowpass', freq: 500, gain: 0.3, attack: 1, brown: true });
    game.sewerEnd();
  } });

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  let stepSplash = 0;
  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    updatePool(dt);
    waterT.offset.x += dt * 0.05; waterT.offset.y += dt * 0.03;
    fireL.intensity = 4.2 + Math.random() * 1.6; fire.material.opacity = 0.75 + Math.random() * 0.2;
    // wading slows you down and splashes
    const inWater = wet.some(([x, z, w, d]) => Math.abs(P.pos.x - x) < w / 2 - 0.05 && Math.abs(P.pos.z - z) < d / 2 - 0.05);
    L.speedMul = inWater ? 0.72 : 1; L.surface = inWater ? 'wet' : 'concrete';
    if (inWater && P.speedNow > 0.5) { stepSplash -= dt * P.speedNow; if (stepSplash <= 0) { stepSplash = 0.9; audio.splash({ x: P.pos.x, y: 0.1, z: P.pos.z }, P.sprinting ? 1.4 : 0.7); } }
    // drips, distant clanks, rats you never see
    if (Math.random() < dt * 1.5) audio.drip({ x: P.pos.x + (Math.random() - 0.5) * 10, y: 2.5, z: P.pos.z + (Math.random() - 0.5) * 10 });
    if (Math.random() < dt * 0.05) audio.metalGroan({ x: P.pos.x + (Math.random() - 0.5) * 20, y: 2, z: P.pos.z + (Math.random() - 0.5) * 20 });
    if (Math.random() < dt * 0.04) audio.rats({ x: P.pos.x + (Math.random() - 0.5) * 12, y: 0.1, z: P.pos.z + (Math.random() - 0.5) * 12 });
    // trucks over your head near the exit
    const dExit = Math.hypot(P.pos.x - EX, P.pos.z - EZ);
    truckCD -= dt;
    if (dExit < 14 && truckCD <= 0 && stage === 'walk') { truckCD = 7 + Math.random() * 6; audio.noise({ dur: 3.5, type: 'lowpass', freq: 220, gain: 0.5, attack: 1.2, brown: true, pos: { x: P.pos.x, y: 4, z: P.pos.z } }); ui.shake(0.01, 2); }
    // rats
    for (const rt of rats) {
      const g = rt.g, d = Math.hypot(g.position.x - P.pos.x, g.position.z - P.pos.z);
      if (rt.state === 'idle') { rt.t -= dt; if (rt.t <= 0) { rt.t = 0.5 + Math.random() * 2; g.rotation.y += (Math.random() - 0.5) * 1.5; } if (d < 4.5) { rt.state = 'run'; const ax = g.position.x - P.pos.x, az = g.position.z - P.pos.z, al = Math.hypot(ax, az) || 1; rt.vx = ax / al * 4; rt.vz = az / al * 4; rt.t = 1.2; audio.rats({ x: g.position.x, y: 0.1, z: g.position.z }); } }
      else if (rt.state === 'run') {
        const nx = g.position.x + rt.vx * dt, nz = g.position.z + rt.vz * dt;
        if (grid.isSolid(nx, g.position.z)) rt.vx *= -1; else g.position.x = nx;
        if (grid.isSolid(g.position.x, nz)) rt.vz *= -1; else g.position.z = nz;
        g.rotation.y = Math.atan2(rt.vx, rt.vz); g.position.y = Math.abs(Math.sin(tl * 30)) * 0.02;
        rt.t -= dt; if (rt.t <= 0) { rt.state = 'gone'; g.visible = false; }
      }
    }
    // the old man by his fire
    const hg = hobo.group.position;
    const dH = Math.hypot(P.pos.x - hg.x, P.pos.z - hg.z);
    if (hoboState !== 'scare' && hoboState !== 'gone') { const want = Math.atan2(P.pos.x - hg.x, P.pos.z - hg.z); let df = want - hobo.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); hobo.group.rotation.y += df * Math.min(1, dt * (dH < 8 ? 2 : 0.3)); }
    if (hoboState === 'wait' && dH < 5.5) {
      hoboState = 'talk'; audio.hit(0.3);
      say('h1', 'j1', 'h2', 'h3', 'h4').then(() => { hoboState = 'done'; ui.objective('Keep the wall on your right. Find the ladder.'); });
    }
    // the exit: the lights die, you can't move, and he's waiting in front of the ladder
    if (stage === 'walk' && dExit < 4.2) {
      stage = 'cut'; cutT = 0; P.frozen = true; ui.objective(''); lightsOn = false;
      audio.powerDown({ x: P.pos.x, y: 3, z: P.pos.z }); holeL.intensity = 0; hemi.intensity = 0.03; holeBeam.visible = false; fireL.visible = false; fire.visible = false;
      fixtures.forEach((f, k) => { setTimeout(() => { f.on = false; f.gl.visible = false; f.bulb.material.emissiveIntensity = 0; if (Math.hypot(f.x - P.pos.x, f.z - P.pos.z) < 14) audio.flicker({ x: f.x, y: 2.8, z: f.z }, 1); }, Math.min(900, Math.hypot(f.x - P.pos.x, f.z - P.pos.z) * 25)); });
      audio.setLoop('water', 0.12, 1); audio.setLoop('drone', 0.5, 2);
      // he steps out of the dark between you and the ladder
      hoboState = 'lurk'; hobo.group.visible = false;
    }
    if (stage === 'cut') {
      cutT += dt;
      if (cutT > 1.2 && !P.flashlight && !document.getElementById('bigHint').textContent) { ui.bigHint('PRESS <kbd>F</kbd> FLASHLIGHT'); document.getElementById('bigHint').dataset.k = 'F'; }
      const lit = P.flashlight || P.battery <= 0;
      G.camera.getWorldDirection(tmpA); tmpB.set(LADX - P.pos.x, 0, LADZ - P.pos.z).normalize();
      const facing = (tmpA.x * tmpB.x + tmpA.z * tmpB.z) / (Math.hypot(tmpA.x, tmpA.z) || 1) > 0.9;
      if (cutT > 1.5 && lit && facing) {
        stage = 'scare'; scareT = 0; ui.bigHint('');
        hoboState = 'scare'; hobo.group.visible = true;
        const fx = tmpB.x, fz = tmpB.z;
        hobo.group.position.set(P.pos.x + fx * 1.6, 0, P.pos.z + fz * 1.6); hobo.group.rotation.y = Math.atan2(-fx, -fz);
        audio.scream(); audio.hit(1.2); audio.stinger(1); ui.flash(0.5); ui.shake(0.12, 0.8);
      }
    }
    if (stage === 'scare') {
      scareT += dt;
      const fx = tmpB.x, fz = tmpB.z;
      const d = scareT < 0.16 ? 1.6 - scareT / 0.16 * 0.85 : 0.75;
      // the light stutters and drops right as he's in your face
      L.flicker = scareT < 1.6 ? (Math.random() < 0.25 ? 0.05 : 0.28) : 1;
      if (scareT < 1.6) { hobo.group.position.set(P.pos.x + fx * d, 0.14 + Math.sin(scareT * 40) * 0.012, P.pos.z + fz * d); P.pitch += (0.04 - P.pitch) * Math.min(1, dt * 8); }
      else hobo.group.position.y += (0 - hobo.group.position.y) * Math.min(1, dt * 4);
      if (scareT > 1.4 && scareT - dt <= 1.4) ui.bark({ ...VO.h5, pos: { x: hobo.group.position.x, y: 1.6, z: hobo.group.position.z } });
      if (scareT > 1.6) { // he backs off into the dark, laughing
        hobo.group.position.x -= fx * dt * 1.4; hobo.group.position.z -= fz * dt * 1.4; hobo.group.rotation.y = Math.atan2(-fx, -fz);
        animateWalk(hobo, scareT * 4, 1, false);
      }
      if (scareT > 4.6) {
        stage = 'climb'; hobo.group.visible = false; hoboState = 'gone'; P.frozen = false;
        holeL.intensity = 8; holeBeam.visible = true;
        ui.say([VO.j2]); ui.objective('Climb out.');
      }
    }
  };
  L.danger = () => ({ heart: stage === 'cut' ? 0.7 : stage === 'scare' ? 1 : 0 });

  // the map: tunnels, where you came in, the ladder. Finding your way is up to you.
  L.drawMap = (c, w, h) => {
    const s = Math.min(w, h) / W;
    c.fillStyle = '#c8bf9e'; c.fillRect(0, 0, w, h);
    for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (grid.solid[z * W + x]) { c.fillStyle = '#2e2a22'; c.fillRect(x * s, z * s, s + 0.5, s + 0.5); }
    c.fillStyle = 'rgba(70,120,60,0.45)'; for (const [x, z, ww, dd] of wet) c.fillRect((x - ww / 2) * s, (z - dd / 2) * s, ww * s, dd * s);
    c.font = 'bold 12px Oswald, sans-serif'; c.textAlign = 'center';
    c.fillStyle = '#1d1b17'; c.fillText('HATCH', cc(0) * s, cc(0) * s - 6);
    c.strokeStyle = '#b3261e'; c.lineWidth = 3; c.beginPath(); c.moveTo((EX - 1) * s, (EZ - 1) * s); c.lineTo((EX + 1) * s, (EZ + 1) * s); c.moveTo((EX + 1) * s, (EZ - 1) * s); c.lineTo((EX - 1) * s, (EZ + 1) * s); c.stroke();
    c.fillStyle = '#b3261e'; c.fillText('LADDER', EX * s, EZ * s - 14);
    c.save(); c.translate(P.pos.x * s, P.pos.z * s); c.rotate(-P.yaw); c.fillStyle = '#b3261e'; c.beginPath(); c.moveTo(0, -7); c.lineTo(4, 5); c.lineTo(-4, 5); c.closePath(); c.fill(); c.restore();
  };
  L.dispose = () => { ui.bigHint(''); };
  return L;
}
