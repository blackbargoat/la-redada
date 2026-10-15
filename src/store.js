// DAY 2 — Hammerline Depot. mode 'work': the day shift. mode 'close': closing time, the raid, the hatch.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792088139';
import { tex, textTex, rng } from './textures.js?v=1792088139';
import { makeHumanoid, makeCharacter, makeVehicle, makeStatic, animateWalk, makeBeam, makeGlow, std } from './models.js?v=1792088139';

const VO = {
  out: { id: 'sr_out', who: 'Agent (radio)', text: 'Back door\'s locked down. He\'s inside. Nobody leaves this building.', radio: true, agent: true },
  m1: { id: 'sr_m1', who: 'Juan', text: '(whispering) Santiago... Dios mío. Okay. Okay. Think. My phone, it\'s charging in my locker.' },
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
  m2: { id: 'sr_m2', who: 'Juan', text: '(whispering) Dale... you called them on us.' },
  m3: { id: 'sr_m3', who: 'Juan', text: 'The gate. Go. Go.' },
  mcat: { id: 'sr_mcat', who: 'Juan', text: '(breathing hard) ...just a cat. Just a cat.' },
  found: { id: 'sr_found', who: 'Agent', text: 'Don\'t move! Hands where I can see them!', agent: true },
  mdark: { id: 'sr_mdark', who: 'Juan', text: '(whispering) No, no, no... the light.' },
};
export const STORE_VO = Object.values(VO).map((l) => l.id);
// day shift + closing
const SVO = {
  d1: { id: 'w_d1', who: 'Dale', text: 'Reyes. Seven-oh-two. Two minutes is late. Clock in.' },
  d2: { id: 'w_d2', who: 'Dale', text: 'Truck came in last night. Crates on the pallet in receiving go on the display at the end of six. Then go find somebody to help. And smile for once, you scare the customers.' },
  ch1: { id: 'w_ch1', who: 'Chuy', text: 'Juan! Lady in plumbing\'s been waving at everybody for ten minutes. All yours, carnal.' },
  cu1: { id: 'w_cu1', who: 'Customer', text: 'Oh, thank God. Do you work here? I need a wax ring. For a toilet. The man on YouTube made it look so easy.' },
  jw1: { id: 'w_jw1', who: 'Juan', text: 'Wax ring. One second, señora. Wait here.' },
  cu2: { id: 'w_cu2', who: 'Customer', text: 'You\'re an angel. Nobody else in here even looked at me.' },
  d3: { id: 'w_d3', who: 'Dale', text: 'Reyes! Somebody knocked over a gallon of paint in four. Mop\'s in the bucket. Go.' },
  d4: { id: 'w_d4', who: 'Dale (shouting)', text: 'Reyes! Breaker room! Get it back on before people start walking out with stuff!' },
  d5: { id: 'w_d5', who: 'Dale', text: 'There he is. Took you long enough. ...Go take your lunch. Thirty minutes. Not thirty-one.' },
  dphone: { id: 'w_dphone', who: 'Dale (behind the door)', text: '...no, tonight. After close. The dock door, yeah. ...They won\'t. They need the cash.' },
  d6: { id: 'c_d6', who: 'Dale', text: 'I\'m out. Lock up, Reyes. Carts, garden gate, trash. And don\'t call me tonight. I mean it.' },
  ag1: { id: 'c_ag1', who: 'Agent (radio, outside)', text: 'All units, go. Dock and front. Nobody leaves this building.', radio: true, agent: true },
  jc1: { id: 'c_jc1', who: 'Juan', text: '(whispering) No. No, not again... Beto said the hatch. But they\'re coming in the dock. Hide. Hide first.' },
  ag2: { id: 'c_ag2', who: 'Agent (radio)', text: 'Floor\'s clear. Check the offices and the break room. He\'s in the back.', radio: true, agent: true },
};
export const SHIFT_VO = Object.values(SVO).map((l) => l.id);

const AISLES = ['', 'LUMBER', 'PLUMBING', 'SEASONAL', 'PAINT', 'HARDWARE', 'TOOLS', 'ELECTRICAL', 'FLOORING', 'GARDEN'];
const PAL = {
  0: [0x6b6b6b, 0x8a7f6a, 0x4a5a6a], 1: [0xb89a6a, 0xa88a5a, 0xc8aa7a], 2: [0xdcdcdc, 0x3a6aa8, 0xbfc8d0], 3: [0xd8641c, 0x151515, 0x6a2a8a],
  4: [0xe0e0d8, 0x8aa0b8, 0xb04030], 5: [0x8a8a8a, 0xb02a20, 0x5a5a5a], 6: [0xd8b020, 0x1a1a1a, 0xb83020], 7: [0x2a5aa8, 0xe0e0e0, 0x777777],
  8: [0xb8a080, 0x6a4a30, 0xd0c0a0], 9: [0x3a6a3a, 0x8a6a4a, 0x2a4a2a], 10: [0x5a6a7a, 0x8a8a8a, 0x4a4a4a],
};
const savedBattery = {};
// difficulty presets (Normal for now; Easy/Hard later)
const DIFF = { notice: 0.35, maxAgents: 3, chaseMul: 0.72, giveUp: 4, vision: 0.85, react: 0.9 };

export function createStore(G, mode = 'close', checkpoint = 0) {
  const WORK = mode === 'work';
  const { audio, ui, P, game, flash } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.075);
  const grid = new Grid(64, 46, 0, 0);
  const L = { scene, grid, interactables: [], allowFlashlight: true, noDrain: WORK, surface: 'concrete', power: false, flicker: 1 };
  const r = rng(77 + checkpoint);
  let stage = '', goal = null;

  // battery: FNAF-style, one charge per night
  if (checkpoint === 0 || WORK) { P.battery = 1; P.lens = 0; }
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
  const frontGlass = box(7, 3.2, 0.08, glassM, 31.5, 1.6, 45.6, false);
  // chain on the front door handles
  const chainM = std(0x888888, { metalness: 0.9, roughness: 0.3 });
  const chainMeshes = [];
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), chainM); t.position.set(31.1 + i * 0.09, 1.1 + Math.sin(i) * 0.02, 45.5); t.rotation.y = i % 2 ? Math.PI / 2 : 0; scene.add(t); chainMeshes.push(t); }
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
  const hemi = new THREE.HemisphereLight(0x5a8078, 0x0a0e0d, 0.06); scene.add(hemi);
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
    const l = new THREE.PointLight(0xcfe0e8, 4, 13, 1.5); l.position.set(x, 7.6, z); scene.add(l);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 2.2), new THREE.MeshBasicMaterial({ color: 0xdfeef0 })); tube.position.set(x, 8.2, z); scene.add(tube);
    return { l, tube, base: 4, flick, f: 1 };
  });
  const AL = [0, 1, 2, 3].map(() => { const s = new THREE.SpotLight(0xdde8ff, 0, 22, 0.34, 0.5, 1.1); s.position.set(0, -50, 0); s.castShadow = true; s.shadow.mapSize.set(512, 512); s.shadow.camera.near = 0.4; s.shadow.camera.far = 24; s.shadow.bias = -0.0005; s.shadow.normalBias = 0.04; scene.add(s); scene.add(s.target); return s; });

  function setPower(on) {
    L.power = on;
    overhead.forEach((l) => (l.intensity = on ? 60 : 0));
    nightLights.forEach((n) => { n.l.intensity = on ? 0 : n.base; });
    hemi.intensity = on ? 0.45 : 0.06;
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
    { name: 'Hollis', role: 'sweeper', speed: 1.3, chase: 3.7, vision: 10, hear: 1.0, skin: 0x9a7a62, intro: 'hollis' },
    { name: 'Dunn', role: 'listener', speed: 1.6, chase: 3.8, vision: 7, hear: 1.6, skin: 0x5a3a2a, intro: 'dunn' },
    { name: 'Kowalski', role: 'hunter', speed: 1.9, chase: 4.0, vision: 8.5, hear: 1.2, skin: 0xa88a72, intro: 'kowal' },
    { name: 'Price', role: 'gatekeeper', speed: 1.5, chase: 3.8, vision: 8.5, hear: 1.1, skin: 0x8a6a52, intro: 'price' },
  ];
  // sweep route: snake through aisles 1..9
  const sweepRoute = [];
  for (let a = 1; a <= 9; a++) { const x = 6 * a + 2; if (a % 2) sweepRoute.push([x, 11.5], [x, 23.5], [x, 35.5]); else sweepRoute.push([x, 35.5], [x, 23.5], [x, 11.5]); }
  sweepRoute.push([55, 38], [30, 38], [8, 37]);
  const listenPosts = [[8, 23.5], [20, 23.5], [32, 23.5], [44, 23.5], [56, 23.5], [20, 11], [44, 11], [32, 37.5], [50, 37.5], [40, 7]];
  const gatePosts = { raid: [[44, 7], [36, 11], [28.5, 11], [17.5, 11], [50, 11]] };
  const wander = []; for (let a = 1; a <= 9; a++) for (const z of [11.5, 23.5, 35.5]) wander.push([6 * a + 2, z]);
  wander.push([40, 7], [55, 6], [20, 42], [45, 42], [6, 6], [18, 6], [28.5, 5]);

  const tmpV = new THREE.Vector3();
  const agents = DEFS.map((def, i) => {
    const h = makeCharacter('agent', { agent: true, flashlight: true, hat: 'cap', gloves: true, skin: def.skin }, 1.85);
    h.group.visible = false; scene.add(h.group);
    const beam = makeBeam(10, 2.0, 0xe6eeff, 0.055); h.group.add(beam); beam.position.set(0.3, 1.45, 0.4); beam.rotation.x = 0.1;
    return { def, h, g: h.group, sl: AL[i], beam, active: false, state: 'idle', path: null, pi: 0, dest: null, repath: 0, speed: 0, phase: 0, stepAcc: 0, wait: 0, look: 0, baseH: 0, aware: 0, lastKnown: null, lost: 0, sawHide: null, inspect: null, inspT: 0, found: 0, routeI: 0, lightOff: false, listenT: 0, radioCD: 0, barkCD: 0, idx: i };
  });
  function spawn(a, x, z) {
    a.active = true; a.g.visible = true; a.g.position.set(x, 0, z); a.state = 'patrol'; a.path = null; a.dest = null; a.aware = 0; a.wait = 0;
    a.routeI = 0;
    // sweeper starts with the nearest point on his route
    if (a.def.role === 'sweeper') { let bd = 1e9; sweepRoute.forEach((p, k) => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; a.routeI = k; } }); }
  }
  // agents always enter through the entry point farthest from the player
  const ENTRIES = [[31.5, 43.5], [45, 7], [58, 36], [7, 42.5], [3, 12], [40, 23.5]];
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
    range *= DIFF.vision;
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
    a.state = 'chase'; a.aware = 1; a.lightOff = false; a.lost = 0; a.repath = 0; a.react = DIFF.react;
    a.lastKnown = [P.pos.x, P.pos.z];
    bark(a, Math.random() < 0.5 ? 'spot1' : 'spot2');
    if (fresh) { audio.stinger(0.55); ui.shake(0.02, 0.3); }
    // radio the others: they converge on the area
    for (const o of agents) if (o !== a && o.active && o.state !== 'chase' && o.state !== 'inspect') {
      const d = Math.hypot(o.g.position.x - P.pos.x, o.g.position.z - P.pos.z);
      if (d < 38) { o.state = 'investigate'; o.lightOff = false; goTo(o, P.pos.x + (r() - 0.5) * 6, P.pos.z + (r() - 0.5) * 6); o.invSpeed = 2.6; o.wait = 0; }
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
    } else { const posts = gatePosts.raid; const p = posts[(r() * posts.length) | 0]; goTo(a, p[0], p[1]); a.wait = 0; }
  }

  // AI director (Alien: Isolation style): knows your general area, manages pacing
  const director = { calm: 0, stress: 0, hunterTarget: null, inspectCD: 12 };
  function updateDirector(dt) {
    let dn = 99, chasing = false;
    for (const a of agents) if (a.active) { dn = Math.min(dn, Math.hypot(a.g.position.x - P.pos.x, a.g.position.z - P.pos.z)); if (a.state === 'chase') chasing = true; }
    if (chasing || dn < 10) { director.stress += dt * (chasing ? 2 : 1); director.calm = 0; } else director.calm += dt;
    if (DIFF.maxAgents > 2 && director.calm > 26) {
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
    const gk = DIFF.maxAgents > 3 ? agents[3] : { active: false };
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
      else if (a.aware > 0.6 && (a.state === 'patrol' || a.state === 'listen')) { a.state = 'investigate'; a.invSpeed = 1.8; a.lightOff = false; goTo(a, P.pos.x, P.pos.z); bark(a, 'hear'); }
    } else if (a.state !== 'chase') a.aware = Math.max(0, a.aware - dt * 0.2);
    if (dP < 1.1 && !P.hidden && a.state !== 'chase') startChase(a); // bumped into him
    // ambush: a dark, listening agent flips his light on right in your face
    if (a.lightOff && !P.hidden && dP < 4.5 && see === false && grid.los(g.x, g.z, P.pos.x, P.pos.z) && !a.ambushed) {
      a.ambushed = true; a.lightOff = false; a.state = 'chase'; a.aware = 1; a.lastKnown = [P.pos.x, P.pos.z]; a.lost = 0; a.repath = 0;
      turnTo(a, Math.atan2(P.pos.x - g.x, P.pos.z - g.z), 1);
      audio.hit(1); audio.stinger(0.7); ui.flash(0.35); ui.shake(0.06, 0.5); audio.radio({ x: g.x, y: 1.5, z: g.z }, 1);
    }

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
        if (!a.path || stepPath(a, a.invSpeed || 2.1, dt)) {
          a.baseH = a.g.rotation.y; a.look = 0; a.path = [];
          const sp = nearestHiddenSpotTo(g.x, g.z, 6);
          if (sp && r() < 0.2) beginInspect(a, sp); else a.wait = 4;
        }
        break;
      }
      case 'chase': {
        if (a.react > 0) { a.react -= dt; a.speed = 0; turnTo(a, Math.atan2(P.pos.x - g.x, P.pos.z - g.z), dt * 8); break; }
        a.repath -= dt;
        if (see) { a.lastKnown = [P.pos.x, P.pos.z]; a.lost = 0; }
        else a.lost += dt;
        if (a.repath <= 0) { a.repath = 0.35; goTo(a, a.lastKnown[0], a.lastKnown[1]); }
        const sp = a.def.chase * DIFF.chaseMul * (L.power ? 1.06 : 1);
        const done = stepPath(a, sp, dt);
        if (!P.hidden && dP < 0.7) { game.caught(a.h); return; }
        if ((done && !see) || a.lost > DIFF.giveUp) {
          // lost him
          bark(a, 'lost'); a.aware = 0.3;
          if (P.hidden && (a.sawHide === P.hidden || Math.hypot(P.hidden.ex - g.x, P.hidden.ez - g.z) < 7) && (a.sawHide === P.hidden || r() < 0.3)) beginInspect(a, P.hidden);
          else { a.state = 'investigate'; a.wait = 5; a.baseH = a.g.rotation.y; a.look = 0; }
        }
        break;
      }
      case 'inspect': {
        const sp = a.inspect;
        if (a.path && a.path.length && !stepPath(a, a.sawHide === sp ? 2.8 : 1.9, dt)) break;
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
      a.phase += a.speed * dt * (a.speed > 3 ? 2.6 : 3); animateWalk(a.h, a.phase, Math.min(1, a.speed / 2.5), true, a.speed);
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
    if (kind === 'loud' && breachArmed && radius >= 10) triggerBreach(radius >= 25);
    for (const a of agents) {
      if (!a.active || a.state === 'chase' || a.state === 'inspect') continue;
      const mul = a.def.hear * (a.state === 'listen' ? 2.2 : 1);
      const d = Math.hypot(a.g.position.x - x, a.g.position.z - z);
      if (d < radius * mul) {
        const wasIdle = a.state !== 'investigate';
        a.state = 'investigate'; a.lightOff = false; a.invSpeed = a.def.role === 'listener' ? 2.8 : 2.1; a.wait = 0;
        goTo(a, x + (r() - 0.5) * 2, z + (r() - 0.5) * 2);
        if (wasIdle && kind !== 'loud') bark(a, 'hear');
      }
    }
  };
  L.onGasp = () => L.onNoise(7, P.pos.x, P.pos.z, 'gasp');
  L.onCaught = () => { audio.stopLoop('motor', 0.1); };

  // ---------------- story beats ----------------
  const events = []; let tl = 0, breachArmed = false;
  const at = (t, fn) => events.push({ t: tl + t, fn });
  const skelState = { moves: 0, cool: 0, pending: false };
  let ghost = null, ghostT = 0, skelDone = false, catDone = WORK, cartDone = WORK, darkLine = false;
  const ambient = { t: 25 + r() * 20 };
  const say = (...k) => ui.say(k.map((x) => SVO[x]));
  audio.preloadVo(Object.values(SVO).map((l) => l.id));
  function setStage(s, obj, g) { stage = s; goal = g || null; ui.objective(obj || ''); }

  // the raid: chains on the front doors, the dock door goes up
  function breach() {
    audio.boltCut({ x: 31.5, y: 1.2, z: 45.5 }); ui.shake(0.015, 0.4);
    at(1.2, () => { audio.chains({ x: 31.5, y: 1.2, z: 45.5 }); police.forEach((l) => (l.userData.on = true)); });
    at(2.0, () => { audio.motorBed({ x: 54.5, y: 2, z: 0.5 }); audio.setLoop('motor', 0.3, 0.2); dockOpen = true; });
    at(4.5, () => { audio.stopLoop('motor', 0.3); audio.clunk({ x: 54.5, y: 2, z: 0.5 }); spawn(agents[0], 54.5, 2.6); radio(VO.hollis, null, 0.3); });
    at(6.5, () => { spawn(agents[1], 31.5, 43.5); radio(VO.dunn, null, 0.5); });
    at(16, () => { if (DIFF.maxAgents > 2 && !agents[2].active) { spawnFar(agents[2]); radio(VO.kowal, null, 0.3); } });
  }

  // ---------------- shared props ----------------
  phoneGlow.visible = false; keyMesh.visible = false; keyGlow.visible = false;
  const ph = G.phone;
  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 2.6, z: 8.1, label: 'Read the corkboard', action: () => ui.note('<h3>CREW — READ THIS</h3>Cash pay is pushed to NEXT Friday. Don\'t talk to anybody about the schedule.\nDon\'t use the front entrance after 11.\n— Dale\n\n<i>(Underneath, in pen: "you said that last friday" — S.)</i>') });
  // the burger counter in the corner room
  wall(1, 37, 3, 37, 3.4); wall(6, 37, 6, 44, 3.4);
  box(2, 0.6, 1, wallTexM(2, 0.6), 4.5, 3.1, 37.5, false);
  const grillSignT = textTex(512, 128, '#1a1612', [{ text: 'HAMMERLINE GRILL', size: 52, color: '#f0d27a', y: 52 }, { text: 'BURGERS · HOT DOGS · AGUAS FRESCAS', size: 22, color: '#e8e0c8', y: 100, weight: 'normal' }], { border: '#d2541c' });
  const grillSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), std(0xffffff, { map: grillSignT, emissiveMap: grillSignT, emissive: 0xffffff, emissiveIntensity: WORK ? 0.7 : 0 })); grillSign.position.set(3.5, 2.9, 36.9); grillSign.rotation.y = Math.PI; scene.add(grillSign);
  box(0.8, 1.0, 4, std(0x8a2a1a, { roughness: 0.6 }), 1.6, 0.5, 41); grid.rect(1, 39, 1, 42, 1, 0);
  const flatTop = box(0.7, 0.05, 1.6, std(0x1a1a1a, { roughness: 0.4, emissive: 0x401000, emissiveIntensity: WORK ? 0.6 : 0 }), 1.6, 1.03, 40.6);
  for (const [x, z] of [[4, 40], [4, 42.6]]) { box(0.8, 0.05, 0.8, std(0xc8c0b0), x, 0.76, z); box(0.08, 0.74, 0.08, metalM, x, 0.37, z); grid.rect(Math.floor(x), Math.floor(z), Math.floor(x), Math.floor(z), 1, 0); }
  const grillL = new THREE.PointLight(0xffc880, WORK ? 6 : 0, 7, 1.5); grillL.position.set(3.5, 2.8, 41); scene.add(grillL);
  // pro desk + appliances along the east wall
  box(3, 1.05, 0.8, std(0x3a3e42), 46.5, 0.52, 36.2); grid.rect(45, 36, 47, 36, 1, 0);
  const proT = textTex(256, 64, '#d2541c', [{ text: 'PRO DESK', size: 40, color: '#fff' }]);
  const pro = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), std(0xffffff, { map: proT })); pro.position.set(46.5, 2.6, 36.2); scene.add(pro);
  const applM = std(0xe8e8e2, { roughness: 0.35, metalness: 0.2 });
  for (let z = 13; z <= 21; z += 2) { box(0.8, z % 4 === 1 ? 1.8 : 1.0, 0.8, applM, 62.4, z % 4 === 1 ? 0.9 : 0.5, z + 0.5); grid.rect(62, z, 62, z, 1, 0); }
  const apT = textTex(256, 64, '#d2541c', [{ text: 'APPLIANCES', size: 38, color: '#fff' }]);
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), std(0xffffff, { map: apT })); ap.position.set(62.9, 3.4, 17.5); ap.rotation.y = -Math.PI / 2; scene.add(ap);
  // time clock on the break room wall
  box(0.35, 0.45, 0.12, std(0xb8b4a8, { metalness: 0.3 }), 9.5, 1.45, 8.9, false);
  const tcScreen = box(0.22, 0.08, 0.02, std(0x1a2a1a, { emissive: 0x3a8a4a, emissiveIntensity: WORK ? 0.8 : 0.3 }), 9.5, 1.55, 8.83, false);
  // the floor hatch in receiving, behind the last pallet rack
  box(1.2, 0.03, 1.2, std(0x1a1a1a, { metalness: 0.5 }), 62, 0.015, 6.2, false);
  const hatch = box(1.0, 0.05, 1.0, std(0x8a7a62, { metalness: 0.6, roughness: 0.55, map: tex('shutter', [2, 2]) }), 62, 0.03, 6.2, false);
  const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 4, 10), std(0x777777, { metalness: 0.8 })); hatchRing.rotation.x = Math.PI / 2; hatchRing.position.set(62, 0.05, 6.5); scene.add(hatchRing);
  box(0.9, 2.2, 1.2, std(0x5a6066, { metalness: 0.5 }), 62.4, 1.1, 8.6); grid.rect(62, 8, 62, 9, 1, 1); // electrical box that hides it from the floor
  let dockOpen = false;

  // ---------------- people (day shift) ----------------
  const npcs = [];
  function npc(kind, fb, h, x, z, yaw, name) { const c = makeCharacter(kind, fb, h); c.group.position.set(x, 0, z); c.group.rotation.y = yaw; c.baseYaw = yaw; c.phase = r() * 6; c.name = name; scene.add(c.group); npcs.push(c); return c; }
  const dale = npc('dale', { shirt: 0x8ab0d0, pants: 0xb0a080, skin: 0xd8a888 }, 1.78, 18, 11, Math.PI, 'Dale');
  let chuy = null, beto = null, cook = null, lady = null, watcher = null;
  const wanderers = [];

  // ---------------- carrying ----------------
  const carry = new THREE.Group(); G.camera.add(carry); carry.position.set(0.05, -0.42, -0.75); carry.visible = false;
  const crateM = std(0xffffff, { map: tex('cardboard') });
  const carryCrate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.4), crateM); carry.add(carryCrate);
  const carryBag = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), std(0x111111, { roughness: 0.3 })); carryBag.scale.set(1, 1.3, 1); carryBag.position.set(0.25, 0.05, 0.1); carry.add(carryBag);
  const carryRing = box(0.12, 0.03, 0.12, std(0xe8d48a), 0, 0, 0, false); scene.remove(carryRing); carryRing.position.set(0.22, 0.1, 0.12); carry.add(carryRing);
  function hold(what) { P.carrying = what; carry.visible = !!what; carryCrate.visible = what === 'crate'; carryBag.visible = what === 'trash'; carryRing.visible = what === 'ring'; }
  hold(null);

  if (WORK) {
    // ================= THE DAY SHIFT =================
    chuy = npc('chuy', { shirt: 0x5a5a5a, pants: 0x2a3a5a, skin: 0x9a6644 }, 1.74, 46, 9, -Math.PI / 2, 'Chuy');
    beto = npc('beto', { shirt: 0x6a3a2a, pants: 0x5a4a3a, skin: 0x8a5a3a, mustache: true }, 1.72, 51, 4.5, Math.PI, 'Beto');
    cook = npc('gus', { shirt: 0xe8e8e0, pants: 0x2a2a2a, skin: 0x8a5a3a }, 1.7, 1.0, 40.4, Math.PI / 2, 'Cook');
    lady = npc('lady', { shirt: 0x8aa08a, pants: 0xc8b898, skin: 0xd8b8a0 }, 1.62, 13.5, 24, Math.PI / 2, 'Customer');
    const cashier = npc('elena', { shirt: 0xd2541c, pants: 0x2a2a3a, skin: 0x8a5a3a }, 1.6, 15.2, 40, -Math.PI / 2, 'Elena');
    for (const [k, fb, x, z] of [['gus', { shirt: 0x2a4a2a }, 32, 30], ['elena', { shirt: 0x6a3a6a }, 44, 18], ['lady', { shirt: 0x6a6a8a }, 20, 36], ['gus', { shirt: 0x5a2a2a }, 56, 28], ['chuy', { shirt: 0x2a2a6a }, 8, 30]]) {
      const w = npc(k, fb, 1.7 + r() * 0.12, x, z, r() * 6, 'Customer'); w.wander = { path: null, pi: 0, wait: r() * 4 }; wanderers.push(w);
    }
    // something is wrong: a man in a windbreaker who never buys anything, a black SUV in the lot
    const w0 = makeStatic('watcher', 1.82); if (w0) { watcher = { group: w0, gone: false }; w0.position.set(32.5, 0, 20); w0.rotation.y = -Math.PI / 2; scene.add(w0); }
    const suvLot = makeVehicle('suv', 4.8, 0x161616, 0.6); if (suvLot) { suvLot.position.set(24, 0, 51); suvLot.rotation.y = Math.PI / 2; scene.add(suvLot); }
    // daylight: the front doors stand open on the parking lot
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), std(0x8a8a84, { map: tex('asphalt', [10, 4]), emissive: 0x6a6a64, emissiveIntensity: 0.6 })); lot.rotation.x = -Math.PI / 2; lot.position.set(32, -0.01, 61); scene.add(lot);
    const skyWall = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), new THREE.MeshBasicMaterial({ color: 0xc8d8dc, fog: false })); skyWall.position.set(32, 10, 80); skyWall.rotation.y = Math.PI; scene.add(skyWall);
    const sun = new THREE.SpotLight(0xfff0d8, 220, 40, 0.7, 0.6, 1.2); sun.position.set(31.5, 6, 52); sun.target.position.set(31.5, 0, 36); scene.add(sun); scene.add(sun.target);
    for (const c of chainMeshes) c.visible = false;
    frontGlass.visible = false; grid.rect(28, 45, 34, 45, 0, 0); grid.rect(28, 46, 34, 47, 1, 1);
    // sounds of a store open for business
    audio.chatterBed(); audio.setLoop('chatter', 0.035, 2);
    audio.sizzleBed({ x: 1.6, y: 1, z: 40.6 }); audio.setLoop('sizzle', 0.1, 2);
    ui.clock('7:02 AM');
    P.pos.set(6, 0, 11); P.yaw = Math.PI * 0.75; P.flashlight = false;
    setPower(true);
    const CRATES = 3; let crates = 0, crateStack = [];
    const displayT = box(1.4, 0.5, 0.8, std(0xd2541c, { roughness: 0.6 }), 38, 0.25, 11.6); grid.rect(37, 11, 38, 11, 1, 0);
    at(1.5, () => { say('d1'); setStage('clock', 'Clock in. The time clock is in the Break Room.', [9.5, 8.1]); });
    it({ x: 9.5, z: 8.1, r: 1.4, label: 'Clock in', enabled: () => stage === 'clock', action: () => {
      audio.punch({ x: 9.5, y: 1.4, z: 8.9 }); stage = 'clock2'; ui.objective(''); ui.toast('CLOCKED IN — 7:04 AM');
      dale.walk = [[12, 10.5]];
      say('d2').then(() => { dale.walk = [[17.5, 10.5], [17.5, 6.5]]; setStage('crates', `Move the crates from the pallet in Receiving to the display at the end of Aisle 6. (0/${CRATES})`, [44, 7.4]); });
    } });
    it({ x: 44, z: 7.4, r: 1.7, label: 'Pick up a crate', enabled: () => stage === 'crates' && !P.carrying, action: () => { audio.pickup(); hold('crate'); goal = [38, 12.6]; } });
    it({ x: 38, z: 12.6, r: 1.7, label: 'Stack the crate', enabled: () => stage === 'crates' && P.carrying === 'crate', action: () => {
      hold(null); audio.thump({ x: 38, y: 0.6, z: 11.6 }); crates++;
      const c = box(0.55, 0.38, 0.4, crateM, 37.6 + (crates % 2) * 0.6, 0.69 + Math.floor((crates - 1) / 2) * 0.38, 11.6, true); crateStack.push(c);
      if (crates < CRATES) { setStage('crates', `Move the crates from the pallet in Receiving to the display at the end of Aisle 6. (${crates}/${CRATES})`, [44, 7.4]); return; }
      stage = 'crates2'; ui.objective(''); ui.clock('9:48 AM');
      at(1.5, () => ui.say([{ ...SVO.ch1, pos: chuy.group.position }]).then(() => setStage('lady', 'Help the customer in Aisle 2, Plumbing.', [13.5, 24])));
    } });
    it({ x: 13.5, z: 24, r: 2.0, label: 'Help her', enabled: () => stage === 'lady', action: () => {
      stage = 'lady2'; ui.objective(''); ui.clock('11:20 AM');
      say('cu1', 'jw1').then(() => { setStage('ring', 'Find a toilet wax ring. Aisle 2, bottom shelf.', [12.4, 29]); ringGlow.visible = true; });
    } });
    const ringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), std(0xe8d48a)); ringMesh.position.set(11.75, 0.33, 29); scene.add(ringMesh);
    const ringGlow = makeGlow(0xd8ffe0, 0.35, 0.6); ringGlow.position.set(11.8, 0.4, 29); ringGlow.visible = false; scene.add(ringGlow);
    it({ x: 12.4, z: 29, r: 1.5, label: 'Take the wax ring', enabled: () => stage === 'ring', action: () => { audio.pickup(); ringMesh.visible = false; ringGlow.visible = false; hold('ring'); setStage('ring2', 'Bring the wax ring to the customer.', [lady.group.position.x, lady.group.position.z]); } });
    it({ x: 13.5, z: 24, r: 2.0, label: 'Give her the wax ring', enabled: () => stage === 'ring2', action: () => {
      hold(null); audio.pickup(); stage = 'ring3'; ui.objective('');
      say('cu2').then(() => { lady.wander = { path: null, pi: 0, wait: 0 }; wanderers.push(lady); at(2, () => say('d3').then(() => setStage('mop', 'Mop up the paint spill in Aisle 4. Hold E.', [26, 20]))); });
    } });
    // the spill
    const spill = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14), std(0x3a5aa8, { roughness: 0.1 })); spill.rotation.x = -Math.PI / 2; spill.position.set(26, 0.012, 20); scene.add(spill);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), std(0xd8d8d0, { metalness: 0.5 })); can.rotation.z = Math.PI / 2; can.position.set(26.6, 0.12, 20.3); scene.add(can);
    const bucket = box(0.4, 0.35, 0.4, std(0xd8b020), 24.6, 0.18, 19.2);
    let mopProg = 0;
    it({ x: 26, z: 20, r: 1.9, label: 'Mop up the paint', hold: 6, enabled: () => stage === 'mop', onHold: (dt) => {
      mopProg += dt; spill.scale.setScalar(Math.max(0.15, 1 - mopProg / 6));
      if (Math.random() < dt * 2.5) audio.mop({ x: 26, y: 0.3, z: 20 });
      if (mopProg > 3.6) powerCut();
    }, action: () => {} });
    // the power goes out in the middle of the day. It's nothing. It's an old building.
    function powerCut() {
      if (stage !== 'mop') return;
      stage = 'cut'; ui.objective(''); spill.scale.setScalar(0.3); ui.clock('12:08 PM');
      audio.powerDown({ x: 30, y: 6, z: 20 }); setPower(false); grillL.intensity = 0; flatTop.material.emissiveIntensity = 0; grillSign.material.emissiveIntensity = 0;
      audio.setLoop('chatter', 0.07, 0.4); audio.setLoop('sizzle', 0, 1); ui.shake(0.02, 0.3);
      npcs.forEach((n) => { n.walk = null; if (n.wander) n.wander.wait = 99; });
      at(2.0, () => say('d4').then(() => {
        setStage('breaker', 'Get the power back on. Electrical room, back wall.', [28.5, 2.4]);
        ui.bigHint('PRESS <kbd>F</kbd> FLASHLIGHT'); document.getElementById('bigHint').dataset.k = 'F';
      }));
    }
    let breakerProg = 0;
    it({ x: 28.5, z: 2.4, r: 1.6, label: 'Reset the main breaker', hold: 2.5, enabled: () => stage === 'breaker', onHold: (dt) => { breakerProg += dt; if (Math.random() < dt * 3) audio.flicker({ x: 28.5, y: 1.6, z: 1.2 }, 0.6); }, action: () => {
      stage = 'back'; ui.objective(''); audio.clunk({ x: 28.5, y: 1.5, z: 1.2 });
      at(0.5, () => { fixM.emissiveIntensity = 1.2; audio.flicker({ x: 28, y: 8, z: 18 }); }); at(0.6, () => { fixM.emissiveIntensity = 0; });
      at(0.9, () => { fixM.emissiveIntensity = 1.6; audio.flicker({ x: 40, y: 8, z: 30 }); }); at(1.0, () => { fixM.emissiveIntensity = 0; });
      at(1.4, () => {
        setPower(true); grillL.intensity = 6; flatTop.material.emissiveIntensity = 0.6; grillSign.material.emissiveIntensity = 0.7;
        audio.setLoop('chatter', 0.035, 2); audio.setLoop('sizzle', 0.1, 2); npcs.forEach((n) => { if (n.wander) n.wander.wait = r() * 3; });
        dale.group.position.set(24, 0, 11.2); dale.walk = null;
        at(1.2, () => say('d5').then(() => setStage('lunch', 'Lunch break. Go out the front doors.', [31.5, 44])));
      });
    } });
    it({ x: 31.5, z: 44.2, r: 2.2, label: 'Go to lunch', enabled: () => stage === 'lunch', action: () => { stage = 'done'; ui.objective(''); game.nextChapter(); } });
  } else {
    // ================= CLOSING TIME =================
    chuy = null; beto = null;
    ui.clock('9:52 PM'); P.pos.set(20, 0, 34.5); P.yaw = Math.PI * 0.1; P.flashlight = false;
    setPower(true);
    audio.preloadVo(STORE_VO);
    dale.group.position.set(24, 0, 36); dale.group.rotation.y = 0;
    const strays = [[44, 31.5], [55.5, 34], [9, 25]].map(([x, z]) => { const c = box(0.6, 0.9, 1.0, cartM, x, 0.7, z, false); c.rotation.y = r() * 3; return c; });
    let cartsIn = 0, gateProg = 0;
    gate.position.y = 5.6;
    const bags = box(0.8, 0.5, 0.5, std(0x111111, { roughness: 0.3 }), 26.5, 0.25, 38.3);
    const compactor = box(2, 2.2, 1.6, std(0x2a5a3a, { metalness: 0.4 }), 57.5, 1.1, 2.2); grid.rect(56, 1, 58, 2, 1, 1);
    const compT = textTex(256, 64, '#e8d020', [{ text: 'COMPACTOR', size: 36, color: '#111' }]);
    const compS = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), std(0xffffff, { map: compT })); compS.position.set(57.5, 1.6, 3.02); scene.add(compS);
    at(1.2, () => say('d6').then(() => { dale.walk = [[31.5, 41], [31.5, 44.6]]; setStage('carts', 'Close up (1/3): Bring in the stray carts. (0/3)', [strays[0].position.x, strays[0].position.z]); }));
    strays.forEach((c, i) => it({ x: c.position.x, z: c.position.z, r: 1.6, label: 'Bring in the cart', enabled: () => stage === 'carts' && c.visible, action: () => {
      c.visible = false; cartsIn++; audio.noise({ dur: 1.2, type: 'bandpass', freq: 900, q: 2, gain: 0.1 }); audio.clunk({ x: c.position.x, y: 0.5, z: c.position.z }, 0.3);
      const next = strays.find((s) => s.visible);
      if (next) setStage('carts', `Close up (1/3): Bring in the stray carts. (${cartsIn}/3)`, [next.position.x, next.position.z]);
      else setStage('gate', 'Close up (2/3): Pull down the garden-center gate. Hold E.', [61.6, 40.5]);
    } }));
    it({ x: 61.6, z: 40.5, r: 2.0, label: 'Pull down the gate', hold: 3, enabled: () => stage === 'gate', onHold: (dt) => { audio.motorBed({ x: 63, y: 2, z: 40.5 }); audio.setLoop('motor', 0.3, 0.1); gateProg += dt; gate.position.y = 5.6 - Math.min(1, gateProg / 3) * 3.6; }, onRelease: () => audio.setLoop('motor', 0, 0.1), action: () => {
      audio.stopLoop('motor', 0.2); audio.clunk({ x: 63, y: 0.5, z: 40.5 }); gate.position.y = 2;
      setStage('trash', 'Close up (3/3): Take the trash from the registers to the compactor in Receiving.', [26.5, 39]);
    } });
    it({ x: 26.5, z: 39.2, r: 1.6, label: 'Pick up the trash', enabled: () => stage === 'trash' && !P.carrying, action: () => { bags.visible = false; audio.rustle({ x: 26.5, y: 0.5, z: 38.3 }); hold('trash'); goal = [57.5, 3.6]; } });
    it({ x: 57.5, z: 3.6, r: 1.7, label: 'Throw it in the compactor', enabled: () => stage === 'trash' && P.carrying === 'trash', action: () => { hold(null); audio.thump({ x: 57.5, y: 1.5, z: 2.5 }); stage = 'quiet'; ui.objective(''); at(2.5, lightsOut); } });
    // closing is done. The lights go.
    function lightsOut() {
      audio.powerDown({ x: 40, y: 6, z: 20 }); setPower(false); ui.shake(0.02, 0.4); ui.clock('10:31 PM');
      at(1.5, () => { audio.sirenBed(); audio.setLoop('siren', 0.05, 3); police.forEach((l) => (l.userData.on = true)); });
      at(3.0, () => { audio.carDoor({ x: 50, y: 1, z: -4 }); audio.carDoor({ x: 30, y: 1, z: 50 }); audio.radio({ x: 54.5, y: 1.5, z: -2 }, 0.8); ui.bark({ ...SVO.ag1, pos: { x: 54.5, y: 1.5, z: -2 } }); });
      at(6.5, () => { say('jc1'); });
      at(8.5, () => { setStage('hide', 'HIDE. The storage sheds by the garden center.', [50.5, 39.3]); ui.bigHint('HIDE<small>THEY\'RE COMING IN THE DOCK AND THE FRONT</small>'); setTimeout(() => ui.bigHint(''), 3500); breach(); });
    }
    it({ x: 62, z: 6.4, r: 1.5, label: 'Pry the hatch open', hold: 3, enabled: () => stage === 'hatch', onHold: (dt) => { if (Math.random() < dt * 2) { audio.clunk({ x: 62, y: 0.1, z: 6.2 }, 0.25); L.onNoise(6, 62, 6.2, 'pry'); } }, action: () => {
      stage = 'down'; ui.objective(''); P.frozen = true; audio.clunk({ x: 62, y: 0.1, z: 6.2 }, 0.8); hatch.position.y = 0.6; hatch.rotation.x = -1.2;
      at(0.8, () => { audio.splash({ x: 62, y: -1, z: 6.2 }); P.lookLock = { yaw: P.yaw, pitch: -1.3, k: 3 }; });
      at(1.8, () => game.nextChapter());
    } });
    // optional: what's on Dale's desk tonight
    it({ x: 18.2, z: 5.5, r: 1.5, label: 'Read the printout on Dale\'s desk', enabled: () => stage !== 'quiet', action: () => ui.note('<h3>HAMMERLINE DEPOT #0417 — PRINTOUT ON DALE\'S DESK</h3>TIP CONFIRMATION — submitted 10/14, 4:52 PM\nLocation: Hammerline Depot #0417, loading entrance\nIndividuals: night stocking crew (paid cash)\nNotes: crew on site after close\nSubmitted by: D. Pruitt, Store Manager\n\n<i>A sticky note on the corner: "nights payroll = $0 if nobody\'s here to collect."</i>').then(() => ui.say([VO.m2])) });
    it({ x: 42.5, z: 27.5, label: 'Take the LED lens kit (brighter light, drains faster)', enabled: () => !P.lens, action: () => { P.lens = 1; audio.pickup(); ui.toast('FLASHLIGHT UPGRADED: LED LENS'); lensMesh.visible = false; } });
  }
  const lensMesh = box(0.2, 0.2, 0.2, std(0x2a5aa8), 41.85, 1.62, 27.5, false);
  if (P.lens || WORK) lensMesh.visible = false;
  audio.droneBed(); audio.setLoop('drone', WORK ? 0 : 0.3, 3);
  L.onHide = (spot) => {
    for (const a of agents) if (canSee(a, true) || (a.state === 'chase' && Math.hypot(a.g.position.x - P.pos.x, a.g.position.z - P.pos.z) < 6 && grid.los(a.g.position.x, a.g.position.z, spot.ex, spot.ez))) { a.sawHide = spot; a.lastKnown = [spot.ex, spot.ez]; }
    if (stage === 'hide') {
      stage = 'hiding'; ui.objective('Stay still. Hold your breath (Space) if they get close.');
      // one of them checks the shed next to yours
      at(5, () => { const near = sheds.length ? spots.filter((s2) => s2.kind === 'shed' && s2 !== spot) : []; const a = agents.find((x) => x.active && x.state !== 'chase'); const sp = near.sort((p, q) => Math.abs(p.ex - spot.ex) - Math.abs(q.ex - spot.ex))[0]; if (a && sp) beginInspect(a, sp); });
      at(20, () => {
        radio(SVO.ag2, null);
        agents.forEach((a) => { if (a.active && a.state !== 'chase') { a.state = 'investigate'; a.invSpeed = 2.2; a.wait = 0; goTo(a, 6 + r() * 20, 5 + r() * 2); } });
        at(4, () => { if (stage === 'hiding') setStage('hatch', 'Get to the drain hatch in Receiving. Behind the last pallet rack, by the east wall.', [62, 6.4]); });
      });
    }
  };

  // ---------------- cats (jumpscares) ----------------
  const catGeoM = std(0x050505, { roughness: 0.4 });
  const catEyeM = new THREE.MeshBasicMaterial({ color: 0xd8f070 });
  function makeCat() {
    const glb = makeVehicle('cat', 0.6, 0x222222, 0.7); if (glb) { glb.visible = false; scene.add(glb); return glb; }
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
        c.t = 0; audio.catScreech({ x: c.from[0], y: c.from[1], z: c.from[2] }); setTimeout(() => audio.paws({ x: c.to[0], y: 0.2, z: c.to[2] }, 14), 500); audio.can({ x: c.from[0], y: c.from[1], z: c.from[2] });
        audio.hit(0.55); ui.shake(0.05, 0.4); ui.flash(0.06); L.onNoise(10, c.x, c.z, 'loud');
      }
      if (c.t >= 0) {
        c.t += dt;
        const k = Math.min(1, c.t / 0.55), m = c.mesh.position;
        m.x = c.from[0] + (c.to[0] - c.from[0]) * k; m.z = c.from[2] + (c.to[2] - c.from[2]) * k;
        m.y = c.from[1] + (c.to[1] - c.from[1]) * k + Math.sin(k * Math.PI) * 0.8;
        if (k >= 1) { const run = c.t - 0.55; m.x += Math.sin(c.mesh.rotation.y) * run * 0.12; m.z += Math.cos(c.mesh.rotation.y) * run * 0.12; m.y = Math.abs(Math.sin(run * 16)) * 0.12; c.mesh.rotation.x = Math.sin(run * 16) * 0.15; }
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

  // ---------------- navigation: glow-tape floor arrows, wall maps, objective glow ----------------
  // subtle HUD chevron pointing the general way (no floor arrows)
  const dirEl = document.getElementById('dirHint');
  let arrowT = 0, guide = null;
  function updateArrows(dt) {
    arrowT -= dt;
    if (arrowT <= 0) {
      arrowT = 0.4; guide = null;
      if (goal && !P.hidden) {
        const path = grid.path(P.pos.x, P.pos.z, goal[0], goal[1]);
        if (path && path.length) { let k = 0, acc = 0, px = P.pos.x, pz = P.pos.z; for (; k < path.length - 1; k++) { acc += Math.hypot(path[k].x - px, path[k].z - pz); px = path[k].x; pz = path[k].z; if (acc > 3.5) break; } guide = { x: path[k].x, z: path[k].z, d: Math.hypot(goal[0] - P.pos.x, goal[1] - P.pos.z) }; }
      }
    }
    if (!guide || P.frozen || P.reading) { dirEl.style.opacity = 0; return; }
    const ang = Math.atan2(guide.x - P.pos.x, guide.z - P.pos.z);
    const rel = ang - (P.yaw + Math.PI);
    dirEl.style.opacity = 0.42;
    dirEl.querySelector('i').style.transform = `rotate(${-rel}rad)`;
    dirEl.querySelector('b').textContent = `${Math.round(guide.d)}m`;
  }
  const objGlow = makeGlow(0xd8ffe0, 0.9, 0.7); scene.add(objGlow);
  const MAPS = [[50, 1.06, 0], [20, 44.94, Math.PI], [0.94 + 0.02, 23.5, Math.PI / 2], [63.06 - 0.02, 23.5, -Math.PI / 2]];
  const mapT = textTex(512, 360, '#e9e3d3', [{ text: 'STORE DIRECTORY', size: 46, color: '#d2541c', y: 50 }, { text: 'YOU ARE HERE', size: 30, color: '#1d1b17', y: 300 }], { border: '#d2541c' });
  MAPS.forEach(([x, z, ry]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), std(0xffffff, { map: mapT, emissive: 0x222222 })); m.position.set(x, 1.6, z); m.rotation.y = ry; scene.add(m);
    const ix = x + Math.sin(ry) * 1.1, iz = z + Math.cos(ry) * 1.1;
    L.interactables.push({ x: ix, z: iz, r: 1.8, label: 'Read the store map', action: () => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 460; L.drawMap(c.getContext('2d'), 640, 460);
      ui.note(`<h3>HAMMERLINE DEPOT #0417 — STORE MAP</h3><img src="${c.toDataURL()}" style="width:100%;display:block">`);
    } });
  });

  // ---------------- falling boxes (jumpscare) ----------------
  const fallM = std(0xffffff, { map: tex('cardboard') });
  const drops = [{ x: 37.5, z: 16, rackX: 35.6 }, { x: 13.5, z: 28, rackX: 16.4 }, { x: 49.5, z: 20, rackX: 47.6 }, { x: 55.5, z: 33, rackX: 53.6 }].map((d) => {
    const boxes = [];
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), fallM); b.position.set(d.rackX, 4.7 + (i % 2) * 0.55, d.z - 1 + i * 0.5); b.castShadow = true; scene.add(b); boxes.push({ m: b, v: new THREE.Vector3(), w: new THREE.Vector3(), rest: false }); }
    return { ...d, boxes, done: false, t: -1 };
  });
  function updateDrops(dt) {
    for (const d of drops) {
      if (!d.done && Math.hypot(P.pos.x - d.x, P.pos.z - d.z) < 2.6 && !P.hidden) {
        d.done = true; d.t = 0;
        const dir = Math.sign(d.x - d.rackX);
        d.boxes.forEach((b, i) => { b.v.set(dir * (1.2 + Math.random() * 1.5), 0.5 + Math.random(), (Math.random() - 0.5) * 1.5); b.w.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8); b.delay = i * 0.07; });
        setTimeout(() => { audio.boxCrash({ x: d.x, y: 1, z: d.z }); ui.shake(0.07, 0.5); audio.hit(0.5); }, 450);
        L.onNoise(12, d.x, d.z, 'loud');
      }
      if (d.t >= 0) {
        d.t += dt;
        for (const b of d.boxes) {
          if (b.rest || d.t < b.delay) continue;
          b.v.y -= 14 * dt; b.m.position.addScaledVector(b.v, dt);
          b.m.rotation.x += b.w.x * dt; b.m.rotation.y += b.w.y * dt; b.m.rotation.z += b.w.z * dt;
          if (b.m.position.y < 0.28) { b.m.position.y = 0.28; if (Math.abs(b.v.y) > 2) { b.v.y *= -0.25; b.v.x *= 0.5; b.v.z *= 0.5; b.w.multiplyScalar(0.4); } else { b.rest = true; b.m.rotation.set(0, b.m.rotation.y, 0); } }
        }
      }
    }
  }

  // ---------------- the stranger in the stockroom (scare + struggle) ----------------
  const CR = {
    1: { id: 'cr_1', who: '???', text: 'This is MY spot. My spot. They can\'t have it.' },
    2: { id: 'cr_2', who: '???', text: 'You brought them here! You brought them!' },
    3: { id: 'cr_3', who: '???', text: 'Agh... go. Go before they hear you.' },
    4: { id: 'cr_4', who: '???', text: 'Mine. All mine.' },
  };
  audio.preloadVo(['cr_1', 'cr_2', 'cr_3', 'cr_4']);
  const stranger = makeCharacter('gus', { shirt: 0x2a2a2a, pants: 0x2a2a2a, skin: 0x7a5a42 }, 1.72); // darkened so he doesn't read as anyone you know
  stranger.group.traverse((m) => { if (m.isMesh && m.material) m.material.color.multiplyScalar(0.35); });
  stranger.group.visible = false;
  const cr = { state: 'gone', t: 0, power: 0, said: 0, phase: 0 };
  function strangerUpdate(dt) {
    const g = stranger.group;
    if (cr.state === 'wait') {
      if (!P.hidden && !P.frozen && Math.hypot(P.pos.x - 44.5, P.pos.z - 8.5) < 3.2) {
        cr.state = 'lunge'; cr.t = 0; g.visible = true; g.position.set(42.3, 0, 5.6);
        audio.hit(1.1); audio.stinger(0.8); ui.flash(0.3); ui.shake(0.1, 0.6); P.frozen = true; P.flashlight = P.flashlight;
        ui.bark(CR[1]);
      }
      return;
    }
    if (cr.state === 'lunge' || cr.state === 'struggle') {
      cr.t += dt;
      const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
      const want = new THREE.Vector3(P.pos.x + fx * 0.7, 0, P.pos.z + fz * 0.7);
      g.position.lerp(want, Math.min(1, dt * (cr.state === 'lunge' ? 10 : 6)));
      g.rotation.y = Math.atan2(P.pos.x - g.position.x, P.pos.z - g.position.z);
      g.position.y = Math.sin(cr.t * 18) * 0.03;
      ui.shake(0.025, 0.1);
      if (cr.state === 'lunge' && cr.t > 0.4) { cr.state = 'struggle'; cr.t = 0; ui.bigHint('MASH <kbd>E</kbd> — FIGHT HIM OFF<small>OR CLICK FAST</small>'); }
      if (cr.state === 'struggle') {
        cr.power = Math.max(0, cr.power - dt * 0.32);
        document.getElementById('bigHint').querySelector('small').textContent = '█'.repeat(Math.round(cr.power * 12)).padEnd(12, '·');
        if (cr.t > 1.6 && cr.said < 2) { cr.said = 2; ui.bark(CR[2]); }
        if (Math.random() < dt * 3) audio.noise({ dur: 0.2, type: 'lowpass', freq: 500, gain: 0.35 });
        if (cr.power >= 1) {
          cr.state = 'shoved'; cr.t = 0; ui.bigHint(''); P.frozen = false;
          audio.impact(); audio.boxCrash({ x: g.position.x, y: 1, z: g.position.z }); ui.shake(0.08, 0.4);
          L.onNoise(16, g.position.x, g.position.z, 'loud'); setTimeout(() => ui.bark(CR[3]), 900);
        } else if (cr.t > 5) {
          cr.state = 'fled'; cr.t = 0; ui.bigHint(''); P.frozen = false;
          audio.impact(); ui.shake(0.12, 0.5); ui.flash(0.2); P.stamina = 0; P.exhausted = true;
          P.battery = Math.max(0, P.battery - 0.15); ui.toast('HE KNOCKED YOU DOWN — FLASHLIGHT DAMAGED');
          ui.bark(CR[4]); L.onNoise(10, P.pos.x, P.pos.z, 'loud');
        }
      }
      animateWalk(stranger, cr.t * 12, 1, false, 4);
      return;
    }
    if (cr.state === 'shoved') {
      cr.t += dt; const k = Math.min(1, cr.t / 0.5);
      const bx = Math.sin(g.rotation.y), bz = Math.cos(g.rotation.y);
      if (k < 1) { g.position.x -= bx * dt * 5; g.position.z -= bz * dt * 5; }
      g.rotation.x = -k * 1.45; g.position.y = 0;
      if (cr.t > 12) { g.visible = false; cr.state = 'gone'; }
    } else if (cr.state === 'fled') {
      cr.t += dt; const bx = Math.sin(g.rotation.y), bz = Math.cos(g.rotation.y);
      g.position.x -= bx * dt * 5; g.position.z -= bz * dt * 5; cr.phase += dt * 10; animateWalk(stranger, cr.phase, 1, false, 5);
      if (cr.t > 2.5) { g.visible = false; cr.state = 'gone'; }
    }
  }
  L.onKey = (code, B) => {
    if (cr.state !== 'struggle') return false;
    if (code === B.interact || code === 'Mouse' || code === 'Space') { cr.power = Math.min(1, cr.power + 0.11); audio.noise({ dur: 0.08, type: 'lowpass', freq: 700, gain: 0.3 }); return true; }
    return false;
  };

  // ---------------- people ----------------
  let phoneHeard = false;
  const tmpD = new THREE.Vector3(), tmpC = new THREE.Vector3();
  function updatePeople(dt) {
    for (const c of npcs) {
      const g = c.group.position; let moving = false;
      if (c.walk && c.walk.length) {
        const [tx, tz] = c.walk[0], dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
        if (d < 0.2) { c.walk.shift(); if (!c.walk.length && c === dale && !WORK && Math.hypot(g.x - 31.5, g.z - 44.6) < 1) { c.group.visible = false; audio.doorBell({ x: 31.5, y: 2.6, z: 45 }); } }
        else { g.x += dx / d * 1.3 * dt; g.z += dz / d * 1.3 * dt; c.group.rotation.y = Math.atan2(dx, dz); moving = true; c.phase += dt * 4; }
      } else if (c.wander && L.power) {
        const w = c.wander;
        if (w.wait > 0) w.wait -= dt;
        else if (!w.path) { const t = wander[(r() * wander.length) | 0]; w.path = grid.path(g.x, g.z, t[0] + (r() - 0.5) * 2, t[1] + (r() - 0.5) * 4) || []; w.pi = 0; }
        else {
          const p = w.path[w.pi];
          if (!p) { w.path = null; w.wait = 3 + r() * 7; c.baseYaw = c.group.rotation.y + (r() < 0.5 ? 1.57 : -1.57); }
          else { const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz); if (d < 0.2) w.pi++; else { g.x += dx / d * 1.0 * dt; g.z += dz / d * 1.0 * dt; c.group.rotation.y = Math.atan2(dx, dz); moving = true; c.phase += dt * 3; } }
        }
        if (!moving && w.wait > 0) { let df = c.baseYaw - c.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); c.group.rotation.y += df * Math.min(1, dt * 2); }
      } else {
        const dx = P.pos.x - g.x, dz = P.pos.z - g.z, near = Math.hypot(dx, dz) < 4;
        const want = near ? Math.atan2(dx, dz) : c.baseYaw; let df = want - c.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df));
        c.group.rotation.y += df * Math.min(1, dt * 3);
      }
      animateWalk(c, c.phase, moving ? 1 : 0, false);
    }
    // Dale on the phone behind his office door
    if (WORK && !phoneHeard && stage === 'crates' && Math.hypot(P.pos.x - 17.5, P.pos.z - 10.5) < 3.5) { phoneHeard = true; ui.bark({ ...SVO.dphone, pos: { x: 17.5, y: 1.5, z: 6 }, gain: 0.6 }); }
    // the man in the windbreaker: when you look right at him, he walks away
    if (watcher && !watcher.gone) {
      const wg = watcher.group.position;
      tmpD.set(wg.x, 1.6, wg.z).sub(G.camera.position); const d = tmpD.length(); tmpD.normalize();
      if (!watcher.leaving && d < 16 && tmpD.dot(G.camera.getWorldDirection(tmpC)) > 0.94 && grid.los(P.pos.x, P.pos.z, wg.x, wg.z)) { watcher.leaving = true; watcher.path = grid.path(wg.x, wg.z, 31.5, 44) || []; watcher.pi = 0; }
      if (watcher.leaving) {
        const p = watcher.path[watcher.pi];
        if (!p) { watcher.gone = true; watcher.group.visible = false; }
        else { const dx = p.x - wg.x, dz = p.z - wg.z, dd = Math.hypot(dx, dz); if (dd < 0.2) watcher.pi++; else { wg.x += dx / dd * 1.2 * dt; wg.z += dz / dd * 1.2 * dt; watcher.group.rotation.y = Math.atan2(dx, dz); } }
        if (Math.hypot(wg.x - P.pos.x, wg.z - P.pos.z) > 30) { watcher.gone = true; watcher.group.visible = false; }
      }
    }
  }

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
    // the skeleton moves when you're not looking
    {
      const sp = skel.position, cam = G.camera.position;
      const dx = sp.x - cam.x, dz = sp.z - cam.z, dist = Math.hypot(dx, dz);
      tmpV.set(dx, 4.5 - cam.y, dz).normalize();
      const seen = tmpV.dot(G.camera.getWorldDirection(new THREE.Vector3())) > 0.55 && dist < 22 && grid.los(cam.x, cam.z, sp.x, sp.z);
      skelState.cool -= dt;
      if (!seen && skelDone && !WORK && !L.power && skelState.moves < 5 && skelState.cool <= 0 && dist > 4 && dist < 24) {
        const oz = Math.floor(sp.z), nz = Math.max(25, Math.min(34, oz + Math.sign(P.pos.z - sp.z)));
        if (nz !== oz && Math.floor(P.pos.z) !== nz) { grid.rect(20, oz, 20, oz, 0, 0); sp.z = nz + 0.5; grid.rect(20, nz, 20, nz, 1, 0); }
        skel.rotation.y = Math.atan2(P.pos.x - sp.x, P.pos.z - sp.z);
        skelState.moves++; skelState.cool = 7 + r() * 6; skelState.pending = true;
        skelLight.position.set(sp.x - 0.2, 5.6, sp.z);
      }
      if (seen && skelState.pending) { skelState.pending = false; audio.creak({ x: sp.x, y: 3, z: sp.z }); audio.tone({ freq: 60, freqTo: 40, dur: 1.2, gain: 0.35, dest: audio.music }); }
    }
    // black cat: knocks over a can as you enter the floor from receiving
    if (!catDone && !L.power && P.pos.z > 9 && P.pos.z < 14 && P.pos.x > 30) { catDone = true; ambient.catT = 0; audio.can({ x: 38, y: 2, z: 4 }); }
    if (ambient.catT != null) {
      ambient.catT += dt; const t = Math.min(1, ambient.catT / 1.3);
      cat.position.set(38 + t * 4, Math.max(0, 2.6 - ambient.catT * 8), 3.5 + t * 9); cat.rotation.y = 0.4;
      if (t >= 1) { cat.visible = false; ambient.catT = null; }
    }
    // shopping cart rolls out on its own near the checkouts
    if (!cartDone && !L.power && P.pos.z > 33 && P.pos.x < 30) { cartDone = true; ambient.cartT = 0; audio.noise({ dur: 2.5, type: 'bandpass', freq: 900, q: 2, gain: 0.12, pos: { x: 12, y: 0.5, z: 37 } }); }
    if (ambient.cartT != null) { ambient.cartT += dt; rogueCart.position.x += dt * 1.2 * Math.max(0, 1 - ambient.cartT / 2.5); rogueCart.rotation.y += dt * 0.2; if (ambient.cartT > 2.5) ambient.cartT = null; }
    // ambient false scares: sounds with nothing behind them
    ambient.t -= dt;
    if (ambient.t <= 0 && !WORK) {
      ambient.t = 14 + r() * 20;
      const k = (r() * 10) | 0, ang = r() * Math.PI * 2, rx = P.pos.x + Math.cos(ang) * 9, rz = P.pos.z + Math.sin(ang) * 9;
      if (k === 0) audio.chains({ x: 31.5, y: 1.2, z: 45.5 });
      else if (k === 1) audio.bark({ x: 31 + (r() - 0.5) * 30, y: 1, z: 55 });
      else if (k === 2) audio.can({ x: rx, y: 1.5, z: rz });
      else if (k === 3) { for (let i = 0; i < 4; i++) audio.boot({ x: rx, y: 0.2, z: rz }, 0.3); } // footsteps that stop
      else if (k === 4) audio.radio({ x: rx, y: 1.5, z: rz }, 0.4);
      else if (k === 6) audio.rats({ x: rx, y: 0.2, z: rz });
      else if (k === 7) audio.rustle({ x: P.pos.x + (r() - 0.5) * 5, y: 1 + r() * 3, z: P.pos.z + (r() - 0.5) * 5 });
      else if (k === 8) audio.metalGroan({ x: rx, y: 4, z: rz });
      else if (k === 9) audio.thump({ x: rx, y: 3, z: rz });
      else { audio.thunder(0.2 + r() * 0.4); ui.flash(0.03); }
    }
    const scary = !WORK && !L.power;
    if (scary) { updateCats(dt); updateDrops(dt); }
    updateArrows(dt); strangerUpdate(dt);
    { const gl = goal; objGlow.visible = !!gl; if (gl) { objGlow.position.set(gl[0], 1.5 + Math.sin(tl * 2) * 0.1, gl[1]); objGlow.material.opacity = 0.45 + Math.sin(tl * 3) * 0.2; } }
    if (!WORK) for (const g of eas) { g.cd -= dt; if (g.cd <= 0 && Math.abs(P.pos.x - g.x) < 0.8 && Math.abs(P.pos.z - g.z) < 0.5) { g.cd = 6; audio.easBeep({ x: g.x, y: 1, z: g.z }); L.onNoise(28, g.x, g.z, 'loud'); ui.toast('SECURITY GATE ALARM'); } }
    for (const n of nightLights) { if (n.l.intensity === 0 && L.power) continue; if (n.flick) { n.f = Math.random() < 0.05 ? Math.random() * 0.2 : Math.min(1, n.f + dt * 4); } n.l.intensity = L.power ? 0 : n.base * n.f; n.tube.visible = !L.power && n.f > 0.5; }
    if (alarmOn) { alarmT += dt; const on = Math.floor(alarmT * 6) % 2 === 0; strobes.forEach((l, i) => (l.intensity = on && (i % 2 === Math.floor(alarmT * 3) % 2) ? 40 : 0)); }
    updatePeople(dt);
    if (dockOpen && dockDoor.position.y < 5.5) dockDoor.position.y += dt * 1.6;
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
    const label = (t, x, z) => { const w = c.measureText(t).width + 8; c.fillStyle = 'rgba(233,227,211,0.92)'; c.fillRect(x * sx - w / 2, z * sz - 11, w, 15); c.fillStyle = '#1d1b17'; c.fillText(t, x * sx, z * sz); };
    [['BREAK ROOM', 6.5, 5], ['OFFICE', 18, 7], ['ELECTRICAL', 28.5, 7], ['RECEIVING / DOCK', 48, 9.5], ['GRILL', 3.5, 41], ['CHECKOUT', 20, 38.2], ['PRO DESK', 46.5, 37.9], ['SHEDS', 53, 38.6], ['APPLIANCES', 57.5, 11.4], ['ENTRANCE', 31.5, 44]].forEach(([t, x, z]) => label(t, x, z));
    for (let a = 1; a <= 9; a++) c.fillText(String(a), (6 * a + 2) * sx, 24 * sz);
    if (goal) { c.strokeStyle = '#b3261e'; c.lineWidth = 3; c.beginPath(); c.arc(goal[0] * sx, goal[1] * sz, 9, 0, Math.PI * 2); c.stroke(); }
    c.save(); c.translate(P.pos.x * sx, P.pos.z * sz); c.rotate(-P.yaw); c.fillStyle = '#b3261e'; c.beginPath(); c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore();
    c.font = '11px Oswald, sans-serif'; c.textAlign = 'left'; const lg = 'YOU ARE HERE (red arrow) · OBJECTIVE (red circle)'; c.fillStyle = 'rgba(233,227,211,0.95)'; c.fillRect(W - c.measureText(lg).width - 16, 2, c.measureText(lg).width + 12, 15); c.fillStyle = '#1d1b17'; c.fillText(lg, W - c.measureText(lg).width - 10, 13);
  };
  L.dispose = () => { police.forEach((l) => (l.userData.on = false)); document.getElementById('timer').textContent = ''; dirEl.style.opacity = 0; G.camera.remove(carry); ui.bigHint(''); };
  return L;
}
