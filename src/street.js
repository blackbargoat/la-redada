// LEVEL 1: "The Walk Home". Juan follows Santiago home → the street feels wrong → ICE → run, hide, get to Rosa's.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792150673';
import { tex, textTex, facadeTex, rng } from './textures.js?v=1792150673';
import { makeCharacter, makeVehicle, makeStatic, animateWalk, makeBeam, makeGlow, makeCar, makePalm, makeDumpster, makeAuto, CIV_KINDS, CIV_COLORS, std } from './models.js?v=1792150673';
import { addSkyline, glowMaterial, glowMats } from './skyline.js?v=1792150673';
import { buildQuikWay, makePump } from './quikway.js?v=1792150673';

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
  rwait2: { id: 'st_rwait2', who: 'Santiago', text: 'Ándale, Juan. Come on, let\'s go.' },
  r1: { id: 'st_r1', who: 'Santiago', text: 'Ay, my back, güey. Twelve hours of drywall. Tomorrow I\'m calling in sick.' },
  m1: { id: 'st_m1', who: 'Juan', text: 'You said that yesterday.' },
  r2: { id: 'st_r2', who: 'Santiago', text: 'And yesterday I meant it too. So... Saturday. Luz\'s party. You got the bike?' },
  m2: { id: 'st_m2', who: 'Juan', text: 'The pink one, with the streamers. Hammerline has it on sale. Dale pays me tonight, I pick it up.' },
  r3: { id: 'st_r3', who: 'Santiago', text: 'Dale? That guy owes me three weeks, carnal. Three.' },
  m3: { id: 'st_m3', who: 'Juan', text: 'He\'ll pay. He always says Friday.' },
  r4: { id: 'st_r4', who: 'Santiago', text: 'With Dale, every day is Friday.' },
  m4: { id: 'st_m4', who: 'Juan', text: 'Don\'t look at it. Just keep walking.' },
  r7: { id: 'st_r7', who: 'Santiago', text: 'Juan! ¡Corre! Run!' },
  weird: { id: 'st_weird', who: 'Santiago', text: 'Hey... look behind you. Who\'s that standing in the street?' },
  a2b: { id: 'st_a2b', who: 'Agent', text: 'Suspect down! The other one\'s running, south on Whittier!', agent: true },
  p1: { id: 'st_p1', who: 'Agent', text: 'He turned down here. I saw him turn.', agent: true },
  p2: { id: 'st_p2', who: 'Agent', text: 'Nothing. He\'s gone. Check the next block.', agent: true },
  who: { id: 'st_who', who: 'Doña Rosa (inside)', text: '¿Quién es? ...Who is it?' },
  me: { id: 'st_me', who: 'Juan', text: 'Soy yo, Juan. Open the door, Doña Rosa. Please.' },
};
export const STREET_VO = Object.values(LINES).map((l) => l.id);

// the side street off Whittier: road runs east (+x) between z SZ0..SZ1
const SZ0 = -112, SZ1 = -103, SZC = -107.5;
const BUSH = { x: 31, z: -99.6 };
const DOOR = { x: 67, z: -97 };

export function createStreet(G, opts = {}) {
  const { audio, ui, P, game, flash } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1514);
  scene.fog = new THREE.FogExp2(0x1a2826, 0.045);
  const grid = new Grid(112, 150, -35, -135);
  const L = { scene, grid, interactables: [], allowFlashlight: false, surface: 'wet', speedMul: 1, allowSprint: false };
  const r = rng(4242);

  // ---- lighting ----
  const hemi = new THREE.HemisphereLight(0x5a8078, 0x0a0f0e, 0.2); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8ab0a8, 0.3); moon.position.set(-20, 40, 10); scene.add(moon);

  // ---- the neighbourhood: Whittier, the QUIK-WAY, Hammerline, Mott St (shared with the Day 2 lunch scene) ----
  const C = buildCity(scene, grid, r);
  const { neon, neonLights, windowMats, lamps, mottLamps, rosaLight, rosaGlow, rosaWin, quik, tvWinM, carCols } = C;
  // ICE vehicles: textured GLB SUV (falls back to the box car)
  const iceLights = [];
  function makeICE() {
    const v = makeAuto('suv', 0x15171a, { ice: true, tint: true, dirt: 0.15 });
    // red and blue strobes hidden in the grille
    for (const [sx, col] of [[-0.3, 0x2040ff], [0.3, 0xff2020]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: 0x111111 })); m.position.set(sx, 0.87, v.userData.front + 0.04); m.userData.col = col; v.add(m); iceLights.push(m); }
    return v;
  }
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
  cat.position.set(-7.0, 0.15, -14); cat.visible = false; scene.add(cat);
  { const glb = makeVehicle('cat', 0.75, 0x3a3a3a, 0.5); if (glb) { cat.children.slice().forEach((c) => cat.remove(c)); cat.add(glb); for (const sx of [-0.04, 0.04]) { const e = makeGlow(0xd8ff70, 0.12, 1); e.position.set(sx, 0.36, 0.34); cat.add(e); } } }
  let catT = -1, catState = 'idle', catFrom = null;
  const catLight = new THREE.PointLight(0xd8e8e0, 3, 4, 1.6); catLight.position.set(-7, 2.4, -14); scene.add(catLight);

  // ---- characters ----
  const rafa = makeCharacter('rafa', { shirt: 0x6a3a2a, pants: 0x2e3a4e, hat: 'cap', hatColor: 0x7a2020, skin: 0x9a6644, mustache: true }, 1.74);
  rafa.group.position.set(7.4, 0.15, 5); scene.add(rafa.group);
  let rafaPhase = 0, rafaState = 'walk', rafaFall = 0, rafaWaitCD = 0, rafaWaitN = 0;
  const agents = [];
  function makeAgent(x, z) {
    const h = makeCharacter('agent', { agent: true, flashlight: true, hat: 'cap', gloves: true, skin: 0x8a6a55 }, 1.85);
    h.group.position.set(x, 0, z); scene.add(h.group);
    const sl = new THREE.SpotLight(0xe6eeff, 26, 28, 0.35, 0.5, 1.2); scene.add(sl); scene.add(sl.target);
    const beam = makeBeam(9, 1.8, 0xe6eeff, 0.12); h.group.add(beam); beam.position.set(0.3, 1.45, 0.4); beam.rotation.x = 0.08;
    const lens = makeGlow(0xe6eeff, 0.55, 0.9); lens.position.set(0.3, 1.45, 0.45); h.group.add(lens);
    const bounce = new THREE.PointLight(0xc8d4e0, 1.6, 4.5, 2); bounce.position.set(0, 1.5, 1.1); h.group.add(bounce); // his own light coming back off the ground
    const a = { h, sl, beam, phase: 0, speed: 0, path: null, pi: 0, repath: 0, role: 'idle', stepAcc: 0 };
    agents.push(a); return a;
  }
  let roadMan = null;
  function lightOn(a, on) { a.sl.intensity = on ? 26 : 0; a.beam.visible = on; a.h.group.traverse((m) => { if (m.isSprite) m.visible = on; }); a.h.group.children.forEach((c) => { if (c.isPointLight) c.intensity = on ? 1.6 : 0; }); }
  function removeAgent(a) { scene.remove(a.h.group); scene.remove(a.sl); scene.remove(a.sl.target); agents.splice(agents.indexOf(a), 1); }
  // muzzle flash for the shot
  const muzzle = new THREE.PointLight(0xffd8a0, 0, 14, 1.4); scene.add(muzzle);
  const muzzleGlow = makeGlow(0xffe0b0, 0.9, 0); scene.add(muzzleGlow);

  // ---- passing cars (before the blackout) ----
  const traffic = [];
  function spawnTraffic() {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const c = makeAuto(CIV_KINDS[(Math.random() * CIV_KINDS.length) | 0], CIV_COLORS[(Math.random() * CIV_COLORS.length) | 0], { chrome: Math.random() < 0.5 });
    c.position.set(dir < 0 ? -2.2 : 2.2, 0, dir < 0 ? 40 : -125); c.rotation.y = dir < 0 ? Math.PI : 0;
    c.userData.headlights.forEach((m) => { m.material.emissive.setHex(0xffffff); m.material.emissiveIntensity = 3; });
    const l = new THREE.PointLight(0xfff2d8, 30, 18, 1.4); l.position.set(0, 1, dir < 0 ? -3.5 : 3.5); c.add(l);
    for (const sx of [-0.7, 0.7]) { const gl = makeGlow(0xffffff, 1.4, 0.8); gl.position.set(sx, 0.9, dir < 0 ? -2.3 : 2.3); c.add(gl); }
    scene.add(c); traffic.push({ c, dir, v: 11 + Math.random() * 5, passed: false });
  }

  // ---- helicopter searchlight: sweeps Mott St while he's in the bush ----
  const heli = new THREE.SpotLight(0xf4f8ff, 0, 90, 0.16, 0.3, 1.0); heli.position.set(20, 45, -40); scene.add(heli); scene.add(heli.target);
  const heliBeam = makeBeam(48, 7, 0xe8f0ff, 0.06); heliBeam.visible = false; scene.add(heliBeam);
  let heliT = -1;
  // ---- marker over Santiago when you fall behind ----
  const mk = document.createElement('canvas'); mk.width = mk.height = 32; const mx = mk.getContext('2d');
  mx.fillStyle = '#e9dcc0'; mx.beginPath(); mx.moveTo(8, 6); mx.lineTo(24, 6); mx.lineTo(16, 20); mx.closePath(); mx.fill();
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mk), depthTest: false, transparent: true }));
  marker.scale.set(0.35, 0.35, 0.35); marker.visible = false; marker.renderOrder = 10; scene.add(marker);

  // ---- roadblock at the bottom of Whittier: the only way is right, onto Mott ----
  const block = makeICE(); block.position.set(-0.5, 0, -121); block.rotation.y = Math.PI / 2; block.visible = false; scene.add(block);
  const blockL = new THREE.SpotLight(0xf0f4ff, 0, 40, 0.5, 0.4, 1.1); blockL.position.set(2.2, 1.0, -121); blockL.target.position.set(4, 0.3, -104); scene.add(blockL); scene.add(blockL.target);
  // ---- the build-up: things that are wrong on this street ----
  const followCar = makeICE();
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
  let phase = opts.blackout ? 'dark' : 'intro', tl = 0, darkT = 0;
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

  // Santiago leads the way down the east sidewalk; Juan follows at his pace
  const route = [[7.0, 2], [6.8, -10], [6.6, -24], [6.2, -27.5], [6.6, -31], [6.8, -44], [7.0, -52]];
  const RAFA_WALK = 2.0;
  let ri = 0;
  const lookBack = { done: false, t: -1, shooter: null };
  let wrongT = 0, lastPX = 0, lastPZ = 0, sideT = 0, passT = -1, foundT = 0, leftEarlyT = -1;

  function killLamp(lp, bang) {
    lp.on = false; lp.light.intensity = 0; lp.headM.emissiveIntensity = 0; lp.glow.visible = false; lp.cone.visible = false;
    if (bang) audio.transformer({ x: lp.x, y: 6, z: lp.z }); else audio.lampOff({ x: lp.x, y: 6, z: lp.z });
  }
  function startBlackout(fast) {
    phase = 'blackout'; tl = 0; events.length = 0; L.speedMul = 1;
    ui.objective(''); marker.visible = false; ui.cancelSay();
    traffic.forEach((t) => scene.remove(t.c)); traffic.length = 0; rain.visible = false;
    const order = [...lamps].sort((a, b) => a.z - b.z);
    const step = fast ? 0.08 : 0.22;
    if (!fast) at(0.1, () => audio.powerDown({ x: 0, y: 5, z: P.pos.z - 30 }));
    order.forEach((lp, i) => at(0.2 + i * step, () => killLamp(lp, i === 0)));
    const tDark = 0.2 + order.length * step;
    at(tDark, () => { neon.forEach((m) => (m.emissiveIntensity = 0)); neonLights.forEach((n) => { if (n.isLight) n.intensity = 0; else n.visible = false; }); windowMats.forEach((m) => (m.emissiveIntensity = 0)); quik.setPower(false); hemi.intensity = 0.05; moon.intensity = 0.05; audio.setLoop('city', 0, 0.3); audio.setLoop('rain', 0.1, 1); audio.droneBed(); audio.setLoop('drone', 0.5, 4); rosaLight.intensity = 3; rosaGlow.material.opacity = 0.7; if (rosaWin) rosaWin.material.emissiveIntensity = 0.55; });
    // after his flashlight, the ICE car parked behind him snaps its headlights on and whoops
    at(tDark + 1.5, () => {
      if (!followCar.visible) { followCar.visible = true; followCar.position.set(2.6, 0, P.pos.z + 27); } followLit = true;
      followL.forEach((l) => (l.intensity = 150)); audio.hit(0.9); ui.flash(0.2);
      for (let i = 0; i < 3; i++) audio.tone({ freq: 900, freqTo: 1500, dur: 0.18, type: 'square', gain: 0.05, when: i * 0.25, filter: 2500, pos: { x: 1.8, y: 1, z: followCar.position.z } });
    });
    at(tDark + 0.6, () => { // the man standing in the road switches his flashlight on, right at you
      let a = roadMan; if (!a) { a = makeAgent(1.2, P.pos.z + 13); }
      lightOn(a, true); a.role = 'chase'; roadMan = null; audio.click(); audio.hit(0.8); ui.shake(0.03, 0.3);
    });
    at(tDark + 2.3, () => { ui.bark(LINES.ice); audio.radio({ x: 3, y: 1.5, z: P.pos.z + 10 }); });
    at(tDark + 2.4, () => { block.visible = true; blockL.intensity = 120; grid.rect(-9, -123, 8, -119, 1, 0); block.userData.headlights?.forEach((m) => { m.material.emissive.setHex(0xffffff); m.material.emissiveIntensity = 3; }); const b = makeAgent(4.5, -117); b.role = 'guard'; });
    at(tDark + 2.6, () => { if (watcherFig) watcherFig.visible = false; const w = makeAgent(-7.6, -37); w.role = 'chase'; w.delay = 1.2; });
    at(tDark + 3.6, () => {
      ui.bark(LINES.r7); rafaState = 'runWithYou';
      phase = 'run'; L.allowSprint = true; L.speedMul = 1; darkT = 0;
      L.chaseRun = true; wrongT = 0;
      audio.sirenBed(); audio.setLoop('siren', 0.06, 4);
      ui.objective('RUN. Straight down Whittier. Don\'t stop.');
      ui.bigHint('RUN<small>STRAIGHT DOWN THE STREET</small>'); setTimeout(() => { if (wrongT < 1 && phase === 'run') ui.bigHint(''); }, 3000);
      agents.forEach((a) => { if (a.role === 'chase') a.role = 'chaseGo'; });
    });
  }

  if (opts.blackout) {
    rain.visible = false;
    P.pos.set(6.4, 0, -50); rafa.group.position.set(7.0, 0.15, -51.5); ri = route.length;
    lamps.forEach((lp) => killLamp(lp, false));
    phase = 'walk'; startBlackout(true);
  } else {
    // opening: black screen, late-night radio news; feet stay put through the phone call, eyes are free
    P.frozen = true;
    at(0.05, () => { const f = document.getElementById('fade'); f.style.transition = 'none'; f.style.opacity = 1; });
    at(0.6, () => { ui.say([LINES.news]); audio.tone({ freq: 48, dur: 9, type: 'sawtooth', gain: 0.06, filter: 200 }); });
    at(9.5, () => { audio.noise({ dur: 0.8, type: 'highpass', freq: 2000, gain: 0.25 }); ui.fade(0, 2.5); ui.clock('11:41 PM'); });
    at(10.5, () => { audio.tone({ freq: 50, freqTo: 90, dur: 4, type: 'sawtooth', gain: 0.12, filter: 400, pos: { x: 3, y: 1, z: -10 } }); });
    at(13.0, () => { audio.vibrate(); ui.toast('INCOMING CALL: DOÑA ROSA'); });
    at(14.5, () => { audio.vibrate(); });
    at(16.0, () => { lines('rosa1', 'mp1', 'rosa2', 'mp2', 'r0', 'rfollow').then(() => { P.frozen = false; if (phase === 'intro') { phase = 'walk'; ui.objective('Follow Santiago. Straight down Whittier, past the Hammerline sign.'); lines('r1', 'm1');
        G.phone.receive('Luz', 'papi mami said i can stay up til you get home', 14, 0).then(() => G.phone.receive('Luz', 'te quiero papi. hurry!!', 6, 0));
      } }); });
  }
  const triggers = [
    { p: 14, fn: () => lines('r2', 'm2') },
    { p: 20, fn: () => { followOn = true; followCar.visible = true; followCar.position.set(1.8, 0, P.pos.z + 26); } },
    { p: 30, fn: () => lines('r3', 'm3', 'r4') },
    { p: 36, fn: () => lines('u1', 'm4') },
    { p: 41, fn: () => { lines('u3'); audio.radio({ x: -8.3, y: 1.5, z: -37 }, 0.25); } },
    { p: 46, fn: () => { mirrorOn = true; mirrorMan.group.visible = true; mirrorMan.group.position.set(-7.0, 0.15, P.pos.z - 2); lines('u4'); } },
    { p: 49, fn: () => { audio.radio({ x: -8.5, y: 1.5, z: P.pos.z - 6 }, 0.4); } },
    { p: 50, fn: () => { // someone is standing in the middle of the road behind you, lights off, just watching
      if (phase !== 'walk') return; roadMan = makeAgent(0.4, P.pos.z + 14); roadMan.role = 'stand'; lightOn(roadMan, false);
      followOn = false; followCar.visible = true; followCar.position.set(2.6, 0, P.pos.z + 27); // the car that's been trailing you, parked dark a little behind him
      lines('weird').then(() => { if (phase === 'walk') startBlackout(false); });
    } },
  ];

  // ---- the bush ----
  const bushSpot = { kind: 'bush', ex: BUSH.x, ez: SZ1 + 0.4, ix: BUSH.x, iz: BUSH.z - 1.15, eye: 1.0, yaw: 0, pos: { x: BUSH.x, y: 1, z: BUSH.z }, agentNear: false };
  L.interactables.push({ x: BUSH.x, z: SZ1 + 0.6, r: 3.2, label: 'Hide in the bush', enabled: () => phase === 'side' && !P.hidden, action: () => game.hide(bushSpot) });
  L.interactables.push({ x: DOOR.x, z: DOOR.z - 1.2, r: 1.9, label: 'Knock on the door', enabled: () => phase === 'toRosa', action: () => {
    phase = 'door'; P.frozen = true; ui.objective(''); audio.knock({ x: DOOR.x, y: 1.3, z: DOOR.z });
    at(1.6, () => lines('who', 'me').then(() => { audio.creak({ x: DOOR.x, y: 1.2, z: DOOR.z }); rosaLight.intensity = 6; game.nextChapter(); }));
  } });
  L.onHide = () => {
    if (phase !== 'side') return;
    phase = 'hidden'; passT = 0; foundT = 0; ui.bigHint(''); ui.objective('Stay still. Hold your breath when they\'re close.');
    L.chaseRun = false;
  };
  L.onUnhide = () => { if (phase === 'hidden') leftEarlyT = 0; };

  // ---- per-frame ----
  function moveAgent(a, tx, tz, speed, dt) {
    a.repath -= dt;
    if (!a.path || a.repath <= 0) { a.path = grid.path(a.h.group.position.x, a.h.group.position.z, tx, tz) || []; a.pi = 0; a.repath = 0.35; }
    const p = a.path[a.pi];
    const g = a.h.group.position;
    if (!p) { a.speed = 0; return true; }
    const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { a.pi++; return a.pi >= a.path.length; }
    const st = Math.min(d, speed * dt);
    g.x += dx / d * st; g.z += dz / d * st;
    turnAgent(a, Math.atan2(dx, dz), dt * 8);
    a.speed = speed; return false;
  }
  function turnAgent(a, want, k) { let diff = want - a.h.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); a.h.group.rotation.y += diff * Math.min(1, k); }
  // straight-line move for scripted runs in the open street
  function runTo(a, tx, tz, speed, dt) {
    const g = a.h.group.position, dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { a.speed = 0; return true; }
    const st = Math.min(d, speed * dt); g.x += dx / d * st; g.z += dz / d * st; turnAgent(a, Math.atan2(dx, dz), dt * 8); a.speed = speed; return false;
  }
  const seesPlayer = (a, range) => { const g = a.h.group.position; return Math.hypot(P.pos.x - g.x, P.pos.z - g.z) < range && grid.los(g.x, g.z, P.pos.x, P.pos.z); };
  function goalPoint() {
    if (phase === 'toRosa') return [DOOR.x, DOOR.z - 1.2];
    if (P.pos.x < 9) return [11, SZC];
    return [BUSH.x, SZ1 + 0.6];
  }

  L.update = (dt) => {
    const rg = rafa.group.position;
    // rain follows camera
    rain.position.set(P.pos.x, 0, P.pos.z);
    const rp = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN; i++) { const k = i * 6; let y = rp[k + 1] - dt * 19; if (y < 0) y += 18; rp[k + 1] = y; rp[k + 4] = y - 0.45; }
    rainGeo.attributes.position.needsUpdate = true;
    amb.light -= dt; amb.drip -= dt; amb.wind -= dt;
    if (amb.light <= 0 && (phase === 'walk' || phase === 'intro')) {
      amb.light = 16 + Math.random() * 26; const near = Math.random();
      amb.flashT = 0.35; ui.flash(0.06 + near * 0.12);
      setTimeout(() => audio.thunder(near), (1 - near) * 3500 + 200);
    }
    if (amb.flashT > 0) { amb.flashT -= dt; const on = (amb.flashT > 0.25 || (amb.flashT > 0.05 && amb.flashT < 0.15)); hemi.intensity = on ? 1.4 : (phase === 'walk' || phase === 'intro' ? 0.2 : 0.05); }
    if (amb.drip <= 0) { amb.drip = 0.4 + Math.random() * 1.6; audio.drip({ x: P.pos.x + (Math.random() - 0.5) * 8, y: 2 + Math.random() * 2, z: P.pos.z + (Math.random() - 0.5) * 8 }); }
    if (amb.wind <= 0) { amb.wind = 12 + Math.random() * 15; audio.wind(); }
    for (const lp of lamps) if (lp.on && lp.flick) {
      lp.f = Math.random() < 0.04 ? Math.random() * 0.25 : Math.min(1, lp.f + dt * 5);
      lp.light.intensity = 32 * lp.f; lp.headM.emissiveIntensity = 2.5 * lp.f; lp.glow.material.opacity = 0.85 * lp.f;
      if (lp.f < 0.3 && Math.random() < 0.3 && Math.hypot(lp.x - P.pos.x, lp.z - P.pos.z) < 25) audio.flicker({ x: lp.x, y: 6, z: lp.z }, 0.8);
    }
    // the dying Mott St light: steady, then it stutters for a second, buzzing, and comes back
    for (const lp of mottLamps) {
      if (lp.flick) {
        lp.t -= dt;
        if (lp.burst > 0) { lp.burst -= dt; lp.f = Math.random() < 0.35 ? 0.04 + Math.random() * 0.2 : 0.6 + Math.random() * 0.4; if (lp.burst <= 0) { lp.f = 1; lp.t = 3 + Math.random() * 5; } }
        else if (lp.t <= 0) lp.burst = 0.4 + Math.random() * 0.9;
        if (lp.burst > 0 && Math.random() < 0.25 && Math.hypot(lp.x - P.pos.x, lp.z - P.pos.z) < 28) audio.flicker({ x: lp.x, y: 6, z: lp.z }, 0.8);
      } else lp.f = 0.94 + Math.sin(tl * 9.1) * 0.03 + Math.sin(tl * 23.7) * 0.03;
      lp.light.intensity = lp.base * lp.f; lp.headM.emissiveIntensity = 2.5 * lp.f; lp.glow.material.opacity = 0.85 * lp.f; lp.cone.visible = lp.f > 0.4;
    }
    tvWinM.emissiveIntensity = 0.18 + (Math.sin(tl * 7.3) * 0.5 + 0.5) * 0.25 * (Math.random() < 0.06 ? 0.2 : 1);
    for (let i = traffic.length - 1; i >= 0; i--) {
      const t = traffic[i]; t.c.position.z += t.dir * t.v * dt;
      if (!t.passed && Math.abs(t.c.position.z - P.pos.z) < 14) { t.passed = true; audio.noise({ dur: 2.2, type: 'bandpass', freq: 700, freqTo: 300, q: 0.8, gain: 0.35, attack: 0.8, pos: { x: t.c.position.x, y: 0.5, z: P.pos.z } }); audio.noise({ dur: 1.6, type: 'highpass', freq: 3000, gain: 0.12, attack: 0.6, pos: { x: t.c.position.x, y: 0.3, z: P.pos.z } }); }
      if (t.c.position.z < -130 || t.c.position.z > 45) { scene.remove(t.c); traffic.splice(i, 1); }
    }
    if (phase !== 'walk' && phase !== 'intro') { const on = Math.floor(tl * 8) % 2; iceLights.forEach((m, i) => m.material.color.setHex((i % 2) === on ? m.userData.col : 0x111111)); }
    if (followOn && !followLit) { const tz = P.pos.z + 16; followCar.position.z += (tz - followCar.position.z) * Math.min(1, dt * 0.6); }
    if (followLit) followL.forEach((l, i) => { l.position.set(followCar.position.x + (i ? 0.7 : -0.7), 1.0, followCar.position.z - 2.6); l.target.position.set(l.position.x, 0.3, l.position.z - 20); });
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
    const [gx, gz] = goalPoint();
    if (phase === 'run' && L.chaseRun && !P.lookLock) {
      const tx = gx - P.pos.x, tz = gz - P.pos.z, tl2 = Math.hypot(tx, tz) || 1;
      const vx = P.pos.x - lastPX, vz = P.pos.z - lastPZ, vl = Math.hypot(vx, vz);
      const away = vl > 0.02 && (vx * tx + vz * tz) / (vl * tl2) < -0.35;
      wrongT = away ? wrongT + dt : Math.max(0, wrongT - dt * 2);
      if (wrongT > 0.8) ui.bigHint('WRONG WAY. RUN!<small>THE OTHER WAY</small>'); else if (wrongT === 0 && document.getElementById('bigHint').textContent.startsWith('WRONG')) ui.bigHint('');
      if (wrongT > 3 && agents[0]) { ui.bigHint(''); game.caught(agents[0].h, 'You ran back toward them. Try again.'); }
    }
    lastPX = P.pos.x; lastPZ = P.pos.z;
    const de = document.getElementById('dirHint');
    if (phase === 'run' || phase === 'side' || phase === 'toRosa') {
      de.style.opacity = 0.5;
      const ang = Math.atan2(gx - P.pos.x, gz - P.pos.z), rel = ang - (P.yaw + Math.PI);
      de.querySelector('i').style.transform = `rotate(${-rel}rad)`; de.querySelector('b').textContent = `${Math.round(Math.hypot(gx - P.pos.x, gz - P.pos.z))}m`;
    } else de.style.opacity = 0;
    if (phase === 'run') {
      const bh = document.getElementById('bigHint').textContent;
      if (P.pos.z < -99 && P.pos.x < 9 && wrongT < 0.8) ui.bigHint('TURN RIGHT<small>ONTO MOTT STREET</small>');
      else if (P.pos.x > 9 && bh.startsWith('TURN')) ui.bigHint('');
    }

    // ---- the look back: the camera turns, Santiago is behind you, then the shot ----
    if (phase === 'run' && !lookBack.done && P.pos.z < -74) {
      lookBack.done = true; lookBack.t = 0; P.lookLock = { yaw: Math.PI, pitch: 0.02, k: 6 }; P.frozen = true;
      rafaState = 'lookBack';
      lookBack.shooter = agents.filter((a) => a.role === 'chaseGo').sort((a, b) => Math.hypot(a.h.group.position.x - P.pos.x, a.h.group.position.z - P.pos.z) - Math.hypot(b.h.group.position.x - P.pos.x, b.h.group.position.z - P.pos.z))[0] || null;
      if (lookBack.shooter) { lookBack.shooter.role = 'shooter'; lookBack.shooter.h.group.position.set(Math.max(2.5, Math.min(7.5, P.pos.x - 1.2)), 0, P.pos.z + 12); }
    }
    if (lookBack.t >= 0 && lookBack.t < 6) {
      lookBack.t += dt; const lt = lookBack.t;
      if (lt < 2.2) grid.move(P.pos, 0, -5.4 * dt, 0.3); // you keep running while you look
      const sh = lookBack.shooter;
      if (rafaState === 'lookBack') { // he's right behind you, running flat out at the camera
        rg.x += (Math.max(2.5, Math.min(8, P.pos.x + 0.6)) - rg.x) * Math.min(1, dt * 6); rg.z = Math.max(rg.z - 6 * dt, P.pos.z + 4.2);
        rafa.group.rotation.y = Math.PI; rafaPhase += dt * 10; animateWalk(rafa, rafaPhase, 1, false, 6);
      }
      if (sh && lt < 0.9) { const g = sh.h.group.position; runTo(sh, g.x, rg.z + 6, 5, dt); sh.h.group.rotation.y = Math.PI; }
      if (lt > 0.9 && lt - dt <= 0.9) {
        const gp = sh ? sh.h.group.position : { x: rg.x, z: rg.z + 9 };
        audio.gunshot({ x: gp.x, y: 1.5, z: gp.z }); ui.flash(0.4); ui.shake(0.12, 0.5);
        muzzle.position.set(gp.x + 0.2, 1.45, gp.z - 0.6); muzzle.intensity = 60; muzzleGlow.position.copy(muzzle.position); muzzleGlow.material.opacity = 1;
        setTimeout(() => { muzzle.intensity = 0; muzzleGlow.material.opacity = 0; }, 70);
        rafaState = 'shot'; rafaFall = 0;
        if (sh) { sh.role = 'standOver'; sh.speed = 0; }
      }
      if (lt > 1.9 && lt - dt <= 1.9) { P.lookLock = { yaw: 0, pitch: 0, k: 7 }; }
      if (lt > 2.3 && lt - dt <= 2.3) { P.lookLock = null; P.frozen = false; audio.muffle(true, 0.05); audio.tinnitus(); L.speedMul = 0.65; ui.bark(LINES.after); }
      if (lt > 5.2 && lt - dt <= 5.2) { audio.muffle(false, 1.2); L.speedMul = 1; ui.bark(LINES.a2b); }
    }
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }

    // ---- Santiago ----
    const dPl = Math.hypot(P.pos.x - rg.x, P.pos.z - rg.z);
    if (rafaState === 'walk') {
      let sp = 0, want = rafa.group.rotation.y;
      if (phase === 'walk') {
        // he walks his own pace. If you fall behind he stops, turns, and calls you on
        const behind = P.pos.z - rg.z > 6 || dPl > 8;
        rafaWaitCD -= dt;
        if (behind) {
          want = Math.atan2(P.pos.x - rg.x, P.pos.z - rg.z);
          if (rafaWaitCD <= 0) { rafaWaitCD = 9; ui.bark(LINES[rafaWaitN++ % 2 ? 'rwait2' : 'rwait']); }
        } else if (ri < route.length) {
          const [tx, tz] = route[ri], dx = tx - rg.x, dz = tz - rg.z, d = Math.hypot(dx, dz);
          if (d < 0.3) ri++;
          else { sp = RAFA_WALK; rg.x += dx / d * sp * dt; rg.z += dz / d * sp * dt; want = Math.atan2(dx, dz); }
        } else want = Math.atan2(P.pos.x - rg.x, P.pos.z - rg.z);
        // and you can't walk off ahead of him
        const ahead = rg.z - P.pos.z;
        L.speedMul = ahead > 1.5 ? 0.3 : ahead > 0 ? 0.68 : 1;
      } else if (phase === 'intro' || phase === 'blackout') {
        want = phase === 'blackout' ? Math.atan2(1.5 - rg.x, (followCar.visible ? followCar.position.z : P.pos.z + 12) - rg.z) : Math.atan2(P.pos.x - rg.x, P.pos.z - rg.z);
      }
      let df = want - rafa.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); rafa.group.rotation.y += df * Math.min(1, dt * (sp > 0 ? 6 : 3));
      rafaPhase += sp * dt * 2.9; animateWalk(rafa, rafaPhase, sp > 0 ? 1 : 0, false, sp);
      marker.visible = phase === 'walk' && dPl > 8; marker.position.set(rg.x, 2.35, rg.z);
    } else if (rafaState === 'runWithYou') {
      // a stride behind you and to the right, running when you run
      const tx = Math.max(2.5, Math.min(8, P.pos.x + 1.2)), tz = P.pos.z + 2.4;
      const dx = tx - rg.x, dz = tz - rg.z, d = Math.hypot(dx, dz);
      const sp = d > 0.15 ? Math.min(7.5, Math.max(P.speedNow, d * 3)) : 0;
      if (sp > 0) { rg.x += dx / d * Math.min(d, sp * dt); rg.z += dz / d * Math.min(d, sp * dt); }
      const want = sp > 1 ? Math.atan2(dx, dz) : Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
      let df = want - rafa.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); rafa.group.rotation.y += df * Math.min(1, dt * 5);
      rafaPhase += sp * dt * (sp > 3 ? 1.9 : 2.9); animateWalk(rafa, rafaPhase, sp > 0.2 ? 1 : 0, false, sp);
      marker.visible = false;
    } else if (rafaState === 'shot') {
      // momentum carries him forward, then he goes down on his face
      rafaFall = Math.min(1, rafaFall + dt * 2.6);
      if (rafaFall < 0.7) rg.z -= dt * 3.5 * (1 - rafaFall);
      rafa.group.rotation.x = -rafaFall * rafaFall * Math.PI / 2 * 0.96; rg.y = 0.15 - rafaFall * 0.1;
      animateWalk(rafa, rafaPhase, 0, false);
    }
    const prog = 6 - P.pos.z;
    for (let i = triggers.length - 1; i >= 0; i--) if (phase === 'walk' && prog > triggers[i].p && (triggers[i].p < 54 || rg.z < -46)) { const t = triggers[i]; triggers.splice(i, 1); t.fn(); }

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

    // ---- onto Mott St: they lose sight of you for a moment. Hide. ----
    if (phase === 'run' && P.pos.x > 12) {
      phase = 'side'; sideT = 0; L.chaseRun = false; L.allowSprint = true;
      ui.objective('HIDE. The big bush in the front yard. Press E.');
      ui.bigHint('HIDE<small>THE BUSH IN THE YARD, ON YOUR RIGHT</small>');
      for (const a of agents) if (a.role === 'chaseGo') { a.role = 'search'; a.path = null; }
    }
    if (phase === 'side') {
      sideT += dt;
      if (sideT > 9) for (const a of agents) if (a.role === 'search' && seesPlayer(a, 16)) { ui.bigHint(''); game.caught(a.h, 'They saw you on Mott Street. Get in the bush faster.'); return; }
    }
    // ---- the pass-by: they run down the street right past the bush ----
    if (phase === 'hidden' || (passT >= 0 && phase !== 'toRosa' && phase !== 'door')) {
      passT += dt;
      if (passT > 0.6 && passT - dt <= 0.6) audio.radio({ x: 10, y: 1.5, z: SZC }, 0.6);
      if (passT > 1.5 && passT - dt <= 1.5) {
        let k = 0;
        if (agents.filter((a) => a.role === 'search' || a.role === 'chaseGo').length < 2) makeAgent(6, SZC + 3).role = 'search';
        for (const a of agents) if (a.role === 'search' || a.role === 'chaseGo') {
          a.role = 'passBy'; a.wp = k === 0 ? [[10, SZC + 1.2], [27, SZ1 - 0.6], [BUSH.x, SZ1 - 0.4, 'sweep'], [50, SZC], [78, SZC]] : [[10, SZC - 1.5], [42, SZ0 + 1.6], [78, SZC - 1]];
          if (k === 0) { a.h.group.position.set(8, 0, SZC + 2); } else { a.h.group.position.set(6.5, 0, SZC - 1); }
          k++;
        }
        heliT = 0; audio.tone({ freq: 22, dur: 12, type: 'sawtooth', gain: 0.45, filter: 160, vib: [11, 4] }); audio.noise({ dur: 12, type: 'lowpass', freq: 300, gain: 0.35, attack: 1.5, brown: true });
      }
      let near = false, anyLeft = false, sweeping = false;
      for (const a of agents) if (a.role === 'passBy') {
        anyLeft = true;
        const g = a.h.group.position;
        if (Math.hypot(g.x - BUSH.x, g.z - BUSH.z) < 5) near = true;
        if (a.sweepT > 0) {
          sweeping = true; a.sweepT -= dt; a.speed = 0;
          turnAgent(a, Math.atan2(BUSH.x - g.x, BUSH.z - g.z) + Math.sin(a.sweepT * 1.7) * 0.5, dt * 4);
          if (a.sweepT < 4.2 && a.sweepT + dt >= 4.2) ui.bark({ ...LINES.p1, pos: { x: g.x, y: 1.6, z: g.z } });
          if (a.sweepT < 1.6 && a.sweepT + dt >= 1.6) ui.bark({ ...LINES.p2, pos: { x: g.x, y: 1.6, z: g.z } });
          continue;
        }
        const w = a.wp[0];
        if (!w) { removeAgent(a); break; }
        if (runTo(a, w[0], w[1], w[2] === 'sweep' ? 2.4 : 4.2, dt)) { a.wp.shift(); if (w[2] === 'sweep') a.sweepT = 5; }
      }
      bushSpot.agentNear = P.hidden === bushSpot && near;
      // he can hear you breathing if you don't hold it while the light is on the bush
      if (P.hidden === bushSpot && sweeping && near && !P.holdingBreath) { foundT += dt; if (foundT > 2.4) { const a = agents.find((x) => x.role === 'passBy'); if (a) { game.caught(a.h, 'He heard you breathing. Hold your breath (Space) when they\'re close.'); return; } } }
      // came out too soon
      if (leftEarlyT >= 0) { leftEarlyT += dt; const a = agents.find((x) => x.role === 'passBy' || x.role === 'search'); if (a && leftEarlyT > 0.8) { game.caught(a.h, 'You came out too soon. Wait until they\'re gone.'); return; } if (!a) leftEarlyT = -1; }
      if (passT > 3 && !anyLeft && phase === 'hidden') {
        phase = 'toRosa'; passT = -1; audio.setLoop('siren', 0.03, 4);
        ui.objective('Get to Doña Rosa\'s house. The blue one at the end of the street, with the candle in the window.');
      }
      if (passT > 3 && !anyLeft && phase !== 'hidden') passT = -1;
    }

    // ---- agents ----
    for (const a of agents) {
      const g = a.h.group.position;
      if (a.role === 'standOver') {
        // over Santiago, light on him
        if (Math.hypot(rg.x - g.x, rg.z - g.z) > 1.4) runTo(a, rg.x + 0.6, rg.z + 1.1, 3, dt); else { a.speed = 0; turnAgent(a, Math.atan2(rg.x - g.x, rg.z - g.z), dt * 4); }
      } else if (a.role === 'guard') {
        a.h.group.rotation.y = Math.atan2(P.pos.x - g.x, P.pos.z - g.z); a.speed = 0;
        if ((phase === 'run' || phase === 'side') && Math.hypot(P.pos.x - g.x, P.pos.z - g.z) < 6) { moveAgent(a, P.pos.x, P.pos.z, 4, dt); if (Math.hypot(P.pos.x - g.x, P.pos.z - g.z) < 0.9) game.caught(a.h, 'You ran into the roadblock. Turn right onto Mott Street. Try again.'); }
      } else if (a.role === 'chaseGo') {
        darkT += dt;
        const sp = darkT < 2.2 + (a.delay || 0) ? 0 : 2.8 + Math.min(0.5, darkT * 0.03);
        if (sp > 0) moveAgent(a, P.pos.x, P.pos.z, sp, dt); else a.speed = 0;
        if (Math.hypot(P.pos.x - g.x, P.pos.z - g.z) < 0.85) game.caught(a.h, 'You stopped running. Try again.');
      } else if (a.role === 'stand') { // dead still in the road, facing you
        a.speed = 0; turnAgent(a, Math.atan2(P.pos.x - g.x, P.pos.z - g.z), dt * 3);
      } else if (a.role === 'search') {
        // they reach the corner and look both ways
        if (sideT < 9) { if (moveAgent(a, 6 + agents.indexOf(a) % 2 * 2, SZC + 2, 3, dt)) { a.speed = 0; turnAgent(a, Math.sin(tl * 0.8 + agents.indexOf(a)) * 1.6 - Math.PI / 2 - 0.4, dt * 2); } }
        else moveAgent(a, P.pos.x, P.pos.z, 3.4, dt);
      }
      if (a.speed > 0) {
        a.phase += a.speed * dt * (a.speed > 3 ? 1.9 : 2.6); animateWalk(a.h, a.phase, Math.min(1, a.speed / 3), true, a.speed);
        a.stepAcc += a.speed * dt; if (a.stepAcc > 0.8) { a.stepAcc = 0; audio.boot({ x: g.x, y: 0.2, z: g.z }, 0.45); }
      } else animateWalk(a.h, a.phase, 0, true);
      const ry = a.h.group.rotation.y;
      a.sl.position.set(g.x + Math.sin(ry) * 0.4 + Math.cos(ry) * 0.3, g.y + 1.45, g.z + Math.cos(ry) * 0.4 - Math.sin(ry) * 0.3);
      a.sl.target.position.set(g.x + Math.sin(ry) * 9, 0.4, g.z + Math.cos(ry) * 9);
    }

    // the searchlight sweeps Mott St while you're in the bush, lingers on the yard, moves on
    if (heliT >= 0 && heliT < 12) {
      heliT += dt;
      const k = heliT / 12, linger = heliT > 4.5 && heliT < 6.5;
      const tx = linger ? BUSH.x + 1 : 6 + k * 70, tz = linger ? BUSH.z - 1 : SZC + Math.sin(heliT * 0.7) * 5;
      heli.intensity = 240; heli.target.position.set(tx, 0, tz); heli.position.set(tx + 6, 45, tz - 10);
      heliBeam.visible = true; heliBeam.position.copy(heli.position); heliBeam.lookAt(tx, 0, tz);
      if (linger && heliT - dt <= 4.5) { audio.hit(0.6); ui.shake(0.03, 0.4); }
      if (heliT >= 12) { heli.intensity = 0; heliBeam.visible = false; }
    }
  };
  L.danger = () => {
    if (phase === 'hidden') { let d = 40; for (const a of agents) d = Math.min(d, Math.hypot(a.h.group.position.x - BUSH.x, a.h.group.position.z - BUSH.z)); return { heart: Math.max(0.3, 1 - d / 15) }; }
    if (phase !== 'run' && phase !== 'side') return { heart: phase === 'blackout' ? 0.5 : 0 };
    const c = agents.find((a) => a.role === 'chaseGo' || a.role === 'search');
    const d = c ? Math.hypot(c.h.group.position.x - P.pos.x, c.h.group.position.z - P.pos.z) : 40;
    return { chase: true, heart: Math.max(0.4, 1 - d / 25), alert: Math.max(0, 0.6 - d / 15) };
  };
  L.dispose = () => { document.getElementById('dirHint').style.opacity = 0; ui.bigHint(''); };
  L.debug = () => ({ phase, passT, sideT, agents: agents.map((a) => [a.role, +a.h.group.position.x.toFixed(1), +a.h.group.position.z.toFixed(1), a.wp ? a.wp.length : null, a.sweepT]) });
  return L;
}

// Everything that is the place itself. Night 1 builds it straight into its scene; the Day 2 lunch scene
// builds it into a turned group (with a grid adapter) so the QUIK-WAY sits at that scene's origin.
export function buildCity(scene, grid, r, o = {}) {
  grid.fillAll(1, 1);
  grid.rect(-9, -125, 8, 12, 0, 0);          // Whittier: road + sidewalks
  grid.rect(9, SZ0, 74, SZ1, 0, 0);          // the side street
  grid.rect(23, SZ1 + 1, 74, -98, 0, 0);     // front yards, north side
  grid.rect(23, -117, 74, SZ0 - 1, 0, 0);    // front yards, south side
  // ---- ground ----
  const asph = std(0xffffff, { map: tex('asphalt', [3, 43]), roughnessMap: tex('wetRough', [4, 54], false), roughness: 0.55, metalness: 0.1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 150), asph); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -60); road.receiveShadow = true; scene.add(road);
  const swMat = std(0xffffff, { map: tex('sidewalk', [2, 75]), roughnessMap: tex('wetRough', [2, 43], false), roughness: 0.7 });
  for (const sx of [-7, 7]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 150), swMat); sw.position.set(sx, 0.075, -60); sw.receiveShadow = true; scene.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 150), std(0x8a8a84)); curb.position.set(sx > 0 ? 5 : -5, 0.08, -60); scene.add(curb);
  }
  const dashM = std(0xb8a560, { roughness: 0.5 });
  for (let z = 10; z > -130; z -= 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), dashM); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.01, z); scene.add(d); }
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x0d0e0e)); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; scene.add(outer);
  // side street: road, sidewalks, yards
  const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(66, 6), std(0xffffff, { map: tex('asphalt', [12, 1.2]), roughnessMap: tex('wetRough', [12, 1.5], false), roughness: 0.55, metalness: 0.1 }));
  sideRoad.rotation.x = -Math.PI / 2; sideRoad.position.set(42, 0.004, SZC); scene.add(sideRoad);
  for (const z of [SZ1 - 0.25, SZ0 + 0.75]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(57, 0.15, 1.5), std(0xffffff, { map: tex('sidewalk', [30, 1]), roughness: 0.7 })); sw.position.set(45.5, 0.075, z); scene.add(sw); }
  const grassM = std(0x1c2a1a, { roughness: 1 });
  for (const [z, d] of [[-99.5, 6], [-115.5, 4]]) { const y = new THREE.Mesh(new THREE.PlaneGeometry(52, d), grassM); y.rotation.x = -Math.PI / 2; y.position.set(49, 0.02, z); scene.add(y); }

  // ---- Whittier storefronts ----
  const shopNames = [['PANADERÍA', 'LA ESPERANZA'], ['LAVANDERÍA', 'COIN LAUNDRY'], ['CARNICERÍA', 'EL GÜERO'], ['ENVÍOS', 'DE DINERO'], ['TACOS', 'EL PRIMO'], ['BOTÁNICA', 'SAN MIGUEL'], ['MUEBLES', 'GARCÍA'], ['LIQUOR', 'BEER · WINE'], ['DENTISTA', 'SE HABLA ESPAÑOL'], ['ZAPATERÍA', 'LUPITA'], ['CHECK', 'CASHING'], ['PELUQUERÍA', 'ESTILOS']];
  const wallCols = ['#5b5048', '#4b5552', '#6a5a46', '#50463f', '#5d5a52', '#47504c'];
  const awnCols = [0x6e1d1a, 0x1d4a3a, 0x24304e, 0x6a4a18, 0x3a1d40];
  const neon = [], neonLights = [], windowMats = [];
  let shopI = 0;
  function building(side, z0, len) {
    const h = 7 + r() * 8, depth = 12;
    const floors = Math.max(2, Math.round(h / 3.4)), cols = Math.max(2, Math.round(len / 3));
    const fac = facadeTex(1000 + shopI * 7, floors, cols, wallCols[shopI % wallCols.length]);
    const front = std(0xffffff, { map: fac.map, emissiveMap: fac.emissive, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.9 });
    windowMats.push(front);
    const sideM = std(0xffffff, { map: tex(r() < 0.5 ? 'brick' : 'stucco', [3, 2]), roughness: 0.95 });
    const mats = side < 0 ? [front, sideM, sideM, sideM, sideM, sideM] : [sideM, front, sideM, sideM, sideM, sideM];
    const fx = side * 9;
    const b = new THREE.Mesh(new THREE.BoxGeometry(depth, h, len), mats);
    b.position.set(fx + side * depth / 2, h / 2, z0 - len / 2); b.castShadow = b.receiveShadow = true; scene.add(b);
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
    while (z > -132) {
      const len = 8 + Math.floor(r() * 7);
      // openings in the frontage: build right up to their edge (no empty gaps), then jump past them
      const gaps = side > 0 ? [[-86, -128], [-49, -73]] : [[-51, -70]]; // east: the two corner houses on Mott sit in that first gap
      const gap = gaps.find(([g0, g1]) => z - len < g0 && z > g1);
      if (gap) { if (z - gap[0] > 0.2) building(side, z, z - gap[0]); z = gap[1]; continue; }
      building(side, z, len); z -= len;
    }
  }
  // street sign at the corner
  const stT = textTex(256, 64, '#1d5a3a', [{ text: 'MOTT ST', size: 40, color: '#f0f0e8' }], { border: '#f0f0e8', borderW: 4 });
  const stPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), std(0x3a3d3e, { metalness: 0.6 })); stPole.position.set(8.6, 1.6, SZ1 + 0.3); scene.add(stPole);
  const stSign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.03), [std(0x1d5a3a), std(0x1d5a3a), std(0x1d5a3a), std(0x1d5a3a), std(0xffffff, { map: stT }), std(0xffffff, { map: stT })]); stSign.position.set(8.6, 3.1, SZ1 + 0.3); scene.add(stSign);
  // the Hammerline pole sign over the shops (Rosa: "past the big Hammerline sign")
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 8), std(0x333333, { metalness: 0.5 })); pole.position.set(5.8, 4.5, -46.5); scene.add(pole);
  grid.rect(5, -47, 5, -47, 1, 0);
  const hlT = textTex(512, 256, '#d8541c', [{ text: 'HAMMERLINE', size: 92, color: '#fff', y: 100 }, { text: 'DEPOT  ·  OPEN TIL 11', size: 40, color: '#fff', y: 190 }]);
  const hlM = std(0xffffff, { map: hlT, emissiveMap: hlT, emissive: 0xffffff, emissiveIntensity: 1.2 });
  const hlSign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 6), [hlM, hlM, std(0x222222), std(0x222222), std(0x222222), std(0x222222)]);
  hlSign.position.set(5.8, 10.5, -46.5); scene.add(hlSign); neon.push(hlM);

  const backMats = []; // the rest of the city keeps its power when Whittier goes dark
  // ---- behind the storefronts: back buildings, a block wall behind the QUIK-WAY, apartments; then the rest of the city ----
  {
    const backCols = ['#6a5a4c', '#5a5650', '#74624e', '#5e544e', '#6e6458'];
    const backBox = (x0, x1, z0, z1, h, seed) => {
      const w = x1 - x0, len = z0 - z1, fac = facadeTex(2000 + seed, Math.max(2, Math.round(h / 3.4)), Math.max(2, Math.round(len / 3.5)), backCols[seed % backCols.length], o.day ? 0.22 : 0.4);
      const face = std(0xffffff, { map: fac.map, emissiveMap: fac.emissive, emissive: 0xffffff, emissiveIntensity: o.day ? 0.6 : 1.5, roughness: 0.9 }); backMats.push(face);
      const side = std(0xffffff, { map: tex(seed % 2 ? 'brick' : 'stucco', [3, 2]), roughness: 0.95 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), [face, face, std(0x2a2624), side, face, face]); b.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); b.receiveShadow = true; scene.add(b);
      // at night the lit windows glow through the fog
      if (!o.day) { const gl = new THREE.Mesh(b.geometry, glowMats(glowMaterial(fac.emissive, 1.3))); gl.position.copy(b.position); gl.renderOrder = 2; scene.add(gl); }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, len + 0.3), std(0x3a3430)); cap.position.set((x0 + x1) / 2, h + 0.17, (z0 + z1) / 2); scene.add(cap);
      if (r() < 0.5) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.1), std(0x8a8a86, { metalness: 0.4 })); ac.position.set((x0 + x1) / 2 + (r() - 0.5) * w * 0.5, h + 0.6, (z0 + z1) / 2 + (r() - 0.5) * len * 0.5); scene.add(ac); }
    };
    // west side: behind the shops (x -21..-35), skipping the QUIK-WAY lot
    let seed = 0;
    for (const [za, zb] of [[14, -51], [-70, -134]]) { let z = za; while (z > zb) { const len = Math.min(z - zb, 10 + Math.floor(r() * 10)); backBox(-35, -21.5, z, z - len, 11 + r() * 12, seed++); z -= len; } }
    // east side: behind the shops (x 21..35), north of Hammerline and between it and Mott St
    for (const [za, zb] of [[14, -49], [-73, -85]]) { let z = za; while (z > zb) { const len = Math.min(z - zb, 10 + Math.floor(r() * 10)); backBox(21.5, 35, z, z - len, 11 + r() * 12, seed++); z -= len; } }
    for (const [za, zb] of [[-132.5, -140]]) backBox(21.5, 35, za, zb, 9, seed++);
    // behind the QUIK-WAY: a painted cinder-block wall, then a two-storey apartment block
    const cbM = std(0xffffff, { map: tex('block', [8, 1]), color: 0xc8beb0, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 19.6), cbM); wall.position.set(-30.2, 1.2, -60.5); scene.add(wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 19.6), std(0x8a8478)); cap.position.set(-30.2, 2.45, -60.5); scene.add(cap);
    for (const zz of [-51, -70]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 0.3), cbM); sw.position.set(-25.5, 1.2, zz); scene.add(sw); }
    backBox(-45, -32, -50.5, -60.5, 12, 40); backBox(-45, -32, -60.5, -70.5, 10, 41);
    // Mott St: back rows behind the houses on both sides, and past the dead end
    for (let x = 22; x < 76; x += 10) { backBox(x, x + 9, -77, -86, 7 + r() * 6, seed++); backBox(x, x + 9, -128, -137, 7 + r() * 6, seed++); }
    backBox(84, 96, -90, -124, 8, seed++);
    // both ends of Whittier: a cross street, then a solid row of buildings, so the road never runs into nothing
    for (const [zr, zb0, zb1] of [[19.5, 24, 38], [-139.5, -144, -158]]) {
      const cr = new THREE.Mesh(new THREE.PlaneGeometry(90, 9), std(0xffffff, { map: tex('asphalt', [9, 1]), roughness: 0.6 })); cr.rotation.x = -Math.PI / 2; cr.position.set(0, 0.004, zr); scene.add(cr);
      for (let x = -45; x < 45;) { const w = 9 + Math.floor(r() * 8); backBox(x, Math.min(45, x + w), Math.max(zb0, zb1), Math.min(zb0, zb1), 12 + r() * 14, seed++); x += w; }
    }
    // the rest of the city out to the horizon
    addSkyline(scene, { day: !!o.day, exclude: [[-50, -160, 46, 40], [20, -141, 98, -74]], center: [20, -60] });
  }
  // ---- Hammerline Depot #0417: the big box on the east side, where Juan works ----
  {
    const D = 30, Z0 = -49, Z1 = -73, len = Z0 - Z1, zc = (Z0 + Z1) / 2;
    const wallM = std(0xffffff, { map: tex('block', [10, 3]), roughness: 0.95, color: 0xb8b0a4 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(D, 10, len), wallM); b.position.set(9 + D / 2, 5, zc); b.receiveShadow = true; scene.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, len), std(0xd2541c, { roughness: 0.7 })); band.position.set(9.05, 8.6, zc); scene.add(band);
    const hT = textTex(1024, 200, '#d2541c', [{ text: 'HAMMERLINE DEPOT', size: 120, color: '#fff', y: 108 }]);
    const hM = std(0xffffff, { map: hT, emissiveMap: hT, emissive: 0xffffff, emissiveIntensity: o.day ? 0.15 : 0.9 }); neon.push(hM);
    const hs = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.7), hM); hs.position.set(8.88, 8.6, zc); hs.rotation.y = -Math.PI / 2; scene.add(hs);
    // the entrance: a deep orange portal, glass doors, carts lined up under the overhang
    const por = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 8), std(0xd2541c, { roughness: 0.7 })); por.position.set(8.5, 2.5, zc); scene.add(por);
    const doorG = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), std(0x1a2226, { roughness: 0.1, metalness: 0.6, emissive: 0x8aa8a0, emissiveIntensity: o.day ? 0.15 : 0.05 })); doorG.position.set(7.88, 1.6, zc); doorG.rotation.y = -Math.PI / 2; scene.add(doorG);
    for (let k = 0; k <= 4; k++) { const mu = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.08), std(0x8a8a86, { metalness: 0.6 })); mu.position.set(7.86, 1.6, zc - 3 + k * 1.5); scene.add(mu); }
    for (const s2 of [-1, 1]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), std(0xffffff, { map: tex('shutter', [2, 1]), roughness: 0.6, metalness: 0.4 })); sh.position.set(8.97, 1.7, zc + s2 * 8); sh.rotation.y = -Math.PI / 2; scene.add(sh); }
    for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.9), std(0xd2541c, { metalness: 0.4, roughness: 0.5, wireframe: false })); c.position.set(8.3, 0.6, zc + 5 + k * 0.35); scene.add(c); }
    grid.rect(8, Math.floor(zc - 4), 8, Math.floor(zc + 4), 1, 0);
  }
  // ---- QUIK-WAY gas & mini mart, across Whittier from the Hammerline sign (where Juan eats lunch on Day 2). Open all night; you can walk in. ----
  const quik = (() => {
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(13, 19), std(0xffffff, { map: tex('concrete', [3, 5]), roughnessMap: tex('wetRough', [3, 5], false), roughness: 0.6 })); lot.rotation.x = -Math.PI / 2; lot.position.set(-15.5, 0.01, -60.5); scene.add(lot);
    grid.rect(-22, -69, -10, -52, 0, 0);
    // the store: storefront faces the street (local +z -> world +x)
    const m = buildQuikWay(scene, grid, { pos: [-24, -44], rot: Math.PI / 2, r, night: !o.day });
    // canopy over two pump islands
    const stripeM = std(0xffffff, { map: tex('stripes', [10, 1]), roughness: 0.6 }), canM = std(0xe8e4dc, { roughness: 0.6 });
    const can = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 12), [stripeM, stripeM, canM, canM, stripeM, stripeM]); can.position.set(-14.5, 4.9, -60.5); scene.add(can);
    const canLightM = std(0x222222, { emissive: 0xf0f4e8, emissiveIntensity: 1.6 }); // on its own circuit: stays lit through the blackout
    for (const [cx, cz] of [[-13, -57], [-16, -57], [-13, -64], [-16, -64]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), canLightM); p.position.set(cx, 4.43, cz); scene.add(p); }
    // light pooling down on each pump island from the canopy
    for (const cz of [-58, -63]) { const sl = new THREE.SpotLight(0xf0f4e8, o.day ? 6 : 40, 9, 0.95, 0.6, 1.3); sl.position.set(-14.5, 4.35, cz); sl.target.position.set(-14.5, 0, cz); scene.add(sl); scene.add(sl.target); }
    const canL = new THREE.PointLight(0xf0f4e8, o.day ? 4 : 10, 12, 1.5); canL.position.set(-14.5, 4.0, -60.5); scene.add(canL);
    for (const cz of [-55.2, -65.8]) { const col = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, 0.35), canM); col.position.set(-14.5, 2.25, cz); scene.add(col); grid.rect(-15, Math.floor(cz), -15, Math.floor(cz), 1, 0); }
    for (const cz of [-58, -63]) { makePump(scene, -14.5, cz, { rot: Math.PI / 2, night: !o.day }); grid.rect(-17, cz - 1, -13, cz, 1, 0); }
    // the tall price sign at the street
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 8.5, 8), std(0x3a3a3a, { metalness: 0.5 })); sp.position.set(-11.2, 4.25, -53); scene.add(sp); grid.rect(-12, -54, -12, -54, 1, 0);
    const pT = textTex(512, 640, '#f2efe6', [{ text: 'QUIK', size: 130, color: '#c4202a', y: 100 }, { text: 'WAY', size: 100, color: '#1d7a3e', y: 210 }, { text: 'REG  4.89', size: 70, color: '#111', y: 340 }, { text: 'DSL  5.19', size: 70, color: '#111', y: 430 }, { text: 'OPEN 24 HRS', size: 48, color: '#e8701c', y: 560 }], { border: '#e8701c', borderW: 18 });
    const pM = std(0xffffff, { map: pT, emissiveMap: pT, emissive: 0xffffff, emissiveIntensity: 1.1 }); neon.push(pM);
    const ps = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.0, 3.2), [pM, pM, std(0x333333), std(0x333333), std(0x333333), std(0x333333)]); ps.position.set(-11.2, 10.4, -53); scene.add(ps);
    return m;
  })();
  // ---- Mott St: little stucco bungalows, bars on the windows, porch lights, bins at the curb ----
  const houseCols = [0x7a6a58, 0x5a6a62, 0x8a7458, 0x6a5a5a, 0x7a5e52, 0x5e6658];
  const stuccoT = tex('stucco', [3, 1.2]);
  const wallMs = {}; const wallMat = (c) => wallMs[c] || (wallMs[c] = std(c, { map: stuccoT, roughness: 0.95 }));
  const roofM = std(0xffffff, { map: tex('shingle', [3, 4]), roughness: 0.95 });
  const trimM = std(0x9a958a, { roughness: 0.8 }), skirtM = std(0x34302c, { roughness: 0.95 }), ironM = std(0x111111, { metalness: 0.5, roughness: 0.6 });
  const darkWinM = std(0x0c1214, { roughness: 0.2, metalness: 0.4 });
  const litWinM = std(0x2a1a0a, { emissive: 0xd89048, emissiveIntensity: 0.45, roughness: 0.3 });
  const tvWinM = std(0x0a1018, { emissive: 0x5a78c8, emissiveIntensity: 0.3, roughness: 0.3 });
  const concM = std(0x6a6a64, { map: tex('concrete', [1, 2]), roughness: 0.85 });
  const railM = std(0x7a7e80, { metalness: 0.6, roughness: 0.5 });
  const linkM = new THREE.MeshStandardMaterial({ map: tex('chainlink', [3, 1], false), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x888888, metalness: 0.6 });
  const mb = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const porchLights = [];
  let rosaWin = null;
  // a house built facing local +z with its front wall on z=0; rot turns it to face the street
  function bungalow(x, z, rot, col, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    const W = 8, D = 10, H = 3.2, pitch = 0.42, rise = Math.tan(pitch) * W / 2;
    const wallM = wallMat(col);
    const body = mb(g, W, H, D, wallM, 0, H / 2, -D / 2); body.receiveShadow = true;
    mb(g, W + 0.06, 0.45, D + 0.06, skirtM, 0, 0.22, -D / 2);
    // gable roof, ridge running back from the street, with trim on the rakes
    const half = W / 2 + 0.45, slabL = half / Math.cos(pitch);
    for (const s of [-1, 1]) {
      const sl = mb(g, slabL, 0.14, D + 0.9, roofM, s * half / 2, H + rise - Math.tan(pitch) * half / 2 + 0.07, -D / 2); sl.rotation.z = -s * pitch;
      const tr = mb(g, slabL, 0.2, 0.08, trimM, s * half / 2, H + rise - Math.tan(pitch) * half / 2, 0.47); tr.rotation.z = -s * pitch;
    }
    const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, rise)]);
    const gable = new THREE.Mesh(new THREE.ShapeGeometry(tri), wallM); gable.position.set(0, H, 0.005); g.add(gable);
    mb(g, 0.8, 0.45, 0.04, std(0x1a1816), 0, H + rise * 0.42, 0.02); // attic vent
    for (let k = -2; k <= 2; k++) mb(g, 0.75, 0.03, 0.06, trimM, 0, H + rise * 0.42 + k * 0.08, 0.04);
    // porch: slab, two posts, a little shed roof
    mb(g, 3.4, 0.22, 1.9, concM, 0, 0.11, 0.95);
    for (const s of [-1, 1]) mb(g, 0.14, 2.5, 0.14, trimM, s * 1.55, 1.25, 1.75);
    const pr = mb(g, 3.8, 0.12, 2.1, roofM, 0, 2.6, 0.95); pr.rotation.x = 0.12;
    // front door behind a black security screen
    mb(g, 1.0, 2.1, 0.08, std(o.door || 0x2a2420), 0, 1.07, 0.03);
    mb(g, 1.1, 2.2, 0.04, trimM, 0, 1.1, 0.0);
    for (let k = -2; k <= 2; k++) mb(g, 0.025, 2.0, 0.025, ironM, k * 0.2, 1.1, 0.2);
    for (const y of [0.3, 1.1, 1.9]) mb(g, 1.0, 0.04, 0.03, ironM, 0, y, 0.2);
    // windows: trim, sill, glass (dark, lamp-lit or TV-blue), bars
    for (const wx of [-2.6, 2.6]) {
      const st = o.windows ? o.windows[wx < 0 ? 0 : 1] : 'dark';
      mb(g, 1.6, 1.35, 0.08, trimM, wx, 1.75, 0.02);
      mb(g, 1.75, 0.08, 0.22, trimM, wx, 1.04, 0.1);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 1.12), st === 'rosa' ? std(0x2a1a0a, { emissive: 0xffa040, emissiveIntensity: 0.55 }) : st === 'lit' ? litWinM : st === 'tv' ? tvWinM : darkWinM);
      gl.position.set(wx, 1.75, 0.07); g.add(gl);
      if (st === 'rosa') rosaWin = gl;
      if (st === 'lit') { const cu = mb(g, 0.45, 1.1, 0.02, std(0x5a1e18, { emissive: 0x3a0e08, emissiveIntensity: 0.5 }), wx - 0.45, 1.75, 0.08); }
      for (let k = -2; k <= 2; k++) mb(g, 0.025, 1.3, 0.025, ironM, wx + k * 0.3, 1.75, 0.2);
      for (const y of [1.2, 2.3]) mb(g, 1.5, 0.03, 0.025, ironM, wx, y, 0.2);
    }
    // porch lamp by the door
    const pl = mb(g, 0.16, 0.24, 0.12, std(0x222222, { emissive: 0xffc070, emissiveIntensity: o.porch ? 2.2 : 0 }), 0.8, 2.05, 0.1);
    if (o.porch) {
      const wp = g.localToWorld(new THREE.Vector3(0.8, 2.1, 0.7));
      const l = new THREE.PointLight(0xffb868, 6, 8, 1.6); l.position.copy(wp); scene.add(l);
      const gw = makeGlow(0xffc070, 0.9, 0.8); gw.position.copy(g.localToWorld(new THREE.Vector3(0.8, 2.05, 0.2))); scene.add(gw);
      porchLights.push({ l, gw, m: pl.material });
    }
    // walk from the gate, a couple of pots on the porch
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.2, o.walk || 4.2), concM); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.03, 1.9 + (o.walk || 4.2) / 2); g.add(walk);
    if (o.pots) for (const px of [-1.2, 1.25]) { mb(g, 0.36, 0.34, 0.36, std(0x8a4a2a), px, 0.39, 1.5); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), leafM2); lf.position.set(px, 0.78, 1.5); g.add(lf); }
    g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
    return g;
  }
  const leafM = std(0x1a2a18, { roughness: 1 }), leafM2 = std(0x223420, { roughness: 1 });
  const winPick = (k) => { const v = (k * 7919) % 10; return v < 4 ? 'lit' : 'dark'; };
  for (let i = 0; i < 5; i++) for (const north of [true, false]) {
    const cx = 27 + i * 10, rosa = north && i === 4, k = i * 2 + (north ? 0 : 1);
    const z0 = north ? -97 : -117;
    const windows = rosa ? ['rosa', 'dark'] : k === 3 ? ['tv', 'dark'] : [winPick(k + 1), winPick(k + 5)];
    bungalow(cx, z0, north ? Math.PI : 0, rosa ? 0x3a5a7a : houseCols[k % houseCols.length], { door: rosa ? 0x5a2a1a : undefined, windows, porch: !rosa && (k === 2 || k === 5 || k === 8), pots: k % 3 === 0, walk: 4.2 });
    // porch posts block
    for (const s of [-1, 1]) grid.rect(Math.floor(cx + s * 1.55), Math.floor(z0 + (north ? -1.75 : 1.75)), Math.floor(cx + s * 1.55), Math.floor(z0 + (north ? -1.75 : 1.75)), 1, 0);
    // chain-link across the front of each yard: posts, top rail, gate left open
    const fz = north ? SZ1 + 1.2 : SZ0 - 1.2;
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), linkM); f.position.set(cx + s * 2.6, 0.5, fz); scene.add(f);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.4, 5), railM); rail.rotation.z = Math.PI / 2; rail.position.set(cx + s * 2.6, 1.0, fz); scene.add(rail);
      for (const px of [cx + s * 0.9, cx + s * 4.3]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5), railM); po.position.set(px, 0.55, fz); scene.add(po); }
    }
    grid.rect(cx - 4, Math.floor(fz), cx - 1, Math.floor(fz), 1, 0); grid.rect(cx + 1, Math.floor(fz), cx + 3, Math.floor(fz), 1, 0); // gate gap at cx
    // mailbox on a post by the gate
    if (!rosa || true) { const mpx = cx + 1.25, mpz = fz + (north ? -0.5 : 0.5); const po = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), std(0x3a3028)); po.position.set(mpx, 0.55, mpz); scene.add(po); const bx = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.45), std(k % 2 ? 0x2a2a2c : 0x4a4038, { metalness: 0.4 })); bx.position.set(mpx, 1.2, mpz); scene.add(bx); }
  }
  // the corners of Mott and Whittier: a house on each, side wall to the boulevard, front porch to Mott
  bungalow(15, -97, Math.PI, 0x6e5e50, { windows: ['lit', 'dark'], walk: 4.2 });
  bungalow(15, -117, 0, 0x5a6058, { windows: ['dark', 'dark'], walk: 4.2, pots: true });
  for (const [fz, zc] of [[SZ1 + 1.2, -99.5], [SZ0 - 1.2, -115]]) { const y = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), grassM); y.rotation.x = -Math.PI / 2; y.position.set(15, 0.02, zc); scene.add(y);
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.0), linkM); f.position.set(15 + sx * 3.3, 0.5, fz); scene.add(f); } }
  // the end of the street: two more houses facing back down Mott, and a dead end
  bungalow(80, -101.5, -Math.PI / 2, 0x6a5e50, { windows: ['dark', 'lit'], walk: 4.4 });
  bungalow(80, -113, -Math.PI / 2, 0x58625a, { windows: ['dark', 'dark'], walk: 4.4 });
  { const lot = new THREE.Mesh(new THREE.PlaneGeometry(6, 26), grassM); lot.rotation.x = -Math.PI / 2; lot.position.set(77, 0.02, -107); scene.add(lot);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.7), std(k % 2 ? 0xd8d4cc : 0x8a1a18)); b.position.set(74.6, 0.45, -110 + k * 2); scene.add(b); }
    const deadT = textTex(256, 128, '#e8c020', [{ text: 'DEAD END', size: 54, color: '#111' }], { border: '#111', borderW: 6 });
    const dp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), railM); dp.position.set(74.4, 1.3, -104.4); scene.add(dp);
    const ds = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), std(0xffffff, { map: deadT })); ds.position.set(74.35, 2.4, -104.4); ds.rotation.y = -Math.PI / 2; scene.add(ds); }
  // Rosa's: a candle in the front window
  const rosaLight = new THREE.PointLight(0xffa040, 0, 7, 1.6); rosaLight.position.set(DOOR.x - 2.6, 1.8, DOOR.z - 1.0); scene.add(rosaLight);
  const rosaGlow = makeGlow(0xffa040, 1.2, 0); rosaGlow.position.set(DOOR.x - 2.6, 1.7, DOOR.z - 0.1); scene.add(rosaGlow);
  if (rosaWin) rosaWin.material.emissiveIntensity = 0;
  // bins out at the curb for the morning
  const binCols = [0x1a1c1c, 0x1e3a6a, 0x2a4a22];
  for (const [bx, bz, rot] of [[39.6, -102.9, Math.PI], [58.8, -102.9, Math.PI], [45.6, -111.7, 0], [63.4, -111.7, 0]]) {
    for (let k = 0; k < 3; k++) {
      const x = bx + k * 0.72, bin = new THREE.Group(); bin.position.set(x, 0.15, bz); bin.rotation.y = rot + (k - 1) * 0.08; scene.add(bin);
      mb(bin, 0.6, 1.0, 0.68, std(binCols[k], { roughness: 0.55 }), 0, 0.5, 0); mb(bin, 0.66, 0.06, 0.74, std(binCols[k], { roughness: 0.5 }), 0, 1.03, 0.02);
    }
    grid.rect(Math.floor(bx), Math.floor(bz), Math.floor(bx + 1.6), Math.floor(bz), 1, 0);
  }
  // palms behind the houses, black against the sky
  for (const [x, z, h, s] of [[33, -84, 13, 1], [59, -83, 15, 2], [47, -131, 14, 3], [71, -129, 12, 4], [20, -86, 12, 5]]) { const p = makePalm(h, s, 0.6 + s * 0.15); p.position.set(x, 0, z); p.rotation.y = s; scene.add(p); }
  // clipped hedges, square like everybody's front yard; the big one is where he hides
  const hedgeM = std(0xffffff, { map: tex('hedge', [2, 1]), roughness: 1 }), hedgeTopM = std(0xffffff, { map: tex('hedge', [2, 1.2]), roughness: 1, color: 0xc8d8b8 });
  function bush(x, z, s = 1) {
    const g = new THREE.Group();
    const W = 2.2 * s, H = 1.15 * s, D = 1.25 * s;
    const main = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [hedgeM, hedgeM, hedgeTopM, hedgeM, hedgeM, hedgeM]); main.position.y = H / 2; g.add(main);
    // a few uneven clumps so it isn't a perfect cube
    for (let k = 0; k < 4; k++) { const cw = W * (0.25 + r() * 0.2), ch = 0.12 + r() * 0.12; const c = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, D * (0.6 + r() * 0.3)), [hedgeM, hedgeM, hedgeTopM, hedgeM, hedgeM, hedgeM]); c.position.set((r() - 0.5) * (W - cw), H + ch / 2 - 0.04, (r() - 0.5) * 0.2); g.add(c); }
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.position.set(x, 0, z); scene.add(g); return g;
  }
  const hideBush = bush(BUSH.x, BUSH.z, 1.35);
  grid.rect(BUSH.x - 1, Math.floor(BUSH.z) - 1, BUSH.x + 1, Math.floor(BUSH.z), 1, 0);
  for (const [x, z] of [[44, -100], [52.5, -99.8], [32, -114.6], [62, -114.6]]) { bush(x, z, 0.8); grid.rect(Math.floor(x), Math.floor(z), Math.floor(x), Math.floor(z), 1, 0); }
  // Mott St has its own lines: they stay on after Whittier goes dark. The one over the bush is dying.
  const mottLamps = [];
  function mottLamp(x, z, dir, col, o = {}) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.4, 6), std(0x2a2d2e, { metalness: 0.6, roughness: 0.5 })); p.position.set(x, 3.2, z); scene.add(p);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.8), std(0x2a2d2e)); arm.position.set(x, 6.3, z + dir * 0.9); scene.add(arm);
    const headM = std(0x222222, { emissive: col, emissiveIntensity: o.dead ? 0 : 2.5 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.7), headM); head.position.set(x, 6.2, z + dir * 1.7); scene.add(head);
    grid.rect(Math.floor(x), Math.floor(z), Math.floor(x), Math.floor(z), 1, 0);
    if (o.dead) return;
    const hz = z + dir * 1.7;
    const light = new THREE.PointLight(col, o.i || 32, 26, 1.5); light.position.set(x, 5.9, hz); scene.add(light);
    const glow = makeGlow(col, 3.2, 0.85); glow.position.set(x, 6.0, hz); scene.add(glow);
    const cone = makeBeam(6.2, 3.2, col, 0.09); cone.position.set(x, 6.1, hz); cone.rotation.x = Math.PI / 2; scene.add(cone);
    mottLamps.push({ light, headM, glow, cone, x, z: hz, base: o.i || 32, flick: !!o.flick, f: 1, t: 2 + Math.random() * 3, burst: 0 });
  }
  mottLamp(33.5, -102.6, -1, 0xd6f0dc, { flick: true, i: 36 }); // over the hiding bush
  mottLamp(54, -111.9, 1, 0xffaa58, { i: 28 });
  mottLamp(70, -111.9, 1, 0xd6f0dc, { dead: true });
  // a car under the light, telephone poles and sagging lines down the south side
  { const c = makeAuto('pickup', 0x3a4658); c.position.set(66, 0, -104.8); c.rotation.y = Math.PI / 2; scene.add(c); grid.rect(63, -106, 68, -104, 1, 0); }
  { let prev = null; const wm = new THREE.LineBasicMaterial({ color: 0x050505 });
    for (const x of [24, 44, 64]) {
      const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 9, 6), std(0x2b231c)); tp.position.set(x, 4.5, -112.2); scene.add(tp);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), std(0x2b231c)); cross.position.set(x, 8.4, -112.2); scene.add(cross);
      grid.rect(x, -113, x, -113, 1, 0);
      if (prev !== null) for (const dz of [-1, 0, 1]) { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(prev + (x - prev) * t, 8.45 - Math.sin(t * Math.PI) * 0.7, -112.2 + dz)); } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wm)); }
      // a drop line to the house behind
      const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(new THREE.Vector3(x + 3 * t, 8.4 - t * 4.2 + Math.sin(t * Math.PI) * -0.4, -112.2 - 5 * t)); } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wm));
      prev = x;
    }
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), std(0x3a3d3e, { metalness: 0.5 })); tr.position.set(44.5, 7.6, -112.2); scene.add(tr); }

  // ---- props: cars, poles, wires, dumpster, bus stop ----
  const carCols = [0x4a4f55, 0x6b1f1f, 0x2b3a4a, 0x8a8478, 0x1e3a2a, 0x3b3b3b];
  const parked = [[-3.8, 2], [-3.8, -12], [-3.8, -24], [-3.8, -45], [3.8, -8], [3.8, -20], [3.8, -38], [3.8, -68], [-3.8, -98], [3.8, -88], [-3.8, -82]];
  const civTints = [0x6a6a66, 0x3a4658, 0x5a3434, 0x3a4a3c, 0x4a4a48, 0x2e2e36];
  for (const [x, z] of parked) {
    const c = makeAuto(CIV_KINDS[(r() * CIV_KINDS.length) | 0], CIV_COLORS[(r() * CIV_COLORS.length) | 0], { seed: x * 7 + z, dirt: r(), chrome: r() < 0.4 }); c.position.set(x, 0, z); c.rotation.y = x < 0 ? 0 : Math.PI; scene.add(c);
    grid.rect(Math.floor(x - 1), Math.floor(z - 2.3), Math.floor(x + 0.9), Math.floor(z + 2.2), 1, 0);
  }
  for (const [x, z] of [[35, -110.2], [55, -104.8]]) { const c = makeAuto(['sedan', 'van'][(r() * 2) | 0], CIV_COLORS[(r() * CIV_COLORS.length) | 0], { seed: x, dirt: r() }); c.position.set(x, 0, z); c.rotation.y = Math.PI / 2; scene.add(c); grid.rect(Math.floor(x - 2.2), Math.floor(z - 1), Math.floor(x + 2.1), Math.floor(z + 0.9), 1, 0); }
  // streetlights
  const lamps = [];
  const lampZ = [6, -12, -30, -48, -66, -84, -102, -120];
  lampZ.forEach((z, i) => {
    const side = i % 2 ? -1 : 1, x = side * 5.6;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.4, 6), std(0x2a2d2e, { metalness: 0.6, roughness: 0.5 })); p.position.set(x, 3.2, z); scene.add(p); grid.rect(Math.floor(x), Math.floor(z), Math.floor(x), Math.floor(z), 1, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), std(0x2a2d2e)); arm.position.set(x - side * 0.9, 6.3, z); scene.add(arm);
    const lampCol = i % 3 === 1 ? 0xffaa58 : 0xd6f0dc;
    const headM = std(0x222222, { emissive: lampCol, emissiveIntensity: 2.5 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.35), headM); head.position.set(x - side * 1.7, 6.2, z); scene.add(head);
    const light = new THREE.PointLight(lampCol, 32, 24, 1.5); light.position.set(x - side * 1.7, 5.9, z); scene.add(light);
    const glow = makeGlow(lampCol, 3.2, 0.85); glow.position.set(x - side * 1.7, 6.0, z); scene.add(glow);
    const cone = makeBeam(6.2, 3.2, lampCol, 0.09); cone.position.set(x - side * 1.7, 6.1, z); cone.rotation.x = Math.PI / 2; scene.add(cone);
    lamps.push({ light, headM, glow, cone, z, on: true, x: x - side * 1.7, flick: i === 2 || i === 4, f: 1 });
  });
  const wireM = new THREE.LineBasicMaterial({ color: 0x050505 });
  let prevTop = null;
  for (let z = 10; z > -132; z -= 26) {
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 9, 6), std(0x2b231c)); tp.position.set(-5.6, 4.5, z); scene.add(tp); grid.rect(-6, Math.floor(z), -6, Math.floor(z), 1, 0);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), std(0x2b231c)); cross.position.set(-5.6, 8.4, z); scene.add(cross);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), std(0x3a3d3e, { metalness: 0.5 })); tr.position.set(-5.1, 7.6, z); scene.add(tr);
    if (prevTop !== null) for (const dx of [-1, 0, 1]) {
      const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(-5.6 + dx, 8.45 - Math.sin(t * Math.PI) * 0.7, prevTop + (z - prevTop) * t)); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
    }
    prevTop = z;
  }
  const dumpM = std(0x1f3a2a, { roughness: 0.6, metalness: 0.3 });
  const dump = makeDumpster(0x1f3a2a); dump.position.set(8.0, 0, -26.5); dump.rotation.y = -Math.PI / 2; scene.add(dump);
  grid.rect(7, -28, 8, -25, 1, 0);
  const shelter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 3.5), std(0x333333)); shelter.position.set(7.8, 2.5, 8); scene.add(shelter);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 2.5), std(0x3a3a3a)); bench.position.set(8.3, 0.4, 8); scene.add(bench);
  const busT = textTex(256, 128, '#20262a', [{ text: 'METRO', size: 44, color: '#e0d8c0', y: 46 }, { text: '18 · WHITTIER BL', size: 24, color: '#b8b098', y: 94, weight: 'normal' }]);
  const busPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), std(0x3a3d3e, { metalness: 0.6 })); busPole.position.set(6.2, 1.4, 10.5); scene.add(busPole);
  const busSign = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.9), [std(0xffffff, { map: busT }), std(0xffffff, { map: busT }), std(0x20262a), std(0x20262a), std(0x20262a), std(0x20262a)]); busSign.position.set(6.2, 2.55, 10.5); scene.add(busSign);
  for (const z of [6.4, 9.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), std(0x3a3d3e, { metalness: 0.6 })); leg.position.set(7.2, 1.25, z); scene.add(leg); }

  return { neon, neonLights, windowMats, backMats, lamps, mottLamps, rosaLight, rosaGlow, rosaWin, quik, tvWinM, carCols, porchLights };
}
