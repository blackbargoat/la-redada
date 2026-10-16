// The rest of the city, out past the streets you can walk: rows of blocks fading into the fog and a far skyline,
// so there is never a flat horizon. Technique from Ricardo Cabello's "City" / Jerome Etienne's "procedural city in
// 100 lines": thousands of random boxes sharing one tiny pixel-art window texture. Here it's two InstancedMeshes.
import * as THREE from 'three';
import { rng } from './textures.js?v=1792150673';

// returns { map, emi }: map = walls + windows (white walls, tinted per material), emi = only the lit windows
function windowTex(seed, night) {
  const r = rng(seed);
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = 32; e.height = 64; const ex = e.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 32, 64); ex.fillStyle = '#000'; ex.fillRect(0, 0, 32, 64);
  for (let y = 2; y < 64; y += 2) for (let k = 0; k < 32; k += 2) {
    if (r() < (night ? 0.26 : 0.09)) { const w = 150 + r() * 105; const cs = `rgb(${w},${w * 0.82 | 0},${w * 0.55 | 0})`; x.fillStyle = cs; ex.fillStyle = cs; ex.fillRect(k, y, 2, 1); } else { const v = r() * 64 | 0; x.fillStyle = `rgb(${v},${v},${v})`; }
    x.fillRect(k, y, 2, 1);
  }
  // upscale without smoothing so the windows stay crisp
  const up = (src) => { const big = document.createElement('canvas'); big.width = 512; big.height = 1024; const b = big.getContext('2d'); b.imageSmoothingEnabled = false; b.drawImage(src, 0, 0, 512, 1024); const t = new THREE.CanvasTexture(big); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return { map: up(c), emi: up(e) };
}

// Additive window glow that the fog only thins out (instead of replacing with fog colour), so lit windows
// read through heavy night fog as backlit squares.
const hiddenM = new THREE.MeshBasicMaterial({ visible: false });
export function glowMaterial(emi, strength = 1, fogScale = 0.3) {
  const m = new THREE.MeshBasicMaterial({ map: emi, color: new THREE.Color(strength, strength, strength), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `
      #ifdef USE_FOG
        #ifdef FOG_EXP2
          float gf = 1.0 - exp( - fogDensity * fogDensity * ${fogScale.toFixed(3)} * vFogDepth * vFogDepth );
        #else
          float gf = smoothstep( fogNear, fogFar * 2.5, vFogDepth );
        #endif
        gl_FragColor.rgb *= ( 1.0 - gf );
      #endif`);
  };
  return m;
}
export const glowMats = (g) => [g, g, hiddenM, hiddenM, g, g];

// far skyline texture: wall colour, darker windows, some lit; drawn already "hazed" since it ignores fog
function farTex(seed, wall, win, litP) {
  const r = rng(seed);
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = wall; x.fillRect(0, 0, 32, 64);
  for (let y = 2; y < 64; y += 2) for (let k = 0; k < 32; k += 2) { if (r() < litP) { const w = litP < 0.08 ? 60 + r() * 30 : 200 + r() * 55; x.fillStyle = `rgb(${w},${w * 0.8 | 0},${w * 0.5 | 0})`; } else x.fillStyle = win; x.fillRect(k, y, 2, 1); }
  const big = document.createElement('canvas'); big.width = 256; big.height = 512; const b = big.getContext('2d'); b.imageSmoothingEnabled = false; b.drawImage(c, 0, 0, 256, 512);
  const t = new THREE.CanvasTexture(big); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// exclude: list of [x0, z0, x1, z1] rects covering the built streets (nothing spawns on top of them)
export function addSkyline(parent, o = {}) {
  const r = rng(o.seed || 909);
  const night = !o.day;
  const rects = o.exclude;
  const ex0 = Math.min(...rects.map((q) => q[0])), ez0 = Math.min(...rects.map((q) => q[1])), ex1 = Math.max(...rects.map((q) => q[2])), ez1 = Math.max(...rects.map((q) => q[3]));
  const [cx, cz] = o.center || [(ex0 + ex1) / 2, (ez0 + ez1) / 2];
  const inside = (x, z, w) => rects.some(([a, b, c, d]) => x > a - w && x < c + w && z > b - w && z < d + w);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const { map: tex, emi } = windowTex(1234, night);
  const roofM = night ? new THREE.MeshBasicMaterial({ color: 0x050707 }) : new THREE.MeshStandardMaterial({ color: 0x4a3c3a, roughness: 1 });
  // near blocks: lit by the scene, swallowed by its fog
  const nearM = night
    ? new THREE.MeshStandardMaterial({ map: tex, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 1.0, color: 0x2a3230, roughness: 0.95 })
    : new THREE.MeshStandardMaterial({ map: tex, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 0.7, color: 0xb89a88, roughness: 0.95 });
  // far skyline: unlit, pre-hazed toward the sky so it reads as distance
  const farM = new THREE.MeshBasicMaterial({ map: night ? farTex(77, '#131d1c', '#101817', 0.05) : farTex(77, '#a87a7c', '#8a6066', 0.1), fog: false });
  const farRoof = new THREE.MeshBasicMaterial({ color: night ? 0x0a1010 : 0x9a6c72, fog: false });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();

  const near = [];
  const pad = 6;
  for (let tries = 0; near.length < 700 && tries < 6000; tries++) {
    const x = ex0 - 130 + r() * (ex1 - ex0 + 260), z = ez0 - 130 + r() * (ez1 - ez0 + 260);
    const w = 8 + r() * 14, d = 8 + r() * 14, h = 9 + Math.pow(r(), 2) * 34;
    if (inside(x, z, Math.max(w, d) / 2 + pad)) continue;
    near.push([x, z, w, d, h, (r() * 4 | 0) * Math.PI / 2 + (r() - 0.5) * 0.05]);
  }
  const far = [];
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, rad = 230 + r() * 200;
    // downtown: a tight cluster of towers off to one side
    const down = i < 140;
    const ang = down ? (o.downtown ?? -2.4) + (r() - 0.5) * 0.35 : a;
    const rr = down ? 330 + r() * 60 : rad;
    const h = down ? 40 + Math.pow(r(), 1.5) * 120 : 8 + Math.pow(r(), 2) * 40;
    far.push([cx + Math.sin(ang) * rr, cz + Math.cos(ang) * rr, 14 + r() * 18, 14 + r() * 18, h, r() * Math.PI]);
  }
  const make = (list, mats, tintJ) => {
    const im = new THREE.InstancedMesh(geo, mats, list.length);
    list.forEach(([x, z, w, d, h, ry], i) => { m4.compose(p.set(x, 0, z), q.setFromEuler(e.set(0, ry, 0)), s.set(w, h, d)); im.setMatrixAt(i, m4); const v = 1 - r() * tintJ; im.setColorAt(i, col.setRGB(v, v, v)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; parent.add(im); return im;
  };
  make(near, [nearM, nearM, roofM, roofM, nearM, nearM], 0.35);
  if (night) { const gm = glowMaterial(emi, 1.2); const gi = make(near, glowMats(gm), 0); gi.renderOrder = 2; }
  make(far, [farM, farM, farRoof, farRoof, farM, farM], 0.25);
  // a ground plane under it all so nothing floats
  const g = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), night ? new THREE.MeshBasicMaterial({ color: 0x070a0a }) : new THREE.MeshStandardMaterial({ color: 0x5a4a40, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.position.set(cx, -0.05, cz); parent.add(g);
}
