// PROLOGUE — "La Cocina de Rosa". A warm afternoon at Doña Rosa's taquería before everything goes wrong.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792088139';
import { tex, textTex, rng, facadeTex } from './textures.js?v=1792088139';
import { makeCharacter, makeVehicle, makeStatic, animateWalk, makeGlow, makeCar, makeBeam, std } from './models.js?v=1792088139';

const VO = {
  rosa1: { id: 'p_rosa1', who: 'Doña Rosa', text: '¡Ay, mijo, por fin! Luz has been waiting all afternoon. Go, go say hi to your daughter.' },
  luz1: { id: 'p_luz1', who: 'Luz', text: 'Papi! Look, I drew you. You\'re building a house, and that\'s me on the roof!' },
  m1: { id: 'p_m1', who: 'Mateo', text: 'That\'s me? Mija, I look so strong.' },
  luz2: { id: 'p_luz2', who: 'Luz', text: 'Because you are. Are you coming to my party on Saturday? Promise?' },
  m2: { id: 'p_m2', who: 'Mateo', text: 'I promise. Nothing in the world could keep me away.' },
  rosa2: { id: 'p_rosa2', who: 'Doña Rosa', text: 'Mateo! Table three. The food\'s up in the window. Make yourself useful.' },
  chuy1: { id: 'p_chuy1', who: 'Don Chuy', text: 'Gracias, mijo. Tell Rosa her salsa is too spicy. Like always.' },
  rosa3: { id: 'p_rosa3', who: 'Doña Rosa', text: 'I heard that, Chuy! ...Mateo, we\'re out of tortillas. Bring me a stack from the pantry. The light\'s out back there, use your flashlight.' },
  m3: { id: 'p_m3', who: 'Mateo', text: 'Ay! ...Canela. Stupid cat.' },
  rosa4: { id: 'p_rosa4', who: 'Doña Rosa', text: 'Don\'t call my cat stupid. She\'s smarter than you and Rafa together.' },
  thanks: { id: 'p_thanks', who: 'Doña Rosa', text: 'Gracias, mijo. Sit, sit. Eat something.' },
  news: { id: 'p_news', who: 'TV', text: '...federal immigration operations expanded across Los Angeles County this week, with arrests reported at car washes, home improvement stores, and farms. Advocates are urging residents to know their rights...' },
  chuy2: { id: 'p_chuy2', who: 'Don Chuy', text: 'Rosa. Turn that off. Not in front of the girl.' },
  rosa5: { id: 'p_rosa5', who: 'Doña Rosa', text: 'Ya. Ya, it\'s off. ...Eat, everybody. Eat.' },
  chuy3: { id: 'p_chuy3', who: 'Don Chuy', text: '...That truck again. Third time today.' },
  luz3: { id: 'p_luz3', who: 'Luz', text: 'Papi... are they going to take people from here?' },
  m4: { id: 'p_m4', who: 'Mateo', text: 'No, mija. Not from here. Eat your quesadilla.' },
  rafa1: { id: 'p_rafa1', who: 'Rafa', text: '¡Buenas tardes, familia! Mateo, Gus wants us at the site by three. Vámonos, güey.' },
  rafa2: { id: 'p_rafa2', who: 'Rafa', text: 'Luz! Did you save me a quesadilla? No? Ay, qué mala.' },
  rosa6: { id: 'p_rosa6', who: 'Doña Rosa', text: 'You two come back for pozole tonight. Both of you. Ten o\'clock.' },
  luz4: { id: 'p_luz4', who: 'Luz', text: 'Bye, Papi! Saturday! You promised!' },
  m5: { id: 'p_m5', who: 'Mateo', text: 'Saturday. I promised.' },
  nag: { id: 'p_rosanag', who: 'Doña Rosa', text: 'The plates won\'t carry themselves, mijo.' },
};
export const REST_VO = Object.values(VO).map((l) => l.id);

// Luz's crayon drawing, shown when she hands it to you
function drawingHTML() {
  const c = document.createElement('canvas'); c.width = 460; c.height = 300; const x = c.getContext('2d');
  x.fillStyle = '#f6f1e4'; x.fillRect(0, 0, 460, 300);
  const crayon = (col, w) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; };
  const wobble = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a + Math.random() * 2, b + Math.random() * 2) : x.moveTo(a, b))); x.stroke(); };
  crayon('#4a8a3a', 6); wobble([[0, 262], [120, 258], [260, 264], [460, 259]]);
  crayon('#e0b030', 5); for (let i = 0; i < 10; i++) { const a = i * 0.63; wobble([[400, 50], [400 + Math.cos(a) * 40, 50 + Math.sin(a) * 40]]); }
  x.fillStyle = '#f2c43a'; x.beginPath(); x.arc(400, 50, 22, 0, 7); x.fill();
  crayon('#b0452a', 5); wobble([[150, 260], [150, 140], [310, 140], [310, 260]]); wobble([[135, 145], [230, 70], [325, 145]]);
  crayon('#3a5aa8', 4); wobble([[195, 260], [195, 205], [235, 205], [235, 260]]); wobble([[255, 170], [290, 170], [290, 200], [255, 200], [255, 170]]);
  // Papi with a hammer
  crayon('#2a2a2a', 4); x.beginPath(); x.arc(100, 175, 14, 0, 7); x.stroke(); wobble([[100, 189], [100, 230]]); wobble([[100, 230], [86, 258]]); wobble([[100, 230], [114, 258]]); wobble([[100, 200], [80, 215]]); wobble([[100, 200], [124, 185]]);
  crayon('#7a4a20', 4); wobble([[124, 185], [134, 168]]); crayon('#555', 6); wobble([[128, 166], [142, 170]]);
  // Luz on the roof
  crayon('#7a3ab0', 4); x.beginPath(); x.arc(230, 52, 11, 0, 7); x.stroke(); wobble([[230, 63], [230, 92]]); wobble([[230, 92], [220, 108]]); wobble([[230, 92], [240, 108]]); wobble([[230, 72], [214, 64]]); wobble([[230, 72], [246, 64]]);
  x.fillStyle = '#2a2a2a'; x.font = '22px "Comic Sans MS", "Chalkboard SE", sans-serif'; x.fillText('MI PAPI', 40, 40); x.fillStyle = '#7a3ab0'; x.fillText('y yo', 255, 40);
  return `<img src="${c.toDataURL()}" style="width:100%;display:block;margin:-6px 0 6px;border:1px solid #c8bfa8">`;
}

export function createRestaurant(G) {
  const { audio, ui, P, game } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9c9a8);
  scene.fog = new THREE.Fog(0xd9c9a8, 40, 120);
  const grid = new Grid(24, 24, 0, 0);
  const L = { scene, grid, interactables: [], allowFlashlight: true, noDrain: true, surface: 'concrete', allowSprint: true };
  const r = rng(909);

  // warm daylight grade
  ui.post.exposure.value = 1.0; ui.post.sat.value = 0.8; ui.post.contrast.value = 1.06; ui.post.tint.value.set(1.06, 1.0, 0.9); ui.post.lift.value.set(0, 0, 0); ui.post.levels.value = 30;

  // ---------------- materials ----------------
  const canvasT = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const floorT = canvasT(256, 256, (x) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 0.85 + r() * 0.2; x.fillStyle = `rgb(${(168 * v) | 0},${(82 * v) | 0},${(48 * v) | 0})`; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); x.fillStyle = 'rgba(255,220,180,0.06)'; x.fillRect(i * 64 + 8, j * 64 + 8, 30, 20); } x.fillStyle = '#5e3a26'; for (let k = 0; k <= 4; k++) { x.fillRect(k * 64 - 1, 0, 3, 256); x.fillRect(0, k * 64 - 1, 256, 3); } }, [16, 16]);
  const floorM = std(0xffffff, { map: floorT, roughness: 0.4 });
  const paintT = canvasT(64, 64, (x) => { x.fillStyle = '#e6ad4a'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,240,200' : '120,70,20'},0.05)`; x.fillRect(r() * 64, r() * 64, 2, 2); } }, [1, 1]);
  const wallM = () => std(0xffffff, { map: paintT, roughness: 0.92 });
  const greenWallM = std(0x2f6a52, { roughness: 0.9 });
  const talT = canvasT(128, 128, (x) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const ox = i * 64, oy = j * 64; x.fillStyle = '#f2ecdc'; x.fillRect(ox, oy, 64, 64); x.fillStyle = '#1f4fa0'; x.beginPath(); x.arc(ox + 32, oy + 32, 14, 0, 7); x.fill(); x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(ox + 32, oy + 32, 7, 0, 7); x.fill(); x.fillStyle = '#e0a020'; x.beginPath(); x.arc(ox + 32, oy + 32, 4, 0, 7); x.fill(); x.fillStyle = '#1f4fa0'; for (const [cx, cy] of [[0, 0], [64, 0], [0, 64], [64, 64]]) { x.beginPath(); x.arc(ox + cx, oy + cy, 12, 0, 7); x.fill(); } x.strokeStyle = '#c8c0b0'; x.strokeRect(ox + 0.5, oy + 0.5, 63, 63); } }, [12, 1]);
  const talM = std(0xffffff, { map: talT, roughness: 0.3 });
  const woodM = std(0x6a4024, { map: tex('plywood', [1, 1]), roughness: 0.7 });
  const steelM = std(0x9aa0a4, { metalness: 0.7, roughness: 0.35 });
  const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  function wall(x0, z0, x1, z1, h = 3.6, mat, opaque = true) {
    grid.rect(x0, z0, x1, z1, 1, opaque ? 1 : 0);
    const w = x1 - x0 + 1, d = z1 - z0 + 1;
    const wb = box(w, h, d, mat || wallM(), (x0 + x1 + 1) / 2, h / 2, (z0 + z1 + 1) / 2, false);
    if (h > 3 && !mat) { const t = box(w + 0.04, 1.0, d + 0.04, talM, (x0 + x1 + 1) / 2, 0.5, (z0 + z1 + 1) / 2, false); t.material = talM.clone(); t.material.map = talT.clone(); t.material.map.needsUpdate = true; t.material.map.repeat.set(Math.max(w, d), 1); }
    return wb;
  }

  // ---------------- shell ----------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(12, 0, 12); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), std(0xf0e6d0, { roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(12, 3.6, 12); scene.add(ceil);
  wall(0, 0, 23, 0); wall(0, 1, 0, 22); wall(23, 1, 23, 22);
  // front: windows + door
  grid.rect(0, 23, 23, 23, 1, 0);
  { const fm = talM.clone(); fm.map = talT.clone(); fm.map.needsUpdate = true; fm.map.repeat.set(27, 1); box(24, 0.9, 0.3, fm, 12, 0.45, 23.5, false); }
  box(24, 0.7, 0.3, wallM(), 12, 3.25, 23.5, false);
  for (const x of [0.15, 9.85, 12.15, 23.85]) box(0.3, 3.6, 0.3, woodM, x, 1.8, 23.5, false);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 });
  box(9.7, 2.0, 0.05, glassM, 5, 1.9, 23.5, false); box(11.6, 2.0, 0.05, glassM, 18, 1.9, 23.5, false);
  const doorWood = std(0x5a3418, { roughness: 0.6 });
  box(0.12, 2.9, 0.12, doorWood, 9.98, 1.45, 23.5, false); box(0.12, 2.9, 0.12, doorWood, 12.02, 1.45, 23.5, false); box(2.16, 0.14, 0.12, doorWood, 11, 2.88, 23.5, false);
  box(0.9, 2.7, 0.06, doorWood, 10.5, 1.4, 23.55, false); box(0.9, 2.7, 0.06, doorWood, 11.5, 1.4, 23.55, false);
  const doorGlass = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.2, roughness: 0.05 });
  box(0.66, 1.6, 0.07, doorGlass, 10.5, 1.65, 23.55, false); box(0.66, 1.6, 0.07, doorGlass, 11.5, 1.65, 23.55, false);
  box(0.6, 0.05, 0.05, std(0xb8bcc0, { metalness: 0.8, roughness: 0.3 }), 10.5, 1.05, 23.48, false); box(0.6, 0.05, 0.05, std(0xb8bcc0, { metalness: 0.8, roughness: 0.3 }), 11.5, 1.05, 23.48, false);
  const winT = textTex(512, 128, null, [{ text: 'TAQUERÍA DOÑA ROSA', size: 52, color: '#f0d27a' }]);
  const winSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: winT, transparent: true })); winSign.position.set(5, 2.3, 23.45); winSign.rotation.y = Math.PI; scene.add(winSign);
  const hoursT = textTex(256, 160, null, [{ text: 'ABIERTO', size: 40, color: '#e04a2a', y: 50 }, { text: '7AM – 11PM', size: 28, color: '#f0e0b0', y: 110 }]);
  const hours = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.62), new THREE.MeshBasicMaterial({ map: hoursT, transparent: true })); hours.position.set(11.6, 2.1, 23.42); hours.rotation.y = Math.PI; scene.add(hours);

  // outside: the street in afternoon light
  const street = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), std(0x3a3a38, { map: tex('asphalt', [30, 8]) })); street.rotation.x = -Math.PI / 2; street.position.set(12, -0.02, 50); scene.add(street);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(200, 5), std(0x9a968c, { map: tex('sidewalk', [40, 1]) })); walk.rotation.x = -Math.PI / 2; walk.position.set(12, 0.01, 26.5); scene.add(walk);
  for (let i = 0; i < 7; i++) {
    const h = 7 + r() * 5, floors = Math.round(h / 3.4), w = 11 + r() * 3;
    const fac = facadeTex(300 + i * 13, floors, Math.round(w / 3), ['#c8a878', '#8aa0a0', '#b07a5a', '#d0c8b0'][i % 4]);
    const front = std(0xffffff, { map: fac.map, roughness: 0.9 }), side = std([0xc8a878, 0x8aa0a0, 0xb07a5a, 0xd0c8b0][i % 4], { map: tex('stucco', [2, 2]) });
    box(w, h, 8, [side, side, side, side, side, front], -24 + i * 12, h / 2, 46, false);
    const aw = box(w * 0.8, 0.08, 1.4, std([0x6e1d1a, 0x1d4a3a, 0x24304e][i % 3]), -24 + i * 12, 3.0, 41.4, false); aw.rotation.x = -0.35;
  }
  const parked = makeVehicle('suv', 4.3, 0x5a3434, 0.3) || makeCar(0x6b1f1f); parked.position.set(4, 0, 30.5); parked.rotation.y = Math.PI / 2; scene.add(parked);
  const parked2 = makeVehicle('suv', 4.3, 0x6a6a66, 0.3) || makeCar(0x8a8478); parked2.position.set(19, 0, 30.5); parked2.rotation.y = Math.PI / 2; scene.add(parked2);
  const truck = makeVehicle('suv', 4.8, 0x161616, 0.6) || makeCar(0x0a0b0c, true); truck.position.set(7, 0, 33.5); truck.rotation.y = Math.PI / 2; scene.add(truck);
  // the watcher: cap, sunglasses, windbreaker, staring in from beside the van
  const watcher = makeStatic('watcher', 1.82) || makeCharacter('agent', { shirt: 0x1a2030, pants: 0x222222, hat: 'cap' }, 1.82);
  const wg = watcher.group || watcher; wg.position.set(9.6, 0, 31.6); wg.rotation.y = Math.PI; scene.add(wg);
  let watchState = 'watching', watchT = 0;

  // ---------------- kitchen ----------------
  // counter with the pass window
  grid.rect(1, 7, 14, 7, 1, 0);
  box(14, 1.05, 0.9, std(0x5a2a1a, { map: tex('plywood', [6, 1]) }), 8, 0.52, 7.5);
  box(14.2, 0.06, 1.0, std(0xd8cfb8, { roughness: 0.3 }), 8, 1.08, 7.5);
  const passHeat = box(3, 0.05, 0.8, steelM, 9, 1.4, 7.45);
  const lamp1 = makeGlow(0xffa050, 1.0, 0.6); lamp1.position.set(9, 1.75, 7.45); scene.add(lamp1);
  wall(17, 7, 22, 7); // behind which is the pantry
  wall(17, 1, 17, 4); // pantry side wall (door at z 5..6)
  box(1, 0.8, 1, wallM(), 17.5, 3.2, 5.5, false);
  // grill + hood + prep table + fridge
  box(6, 0.95, 1, steelM, 11, 0.47, 1.5); grid.rect(8, 1, 13, 1);
  const grillTop = box(5.6, 0.04, 0.8, std(0x1a1a1a, { roughness: 0.4, emissive: 0x401000, emissiveIntensity: 0.6 }), 11, 0.97, 1.5);
  box(6.4, 0.8, 1.4, steelM, 11, 3.0, 1.4, false);
  box(4, 0.9, 1.2, steelM, 4, 0.45, 4.2); grid.rect(2, 4, 5, 4, 1, 0);
  box(1.6, 2.1, 0.9, std(0xd8dcd8, { metalness: 0.3, roughness: 0.4 }), 15.5, 1.05, 1.5); grid.rect(15, 1, 16, 1);
  for (let i = 0; i < 6; i++) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.3, 10), steelM); pot.position.set(9 + i * 0.9, 1.15, 1.4); scene.add(pot); }
  const bigPot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.55, 12), std(0xb03020, { roughness: 0.5 })); bigPot.position.set(12.5, 1.25, 1.5); scene.add(bigPot); // the pozole

  // pantry (dark): shelves, sacks, tortillas, Canela the cat
  const shelfM = std(0x7a6a50);
  for (const z of [1.3, 3.3]) { box(4.4, 0.06, 0.6, shelfM, 20.2, 1.0, z); box(4.4, 0.06, 0.6, shelfM, 20.2, 1.8, z); }
  grid.rect(18, 1, 22, 1, 1, 0); grid.rect(18, 3, 22, 3, 1, 0);
  for (let i = 0; i < 9; i++) box(0.4, 0.35, 0.35, std([0xc8b090, 0xa04030, 0xe0d0a0][i % 3]), 18.4 + (i % 5) * 0.9, 1.2 + (i > 4 ? 0.8 : 0), 1.3);
  for (let i = 0; i < 4; i++) { const sack = box(0.6, 0.7, 0.45, std(0xd8ccaa), 18.6 + i * 1.1, 0.35, 5.5); }
  const tortillas = new THREE.Group();
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 14), std(0xe8d8a0)); t.position.y = i * 0.013; tortillas.add(t); }
  tortillas.position.set(21.3, 1.84, 3.3); scene.add(tortillas);
  const tortGlow = makeGlow(0xffe0a0, 0.25, 0.4); tortGlow.position.set(21.3, 1.9, 3.3); scene.add(tortGlow);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std(0x333333)); bulb.position.set(20, 3.3, 3.5); scene.add(bulb);
  const cat = new THREE.Group(); const catM = std(0xc07a38, { roughness: 0.6 }); // Canela is orange
  const cbx = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), catM); m.position.set(x, y, z); cat.add(m); };
  cbx(0.18, 0.18, 0.45, 0, 0.22, 0); cbx(0.14, 0.13, 0.14, 0, 0.32, 0.27); cbx(0.04, 0.04, 0.35, 0, 0.35, -0.33); cbx(0.04, 0.07, 0.03, -0.045, 0.41, 0.27); cbx(0.04, 0.07, 0.03, 0.045, 0.41, 0.27);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xd8f070 })); e.position.set(sx * 0.035, 0.34, 0.345); cat.add(e); }
  cat.position.set(19.2, 1.83, 1.3); cat.rotation.y = 0.3; scene.add(cat);
  { const glb = makeVehicle('cat', 0.6, 0xd08a48, 0.8); if (glb) { cat.children.slice().forEach((ch) => cat.remove(ch)); cat.add(glb); } }
  let catT = -1;

  // ---------------- dining room ----------------
  wall(0, 8, 0, 22, 3.6, greenWallM); // accent wall (west)
  box(0.05, 1.0, 15, talM, 0.52, 0.5, 15.5, false);
  // ceiling beams
  for (let x = 2; x < 23; x += 3) box(0.22, 0.25, 24, std(0x4a2a16, { roughness: 0.8 }), x, 3.47, 12, false);
  // oilcloth patterns for the tablecloths
  const oil = (bg, fl) => canvasT(128, 128, (x) => { x.fillStyle = bg; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 14; i++) { const cx = r() * 128, cy = r() * 128; x.fillStyle = fl[i % fl.length]; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + Math.cos(k * 1.26) * 5, cy + Math.sin(k * 1.26) * 5, 4, 0, 7); x.fill(); } x.fillStyle = '#f2d24a'; x.beginPath(); x.arc(cx, cy, 2.5, 0, 7); x.fill(); x.fillStyle = '#2a7a3a'; x.fillRect(cx + 6, cy + 4, 7, 3); } }, [1, 1]);
  const clothM = [std(0xffffff, { map: oil('#c8302a', ['#f0e0c8', '#2a5ab0']), roughness: 0.25 }), std(0xffffff, { map: oil('#f2ecdc', ['#d0302a', '#2a5ab0', '#e08a20']), roughness: 0.25 }), std(0xffffff, { map: oil('#2a5ab0', ['#f0e0c8', '#e04a6a']), roughness: 0.25 })];
  const legM = std(0x2a2a2a, { metalness: 0.6, roughness: 0.4 });
  const chairM = std(0x8a4a22, { roughness: 0.6 });
  const tables = { t1: [4, 11], t2: [10, 11], t6: [18, 11], t4: [4, 17], t5: [10, 17], t3: [18, 17] };
  Object.entries(tables).forEach(([k, [x, z]], i) => {
    grid.rect(x - 1, z - 1, x, z, 1, 0);
    box(1.0, 0.03, 1.0, clothM[i % 3], x, 0.76, z); box(1.04, 0.12, 1.04, clothM[i % 3], x, 0.69, z, false);
    box(0.06, 0.74, 0.06, legM, x, 0.37, z); box(0.5, 0.03, 0.5, legM, x, 0.015, z);
    for (const [cx, cz, ry] of [[-0.75, 0, Math.PI / 2], [0.75, 0, -Math.PI / 2], [0, -0.75, 0], [0, 0.75, Math.PI]]) {
      const ch = new THREE.Group(); ch.position.set(x + cx, 0, z + cz); ch.rotation.y = ry; scene.add(ch);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), chairM); seat.position.y = 0.45; ch.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.04), chairM); back.position.set(0, 0.68, -0.2); ch.add(back);
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.45, 0.035), chairM); l.position.set(lx, 0.225, lz); ch.add(l); }
      ch.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    }
    // table props: napkin dispenser, red + green salsa, salt + pepper, menu
    box(0.1, 0.12, 0.07, std(0xb8bcc0, { metalness: 0.8, roughness: 0.25 }), x - 0.05, 0.84, z);
    box(0.08, 0.1, 0.005, std(0xf8f8f0), x - 0.05, 0.84, z + 0.038, false);
    for (const [dx, col] of [[0.12, 0xb0201a], [0.18, 0x3a8a2a]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.16, 8), std(col, { roughness: 0.3 })); b.position.set(x + dx, 0.86, z - 0.02); scene.add(b); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.04, 6), std(0xf0f0f0)); cap.position.set(x + dx, 0.96, z - 0.02); scene.add(cap); }
    for (const [dx, col] of [[-0.18, 0xf0f0f0], [-0.24, 0x2a2a2a]]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.07, 8), std(0xd8dce0, { transparent: true, opacity: 0.6 })); sh.position.set(x + dx, 0.81, z + 0.02); scene.add(sh); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.015, 8), std(0xb0b4b8, { metalness: 0.8 })); top.position.set(x + dx, 0.85, z + 0.02); scene.add(top); }
    const menuStand = box(0.14, 0.2, 0.01, std(0xf0e0b0), x + 0.02, 0.87, z + 0.18); menuStand.rotation.x = -0.2;
  });
  // Luz's homework + quesadilla on table one
  box(0.3, 0.005, 0.21, std(0xf6f2e8), 4.25, 0.785, 11.15); box(0.012, 0.012, 0.16, std(0x7a3ab0), 4.4, 0.79, 11.15);
  const plate1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 14), std(0xf4f4ee)); plate1.position.set(3.8, 0.79, 10.85); scene.add(plate1);
  box(0.16, 0.02, 0.09, std(0xe8b860), 3.8, 0.81, 10.85);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.12, 10), std(0xa02040, { transparent: true, opacity: 0.85 })); cup.position.set(4.05, 0.84, 10.7); scene.add(cup);
  // counter: register, aguas frescas jars, pan dulce case
  box(0.38, 0.2, 0.32, std(0x2a2a2a, { roughness: 0.5 }), 13.2, 1.2, 7.45); box(0.3, 0.12, 0.02, std(0x1a3a2a, { emissive: 0x2a8a4a, emissiveIntensity: 0.6 }), 13.2, 1.38, 7.3);
  for (const [i, col] of [[0, 0xf2ece0], [1, 0x8a1030], [2, 0x7a4a20]].map(([i, c]) => [i, c])) {
    const jx = 2.5 + i * 0.55;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0xe8f0f0, transparent: true, opacity: 0.25, roughness: 0.05 })); glass.position.set(jx, 1.36, 7.4); scene.add(glass);
    const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.165, 0.38, 14), std(col, { roughness: 0.2, transparent: true, opacity: 0.9 })); drink.position.set(jx, 1.3, 7.4); scene.add(drink);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 14), std(0x9aa0a4, { metalness: 0.7 })); lid.position.set(jx, 1.62, 7.4); scene.add(lid);
  }
  const jarLabel = textTex(512, 64, '#f0e0b0', [{ text: 'HORCHATA · JAMAICA · TAMARINDO', size: 34, color: '#6a2a1a' }]);
  const jl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), std(0xffffff, { map: jarLabel })); jl.position.set(3.05, 1.18, 7.96); scene.add(jl);
  const caseM = new THREE.MeshStandardMaterial({ color: 0xe8f0f0, transparent: true, opacity: 0.22, roughness: 0.05 });
  box(1.2, 0.5, 0.5, caseM, 5.6, 1.35, 7.45, false);
  for (let i = 0; i < 8; i++) { const pd = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), std([0xe8a0b0, 0xd8a050, 0xa86a3a][i % 3], { roughness: 0.8 })); pd.position.set(5.15 + (i % 4) * 0.28, 1.12 + Math.floor(i / 4) * 0.2, 7.45); scene.add(pd); }
  // refrescos cooler (lit glass door)
  box(1.0, 2.0, 0.7, std(0xc8302a, { roughness: 0.5 }), 22.3, 1.0, 20.2); grid.rect(22, 20, 22, 20);
  box(0.03, 1.6, 0.62, new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.25, emissive: 0x405060, emissiveIntensity: 0.6 }), 21.78, 1.1, 20.2, false);
  for (let sh = 0; sh < 4; sh++) for (let k = 0; k < 5; k++) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.24, 6), std([0x3a1a0a, 0xf08a20, 0x2aa04a, 0xd0302a, 0x8a2aa0][(k + sh) % 5], { roughness: 0.2, emissive: 0x101010 })); bt.position.set(22.05, 0.55 + sh * 0.38, 19.95 + k * 0.12); scene.add(bt); }
  const coolerL = new THREE.PointLight(0xd8f0ff, 2, 3, 1.5); coolerL.position.set(21.6, 1.4, 20.2); scene.add(coolerL);
  // veladora candle on a little shelf + framed lotería cards
  box(0.5, 0.04, 0.2, std(0x5a3a22), 0.65, 2.0, 15.6, false);
  const vel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xc8302a, transparent: true, opacity: 0.85, emissive: 0x501010 })); vel.position.set(0.65, 2.12, 15.6); scene.add(vel);
  const flame = makeGlow(0xffb050, 0.25, 0.9); flame.position.set(0.65, 2.26, 15.6); scene.add(flame);
  const candleL = new THREE.PointLight(0xffa040, 1.5, 3, 1.5); candleL.position.set(0.8, 2.3, 15.6); scene.add(candleL);
  const LOT = [['EL CORAZÓN', '#c8202a'], ['LA LUNA', '#f0d040'], ['EL GALLO', '#e07a20'], ['LA SIRENA', '#2a8ab0'], ['EL SOL', '#f0a020']];
  LOT.forEach(([name, col], i) => {
    const t = textTex(96, 140, '#f6efe0', [{ text: String(i + 1), size: 14, color: '#222', x: 12, y: 14 }, { text: name, size: 12, color: '#222', y: 126 }], { border: '#2a2a2a', borderW: 4 });
    const cv = t.image.getContext('2d'); cv.fillStyle = col; cv.beginPath(); cv.arc(48, 66, 26, 0, 7); cv.fill(); t.needsUpdate = true;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), std(0xffffff, { map: t })); card.position.set(22.8, 2.35, 16.2 + i * 0.55); card.rotation.y = -Math.PI / 2; scene.add(card);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.56), std(0x2a1a10)); fr.position.set(22.81, 2.35, 16.2 + i * 0.55); fr.rotation.y = -Math.PI / 2; scene.add(fr);
  });
  // TV on the east wall
  const tvC = document.createElement('canvas'); tvC.width = 256; tvC.height = 144; const tvX = tvC.getContext('2d');
  const tvT = new THREE.CanvasTexture(tvC); tvT.colorSpace = THREE.SRGBColorSpace;
  const tvM = new THREE.MeshBasicMaterial({ map: tvT, color: 0x222222 });
  box(1.9, 1.15, 0.12, std(0x111111), 22.85, 2.35, 14, false);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.0), tvM); tvScreen.position.set(22.78, 2.35, 14); tvScreen.rotation.y = -Math.PI / 2; scene.add(tvScreen);
  let tvOn = true, tvTick = 0, tickerX = 256;
  function drawTV(mode) {
    tvX.fillStyle = mode === 'news' ? '#1a2a44' : '#2a5a2a'; tvX.fillRect(0, 0, 256, 144);
    if (mode === 'news') {
      tvX.fillStyle = '#c8a888'; tvX.beginPath(); tvX.arc(128, 54, 18, 0, 7); tvX.fill(); tvX.fillStyle = '#222'; tvX.fillRect(100, 72, 56, 40);
      tvX.fillStyle = '#b01a1a'; tvX.fillRect(0, 100, 256, 22); tvX.fillStyle = '#fff'; tvX.font = 'bold 13px Arial'; tvX.fillText('ICE OPERATIONS EXPAND ACROSS L.A. COUNTY', 6, 115);
      tvX.fillStyle = '#000'; tvX.fillRect(0, 122, 256, 22); tvX.fillStyle = '#ffd24a'; tvX.font = '12px Arial';
      tvX.fillText('KNOW YOUR RIGHTS: YOU MAY REMAIN SILENT · DO NOT OPEN THE DOOR WITHOUT A SIGNED WARRANT · ', tickerX, 137);
    } else { // fútbol
      tvX.strokeStyle = '#e0e0e0'; tvX.lineWidth = 2; tvX.strokeRect(10, 10, 236, 124); tvX.beginPath(); tvX.moveTo(128, 10); tvX.lineTo(128, 134); tvX.stroke(); tvX.beginPath(); tvX.arc(128, 72, 20, 0, 7); tvX.stroke();
      for (let i = 0; i < 8; i++) { tvX.fillStyle = i < 4 ? '#e03030' : '#f0f0f0'; tvX.fillRect(40 + ((i * 37 + tvTick * 20) % 180), 30 + ((i * 53) % 80), 5, 8); }
      tvX.fillStyle = '#000a'; tvX.fillRect(6, 6, 90, 16); tvX.fillStyle = '#fff'; tvX.font = 'bold 11px Arial'; tvX.fillText('AME 1 - 1 CHI', 10, 18);
    }
    tvT.needsUpdate = true;
  }
  let tvMode = 'futbol';
  // jukebox
  box(0.9, 1.7, 0.6, std(0x7a2a2a, { roughness: 0.4, metalness: 0.3, emissive: 0x401808, emissiveIntensity: 0.6 }), 1.0, 0.85, 21); grid.rect(0, 21, 1, 21);
  const jbGlow = makeGlow(0xffa040, 0.9, 0.5); jbGlow.position.set(1.0, 1.4, 21.35); scene.add(jbGlow);
  // bulletin board + photo wall
  const boardT = textTex(512, 340, '#a07a50', [{ text: 'KNOW YOUR RIGHTS', size: 34, color: '#1a1a1a', y: 40 }, { text: 'CONOZCA SUS DERECHOS', size: 22, color: '#1a1a1a', y: 76, weight: 'normal' }, { text: 'SE RENTA CUARTO · CLASES DE INGLÉS', size: 18, color: '#2a2a2a', y: 300, weight: 'normal' }]);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.06), std(0xffffff, { map: boardT })); board.position.set(1.02, 1.7, 19); board.rotation.y = Math.PI / 2; scene.add(board);
  for (let i = 0; i < 5; i++) { const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.35), std([0x8a7a6a, 0x6a7a8a, 0x9a8a6a, 0x5a5a5a, 0x7a6a5a][i])); ph.position.set(1.02, 1.6 + (i % 2) * 0.5, 10.4 + i * 0.6); ph.rotation.y = Math.PI / 2; scene.add(ph); const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.43), std(0x2a1a10)); fr.position.set(1.015, 1.6 + (i % 2) * 0.5, 10.4 + i * 0.6); fr.rotation.y = Math.PI / 2; scene.add(fr); }
  // menu board above the pass
  const menuT = textTex(1024, 220, '#1a1a1a', [{ text: 'TACOS 2.50 · BURRITOS 9 · TORTAS 10 · QUESADILLAS 6', size: 44, color: '#f0e6c8', y: 70 }, { text: 'POZOLE ROJO — SÁBADOS (Y HOY)', size: 40, color: '#e0702a', y: 150 }], { border: '#6a4a2a' });
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), std(0xffffff, { map: menuT })); menu.position.set(8, 2.85, 7.02); scene.add(menu);
  // papel picado: small cut-out paper flags strung high
  const picT = canvasT(64, 80, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 80); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(10 + i * 15, 14 + j * 15, 4, 0, 7); x.fill(); } x.beginPath(); x.moveTo(32, 30); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? 6 : 13; x.lineTo(32 + Math.cos(a) * rr, 40 + Math.sin(a) * rr); } x.fill(); for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(k * 8, 80); x.lineTo(k * 8 + 4, 72); x.lineTo(k * 8 + 8, 80); x.fill(); } });
  const ppCols = [0xe0302a, 0xf0a020, 0x2a8ad0, 0x30a040, 0xd040a0, 0xf0e040];
  const ppMats = ppCols.map((c) => new THREE.MeshStandardMaterial({ color: c, map: picT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
  const ppGeo = new THREE.PlaneGeometry(0.26, 0.32);
  const stringM = new THREE.LineBasicMaterial({ color: 0x2a2a2a });
  for (const z of [9.5, 12.5, 15.5, 18.5, 21.5]) {
    const pts = [];
    for (let i = 0; i < 44; i++) {
      const x = 0.8 + i * 0.5, sag = Math.sin((i / 43) * Math.PI) * 0.25;
      const f = new THREE.Mesh(ppGeo, ppMats[(i + z * 2) % 6 | 0]); f.position.set(x, 3.2 - sag, z); f.userData.sway = r() * 6; f.name = 'pp'; scene.add(f);
      pts.push(new THREE.Vector3(x, 3.36 - sag, z));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), stringM));
  }
  // ceiling fans
  const fans = [[6, 14], [16, 14]].map(([x, z]) => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.18), woodM); b.position.x = 0.6; const p = new THREE.Group(); p.rotation.y = (i * Math.PI) / 2; p.add(b); g.add(p); } g.position.set(x, 3.3, z); scene.add(g); return g; });
  // plants
  for (const [x, z] of [[22, 22], [1.5, 9.2], [22, 8.5]]) { box(0.5, 0.5, 0.5, std(0xb05a30), x, 0.25, z); for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 4), std(0x3a7a3a)); l.position.set(x + (r() - 0.5) * 0.4, 0.9, z + (r() - 0.5) * 0.4); l.rotation.z = (r() - 0.5) * 0.8; scene.add(l); } grid.rect(Math.floor(x), Math.floor(z), Math.floor(x), Math.floor(z)); }

  // ---------------- lights ----------------
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a4020, 0.9));
  const sun = new THREE.DirectionalLight(0xffd8a0, 3.2); sun.position.set(-8, 10, 40); sun.target.position.set(12, 0, 12); scene.add(sun); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 }); sun.shadow.bias = -0.0008;
  for (const [x, z] of [[6, 11], [16, 11], [6, 17], [16, 17]]) {
    const l = new THREE.PointLight(0xffc880, 9, 10, 1.4); l.position.set(x, 2.9, z); scene.add(l);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 10, 1, true), std(0x8a3a1a, { side: THREE.DoubleSide })); shade.position.set(x, 3.1, z); scene.add(shade);
    const gl = makeGlow(0xffc880, 0.6, 0.6); gl.position.set(x, 2.95, z); scene.add(gl);
  }
  const kitchenL = new THREE.PointLight(0xfff0d8, 12, 12, 1.3); kitchenL.position.set(9, 3.2, 3.5); scene.add(kitchenL);
  const pantryL = new THREE.PointLight(0xffe0b0, 0, 6, 1.5); pantryL.position.set(20, 3.2, 3.5); scene.add(pantryL); // broken bulb
  // sunbeams through the front windows
  for (const x of [3, 7, 15, 20]) { const b = makeBeam(9, 1.4, 0xffe0b0, 0.07); b.position.set(x, 2.8, 23.4); b.rotation.set(0.55, Math.PI, 0); scene.add(b); }
  // ---------------- people ----------------
  const npc = (kind, fb, h, x, z, yaw) => { const c = makeCharacter(kind, fb, h); c.group.position.set(x, 0, z); c.group.rotation.y = yaw; c.baseYaw = yaw; c.phase = r() * 6; scene.add(c.group); return c; };
  const rosa = npc('rosa', { shirt: 0xe8e0d0, pants: 0x222222, skin: 0x9a6a4a, hair: 0x9a9a9a }, 1.58, 9, 5.6, 0);
  const luz = npc('luz', { shirt: 0x6a3a9a, pants: 0x1a2a4a, skin: 0x9a6a4a }, 1.32, 5.4, 11.9, -2.2);
  const chuy = npc('gus', { shirt: 0x3a5a9a, pants: 0x8a7a5a, skin: 0x8a5a3a, mustache: true }, 1.7, 19.6, 16.4, -1.6);
  const elena = npc('elena', { shirt: 0xd08a9a, pants: 0x3a4a6a, skin: 0x8a5a3a }, 1.6, 6.2, 8.75, Math.PI);
  const rafa = npc('rafa', { shirt: 0x6a3a2a, pants: 0x2e3a4e, hat: 'cap', hatColor: 0x7a2020, skin: 0x9a6644, mustache: true }, 1.74, 11, 27, Math.PI);
  rafa.group.visible = false;
  const people = [rosa, luz, chuy, elena, rafa];
  grid.rect(19, 16, 19, 16, 1, 0); grid.rect(6, 8, 6, 8, 1, 0); grid.rect(5, 11, 5, 11, 1, 0);

  // tray / tortillas carried in view
  const carry = new THREE.Group(); G.camera.add(carry); carry.position.set(0.28, -0.32, -0.62); carry.visible = false;
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.3), std(0x5a3a22)); carry.add(tray);
  for (const [x, z] of [[-0.1, 0], [0.1, 0.02]]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.02, 14), std(0xf0f0e8)); pl.position.set(x, 0.02, z); carry.add(pl); const fd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.06), std(0xc88a40)); fd.position.set(x, 0.04, z); carry.add(fd); }
  const carryTort = tortillas.clone(); carryTort.position.set(0.25, -0.3, -0.55); carryTort.visible = false; G.camera.add(carryTort);

  // ---------------- story ----------------
  let stage = 0, tl = 0, nagT = 30, newsDone = false;
  const events = []; const at = (t, fn) => events.push({ t: tl + t, fn });
  const say = (...k) => ui.say(k.map((x) => VO[x]));
  const OBJ = {
    1: 'Say hi to Luz (table by the green wall).',
    2: 'Take the plates from the kitchen window.',
    3: 'Bring the plates to table three (Don Chuy, back right).',
    4: 'Get a stack of tortillas from the pantry (kitchen, back right). It\'s dark: press F for your flashlight.',
    5: 'Bring the tortillas to Rosa (kitchen window).',
    6: 'Sit with Luz.',
    7: 'Leave with Rafa (front door).',
  };
  const setStage = (s) => { stage = s; ui.objective(OBJ[s] || ''); nagT = 35; };
  P.pos.set(11, 0, 21.6); P.yaw = 0; P.pitch = -0.05; P.flashlight = false; P.battery = 1;
  ui.clock('2:20 PM'); ui.objective('');
  audio.preloadVo(REST_VO);
  audio.chatterBed(); audio.setLoop('chatter', 0.06, 2);
  audio.sizzleBed({ x: 11, y: 1, z: 1.5 }); audio.setLoop('sizzle', 0.12, 2);
  audio.cityBed(); audio.setLoop('city', 0.12, 2);
  audio.startGuitar(null);
  game.retry = () => G.loadLevel((g) => createRestaurant(g));
  at(0.3, () => audio.doorBell({ x: 11, y: 2.6, z: 23 }));
  at(1.2, () => say('rosa1').then(() => setStage(1)));
  G.phone.reset(); G.phone.state.battery = 0.88;
  G.phone.history('Gus', [[false, 'site at 3. bring rafa'], [true, 'ok']]);
  at(20, () => G.phone.receive('Rafa', 'on my way. save me a quesadilla', 0, 0));

  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 5.4, z: 10.9, r: 1.9, label: 'Talk to Luz', enabled: () => stage === 1, action: () => {
    stage = 1.5; ui.objective('');
    say('luz1').then(() => { const dh = drawingHTML(); const src = dh.match(/src="([^"]+)"/)?.[1]; if (src) G.phone.photo(src, 'Luz\'s drawing. "Para mi papi, que construye casas."'); return ui.note('<h3>LUZ\'S DRAWING</h3>' + dh + 'Purple crayon on the back: <b>"PARA MI PAPI, QUE CONSTRUYE CASAS."</b>\n(For my dad, who builds houses.)'); }).then(() => say('m1', 'luz2', 'm2')).then(() => { at(1.0, () => say('rosa2').then(() => setStage(2))); });
  } });
  it({ x: 9, z: 8.5, r: 1.8, label: 'Take the plates', enabled: () => stage === 2, action: () => { audio.pickup(); carry.visible = true; passHeat.visible = true; setStage(3); } });
  it({ x: 18, z: 15.6, r: 2.0, label: 'Serve table three', enabled: () => stage === 3, action: () => {
    carry.visible = false; audio.pickup();
    for (const [x, z] of [[17.6, 17], [18.4, 17.2]]) { const pl = box(0.36, 0.03, 0.36, std(0xf0f0e8), x, 0.83, z); }
    stage = 3.5; ui.objective('');
    say('chuy1', 'rosa3').then(() => setStage(4));
  } });
  it({ x: 21.3, z: 4.3, r: 1.6, label: 'Take the tortillas', enabled: () => stage === 4, action: () => { audio.pickup(); tortillas.visible = false; tortGlow.visible = false; carryTort.visible = true; setStage(5); } });
  it({ x: 9, z: 8.5, r: 1.8, label: 'Give Rosa the tortillas', enabled: () => stage === 5, action: () => {
    carryTort.visible = false; audio.pickup(); stage = 5.5; ui.objective('');
    say('thanks').then(() => { at(2.0, startNews); });
  } });
  it({ x: 5.4, z: 10.9, r: 1.9, label: 'Sit with Luz', enabled: () => stage === 6, action: () => {
    stage = 6.5; ui.objective(''); P.frozen = true;
    // sit: lower the view, look at Luz
    sitT = 0; P.crouch = true;
    at(0.8, () => say('luz3', 'm4').then(() => { at(2.5, rafaArrives); }));
  } });
  it({ x: 11, z: 22.3, r: 1.8, label: 'Leave with Rafa', enabled: () => stage === 7, action: () => {
    stage = 8; ui.objective(''); P.frozen = true; audio.doorBell({ x: 11, y: 2.6, z: 23 });
    say('luz4', 'm5').then(() => game.nextChapter());
  } });
  // optional details
  it({ x: 1.9, z: 19, r: 1.6, label: 'Read the bulletin board', action: () => ui.note('<h3>KNOW YOUR RIGHTS / CONOZCA SUS DERECHOS</h3>• You have the right to remain silent.\n• Do not open the door. Ask them to slide the warrant under it. It must be signed by a judge.\n• Do not sign anything you do not understand.\n• You have the right to speak to a lawyer.\n\n<i>Pinned under it: a church flyer for English classes, a room for rent ("no fumar"), and a photo of Luz holding a soccer trophy.</i>') });
  it({ x: 1.9, z: 11.4, r: 1.7, label: 'Look at the photos', action: () => ui.note('<h3>THE PHOTO WALL</h3>Rosa and her husband Ernesto on opening day, 1998. The sign is hand-painted.\n\nErnesto with a baby Rafa on his shoulders.\n\nA newspaper clipping, 2009, yellowed: a raid at a factory on Alameda Street. Ernesto\'s name is in the list. Rosa kept the restaurant open alone.\n\nMateo, Rafa and the crew in hard hats, laughing, on a roof downtown.') });
  let jukeOn = true;
  it({ x: 1.9, z: 21, r: 1.5, label: 'Jukebox', action: () => { jukeOn = !jukeOn; audio.guitarLevel(jukeOn ? 1 : 0); audio.click(); } });
  it({ x: 21.8, z: 14, r: 2.2, label: 'Change the channel', enabled: () => tvOn && stage < 5.5, action: () => { audio.click(); } });

  let sitT = -1;
  function startNews() {
    // the room goes quiet
    tvMode = 'news'; tvM.color.setHex(0xffffff); audio.click();
    audio.guitarLevel(0.15); audio.setLoop('chatter', 0.01, 1.5);
    say('news').then(() => {
      // the truck rolls past outside
      truck.userData.go = true;
      return say('chuy3', 'chuy2', 'rosa5');
    }).then(() => { tvOn = false; tvMode = 'off'; tvM.color.setHex(0x050505); audio.click(); audio.guitarLevel(jukeOn ? 1 : 0); audio.setLoop('chatter', 0.05, 2); setStage(6); });
  }
  function rafaArrives() {
    rafa.group.visible = true; rafa.group.position.set(11, 0, 24.5); rafa.walk = [[11, 21.5], [8, 15.5], [6.6, 13.4]];
    audio.doorBell({ x: 11, y: 2.6, z: 23 });
    say('rafa1').then(() => say('rafa2', 'rosa6')).then(() => { P.frozen = false; sitT = -2; P.crouch = false; setStage(7); });
  }

  const tmpDir = new THREE.Vector3(), tmpCam = new THREE.Vector3();
  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    // fans, papel picado, dust
    fans.forEach((f) => (f.rotation.y += dt * 2.5));
    scene.children.forEach((o) => { if (o.name === 'pp') o.rotation.x = Math.sin(tl * 1.5 + o.userData.sway) * 0.15; });
    // TV
    tvTick += dt; tickerX -= dt * 40; if (tickerX < -600) tickerX = 256;
    if (tvOn && Math.floor(tvTick * 8) !== Math.floor((tvTick - dt) * 8)) drawTV(tvMode);
    // grill flicker
    grillTop.material.emissiveIntensity = 0.5 + Math.random() * 0.25;
    // people face you when you're close, idle sway
    for (const c of people) {
      if (!c.group.visible) continue;
      const g = c.group.position; let moving = false;
      if (c.walk && c.walk.length) {
        const [tx, tz] = c.walk[0]; const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
        if (d < 0.2) c.walk.shift(); else { g.x += dx / d * 1.5 * dt; g.z += dz / d * 1.5 * dt; c.group.rotation.y = Math.atan2(dx, dz); moving = true; c.phase += dt * 4.5; }
        if (!c.walk.length) c.baseYaw = c.group.rotation.y;
      } else {
        const dx = P.pos.x - g.x, dz = P.pos.z - g.z, near = Math.hypot(dx, dz) < 3.5;
        const want = near ? Math.atan2(dx, dz) : c.baseYaw; let df = want - c.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df));
        c.group.rotation.y += df * Math.min(1, dt * 3);
      }
      animateWalk(c, c.phase, moving ? 1 : 0, false);
    }
    // Rosa works the grill when not talking
    if (stage !== 1 && stage !== 5) rosa.baseYaw = Math.sin(tl * 0.3) > 0 ? Math.PI : 0;
    // the watcher notices you noticing him, gets in the van, and it pulls away
    if (watchState === 'watching') {
      const dx = wg.position.x - P.pos.x, dz = wg.position.z - P.pos.z, d = Math.hypot(dx, dz);
      tmpDir.set(dx, 1.6 - P.eye, dz).normalize();
      if ((P.pos.z > 19 && d < 14 && tmpDir.dot(G.camera.getWorldDirection(tmpCam)) > 0.93) || truck.userData.go) {
        watchState = 'leaving'; watchT = 0; truck.userData.go = false;
        audio.hit(0.25);
      }
    } else if (watchState === 'leaving') {
      watchT += dt;
      if (watchT < 1.2) wg.rotation.y += (Math.PI / 2 - wg.rotation.y) * dt * 3;
      else if (watchT < 1.5) { wg.visible = false; }
      if (watchT > 1.3 && watchT < 1.4) audio.carDoor({ x: 8, y: 1, z: 33 });
      if (watchT > 2.2) { truck.position.x += dt * Math.min(9, (watchT - 2.2) * 4); if (watchT > 2.25 && watchT < 2.3) audio.tone({ freq: 50, freqTo: 110, dur: 3, type: 'sawtooth', gain: 0.12, filter: 500, pos: { x: 8, y: 1, z: 33 } }); }
      if (truck.position.x > 80) watchState = 'gone';
    }
    // pantry: Canela jumps when you step in with the light
    if (stage === 4 && catT < 0 && P.pos.x > 17.6 && P.pos.z < 6.5) {
      catT = 0; audio.catScreech({ x: 19.2, y: 1.8, z: 1.3 }); audio.can({ x: 19.2, y: 1.8, z: 1.3 }); audio.hit(0.45); ui.shake(0.04, 0.35);
      setTimeout(() => say('m3', 'rosa4'), 700);
    }
    if (catT >= 0 && catT < 3) {
      catT += dt; const k = Math.min(1, catT / 0.5);
      cat.position.set(19.2 + k * 1.2 - Math.max(0, catT - 0.5) * 2.2, 1.83 * (1 - k) + Math.sin(k * Math.PI) * 0.5, 1.3 + k * 3.2 + Math.max(0, catT - 0.5) * 0.4);
      cat.rotation.y = 1.2; if (catT > 2.6) cat.visible = false;
    }
    // sitting with Luz
    if (sitT >= 0) { sitT += dt; P.pos.x += (6.9 - P.pos.x) * dt * 3; P.pos.z += (10.9 - P.pos.z) * dt * 3; const want = Math.atan2(-(5.4 - 6.9), -(11.9 - 10.9)); P.yaw += (want - P.yaw) * dt * 3; }
    // gentle nag if you wander
    if (stage === 2 || stage === 3 || stage === 5) { nagT -= dt; if (nagT <= 0) { nagT = 40; say('nag'); } }
  };
  L.danger = () => ({ heart: 0 });
  L.dispose = () => { audio.stopGuitar(); G.camera.remove(carry); G.camera.remove(carryTort); };
  drawTV('futbol');
  return L;
}
