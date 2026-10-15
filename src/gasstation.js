// DAY 2 — Lunch break. The gas station across from Hammerline: cumbia on the radio, a burrito, Chuy and Beto.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792081431';
import { tex, textTex, rng, facadeTex } from './textures.js?v=1792081431';
import { makeCharacter, makeVehicle, animateWalk, makeGlow, makeCar, std } from './models.js?v=1792081431';

const VO = {
  k1: { id: 'l_k1', who: 'Cashier', text: '¡Buenas, mijo! Burritos are fresh. The tamales are from yesterday, but don\'t tell nobody.' },
  k2: { id: 'l_k2', who: 'Cashier', text: 'Three fifty. ...Oye, be careful today, ¿sí? My nephew says la migra was all over Whittier last night.' },
  ch1: { id: 'l_ch1', who: 'Chuy', text: 'Juan. Güey... I heard about Santiago. Lupe saw it from her window. Lo siento, carnal.' },
  j1: { id: 'l_j1', who: 'Juan', text: 'I didn\'t stop. He was right behind me and I didn\'t stop.' },
  b1: { id: 'l_b1', who: 'Beto', text: 'If you stop, they take you both. Then who tells Doña Rosa? Who goes home to Luz?' },
  ch2: { id: 'l_ch2', who: 'Chuy', text: 'Dale was on the phone all morning with his door shut. That guy never shuts his door.' },
  b2: { id: 'l_b2', who: 'Beto', text: 'Listen to me. If they ever come into the store, don\'t go for the front. In receiving, behind the last pallet rack, there\'s an old drain hatch in the floor. It goes down to the storm sewer.' },
  j2: { id: 'l_j2', who: 'Juan', text: 'The sewer?' },
  b3: { id: 'l_b3', who: 'Beto', text: 'It stinks like death, and it\'s a maze down there. But nobody follows you. My tío got out that way in oh-nine.' },
  ch3: { id: 'l_ch3', who: 'Chuy', text: 'Ya, ya. Enough. Eat your burrito, break\'s almost over.' },
};
export const LUNCH_VO = Object.values(VO).map((l) => l.id);

export function createGasStation(G) {
  const { audio, ui, P, game } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8c8c8);
  scene.fog = new THREE.Fog(0xb8c8c8, 30, 110);
  const grid = new Grid(60, 50, -20, -12);
  grid.fillAll(1, 1);
  grid.rect(-19, -5, 39, 37, 0, 0);
  const L = { scene, grid, interactables: [], allowFlashlight: false, surface: 'concrete', allowSprint: true };
  const r = rng(1231);
  // hazy midday, a little washed out
  ui.post.exposure.value = 1.0; ui.post.sat.value = 0.62; ui.post.contrast.value = 1.08; ui.post.tint.value.set(1.03, 1.0, 0.92); ui.post.lift.value.set(0, 0, 0); ui.post.levels.value = 30;

  const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  const solid = (x0, z0, x1, z1, o = 1) => grid.rect(x0, z0, x1, z1, 1, o);

  // ---------------- ground ----------------
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), std(0xffffff, { map: tex('concrete', [8, 3]), roughness: 0.8 })); lot.rotation.x = -Math.PI / 2; lot.position.set(10, 0, 5); lot.receiveShadow = true; scene.add(lot);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 10), std(0xffffff, { map: tex('asphalt', [12, 1]), roughness: 0.75 })); road.rotation.x = -Math.PI / 2; road.position.set(10, 0.005, 22); scene.add(road);
  for (let x = -40; x < 60; x += 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.15), std(0xb8a560)); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.01, 22); scene.add(d); }
  for (const z of [16.2, 27.8]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(120, 0.15, 2.4), std(0xffffff, { map: tex('sidewalk', [48, 1]) })); sw.position.set(10, 0.075, z); scene.add(sw); }

  // ---------------- across the street: Hammerline ----------------
  const hl = box(44, 9, 14, std(0xffffff, { map: tex('block', [12, 3]), roughness: 0.95 }), 10, 4.5, 37, false);
  const signT = textTex(1024, 200, '#d2541c', [{ text: 'HAMMERLINE DEPOT', size: 120, color: '#fff', y: 108 }]);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.1), std(0xffffff, { map: signT })); sign.position.set(10, 7, 29.95); sign.rotation.y = Math.PI; scene.add(sign);
  box(7, 3.2, 0.1, new THREE.MeshStandardMaterial({ color: 0x223038, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.8 }), 10, 1.6, 29.95, false);
  solid(-20, 29, 39, 37);
  // a couple of shops down the block
  for (let i = 0; i < 2; i++) { const fac = facadeTex(70 + i, 2, 4, ['#8a7a68', '#7a8a84'][i]); const b = box(12, 7, 10, [std(0x8a7a68), std(0x8a7a68), std(0x8a7a68), std(0x8a7a68), std(0xffffff, { map: fac.map }), std(0x8a7a68)], -14 + i * 48, 3.5, -7, false); }

  // ---------------- pumps + canopy ----------------
  const canopy = box(14, 0.6, 8, std(0xe8e4dc, { roughness: 0.6 }), 2, 4.6, 6, false);
  const canopyT = textTex(512, 64, '#b02a1a', [{ text: 'QUIK-WAY  GAS', size: 44, color: '#fff' }]);
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.55), std(0xffffff, { map: canopyT })); cs.position.set(2, 4.6, 10.02); scene.add(cs);
  for (const x of [-3.5, 7.5]) for (const z of [3, 9]) { box(0.3, 4.3, 0.3, std(0xd8d4cc), x, 2.15, z, false); solid(Math.floor(x), Math.floor(z), Math.floor(x), Math.floor(z), 0); }
  for (const x of [-1, 5]) {
    box(1.0, 0.25, 4, std(0x9a9a94), x, 0.12, 6); solid(Math.floor(x) - 1, 4, Math.floor(x), 7, 0);
    for (const z of [5, 7]) { box(0.8, 1.7, 0.55, std(0xd8d4cc, { roughness: 0.5 }), x, 1.1, z); const scr = box(0.4, 0.3, 0.02, std(0x1a2a2a, { emissive: 0x2a5a4a, emissiveIntensity: 0.6 }), x, 1.5, z + 0.29, false); }
  }
  // a car at the pump, windows down, the radio going
  const car = makeVehicle('suv', 4.4, 0x6a1f1f, 0.3) || makeCar(0x6b1f1f); car.position.set(2, 0, 6); car.rotation.y = Math.PI / 2; scene.add(car); solid(0, 5, 3, 6, 0);
  const parked = makeVehicle('suv', 4.3, 0x4a4a48, 0.3) || makeCar(0x4a4f55); parked.position.set(26, 0, 10); scene.add(parked); solid(25, 8, 26, 12, 0);

  // ---------------- the mini-mart ----------------
  const MX0 = 10, MX1 = 22, MZ0 = -5, MZ1 = 3; // walls on these lines
  const wallM = std(0xd8ccb0, { map: tex('stucco', [3, 1]), roughness: 0.95 });
  const wall = (x0, z0, x1, z1) => { solid(x0, z0, x1, z1); box(x1 - x0 + 1, 3.4, z1 - z0 + 1, wallM, (x0 + x1 + 1) / 2, 1.7, (z0 + z1 + 1) / 2, false); };
  wall(MX0, MZ0, MX1, MZ0); wall(MX0, MZ0 + 1, MX0, MZ1); wall(MX1, MZ0 + 1, MX1, MZ1);
  wall(MX0 + 1, MZ1, 13, MZ1); wall(16, MZ1, MX1 - 1, MZ1); // door gap x 14..15
  box(2, 0.9, 1, wallM, 15, 2.95, MZ1 + 0.5, false);
  const roofM = std(0x6a6a64); box(13, 0.3, 9, roofM, 16.5, 3.55, -0.5, false);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), std(0xe8e4dc)); ceil.rotation.x = Math.PI / 2; ceil.position.set(16.5, 3.39, -0.5); scene.add(ceil);
  const martT = textTex(512, 96, '#1a3a6a', [{ text: 'QUIK-WAY MINI MART', size: 52, color: '#f0e8d0' }]);
  const ms = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), std(0xffffff, { map: martT })); ms.position.set(16.5, 3.05, MZ1 + 1.02); scene.add(ms);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9ab0b8, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.6 });
  box(1.8, 2.0, 0.05, glassM, 12, 1.4, MZ1 + 1.02, false); box(4, 2.0, 0.05, glassM, 19, 1.4, MZ1 + 1.02, false);
  // window posters
  const posters = [['TECATE 12PK $14.99', '#c02a1a'], ['TARJETAS TELEFÓNICAS', '#2a5ab0'], ['LOTTO · SCRATCHERS', '#e0a020']];
  posters.forEach(([t, c], i) => { const pt = textTex(256, 128, c, [{ text: t, size: 22, color: '#fff' }]); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), std(0xffffff, { map: pt })); p.position.set(18 + i * 1.1, 1.8, MZ1 + 1.06); scene.add(p); });
  // inside: shelves, coolers, hot case, counter
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), std(0xffffff, { map: tex('concrete', [3, 2]), roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.set(16.5, 0.01, -0.5); scene.add(floor);
  const prodCols = [0xc02a1a, 0xe0a020, 0x2a5ab0, 0x3a8a3a, 0xd0d0c8, 0x8a2a8a];
  for (const sx of [13, 15.5]) {
    const shelfM = std(0x8a8a84, { metalness: 0.3, roughness: 0.5 });
    box(0.1, 1.5, 3.4, shelfM, sx, 0.75, -1.2); solid(Math.floor(sx) - 1, -3, Math.floor(sx), 0);
    for (const y of [0.1, 0.55, 1.0]) box(0.9, 0.04, 3.4, shelfM, sx, y, -1.2, false);
    for (const side of [-1, 1]) for (const y of [0.12, 0.57, 1.02]) { let z = -2.8; while (z < 0.4) { const w = 0.12 + r() * 0.16, h = 0.12 + r() * 0.2; box(0.3, h, w, std(prodCols[(r() * 6) | 0], { roughness: 0.6 }), sx + side * 0.25, y + 0.02 + h / 2, z + w / 2, false); z += w + 0.03; } }
  }
  // coolers on the back wall
  box(8, 2.3, 0.8, std(0x2a2a2a, { metalness: 0.4 }), 15.5, 1.15, -4.4, false); solid(11, -5, 19, -4);
  const coolGlass = box(7.8, 1.9, 0.04, new THREE.MeshStandardMaterial({ color: 0xa8c0cc, transparent: true, opacity: 0.18, roughness: 0.05, emissive: 0x1a2a30, emissiveIntensity: 0.4 }), 15.5, 1.2, -3.98, false);
  for (let k = 0; k < 40; k++) box(0.12, 0.3, 0.12, std(prodCols[(r() * 6) | 0], { emissive: 0x101010 }), 12 + (k % 20) * 0.37, 0.55 + Math.floor(k / 20) * 0.8, -4.3, false);
  const coolL = new THREE.PointLight(0xd8f0ff, 1.5, 4, 1.5); coolL.position.set(15.5, 1.4, -3.4); scene.add(coolL);
  // hot food case + counter + register + the radio
  const counterM = std(0x5a3a22, { map: tex('plywood', [3, 1]) });
  box(1.2, 1.0, 3.2, counterM, 20.4, 0.5, -1.4); solid(19, -3, 20, 0);
  box(1.2, 0.05, 3.3, std(0xd8cfb8, { roughness: 0.3 }), 20.4, 1.02, -1.4, false);
  box(0.4, 0.25, 0.35, std(0x1a1a1a), 20.2, 1.17, -0.4, false);
  const radio = box(0.4, 0.22, 0.18, std(0x3a2a1a, { roughness: 0.5 }), 20.6, 1.15, -2.4, false);
  const hotCase = box(1.2, 0.6, 0.7, new THREE.MeshStandardMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.4, emissive: 0x804010, emissiveIntensity: 0.6 }), 18.3, 1.3, 1.6, false);
  box(1.3, 1.0, 0.75, std(0x8a8a84, { metalness: 0.4 }), 18.3, 0.5, 1.6); solid(17, 1, 18, 2);
  const foodItems = [];
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), std(k < 3 ? 0xc8ccd0 : 0xd8b878, { metalness: k < 3 ? 0.8 : 0, roughness: 0.4 })); b.rotation.z = Math.PI / 2; b.position.set(17.9 + (k % 3) * 0.3, 1.15 + Math.floor(k / 3) * 0.18, 1.6); scene.add(b); foodItems.push(b); }
  const hotT = textTex(256, 64, '#c02a1a', [{ text: 'BURRITOS · TAMALES', size: 28, color: '#fff' }]);
  const hotS = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), std(0xffffff, { map: hotT })); hotS.position.set(18.3, 1.78, 1.24); hotS.rotation.y = Math.PI; scene.add(hotS);
  const hotL = new THREE.PointLight(0xffb060, 2, 3, 1.6); hotL.position.set(18.3, 1.5, 1.2); scene.add(hotL);
  for (const [x, z] of [[13, -1], [17.5, -1]]) { const l = new THREE.PointLight(0xf0f4e8, 7, 8, 1.4); l.position.set(x, 3.2, z); scene.add(l); const tube = box(0.25, 0.06, 1.8, std(0x222222, { emissive: 0xf0f4e8, emissiveIntensity: 1.6 }), x, 3.35, z, false); }
  // the bench and the ice machine out front
  const bench = box(2.2, 0.45, 0.6, std(0x5a3a22, { map: tex('plywood', [2, 1]) }), 19, 0.45, 5.0); solid(18, 5, 19, 5, 0);
  box(0.1, 0.45, 0.6, std(0x333333), 18, 0.22, 5); box(0.1, 0.45, 0.6, std(0x333333), 20, 0.22, 5);
  box(1.2, 1.6, 0.9, std(0xe8e8e8, { metalness: 0.3 }), 21.2, 0.8, 4.6); solid(21, 4, 21, 5);
  const iceT = textTex(256, 128, '#1a5ab0', [{ text: 'ICE', size: 70, color: '#fff' }]);
  const iceS = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), std(0xffffff, { map: iceT })); iceS.position.set(21.2, 1.15, 5.06); scene.add(iceS);

  // ---------------- sky + light ----------------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 16, 8), new THREE.MeshBasicMaterial({ color: 0xc8d4d4, side: THREE.BackSide, fog: false })); scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe8ecf0, 0x7a6a50, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6); sun.position.set(-20, 30, 25); sun.target.position.set(10, 0, 5); scene.add(sun); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 90 }); sun.shadow.bias = -0.0008;

  // ---------------- people ----------------
  const npc = (kind, fb, h, x, z, yaw) => { const c = makeCharacter(kind, fb, h); c.group.position.set(x, 0, z); c.group.rotation.y = yaw; c.baseYaw = yaw; scene.add(c.group); animateWalk(c, 0, 0, false); return c; };
  const cashier = npc('elena', { shirt: 0x2a5ab0, pants: 0x2a2a3a, skin: 0x8a5a3a }, 1.6, 21.4, -1.4, -Math.PI / 2);
  const chuy = npc('chuy', { shirt: 0x5a5a5a, pants: 0x2a3a5a, skin: 0x9a6644 }, 1.74, 17.3, 6.2, Math.PI * 0.85);
  const beto = npc('beto', { shirt: 0x6a3a2a, pants: 0x5a4a3a, skin: 0x8a5a3a, mustache: true }, 1.72, 20.7, 6.3, -Math.PI * 0.85);
  const people = [cashier, chuy, beto];
  solid(17, 6, 17, 6, 0); solid(20, 6, 20, 6, 0); solid(21, -2, 21, -1, 0);
  const pumper = npc('gus', { shirt: 0x3a5a3a, pants: 0x3a3a3a }, 1.72, 3.5, 4.6, Math.PI);

  // burrito in hand
  const carry = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.17, 10), std(0xc8ccd0, { metalness: 0.8, roughness: 0.35 })); carry.rotation.set(0.3, 0, Math.PI / 2.4); carry.position.set(0.3, -0.32, -0.62); carry.visible = false; G.camera.add(carry);

  // ---------------- story ----------------
  const events = []; let tl = 0, stage = 'go', sitT = -1, eatT = -1, inside = false, wasInside = false;
  const at = (t, fn) => events.push({ t: tl + t, fn });
  const say = (...k) => ui.say(k.map((x) => ({ ...VO[x], pos: x.startsWith('ch') ? { x: chuy.group.position.x, y: 1.6, z: chuy.group.position.z } : x.startsWith('b') ? { x: beto.group.position.x, y: 1.6, z: beto.group.position.z } : x.startsWith('k') ? { x: 21.4, y: 1.6, z: -1.4 } : undefined })));
  audio.preloadVo(LUNCH_VO);
  audio.cityBed(); audio.setLoop('city', 0.12, 2);
  audio.startCumbia(null); audio.cumbiaLevel(0.4);
  ui.clock('12:31 PM');
  P.pos.set(4, 0, 27); P.yaw = 0; P.pitch = 0; P.flashlight = false;
  at(1.0, () => ui.objective('Get some food. The gas station across the street.'));
  let goal = [14.5, 4.5];
  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 18.3, z: 0.6, r: 1.6, label: 'Take a burrito', enabled: () => stage === 'food', action: () => { audio.rustle({ x: 18.3, y: 1.2, z: 1.6 }); foodItems[0].visible = false; carry.visible = true; stage = 'pay'; ui.objective('Pay at the counter.'); goal = [19.3, -0.6]; } });
  it({ x: 19.2, z: -0.8, r: 1.6, label: 'Pay', enabled: () => stage === 'pay', action: () => {
    stage = 'paying'; ui.objective(''); audio.beep({ x: 20.2, y: 1.2, z: -0.4 });
    say('k2').then(() => { stage = 'bench'; ui.objective('Eat with Chuy and Beto. The bench outside.'); goal = [19, 5.9]; });
  } });
  it({ x: 19, z: 6.0, r: 1.6, label: 'Sit down and eat', enabled: () => stage === 'bench', action: () => {
    stage = 'eat'; ui.objective(''); P.frozen = true; sitT = 0; goal = null;
    at(1.2, () => { eatT = 0; carry.position.set(0.2, -0.26, -0.55); });
    at(1.6, () => say('ch1', 'j1', 'b1', 'ch2', 'b2', 'j2', 'b3', 'ch3').then(() => {
      sitT = -1; P.frozen = false; P.eye = 1.62; carry.visible = false; stage = 'back';
      ui.objective('Back to work. Cross the street to Hammerline.'); goal = [10, 28];
    }));
  } });

  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    // the music is the radio on the counter: louder inside the store
    inside = P.pos.x > MX0 && P.pos.x < MX1 && P.pos.z > MZ0 && P.pos.z < MZ1 + 0.5;
    if (inside !== wasInside) { audio.cumbiaLevel(inside ? 1.0 : 0.4); audio.setLoop('city', inside ? 0.04 : 0.12, 0.6); if (inside) audio.doorBell({ x: 14.5, y: 2.6, z: MZ1 }); wasInside = inside; }
    if (stage === 'go' && inside) { stage = 'food'; ui.objective('Grab a burrito from the hot case.'); goal = [18.3, 0.6]; say('k1'); }
    // people face you when you're close
    for (const c of people) { const g = c.group.position, dx = P.pos.x - g.x, dz = P.pos.z - g.z; const want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : c.baseYaw; let df = want - c.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); c.group.rotation.y += df * Math.min(1, dt * 3); }
    // sitting on the bench
    if (sitT >= 0) {
      sitT += dt; P.pos.x += (19 - P.pos.x) * Math.min(1, dt * 3); P.pos.z += (5.2 - P.pos.z) * Math.min(1, dt * 3);
      P.eye += (1.1 - P.eye) * Math.min(1, dt * 3);
      if (sitT < 1.4) { P.yaw += (Math.PI - P.yaw) * Math.min(1, dt * 3); P.pitch += (0 - P.pitch) * Math.min(1, dt * 3); }
    }
    if (eatT >= 0 && eatT < 12) { const before = eatT; eatT += dt; P.food = Math.min(1, P.food + dt / 12); if (Math.floor(eatT / 2.4) !== Math.floor(before / 2.4)) audio.rustle({ x: P.pos.x, y: 1, z: P.pos.z - 0.3 }); if (eatT >= 12) { P.food = 1; game.eat(0); ui.toast('YOU ATE'); } }
    // back across the street
    if (stage === 'back' && P.pos.z > 27) { stage = 'done'; ui.objective(''); game.nextChapter(); }
    const de = document.getElementById('dirHint');
    if (goal && !P.frozen) { de.style.opacity = 0.42; const ang = Math.atan2(goal[0] - P.pos.x, goal[1] - P.pos.z), rel = ang - (P.yaw + Math.PI); de.querySelector('i').style.transform = `rotate(${-rel}rad)`; de.querySelector('b').textContent = `${Math.round(Math.hypot(goal[0] - P.pos.x, goal[1] - P.pos.z))}m`; } else de.style.opacity = 0;
  };
  L.danger = () => ({ heart: 0 });
  L.dispose = () => { G.camera.remove(carry); audio.stopCumbia(); document.getElementById('dirHint').style.opacity = 0; };
  return L;
}
