// DAY 2 — Lunch break. The gas station across from Hammerline: cumbia on the radio, a burrito, Chuy and Beto.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792116146';
import { tex, textTex, rng, facadeTex } from './textures.js?v=1792116146';
import { makeCharacter, makeVehicle, animateWalk, makeGlow, makeCar, makePalm, makeBurrito, std } from './models.js?v=1792116146';
import { buildCity } from './street.js?v=1792116146';

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
  const HAZE = 0xe0a088;
  scene.background = new THREE.Color(HAZE);
  scene.fog = new THREE.Fog(HAZE, 28, 150); // sunset haze swallows the far end of the street
  const grid = new Grid(150, 112, -59, -11);
  const L = { scene, grid, interactables: [], allowFlashlight: false, surface: 'concrete', allowSprint: true };
  const r = rng(1231);
  // late afternoon, sun going down over the lot: warm, a little hazy
  ui.post.exposure.value = 1.0; ui.post.sat.value = 0.86; ui.post.contrast.value = 1.06; ui.post.tint.value.set(1.06, 0.97, 0.9); ui.post.lift.value.set(0.01, 0, 0.012); ui.post.levels.value = 30;

  const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; scene.add(m); return m; };
  const solid = (x0, z0, x1, z1, o = 1) => grid.rect(x0, z0, x1, z1, 1, o);
  const lit = (t, i = 1) => std(0xffffff, { map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: i });

  // ---------------- sky: sunset gradient, sun glow, lit clouds ----------------
  const SUN = new THREE.Vector3(-0.62, 0.16, 0.77).normalize();
  {
    const g = new THREE.SphereGeometry(220, 48, 24), pos = g.attributes.position, cols = [];
    const zen = new THREE.Color(0x3c4a7c), mid = new THREE.Color(0xd88a92), hor = new THREE.Color(0xffb27a), sunC = new THREE.Color(0xfff0c0), c = new THREE.Color(), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const e = Math.max(0, v.y);
      c.copy(hor).lerp(mid, Math.min(1, e / 0.22)); if (e > 0.22) c.lerp(zen, Math.min(1, (e - 0.22) / 0.6));
      if (v.y < 0) c.copy(hor).multiplyScalar(0.85);
      const d = Math.max(0, v.dot(SUN)); c.lerp(sunC, Math.pow(d, 24) * 0.9 + Math.pow(d, 4) * 0.25);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
    const sunDisc = makeGlow(0xfff2c8, 26, 1); sunDisc.position.copy(SUN).multiplyScalar(200); sunDisc.material.fog = false; scene.add(sunDisc);
    const cc = document.createElement('canvas'); cc.width = 256; cc.height = 128; const cx = cc.getContext('2d');
    for (let k = 0; k < 26; k++) { const x = 30 + r() * 196, y = 50 + r() * 40, rad = 14 + r() * 30; const gr = cx.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    const cloudT = new THREE.CanvasTexture(cc); cloudT.colorSpace = THREE.SRGBColorSpace;
    const clouds = [[-0.5, 0.22, 0xffc89a, 90], [-0.1, 0.3, 0xf0a0a0, 110], [0.6, 0.26, 0xf4b0a0, 80], [1.4, 0.2, 0xe89aa8, 100], [2.3, 0.28, 0xffb890, 120], [3.1, 0.18, 0xf8c0a0, 90], [4.2, 0.34, 0xd890a8, 130], [5.2, 0.24, 0xffc0a0, 100]];
    for (const [ang, el, col, w] of clouds) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.32), new THREE.MeshBasicMaterial({ map: cloudT, color: col, transparent: true, depthWrite: false, fog: false })); m.position.set(Math.sin(ang) * 190, 190 * el + 12, Math.cos(ang) * 190); m.lookAt(0, m.position.y * 0.6, 0); scene.add(m); }
  }

  // ---------------- the neighbourhood: the same Whittier Blvd as night 1, turned so the QUIK-WAY sits at this scene's origin ----------------
  // street (x, z) -> here (-z - 44, x + 24); Whittier runs along x at z = 24, Hammerline is across it, Mott St is down the block
  const city = new THREE.Group(); city.rotation.y = -Math.PI / 2; city.position.set(-44, 0, 24); scene.add(city);
  const cityGrid = { fillAll: (s2, o2) => grid.fillAll(s2, o2), rect: (x0, z0, x1, z1, s2 = 1, o2 = 1) => grid.rect(-z1 - 45, x0 + 24, -z0 - 45, x1 + 24, s2, o2) };
  const C = buildCity(city, cityGrid, rng(4242), { day: true });
  // daytime: streetlights, porch lights and candles off; neon barely shows in the sun
  for (const lp of [...C.lamps, ...C.mottLamps]) { lp.light.intensity = 0; lp.headM.emissiveIntensity = 0; lp.glow.visible = false; lp.cone.visible = false; }
  C.mottLamps.length = 0;
  for (const pl of C.porchLights) { pl.l.intensity = 0; pl.gw.visible = false; pl.m.emissiveIntensity = 0; }
  C.neonLights.forEach((n) => { if (n.isLight) n.intensity = 0; else n.visible = false; });
  C.neon.forEach((m) => (m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.25)));
  C.windowMats.forEach((m) => (m.emissiveIntensity = 0.15));
  city.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // ---------------- the mini-mart (built by the city) ----------------
  const MX0 = 10, MX1 = 22, MZ0 = -5, MZ1 = 3;
  const mart = C.quik;
  const { foodItems } = mart;
  // a car at the pump, windows down, the radio going
  const car = makeVehicle('suv', 4.4, 0x6a1f1f, 0.3) || makeCar(0x6b1f1f); car.position.set(16.5, 0, 9.5); scene.add(car); solid(16, 7, 17, 11, 0);

  // ---------------- sun + sky light ----------------
  scene.add(new THREE.HemisphereLight(0xf0b8a0, 0x5a4434, 0.95));
  const sun = new THREE.DirectionalLight(0xffb070, 3.0); sun.position.set(10 + SUN.x * 60, SUN.y * 60, 5 + SUN.z * 60); sun.target.position.set(14, 0, 10); scene.add(sun); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 26, bottom: -26, near: 1, far: 140 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;

  // ---------------- people ----------------
  const npc = (kind, fb, h, x, z, yaw) => { const c = makeCharacter(kind, fb, h); c.group.position.set(x, 0, z); c.group.rotation.y = yaw; c.baseYaw = yaw; scene.add(c.group); animateWalk(c, 0, 0, false); return c; };
  const cashier = npc('elena', { shirt: 0x2a5ab0, pants: 0x2a2a3a, skin: 0x8a5a3a }, 1.6, 21.2, -1.4, -Math.PI / 2);
  const chuy = npc('chuy', { shirt: 0x5a5a5a, pants: 0x2a3a5a, skin: 0x9a6644 }, 1.74, 17.3, 6.2, Math.PI * 0.85);
  const beto = npc('beto', { shirt: 0x6a3a2a, pants: 0x5a4a3a, skin: 0x8a5a3a, mustache: true }, 1.72, 20.7, 6.3, -Math.PI * 0.85);
  const people = [cashier, chuy, beto];
  solid(17, 6, 17, 6, 0); solid(20, 6, 20, 6, 0); solid(21, -2, 21, -1, 0);
  const pumper = npc('gus', { shirt: 0x3a5a3a, pants: 0x3a3a3a }, 1.72, 15.1, 12.2, Math.PI);

  // burrito in hand
  const carry = makeBurrito(0.5); carry.rotation.set(0.2, -0.5, Math.PI / 2.4); carry.position.set(0.26, -0.28, -0.6); carry.scale.setScalar(0.9); // tortilla end up, foil in your fist
  carry.visible = false; G.camera.add(carry);

  // ---------------- story ----------------
  const events = []; let tl = 0, stage = 'go', sitT = -1, eatT = -1, inside = false, wasInside = false;
  const at = (t, fn) => events.push({ t: tl + t, fn });
  const say = (...k) => ui.say(k.map((x) => ({ ...VO[x], pos: x.startsWith('ch') ? { x: chuy.group.position.x, y: 1.6, z: chuy.group.position.z } : x.startsWith('b') ? { x: beto.group.position.x, y: 1.6, z: beto.group.position.z } : x.startsWith('k') ? { x: 21.4, y: 1.6, z: -1.4 } : undefined })));
  audio.preloadVo(LUNCH_VO);
  audio.cityBed(); audio.setLoop('city', 0.12, 2);
  const SONGS = ['assets/music/ella_baila_sola.mp3', 'assets/music/corazon_sin_cara.mp3', 'assets/music/me_gustas_tu.mp3'];
  audio.startRadio(SONGS);
  ui.clock('5:14 PM');
  P.pos.set(16.5, 0, 31); P.yaw = 0; P.pitch = 0; P.flashlight = false;
  at(1.0, () => ui.objective('Get some food. The gas station across the street.'));
  let goal = [14.5, 4.5];
  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 18.3, z: 0.6, r: 1.6, label: 'Take a burrito', enabled: () => stage === 'food', action: () => { audio.rustle({ x: 18.3, y: 1.2, z: 1.6 }); foodItems[0].visible = false; carry.visible = true; stage = 'pay'; ui.objective('Pay at the counter.'); goal = [19.3, -0.6]; } });
  it({ x: 19.2, z: -0.8, r: 1.6, label: 'Pay', enabled: () => stage === 'pay', action: () => {
    stage = 'paying'; ui.objective(''); audio.beep({ x: 20.2, y: 1.2, z: -0.4 });
    say('k2').then(() => { stage = 'bench'; ui.objective('Eat with Chuy and Beto. The bench outside.'); goal = [19, 5.9]; });
  } });
  it({ x: 19, z: 6.0, r: 1.6, label: 'Sit down and eat', enabled: () => stage === 'bench', action: () => {
    stage = 'eat'; ui.objective(''); P.frozen = true; sitT = 0; goal = null; ui.toast('E — STAND UP', 3);
    at(1.2, () => { eatT = 0; carry.position.set(0.2, -0.26, -0.55); });
    at(1.6, () => say('ch1', 'j1', 'b1', 'ch2', 'b2', 'j2', 'b3', 'ch3').then(() => {
      if (sitT >= 0) P.pos.set(19, 0, 6.1); sitT = -1; P.frozen = false; P.eye = 1.62; carry.visible = false; stage = 'back';
      ui.objective('Back to work. Cross the street to Hammerline.'); goal = [16.5, 31];
    }));
  } });

  function standUp() { sitT = -1; P.frozen = false; P.pos.set(19, 0, 6.1); }
  // you can always get up: E or any movement key stands you up; the scene keeps going
  L.onKey = (code, B) => {
    if (sitT < 0 || !P.frozen) return false;
    if (code === B.interact || code === B.forward || code === B.back || code === B.left || code === B.right) { standUp(); return true; }
    return false;
  };
  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    // the music is the radio on the counter: louder inside the store
    inside = P.pos.x > MX0 && P.pos.x < MX1 && P.pos.z > MZ0 && P.pos.z < MZ1 + 0.5;
    if (inside !== wasInside) { audio.setLoop('city', inside ? 0.04 : 0.12, 0.6); if (inside) audio.doorBell({ x: 14.5, y: 2.6, z: MZ1 }); wasInside = inside; }
    if (!audio.songRadio && audio.ctx) audio.startRadio(SONGS); // audio wasn't unlocked yet when the scene loaded
    // the radio on the counter: clear inside, muffled through the glass out front, barely there across the street
    { const d = Math.hypot(P.pos.x - 16, P.pos.z - (-0.5)); if (inside) audio.radioMix(0.42, 16000); else audio.radioMix(0.16 * Math.max(0, 1 - d / 38), 520 - Math.min(380, d * 10)); }
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
    if (stage === 'back' && P.pos.z > 29.5) { stage = 'done'; ui.objective(''); game.nextChapter(); }
    const de = document.getElementById('dirHint');
    if (goal && !P.frozen) { de.style.opacity = 0.42; const ang = Math.atan2(goal[0] - P.pos.x, goal[1] - P.pos.z), rel = ang - (P.yaw + Math.PI); de.querySelector('i').style.transform = `rotate(${-rel}rad)`; de.querySelector('b').textContent = `${Math.round(Math.hypot(goal[0] - P.pos.x, goal[1] - P.pos.z))}m`; } else de.style.opacity = 0;
  };
  L.danger = () => ({ heart: 0 });
  L.dispose = () => { G.camera.remove(carry); audio.stopRadio(); document.getElementById('dirHint').style.opacity = 0; };
  return L;
}
