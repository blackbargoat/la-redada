// QUIK-WAY gas & mini mart: the corner store across Whittier from Hammerline. Built once here,
// placed in the Day 2 lunch scene and on the Whittier lot in Night 1 (where you can walk in and look around).
import * as THREE from 'three';
import { tex, textTex } from './textures.js?v=1792151039';
import { std, makeBurrito } from './models.js?v=1792151039';

// local frame: storefront faces +z on z = 3.5, walls on x 10..23, z -5..4; o.pos/o.rot place it in the world
export function buildQuikWay(scene, grid, o = {}) {
  const g = new THREE.Group(); g.position.set(o.pos ? o.pos[0] : 0, 0, o.pos ? o.pos[1] : 0); g.rotation.y = o.rot || 0; scene.add(g); g.updateMatrix();
  const r = o.r || Math.random;
  const lights = [], glowMats = [];
  const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; g.add(m); return m; };
  // grid cells are world-space: map the local rect's corners through the transform
  const cells = (x0, z0, x1, z1, v, ov) => {
    const a = new THREE.Vector3(x0, 0, z0).applyMatrix4(g.matrix), b = new THREE.Vector3(x1 + 1, 0, z1 + 1).applyMatrix4(g.matrix);
    grid.rect(Math.floor(Math.min(a.x, b.x) + 0.01), Math.floor(Math.min(a.z, b.z) + 0.01), Math.ceil(Math.max(a.x, b.x) - 0.01) - 1, Math.ceil(Math.max(a.z, b.z) - 0.01) - 1, v, ov);
  };
  const solid = (x0, z0, x1, z1, ov = 1) => cells(x0, z0, x1, z1, 1, ov);
  const lit = (t, i = 1) => { const m = std(0xffffff, { map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: i }); glowMats.push([m, i]); return m; };
  const MX0 = 10, MX1 = 22, MZ0 = -5, MZ1 = 3; // walls on these lines
  cells(MX0 + 1, MZ0 + 1, MX1 - 1, MZ1 - 1, 0, 0); cells(14, MZ1, 15, MZ1 + 3, 0, 0); // the inside and the doorway are walkable
  const stripeM = std(0xffffff, { map: tex('stripes', [10, 1]), roughness: 0.6 });
  const whiteM = std(0xeae6dc, { roughness: 0.55 });
  // ---------------- the mini-mart ----------------
  const WH = 4.3;
  const wallM = std(0xe2d8c4, { map: tex('stucco', [3, 1]), roughness: 0.9 });
  const wall = (x0, z0, x1, z1) => { solid(x0, z0, x1, z1); box(x1 - x0 + 1, WH, z1 - z0 + 1, wallM, (x0 + x1 + 1) / 2, WH / 2, (z0 + z1 + 1) / 2); };
  wall(MX0, MZ0, MX1, MZ0); wall(MX0, MZ0 + 1, MX0, MZ1); wall(MX1, MZ0 + 1, MX1, MZ1);
  // storefront: knee wall, floor-to-header glass, aluminium mullions, door gap at x 14..16
  solid(MX0 + 1, MZ1, 13, MZ1); solid(16, MZ1, MX1 - 1, MZ1);
  const brickM = std(0xffffff, { map: tex('brick', [3, 0.4]), color: 0xb8a898 });
  box(3, 0.5, 0.3, brickM, 12.5, 0.25, 3.5); box(6, 0.5, 0.3, brickM, 19, 0.25, 3.5);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xb8c8cc, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.7, depthWrite: false });
  box(3, 2.45, 0.04, glassM, 12.5, 1.72, 3.5, false); box(6, 2.45, 0.04, glassM, 19, 1.72, 3.5, false);
  const aluM = std(0x9a9c9c, { metalness: 0.7, roughness: 0.35 });
  for (const x of [11.05, 12.5, 14, 16, 17.5, 19, 20.5, 21.95]) box(0.09, 2.5, 0.12, aluM, x, 1.72, 3.5, false);
  box(11, 0.1, 0.14, aluM, 16.5, 2.97, 3.5, false); box(3, 0.08, 0.12, aluM, 12.5, 0.52, 3.5, false); box(6, 0.08, 0.12, aluM, 19, 0.52, 3.5, false);
  // the glass door, propped open flat against the front
  const door = new THREE.Group(); door.position.set(14, 0, 3.62); g.add(door);
  { const f = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 0.05), glassM); f.position.set(-0.52, 1.17, 0); door.add(f);
    for (const [w, h, x, y] of [[1.05, 0.08, -0.52, 0.06], [1.05, 0.08, -0.52, 2.3], [0.07, 2.3, -0.02, 1.17], [0.07, 2.3, -1.02, 1.17], [0.6, 0.05, -0.52, 1.05]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), aluM); m.position.set(x, y, 0); door.add(m); } }
  // the striped fascia band and the sign box
  box(13.2, 1.3, 0.7, [stripeM, stripeM, whiteM, whiteM, stripeM, stripeM], 16.5, 3.65, 3.75);
  const martT = textTex(512, 256, '#f2efe6', [{ text: 'QUIK', size: 120, color: '#c4202a', y: 98 }, { text: 'WAY', size: 92, color: '#1d7a3e', y: 196 }], { border: '#e8701c', borderW: 14 });
  box(2.4, 1.6, 0.3, [whiteM, whiteM, whiteM, whiteM, lit(martT, 0.3), whiteM], 16.5, 3.65, 4.2);
  box(13.6, 0.35, 9.6, std(0x8a8478, { roughness: 0.9 }), 16.5, WH + 0.1, -0.5); // roof / parapet cap
  // window posters
  const posters = [['TECATE 12PK $14.99', '#c02a1a'], ['TARJETAS TELEFÓNICAS', '#2a5ab0'], ['LOTTO · SCRATCHERS', '#e0a020'], ['2 X $3 · BEBIDAS', '#1d7a3e']];
  posters.forEach(([t, c], i) => { const pt = textTex(256, 128, c, [{ text: t, size: 22, color: '#fff' }]); plane(0.95, 0.48, std(0xffffff, { map: pt }), [17.0, 18.2, 19.6, 11.6][i], 2.15, 3.53); });
  // red-painted curb along the front, a clean apron
  const redCurb = std(0xa8302a, { roughness: 0.7 });
  box(14, 0.14, 0.3, redCurb, 16.5, 0.07, 7.4); box(0.3, 0.14, 4.2, redCurb, 9.6, 0.07, 5.3);
  plane(13.4, 4.2, std(0xffffff, { map: tex('sidewalk', [6, 2]), roughness: 0.8 }), 16.5, 0.02, 5.3, 0, -Math.PI / 2);
  // out front: bench, ice chest, trash, newspaper box
  const bench = box(2.2, 0.08, 0.6, std(0x5a3a22, { map: tex('plywood', [2, 1]) }), 19, 0.45, 5.0); solid(18, 5, 19, 5, 0);
  box(2.2, 0.5, 0.06, std(0x5a3a22, { map: tex('plywood', [2, 1]) }), 19, 0.75, 4.72);
  for (const x of [18, 20]) box(0.08, 0.45, 0.6, std(0x333333), x, 0.22, 5);
  box(1.4, 1.7, 0.9, std(0xeef0f0, { metalness: 0.3, roughness: 0.4 }), 21.2, 0.85, 4.6); solid(21, 4, 21, 5);
  const iceT = textTex(256, 128, '#1a5ab0', [{ text: 'ICE', size: 70, color: '#fff' }]);
  plane(1.0, 0.5, std(0xffffff, { map: iceT }), 21.2, 1.2, 5.06);
  box(0.55, 0.95, 0.55, std(0x3a3a3a, { roughness: 0.6 }), 13.0, 0.47, 4.4); solid(13, 4, 13, 4, 0);
  box(0.5, 1.0, 0.45, std(0x1d4a8a, { metalness: 0.3 }), 11.4, 0.5, 4.4);

  // ---------------- inside ----------------
  // floor, drop ceiling with fluorescent panels, red and green walls with the stripe band
  plane(11, 7, std(0xffffff, { map: tex('storeTile', [5.5, 3.5]), roughness: 0.28, metalness: 0.05 }), 16.5, 0.012, -0.5, 0, -Math.PI / 2);
  plane(11, 7, std(0xffffff, { map: tex('ceilTile', [5.5, 3.5]), roughness: 0.9 }), 16.5, 3.0, -0.5, 0, Math.PI / 2);
  const panelM = std(0x222222, { emissive: 0xf4f8f0, emissiveIntensity: 1.7 });
  for (const x of [12.5, 15.5, 18.5, 21]) for (const z of [-2.5, 0.5]) box(1.2, 0.04, 0.6, panelM, x, 2.985, z, false);
  const redW = std(0xb02a24, { roughness: 0.6 }), greenW = std(0x1f5a3a, { roughness: 0.6 }), upperW = std(0xece8de, { roughness: 0.8 });
  const bandIn = std(0xffffff, { map: tex('stripes', [12, 1]), roughness: 0.6 });
  plane(7, 2.3, greenW, 11.01, 1.15, -0.5, Math.PI / 2); plane(7, 0.7, upperW, 11.01, 2.65, -0.5, Math.PI / 2); plane(7, 0.45, bandIn, 11.02, 2.55, -0.5, Math.PI / 2);
  plane(11, 3, redW, 16.5, 1.5, -3.99); plane(11, 0.45, bandIn, 16.5, 2.55, -3.98);
  plane(7, 2.3, redW, 21.99, 1.15, -0.5, -Math.PI / 2); plane(7, 0.7, upperW, 21.99, 2.65, -0.5, -Math.PI / 2); plane(7, 0.45, bandIn, 21.98, 2.55, -0.5, -Math.PI / 2);
  plane(11, 0.5, upperW, 16.5, 2.75, 3.32, Math.PI); plane(11, 0.45, bandIn, 16.5, 2.75, 3.31, Math.PI);
  // stock: one instanced box set for everything on the shelves (tinted packaging)
  const prodCols = [0xd02a1a, 0xf0b020, 0x2a5ab0, 0x3a9a3a, 0xf4f0e6, 0x8a2a8a, 0xe86a1a, 0x7a4a2a, 0x1a1a1a, 0xe8d040, 0x40a8d8];
  const packG = new THREE.BoxGeometry(1, 1, 1), packM = std(0xffffff, { map: tex('pack'), roughness: 0.55 });
  const packs = []; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), cc = new THREE.Color();
  const pack = (x, y, z, w, h, d, col) => packs.push([x, y, z, w, h, d, col]);
  // fill a run along z at height y, facing +-x, items up to maxH tall
  const stockZ = (x, y, z0, z1, depth, maxH, pal) => { let z = z0; while (z < z1 - 0.08) { const w = 0.1 + r() * 0.16, h = 0.1 + r() * (maxH - 0.1); if (z + w > z1) break; const col = pal[(r() * pal.length) | 0]; for (const k of [0, 1]) pack(x + (k - 0.5) * depth * 0.5, y + h / 2, z + w / 2, depth * 0.46, h, w, col); z += w + 0.02; } };
  const stockX = (z, y, x0, x1, depth, maxH, pal) => { let x = x0; while (x < x1 - 0.08) { const w = 0.08 + r() * 0.14, h = 0.12 + r() * (maxH - 0.12); if (x + w > x1) break; pack(x + w / 2, y + h / 2, z, w, h, depth, pal[(r() * pal.length) | 0]); x += w + 0.03; } };
  // two gondola runs with end caps; an aisle between them
  const shelfM = std(0xd8d6d0, { metalness: 0.3, roughness: 0.5 }), pegM = std(0xe8e6e0, { roughness: 0.7 });
  for (const gx of [13.5, 16.5]) { // 0.9 m wide, one grid cell each: clean 2 m aisles either side
    const z0 = -2.0, z1 = 0.8, zc = (z0 + z1) / 2, len = z1 - z0;
    box(0.06, 1.75, len, pegM, gx, 0.88, zc); box(0.88, 0.14, len, std(0x3a3a3a), gx, 0.07, zc);
    for (const y of [0.14, 0.55, 0.95, 1.35]) { box(0.88, 0.03, len, shelfM, gx, y, zc, false); box(0.9, 0.07, len, std(0xf0ece0), gx, y - 0.025, zc, false); }
    for (const side of [-1, 1]) for (const y of [0.16, 0.57, 0.97, 1.37]) stockZ(gx + side * 0.22, y + 0.012, z0 + 0.04, z1 - 0.04, 0.4, y > 1.3 ? 0.3 : 0.36, prodCols);
    // end cap toward the door: a stack of cases and a price header
    box(0.86, 0.9, 0.46, std(0xffffff, { map: tex('cardboard') }), gx, 0.45, z1 + 0.25);
    const capT = textTex(256, 96, ['#c4202a', '#1d7a3e'][gx > 14 ? 1 : 0], [{ text: gx > 14 ? '2 x $3' : '99¢', size: 54, color: '#fff' }]);
    plane(0.86, 0.32, std(0xffffff, { map: capT }), gx, 1.82, z1 + 0.02);
    solid(Math.floor(gx), -2, Math.floor(gx), 0);
  }
  // hanging aisle signs
  for (const [x, t] of [[12.0, 'CANDY · SNACKS'], [15.0, 'GROCERY · AUTO'], [18.0, 'HOT FOOD']]) {
    const at = textTex(256, 64, '#1d7a3e', [{ text: t, size: 30, color: '#fff' }]);
    const hs = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 0.03), [std(0x1d7a3e), std(0x1d7a3e), std(0x1d7a3e), std(0x1d7a3e), std(0xffffff, { map: at }), std(0xffffff, { map: at })]); hs.position.set(x, 2.5, -0.6); g.add(hs);
    for (const s of [-0.6, 0.6]) box(0.01, 0.48, 0.01, std(0x222222), x + s, 2.75, -0.6, false);
  }
  // coolers on the back wall: glass doors, lit from inside, rows of bottles and cans
  const CX0 = 11.1, CX1 = 18.9, cz = -3.6;
  { const cm = std(0x2a2a2a, { metalness: 0.4 }), w = CX1 - CX0, xc = (CX0 + CX1) / 2; box(w, 0.2, 0.8, cm, xc, 0.1, cz, false); box(w, 0.25, 0.8, cm, xc, 2.2, cz, false); for (const x of [CX0, CX1]) box(0.08, 2.3, 0.8, cm, x, 1.15, cz, false); } solid(11, -5, 18, -4);
  box(CX1 - CX0 - 0.1, 1.95, 0.02, std(0x222222, { emissive: 0xe8f4ff, emissiveIntensity: 0.9 }), (CX0 + CX1) / 2, 1.2, -3.97, false);
  const drinkCols = [0xd02a1a, 0x2a5ab0, 0xf0b020, 0x3a9a3a, 0xe86a1a, 0xf4f0e6, 0x8a2a8a, 0x40a8d8, 0x7a4a2a];
  for (const y of [0.3, 0.75, 1.2, 1.65]) { box(CX1 - CX0 - 0.1, 0.03, 0.6, std(0xc8ccd0, { metalness: 0.5 }), (CX0 + CX1) / 2, y, -3.65, false); stockX(-3.6, y + 0.02, CX0 + 0.1, CX1 - 0.1, 0.12, 0.34, drinkCols); }
  for (let k = 0; k <= 6; k++) box(0.06, 2.05, 0.06, aluM, CX0 + k * (CX1 - CX0) / 6, 1.2, -3.2, false);
  box(CX1 - CX0 - 0.1, 1.95, 0.02, new THREE.MeshStandardMaterial({ color: 0xa8c0cc, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.6, depthWrite: false }), (CX0 + CX1) / 2, 1.2, -3.19, false);
  for (let k = 0; k < 6; k++) box(0.03, 0.6, 0.04, aluM, CX0 + (k + 0.85) * (CX1 - CX0) / 6, 1.2, -3.15, false);
  const coldT = textTex(1024, 96, '#1d7a3e', [{ text: 'COLD DRINKS  ·  CERVEZA  ·  AGUAS', size: 56, color: '#fff' }]);
  box(CX1 - CX0, 0.42, 0.1, [std(0x1d7a3e), std(0x1d7a3e), std(0x1d7a3e), std(0x1d7a3e), lit(coldT, 0.6), std(0x1d7a3e)], (CX0 + CX1) / 2, 2.55, -3.25, false);
  const coolL = new THREE.PointLight(0xd8f0ff, 2.5, 5, 1.5); coolL.position.set(15, 1.4, -2.8); g.add(coolL); lights.push(coolL);
  // wall clock over the coolers
  { const ct = document.createElement('canvas'); ct.width = ct.height = 128; const x = ct.getContext('2d'); x.fillStyle = '#f4f0e6'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.strokeStyle = '#222'; x.lineWidth = 6; x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.sin(5.2 / 12 * 6.283) * 30, 64 - Math.cos(5.2 / 12 * 6.283) * 30); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.sin(0.2 * 6.283) * 46, 64 - Math.cos(0.2 * 6.283) * 46); x.stroke();
    const t = new THREE.CanvasTexture(ct); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), std(0xffffff, { map: t })); m.position.set(11.03, 2.0, 1.9); m.rotation.y = Math.PI / 2; g.add(m); } // on the side wall, clear of every sign
  // coffee + slush counter in the back corner
  box(2.7, 0.95, 0.65, std(0x6a3a26, { map: tex('plywood', [2, 1]) }), 20.6, 0.47, -3.65); solid(19, -4, 21, -4);
  box(2.75, 0.05, 0.7, std(0xd8cfb8, { roughness: 0.3 }), 20.6, 0.97, -3.65, false);
  for (const [x, col] of [[19.6, 0xd02020], [20.1, 0x2050d0]]) { box(0.42, 0.55, 0.45, std(0xe8e8e8), x, 1.27, -3.7, false); box(0.36, 0.4, 0.36, std(col, { emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }), x, 1.4, -3.6, false); }
  box(0.6, 0.6, 0.45, std(0x1a1a1a, { metalness: 0.4 }), 20.9, 1.27, -3.7, false); box(0.5, 0.12, 0.3, std(0xc04020, { emissive: 0x802010, emissiveIntensity: 0.4 }), 20.9, 1.46, -3.47, false);
  for (let k = 0; k < 3; k++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 10), std(0xf4f0e6)); cup.position.set(21.5 + k * 0.14, 1.24, -3.6); g.add(cup); }
  const cofT = textTex(512, 96, '#c4202a', [{ text: 'COFFEE  ·  SLUSH', size: 54, color: '#fff' }]);
  const cs2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.36, 0.03), [std(0xc4202a), std(0xc4202a), std(0xc4202a), std(0xc4202a), lit(cofT, 0.5), lit(cofT, 0.5)]); cs2.position.set(20.6, 2.45, -3.4); g.add(cs2);
  // the counter: candy rack on the front, register, lotto, the radio; merch wall behind the cashier
  const counterM = std(0x6a3a26, { map: tex('plywood', [3, 1]) });
  box(1.2, 1.0, 3.2, counterM, 20.4, 0.5, -1.4); solid(19, -3, 20, 0);
  box(1.3, 0.05, 3.3, std(0xd8cfb8, { roughness: 0.3 }), 20.4, 1.02, -1.4, false);
  box(0.3, 0.75, 2.6, std(0xd8d6d0, { metalness: 0.3 }), 19.65, 0.45, -1.4, false);
  for (const y of [0.2, 0.45, 0.7]) stockZ(19.55, y, -2.6, -0.2, 0.18, 0.14, prodCols);
  // the boombox the music comes out of: two speakers, a tape deck, a lit display, a carry handle, the antenna up
  const radio = new THREE.Group(); radio.position.set(20.55, 1.045, -2.55); radio.rotation.y = -Math.PI / 2; g.add(radio);
  { const bodyM = std(0x1c1c1e, { roughness: 0.5, metalness: 0.2 }), grill = std(0x3a3a3c, { roughness: 0.8 }), chrome = std(0xb8bcc0, { metalness: 0.85, roughness: 0.3 });
    const a = (m, x, y, z) => { m.position.set(x, y, z); radio.add(m); return m; };
    a(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.26, 0.15), bodyM), 0, 0.13, 0);
    for (const sx of [-0.18, 0.18]) { a(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 16).rotateX(Math.PI / 2), grill), sx, 0.13, 0.076); a(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10).rotateX(Math.PI / 2), chrome), sx, 0.13, 0.08); a(new THREE.Mesh(new THREE.TorusGeometry(0.087, 0.008, 5, 16), chrome), sx, 0.13, 0.078); }
    a(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.01), std(0x111111, { roughness: 0.3 })), 0, 0.08, 0.077); // tape door
    a(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.01), std(0x0a1a10, { emissive: 0x40d080, emissiveIntensity: 0.9 })), 0, 0.19, 0.077); // display
    for (let k = 0; k < 5; k++) a(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.02), chrome), -0.05 + k * 0.025, 0.265, 0.03); // buttons
    const h = a(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 5, 16, Math.PI), chrome), 0, 0.26, -0.02);
    const ant = a(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.45, 5), chrome), 0.24, 0.48, -0.05); ant.rotation.z = -0.35; }
  const rackX = 21.8;
  box(0.05, 1.7, 3.6, std(0x2a2a2a), 21.96, 1.85, -1.2, false); for (const z of [-3.0, 0.6]) box(0.38, 1.7, 0.04, std(0x2a2a2a), rackX, 1.85, z, false);
  for (const y of [1.1, 1.38, 1.66, 1.94, 2.22]) { box(0.38, 0.02, 3.6, std(0x888888, { metalness: 0.5 }), rackX - 0.02, y, -1.2, false); stockZ(rackX - 0.06, y + 0.01, -2.95, 0.55, 0.2, 0.18, [0xd02a1a, 0xf4f0e6, 0x2a5ab0, 0xe8d040, 0x3a9a3a, 0x1a1a1a]); }
  const heads = [['MONTERO', '#c4202a'], ['DIAMANTE', '#2a5ab0'], ['PHONE CARDS', '#1d7a3e'], ['LOTTO', '#e0a020']];
  heads.forEach(([t, c], i) => { const ht = textTex(256, 72, c, [{ text: t, size: 36, color: '#fff' }]); plane(0.88, 0.3, lit(ht, 0.7), rackX - 0.19, 2.82, -2.6 + i * 0.92, -Math.PI / 2); });
  // the counter runs on toward the front window; the burrito case sits at that end of it, big, lit from inside
  box(1.2, 1.0, 2.2, counterM, 20.4, 0.5, 1.3); box(1.3, 0.05, 2.2, std(0xd8cfb8, { roughness: 0.3 }), 20.4, 1.02, 1.35, false); // butts up to the old top, no overlap solid(19, 1, 20, 2);
  const WX = 20.35, WZ = 1.55, CW = 1.3, CD = 0.85, CH = 0.62, CY = 1.045; // case footprint on the counter
  const steelM = std(0xb8b8b2, { metalness: 0.55, roughness: 0.35 });
  box(CD, 0.07, CW, steelM, WX, CY + 0.035, WZ, false);                 // base pan
  box(CD, 0.06, CW, steelM, WX, CY + CH - 0.03, WZ, false);            // roof
  for (const dz of [-CW / 2 + 0.02, CW / 2 - 0.02]) for (const dx of [-CD / 2 + 0.02, CD / 2 - 0.02]) box(0.035, CH, 0.035, std(0x8a8a86, { metalness: 0.6 }), WX + dx, CY + CH / 2, WZ + dz, false);
  box(CD - 0.06, 0.015, CW - 0.06, std(0xc8c8c0, { metalness: 0.6 }), WX, CY + 0.32, WZ, false); // middle rack
  const hotCase = box(CD, CH - 0.1, CW, new THREE.MeshStandardMaterial({ color: 0xffe8c8, transparent: true, opacity: 0.14, roughness: 0.05, emissive: 0x804010, emissiveIntensity: 0.25, depthWrite: false }), WX, CY + CH / 2, WZ, false);
  // heat lamp strip under the roof, glowing, and a real warm light pooling on the food
  box(CD - 0.1, 0.02, CW - 0.1, std(0x222222, { emissive: 0xffb050, emissiveIntensity: 2.2 }), WX, CY + CH - 0.065, WZ, false);
  const foodItems = [];
  for (let k = 0; k < 4; k++) { const bu = makeBurrito(0.1); bu.scale.setScalar(1.35); bu.rotation.y = Math.PI / 2; bu.position.set(WX - 0.08, CY + 0.13, WZ - 0.45 + k * 0.3); g.add(bu); foodItems.push(bu); }
  for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.15, 4, 8).rotateX(Math.PI / 2), std(0xc8b07a, { roughness: 0.9 })); t.position.set(WX - 0.08, CY + 0.38, WZ - 0.45 + k * 0.3); g.add(t); foodItems.push(t); }
  const hotT = textTex(512, 96, '#c02a1a', [{ text: 'BURRITOS · TAMALES', size: 52, color: '#fff' }]);
  const hotS = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.24), lit(hotT, 0.5)); hotS.position.set(WX - CD / 2 - 0.005, CY + CH + 0.13, WZ); hotS.rotation.y = -Math.PI / 2; g.add(hotS);
  box(0.03, 0.26, CW, std(0xc02a1a), WX - CD / 2 + 0.02, CY + CH + 0.13, WZ, false);
  const hotL = new THREE.PointLight(0xffb060, 3.2, 2.2, 1.6); hotL.position.set(WX, CY + CH - 0.12, WZ); g.add(hotL); lights.push(hotL);
  // build the stock
  { const im = new THREE.InstancedMesh(packG, packM, packs.length);
    packs.forEach(([x, y, z, w, h, d, col], i) => { m4.compose(pv.set(x, y, z), q, sv.set(w, h, d)); im.setMatrixAt(i, m4); im.setColorAt(i, cc.setHex(col)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.receiveShadow = true; g.add(im); }
  // fluorescent light inside: bright and flat, a touch green
  for (const [x, z] of (o.night ? [[13.5, -1], [19, -0.5]] : [[12.8, -1], [16.5, -1.6], [16.5, 1.6], [20.2, -1]])) { const l = new THREE.PointLight(0xf0f4e8, o.night ? 9 : 6, 9, 1.3); l.position.set(x, 2.8, z); g.add(l); lights.push(l); }


  for (const m of [panelM]) glowMats.push([m, m.emissiveIntensity]);
  g.traverse((m) => { if (m.isMesh && m.material && m.material.emissiveIntensity > 0.5 && !glowMats.find((x) => x[0] === m.material)) glowMats.push([m.material, m.material.emissiveIntensity]); });
  const base = lights.map((l) => l.intensity);
  return {
    group: g, foodItems, radio, lights,
    setPower(on) { lights.forEach((l, i) => (l.intensity = on ? base[i] : 0)); glowMats.forEach(([m, i]) => (m.emissiveIntensity = on ? i : 0)); },
  };
}

// a pump island: curb, two dispensers with price screens, hoses and nozzles, bollards at the ends
export function makePump(parent, x, z, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = o.rot || 0; parent.add(g);
  const stripeM = std(0xffffff, { map: tex('stripes', [2, 1]), roughness: 0.6 }), whiteM = std(0xeae6dc, { roughness: 0.5 });
  const b = (w, h, d, m, px, py, pz) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(px, py, pz); k.castShadow = k.receiveShadow = true; g.add(k); return k; };
  b(1.2, 0.22, 4.4, std(0x9a9a94, { map: tex('concrete', [1, 3]) }), 0, 0.11, 0);
  const hoseM = std(0x141414, { roughness: 0.6 }), nozM = std(0x2a2a2a, { metalness: 0.5 });
  const screen = [];
  for (const s of [-1, 1]) {
    const z0 = s * 1.0;
    b(0.85, 1.55, 0.6, whiteM, 0, 1.0, z0); b(0.87, 0.36, 0.62, stripeM, 0, 1.92, z0); b(0.7, 0.12, 0.5, std(0x3a3a3a), 0, 0.28, z0);
    for (const f of [-1, 1]) {
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.22), std(0x0a1210, { emissive: 0x40c090, emissiveIntensity: 0.04 })); sc.position.set(f * 0.431, 1.45, z0); sc.rotation.y = f * Math.PI / 2; g.add(sc); screen.push(sc);
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.18), std(0x2a2a2a)); pad.position.set(f * 0.431, 1.15, z0 + 0.12); pad.rotation.y = f * Math.PI / 2; g.add(pad);
      for (let k = 0; k < 3; k++) { const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), std([0x2a5a2a, 0xc0a020, 0xa02020][k])); btn.position.set(f * 0.432, 0.92, z0 - 0.15 + k * 0.1); btn.rotation.y = f * Math.PI / 2; g.add(btn); }
      // holstered nozzle and a hose looping down to the ground and back up
      const hx = f * 0.45;
      b(0.1, 0.22, 0.12, nozM, hx, 1.05, z0 - 0.18);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(hx, 1.0, z0 - 0.18), new THREE.Vector3(hx + f * 0.35, 0.55, z0 - 0.5), new THREE.Vector3(hx + f * 0.25, 0.3, z0 - 0.1), new THREE.Vector3(hx * 0.9, 1.5, z0 + 0.25)]);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.025, 6), hoseM); g.add(hose);
    }
    const sign = textTex(128, 64, '#c4202a', [{ text: s < 0 ? '87' : '91', size: 40, color: '#fff' }]);
    for (const f of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), std(0xffffff, { map: sign })); p.position.set(f * 0.436, 1.72, z0); p.rotation.y = f * Math.PI / 2; g.add(p); }
  }
  b(0.4, 0.3, 0.4, std(0x2a5a3a), 0, 0.37, 0); b(0.5, 0.7, 0.45, std(0x3a3a3a), 0, 0.57, 0); // squeegee bucket + trash
  for (const s of [-1, 1]) { const bo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 10), std(0xe0b020, { roughness: 0.5 })); bo.position.set(0, 0.6, s * 2.05); g.add(bo); }
  return g;
}
