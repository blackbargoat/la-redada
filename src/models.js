// Low-poly (PS3-era) procedural models.
import * as THREE from 'three';
import { jacketTex } from './textures.js?v=1792084803';
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
