// LEVEL 1 — PART B: Hammerline Depot after dark.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1791998671';
import { tex, textTex, rng } from './textures.js?v=1791998671';
import { makeHumanoid, makeCharacter, animateWalk, makeBeam, makeGlow, std } from './models.js?v=1791998671';

const VO = {
  out: { id: 'sr_out', who: 'Agent (radio)', text: 'Back door\'s locked down. He\'s inside. Nobody leaves this building.', radio: true, agent: true },
  m1: { id: 'sr_m1', who: 'Mateo', text: '(whispering) Rafa... Dios mío. Okay. Okay. Think. My phone, it\'s charging in my locker.' },
  hollis: { id: 'sr_hollis', who: 'Hollis (radio)', text: 'Hollis. Starting my sweep. Every aisle, every shelf.', radio: true, agent: true },
  dunn: { id: 'sr_dunn', who: 'Dunn (radio)', text: 'Dunn. Going dark. I\'ll hear him before he sees me.', radio: true, agent: true },
  kowal: { id: 'sr_kowal', who: 'Kowalski (radio)', text: 'Kowalski, I\'m in. Point me at him.', radio: true, agent: true },
  price: { id: 'sr_price', who: 'Price (radio)', text: 'Price. I\'ll hold the back rooms. He\'ll come to us.', radio: true, agent: true },
  spot1: { id: 'sr_spot1', who: 'Agent', text: 'Contact! I got him!', agent: true },
  spot2: { id: 'sr_spot2', who: 'Agent', text: 'There! He\'s running!', agent: true },
  hear: { id: 'sr_hear', who: 'Agent', text: 'Hold up. I heard something.', agent: true },
  lost: { id: 'sr_lost', who: 'Agent', text: 'Lost him. He\'s hiding. Check everything.', agent: true },
  clear: { id: 'sr_clear', who: 'Agent', text: 'Clear.', agent: true },
  power: { id: 'sr_power', who: 'Agent (radio)', text: 'Lights are on! Breaker room, back of the store. Move, move!', radio: true, agent: true },
  m2: { id: 'sr_m2', who: 'Mateo', text: '(whispering) Dale... you called them on us.' },
  m3: { id: 'sr_m3', who: 'Mateo', text: 'The gate. Go. Go.' },
  mcat: { id: 'sr_mcat', who: 'Mateo', text: '(breathing hard) ...just a cat. Just a cat.' },
  found: { id: 'sr_found', who: 'Agent', text: 'Don\'t move! Hands where I can see them!', agent: true },
  mdark: { id: 'sr_mdark', who: 'Mateo', text: '(whispering) No, no, no... the light.' },
};
export const STORE_VO = Object.values(VO).map((l) => l.id);

const AISLES = ['', 'LUMBER', 'PLUMBING', 'SEASONAL', 'PAINT', 'HARDWARE', 'TOOLS', 'ELECTRICAL', 'FLOORING', 'GARDEN'];
const PAL = {
  0: [0x6b6b6b, 0x8a7f6a, 0x4a5a6a], 1: [0xb89a6a, 0xa88a5a, 0xc8aa7a], 2: [0xdcdcdc, 0x3a6aa8, 0xbfc8d0], 3: [0xd8641c, 0x151515, 0x6a2a8a],
  4: [0xe0e0d8, 0x8aa0b8, 0xb04030], 5: [0x8a8a8a, 0xb02a20, 0x5a5a5a], 6: [0xd8b020, 0x1a1a1a, 0xb83020], 7: [0x2a5aa8, 0xe0e0e0, 0x777777],
  8: [0xb8a080, 0x6a4a30, 0xd0c0a0], 9: [0x3a6a3a, 0x8a6a4a, 0x2a4a2a], 10: [0x5a6a7a, 0x8a8a8a, 0x4a4a4a],
};
const STAGE_OBJ = {
  1: 'Get your phone. It\'s charging in your locker, Break Room (back left corner).',
  2: 'Get the gate key from Dale\'s desk. Manager\'s Office (back wall, next to the Break Room).',
  3: 'Find a 30-amp fuse. Aisle 7, Electrical.',
  4: 'Replace the blown fuse. Breaker Room (back wall, middle).',
  5: 'Open the garden-center gate. East wall, past the sheds. Hold E.',
  6: 'GO.',
};
const savedBattery = {};
// difficulty presets (Normal for now; Easy/Hard later)
const DIFF = { notice: 0.85 };

export function createStore(G, checkpoint = 0) {
  const { audio, ui, P, game, flash } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.075);
  const grid = new Grid(64, 46, 0, 0);
  const L = { scene, grid, interactables: [], allowFlashlight: true, surface: 'concrete', power: false, flicker: 1 };
  const r = rng(77 + checkpoint);
  let stage = Math.max(1, checkpoint);

  // battery: FNAF-style, one charge per night
  if (checkpoint === 0) { P.battery = 1; P.lens = 0; }
  else if (savedBattery[checkpoint] != null) { P.battery = savedBattery[checkpoint].b; P.lens = savedBattery[checkpoint].lens; }
  P.flashlight = false;
  const saveCp = (s) => { savedBattery[s] = { b: P.battery, lens: P.lens }; };

  // ---------------- materials ----------------
  const floorM = std(0xffffff, { map: tex('concrete', [16, 11.5]), roughness: 0.32, metalness: 0.05 });
  const wallTexM = (w, h) => std(0xc0b8ac, { map: tex('block', [Math.max(1, w / 4), Math.max(1, h / 2.5)]) });
  const orangeM = std(0xd2541c, { roughness: 0.55, metalness: 0.35 });
  const deckM = std(0xffffff, { map: tex('plywood', [1, 4]) });
  const darkM = std(0x1a1a1c);
  const metalM = std(0x5a6066, { roughness: 0.45, metalness: 0.6 });

  const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  function wall(x0, z0, x1, z1, h, opaque = true) {
    grid.rect(x0, z0, x1, z1, 1, opaque ? 1 : 0);
    const w = x1 - x0 + 1, d = z1 - z0 + 1;
    return box(w, h, d, wallTexM(Math.max(w, d), h), (x0 + x1 + 1) / 2, h / 2, (z0 + z1 + 1) / 2, false);
  }

  // ---------------- shell ----------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 46), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(32, 0, 23); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(64, 46), darkM); ceil.rotation.x = Math.PI / 2; ceil.position.set(32, 9, 23); scene.add(ceil);
  for (let x = 4; x < 64; x += 8) box(0.3, 0.5, 46, std(0x2a2a2a, { metalness: 0.4 }), x, 8.6, 23, false); // trusses
  wall(0, 0, 51, 0, 9); wall(57, 0, 63, 0, 9);
  wall(0, 45, 27, 45, 9); wall(35, 45, 63, 45, 9);
  wall(0, 1, 0, 44, 9); wall(63, 1, 63, 37, 9); wall(63, 43, 63, 44, 9);
  grid.rect(52, 0, 56, 0, 1, 1); grid.rect(28, 45, 34, 45, 1, 0); grid.rect(63, 38, 63, 42, 1, 1);
  box(5, 4.8, 0.3, wallTexM(5, 4.8), 54.5, 6.6, 0.5, false); // above dock door
  const dockDoor = box(5, 4.2, 0.12, std(0x6a6e72, { map: tex('shutter', [1, 1]), metalness: 0.5, roughness: 0.5 }), 54.5, 2.1, 0.95, false);
  box(7, 5.8, 0.3, wallTexM(7, 5.8), 31.5, 6.1, 45.5, false); // above front doors
  const glassM = new THREE.MeshStandardMaterial({ color: 0x223038, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.8 });
  box(7, 3.2, 0.08, glassM, 31.5, 1.6, 45.6, false);
  // chain on the front door handles
  const chainM = std(0x888888, { metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), chainM); t.position.set(31.1 + i * 0.09, 1.1 + Math.sin(i) * 0.02, 45.5); t.rotation.y = i % 2 ? Math.PI / 2 : 0; scene.add(t); }
  // garden gate (rolling) on east wall
  const gate = box(0.12, 4, 5, std(0x6a6e72, { map: tex('shutter', [1, 1]), metalness: 0.5 }), 63.05, 2, 40.5, false);
  box(0.3, 5, 5, wallTexM(5, 5), 63.5, 6.5, 40.5, false);
  const gateSignT = textTex(512, 128, '#1d4a2a', [{ text: 'GARDEN CENTER', size: 60, color: '#e8e4d0' }]);
  const gs = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), std(0xffffff, { map: gateSignT })); gs.position.set(62.8, 4.6, 40.5); gs.rotation.y = -Math.PI / 2; scene.add(gs);

  // ---------------- back rooms ----------------
  const BH = 3.4;
  wall(1, 9, 4, 9, BH); wall(7, 9, 16, 9, BH); wall(19, 9, 27, 9, BH); wall(30, 9, 33, 9, BH);
  wall(12, 1, 12, 8, BH); wall(23, 1, 23, 8, BH); wall(33, 1, 33, 8, BH);
  for (const x of [5.5, 17.5, 28.5]) box(2, 1, 1, wallTexM(2, 1), x + 0.5, BH - 0.5, 9.5, false);
  box(33, 0.2, 9, darkM, 17.5, BH + 0.1, 5, false);
  const roomSign = (t, x) => { const tt = textTex(256, 64, '#e8e2d2', [{ text: t, size: 30, color: '#222' }]); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), std(0xffffff, { map: tt })); m.position.set(x, 2.75, 10.02); scene.add(m); };
  roomSign('BREAK ROOM', 6); roomSign('OFFICE — D. PRUITT', 18); roomSign('ELECTRICAL', 29);

  // break room
  const lockerM = std(0x4a5a66, { metalness: 0.5, roughness: 0.5 });
  for (let x = 2; x <= 7; x++) { box(0.95, 2.1, 0.6, lockerM, x + 0.5, 1.05, 1.35); grid.rect(x, 1, x, 1); }
  const myLocker = box(0.95, 2.1, 0.05, std(0x5a6a76, { metalness: 0.5 }), 7.5, 1.05, 1.67, false);
  const phoneGlow = makeGlow(0x8fd0ff, 0.4, 0.8); phoneGlow.position.set(7.5, 1.3, 1.8); scene.add(phoneGlow);
  box(3, 0.08, 2, std(0x8a7a60), 6.5, 0.78, 6, true); grid.rect(5, 5, 7, 6, 1, 0);
  box(0.9, 1.9, 0.8, std(0x7a2020, { emissive: 0x000000 }), 11.5, 0.95, 5.5); grid.rect(11, 5, 11, 6, 1, 1);
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), std(0xa07a50)); cork.position.set(2.6, 1.6, 8.98); cork.rotation.y = Math.PI; scene.add(cork);
  for (let i = 0; i < 5; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), std(0xe8e4d8)); n.position.set(2.1 + i * 0.25, 1.6 + (i % 2) * 0.15, 8.96); n.rotation.y = Math.PI; scene.add(n); }
  // office
  box(5, 0.78, 2, std(0x3a2c22), 17.5, 0.39, 4); grid.rect(15, 3, 19, 4, 1, 0);
  const mon = box(0.7, 0.45, 0.06, std(0x111111, { emissive: 0x334455, emissiveIntensity: 0.6 }), 16.6, 1.05, 3.6);
  const keyMesh = box(0.12, 0.02, 0.06, std(0xc8a040, { metalness: 0.9, roughness: 0.2 }), 18.2, 0.8, 4.5, false);
  const keyGlow = makeGlow(0xffd27a, 0.25, 0.6); keyGlow.position.set(18.2, 0.85, 4.5); scene.add(keyGlow);
  box(1.6, 1.3, 0.6, metalM, 14.2, 0.65, 1.4); grid.rect(13, 1, 14, 1);
  // breaker room
  const panel = box(1.2, 1.6, 0.25, std(0x7a7e80, { metalness: 0.6 }), 28.5, 1.6, 1.15);
  const heater = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 10), std(0xbababa, { metalness: 0.4 })); heater.position.set(25.5, 0.9, 2.5); scene.add(heater); grid.rect(25, 2, 25, 2);
  // receiving: pallet stacks + forklift
  const wrapM = std(0xffffff, { map: tex('wrap'), roughness: 0.3 });
  const cardM = std(0xffffff, { map: tex('cardboard') });
  for (const [x0, z0, x1, z1] of [[37, 3, 38, 4], [43, 5, 44, 6], [60, 2, 61, 4], [47, 2, 48, 2]]) {
    grid.rect(x0, z0, x1, z1, 1, 1);
    box(x1 - x0 + 0.8, 0.15, z1 - z0 + 0.8, std(0x7a5a3a), (x0 + x1 + 1) / 2, 0.08, (z0 + z1 + 1) / 2);
    box(x1 - x0 + 0.7, 2.4, z1 - z0 + 0.7, r() < 0.5 ? wrapM : cardM, (x0 + x1 + 1) / 2, 1.35, (z0 + z1 + 1) / 2);
  }
  box(1.2, 1.2, 2.2, std(0x6a6a2a), 50.6, 0.8, 6.1); box(1.1, 2.2, 0.1, metalM, 50.6, 1.3, 7.3); grid.rect(50, 5, 51, 7, 1, 0);

  // ---------------- racks + products ----------------
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const orangeI = [], deckI = [], prodI = [], canI = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const pushM = (arr, x, y, z, sx, sy, sz, col) => { m4.compose(v.set(x, y, z), q, s3.set(sx, sy, sz)); arr.push([m4.clone(), col]); };
  const LEVELS = [0.12, 1.5, 2.9, 4.3];
  for (let ri = 0; ri < 10; ri++) {
    const x0 = 4 + 6 * ri;
    for (const [z0, z1] of [[13, 22], [25, 34]]) {
      grid.rect(x0, z0, x0 + 1, z1, 1, 1);
      const zl = z1 - z0 + 1, zc = (z0 + z1 + 1) / 2;
      for (const zz of [z0 + 0.05, zc, z1 + 0.95]) for (const xx of [x0 + 0.05, x0 + 1.95]) pushM(orangeI, xx, 2.85, zz, 0.1, 5.7, 0.1);
      for (const y of LEVELS) {
        for (const xx of [x0 + 0.05, x0 + 1.95]) pushM(orangeI, xx, y + 0.06, zc, 0.08, 0.12, zl);
        pushM(deckI, x0 + 1, y, zc, 2, 0.05, zl);
        for (const half of [0, 1]) {
          const aisle = half === 0 ? ri : ri + 1;
          const pal = PAL[aisle] || PAL[0];
          let zc2 = z0 + 0.1;
          while (zc2 < z1 + 0.8) {
            const w = 0.35 + r() * 0.75; if (zc2 + w > z1 + 0.95) break;
            const hgt = 0.25 + r() * (y > 4 ? 0.9 : 1.1), dep = 0.6 + r() * 0.35;
            const xx = x0 + (half === 0 ? 0.5 : 1.5);
            const col = new THREE.Color(pal[(r() * pal.length) | 0]).multiplyScalar(0.7 + r() * 0.4);
            if (aisle === 4 && y < 4) { // paint cans
              for (let k = 0; k < 3; k++) pushM(canI, xx + (k - 1) * 0.28, y + 0.2, zc2 + w / 2, 0.24, 0.36, 0.24, col);
            } else if (r() < 0.9) pushM(prodI, xx, y + 0.03 + hgt / 2, zc2 + w / 2, dep, hgt, w, col);
            zc2 += w + 0.04;
          }
        }
      }
    }
  }
  const inst = (arr, geo, mat, cast) => {
    const im = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach(([m, c], i) => { im.setMatrixAt(i, m); if (c) im.setColorAt(i, c); });
    im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
  };
  inst(orangeI, unitBox, orangeM, true); inst(deckI, unitBox, deckM, true);
  inst(prodI, unitBox, std(0xffffff, { map: tex('label'), roughness: 0.7 }), true);
  inst(canI, new THREE.CylinderGeometry(0.5, 0.5, 1, 10), std(0xffffff, { metalness: 0.6, roughness: 0.4 }), true);
  // aisle signs
  for (let a = 1; a <= 9; a++) {
    const t = textTex(512, 160, '#d2541c', [{ text: String(a), size: 110, color: '#fff', x: 70 }, { text: AISLES[a], size: 62, color: '#fff', x: 300 }]);
    const sm = std(0xffffff, { map: t });
    for (const rot of [0, Math.PI]) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), sm); sg.position.set(6 * a + 2, 6.8, 23.5); sg.rotation.y = rot; scene.add(sg); }
  }
  // fluorescent fixtures
  const fixM = std(0x222222, { emissive: 0xe8f0ff, emissiveIntensity: 0 });
  for (let a = 1; a <= 9; a++) for (const z of [17.5, 29.5]) box(0.35, 0.1, 9, fixM, 6 * a + 2, 8.3, z, false);
  // store banner
  const banT = textTex(1024, 160, '#d2541c', [{ text: 'HAMMERLINE DEPOT  ·  BUILD MORE. SPEND LESS.', size: 66, color: '#fff' }]);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), std(0xffffff, { map: banT })); ban.position.set(31.5, 6.5, 44.8); ban.rotation.y = Math.PI; scene.add(ban);

  // front: checkouts, sheds, carts, porta-john
  for (const x of [8, 14, 20, 26, 38, 44]) {
    grid.rect(x, 39, x, 41, 1, 0);
    box(0.9, 1.0, 3, std(0x3a3e42), x + 0.5, 0.5, 40.5); box(0.4, 0.35, 0.3, std(0x111111), x + 0.5, 1.2, 39.5);
  }
  const shedM = std(0xffffff, { map: tex('plywood', [2, 1]) });
  const sheds = [];
  for (const x0 of [47, 52, 57]) {
    grid.rect(x0, 40, x0 + 2, 42, 1, 1);
    box(3, 2.6, 3, shedM, x0 + 1.5, 1.3, 41.5);
    const roof1 = box(3.3, 0.1, 1.9, std(0x3a2a20), x0 + 1.5, 3.0, 40.85); roof1.rotation.x = -0.45;
    const roof2 = box(3.3, 0.1, 1.9, std(0x3a2a20), x0 + 1.5, 3.0, 42.15); roof2.rotation.x = 0.45;
    box(1.1, 2.0, 0.05, std(0x5a4030), x0 + 1.5, 1.0, 39.98, false);
    const pt = textTex(256, 128, '#ffffff', [{ text: '$1,899', size: 56, color: '#c02a1a', y: 50 }, { text: '8x8 STORAGE SHED', size: 22, color: '#222', y: 100 }]);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), std(0xffffff, { map: pt })); pm.position.set(x0 + 0.4, 1.6, 39.97); pm.rotation.y = Math.PI; scene.add(pm);
    sheds.push(x0);
  }
  box(1.1, 2.3, 1.1, std(0x2a4a8a, { roughness: 0.5 }), 61.5, 1.15, 26.5); grid.rect(61, 26, 61, 26, 1, 1);
  const cartM = std(0x8a8e90, { metalness: 0.8, roughness: 0.3, wireframe: true });
  const carts = [];
  for (let i = 0; i < 4; i++) { const c = box(0.6, 0.9, 1.0, cartM, 24.5, 0.7, 42.5 + i * 0.25, false); carts.push(c); }
  const rogueCart = box(0.6, 0.9, 1.0, cartM, 12, 0.7, 37, false);
  // cabinets used as extra hiding spots
  box(1, 2.3, 0.8, metalM, 46.5, 1.15, 1.4); grid.rect(46, 1, 46, 1);
  box(0.8, 2.3, 1, metalM, 1.4, 1.15, 40.5); grid.rect(1, 40, 1, 40);

  // 12-foot skeleton (seasonal aisle)
  const skel = new THREE.Group(); const boneM = std(0xd8d2c0, { roughness: 0.6 });
  const bone = (w, h, d, x, y, z, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boneM); b.position.set(x, y, z); b.rotation.z = rz; b.castShadow = true; skel.add(b); return b; };
  bone(0.12, 1.8, 0.12, -0.2, 0.9, 0); bone(0.12, 1.8, 0.12, 0.2, 0.9, 0);
  bone(0.12, 1.6, 0.12, -0.2, 2.6, 0); bone(0.12, 1.6, 0.12, 0.2, 2.6, 0);
  bone(0.6, 0.2, 0.25, 0, 3.5, 0); bone(0.1, 1.6, 0.1, 0, 4.3, -0.05);
  for (let i = 0; i < 5; i++) bone(0.9 - i * 0.08, 0.06, 0.4, 0, 3.9 + i * 0.22, 0.05);
  bone(1.2, 0.14, 0.2, 0, 5.1, 0);
  bone(0.1, 1.3, 0.1, -0.7, 4.4, 0, 0.15); bone(0.1, 1.3, 0.1, 0.7, 4.4, 0, -0.15);
  bone(0.08, 1.2, 0.08, -0.85, 3.2, 0.2, 0.1); bone(0.08, 1.2, 0.08, 0.85, 3.2, 0.2, -0.1);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), boneM); skull.scale.set(1, 1.15, 1); skull.position.set(0, 5.65, 0); skel.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), boneM); jaw.position.set(0, 5.32, 0.12); skel.add(jaw);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x110500 });
  const eyes = [-0.13, 0.13].map((x) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.02), eyeM); e.position.set(x, 5.7, 0.33); skel.add(e); return e; });
  skel.position.set(20.5, 0, 29.5); skel.rotation.y = -Math.PI / 2 + 0.3; scene.add(skel); grid.rect(20, 29, 20, 29, 1, 0);
  const skelLight = new THREE.PointLight(0xff5a10, 0, 7, 1.5); skelLight.position.set(20.3, 5.6, 29.5); scene.add(skelLight);

  // black cat for a false scare (receiving → floor)
  const cat = new THREE.Group(); const catM = std(0x050505, { roughness: 0.4 });
  const cbx = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), catM); m.position.set(x, y, z); cat.add(m); };
  cbx(0.18, 0.18, 0.45, 0, 0.22, 0); cbx(0.14, 0.13, 0.14, 0, 0.32, 0.27); cbx(0.04, 0.04, 0.35, 0, 0.35, -0.33);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xd8f070 })); e.position.set(sx * 0.035, 0.34, 0.345); cat.add(e); }
  cat.position.set(38, 2.6, 3.5); scene.add(cat);

  // ---------------- lights ----------------
  const hemi = new THREE.HemisphereLight(0x5a6a80, 0x100a08, 0.12); scene.add(hemi);
  const overhead = [[16, 18], [48, 18], [16, 31], [48, 31]].map(([x, z]) => { const l = new THREE.PointLight(0xe8f0ff, 0, 45, 1); l.position.set(x, 8, z); scene.add(l); return l; });
  const EM = [[6, 3.0, 10.4], [28.5, 3.0, 10.4], [54.5, 4.6, 1.5], [31.5, 4.6, 44.2], [61.6, 4.4, 40.5], [32, 6.5, 23.5]];
  const emerg = EM.map(([x, y, z]) => {
    const l = new THREE.PointLight(0xff3a22, 2.6, 13, 1.5); l.position.set(x, y, z); scene.add(l);
    const gl = makeGlow(0xff4030, 0.9, 0.9); gl.position.set(x, y, z); scene.add(gl);
    return { l, gl, base: 2.6, f: 1, x, z };
  });
  const police = [0xff1010, 0x1030ff].map((c, i) => { const l = new THREE.PointLight(c, 0, 20, 1.3); l.position.set(29 + i * 5, 2.5, 47); scene.add(l); return l; });
  // overnight security lights: a few dim fixtures stay on even in the blackout (battery backup), some flicker
  const nightLights = [[8, 23.5, 0], [26, 17, 1], [44, 29, 0], [56, 23.5, 1], [20, 38, 0], [44, 39, 0], [40, 6, 1]].map(([x, z, flick]) => {
    const l = new THREE.PointLight(0xcfe0e8, 7, 16, 1.4); l.position.set(x, 7.6, z); scene.add(l);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 2.2), new THREE.MeshBasicMaterial({ color: 0xdfeef0 })); tube.position.set(x, 8.2, z); scene.add(tube);
    return { l, tube, base: 7, flick, f: 1 };
  });
  const AL = [0, 1, 2, 3].map(() => { const s = new THREE.SpotLight(0xdde8ff, 0, 22, 0.34, 0.5, 1.1); s.position.set(0, -50, 0); s.castShadow = true; s.shadow.mapSize.set(512, 512); s.shadow.camera.near = 0.4; s.shadow.camera.far = 24; s.shadow.bias = -0.001; scene.add(s); scene.add(s.target); return s; });

  function setPower(on) {
    L.power = on;
    overhead.forEach((l) => (l.intensity = on ? 60 : 0));
    nightLights.forEach((n) => { n.l.intensity = on ? 0 : n.base; });
    hemi.intensity = on ? 0.55 : 0.12;
    fixM.emissiveIntensity = on ? 2.2 : 0;
    scene.fog.density = on ? 0.025 : 0.075;
    emerg.forEach((e) => (e.base = on ? 0.5 : 2.6));
    if (on) { audio.buzzBed(); audio.setLoop('buzz', 0.05, 0.3); }
  }

  // ---------------- hiding spots ----------------
  const spots = [
    { kind: 'locker', ex: 10.5, ez: 2.6, ix: 10.5, iz: 1.4, yaw: Math.PI, cell: [10, 1] },
    { kind: 'locker', ex: 21.9, ez: 2.6, ix: 21.9, iz: 1.4, yaw: Math.PI, cell: [21, 1, 22, 1] },
    { kind: 'locker', ex: 46.5, ez: 2.5, ix: 46.5, iz: 1.4, yaw: Math.PI, cell: [46, 1] },
    { kind: 'locker', ex: 2.5, ez: 40.5, ix: 1.4, iz: 40.5, yaw: -Math.PI / 2, cell: [1, 40] },
    { kind: 'john', ex: 60.2, ez: 26.5, ix: 61.5, iz: 26.5, yaw: Math.PI / 2, cell: [61, 26] },
    ...sheds.map((x0) => ({ kind: 'shed', ex: x0 + 1.5, ez: 39.3, ix: x0 + 1.5, iz: 41.3, yaw: 0, cell: [x0, 40] })),
  ];
  box(1, 2.3, 0.7, metalM, 10.5, 1.15, 1.4); grid.rect(10, 1, 10, 1);
  box(2, 2.4, 0.8, std(0x4a3a2a), 22, 1.2, 1.4); grid.rect(21, 1, 22, 1);
  for (const sp of spots) {
    sp.pos = { x: sp.ex, y: 1.2, z: sp.ez }; sp.agentNear = false;
    L.interactables.push({ x: sp.ex, z: sp.ez, r: 1.4, label: sp.kind === 'shed' ? 'Hide in the shed' : sp.kind === 'john' ? 'Hide in the porta-john' : 'Hide in the cabinet', action: () => game.hide(sp) });
  }

  // ---------------- agents ----------------
  const DEFS = [
    { name: 'Hollis', role: 'sweeper', speed: 1.5, chase: 4.3, vision: 10, hear: 1.0, skin: 0x9a7a62, intro: 'hollis' },
    { name: 'Dunn', role: 'listener', speed: 1.9, chase: 4.4, vision: 7, hear: 1.6, skin: 0x5a3a2a, intro: 'dunn' },
    { name: 'Kowalski', role: 'hunter', speed: 2.3, chase: 4.8, vision: 8.5, hear: 1.2, skin: 0xa88a72, intro: 'kowal' },
    { name: 'Price', role: 'gatekeeper', speed: 1.8, chase: 4.4, vision: 8.5, hear: 1.1, skin: 0x8a6a52, intro: 'price' },
  ];
  // sweep route: snake through aisles 1..9
  const sweepRoute = [];
  for (let a = 1; a <= 9; a++) { const x = 6 * a + 2; if (a % 2) sweepRoute.push([x, 11.5], [x, 23.5], [x, 35.5]); else sweepRoute.push([x, 35.5], [x, 23.5], [x, 11.5]); }
  sweepRoute.push([55, 38], [30, 38], [8, 37]);
  const listenPosts = [[8, 23.5], [20, 23.5], [32, 23.5], [44, 23.5], [56, 23.5], [20, 11], [44, 11], [32, 37.5], [50, 37.5], [40, 7]];
  const gatePosts = {
    1: [[6, 11], [17.5, 11], [9, 6], [3, 12]], 2: [[17.5, 11], [18, 6.5], [28.5, 11], [12, 12]],
    3: [[44, 11], [44, 23.5], [44, 36], [38, 30]], 4: [[28.5, 11], [28.5, 6], [22, 12], [36, 11]],
    5: [[56, 37.5], [60.5, 34], [52, 38.5], [61, 38.5]], 6: [[61, 38.5]],
  };
  const wander = []; for (let a = 1; a <= 9; a++) for (const z of [11.5, 23.5, 35.5]) wander.push([6 * a + 2, z]);
  wander.push([40, 7], [55, 6], [20, 42], [45, 42], [6, 6], [18, 6], [28.5, 5]);

  const tmpV = new THREE.Vector3();
  const agents = DEFS.map((def, i) => {
    const h = makeCharacter('agent', { agent: true, flashlight: true, hat: 'cap', gloves: true, skin: def.skin }, 1.85);
    h.group.visible = false; scene.add(h.group);
    const beam = makeBeam(10, 2.0, 0xe6eeff, 0.13); h.group.add(beam); beam.position.set(0.3, 1.45, 0.4); beam.rotation.x = 0.1;
    return { def, h, g: h.group, sl: AL[i], beam, active: false, state: 'idle', path: null, pi: 0, dest: null, repath: 0, speed: 0, phase: 0, stepAcc: 0, wait: 0, look: 0, baseH: 0, aware: 0, lastKnown: null, lost: 0, sawHide: null, inspect: null, inspT: 0, found: 0, routeI: 0, lightOff: false, listenT: 0, radioCD: 0, barkCD: 0, idx: i };
  });
  function spawn(a, x, z) {
    a.active = true; a.g.visible = true; a.g.position.set(x, 0, z); a.state = 'patrol'; a.path = null; a.dest = null; a.aware = 0; a.wait = 0;
    a.routeI = 0;
    // sweeper starts with the nearest point on his route
    if (a.def.role === 'sweeper') { let bd = 1e9; sweepRoute.forEach((p, k) => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; a.routeI = k; } }); }
  }
  // agents always enter through the entry point farthest from the player
  const ENTRIES = [[31.5, 43.5], [45, 7], [58, 36], [6, 42], [3, 12], [40, 23.5]];
  function spawnFar(a) {
    let best = ENTRIES[0], bd = -1;
    for (const e of ENTRIES) { const d = Math.hypot(e[0] - P.pos.x, e[1] - P.pos.z); if (d > bd && !agents.some((o) => o.active && Math.hypot(o.g.position.x - e[0], o.g.position.z - e[1]) < 4)) { bd = d; best = e; } }
    spawn(a, best[0], best[1]);
  }
  function goTo(a, x, z) { a.dest = [x, z]; a.path = grid.path(a.g.position.x, a.g.position.z, x, z) || []; a.pi = 0; }
  function stepPath(a, speed, dt) {
    const p = a.path && a.path[a.pi];
    if (!p) { a.speed = 0; return true; }
    const g = a.g.position, dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { a.pi++; return a.pi >= a.path.length; }
    const st = Math.min(d, speed * dt); g.x += dx / d * st; g.z += dz / d * st;
    turnTo(a, Math.atan2(dx, dz), dt * 7); a.speed = speed; return false;
  }
  function turnTo(a, want, k) { let diff = want - a.g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); a.g.rotation.y += diff * Math.min(1, k); }
  function canSee(a, ignoreHidden = false) {
    if (!a.active || (P.hidden && !ignoreHidden)) return false;
    const g = a.g.position, dx = P.pos.x - g.x, dz = P.pos.z - g.z, d = Math.hypot(dx, dz) || 0.01;
    const playerLight = flash.intensity > 0;
    if (playerLight && d < 24) { // our beam pointed at them gives us away
      const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
      if ((-dx * fx - dz * fz) / d > 0.86 && grid.los(g.x, g.z, P.pos.x, P.pos.z)) return true;
    }
    let range = L.power ? 17 : a.def.vision;
    if (playerLight) range *= 1.35;
    if (P.crouch) range *= 0.65;
    if (a.lightOff) range *= 0.55;
    if (d > range) return false;
    const h = a.g.rotation.y, dot = (dx * Math.sin(h) + dz * Math.cos(h)) / d;
    if (d > 1.6 && dot < 0.76) return false;
    return grid.los(g.x, g.z, P.pos.x, P.pos.z);
  }
  function radio(l, a, delay = 0) { setTimeout(() => { audio.radio(a ? a.g.position : null, 0.7); ui.bark(l); }, delay * 1000); }
  function bark(a, key) { if (a.barkCD > 0) return; a.barkCD = 4; ui.bark({ ...VO[key], who: a.def.name, pos: { x: a.g.position.x, y: 1.6, z: a.g.position.z } }); }
  function startChase(a) {
    if (a.state === 'chase') return;
    const fresh = !agents.some((o) => o.state === 'chase');
    a.state = 'chase'; a.aware = 1; a.lightOff = false; a.lost = 0; a.repath = 0;
    a.lastKnown = [P.pos.x, P.pos.z];
    bark(a, Math.random() < 0.5 ? 'spot1' : 'spot2');
    if (fresh) { audio.stinger(0.55); ui.shake(0.02, 0.3); }
    // radio the others: they converge on the area
    for (const o of agents) if (o !== a && o.active && o.state !== 'chase' && o.state !== 'inspect') {
      const d = Math.hypot(o.g.position.x - P.pos.x, o.g.position.z - P.pos.z);
      if (d < 38) { o.state = 'investigate'; o.lightOff = false; goTo(o, P.pos.x + (r() - 0.5) * 6, P.pos.z + (r() - 0.5) * 6); o.invSpeed = 3.1; o.wait = 0; }
    }
  }
  function nearestHiddenSpotTo(x, z, maxD) {
    if (!P.hidden) return null;
    return Math.hypot(P.hidden.ex - x, P.hidden.ez - z) < maxD ? P.hidden : null;
  }
  function beginInspect(a, spot) { a.state = 'inspect'; a.inspect = spot; a.inspT = 0; a.found = 0; goTo(a, spot.ex, spot.ez); a.lightOff = false; }
  function patrolNext(a) {
    const role = a.def.role;
    if (role === 'sweeper') { a.routeI = (a.routeI + 1) % sweepRoute.length; const p = sweepRoute[a.routeI]; goTo(a, p[0], p[1]); a.wait = 0; }
    else if (role === 'listener') { const p = listenPosts[(r() * listenPosts.length) | 0]; goTo(a, p[0], p[1]); a.wait = 0; a.listenNext = true; }
    else if (role === 'hunter') {
      const t = director.hunterTarget || wander[(r() * wander.length) | 0]; director.hunterTarget = null;
      goTo(a, t[0], t[1]); a.wait = 0;
    } else { const posts = gatePosts[stage] || gatePosts[1]; const p = posts[(r() * posts.length) | 0]; goTo(a, p[0], p[1]); a.wait = 0; }
  }

  // AI director (Alien: Isolation style): knows your general area, manages pacing
  const director = { calm: 0, stress: 0, hunterTarget: null, inspectCD: 12 };
  function updateDirector(dt) {
    let dn = 99, chasing = false;
    for (const a of agents) if (a.active) { dn = Math.min(dn, Math.hypot(a.g.position.x - P.pos.x, a.g.position.z - P.pos.z)); if (a.state === 'chase') chasing = true; }
    if (chasing || dn < 10) { director.stress += dt * (chasing ? 2 : 1); director.calm = 0; } else director.calm += dt;
    if (director.calm > 26) {
      director.calm = 0;
      director.hunterTarget = [P.pos.x + (r() - 0.5) * 12, P.pos.z + (r() - 0.5) * 12];
      // build-up: the nearest emergency light stutters, a radio crackles somewhere close
      let be = null, bd = 1e9; for (const e of emerg) { const d = Math.hypot(e.x - P.pos.x, e.z - P.pos.z); if (d < bd) { bd = d; be = e; } }
      if (be) be.stutter = 2.5;
      audio.radio({ x: P.pos.x + (r() - 0.5) * 16, y: 1.5, z: P.pos.z + (r() - 0.5) * 16 }, 0.5);
      const hunter = agents[2]; if (hunter.active && hunter.state === 'patrol') { hunter.wait = 0; goTo(hunter, director.hunterTarget[0], director.hunterTarget[1]); }
    }
    if (director.stress > 30 && !chasing) { // give the player room to breathe
      director.stress = 0;
      const hunter = agents[2];
      if (hunter.active && hunter.state === 'patrol') { const far = wander.reduce((b, p) => (Math.hypot(p[0] - P.pos.x, p[1] - P.pos.z) > Math.hypot(b[0] - P.pos.x, b[1] - P.pos.z) ? p : b)); goTo(hunter, far[0], far[1]); }
    }
    // gatekeeper checks hiding spots near his post
    director.inspectCD -= dt;
    const gk = agents[3];
    if (gk.active && gk.state === 'patrol' && director.inspectCD <= 0) {
      director.inspectCD = 18 + r() * 10;
      const sp = nearestHiddenSpotTo(gk.g.position.x, gk.g.position.z, 10);
      if (sp && r() < 0.6) beginInspect(gk, sp);
    }
  }

  function updateAgent(a, dt) {
    const g = a.g.position;
    a.barkCD -= dt; a.radioCD -= dt;
    const see = canSee(a);
    const dP = Math.hypot(P.pos.x - g.x, P.pos.z - g.z);
    if (see && a.state !== 'chase') {
      const rate = DIFF.notice / (0.35 + dP * 0.12) * (P.crouch ? 0.6 : 1) * (flash.intensity > 0 ? 1.5 : 1) * (L.power ? 1.6 : 1);
      a.aware += rate * dt;
      if (a.aware >= 1) startChase(a);
      else if (a.aware > 0.6 && (a.state === 'patrol' || a.state === 'listen')) { a.state = 'investigate'; a.invSpeed = 2.2; a.lightOff = false; goTo(a, P.pos.x, P.pos.z); bark(a, 'hear'); }
    } else if (a.state !== 'chase') a.aware = Math.max(0, a.aware - dt * 0.2);
    if (dP < 1.3 && !P.hidden && a.state !== 'chase') startChase(a); // bumped into him

    switch (a.state) {
      case 'patrol': {
        if (a.wait > 0) { a.wait -= dt; a.speed = 0; a.look += dt; a.g.rotation.y = a.baseH + Math.sin(a.look * 1.3) * 1.0; if (a.wait <= 0) patrolNext(a); break; }
        if (!a.path) { patrolNext(a); break; }
        if (stepPath(a, a.def.speed, dt)) {
          a.path = null; a.baseH = a.g.rotation.y; a.look = 0;
          if (a.def.role === 'listener' && a.listenNext) { a.state = 'listen'; a.listenT = 14 + r() * 9; a.lightOff = true; a.listenNext = false; }
          else a.wait = a.def.role === 'sweeper' ? 1.5 : 2 + r() * 2.5;
        }
        break;
      }
      case 'listen': { // Dunn: dark, still, listening
        a.speed = 0; a.look += dt; a.g.rotation.y = a.baseH + Math.sin(a.look * 0.4) * 1.4;
        a.listenT -= dt;
        if (a.radioCD <= 0 && r() < dt * 0.08) { a.radioCD = 8; audio.radio({ x: g.x, y: 1.5, z: g.z }, 0.35); } // fair telegraph
        if (a.listenT <= 0) { a.lightOff = false; a.state = 'patrol'; patrolNext(a); }
        break;
      }
      case 'investigate': {
        if (a.wait > 0) { a.wait -= dt; a.speed = 0; a.look += dt; a.g.rotation.y = a.baseH + Math.sin(a.look * 1.6) * 1.2; if (a.wait <= 0) { a.state = 'patrol'; patrolNext(a); } break; }
        if (!a.path || stepPath(a, a.invSpeed || 2.4, dt)) {
          a.baseH = a.g.rotation.y; a.look = 0; a.path = [];
          const sp = nearestHiddenSpotTo(g.x, g.z, 6);
          if (sp && r() < 0.35) beginInspect(a, sp); else a.wait = 4;
        }
        break;
      }
      case 'chase': {
        a.repath -= dt;
        if (see) { a.lastKnown = [P.pos.x, P.pos.z]; a.lost = 0; }
        else a.lost += dt;
        if (a.repath <= 0) { a.repath = 0.35; goTo(a, a.lastKnown[0], a.lastKnown[1]); }
        const sp = a.def.chase * (L.power ? 1.06 : 1);
        const done = stepPath(a, sp, dt);
        if (!P.hidden && dP < 0.95) { game.caught(a.h); return; }
        if ((done && !see) || a.lost > 7) {
          // lost him
          bark(a, 'lost'); a.aware = 0.3;
          if (P.hidden && (a.sawHide === P.hidden || Math.hypot(P.hidden.ex - g.x, P.hidden.ez - g.z) < 7) && (a.sawHide === P.hidden || r() < 0.55)) beginInspect(a, P.hidden);
          else { a.state = 'investigate'; a.wait = 5; a.baseH = a.g.rotation.y; a.look = 0; }
        }
        break;
      }
      case 'inspect': {
        const sp = a.inspect;
        if (a.path && a.path.length && !stepPath(a, a.sawHide === sp ? 3.5 : 2.2, dt)) break;
        a.path = []; a.speed = 0;
        turnTo(a, Math.atan2(sp.ix - g.x, sp.iz - g.z), dt * 6);
        a.inspT += dt; sp.agentNear = true;
        if (P.hidden === sp) {
          if (a.sawHide === sp && a.inspT > 0.8) { audio.creak(sp.pos); sp.agentNear = false; game.caught(a.h); return; }
          if (!P.holdingBreath && a.inspT > 0.6) a.found += dt;
          if (a.found > 1.1) { audio.creak(sp.pos); sp.agentNear = false; game.caught(a.h); return; }
        }
        if (a.inspT > 4) { sp.agentNear = false; a.sawHide = null; bark(a, 'clear'); a.state = 'patrol'; a.wait = 1; a.baseH = a.g.rotation.y; }
        break;
      }
    }
    // animation + footsteps
    if (a.speed > 0) {
      a.phase += a.speed * dt * 3; animateWalk(a.h, a.phase, Math.min(1, a.speed / 2.5), true);
      a.stepAcc += a.speed * dt;
      if (a.stepAcc > (a.speed > 3 ? 0.95 : 0.75)) { a.stepAcc = 0; if (dP < 30) audio.boot({ x: g.x, y: 0.2, z: g.z }, a.speed > 3 ? 0.6 : 0.4); }
    } else animateWalk(a.h, a.phase, 0, !a.lightOff);
    // flashlight
    const ry = a.g.rotation.y;
    const on = !a.lightOff;
    a.sl.intensity = on ? 28 : 0; a.beam.visible = on;
    a.sl.position.set(g.x + Math.sin(ry) * 0.4 + Math.cos(ry) * 0.3, 1.45, g.z + Math.cos(ry) * 0.4 - Math.sin(ry) * 0.3);
    const sway = Math.sin(performance.now() * 0.0013 + a.idx) * 0.15;
    a.sl.target.position.set(g.x + Math.sin(ry + sway) * 9, 0.3, g.z + Math.cos(ry + sway) * 9);
    a.beam.rotation.y = sway;
    let bl = 0.5; const bx = Math.sin(ry + sway), bz = Math.cos(ry + sway);
    while (bl < 10 && !grid.opaqueC(grid.cx(g.x + bx * bl), grid.cz(g.z + bz * bl))) bl += 0.25;
    a.beam.scale.setScalar(Math.max(0.15, bl / 10));
  }

  // ---------------- noise ----------------
  L.onNoise = (radius, x, z, kind) => {
    if (radius <= 0) return;
    for (const a of agents) {
      if (!a.active || a.state === 'chase' || a.state === 'inspect') continue;
      const mul = a.def.hear * (a.state === 'listen' ? 2.2 : 1);
      const d = Math.hypot(a.g.position.x - x, a.g.position.z - z);
      if (d < radius * mul) {
        const wasIdle = a.state !== 'investigate';
        a.state = 'investigate'; a.lightOff = false; a.invSpeed = a.def.role === 'listener' ? 3.4 : 2.5; a.wait = 0;
        goTo(a, x + (r() - 0.5) * 2, z + (r() - 0.5) * 2);
        if (wasIdle && kind !== 'loud') bark(a, 'hear');
      }
    }
  };
  L.onHide = (spot) => {
    for (const a of agents) if (canSee(a, true) || (a.state === 'chase' && Math.hypot(a.g.position.x - P.pos.x, a.g.position.z - P.pos.z) < 6 && grid.los(a.g.position.x, a.g.position.z, spot.ex, spot.ez))) { a.sawHide = spot; a.lastKnown = [spot.ex, spot.ez]; }
  };
  L.onGasp = () => L.onNoise(7, P.pos.x, P.pos.z, 'gasp');
  L.onCaught = () => { audio.stopLoop('motor', 0.1); };

  // ---------------- story beats ----------------
  const events = []; let tl = 0;
  const at = (t, fn) => events.push({ t: tl + t, fn });
  let ghost = null, ghostT = 0, skelDone = false, catDone = false, cartDone = false, gateOpen = false, gateProg = 0, darkLine = false;
  const ambient = { t: 25 + r() * 20 };

  function breach() {
    audio.boltCut({ x: 31.5, y: 1.2, z: 45.5 }); ui.shake(0.015, 0.4);
    at(1.2, () => { audio.chains({ x: 31.5, y: 1.2, z: 45.5 }); police.forEach((l) => (l.userData.on = true)); });
    at(2.0, () => { spawn(agents[0], 30.5, 43.5); spawn(agents[1], 33, 43.2); });
    at(3.0, () => radio(VO.hollis, null));
    at(7.0, () => radio(VO.dunn, null));
  }
  function setStage(s) {
    stage = s; ui.objective(STAGE_OBJ[s]);
    saveCp(s);
    game.retry = () => G.loadLevel((g) => createStore(g, s));
  }

  // ---------------- interactables ----------------
  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 2.6, z: 8.1, label: 'Read the corkboard', action: () => ui.note('<h3>NIGHT CREW — READ THIS</h3>Cash pay is pushed to NEXT Friday. Don\'t talk to anybody about the schedule.\nDon\'t use the front entrance after 11.\n— Dale\n\n<i>(Underneath, in pen: "you said that last friday" — R.)</i>') });
  it({ x: 7.5, z: 2.4, label: 'Open your locker', enabled: () => stage === 1, action: () => {
    audio.creak({ x: 7.5, y: 1, z: 1.7 }); audio.pickup(); myLocker.rotation.y = -1.2; myLocker.position.x -= 0.4; myLocker.position.z += 0.35; phoneGlow.visible = false;
    audio.vibrate();
    ui.note('<h3>VOICEMAIL — LUZ — 9:14 PM</h3>"Papi, are you coming home soon? Mami says I can stay up until you get here. I made you a card. Don\'t look at it until Saturday, okay? Te quiero mucho."\n\n<h3>CHUY — 11:59 PM</h3>they took rafa. i saw from the bus\nthey have the front and the dock\ngarden center gate nobody is watching it. its on the electric lock, needs power\nbreaker blew last week dale never fixed it. fuse is 30 amp aisle 7\ngate key is in dales desk\ncorre carnal', 'phone').then(() => {
      setStage(2);
      // fake-out: someone in the doorway
      ghost = makeCharacter('agent', { agent: true, hat: 'cap', gloves: true }, 1.85); ghost.group.position.set(6, 0, 17); ghost.group.rotation.y = Math.PI; scene.add(ghost.group); ghostT = 0;
      at(6, () => { if (!agents[2].active) { spawnFar(agents[2]); radio(VO.kowal, null, 0.5); } });
    });
  } });
  it({ x: 18.2, z: 5.5, label: 'Take the gate key', enabled: () => stage === 2, action: () => {
    keyMesh.visible = false; keyGlow.visible = false; audio.pickup();
    audio.deskPhone({ x: 16.2, y: 0.9, z: 3.6 }); ui.shake(0.02, 0.4); audio.hit(0.6);
    L.onNoise(26, 17.5, 4, 'loud');
    mon.material.emissive.setHex(0x99aabb);
    setStage(3);
    ui.note('<h3>HAMMERLINE DEPOT #0417 — PRINTOUT ON DALE\'S DESK</h3>TIP CONFIRMATION — submitted 10/13, 4:52 PM\nLocation: Hammerline Depot #0417, loading entrance\nIndividuals: 3–4, night stocking crew (paid cash)\nNotes: crew on site after 11 PM\nSubmitted by: D. Pruitt, Store Manager\n\n<i>A sticky note on the corner: "nights payroll = $0 if nobody\'s here to collect."</i>').then(() => ui.say([VO.m2]));
  } });
  it({ x: 42.5, z: 30.5, label: 'Take the 30-amp fuse', enabled: () => stage === 3, action: () => {
    audio.pickup(); fuseMesh.visible = false; fuseGlow.visible = false; setStage(4); ui.toast('GOT THE FUSE');
    at(5, () => { if (!agents[3].active) { spawnFar(agents[3]); radio(VO.price, null, 0.4); } });
  } });
  const lensIt = it({ x: 42.5, z: 27.5, label: 'Take the LED lens kit (brighter light, drains faster)', enabled: () => !P.lens, action: () => { P.lens = 1; audio.pickup(); ui.toast('FLASHLIGHT UPGRADED: LED LENS'); lensMesh.visible = false; } });
  const fuseMesh = box(0.25, 0.08, 0.08, std(0xc8b070, { metalness: 0.6 }), 41.85, 1.62, 30.5, false);
  const fuseGlow = makeGlow(0xffe0a0, 0.3, 0.5); fuseGlow.position.set(41.9, 1.65, 30.5); scene.add(fuseGlow);
  const lensMesh = box(0.2, 0.2, 0.2, std(0x2a5aa8), 41.85, 1.62, 27.5, false);
  if (stage > 3) { fuseMesh.visible = false; fuseGlow.visible = false; }
  if (stage > 2) { keyMesh.visible = false; keyGlow.visible = false; }
  if (stage > 1) { phoneGlow.visible = false; }
  if (P.lens) lensMesh.visible = false;
  it({ x: 28.5, z: 2.4, label: 'Replace the fuse', enabled: () => stage === 4, action: () => {
    audio.clunk({ x: 28.5, y: 1.5, z: 1.2 }); stage = 4.5;
    at(0.7, () => { fixM.emissiveIntensity = 1; audio.tone({ freq: 2000, dur: 0.05, type: 'square', gain: 0.05 }); });
    at(0.8, () => { fixM.emissiveIntensity = 0; });
    at(1.1, () => { fixM.emissiveIntensity = 1.5; });
    at(1.2, () => { fixM.emissiveIntensity = 0; });
    at(1.6, () => {
      setPower(true); ui.flash(0.4); audio.hit(0.7);
      L.onNoise(200, 28.5, 4, 'loud');
      agents.forEach((a) => { if (a.active && a.state !== 'chase') { a.invSpeed = 3.3; } });
      radio(VO.power, null, 0.6);
      setStage(5); ui.say([{ ...VO.m3, wait: 2.2 }]);
    });
  } });
  it({ x: 61.6, z: 40.5, r: 2.0, label: 'Open the garden-center gate', hold: 6, enabled: () => stage === 5 && !gateOpen,
    onHold: (dt) => {
      audio.motorBed({ x: 63, y: 2, z: 40.5 }); audio.setLoop('motor', 0.35, 0.1);
      if (gateProg > 1.5) startAlarm();
      gateProg += dt; gate.position.y = 2 + (gateProg / 6) * 3.6;
      ambient.gateNoise = (ambient.gateNoise || 0) - dt; if (ambient.gateNoise <= 0) { ambient.gateNoise = 1; L.onNoise(24, 62, 40.5, 'loud'); }
    },
    onRelease: () => { audio.setLoop('motor', 0, 0.1); },
    action: () => { gateOpen = true; audio.stopLoop('motor', 0.3); audio.clunk({ x: 63, y: 2, z: 40.5 }); grid.rect(63, 38, 63, 42, 0, 0); setStage(6); audio.rainBed(); audio.setLoop('rain', 0.4, 1); },
  });

  // ---------------- initial state per checkpoint ----------------
  setPower(stage >= 5);
  const cpPos = { 1: [54.5, 2.2, Math.PI], 2: [8.5, 4, 0], 3: [18, 6.5, 0], 4: [42.5, 31, Math.PI / 2], 5: [28.5, 4, Math.PI] };
  const [sx, sz, syaw] = cpPos[stage] || cpPos[1];
  P.pos.set(sx, 0, sz); P.yaw = syaw;
  audio.droneBed(); audio.setLoop('drone', 0.55, 3);
  audio.preloadVo(STORE_VO);
  if (checkpoint === 0) {
    P.frozen = true;
    ui.objective(''); ui.clock('11:58 PM');
    at(0.6, () => { audio.slam({ x: 54.5, y: 1.5, z: -0.5 }); ui.shake(0.03, 0.4); });
    at(1.6, () => { audio.slam({ x: 54.5, y: 1.5, z: -0.5 }); });
    at(2.6, () => { audio.radio({ x: 54.5, y: 1.5, z: -1.5 }); ui.bark({ ...VO.out, pos: { x: 54.5, y: 1.5, z: -1.5 } }); });
    at(7.5, () => { ui.say([VO.m1]); });
    at(9.0, () => { P.frozen = false; setStage(1); ui.bigHint('PRESS <kbd>F</kbd> FLASHLIGHT<small>ONE BATTERY. IT HAS TO LAST ALL NIGHT. TURN IT OFF TO SAVE IT.</small>'); document.getElementById('bigHint').dataset.k = 'F'; });
    at(20, breach);
  } else {
    setStage(stage); ui.clock('12:2' + stage + ' AM');
    police.forEach((l) => (l.userData.on = true));
    spawnFar(agents[0]); spawnFar(agents[1]);
    if (stage >= 2) spawnFar(agents[2]);
    if (stage >= 4) spawnFar(agents[3]);
    if (stage >= 5) agents.forEach((a) => { if (a.active) { a.state = 'investigate'; goTo(a, 28.5, 11); a.invSpeed = 3; } });
  }

  // ---------------- cats (jumpscares) ----------------
  const catGeoM = std(0x050505, { roughness: 0.4 });
  const catEyeM = new THREE.MeshBasicMaterial({ color: 0xd8f070 });
  function makeCat() {
    const c = new THREE.Group();
    const b = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), catGeoM); m.position.set(x, y, z); c.add(m); };
    b(0.18, 0.18, 0.45, 0, 0.22, 0); b(0.14, 0.13, 0.14, 0, 0.32, 0.27); b(0.04, 0.04, 0.35, 0, 0.35, -0.33);
    b(0.04, 0.07, 0.03, -0.045, 0.41, 0.27); b(0.04, 0.07, 0.03, 0.045, 0.41, 0.27);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), catEyeM); e.position.set(sx * 0.035, 0.34, 0.345); c.add(e); }
    c.visible = false; scene.add(c); return c;
  }
  // each cat waits on a high shelf, then leaps across the aisle when you get close
  const cats = [
    { x: 31.5, z: 18, from: [29.9, 4.4, 18], to: [33.9, 0, 21] },
    { x: 49.5, z: 30, from: [52.1, 4.4, 30], to: [48.1, 0, 33] },
    { x: 13.5, z: 31, from: [15.9, 2.9, 31], to: [12.1, 0, 27] },
    { x: 20.5, z: 39, from: [20.5, 1.1, 40.5], to: [23, 0, 36] },
    { x: 8, z: 6, from: [6.5, 0.85, 6], to: [9.5, 0, 9.5] },
  ].map((c) => ({ ...c, mesh: makeCat(), t: -1, done: false }));
  cats.forEach((c) => { c.mesh.position.set(...c.from); c.mesh.visible = true; c.mesh.rotation.y = Math.atan2(c.to[0] - c.from[0], c.to[2] - c.from[2]); });
  function updateCats(dt) {
    for (const c of cats) {
      if (!c.done && c.t < 0 && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 3.2 && !P.hidden) {
        c.t = 0; audio.catScreech({ x: c.from[0], y: c.from[1], z: c.from[2] }); audio.can({ x: c.from[0], y: c.from[1], z: c.from[2] });
        audio.hit(0.55); ui.shake(0.05, 0.4); ui.flash(0.06); L.onNoise(10, c.x, c.z, 'loud');
      }
      if (c.t >= 0) {
        c.t += dt;
        const k = Math.min(1, c.t / 0.55), m = c.mesh.position;
        m.x = c.from[0] + (c.to[0] - c.from[0]) * k; m.z = c.from[2] + (c.to[2] - c.from[2]) * k;
        m.y = c.from[1] + (c.to[1] - c.from[1]) * k + Math.sin(k * Math.PI) * 0.8;
        if (k >= 1) { const run = c.t - 0.55; m.x += Math.sin(c.mesh.rotation.y) * run * 0.12; m.z += Math.cos(c.mesh.rotation.y) * run * 0.12; m.y = 0; }
        if (c.t > 2.4) { c.mesh.visible = false; c.t = -1; c.done = true; }
      }
    }
  }
  // anti-theft gates at the checkouts: walking through them sets them off
  const easM = std(0x9aa0a6, { metalness: 0.4, roughness: 0.4 });
  const eas = [];
  for (const x of [11, 17, 23, 35, 41]) {
    for (const dx of [-0.9, 0.9]) { const p = box(0.12, 1.6, 0.5, easM, x + 0.5 + dx, 0.8, 42.6, false); }
    eas.push({ x: x + 0.5, z: 42.6, cd: 0 });
  }
  let alarmOn = false, alarmT = 0;
  const strobes = [[31.5, 7, 43], [61, 6, 38], [54.5, 6, 2], [20, 7, 23.5]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffffff, 0, 30, 1.2); l.position.set(x, y, z); scene.add(l); return l; });
  function startAlarm() { if (alarmOn) return; alarmOn = true; audio.alarmBed(); audio.setLoop('alarm', 0.12, 0.2); L.onNoise(200, 62, 40.5, 'loud'); }

  // ---------------- update ----------------
  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    // police lights outside the glass
    const pt = performance.now() * 0.001;
    police.forEach((l, i) => { l.intensity = l.userData.on ? (Math.sin(pt * 7 + i * Math.PI) > 0.2 ? 9 : 0) : 0; });
    // emergency lights: flicker, stutter harder when an agent is close (telegraph)
    for (const e of emerg) {
      let near = 0; for (const a of agents) if (a.active) near = Math.max(near, 1 - Math.hypot(a.g.position.x - e.x, a.g.position.z - e.z) / 9);
      e.stutter = Math.max(0, (e.stutter || 0) - dt);
      const chance = 0.02 + near * 0.35 + (e.stutter > 0 ? 0.5 : 0);
      e.f = Math.random() < chance ? Math.random() * 0.3 : Math.min(1, e.f + dt * 6);
      e.l.intensity = e.base * e.f; e.gl.material.opacity = 0.9 * e.f * (e.base > 1 ? 1 : 0.3);
    }
    if (L.power && Math.random() < dt * 0.4) { fixM.emissiveIntensity = 0.3; setTimeout(() => { if (L.power) fixM.emissiveIntensity = 2.2; }, 80); }
    // player flashlight gets jumpy when agents are near
    let dn = 99; for (const a of agents) if (a.active) dn = Math.min(dn, Math.hypot(a.g.position.x - P.pos.x, a.g.position.z - P.pos.z));
    L.flicker = dn < 6 && Math.random() < 0.08 ? 0.35 : 1;
    if (P.battery <= 0 && !darkLine) { darkLine = true; ui.say([VO.mdark]); }

    for (const a of agents) if (a.active) updateAgent(a, dt);
    for (const sp of spots) if (!agents.some((a) => a.state === 'inspect' && a.inspect === sp)) sp.agentNear = false;
    if (P.hidden) { const nearA = agents.some((a) => a.active && Math.hypot(a.g.position.x - P.hidden.ex, a.g.position.z - P.hidden.ez) < 5); P.hidden.agentNear = P.hidden.agentNear || nearA; }
    updateDirector(dt);

    // ghost in the doorway (fake-out after the voicemail)
    if (ghost) {
      ghostT += dt;
      tmpV.set(ghost.group.position.x, 1.7, ghost.group.position.z).sub(G.camera.position);
      const d = tmpV.length(); tmpV.normalize();
      const look = tmpV.dot(G.camera.getWorldDirection(new THREE.Vector3()));
      if ((look > 0.93 && d < 14 && ghostT > 0.5) || ghostT > 9) {
        if (ghostT <= 9) { audio.stinger(1); ui.flash(0.12); ui.shake(0.05, 0.6); emerg.forEach((e) => (e.stutter = 1.2)); }
        scene.remove(ghost.group); ghost = null;
      }
    }
    // skeleton display: motion sensor
    if (!skelDone && Math.hypot(P.pos.x - 20.5, P.pos.z - 29.5) < 2.8) {
      skelDone = true; eyeM.color.setHex(0xff6a10); skelLight.intensity = 14; audio.shriek({ x: 20.5, y: 5, z: 29.5 }); ui.shake(0.06, 0.7); ui.flash(0.1);
      L.onNoise(15, 20.5, 29.5, 'loud');
      jaw.position.y = 5.22;
      setTimeout(() => { skelLight.intensity = 3; jaw.position.y = 5.32; }, 2200);
    }
    // black cat: knocks over a can as you enter the floor from receiving
    if (!catDone && P.pos.z > 9 && P.pos.z < 14 && P.pos.x > 30) { catDone = true; ambient.catT = 0; audio.can({ x: 38, y: 2, z: 4 }); }
    if (ambient.catT != null) {
      ambient.catT += dt; const t = Math.min(1, ambient.catT / 1.3);
      cat.position.set(38 + t * 4, Math.max(0, 2.6 - ambient.catT * 8), 3.5 + t * 9); cat.rotation.y = 0.4;
      if (ambient.catT > 0.6 && !ambient.catSaid) { ambient.catSaid = true; ui.say([VO.mcat]); }
      if (t >= 1) { cat.visible = false; ambient.catT = null; }
    }
    // shopping cart rolls out on its own near the checkouts
    if (!cartDone && P.pos.z > 33 && P.pos.x < 30) { cartDone = true; ambient.cartT = 0; audio.noise({ dur: 2.5, type: 'bandpass', freq: 900, q: 2, gain: 0.12, pos: { x: 12, y: 0.5, z: 37 } }); }
    if (ambient.cartT != null) { ambient.cartT += dt; rogueCart.position.x += dt * 1.2 * Math.max(0, 1 - ambient.cartT / 2.5); rogueCart.rotation.y += dt * 0.2; if (ambient.cartT > 2.5) ambient.cartT = null; }
    // ambient false scares: sounds with nothing behind them
    ambient.t -= dt;
    if (ambient.t <= 0 && stage < 6) {
      ambient.t = 30 + r() * 40;
      const k = (r() * 5) | 0, ang = r() * Math.PI * 2, rx = P.pos.x + Math.cos(ang) * 9, rz = P.pos.z + Math.sin(ang) * 9;
      if (k === 0) audio.chains({ x: 31.5, y: 1.2, z: 45.5 });
      else if (k === 1) audio.bark({ x: 31 + (r() - 0.5) * 30, y: 1, z: 55 });
      else if (k === 2) audio.can({ x: rx, y: 1.5, z: rz });
      else if (k === 3) { for (let i = 0; i < 4; i++) audio.boot({ x: rx, y: 0.2, z: rz }, 0.3); } // footsteps that stop
      else audio.radio({ x: rx, y: 1.5, z: rz }, 0.4);
    }
    updateCats(dt);
    for (const g of eas) { g.cd -= dt; if (g.cd <= 0 && Math.abs(P.pos.x - g.x) < 0.8 && Math.abs(P.pos.z - g.z) < 0.5) { g.cd = 6; audio.easBeep({ x: g.x, y: 1, z: g.z }); L.onNoise(28, g.x, g.z, 'loud'); ui.toast('SECURITY GATE ALARM'); } }
    for (const n of nightLights) { if (n.l.intensity === 0 && L.power) continue; if (n.flick) { n.f = Math.random() < 0.05 ? Math.random() * 0.2 : Math.min(1, n.f + dt * 4); } n.l.intensity = L.power ? 0 : n.base * n.f; n.tube.visible = !L.power && n.f > 0.5; }
    if (alarmOn) { alarmT += dt; const on = Math.floor(alarmT * 6) % 2 === 0; strobes.forEach((l, i) => (l.intensity = on && (i % 2 === Math.floor(alarmT * 3) % 2) ? 40 : 0)); }
    if (stage === 6 && P.pos.x > 62.4) { stage = 7; audio.stopLoop('alarm', 1.5); game.win(); }
  };

  L.danger = () => {
    let dn = 99, chase = false, aware = 0;
    for (const a of agents) if (a.active) { dn = Math.min(dn, Math.hypot(a.g.position.x - P.pos.x, a.g.position.z - P.pos.z)); if (a.state === 'chase') chase = true; aware = Math.max(aware, a.aware); }
    const heart = Math.max(chase ? 0.9 : 0, Math.min(1, (16 - dn) / 14), P.hidden && P.hidden.agentNear ? 1 : 0);
    return { chase, heart, alert: chase ? 0.35 : aware * 0.5 };
  };

  L.drawMap = (c, W, H) => {
    const sx = W / 64, sz = H / 46;
    c.fillStyle = '#e9e3d3'; c.fillRect(0, 0, W, H);
    for (let z = 0; z < 46; z++) for (let x = 0; x < 64; x++) {
      const k = z * 64 + x; if (grid.solid[k]) { c.fillStyle = grid.opaque[k] ? '#3a3632' : '#9a9286'; c.fillRect(x * sx, z * sz, sx + 0.5, sz + 0.5); }
    }
    c.fillStyle = '#1d1b17'; c.font = 'bold 13px Oswald, sans-serif'; c.textAlign = 'center';
    [['BREAK ROOM', 6.5, 5], ['OFFICE', 18, 7], ['BREAKER', 28.5, 7], ['RECEIVING / DOCK', 48, 9.5], ['CHECKOUT', 20, 43.5], ['GARDEN', 53, 44], ['ENTRANCE (CHAINED)', 31.5, 44]].forEach(([t, x, z]) => c.fillText(t, x * sx, z * sz));
    for (let a = 1; a <= 9; a++) c.fillText(String(a), (6 * a + 2) * sx, 24 * sz);
    const goal = { 1: [7.5, 2.4], 2: [18, 5], 3: [42.5, 30.5], 4: [28.5, 2.4], 5: [62, 40.5], 6: [62.5, 40.5] }[Math.floor(stage)];
    if (goal) { c.strokeStyle = '#b3261e'; c.lineWidth = 3; c.beginPath(); c.arc(goal[0] * sx, goal[1] * sz, 9, 0, Math.PI * 2); c.stroke(); }
    c.save(); c.translate(P.pos.x * sx, P.pos.z * sz); c.rotate(-P.yaw); c.fillStyle = '#b3261e'; c.beginPath(); c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#1d1b17'; c.font = '11px Oswald, sans-serif'; c.textAlign = 'left'; c.fillText('YOU ARE HERE (red arrow) · OBJECTIVE (red circle)', 8, H - 8);
  };
  L.dispose = () => { police.forEach((l) => (l.userData.on = false)); };
  return L;
}
