// LEVEL 1 — PART A: "The Walk Home". Juan and Santiago walk home → the street feels wrong → ICE → run.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792004918';
import { tex, textTex, facadeTex, rng } from './textures.js?v=1792004918';
import { makeHumanoid, makeCharacter, makeVehicle, makeStatic, animateWalk, makeBeam, makeGlow, makeCar, makeTree, std } from './models.js?v=1792004918';

const LINES = {
  u1: { id: 'st_u1', who: 'Santiago', text: '...Hey. That car. It\'s been behind us since the bus stop.' },
  u3: { id: 'st_u3', who: 'Santiago', text: 'Juan... that guy in the alley. He\'s not smoking. He\'s just... watching us.' },
  u4: { id: 'st_u4', who: 'Santiago', text: 'Walk normal. Walk normal, güey. Don\'t run.' },
  ice: { id: 'st_ice', who: 'Agent', text: 'ICE! Stop right there! Hands where I can see them!', agent: true },
  after: { id: 'st_after', who: 'Juan', text: 'Santi... no. No, no, no...' },
  news: { id: 'st_news', who: 'Radio', text: '...and in Boyle Heights tonight, residents are reporting unmarked vehicles along Whittier Boulevard. Federal officials have not confirmed any enforcement operation...', radio: true },
  rosa1: { id: 'st_rosa1', who: 'Doña Rosa (phone)', text: 'Mijo? It\'s Rosa. Santiago\'s phone is dead again, ¿verdad? Where are you two? The pozole is getting cold.', radio: true },
  mp1: { id: 'st_mphone1', who: 'Juan', text: 'We just got off the bus, Doña Rosa. Ten minutes.' },
  rosa2: { id: 'st_rosa2', who: 'Doña Rosa (phone)', text: 'Come straight down Whittier, past the big Hammerline sign. Don\'t take the alleys tonight, mijo. Lupe says she saw trucks. And tell Santiago to bring tortillas.', radio: true },
  mp2: { id: 'st_mphone2', who: 'Juan', text: 'Sí, señora. Straight down Whittier.' },
  r0: { id: 'st_r0', who: 'Santiago', text: 'Was that my mom? Tell her I love her. And that I\'m not buying tortillas.' },
  rfollow: { id: 'st_rfollow', who: 'Santiago', text: 'Come on, güey, stay close. Let\'s go eat.' },
  rwait: { id: 'st_rwait', who: 'Santiago', text: 'Juan! This way, güey. Come on.' },
  a3: { id: 'st_a3', who: 'Agent', text: 'Hey! Get back here!', agent: true },
  r1: { id: 'st_r1', who: 'Santiago', text: 'Ay, my back, güey. Twelve hours of drywall. Tomorrow I\'m calling in sick.' },
  m1: { id: 'st_m1', who: 'Juan', text: 'You said that yesterday.' },
  r2: { id: 'st_r2', who: 'Santiago', text: 'And yesterday I meant it too. So... Saturday. Luz\'s party. You got the bike?' },
  m2: { id: 'st_m2', who: 'Juan', text: 'The pink one, with the streamers. Hammerline has it on sale. Dale pays me tonight, I pick it up.' },
  r3: { id: 'st_r3', who: 'Santiago', text: 'Dale? That guy owes me three weeks, carnal. Three.' },
  m3: { id: 'st_m3', who: 'Juan', text: 'He\'ll pay. He always says Friday.' },
  r4: { id: 'st_r4', who: 'Santiago', text: 'With Dale, every day is Friday.' },
  cat: { id: 'st_rcat', who: 'Santiago', text: 'Ay! Stupid cat. Almost gave me a heart attack.' },
  r5: { id: 'st_r5', who: 'Santiago', text: '...Hey. That truck. It\'s been parked there since we got off the bus.' },
  m4: { id: 'st_m4', who: 'Juan', text: 'Don\'t look at it. Just keep walking.' },
  r6: { id: 'st_r6', who: 'Santiago', text: 'Mateo... it doesn\'t have plates.' },
  a1: { id: 'st_a1', who: 'Agent', text: 'Federal agents! Get on the ground! Ground, now!', agent: true },
  r7: { id: 'st_r7', who: 'Santiago', text: 'Juan! ¡Corre! Run!' },
  a2: { id: 'st_a2', who: 'Agent', text: 'One down! The other one\'s running! East side, toward the hardware store!', agent: true },
};
export const STREET_VO = Object.values(LINES).map((l) => l.id);

export function createStreet(G, opts = {}) {
  const { audio, ui, P, game, flash } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1514);
  scene.fog = new THREE.FogExp2(0x1a2826, 0.045);
  const grid = new Grid(80, 140, -25, -125);
  grid.fillAll(1, 1);
  grid.rect(-9, -120, 8, 12, 0, 0);       // road + sidewalks
  grid.rect(9, -64, 47, -57, 0, 0);       // driveway / alley to Hammerline
  grid.rect(38, -66, 41, -65, 0, 0);      // loading dock opening
  const L = { scene, grid, interactables: [], allowFlashlight: false, surface: 'wet', speedMul: 1, allowSprint: true };
  const r = rng(4242);

  // ---- lighting ----
  const hemi = new THREE.HemisphereLight(0x5a8078, 0x0a0f0e, 0.2); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8ab0a8, 0.3); moon.position.set(-20, 40, 10); scene.add(moon);

  // ---- ground ----
  const asph = std(0xffffff, { map: tex('asphalt', [3, 40]), roughnessMap: tex('wetRough', [4, 50], false), roughness: 0.55, metalness: 0.1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 140), asph); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -55); road.receiveShadow = true; scene.add(road);
  const swMat = std(0xffffff, { map: tex('sidewalk', [2, 70]), roughnessMap: tex('wetRough', [2, 40], false), roughness: 0.7 });
  for (const sx of [-7, 7]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 140), swMat); sw.position.set(sx, 0.075, -55); sw.receiveShadow = true; scene.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 140), std(0x8a8a84)); curb.position.set(sx > 0 ? 5 : -5, 0.08, -55); scene.add(curb);
  }
  // lane markings
  const dashM = std(0xb8a560, { roughness: 0.5 });
  for (let z = 10; z > -120; z -= 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), dashM); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.01, z); scene.add(d); }
  // alley pavement
  const alley = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), std(0xffffff, { map: tex('asphalt', [6, 1.5]), roughnessMap: tex('wetRough', [5, 1], false), roughness: 0.6 }));
  alley.rotation.x = -Math.PI / 2; alley.position.set(29, 0.005, -60.5); scene.add(alley);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x0d0e0e)); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; scene.add(outer);

  // ---- buildings ----
  const shopNames = [['PANADERÍA', 'LA ESPERANZA'], ['LAVANDERÍA', 'COIN LAUNDRY'], ['CARNICERÍA', 'EL GÜERO'], ['ENVÍOS', 'DE DINERO'], ['TACOS', 'EL PRIMO'], ['BOTÁNICA', 'SAN MIGUEL'], ['MUEBLES', 'GARCÍA'], ['LIQUOR', 'BEER · WINE'], ['DENTISTA', 'SE HABLA ESPAÑOL'], ['ZAPATERÍA', 'LUPITA'], ['CHECK', 'CASHING'], ['PELUQUERÍA', 'ESTILOS']];
  const wallCols = ['#5b5048', '#4b5552', '#6a5a46', '#50463f', '#5d5a52', '#47504c'];
  const awnCols = [0x6e1d1a, 0x1d4a3a, 0x24304e, 0x6a4a18, 0x3a1d40];
  const neon = [];
  const neonLights = [];
  const windowMats = [];
  let shopI = 0;
  function building(side, z0, len) {
    const h = 7 + r() * 8, depth = 12;
    const floors = Math.max(2, Math.round(h / 3.4)), cols = Math.max(2, Math.round(len / 3));
    const fac = facadeTex(1000 + shopI * 7, floors, cols, wallCols[shopI % wallCols.length]);
    const front = std(0xffffff, { map: fac.map, emissiveMap: fac.emissive, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.9 });
    windowMats.push(front);
    const sideM = std(0xffffff, { map: tex(r() < 0.5 ? 'brick' : 'stucco', [3, 2]), roughness: 0.95 });
    const mats = side < 0 ? [front, sideM, sideM, sideM, sideM, sideM] : [sideM, front, sideM, sideM, sideM, sideM];
    const fx = side * 9; // facade plane x
    const b = new THREE.Mesh(new THREE.BoxGeometry(depth, h, len), mats);
    b.position.set(fx + side * depth / 2, h / 2, z0 - len / 2); b.castShadow = b.receiveShadow = true; scene.add(b);
    // storefront: shutter + sign + awning
    const sw = len * 0.82, n = shopNames[shopI % shopNames.length];
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(sw, 3), std(0xffffff, { map: tex('shutter', [Math.max(1, sw / 3), 1]), roughness: 0.6, metalness: 0.4 }));
    sh.position.set(fx - side * 0.03, 1.5, z0 - len / 2); sh.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(sh);
    const lit = r() < 0.45;
    const signT = textTex(512, 128, '#1a1612', [{ text: n[0], size: 54, color: '#e9dcc0', y: 50 }, { text: n[1], size: 26, color: '#c8b28a', y: 100, weight: 'normal' }], { border: '#3a3026', grime: true });
    const NEON = [0xff3a4a, 0x3aff8a, 0xff5ac8, 0x4aa8ff, 0xffb040];
    const ncol = NEON[shopI % NEON.length];
    const signM = std(0xffffff, { map: signT, emissiveMap: signT, emissive: lit ? ncol : 0x000000, emissiveIntensity: lit ? 1.6 : 0 });
    if (lit && neonLights.length < 6) { const nl = new THREE.PointLight(ncol, 9, 11, 1.5); nl.position.set(fx - side * 1.6, 3.6, z0 - len / 2); scene.add(nl); neonLights.push(nl); const ng = makeGlow(ncol, 2.2, 0.5); ng.position.set(fx - side * 0.4, 3.75, z0 - len / 2); scene.add(ng); neonLights.push(ng); }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, sw), [signM, signM, std(0x111111), std(0x111111), std(0x111111), std(0x111111)]);
    sign.position.set(fx - side * 0.1, 3.75, z0 - len / 2); scene.add(sign);
    if (lit) neon.push(signM);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, sw), std(awnCols[shopI % awnCols.length], { roughness: 0.8 }));
    awn.position.set(fx - side * 0.7, 3.05, z0 - len / 2); awn.rotation.z = side * -0.35; awn.castShadow = true; scene.add(awn);
    shopI++;
  }
  for (const side of [-1, 1]) {
    let z = 14;
    while (z > -122) {
      const len = 8 + Math.floor(r() * 7);
      if (side > 0 && z - len < -54 && z > -67) { z = -67; continue; } // keep driveway open
      building(side, z, len); z -= len;
    }
  }
  // Hammerline building behind the east shops, with dock on the driveway
  const blockM = std(0xffffff, { map: tex('block', [10, 3]), roughness: 0.95 });
  const store = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 50), blockM); store.position.set(41, 5, -89.2); scene.add(store);
  const dockFrame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.6, 0.3), std(0x2a2a2a)); dockFrame.position.set(40, 2.3, -64.1); scene.add(dockFrame);
  const dockHole = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4), new THREE.MeshBasicMaterial({ color: 0x000000 })); dockHole.position.set(40, 2.1, -63.9); scene.add(dockHole);
  const dockLamp = new THREE.PointLight(0xffc070, 6, 9, 1.6); dockLamp.position.set(40, 4.8, -63); scene.add(dockLamp);
  const dockGlow = makeGlow(0xffc070, 1.2, 0.8); dockGlow.position.set(40, 4.8, -63.7); scene.add(dockGlow);
  const dockSignT = textTex(256, 64, '#0f0f0f', [{ text: 'RECEIVING — NO PARKING', size: 22, color: '#e2d6b8' }]);
  const dockSign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), std(0xffffff, { map: dockSignT })); dockSign.position.set(40, 5.0, -63.9); scene.add(dockSign);
  // north side of driveway: chain-link fence
  const fenceM = new THREE.MeshStandardMaterial({ map: tex('chainlink', [20, 1.2], false), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x999999, metalness: 0.6 });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(36, 2.4), fenceM); fence.position.set(29, 1.2, -56.95); scene.add(fence);
  // pole sign
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 8), std(0x333333, { metalness: 0.5 })); pole.position.set(10.5, 4.5, -56.6); scene.add(pole);
  const hlT = textTex(512, 256, '#d8541c', [{ text: 'HAMMERLINE', size: 92, color: '#fff', y: 100 }, { text: 'DEPOT  ·  OPEN TIL 11', size: 40, color: '#fff', y: 190 }]);
  const hlM = std(0xffffff, { map: hlT, emissiveMap: hlT, emissive: 0xffffff, emissiveIntensity: 1.2 });
  const hlSign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 6), [hlM, hlM, std(0x222222), std(0x222222), std(0x222222), std(0x222222)]);
  hlSign.position.set(10.5, 9.5, -56.6); scene.add(hlSign); neon.push(hlM);

  // ---- props: cars, trees, poles, wires, dumpsters, bus stop ----
  const carCols = [0x4a4f55, 0x6b1f1f, 0x2b3a4a, 0x8a8478, 0x1e3a2a, 0x3b3b3b];
  const parked = [[-3.8, 2], [-3.8, -12], [-3.8, -24], [-3.8, -45], [3.8, -8], [3.8, -20], [3.8, -38], [3.8, -74], [-3.8, -98], [3.8, -92], [-3.8, -110]];
  const civTints = [0x6a6a66, 0x3a4658, 0x5a3434, 0x3a4a3c, 0x4a4a48, 0x2e2e36];
  for (const [x, z] of parked) {
    const c = makeVehicle('suv', 4.3, civTints[(r() * civTints.length) | 0], 0.3) || makeCar(carCols[(r() * carCols.length) | 0]); c.position.set(x, 0, z); c.rotation.y = x < 0 ? 0 : Math.PI; scene.add(c);
    grid.rect(Math.floor(x - 1), Math.floor(z - 2.3), Math.floor(x + 0.9), Math.floor(z + 2.2), 1, 0);
  }
  // ICE vehicles: textured GLB SUV (falls back to the box car)
  const iceLights = [];
  function makeICE() {
    const v = makeVehicle('suv', 4.8, 0x161616, 0.6); // blacked out
    if (!v) return makeCar(0x0a0b0c, true);
    const hl = [];
    for (const sx of [-0.72, 0.72]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.04), std(0x222222, { emissive: 0x000000 })); m.position.set(sx, 1.05, 2.62); v.add(m); hl.push(m); }
    for (const [sx, col] of [[-0.3, 0x2040ff], [0.3, 0xff2020]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: 0x111111 })); m.position.set(sx, 0.95, 2.64); m.userData.col = col; v.add(m); iceLights.push(m); }
    v.userData.headlights = hl; return v;
  }
  // the SUV
  const suv = makeICE(); suv.position.set(-3.7, 0, -80); scene.add(suv);
  grid.rect(-5, -83, -3, -78, 1, 0);
  const headL = [];
  for (const s of [-1, 1]) {
    const sl = new THREE.SpotLight(0xf0f4ff, 0, 70, 0.32, 0.35, 1.1);
    sl.position.set(-3.7 + s * 0.7, 1.0, -77.5); sl.target.position.set(1 + s * 2, 0.3, -40); scene.add(sl); scene.add(sl.target);
    const gl = makeGlow(0xffffff, 2.5, 0); gl.position.set(-3.7 + s * 0.7, 1.0, -77.4); scene.add(gl);
    headL.push({ sl, gl });
  }
  // streetlights
  const lamps = [];
  const lampZ = [6, -12, -30, -48, -66, -84, -102];
  lampZ.forEach((z, i) => {
    const side = i % 2 ? -1 : 1, x = side * 7.8;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.4, 6), std(0x2a2d2e, { metalness: 0.6, roughness: 0.5 })); p.position.set(x, 3.2, z); scene.add(p);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), std(0x2a2d2e)); arm.position.set(x - side * 0.9, 6.3, z); scene.add(arm);
    const lampCol = i % 3 === 1 ? 0xffaa58 : 0xd6f0dc;
    const headM = std(0x222222, { emissive: lampCol, emissiveIntensity: 2.5 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.35), headM); head.position.set(x - side * 1.7, 6.2, z); scene.add(head);
    const light = new THREE.PointLight(lampCol, 32, 24, 1.5); light.position.set(x - side * 1.7, 5.9, z); scene.add(light);
    const glow = makeGlow(lampCol, 3.2, 0.85); glow.position.set(x - side * 1.7, 6.0, z); scene.add(glow);
    const cone = makeBeam(6.2, 3.2, lampCol, 0.09); cone.position.set(x - side * 1.7, 6.1, z); cone.rotation.x = Math.PI / 2; scene.add(cone);
    lamps.push({ light, headM, glow, cone, z, on: true, x: x - side * 1.7, flick: i === 2 || i === 4, f: 1 });
  });
  // telephone poles + wires
  const wireM = new THREE.LineBasicMaterial({ color: 0x050505 });
  let prevTop = null;
  for (let z = 10; z > -120; z -= 26) {
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 9, 6), std(0x2b231c)); tp.position.set(-8.6, 4.5, z); scene.add(tp);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), std(0x2b231c)); cross.position.set(-8.6, 8.4, z); scene.add(cross);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), std(0x3a3d3e, { metalness: 0.5 })); tr.position.set(-8.1, 7.6, z); scene.add(tr);
    if (prevTop !== null) for (const dx of [-1, 0, 1]) {
      const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(-8.6 + dx, 8.45 - Math.sin(t * Math.PI) * 0.7, prevTop + (z - prevTop) * t)); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
    }
    prevTop = z;
  }
  // (trees removed: they didn't fit the look)
  // dumpster (cat jumps off it)
  const dumpM = std(0x1f3a2a, { roughness: 0.6, metalness: 0.3 });
  const dump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 2.4), dumpM); dump.position.set(8.0, 0.8, -26); dump.castShadow = true; scene.add(dump);
  grid.rect(7, -28, 8, -25, 1, 0);
  for (const [x, z] of [[20, -62], [33, -58.2]]) { const d = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 1.6), dumpM); d.position.set(x, 0.65, z); scene.add(d); grid.rect(Math.floor(x - 1.2), Math.floor(z - 0.8), Math.floor(x + 1.1), Math.floor(z + 0.7), 1, 1); }
  // bus stop
  const shelter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 3.5), std(0x333333)); shelter.position.set(7.8, 2.5, 8); scene.add(shelter);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 2.5), std(0x3a3a3a)); bench.position.set(8.3, 0.4, 8); scene.add(bench);
  const busT = textTex(256, 128, '#20262a', [{ text: 'METRO', size: 44, color: '#e0d8c0', y: 46 }, { text: '18 · WHITTIER BL', size: 24, color: '#b8b098', y: 94, weight: 'normal' }]);
  const busPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), std(0x3a3d3e, { metalness: 0.6 })); busPole.position.set(6.2, 1.4, 10.5); scene.add(busPole);
  const busSign = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.9), [std(0xffffff, { map: busT }), std(0xffffff, { map: busT }), std(0x20262a), std(0x20262a), std(0x20262a), std(0x20262a)]); busSign.position.set(6.2, 2.55, 10.5); scene.add(busSign);
  for (const z of [6.4, 9.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), std(0x3a3d3e, { metalness: 0.6 })); leg.position.set(7.2, 1.25, z); scene.add(leg); }

  // ---- sky glow + rain ----
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 16, 8), new THREE.MeshBasicMaterial({ color: 0x15211f, side: THREE.BackSide, fog: false })); scene.add(sky);
  const RAIN = 2600, rainPos = new Float32Array(RAIN * 6);
  for (let i = 0; i < RAIN; i++) { const x = (Math.random() - 0.5) * 40, y = Math.random() * 18, z = (Math.random() - 0.5) * 40; rainPos.set([x, y, z, x + 0.03, y - 0.45, z], i * 6); }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fb4bf, transparent: true, opacity: 0.2 }));
  rain.frustumCulled = false; scene.add(rain);

  // ---- black cat (false scare) ----
  const cat = new THREE.Group();
  const catM = std(0x050505, { roughness: 0.4 });
  const cb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.45), catM); cb.position.y = 0.22; cat.add(cb);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.14), catM); ch.position.set(0, 0.32, 0.27); cat.add(ch);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), catM); tail.position.set(0, 0.32, -0.33); tail.rotation.x = 0.6; cat.add(tail);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xd8f070 })); e.position.set(s * 0.035, 0.34, 0.345); cat.add(e); }
  cat.position.set(-7.0, 0.15, -14); cat.visible = false; scene.add(cat);
  { const glb = makeVehicle('cat', 0.75, 0x3a3a3a, 0.5); if (glb) { cat.children.slice().forEach((ch) => cat.remove(ch)); cat.add(glb); for (const sx of [-0.04, 0.04]) { const e = makeGlow(0xd8ff70, 0.12, 1); e.position.set(sx, 0.36, 0.34); cat.add(e); } } }
  let catT = -1, catState = 'idle', catFrom = null;
  const catLight = new THREE.PointLight(0xd8e8e0, 3, 4, 1.6); catLight.position.set(-7, 2.4, -14); scene.add(catLight);

  // ---- characters ----
  const rafa = makeCharacter('rafa', { shirt: 0x6a3a2a, pants: 0x2e3a4e, hat: 'cap', hatColor: 0x7a2020, skin: 0x9a6644, mustache: true }, 1.74);
  rafa.group.position.set(7.4, 0.15, 5); scene.add(rafa.group);
  let rafaPhase = 0, rafaState = 'walk', rafaFall = 0;
  const agents = [];
  function makeAgent(x, z) {
    const h = makeCharacter('agent', { agent: true, flashlight: true, hat: 'cap', gloves: true, skin: 0x8a6a55 }, 1.85);
    h.group.position.set(x, 0, z); scene.add(h.group);
    const sl = new THREE.SpotLight(0xe6eeff, 26, 28, 0.35, 0.5, 1.2); scene.add(sl); scene.add(sl.target);
    const beam = makeBeam(9, 1.8, 0xe6eeff, 0.12); h.group.add(beam); beam.position.set(0.3, 1.45, 0.4); beam.rotation.x = 0.08;
    const a = { h, sl, beam, phase: 0, speed: 0, target: null, path: null, pi: 0, repath: 0, role: 'idle', stepAcc: 0 };
    agents.push(a); return a;
  }

  // ---- passing cars (before the blackout) ----
  const traffic = [];
  function spawnTraffic() {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const c = makeCar(carCols[(Math.random() * carCols.length) | 0]);
    c.position.set(dir < 0 ? -2.2 : 2.2, 0, dir < 0 ? 40 : -125); c.rotation.y = dir < 0 ? Math.PI : 0;
    c.userData.headlights.forEach((m) => { m.material.emissive.setHex(0xffffff); m.material.emissiveIntensity = 3; });
    const l = new THREE.PointLight(0xfff2d8, 30, 18, 1.4); l.position.set(0, 1, dir < 0 ? -3.5 : 3.5); c.add(l);
    for (const sx of [-0.7, 0.7]) { const gl = makeGlow(0xffffff, 1.4, 0.8); gl.position.set(sx, 0.9, dir < 0 ? -2.3 : 2.3); c.add(gl); }
    scene.add(c); traffic.push({ c, dir, v: 11 + Math.random() * 5, passed: false });
  }
  let trafficT = 4;

  // ---- the second SUV that roars in from behind ----
  const suv2 = makeICE(); suv2.visible = false; scene.add(suv2);
  const suv2L = [-1, 1].map((sx) => { const sl = new THREE.SpotLight(0xf0f4ff, 0, 60, 0.35, 0.4, 1.1); scene.add(sl); scene.add(sl.target); return sl; });
  let suv2T = -1, suv2Stop = 0;

  // ---- helicopter searchlight (jumpscare during the run) ----
  const heli = new THREE.SpotLight(0xf4f8ff, 0, 90, 0.16, 0.3, 1.0); heli.position.set(20, 45, -40); scene.add(heli); scene.add(heli.target);
  const heliBeam = makeBeam(48, 7, 0xe8f0ff, 0.06); heliBeam.visible = false; scene.add(heliBeam);
  let heliT = -1;
  // ---- objective marker over Rafa ----
  const mk = document.createElement('canvas'); mk.width = mk.height = 32; const mx = mk.getContext('2d');
  mx.fillStyle = '#e9dcc0'; mx.beginPath(); mx.moveTo(8, 6); mx.lineTo(24, 6); mx.lineTo(16, 20); mx.closePath(); mx.fill();
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mk), depthTest: false, transparent: true }));
  marker.scale.set(0.35, 0.35, 0.35); marker.visible = false; marker.renderOrder = 10; scene.add(marker);

  // ---- the build-up: things that are wrong on this street ----
  const followCar = makeVehicle('suv', 4.3, 0x1a1c20, 0.5) || makeCar(0x1a1c20);
  followCar.position.set(1.8, 0, 40); followCar.rotation.y = Math.PI; followCar.visible = false; scene.add(followCar);
  const followL = [-1, 1].map(() => { const sl = new THREE.SpotLight(0xf0f4ff, 0, 55, 0.4, 0.4, 1.1); scene.add(sl); scene.add(sl.target); return sl; });
  let followOn = false, followLit = false;
  const watcherFig = makeStatic('watcher', 1.82);
  if (watcherFig) { watcherFig.position.set(-8.3, 0.15, -37); watcherFig.rotation.y = Math.PI / 2; scene.add(watcherFig); }
  const mirrorMan = makeCharacter('gus', { shirt: 0x222222, pants: 0x222222 }, 1.8);
  mirrorMan.group.traverse((m) => { if (m.isMesh && m.material) m.material.color.multiplyScalar(0.3); });
  mirrorMan.group.position.set(-7.0, 0.15, -30); mirrorMan.group.visible = false; scene.add(mirrorMan.group);
  let mirrorOn = false, mirrorPhase = 0, echoAcc = 0, lastMoving = false;
  // ---- story / script ----
  const lines = (...k) => ui.say(k.map((x) => LINES[x]));
  let phase = opts.blackout ? 'dark' : 'intro', tl = 0, darkT = 0, waitCD = 0;
  const events = [];
  const amb = { light: 10, flashT: 0, drip: 1, wind: 6 };
  const at = (t, fn) => events.push({ t: tl + t, fn });
  P.pos.set(6.4, 0, 6); P.yaw = 0.15; P.pitch = -0.02;
  ui.objective('');
  ui.clock('11:41 PM');
  audio.rainBed(); audio.setLoop('rain', 0.16, 2);
  audio.cityBed(); audio.setLoop('city', 0.14, 2);
  audio.preloadVo(STREET_VO);
  game.retry = () => G.loadLevel((g) => createStreet(g, { blackout: true }));
  G.phone.state.hasPhone = true; G.phone.state.battery = 0.41;
  if (!G.phone.state.threads.Rosa.length) G.phone.history('Rosa', [[false, 'Mijo the pozole is ready. Ten o clock. Both of you.'], [true, 'Si señora']]);

  // Santiago leads the way down the east sidewalk
  const route = [[7.0, 2], [6.8, -10], [6.6, -24], [6.2, -27.5], [6.6, -31], [6.8, -44], [7.0, -55]];
  let ri = 0;
  const lookBack = { done: false, t: -1 };
  let wrongT = 0, lastPX = 0, lastPZ = 0;

  function killLamp(lp, bang) {
    lp.on = false; lp.light.intensity = 0; lp.headM.emissiveIntensity = 0; lp.glow.visible = false; lp.cone.visible = false;
    if (bang) audio.transformer({ x: lp.x, y: 6, z: lp.z }); else audio.lampOff({ x: lp.x, y: 6, z: lp.z });
  }
  function startBlackout(fast) {
    phase = 'blackout'; tl = 0; events.length = 0;
    ui.objective(''); marker.visible = false; ui.cancelSay();
    traffic.forEach((t) => scene.remove(t.c)); traffic.length = 0; rain.visible = false;
    const order = [...lamps].sort((a, b) => a.z - b.z);
    const step = fast ? 0.08 : 0.22;
    if (!fast) at(0.1, () => audio.powerDown({ x: 0, y: 5, z: P.pos.z - 30 }));
    order.forEach((lp, i) => at(0.2 + i * step, () => killLamp(lp, i === 0)));
    const tDark = 0.2 + order.length * step;
    at(tDark, () => { neon.forEach((m) => (m.emissiveIntensity = 0)); neonLights.forEach((n) => { if (n.isLight) n.intensity = 0; else n.visible = false; }); windowMats.forEach((m) => (m.emissiveIntensity = 0)); dockLamp.intensity = 0; dockGlow.visible = false; hemi.intensity = 0.05; moon.intensity = 0.05; audio.setLoop('city', 0, 0.3); audio.setLoop('rain', 0.1, 1); audio.droneBed(); audio.setLoop('drone', 0.5, 4); });
    // the car behind snaps its lights on; a man steps out of it
    at(tDark + 1.4, () => {
      followCar.visible = true; followCar.position.set(1.8, 0, P.pos.z + 12); followLit = true;
      followL.forEach((l) => (l.intensity = 150)); audio.hit(0.9); ui.flash(0.2);
      for (let i = 0; i < 3; i++) audio.tone({ freq: 900, freqTo: 1500, dur: 0.18, type: 'square', gain: 0.05, when: i * 0.25, filter: 2500, pos: { x: 1.8, y: 1, z: P.pos.z + 12 } });
    });
    at(tDark + 2.0, () => { audio.carDoor({ x: 3, y: 1, z: P.pos.z + 11 }); makeAgent(3.0, P.pos.z + 10.5).role = 'chase'; });
    at(tDark + 2.3, () => { ui.bark(LINES.ice); audio.radio({ x: 3, y: 1.5, z: P.pos.z + 10 }); });
    at(tDark + 2.6, () => { if (watcherFig) watcherFig.visible = false; const w = makeAgent(-7.6, -37); w.role = 'chase'; w.delay = 1.2; });
    at(tDark + 3.6, () => {
      ui.bark(LINES.r7); rafaState = 'runWithYou';
      phase = 'run'; L.allowSprint = true; L.speedMul = 1; darkT = 0;
      L.chaseRun = true; wrongT = 0;
      ui.objective('RUN. Down the driveway past the Hammerline sign, to the loading dock.');
      ui.bigHint('RUN<small>DON\'T STOP. DOWN THE STREET, INTO THE DRIVEWAY ON YOUR RIGHT</small>'); setTimeout(() => { if (wrongT < 1) ui.bigHint(''); }, 3500);
      agents.forEach((a) => { if (a.role === 'chase') a.role = 'chaseGo'; });
    });
  }

  if (opts.blackout) {
    rain.visible = false;
    P.pos.set(6.4, 0, -52); rafa.group.position.set(7.0, 0.15, -53); ri = route.length;
    lamps.forEach((lp) => killLamp(lp, false));
    phase = 'walk'; startBlackout(true);
  } else {
    // opening: black screen, late-night radio news, the bus pulling away
    P.frozen = true;
    at(0.05, () => { const f = document.getElementById('fade'); f.style.transition = 'none'; f.style.opacity = 1; });
    at(0.6, () => { ui.say([LINES.news]); audio.tone({ freq: 48, dur: 9, type: 'sawtooth', gain: 0.06, filter: 200 }); });
    at(9.5, () => { audio.noise({ dur: 0.8, type: 'highpass', freq: 2000, gain: 0.25 }); ui.fade(0, 2.5); ui.clock('11:41 PM'); });
    at(10.5, () => { audio.tone({ freq: 50, freqTo: 90, dur: 4, type: 'sawtooth', gain: 0.12, filter: 400, pos: { x: 3, y: 1, z: -10 } }); });
    at(9.6, () => { P.frozen = false; });
    at(13.0, () => { audio.vibrate(); ui.toast('INCOMING CALL — DOÑA ROSA'); });
    at(14.5, () => { audio.vibrate(); });
    at(16.0, () => { lines('rosa1', 'mp1', 'rosa2', 'mp2', 'r0', 'rfollow').then(() => { P.frozen = false; P.lookLock = null; if (phase === 'intro') { phase = 'walk'; ui.objective('Walk home with Santiago. Straight down Whittier, past the Hammerline sign.'); lines('r1', 'm1');
        G.phone.receive('Luz', 'papi mami said i can stay up til you get home', 14, 0).then(() => G.phone.receive('Luz', 'te quiero papi. hurry!!', 6, 0));
      } }); });
  }
  const triggers = [
    { p: 14, fn: () => lines('r2', 'm2') },
    { p: 20, fn: () => { followOn = true; followCar.visible = true; followCar.position.set(1.8, 0, P.pos.z + 26); } },
    { p: 12, fn: () => { catState = 'walk'; cat.position.set(-7.0, 0.15, P.pos.z - 16); } },
    { p: 30, fn: () => lines('r3', 'm3', 'r4') },
    { p: 36, fn: () => lines('u1', 'm4') },
    { p: 41, fn: () => { lines('u3'); audio.radio({ x: -8.3, y: 1.5, z: -37 }, 0.25); } },
    { p: 46, fn: () => { mirrorOn = true; mirrorMan.group.visible = true; mirrorMan.group.position.set(-7.0, 0.15, P.pos.z - 2); lines('u4'); } },
    { p: 49, fn: () => { audio.radio({ x: -8.5, y: 1.5, z: P.pos.z - 6 }, 0.4); } },
    { p: 54, fn: () => { if (phase === 'walk') startBlackout(false); } },
  ];

  // ---- per-frame ----
  function moveAgent(a, tx, tz, speed, dt) {
    a.repath -= dt;
    if (!a.path || a.repath <= 0) { a.path = grid.path(a.h.group.position.x, a.h.group.position.z, tx, tz) || []; a.pi = 0; a.repath = 0.35; }
    const p = a.path[a.pi];
    const g = a.h.group.position;
    if (!p) { a.speed = 0; return; }
    const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { a.pi++; return; }
    const st = Math.min(d, speed * dt);
    g.x += dx / d * st; g.z += dz / d * st;
    const want = Math.atan2(dx, dz); let diff = want - a.h.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    a.h.group.rotation.y += diff * Math.min(1, dt * 8);
    a.speed = speed;
  }

  L.update = (dt) => {
    // rain follows camera
    rain.position.set(P.pos.x, 0, P.pos.z);
    const rp = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN; i++) { const k = i * 6; let y = rp[k + 1] - dt * 19; if (y < 0) y += 18; rp[k + 1] = y; rp[k + 4] = y - 0.45; }
    rainGeo.attributes.position.needsUpdate = true;
    amb.light -= dt; amb.drip -= dt; amb.wind -= dt;
    if (amb.light <= 0 && phase !== 'blackout' && phase !== 'run') {
      amb.light = 16 + Math.random() * 26; const near = Math.random();
      amb.flashT = 0.35; ui.flash(0.06 + near * 0.12);
      setTimeout(() => audio.thunder(near), (1 - near) * 3500 + 200);
    }
    if (amb.flashT > 0) { amb.flashT -= dt; const on = (amb.flashT > 0.25 || (amb.flashT > 0.05 && amb.flashT < 0.15)); hemi.intensity = on ? 1.4 : (phase === 'walk' || phase === 'intro' ? 0.2 : 0.05); }
    if (amb.drip <= 0) { amb.drip = 0.4 + Math.random() * 1.6; audio.drip({ x: P.pos.x + (Math.random() - 0.5) * 8, y: 2 + Math.random() * 2, z: P.pos.z + (Math.random() - 0.5) * 8 }); }
    if (amb.wind <= 0) { amb.wind = 12 + Math.random() * 15; audio.wind(); }
    // flickering streetlights
    for (const lp of lamps) if (lp.on && lp.flick) {
      lp.f = Math.random() < 0.04 ? Math.random() * 0.25 : Math.min(1, lp.f + dt * 5);
      lp.light.intensity = 32 * lp.f; lp.headM.emissiveIntensity = 2.5 * lp.f; lp.glow.material.opacity = 0.85 * lp.f;
      if (lp.f < 0.3 && Math.random() < 0.3 && Math.hypot(lp.x - P.pos.x, lp.z - P.pos.z) < 25) audio.tone({ freq: 120, dur: 0.08, type: 'sawtooth', gain: 0.03, filter: 900, pos: { x: lp.x, y: 6, z: lp.z } });
    }
    // traffic
    
    for (let i = traffic.length - 1; i >= 0; i--) {
      const t = traffic[i]; t.c.position.z += t.dir * t.v * dt;
      if (!t.passed && Math.abs(t.c.position.z - P.pos.z) < 14) { t.passed = true; audio.noise({ dur: 2.2, type: 'bandpass', freq: 700, freqTo: 300, q: 0.8, gain: 0.35, attack: 0.8, pos: { x: t.c.position.x, y: 0.5, z: P.pos.z } }); audio.noise({ dur: 1.6, type: 'highpass', freq: 3000, gain: 0.12, attack: 0.6, pos: { x: t.c.position.x, y: 0.3, z: P.pos.z } }); }
      if (t.c.position.z < -130 || t.c.position.z > 45) { scene.remove(t.c); traffic.splice(i, 1); }
    }
    // the SUV from behind: races up, swerves sideways, screeches to a stop
    if (suv2T >= 0) {
      suv2T += dt;
      const z = suv2.position.z;
      if (z > suv2Stop + 0.3) {
        const v = Math.max(3, Math.min(26, (z - suv2Stop) * 2.2));
        suv2.position.z -= v * dt;
        if (z - suv2Stop < 14) { suv2.rotation.y += (Math.PI * 0.5 - suv2.rotation.y) * dt * 3.5; suv2.position.x += (0.8 - suv2.position.x) * dt * 2; }
        if (z - suv2Stop < 14 && !suv2.userData.screech) { suv2.userData.screech = true; audio.noise({ dur: 1.4, type: 'bandpass', freq: 2600, q: 6, gain: 0.55, pos: { x: 1.5, y: 0.3, z: suv2Stop } }); audio.tone({ freq: 1900, freqTo: 1400, dur: 1.3, type: 'sawtooth', gain: 0.05, vib: [30, 60], pos: { x: 1.5, y: 0.3, z: suv2Stop } }); ui.shake(0.04, 1.0); }
      } else if (!suv2.userData.stopped) { suv2.userData.stopped = true; audio.clunk({ x: 1, y: 0.5, z: suv2Stop }, 0.6); }
      const ry = suv2.rotation.y;
      suv2L.forEach((l, i) => {
        const sx = i ? 0.7 : -0.7;
        l.position.set(suv2.position.x + Math.cos(ry) * sx + Math.sin(ry) * 2.5, 1.0, suv2.position.z - Math.sin(ry) * sx + Math.cos(ry) * 2.5);
        l.target.position.set(l.position.x + Math.sin(ry) * 20, 0.3, l.position.z + Math.cos(ry) * 20);
      });
    }

    if (phase === 'run' || (phase === 'blackout' && suv2.visible)) { const on = Math.floor(tl * 8) % 2; iceLights.forEach((m, i) => m.material.color.setHex((i % 2) === on ? m.userData.col : 0x111111)); }
    // the car that creeps behind you, lights off
    if (followOn && !followLit) { const tz = P.pos.z + 16; followCar.position.z += (tz - followCar.position.z) * Math.min(1, dt * 0.6); }
    if (followLit) { const ry = followCar.rotation.y; followL.forEach((l, i) => { l.position.set(followCar.position.x + (i ? 0.7 : -0.7), 1.0, followCar.position.z - 2.6); l.target.position.set(l.position.x, 0.3, l.position.z - 20); }); }
    // the man across the street matches your pace
    if (mirrorOn && phase === 'walk') {
      const mg = mirrorMan.group.position, tz = P.pos.z - 1; const v = Math.max(-3, Math.min(3, (tz - mg.z) * 2));
      mg.z += v * dt; mirrorMan.group.rotation.y = Math.PI; mirrorPhase += Math.abs(v) * dt * 3; animateWalk(mirrorMan, mirrorPhase, Math.min(1, Math.abs(v)), false);
    }
    if (phase !== 'walk' && phase !== 'intro' && mirrorMan.group.visible) mirrorMan.group.visible = false;
    // footsteps behind you that stop when you stop
    { const prog0 = 6 - P.pos.z, moving = P.speedNow > 0.5;
      if (phase === 'walk' && prog0 > 32) { echoAcc += P.speedNow * dt; if (echoAcc > 1.6) { echoAcc = 0; audio.boot({ x: P.pos.x + 0.5, y: 0.2, z: P.pos.z + 7 }, 0.18); } if (lastMoving && !moving && Math.random() < 0.6) setTimeout(() => audio.boot({ x: P.pos.x + 0.5, y: 0.2, z: P.pos.z + 7 }, 0.15), 380); }
      lastMoving = moving; }
    // running the wrong way (back toward them) gets you caught
    if (phase === 'run' && L.chaseRun && !P.lookLock) {
      const gx = P.pos.z > -57 && P.pos.x < 9 ? 7.5 : 40, gz = P.pos.z > -57 && P.pos.x < 9 ? -60.5 : -64.6;
      const tx = gx - P.pos.x, tz = gz - P.pos.z, tl2 = Math.hypot(tx, tz) || 1;
      const vx = P.pos.x - lastPX, vz = P.pos.z - lastPZ, vl = Math.hypot(vx, vz);
      const away = vl > 0.02 && (vx * tx + vz * tz) / (vl * tl2) < -0.35;
      wrongT = away ? wrongT + dt : Math.max(0, wrongT - dt * 2);
      if (wrongT > 0.8) ui.bigHint('WRONG WAY — RUN!<small>THE OTHER WAY</small>'); else if (wrongT === 0 && document.getElementById('bigHint').textContent.startsWith('WRONG')) ui.bigHint('');
      if (wrongT > 3 && agents[0]) { ui.bigHint(''); game.caught(agents[0].h, 'You ran back toward them. Try again.'); }
    }
    lastPX = P.pos.x; lastPZ = P.pos.z;
    // the look back: as you hit the driveway, the camera turns, Santiago is behind you, then the shot
    if (phase === 'run' && !lookBack.done && P.pos.x > 10.5) { lookBack.done = true; lookBack.t = 0; P.lookLock = { yaw: Math.PI / 2, pitch: 0.02, k: 6 }; }
    if (lookBack.t >= 0 && lookBack.t < 6) {
      lookBack.t += dt; const lt = lookBack.t;
      if (lt < 2.2) grid.move(P.pos, 5.2 * dt, (-60.5 - P.pos.z) * dt * 2, 0.3); // you keep running while you look
      if (lt > 1.0 && lt - dt <= 1.0) { audio.gunshot({ x: rg.x - 6, y: 1.5, z: rg.z + 4 }); ui.flash(0.35); ui.shake(0.1, 0.5); rafaState = 'shot'; rafaFall = 0; }
      if (lt > 1.9 && lt - dt <= 1.9) { P.lookLock = { yaw: -Math.PI / 2, pitch: 0, k: 7 }; }
      if (lt > 2.3 && lt - dt <= 2.3) { P.lookLock = null; audio.muffle(true, 0.05); audio.tinnitus(); L.speedMul = 0.65; ui.bark(LINES.after); }
      if (lt > 5.2 && lt - dt <= 5.2) { audio.muffle(false, 1.2); L.speedMul = 1; ui.bark(LINES.a2); }
    }
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }

    // Rafa
    const rg = rafa.group.position;
    const dPl = Math.hypot(P.pos.x - rg.x, P.pos.z - rg.z);
    if (rafaState === 'walk') {
      let sp = 0;
      if (phase === 'walk') {
        // side by side, at your pace: a step to your right (street side), level with you
        const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
        const tx = Math.max(5.6, Math.min(8.4, P.pos.x + 1.1)), tz = P.pos.z + (Math.abs(fz) > 0.3 ? 0.15 : 0);
        const dx = tx - rg.x, dz = tz - rg.z, d = Math.hypot(dx, dz);
        if (d > 0.25) {
          sp = Math.min(Math.max(P.speedNow * 1.1, d * 3.2), 6.5);
          if (sp > 0.05) { rg.x += dx / d * sp * dt; rg.z += dz / d * sp * dt; }
        }
        const want = sp > 0.3 ? Math.atan2(dx, dz) : Math.atan2(fx, fz);
        let df = want - rafa.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); rafa.group.rotation.y += df * Math.min(1, dt * 5);
      } else if (phase === 'intro' || phase === 'blackout') {
        const lookAt = phase === 'blackout' ? Math.atan2(1.5 - rg.x, (suv2.visible ? suv2.position.z : -80) - rg.z) : Math.atan2(P.pos.x - rg.x, P.pos.z - rg.z);
        let df = lookAt - rafa.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); rafa.group.rotation.y += df * dt * 3;
      }
      rafaPhase += sp * dt * 2.9; animateWalk(rafa, rafaPhase, Math.min(1, sp / 1.2), false, sp);
      marker.visible = phase === 'walk' && dPl > 8; marker.position.set(rg.x, 2.35, rg.z);
    } else if (rafaState === 'flee') {
      rg.x -= dt * 3.2; rg.z += dt * 0.6; rafaPhase += dt * 10; animateWalk(rafa, rafaPhase, 1, false, 4.5);
      rafa.group.rotation.y = -Math.PI / 2;
    } else if (rafaState === 'down') {
      rafaFall = Math.min(1, rafaFall + dt * 3);
      rafa.group.rotation.x = -rafaFall * Math.PI / 2 * 0.98; rg.y = 0.15 - rafaFall * 0.05;
      animateWalk(rafa, 0, 0, false);
    }
    const prog = 6 - P.pos.z;
    for (let i = triggers.length - 1; i >= 0; i--) if (phase === 'walk' && prog > triggers[i].p) { const t = triggers[i]; triggers.splice(i, 1); t.fn(); }

    // the cat: slinks along the far sidewalk, then bolts across the road in front of you
    if (catState === 'walk') {
      cat.visible = true; cat.position.z -= dt * 0.55; cat.position.y = Math.abs(Math.sin(tl * 6)) * 0.02; cat.rotation.set(0, Math.PI, 0);
      catLight.position.set(cat.position.x + 0.6, 2.2, cat.position.z);
      if (Math.abs(P.pos.z - cat.position.z) < 7 && phase === 'walk') {
        catState = 'dart'; catT = 0; catFrom = { x: cat.position.x, z: cat.position.z };
        audio.catScreech({ x: cat.position.x, y: 0.5, z: cat.position.z }); audio.paws({ x: cat.position.x + 3, y: 0.2, z: cat.position.z }, 18); ui.shake(0.03, 0.25); audio.hit(0.35);
      }
    } else if (catState === 'dart') {
      catT += dt; const t = Math.min(1, catT / 1.1);
      const tz = P.pos.z - 2.2;
      cat.position.set(catFrom.x + (8.4 - catFrom.x) * t, Math.abs(Math.sin(catT * 18)) * 0.1, catFrom.z + (tz - catFrom.z) * t);
      cat.rotation.set(Math.sin(catT * 18) * 0.12, Math.atan2(8.4 - catFrom.x, tz - catFrom.z), 0);
      catLight.position.set(cat.position.x, 2.2, cat.position.z + 0.6);
      if (t >= 1) { catState = 'gone'; cat.visible = false; catLight.intensity = 0; setTimeout(() => audio.can({ x: 8, y: 1.2, z: -26 }), 200); }
    }

    // agents
    for (const a of agents) {
      const g = a.h.group.position;
      if (a.role === 'tackle') {
        if (rafaState === 'down') { a.speed = 0; g.y = -0.45; if (a.h.armL) { a.h.armL.rotation.x = -0.9; a.h.armR.rotation.x = -0.9; } }
        else if (phase === 'run') {
          moveAgent(a, rg.x, rg.z, 5.5, dt);
          if (Math.hypot(rg.x - g.x, rg.z - g.z) < 1.1) { rafaState = 'down'; audio.tackle(rg); setTimeout(() => audio.ziptie(rg), 1800); ui.shake(0.02, 0.3); }
        }
      } else if (a.role === 'chaseGo') {
        darkT += dt;
        const sp = darkT < 2.2 + (a.delay || 0) ? 0 : 2.8 + Math.min(0.5, darkT * 0.03);
        if (sp > 0) moveAgent(a, P.pos.x, P.pos.z, sp, dt); else a.speed = 0;
        if (Math.hypot(P.pos.x - g.x, P.pos.z - g.z) < 0.85) game.caught(a.h, 'You stopped running. Try again.');
      }
      if (a.speed > 0) {
        a.phase += a.speed * dt * 2.6; animateWalk(a.h, a.phase, Math.min(1, a.speed / 3), true, a.speed);
        a.stepAcc += a.speed * dt; if (a.stepAcc > 0.8) { a.stepAcc = 0; audio.boot({ x: g.x, y: 0.2, z: g.z }, 0.45); }
      }
      const ry = a.h.group.rotation.y;
      a.sl.position.set(g.x + Math.sin(ry) * 0.4 + Math.cos(ry) * 0.3, g.y + 1.45, g.z + Math.cos(ry) * 0.4 - Math.sin(ry) * 0.3);
      a.sl.target.position.set(g.x + Math.sin(ry) * 9, 0.4, g.z + Math.cos(ry) * 9);
    }

    // the searchlight finds you in the driveway
    if (phase === 'run' && heliT < 0 && P.pos.x > 26) { heliT = 0; audio.tone({ freq: 22, dur: 9, type: 'sawtooth', gain: 0.5, filter: 160, vib: [11, 4] }); audio.noise({ dur: 9, type: 'lowpass', freq: 300, gain: 0.4, attack: 1.2, brown: true }); }
    if (heliT >= 0 && heliT < 9) {
      heliT += dt;
      const lock = heliT > 1.6 && heliT < 4.5;
      const tx = lock ? P.pos.x : P.pos.x + 14 - heliT * 9, tz = lock ? P.pos.z : P.pos.z + 6;
      heli.intensity = 260; heli.target.position.set(tx, 0, tz); heli.position.set(tx + 6, 45, tz - 10);
      heliBeam.visible = true; heliBeam.position.copy(heli.position); heliBeam.lookAt(tx, 0, tz);
      if (lock && heliT - dt <= 1.6) { audio.hit(1); audio.stinger(0.8); ui.flash(0.6); ui.shake(0.07, 0.6); }
      if (heliT >= 9) { heli.intensity = 0; heliBeam.visible = false; }
    }
    // reaching the dock
    if (phase === 'run' && P.pos.z < -63.6 && P.pos.x > 37.5) { phase = 'done'; L.chaseRun = false; ui.bigHint(''); game.toStore(); }
  };
  L.danger = () => {
    if (phase !== 'run') return { heart: phase === 'blackout' ? 0.5 : 0 };
    const c = agents.find((a) => a.role === 'chaseGo');
    const d = c ? Math.hypot(c.h.group.position.x - P.pos.x, c.h.group.position.z - P.pos.z) : 40;
    return { chase: true, heart: Math.max(0.4, 1 - d / 25), alert: Math.max(0, 0.6 - d / 15) };
  };
  return L;
}
