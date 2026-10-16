// NIGHT 2 — Under the City. The storm drain under Hammerline: a maze, green water, rats, an old man who lives down here.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792115024';
import { tex, textTex, rng } from './textures.js?v=1792115024';
import { makeCharacter, animateWalk, makeGlow, makeBeam, std } from './models.js?v=1792115024';

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

const N = 9, CS = 7, W = N * CS + 1; // maze cells, cell pitch (6m tunnel + 1m wall), world size
const cc = (i) => i * CS + 4;          // cell center
const SPRING = 2.4, RAD = 3;           // brick walls up to the springline, then the barrel vault

export function createSewer(G) {
  const { audio, ui, P, game } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020604);
  scene.fog = new THREE.FogExp2(0x0a1a0e, 0.085);
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
  const opens = (i, j) => ({ e: open[i][j].e, w: i > 0 && open[i - 1][j].e, s: open[i][j].s, n: j > 0 && open[i][j - 1].s });
  // every 1m floor cell: 0 wall, 1 ledge, 2 water channel
  const type = new Uint8Array(W * W);
  const setT = (x, z, t) => { type[z * W + x] = t; grid.rect(x, z, x, z, 0, 0); };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const o = opens(i, j);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
      const midA = a === 2 || a === 3, midB = b === 2 || b === 3;
      const chan = (midA && midB) || (midB && ((a > 3 && o.e) || (a < 2 && o.w))) || (midA && ((b > 3 && o.s) || (b < 2 && o.n)));
      setT(i * CS + 1 + a, j * CS + 1 + b, chan ? 2 : 1);
    }
    for (let b = 0; b < 6; b++) {
      if (o.e) setT(i * CS + 7, j * CS + 1 + b, b === 2 || b === 3 ? 2 : 1);
      if (o.s) setT(i * CS + 1 + b, j * CS + 7, b === 2 || b === 3 ? 2 : 1);
    }
  }
  const typeAt = (x, z) => { const i = Math.floor(x), k = Math.floor(z); return i < 0 || k < 0 || i >= W || k >= W ? 0 : type[k * W + i]; };
  // ---- catwalk bridges over the channel (type 3). Every junction and corner gets one across each arm,
  // a few straight runs get one mid-way, then we prove the ladder can be reached on foot and add more if not.
  const bridges = []; // [x, z, acrossZ]
  const bridgeArm = (i, j, d) => {
    const x0 = i * CS + 1, z0 = j * CS + 1;
    const cellsFor = { e: [[4, 2], [4, 3]], w: [[1, 2], [1, 3]], s: [[2, 4], [3, 4]], n: [[2, 1], [3, 1]], mx: [[2, 2], [2, 3]], mz: [[2, 2], [3, 2]] }[d];
    if (cellsFor.some(([a, b]) => type[(z0 + b) * W + x0 + a] !== 2)) return;
    cellsFor.forEach(([a, b]) => { type[(z0 + b) * W + x0 + a] = 3; });
    const acrossZ = d === 'e' || d === 'w' || d === 'mx';
    bridges.push([x0 + cellsFor[0][0] + 0.5 + (acrossZ ? 0 : 0.5), z0 + cellsFor[0][1] + 0.5 + (acrossZ ? 0.5 : 0), acrossZ]);
  };
  const bridgeCell = (i, j) => { const o = opens(i, j); for (const d of ['e', 'w', 's', 'n']) if (o[d]) bridgeArm(i, j, d); };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const o = opens(i, j), n = +o.e + +o.w + +o.s + +o.n, both = (o.e || o.w) && (o.n || o.s);
    if (n >= 3 || both || (i === 0 && j === 0) || (i === N - 1 && j === N - 1)) bridgeCell(i, j);
    else if (n === 2 && (i * 3 + j) % 3 === 0) bridgeArm(i, j, o.e ? 'mx' : 'mz');
  }
  const walkT = (x, z) => { const t = typeAt(x, z); return t === 1 || t === 3; };
  const reach = (sx, sz, tx, tz) => { const seen = new Uint8Array(W * W), q = [[Math.floor(sx), Math.floor(sz)]]; seen[q[0][1] * W + q[0][0]] = 1;
    while (q.length) { const [x, z] = q.shift(); if (x === Math.floor(tx) && z === Math.floor(tz)) return true; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, nz = z + b; if (nx < 0 || nz < 0 || nx >= W || nz >= W || seen[nz * W + nx] || !walkT(nx + 0.5, nz + 0.5)) continue; seen[nz * W + nx] = 1; q.push([nx, nz]); } }
    return false; };
  L.groundAt = (x, z) => (typeAt(x, z) === 2 ? -0.95 : 0); // waist-deep in the channel
  // the way through, cell by cell (for placing the old man)
  const solve = (() => { const prev = {}, q = [[0, 0]], key = (i, j) => i + ',' + j; prev[key(0, 0)] = null;
    while (q.length) { const [i, j] = q.shift(); if (i === N - 1 && j === N - 1) break; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (a >= 0 && b >= 0 && a < N && b < N && !(key(a, b) in prev) && linked(i, j, a, b)) { prev[key(a, b)] = [i, j]; q.push([a, b]); } }
    const path = []; let c = [N - 1, N - 1]; while (c) { path.unshift(c); c = prev[key(c[0], c[1])]; } return path; })();

  // make sure you can get from the hatch to the ladder without wading: if not, bridge every cell on the way
  { const sx = cc(0) + 2, sz = 2.3, tx = cc(N - 1) + 2, tz = (N - 1) * CS + 6.05;
    if (!reach(sx, sz, tx, tz)) for (const [i, j] of solve) bridgeCell(i, j);
    if (!reach(sx, sz, tx, tz)) for (const [i, j] of solve) for (const d of ['mx', 'mz']) bridgeArm(i, j, d);
    L.ladderReachable = reach(sx, sz, tx, tz); }

  // ---------------- geometry ----------------
  const m4 = new THREE.Matrix4(), s3 = new THREE.Vector3(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3();
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const brickM = std(0xffffff, { map: tex('sewerBrick', [1, 4]), roughness: 0.8 });
  // walls: every solid cell that touches a tunnel, tall enough to cap the vaults
  const walls = [];
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (!type[z * W + x]) {
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => typeAt(x + a, z + b) > 0)) walls.push([x + 0.5, z + 0.5]);
  }
  const WH = SPRING + RAD + 0.2;
  const wallIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, WH, 1), brickM, walls.length);
  walls.forEach(([x, z], k) => { m4.makeTranslation(x, WH / 2 - 0.5, z); wallIM.setMatrixAt(k, m4); }); wallIM.receiveShadow = true; scene.add(wallIM);
  // the vaults: half-cylinders of brick along each tunnel, meeting in arches at the junctions
  const vaultGeo = (len) => { const g = new THREE.CylinderGeometry(RAD, RAD, len, 18, 1, true, -Math.PI / 2, Math.PI); g.rotateX(-Math.PI / 2); return g; };
  const vaultM = (rep) => std(0xffffff, { map: tex('sewerBrick', rep), roughness: 0.8, side: THREE.DoubleSide });
  const cellV = [], gapV = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const o = opens(i, j);
    if (o.e || o.w) cellV.push([cc(i), cc(j), true]);
    if (o.s || o.n) cellV.push([cc(i), cc(j), false]);
    if (o.e) gapV.push([i * CS + 7.5, cc(j), true]);
    if (o.s) gapV.push([cc(i), j * CS + 7.5, false]);
  }
  const placeV = (list, geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, z, ew], k) => { m4.compose(v3.set(x, SPRING, z), ew ? qY : q0, s3.set(1, 1, 1)); im.setMatrixAt(k, m4); }); scene.add(im); };
  // straight runs get the barrel vault; junctions and corners become square chambers with a flat brick ceiling,
  // and each tunnel meets the chamber through a brick headwall with an arch cut in it (no vaults poking through each other)
  const isChamber = (i, j) => { const o = opens(i, j); return (o.e || o.w) && (o.n || o.s); };
  placeV(cellV.filter(([x, z]) => !isChamber((x - 4) / CS, (z - 4) / CS)), vaultGeo(6), vaultM([3, 2])); placeV(gapV, vaultGeo(1), vaultM([3, 0.34]));
  const chambers = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (isChamber(i, j)) chambers.push([i, j]);
  const ceilIM = new THREE.InstancedMesh(new THREE.BoxGeometry(6.02, 0.3, 6.02), std(0xffffff, { map: tex('sewerBrick', [3, 3]), roughness: 0.85 }), chambers.length);
  chambers.forEach(([i, j], k) => { m4.makeTranslation(cc(i), SPRING + RAD + 0.15, cc(j)); ceilIM.setMatrixAt(k, m4); }); scene.add(ceilIM);
  const head = new THREE.Shape([new THREE.Vector2(-3, 0), new THREE.Vector2(3, 0), new THREE.Vector2(3, RAD + 0.05), new THREE.Vector2(-3, RAD + 0.05)]);
  const arch = new THREE.Path(); arch.absarc(0, 0, RAD - 0.01, 0, Math.PI, false); head.holes.push(arch);
  const headGeo = new THREE.ShapeGeometry(head, 20);
  const heads = []; for (const [i, j] of chambers) { const o = opens(i, j); if (o.e) heads.push([cc(i) + 2.99, cc(j), -Math.PI / 2]); if (o.w) heads.push([cc(i) - 2.99, cc(j), Math.PI / 2]); if (o.s) heads.push([cc(i), cc(j) + 2.99, Math.PI]); if (o.n) heads.push([cc(i), cc(j) - 2.99, 0]); }
  const headIM = new THREE.InstancedMesh(headGeo, std(0xffffff, { map: tex('sewerBrick', [0.5, 0.5]), roughness: 0.8, side: THREE.DoubleSide }), heads.length);
  heads.forEach(([x, z, ry], k) => { m4.compose(v3.set(x, SPRING, z), q0.clone().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), s3.set(1, 1, 1)); headIM.setMatrixAt(k, m4); }); scene.add(headIM);
  // the walkways: raised concrete ledges on both sides; the water runs in the channel between them
  const ledges = []; for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (type[z * W + x] === 1) ledges.push([x + 0.5, z + 0.5]);
  const ledgeM = std(0xffffff, { map: tex('sewerConcrete', [1, 1]), roughness: 0.75 });
  const ledgeIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.4, 1), ledgeM, ledges.length);
  ledges.forEach(([x, z], k) => { m4.makeTranslation(x, -0.7, z); ledgeIM.setMatrixAt(k, m4); }); ledgeIM.receiveShadow = true; scene.add(ledgeIM);
  // a rusty curb along the edge of each ledge
  const curbs = []; for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (type[z * W + x] === 1) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (typeAt(x + a, z + b) === 2) curbs.push([x + 0.5 + a * 0.47, z + 0.5 + b * 0.47, a !== 0]);
  const curbIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 0.08), std(0x3a2e22, { metalness: 0.5, roughness: 0.6 }), curbs.length);
  curbs.forEach(([x, z, alongZ], k) => { m4.compose(v3.set(x, 0.01, z), alongZ ? qY : q0, s3.set(1, 1, 1)); curbIM.setMatrixAt(k, m4); }); scene.add(curbIM);
  // the catwalks: a steel grate deck lipping onto both ledges, with pipe railings
  { const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'); gx.fillStyle = '#0a0c0a'; gx.fillRect(0, 0, 64, 64); gx.fillStyle = '#5a5244'; for (let k = 0; k < 8; k++) { gx.fillRect(k * 8, 0, 3, 64); gx.fillRect(0, k * 8, 64, 2); } gx.fillStyle = 'rgba(110,60,20,0.45)'; for (let k = 0; k < 40; k++) gx.fillRect(r() * 64, r() * 64, 2 + r() * 5, 2 + r() * 4);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(1.5, 4);
    const steel = std(0x4a4238, { metalness: 0.7, roughness: 0.5 });
    const deck = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.08, 1.98), std(0xffffff, { map: gt, metalness: 0.6, roughness: 0.55 }), bridges.length);
    const beam = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.2, 1.98), steel, bridges.length * 2);
    const rail = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6).rotateX(Math.PI / 2), steel, bridges.length * 4);
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), steel, bridges.length * 6);
    const qa = new THREE.Quaternion(), place = (im, k, x, y, z, rot) => { m4.compose(v3.set(x, y, z), rot ? qY : qa, s3.set(1, 1, 1)); im.setMatrixAt(k, m4); };
    bridges.forEach(([x, z, acrossZ], k) => {
      // local: length along z when the bridge crosses in z
      const P2 = (lx, lz) => (acrossZ ? [x + lx, z + lz] : [x + lz, z + lx]);
      place(deck, k, x, -0.046, z, !acrossZ); // spans exactly ledge to ledge, a hair below their tops: no overlap, no flicker
      [-0.55, 0.55].forEach((lx, s) => { const [px, pz] = P2(lx, 0); place(beam, k * 2 + s, px, -0.16, pz, !acrossZ); [0.95, 0.5].forEach((y, t) => place(rail, k * 4 + s * 2 + t, px, y, pz, !acrossZ)); [-0.98, 0, 0.98].forEach((lz, t) => { const [qx, qz] = P2(lx, lz); m4.makeTranslation(qx, 0.5, qz); post.setMatrixAt(k * 6 + s * 3 + t, m4); }); });
    });
    for (const im of [deck, beam, rail, post]) { im.receiveShadow = true; scene.add(im); } }
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(W, W), std(0x1a2016)); bed.rotation.x = -Math.PI / 2; bed.position.set(W / 2, -1.4, W / 2); scene.add(bed);
  // the water: deep, murky, oily. A soft albedo plus a scrolling ripple normal map; only a faint sick glow.
  const noiseCanvas = (size, seed, blobs, dark, light) => { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); const rr = rng(seed); x.fillStyle = dark; x.fillRect(0, 0, size, size);
    for (let k = 0; k < blobs; k++) { const px = rr() * size, py = rr() * size, rad = 4 + rr() * size * 0.18; for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad); g.addColorStop(0, light(rr)); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px + ox - rad, py + oy - rad, rad * 2, rad * 2); } }
    return c; };
  const wcan = noiseCanvas(256, 31, 140, '#14261a', (rr) => `rgba(${40 + rr() * 40},${70 + rr() * 50},${30 + rr() * 30},${0.25 + rr() * 0.35})`);
  { const x = wcan.getContext('2d'); for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(70,64,30,${0.15 + r() * 0.25})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 2 + r() * 6, 1 + r() * 3, r() * 3, 0, 7); x.fill(); } } // floating scum
  const waterT = new THREE.CanvasTexture(wcan); waterT.wrapS = waterT.wrapT = THREE.RepeatWrapping; waterT.repeat.set(W / 6, W / 6); waterT.colorSpace = THREE.SRGBColorSpace;
  // ripple normals from a blurred height field
  const hcan = noiseCanvas(128, 37, 90, '#808080', (rr) => (rr() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'));
  const ncan = document.createElement('canvas'); ncan.width = ncan.height = 128; { const hx = hcan.getContext('2d').getImageData(0, 0, 128, 128).data, nx = ncan.getContext('2d'), out = nx.createImageData(128, 128); const H = (i, j) => hx[(((j + 128) % 128) * 128 + ((i + 128) % 128)) * 4] / 255;
    for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const dx = (H(i + 1, j) - H(i - 1, j)) * 2.2, dy = (H(i, j + 1) - H(i, j - 1)) * 2.2, l = Math.hypot(dx, dy, 1), o = (j * 128 + i) * 4; out.data[o] = (-dx / l * 0.5 + 0.5) * 255; out.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; out.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[o + 3] = 255; }
    nx.putImageData(out, 0, 0); }
  const waterN = new THREE.CanvasTexture(ncan); waterN.wrapS = waterN.wrapT = THREE.RepeatWrapping; waterN.repeat.set(W / 4, W / 4);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x4a6a3e, map: waterT, normalMap: waterN, normalScale: new THREE.Vector2(0.6, 0.6), emissive: 0x3a7a30, emissiveMap: waterT, emissiveIntensity: 1.0, roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.93 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W, W), waterM); water.rotation.x = -Math.PI / 2; water.position.set(W / 2, -0.55, W / 2); scene.add(water);
  const inWaterAt = (x, z) => typeAt(x, z) === 2;
  // pipes on brackets along some of the walls, and outfall grates
  const pipeM = std(0x3a3226, { metalness: 0.5, roughness: 0.55 });
  const pipes = [], grates = [];
  for (const [x, z, ew] of cellV) {
    const straight = !isChamber((x - 4) / CS, (z - 4) / CS);
    if (straight && r() < 0.5) { const side = r() < 0.5 ? -1 : 1; pipes.push(ew ? [x, z + side * 2.78, true, side] : [x + side * 2.78, z, false, side]); }
    if (r() < 0.18) { const side = r() < 0.5 ? -1 : 1; grates.push(ew ? [x + (r() - 0.5) * 3, z + side * 2.99, true, side] : [x + side * 2.99, z + (r() - 0.5) * 3, false, side]); }
  }
  // pipes run along the wall just under the springline, held on by brackets bolted into the brick
  const PIPE_Y = 2.15;
  const pipeIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.11, 7, 10).rotateZ(Math.PI / 2), pipeM, pipes.length);
  pipes.forEach(([x, z, ew], k) => { m4.compose(v3.set(x, PIPE_Y, z), ew ? q0 : qY, s3.set(1, 1, 1)); pipeIM.setMatrixAt(k, m4); }); scene.add(pipeIM);
  const brIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.3, 0.26), std(0x2a241c, { metalness: 0.6, roughness: 0.6 }), pipes.length * 4);
  const collarIM = new THREE.InstancedMesh(new THREE.TorusGeometry(0.12, 0.025, 5, 10), std(0x2a241c, { metalness: 0.6, roughness: 0.6 }), pipes.length * 4);
  pipes.forEach(([x, z, ew, side], k) => { for (let b = 0; b < 4; b++) { const t = -2.4 + b * 1.6, bx = ew ? x + t : x + side * 0.13, bz = ew ? z + side * 0.13 : z + t;
    m4.compose(v3.set(bx, PIPE_Y, bz), ew ? q0 : qY, s3.set(1, 1, 1)); brIM.setMatrixAt(k * 4 + b, m4);
    m4.compose(v3.set(ew ? x + t : x, PIPE_Y, ew ? z : z + t), ew ? qY : q0, s3.set(1, 1, 1)); collarIM.setMatrixAt(k * 4 + b, m4); } });
  scene.add(brIM); scene.add(collarIM);
  const grateT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#050605'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#4a3c2a'; for (let k = 0; k < 7; k++) g.fillRect(4 + k * 9, 0, 4, 64); g.fillRect(0, 0, 64, 5); g.fillRect(0, 59, 64, 5); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const [x, z, ew, side] of grates) { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), std(0xffffff, { map: grateT, roughness: 0.7 })); g.position.set(x, 0.45, z); g.rotation.y = ew ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2); scene.add(g); }

  // ---------------- sewer lights: caged box lamps on the walls, weak, a lot of them dead ----------------
  const fixtures = [];
  const splashT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const housingM = std(0x2a2a22, { metalness: 0.6, roughness: 0.5 });
  const barM = std(0x1a1a14, { metalness: 0.7 });
  for (const [cx, cz, ew] of cellV) {
    if (r() < 0.3 && !(cx === cc(0) && cz === cc(0))) continue; // dead
    const side = r() < 0.5 ? -1 : 1;
    // mounted on a tunnel wall, facing into the tunnel
    const ox = ew ? (r() - 0.5) * 2 : side * 2.92, oz = ew ? side * 2.92 : (r() - 0.5) * 2;
    if (typeAt(cx + ox + (ew ? 0 : side * 0.6), cz + oz + (ew ? side * 0.6 : 0)) !== 0) continue; // that side is an opening
    const x = cx + ox, z = cz + oz, ry = ew ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    const g = new THREE.Group(); g.position.set(x, 2.05, z); g.rotation.y = ry; scene.add(g);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.18), housingM); housing.position.z = 0.09; g.add(housing);
    const lensM = std(0x222222, { emissive: 0xa8f0d8, emissiveIntensity: 1.5 });
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.04), lensM); lens.position.z = 0.2; g.add(lens);
    for (const bx of [-0.12, 0, 0.12]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.025), barM); bar.position.set(bx, 0, 0.25); g.add(bar); }
    for (const by of [-0.12, 0.12]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.025), barM); bar.position.set(0, by, 0.25); g.add(bar); }
    const gl = makeGlow(0x8ee0c8, 1.5, 0.6); gl.position.set(0, 0, 0.32); g.add(gl);
    const lx = x + (ew ? 0 : -side * 0.5), lz = z + (ew ? -side * 0.5 : 0);
    // a constant pool of light on the ledge below the lamp (the real lights only add to it), so nothing pops as you walk
    const splash = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), new THREE.MeshBasicMaterial({ map: splashT, color: 0x5aa890, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    splash.rotation.x = -Math.PI / 2; splash.position.set(lx, 0.015, lz); scene.add(splash);
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), new THREE.MeshBasicMaterial({ map: splashT, color: 0x4a9880, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); wash.position.set(0, 0, 0.03); g.add(wash);
    fixtures.push({ x: lx, z: lz, lens: lensM, gl, f: 1, flick: r() < 0.3, on: true, splash, wash });
  }
  const pool = Array.from({ length: 10 }, () => { const l = new THREE.PointLight(0x8ee0c8, 0, 13, 1.4); l.userData.cur = 0; scene.add(l); return l; });
  const hemi = new THREE.HemisphereLight(0x4a6a4a, 0x0a140a, 0.2); scene.add(hemi);
  let poolT = 0, lightsOn = true;
  function updatePool(dt) {
    poolT -= dt;
    if (poolT <= 0) {
      poolT = 0.25;
      // keep lights on fixtures that are still close; only a light that has faded out gets moved to a new fixture
      const near = fixtures.filter((f) => f.on).map((f) => [f, Math.hypot(f.x - P.pos.x, f.z - P.pos.z)]).sort((a, b) => a[1] - b[1]).slice(0, pool.length).map((n) => n[0]);
      for (const l of pool) if (l.userData.f && !near.includes(l.userData.f)) l.userData.leaving = true; else l.userData.leaving = false;
      for (const f of near) if (!pool.some((l) => l.userData.f === f)) { const free = pool.find((l) => !l.userData.f || (l.userData.leaving && l.userData.cur < 0.05)); if (free) { free.userData.f = f; free.userData.leaving = false; free.userData.cur = 0; free.position.set(f.x, 2.0, f.z); } }
    }
    for (const f of fixtures) if (f.on && f.flick) {
      f.f = Math.random() < 0.05 ? Math.random() * 0.25 : Math.min(1, f.f + dt * 4);
      f.gl.material.opacity = 0.5 * f.f; f.lens.emissiveIntensity = 1.5 * f.f;
      if (f.f < 0.3 && Math.random() < 0.25 && Math.hypot(f.x - P.pos.x, f.z - P.pos.z) < 12) audio.flicker({ x: f.x, y: 2.0, z: f.z }, 0.7);
    }
    pool.forEach((l) => { const f = l.userData.f; const want = f && f.on && lightsOn && !l.userData.leaving ? 1 : 0; l.userData.cur += (want - l.userData.cur) * Math.min(1, dt * 2.5); l.intensity = f ? 15 * f.f * l.userData.cur : 0; });
    for (const f of fixtures) { const k = f.on && lightsOn ? f.f : 0; f.splash.material.opacity = 0.32 * k; f.wash.material.opacity = 0.22 * k; }
  }

  // ---------------- start: under the hatch ----------------
  const SX = cc(0) + 2, SZ = cc(0);
  const shaft = makeBeam(4, 0.6, 0x9ab0a0, 0.08); shaft.position.set(SX, 5.6, 1.9); shaft.rotation.x = Math.PI / 2; scene.add(shaft);
  for (let k = 0; k < 12; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), std(0x5a4a3a, { metalness: 0.6 })); rung.position.set(SX, 0.4 + k * 0.38, 1.06); scene.add(rung); }
  // a maintenance map bolted to the wall at the start
  const mapPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), std(0xb8b090, { roughness: 0.9 })); mapPlate.position.set(1.04, 1.5, cc(0) + 1.5); mapPlate.rotation.y = Math.PI / 2; scene.add(mapPlate);
  // ---------------- the exit: a ladder up to a manhole, street light coming down ----------------
  const EX = cc(N - 1), EZ = cc(N - 1);
  const LADX = EX + 2, LADZ = (N - 1) * CS + 6.95;
  for (let k = 0; k < 12; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), std(0x6a5a40, { metalness: 0.6 })); rung.position.set(LADX, 0.4 + k * 0.38, LADZ - 0.1); scene.add(rung); }
  for (const s of [-0.25, 0.25]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.6, 0.04), std(0x6a5a40, { metalness: 0.6 })); rail.position.set(LADX + s, 2.3, LADZ - 0.1); scene.add(rail); }
  const holeBeam = makeBeam(4, 0.7, 0xe8c890, 0.1); holeBeam.position.set(LADX, 5.6, LADZ - 0.5); holeBeam.rotation.x = Math.PI / 2; scene.add(holeBeam);
  const holeL = new THREE.SpotLight(0xe8c890, 14, 7, 0.5, 0.6, 1.4); holeL.position.set(LADX, 5.4, LADZ - 0.5); holeL.target.position.set(LADX, 0, LADZ - 0.6); scene.add(holeL); scene.add(holeL.target);

  // ---------------- the old man ----------------
  const mid = solve[Math.floor(solve.length * 0.48)], nxt = solve[Math.floor(solve.length * 0.48) + 1] || mid;
  const along = nxt[0] !== mid[0] ? 'x' : 'z';
  const HX = cc(mid[0]) + (along === 'z' ? 2.1 : 0), HZ = cc(mid[1]) + (along === 'x' ? 2.1 : 0);
  const hobo = makeCharacter('hobo', { shirt: 0x4a4a2a, pants: 0x3a3022, skin: 0x8a6a52, hair: 0x9a9a8a }, 1.68);
  hobo.group.position.set(HX, 0, HZ); scene.add(hobo.group); animateWalk(hobo, 0, 0, false);
  hobo.group.traverse((m) => { if (m.isMesh && m.material) m.material.color.multiplyScalar(0.85); });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.85, 10), std(0x3a2a1a, { metalness: 0.5, roughness: 0.7 }));
  const BX = HX + (along === 'z' ? 0.25 : 1.1), BZ = HZ + (along === 'x' ? 0.25 : 1.1);
  barrel.position.set(BX - (along === 'z' ? 0 : 0) , 0.43, BZ); scene.add(barrel); grid.rect(Math.floor(BX), Math.floor(BZ), Math.floor(BX), Math.floor(BZ), 1, 0);
  const fire = makeGlow(0xff8a30, 0.7, 0.9); fire.position.set(BX, 0.95, BZ); scene.add(fire);
  const fireL = new THREE.PointLight(0xff8a30, 5, 7, 1.6); fireL.position.set(BX, 1.2, BZ); scene.add(fireL);
  // his things: a shopping cart, a mattress, cans
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 1.0), std(0x8a8e90, { metalness: 0.8, roughness: 0.3, wireframe: true })); cart.position.set(HX + (along === 'x' ? 1.4 : -0.3), 0.6, HZ + (along === 'z' ? 1.4 : -0.3)); scene.add(cart);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? 1.8 : 0.9, 0.15, along === 'x' ? 0.9 : 1.8), std(0x6a5a40, { roughness: 1 })); mattress.position.set(HX - (along === 'x' ? 1.4 : 0), 0.08, HZ - (along === 'z' ? 1.4 : 0)); scene.add(mattress);
  let hoboState = 'wait', hoboT = 0, lurk = null;
  // a walkable spot you can't see from where you stand, right beside your line of sight to the ladder
  function findCorner() {
    const dx = LADX - P.pos.x, dz = LADZ - P.pos.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
    let best = null, bs = -1e9;
    for (let a = 0; a < 48; a++) for (const rr of [1.8, 2.4, 3, 3.6, 4.4]) {
      const ang = (a / 48) * Math.PI * 2, x = P.pos.x + Math.cos(ang) * rr, z = P.pos.z + Math.sin(ang) * rr;
      if (!typeAt(x, z) || grid.blocked(x, z, 0.3) || grid.los(P.pos.x, P.pos.z, x, z)) continue;
      const ahead = (x - P.pos.x) * ux + (z - P.pos.z) * uz; if (ahead < 0.8) continue;
      for (const f of [1.6, 2.2, 2.8]) { const fx = P.pos.x + ux * f, fz = P.pos.z + uz * f; if (!grid.los(x, z, fx, fz)) continue; const sc = -Math.hypot(x - fx, z - fz) - Math.abs(rr - 2.8) * 0.3; if (sc > bs) { bs = sc; best = { x, z, fx, fz }; } }
    }
    if (best) return best;
    // no corner to hide behind: he comes in from the side, just outside your light
    const sx = P.pos.x + ux * 1.8 - uz * 2.6, sz = P.pos.z + uz * 1.8 + ux * 2.6;
    return { x: sx, z: sz, fx: P.pos.x + ux * 1.8, fz: P.pos.z + uz * 1.8 };
  }

  // ---------------- the burst pipe: a rusted joint that lets go right beside you in a blast of steam ----------------
  const burst = (() => {
    const target = solve[Math.max(2, Math.floor(solve.length * 0.3))];
    let best = null, bd = 1e9; for (const p of pipes) { const d = Math.hypot(p[0] - cc(target[0]), p[1] - cc(target[1])); if (d < bd) { bd = d; best = p; } }
    if (!best) return null;
    const [x, z, ew, side] = best, jx = ew ? x + 0.8 : x, jz = ew ? z : z + 0.8;
    // the split joint: a rusty flange, and a crack facing out into the tunnel
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10).rotateZ(Math.PI / 2), std(0x5a3418, { metalness: 0.4, roughness: 0.9 })); fl.position.set(jx, PIPE_Y, jz); if (!ew) fl.rotation.y = Math.PI / 2; scene.add(fl);
    const outX = ew ? 0 : -side, outZ = ew ? -side : 0;
    const puffT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const puffs = Array.from({ length: 70 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, color: 0xd8ece4, transparent: true, opacity: 0, depthWrite: false })); sp.visible = false; scene.add(sp); return { sp, life: 0, vx: 0, vy: 0, vz: 0 }; });
    return { x: jx, z: jz, outX, outZ, puffs, fired: false, t: 0, emit: 0 };
  })();
  function updateSteam(dt) {
    if (!burst) return;
    const d = Math.hypot(P.pos.x - burst.x, P.pos.z - burst.z);
    if (!burst.fired && d < 3.2) {
      burst.fired = true; burst.t = 0;
      audio.noise({ dur: 2.8, type: 'highpass', freq: 2500, gain: 0.9, attack: 0.01, pos: { x: burst.x, y: PIPE_Y, z: burst.z } });
      audio.noise({ dur: 1.2, type: 'lowpass', freq: 400, gain: 0.7, attack: 0.005, pos: { x: burst.x, y: PIPE_Y, z: burst.z } });
      audio.clunk({ x: burst.x, y: PIPE_Y, z: burst.z }, 1); audio.hit(0.9); ui.shake(0.08, 0.6); ui.flash(0.25);
    }
    if (!burst.fired) return;
    burst.t += dt;
    // a hard blast for a second and a half, then it settles into a steady hissing leak
    const rate = burst.t < 1.5 ? 70 : 16; burst.emit += dt * rate;
    if (burst.t > 1.5 && Math.random() < dt * 0.6) audio.noise({ dur: 1.2, type: 'highpass', freq: 3000, gain: 0.12, attack: 0.2, pos: { x: burst.x, y: PIPE_Y, z: burst.z } });
    while (burst.emit >= 1) { burst.emit -= 1; const p = burst.puffs.find((q) => q.life <= 0); if (!p) break;
      const sp = burst.t < 1.5 ? 6 + Math.random() * 3 : 1.6 + Math.random();
      p.life = 1; p.vx = burst.outX * sp + (Math.random() - 0.5) * 1.2; p.vz = burst.outZ * sp + (Math.random() - 0.5) * 1.2; p.vy = (Math.random() - 0.3) * 1.2;
      p.sp.position.set(burst.x + burst.outX * 0.15, PIPE_Y, burst.z + burst.outZ * 0.15); p.sp.visible = true; }
    for (const p of burst.puffs) if (p.life > 0) {
      p.life -= dt * 0.7; p.vx *= 1 - dt * 1.8; p.vz *= 1 - dt * 1.8; p.vy += dt * 0.6;
      p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
      const s2 = 0.35 + (1 - p.life) * 2.6; p.sp.scale.set(s2, s2, s2); p.sp.material.opacity = Math.max(0, p.life) * (burst.t < 2 ? 0.8 : 0.5);
      if (p.life <= 0) p.sp.visible = false;
    }
  }

  // ---------------- rats: little bodies with a little brain. They keep to the dry ledges, nose around,
  // wander, and bolt away from you (and from your light). They never cross the water. ----------------
  const furM = std(0x3a322a, { roughness: 0.7, metalness: 0.05 }), pinkM = std(0x8a5a52, { roughness: 0.6 }), eyeM = new THREE.MeshBasicMaterial({ color: 0x1a0806 });
  const bodyG = new THREE.SphereGeometry(0.5, 12, 8), headG = new THREE.ConeGeometry(0.045, 0.13, 8).rotateX(Math.PI / 2), earG = new THREE.SphereGeometry(0.022, 6, 4), legG = new THREE.BoxGeometry(0.018, 0.04, 0.018);
  const tailG = (() => { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(Math.sin(t * 2.2) * 0.04, 0.02 - t * 0.02, -t * 0.26)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.009, 4); })();
  const ratDry = (x, z) => walkT(x, z) && !grid.isSolid(x, z);
  const rats = [];
  for (let k = 0; k < 40 && rats.length < 22; k++) {
    const x = 2 + r() * (W - 4), z = 2 + r() * (W - 4);
    if (typeAt(x, z) !== 1 || Math.hypot(x - cc(0), z - cc(0)) < 8) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r() * 6;
    const body = new THREE.Mesh(bodyG, furM); body.scale.set(0.085, 0.072, 0.23); body.position.y = 0.055; g.add(body);
    const head = new THREE.Mesh(headG, furM); head.position.set(0, 0.06, 0.16); g.add(head);
    const nose = new THREE.Mesh(earG, pinkM); nose.scale.setScalar(0.4); nose.position.set(0, 0.058, 0.225); g.add(nose);
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(earG, pinkM); ear.scale.set(1, 1, 0.4); ear.position.set(sx * 0.03, 0.095, 0.13); g.add(ear); const eye = new THREE.Mesh(earG, eyeM); eye.scale.setScalar(0.35); eye.position.set(sx * 0.024, 0.075, 0.185); g.add(eye); }
    const legs = []; for (const [lx, lz] of [[-0.04, 0.07], [0.04, 0.07], [-0.045, -0.06], [0.045, -0.06]]) { const l = new THREE.Mesh(legG, furM); l.position.set(lx, 0.02, lz); g.add(l); legs.push(l); }
    const tail = new THREE.Mesh(tailG, pinkM); tail.position.set(0, 0.02, -0.1); g.add(tail);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    scene.add(g); rats.push({ g, body, head, tail, legs, state: 'idle', t: r() * 2, tx: x, tz: z, speed: 0, ph: r() * 6, think: 0 });
  }
  function ratStep(rt, dt) {
    const g = rt.g, p = g.position;
    const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
    // scared of you up close, or of your flashlight from further off
    G.camera.getWorldDirection(tmpA); const toR = Math.atan2(p.x - P.pos.x, p.z - P.pos.z), lookA = Math.atan2(tmpA.x, tmpA.z);
    const inBeam = P.flashlight && d < 8 && Math.abs(Math.atan2(Math.sin(toR - lookA), Math.cos(toR - lookA))) < 0.35;
    if ((d < 3.6 || inBeam) && rt.state !== 'flee') { rt.state = 'flee'; rt.think = 0; rt.t = 0; if (Math.random() < 0.7) audio.rats({ x: p.x, y: 0.1, z: p.z }); }
    rt.think -= dt;
    if (rt.state === 'flee') {
      if (rt.think <= 0) { // pick the dry direction that takes it furthest from you
        rt.think = 0.3; let best = null, bs = -1e9;
        for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2, nx = p.x + Math.sin(ang) * 1.4, nz = p.z + Math.cos(ang) * 1.4, mx = p.x + Math.sin(ang) * 0.7, mz = p.z + Math.cos(ang) * 0.7;
          if (!ratDry(nx, nz) || !ratDry(mx, mz)) continue; const sc = Math.hypot(nx - P.pos.x, nz - P.pos.z) + Math.random() * 0.3; if (sc > bs) { bs = sc; best = [nx, nz]; } }
        if (best) { rt.tx = best[0]; rt.tz = best[1]; }
      }
      rt.speed = 3.2;
      if (d > 9) { rt.state = 'idle'; rt.t = 1 + Math.random() * 2; }
    } else if (rt.state === 'idle') {
      rt.speed = 0; rt.t -= dt;
      if (rt.t <= 0) { // wander a little way along the ledge
        for (let k = 0; k < 8; k++) { const ang = Math.random() * 6.28, rr = 1 + Math.random() * 2.5, nx = p.x + Math.sin(ang) * rr, nz = p.z + Math.cos(ang) * rr; if (ratDry(nx, nz) && ratDry((p.x + nx) / 2, (p.z + nz) / 2)) { rt.tx = nx; rt.tz = nz; rt.state = 'wander'; break; } }
        rt.t = 0.6 + Math.random() * 2.5;
      }
    } else if (rt.state === 'wander') { rt.speed = 0.8; if (Math.hypot(rt.tx - p.x, rt.tz - p.z) < 0.1) { rt.state = 'idle'; rt.t = 0.8 + Math.random() * 3; } }
    // move, never onto water or into walls
    if (rt.speed > 0) {
      const dx = rt.tx - p.x, dz = rt.tz - p.z, dl = Math.hypot(dx, dz);
      if (dl > 0.05) {
        const st = Math.min(dl, rt.speed * dt), nx = p.x + dx / dl * st, nz = p.z + dz / dl * st;
        if (ratDry(nx, nz)) { p.x = nx; p.z = nz; } else { rt.think = 0; if (rt.state === 'wander') rt.state = 'idle'; }
        let df = Math.atan2(dx, dz) - g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); g.rotation.y += df * Math.min(1, dt * 14);
      } else if (rt.state === 'flee') rt.think = 0;
    }
    // little animation: scurry, sniff, tail
    rt.ph += dt * (rt.speed > 0 ? 6 + rt.speed * 8 : 2);
    const run = Math.min(1, rt.speed / 2);
    rt.body.position.y = 0.055 + Math.abs(Math.sin(rt.ph)) * 0.015 * run;
    rt.legs.forEach((l, i) => { l.position.y = 0.02 + Math.max(0, Math.sin(rt.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.5 : 0))) * 0.02 * run; });
    rt.head.rotation.x = rt.speed === 0 ? Math.sin(rt.ph * 3) * 0.12 : 0; rt.head.position.y = 0.06 + (rt.speed === 0 ? Math.sin(rt.ph * 1.3) * 0.008 : 0);
    rt.tail.rotation.y = Math.sin(rt.ph * (rt.speed > 0 ? 1.2 : 0.4)) * 0.35;
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
  P.pos.set(SX, 0, 2.3); P.yaw = Math.PI; P.pitch = -0.2; P.flashlight = false;
  P.battery = Math.max(P.battery, 0.45);
  at(0.4, () => { audio.splash({ x: P.pos.x, y: 0.2, z: P.pos.z }, 2); ui.shake(0.03, 0.3); audio.clunk({ x: cc(0), y: 3.2, z: 1.2 }, 0.5); });
  at(1.6, () => { ui.objective('Find a way out. Press TAB for the drain map.'); });
  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 1.9, z: cc(0) + 1.5, r: 1.6, label: 'Read the maintenance map', action: () => { const c = document.createElement('canvas'); c.width = 560; c.height = 560; L.drawMap(c.getContext('2d'), 560, 560); ui.note(`<h3>L.A. COUNTY STORM DRAIN — SECTOR 7 (MAINTENANCE)</h3><img src="${c.toDataURL()}" style="width:100%;display:block">`); } });
  it({ x: LADX, z: LADZ - 0.9, r: 1.6, label: 'Climb the ladder', enabled: () => stage === 'climb', action: async () => {
    stage = 'out'; ui.objective(''); P.frozen = true; P.lookLock = { yaw: Math.PI, pitch: 1.2, k: 2 };
    audio.clunk({ x: LADX, y: 3, z: LADZ }, 0.6);
    await new Promise((res) => setTimeout(res, 1200));
    game.saveHere();
    audio.noise({ dur: 3, type: 'lowpass', freq: 500, gain: 0.3, attack: 1, brown: true });
    game.sewerEnd();
  } });

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  let stepSplash = 0, wasWet = false, chokeT = 0;
  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    updatePool(dt); updateSteam(dt);
    waterT.offset.x += dt * 0.012; waterT.offset.y += dt * 0.006; waterN.offset.x -= dt * 0.025; waterN.offset.y += dt * 0.018;
    fireL.intensity = 4.2 + Math.random() * 1.6; fire.material.opacity = 0.75 + Math.random() * 0.2;
    // wading slows you down and splashes
    const inWater = inWaterAt(P.pos.x, P.pos.z);
    L.speedMul = inWater ? 0.5 : 1; L.surface = inWater ? 'wet' : 'concrete';
    // the water is poison: it burns, you choke, and you can drown in it if you stay
    if (inWater && stage !== 'out') {
      if (!wasWet) { audio.splash({ x: P.pos.x, y: 0, z: P.pos.z }, 2.2); ui.shake(0.04, 0.3); }
      P.health = Math.max(0, P.health - dt * 0.07); chokeT -= dt;
      if (chokeT <= 0) { chokeT = 1.6 + Math.random(); audio.gasp(); ui.flash(0.08); }
      if (P.health <= 0) { game.collapse('The water was poison. Stay on the ledges and use the catwalks.'); }
    }
    wasWet = inWater;
    if (inWater && P.speedNow > 0.5) { stepSplash -= dt * P.speedNow; if (stepSplash <= 0) { stepSplash = 0.9; audio.splash({ x: P.pos.x, y: 0.1, z: P.pos.z }, P.sprinting ? 1.4 : 0.7); } }
    // drips, distant clanks, rats you never see
    if (Math.random() < dt * 1.5) audio.drip({ x: P.pos.x + (Math.random() - 0.5) * 10, y: 2.5, z: P.pos.z + (Math.random() - 0.5) * 10 });
    if (Math.random() < dt * 0.05) audio.metalGroan({ x: P.pos.x + (Math.random() - 0.5) * 20, y: 2, z: P.pos.z + (Math.random() - 0.5) * 20 });
    if (Math.random() < dt * 0.04) audio.rats({ x: P.pos.x + (Math.random() - 0.5) * 12, y: 0.1, z: P.pos.z + (Math.random() - 0.5) * 12 });
    // trucks over your head near the exit
    const dExit = Math.hypot(P.pos.x - EX, P.pos.z - EZ);
    truckCD -= dt;
    if (dExit < 18 && truckCD <= 0 && stage === 'walk') { truckCD = 7 + Math.random() * 6; audio.noise({ dur: 3.5, type: 'lowpass', freq: 220, gain: 0.5, attack: 1.2, brown: true, pos: { x: P.pos.x, y: 4, z: P.pos.z } }); ui.shake(0.01, 2); }
    // rats
    for (const rt of rats) if (Math.abs(rt.g.position.x - P.pos.x) < 30 && Math.abs(rt.g.position.z - P.pos.z) < 30) ratStep(rt, dt);
    // the old man by his fire
    const hg = hobo.group.position;
    const dH = Math.hypot(P.pos.x - hg.x, P.pos.z - hg.z);
    if (hoboState !== 'scare' && hoboState !== 'gone') { const want = Math.atan2(P.pos.x - hg.x, P.pos.z - hg.z); let df = want - hobo.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); hobo.group.rotation.y += df * Math.min(1, dt * (dH < 8 ? 2 : 0.3)); }
    if (hoboState === 'wait' && dH < 6.5) {
      hoboState = 'talk'; audio.hit(0.3);
      say('h1', 'j1', 'h2', 'h3', 'h4').then(() => { hoboState = 'done'; ui.objective('Keep the wall on your right. Find the ladder.'); });
    }
    // the exit: the lights die, you can't move, and he's waiting in front of the ladder
    if (stage === 'walk' && dExit < 5) {
      stage = 'cut'; cutT = 0; P.frozen = true; ui.objective(''); lightsOn = false;
      audio.powerDown({ x: P.pos.x, y: 3, z: P.pos.z }); holeL.intensity = 0; hemi.intensity = 0.03; holeBeam.visible = false; fireL.visible = false; fire.visible = false;
      fixtures.forEach((f, k) => { setTimeout(() => { f.on = false; f.gl.visible = false; f.lens.emissiveIntensity = 0; f.splash.visible = false; f.wash.visible = false; if (Math.hypot(f.x - P.pos.x, f.z - P.pos.z) < 14) audio.flicker({ x: f.x, y: 2.8, z: f.z }, 1); }, Math.min(900, Math.hypot(f.x - P.pos.x, f.z - P.pos.z) * 25)); });
      audio.setLoop('water', 0.12, 1); audio.setLoop('drone', 0.5, 2);
      // he steps out of the dark between you and the ladder
      // he's already down here, hiding just around the corner between you and the ladder
      hoboState = 'lurk'; lurk = findCorner(); hobo.group.position.set(lurk.x, L.groundAt(lurk.x, lurk.z), lurk.z);
      hobo.group.rotation.y = Math.atan2(lurk.fx - lurk.x, lurk.fz - lurk.z); animateWalk(hobo, 0, 0, false); hobo.group.visible = true;
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
        audio.scream(); audio.hit(1.2); audio.stinger(1); ui.flash(0.5); ui.shake(0.12, 0.8);
      }
    }
    if (stage === 'scare') {
      scareT += dt;
      const fx = tmpB.x, fz = tmpB.z;
      // the light stutters and drops right as he's in your face
      L.flicker = scareT < 1.6 ? (Math.random() < 0.25 ? 0.05 : 0.28) : 1;
      const hp = hobo.group.position;
      if (scareT < 0.3) {
        // he lunges out from behind the corner into the beam
        const k = scareT / 0.3, e = k * k * (3 - 2 * k), tx = P.pos.x + fx * 1.4, tz = P.pos.z + fz * 1.4;
        hp.set(lurk.x + (tx - lurk.x) * e, P.gy + 0.14 * e, lurk.z + (tz - lurk.z) * e);
        hobo.group.rotation.y = Math.atan2(P.pos.x - hp.x, P.pos.z - hp.z); animateWalk(hobo, scareT * 30, 1, false, 5);
      } else if (scareT < 1.6) {
        const d = scareT < 0.42 ? 1.4 - (scareT - 0.3) / 0.12 * 0.65 : 0.75;
        hp.set(P.pos.x + fx * d, P.gy + 0.14 + Math.sin(scareT * 40) * 0.012, P.pos.z + fz * d); hobo.group.rotation.y = Math.atan2(-fx, -fz); animateWalk(hobo, 0, 0, false);
        P.pitch += (0.04 - P.pitch) * Math.min(1, dt * 8);
      }
      else hobo.group.position.y += (L.groundAt(hobo.group.position.x, hobo.group.position.z) - hobo.group.position.y) * Math.min(1, dt * 4);
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
    c.fillStyle = 'rgba(70,120,60,0.45)'; for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (type[z * W + x] === 2) c.fillRect(x * s, z * s, s + 0.5, s + 0.5);
    c.fillStyle = '#6a5a44'; for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) if (type[z * W + x] === 3) c.fillRect(x * s, z * s, s + 0.5, s + 0.5);
    c.font = 'bold 12px Oswald, sans-serif'; c.textAlign = 'center';
    c.fillStyle = '#1d1b17'; c.fillText('HATCH', cc(0) * s, cc(0) * s - 6);
    c.strokeStyle = '#b3261e'; c.lineWidth = 3; c.beginPath(); c.moveTo((EX - 1) * s, (EZ - 1) * s); c.lineTo((EX + 1) * s, (EZ + 1) * s); c.moveTo((EX + 1) * s, (EZ - 1) * s); c.lineTo((EX - 1) * s, (EZ + 1) * s); c.stroke();
    c.fillStyle = '#b3261e'; c.fillText('LADDER', EX * s, EZ * s - 14);
    c.save(); c.translate(P.pos.x * s, P.pos.z * s); c.rotate(-P.yaw); c.fillStyle = '#b3261e'; c.beginPath(); c.moveTo(0, -7); c.lineTo(4, 5); c.lineTo(-4, 5); c.closePath(); c.fill(); c.restore();
  };
  L.dispose = () => { ui.bigHint(''); };
  return L;
}
