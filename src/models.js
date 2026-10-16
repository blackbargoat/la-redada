// Low-poly (PS3-era) procedural models.
import * as THREE from 'three';
import { jacketTex, tex } from './textures.js?v=1792117344';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// ---- rigged GLB characters (Meshy, generated from concept art) ----
const GLB = {};
export const modelsReady = (async () => {
  const loader = new GLTFLoader();
  await Promise.all(['rafa', 'agent', 'rosa', 'luz', 'gus', 'elena', 'rafa_run', 'agent_run', 'suv', 'cat', 'watcher', 'hobo', 'dale', 'chuy', 'beto', 'lady'].map(async (k) => {
    try {
      const g = await loader.loadAsync(`assets/models/${k}.glb`);
      // strip root motion: keep the hips' vertical bob, pin x/z to the first frame
      for (const clip of g.animations) for (const t of clip.tracks) {
        if (/hips/i.test(t.name) && t.name.endsWith('.position')) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } }
      }
      GLB[k] = g;
    } catch (e) { console.warn('model load failed', k, e); }
  }));
})();
const pixCache = new Map();
// static (unrigged) figure scaled to a height
export function makeStatic(kind, height = 1.8) {
  const src = GLB[kind]; if (!src) return null;
  const obj = src.scene.clone(true);
  const box = new THREE.Box3().setFromObject(obj), s = height / Math.max(0.01, box.max.y - box.min.y), c = box.getCenter(new THREE.Vector3());
  obj.scale.setScalar(s); obj.position.set(-c.x * s, -box.min.y * s, -c.z * s);
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (m.material) { m.material = m.material.clone(); m.material.roughness = 0.85; m.material.metalness = 0; } } });
  const g = new THREE.Group(); g.add(obj); return g;
}
export function makeVehicle(kind, length = 5.2, tint = null, rough = 0.35) {
  const src = GLB[kind]; if (!src) return null;
  const obj = src.scene.clone(true);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  const alongX = size.x > size.z;
  const s = length / Math.max(size.x, size.z);
  obj.scale.setScalar(s);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x * s, -box.min.y * s, -c.z * s);
  const pivot = new THREE.Group(); pivot.add(obj); if (alongX) pivot.rotation.y = Math.PI / 2;
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (m.material) {
      m.material = m.material.clone(); m.material.roughness = Math.max(0.45, rough); m.material.metalness = 0.15; if (tint != null) m.material.color.setHex(tint);
      // chunky PS-era look: shrink the texture and sample it without smoothing
      const map = m.material.map;
      if (map && map.image) {
        if (!pixCache.has(map)) {
          const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(map.image, 0, 0, 96, 96);
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = map.flipY; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
          pixCache.set(map, t);
        }
        m.material.map = pixCache.get(map); m.material.flatShading = true; m.material.needsUpdate = true;
      }
    } } });
  const g = new THREE.Group(); g.add(pivot); g.userData.pivot = pivot;
  return g;
}
export function makeCharacter(kind, fallbackOpts = {}, height = 1.75) {
  const src = GLB[kind];
  if (!src) return makeHumanoid(fallbackOpts);
  const obj = SkeletonUtils.clone(src.scene);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const s = height / Math.max(0.01, box.max.y - box.min.y);
  obj.scale.setScalar(s);
  obj.position.y = -box.min.y * s;
  obj.traverse((m) => {
    if (m.isMesh || m.isSkinnedMesh) {
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      if (m.material) { m.material = m.material.clone(); m.material.roughness = 0.85; m.material.metalness = 0; }
    }
  });
  const group = new THREE.Group(); group.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const clip = src.animations[0];
  const action = clip ? mixer.clipAction(clip) : null;
  if (action) { action.play(); action.paused = true; }
  const runClip = GLB[kind + '_run']?.animations[0];
  const runAction = runClip ? mixer.clipAction(runClip) : null;
  if (runAction) { runAction.play(); runAction.paused = true; runAction.weight = 0; }
  let hand = null; obj.traverse((b) => { if (!hand && /righthand/i.test(b.name)) hand = b; });
  if (kind === 'agent' && hand) {
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.025 / s, 0.035 / s, 0.26 / s, 8), std(0x111111, { metalness: 0.5, roughness: 0.4 }));
    fl.rotation.x = Math.PI / 2; hand.add(fl);
  }
  return { group, mixer, action, runAction, runDur: runClip ? runClip.duration : 1, clipDur: clip ? clip.duration : 1, isGLB: true, model: obj };
}

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });

let jacketMats = null;
function getJacketMats() {
  if (!jacketMats) {
    const plain = std(0x121725, { roughness: 0.75 });
    const front = std(0xffffff, { map: jacketTex('front'), roughness: 0.75 });
    const back = std(0xffffff, { map: jacketTex('back'), roughness: 0.75 });
    // Box face order: +x, -x, +y, -y, +z (front), -z (back)
    jacketMats = [plain, plain, plain, plain, front, back];
  }
  return jacketMats;
}

// Character faces +z. Returns rig parts for animation.
export function makeHumanoid(o = {}) {
  const g = new THREE.Group();
  const skin = std(o.skin ?? 0x8a5a3c);
  const shirtMat = o.agent ? getJacketMats() : std(o.shirt ?? 0x4a5560);
  const pants = std(o.pants ?? 0x2a2e36);
  const shoe = std(o.shoes ?? 0x141414, { roughness: 0.5 });

  const legGeo = new THREE.BoxGeometry(0.17, 0.86, 0.2); legGeo.translate(0, -0.43, 0);
  const bootGeo = new THREE.BoxGeometry(0.19, 0.1, 0.3); bootGeo.translate(0, -0.86, 0.04);
  const mkLeg = (x) => {
    const p = new THREE.Group(); p.position.set(x, 0.95, 0);
    p.add(new THREE.Mesh(legGeo, pants)); p.add(new THREE.Mesh(bootGeo, shoe));
    g.add(p); return p;
  };
  const legL = mkLeg(-0.11), legR = mkLeg(0.11);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.28), shirtMat);
  torso.position.y = 1.29; g.add(torso);
  if (o.agent) { // tactical vest bulk + belt
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.4, 0.31), std(0x0c0f17));
    vest.position.set(0, 1.3, 0.005); g.add(vest);
  }
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.27), std(0x111111));
  belt.position.y = 0.97; g.add(belt);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.11), skin); neck.position.y = 1.66; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.78; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin); skull.scale.set(1, 1.15, 1.05); head.add(skull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.05), skin); nose.position.set(0, -0.01, 0.13); head.add(nose);
  if (o.agent) {
    // neck gaiter + dark glasses: faceless
    const gaiter = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.12, 0.16, 10), std(0x0a0a0a));
    gaiter.position.set(0, -0.07, 0.01); head.add(gaiter);
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), std(0x050505, { roughness: 0.2, metalness: 0.6 }));
    glasses.position.set(0, 0.03, 0.12); head.add(glasses);
  } else {
    const eyeM = std(0x111111);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), eyeM); e.position.set(0.045 * s, 0.03, 0.135); head.add(e); }
    if (o.mustache) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), std(0x1a1410)); m.position.set(0, -0.04, 0.135); head.add(m); }
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), std(o.hair ?? 0x14100c));
    hair.position.y = 0.02; head.add(hair);
  }
  if (o.hat === 'cap') {
    const capM = std(o.hatColor ?? 0x101522);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.145, 0.09, 10), capM); cap.position.y = 0.1; head.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14), capM); brim.position.set(0, 0.07, 0.15); head.add(brim);
  } else if (o.hat === 'beanie') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), std(o.hatColor ?? 0x553322));
    b.position.y = 0.03; head.add(b);
  }

  const armGeo = new THREE.BoxGeometry(0.13, 0.6, 0.14); armGeo.translate(0, -0.3, 0);
  const handGeo = new THREE.BoxGeometry(0.1, 0.11, 0.1); handGeo.translate(0, -0.65, 0);
  const sleeve = o.agent ? std(0x121725) : shirtMat;
  const mkArm = (x) => {
    const p = new THREE.Group(); p.position.set(x, 1.58, 0);
    p.add(new THREE.Mesh(armGeo, sleeve)); p.add(new THREE.Mesh(handGeo, o.gloves ? std(0x0a0a0a) : skin));
    g.add(p); return p;
  };
  const armL = mkArm(-0.33), armR = mkArm(0.33);
  if (o.flashlight) {
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.26, 8), std(0x111111, { metalness: 0.5, roughness: 0.4 }));
    fl.position.set(0, -0.66, 0.08); fl.rotation.x = Math.PI / 2; armR.add(fl);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, legL, legR, armL, armR, head, torso };
}

export function animateWalk(h, phase, amt, holdLight, speed = 0) {
  if (h.isGLB) {
    if (!h.action) return;
    const running = h.runAction && speed > 3.0 && amt > 0.05;
    const cyc = phase / (Math.PI * 2);
    h.action.weight = running ? 0 : 1;
    if (h.runAction) h.runAction.weight = running ? 1 : 0;
    if (running) h.runAction.time = (cyc * h.runDur) % h.runDur;
    else h.action.time = amt > 0.05 ? (cyc * h.clipDur) % h.clipDur : h.clipDur * 0.02;
    h.mixer.update(0);
    return;
  }
  const s = Math.sin(phase) * amt;
  h.legL.rotation.x = s * 0.7; h.legR.rotation.x = -s * 0.7;
  h.armL.rotation.x = -s * 0.5;
  h.armR.rotation.x = holdLight ? -1.25 + Math.sin(phase * 0.5) * 0.04 : s * 0.5;
  h.torso.position.y = 1.29 + Math.abs(Math.cos(phase)) * 0.03 * amt;
}

// Volumetric light cone (tip at origin, pointing +z)
export function makeBeam(len = 10, rad = 2.4, color = 0xfff2d0, opacity = 0.14) {
  const geo = new THREE.ConeGeometry(rad, len, 20, 1, true);
  geo.translate(0, -len / 2, 0); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uLen: { value: len }, uOpacity: { value: opacity } },
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV; uniform float uLen;
      void main(){ vT = clamp(position.z/uLen,0.0,1.0); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vT; varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uOpacity;
      void main(){ float e = abs(dot(vN, vV)); float a = pow(1.0 - vT, 1.8) * pow(e, 1.4) * uOpacity; gl_FragColor = vec4(uColor * a, a); }`,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 5; m.frustumCulled = false;
  return m;
}

// Soft additive glow sprite
let glowTex = null;
export function makeGlow(color = 0xffb060, size = 1.5, opacity = 0.9) {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, size); return s;
}

export function makeCar(color = 0x3a4a55, suv = false) {
  const g = new THREE.Group();
  const paint = std(color, { roughness: 0.25, metalness: 0.6 });
  const glass = std(0x0a0e10, { roughness: 0.05, metalness: 0.9 });
  const L = suv ? 4.9 : 4.5, W = suv ? 2.0 : 1.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, suv ? 0.9 : 0.7, L), paint); body.position.y = suv ? 0.85 : 0.65; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, suv ? 0.75 : 0.55, suv ? L - 1.0 : L * 0.55), glass);
  cab.position.set(0, suv ? 1.65 : 1.27, suv ? -0.3 : -0.1); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.06, suv ? L - 1.1 : L * 0.5), paint); roof.position.set(0, suv ? 2.05 : 1.56, suv ? -0.3 : -0.1); g.add(roof);
  const tireM = std(0x0b0b0b);
  const tg = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12); tg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const t = new THREE.Mesh(tg, tireM); t.position.set(x * (W / 2 - 0.05), 0.36, z * (L / 2 - 0.8)); g.add(t); }
  const head = std(0xddddcc, { emissive: 0x000000 }); const tail = std(0x550000, { emissive: 0x220000 });
  const hl = []; for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.05), head.clone()); h.position.set(s * (W / 2 - 0.3), suv ? 1.0 : 0.75, L / 2 + 0.01); g.add(h); hl.push(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), tail); t.position.set(s * (W / 2 - 0.25), suv ? 1.0 : 0.78, -L / 2 - 0.01); g.add(t);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.headlights = hl;
  return g;
}

export function makeTree(seed = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 4, 7), std(0x2d241c));
  trunk.position.y = 2; g.add(trunk);
  const leafM = std(0x1d2a1c, { roughness: 1 });
  const r = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + r(i) * 0.8, 0), leafM);
    s.position.set((r(i + 10) - 0.5) * 2.2, 4.2 + r(i + 20) * 1.8, (r(i + 30) - 0.5) * 2.2); g.add(s);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// LA fan palm: a tall bent trunk and a drooping crown; mostly a silhouette against the sky
export function makePalm(height = 11, seed = 1, lean = 0.8) {
  const g = new THREE.Group();
  const r = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const tg = new THREE.CylinderGeometry(0.17, 0.26, height, 8, 10); tg.translate(0, height / 2, 0);
  const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / height; p.setX(i, p.getX(i) + lean * t * t); }
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, std(0xffffff, { map: tex('palmBark', [1, height / 1.2]), roughness: 0.95 }));
  trunk.castShadow = true; g.add(trunk);
  const fg = new THREE.PlaneGeometry(1.3, 3.4, 1, 8); fg.translate(0, 1.7, 0);
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const t = fp.getY(i) / 3.4; fp.setZ(i, -t * t * 1.5); }
  fg.rotateX(-Math.PI / 2); fg.computeVertexNormals();
  const leafM = std(0x2e3a22, { map: tex('frond'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 });
  const deadM = std(0x5a4a32, { map: tex('frond'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
  const crown = new THREE.Group(); crown.position.set(lean, height, 0); g.add(crown);
  const n = 13;
  for (let k = 0; k < n; k++) { const f = new THREE.Mesh(fg, leafM); f.rotation.order = 'YXZ'; f.rotation.y = k / n * Math.PI * 2 + r(k) * 0.3; f.rotation.x = 0.15 + r(k + 9) * 0.45; f.castShadow = true; crown.add(f); }
  for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(fg, deadM); f.rotation.order = 'YXZ'; f.rotation.y = k / 6 * Math.PI * 2 + 0.4; f.rotation.x = -0.9 - r(k + 20) * 0.3; f.scale.setScalar(0.75); f.position.y = -0.25; crown.add(f); }
  return g;
}

// shopping cart: wire basket, orange handle, fold-down child seat, bottom rack, four casters. Faces +z (handle at -z).
export function makeShoppingCart(handleColor = 0xd2541c) {
  const g = new THREE.Group();
  const wire = std(0xa8acae, { metalness: 0.85, roughness: 0.3 });
  const bar = (w, h, d, x, y, z, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wire); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  const L = 0.9, W0 = 0.42, W1 = 0.52, y0 = 0.42, y1 = 0.95;
  // basket: tapered, open top. Vertical wires down the sides, a few horizontal rails
  for (let k = 0; k <= 9; k++) { const z = -L / 2 + (k / 9) * L, w = W1 + (W0 - W1) * (k / 9); for (const s of [-1, 1]) bar(0.012, y1 - y0, 0.012, s * w / 2, (y0 + y1) / 2, z); }
  for (const y of [y0, y0 + 0.18, y0 + 0.36, y1]) for (const s of [-1, 1]) { const m = bar(0.014, 0.014, L, s * (W0 + W1) / 4, y, 0); m.rotation.y = s * Math.atan2((W1 - W0) / 2, L); }
  for (let k = 0; k <= 6; k++) { const x = -W0 / 2 + (k / 6) * W0; bar(0.012, y1 - y0, 0.012, x, (y0 + y1) / 2, L / 2); }
  for (const y of [y0, y1]) bar(W0, 0.014, 0.014, 0, y, L / 2);
  for (let k = 0; k <= 7; k++) bar(0.012, 0.012, L, -W0 / 2 + (k / 7) * W0, y0, 0); // basket floor
  // back gate + handle
  bar(W1, 0.014, 0.014, 0, y1, -L / 2); bar(W1, 0.014, 0.014, 0, y0, -L / 2);
  for (let k = 0; k <= 7; k++) bar(0.012, y1 - y0, 0.012, -W1 / 2 + (k / 7) * W1, (y0 + y1) / 2, -L / 2);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(W1 + 0.04, 0.04, 0.04), std(handleColor, { roughness: 0.5 })); handle.position.set(0, y1 + 0.06, -L / 2 - 0.08); g.add(handle);
  for (const s of [-1, 1]) bar(0.02, 0.1, 0.1, s * W1 / 2, y1 + 0.03, -L / 2 - 0.04, -0.6);
  // chassis: two side legs down to the base frame, a bottom rack
  for (const s of [-1, 1]) { bar(0.025, 0.42, 0.025, s * 0.22, 0.24, -L / 2 + 0.05); bar(0.025, 0.4, 0.025, s * 0.19, 0.23, L / 2 - 0.08); bar(0.025, 0.025, L, s * 0.2, 0.08, 0); }
  for (let k = 0; k <= 5; k++) bar(0.4, 0.01, 0.01, 0, 0.12, -L / 2 + 0.1 + k * (L - 0.2) / 5);
  // casters
  const wheelM = std(0x1a1a1a, { roughness: 0.6 }), wheelG = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10).rotateZ(Math.PI / 2);
  g.userData.wheels = [];
  for (const [x, z] of [[-0.2, -L / 2 + 0.05], [0.2, -L / 2 + 0.05], [-0.18, L / 2 - 0.08], [0.18, L / 2 - 0.08]]) { const w = new THREE.Mesh(wheelG, wheelM); w.position.set(x, 0.05, z); g.add(w); g.userData.wheels.push(w); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return g;
}

// commercial dumpster: sloped green steel body, two black plastic lids, fork pockets, casters. Front faces +z.
export function makeDumpster(color = 0x1f4a32, openLid = 0) {
  const g = new THREE.Group();
  const steel = std(color, { metalness: 0.45, roughness: 0.55 }), dark = std(0x111111, { roughness: 0.4 }), rust = std(0x3a2a1a, { metalness: 0.4, roughness: 0.8 });
  const W = 1.9, D = 1.2, H = 1.25;
  // side profile: front lower than back, bottom narrower (sloped front)
  const prof = new THREE.Shape([new THREE.Vector2(-D / 2, 0.15), new THREE.Vector2(D / 2 - 0.25, 0.15), new THREE.Vector2(D / 2, H - 0.05), new THREE.Vector2(-D / 2, H + 0.15)]);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: W, bevelEnabled: false }), steel);
  body.geometry.translate(0, 0, -W / 2); body.rotation.y = -Math.PI / 2; g.add(body);
  // rim and ribs
  const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.07, 0.07), steel); rim.position.set(0, H - 0.07, D / 2 + 0.03); g.add(rim);
  for (const x of [-0.6, 0, 0.6]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, H - 0.3, 0.05), steel); rib.position.set(x, 0.62, D / 2 - 0.1); rib.rotation.x = 0.22; g.add(rib); }
  for (const s of [-1, 1]) { const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, D * 0.9), rust); pocket.position.set(s * (W / 2 + 0.03), 0.65, 0); g.add(pocket); }
  // lids, hinged at the back
  for (const s of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(s * W / 4, H + 0.15, -D / 2); g.add(hinge); const lid = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.04, 0.05, D + 0.12), dark); lid.position.set(0, 0.02, (D + 0.12) / 2); hinge.add(lid); hinge.rotation.x = 0.17 - (s > 0 ? openLid : 0); }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), std(0xe8e0c8)); label.position.set(-0.5, 0.8, D / 2 - 0.06); label.rotation.x = 0.22; g.add(label);
  for (const [x, z] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10).rotateZ(Math.PI / 2), dark); w.position.set(x, 0.07, z); g.add(w); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// black trash bag, cinched and tied at the top
export function makeTrashBag(scale = 1, seed = 1) {
  const pts = []; const r = (n) => { const x = Math.sin(seed * 91.7 + n * 13.1) * 43758.5; return x - Math.floor(x); };
  for (let k = 0; k <= 12; k++) { const t = k / 12, rad = t < 0.8 ? 0.2 + Math.sin(t / 0.8 * Math.PI) * 0.08 - t * 0.05 : 0.11 * (1 - (t - 0.8) / 0.2) + 0.02; pts.push(new THREE.Vector2(Math.max(0.015, rad), t * 0.55)); }
  const geo = new THREE.LatheGeometry(pts, 12); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const n = Math.sin(p.getX(i) * 23 + seed) * Math.cos(p.getZ(i) * 19 + y * 9) * 0.018; p.setX(i, p.getX(i) * (1 + n * 3)); p.setZ(i, p.getZ(i) * (1 + n * 3) * (0.85 + r(1) * 0.2)); }
  geo.computeVertexNormals();
  const bag = new THREE.Mesh(geo, std(0x0e0e10, { roughness: 0.25, metalness: 0.1 }));
  const g = new THREE.Group(); g.add(bag);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 5), bag.material); ear.position.set(s * 0.03, 0.6, 0); ear.rotation.z = -s * 0.7; g.add(ear); }
  g.scale.setScalar(scale); g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// a burrito, low-poly like everything else: an 8-sided tortilla roll with flat folded ends and a plain foil band. Long axis = local x.
export function makeBurrito(unwrapped = 0.5) {
  const g = new THREE.Group();
  const tort = std(0xd8b47a, { roughness: 0.9, flatShading: true }), end = std(0xc8a068, { roughness: 0.9, flatShading: true }), foil = std(0xc8ccd0, { metalness: 0.7, roughness: 0.4, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.2, 8).rotateZ(Math.PI / 2), tort); g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.042, 0.02, 8).rotateZ(-Math.PI / 2), end); cap.position.x = 0.11; g.add(cap);
  const fl = 0.2 * (1 - unwrapped) + 0.02;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, fl, 8).rotateZ(Math.PI / 2), foil); band.position.x = -0.1 + fl / 2 - 0.01; g.add(band);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}
