import * as THREE from 'three';
import { AudioEngine } from './audio.js?v=1792116146';
import { createStreet } from './street.js?v=1792116146';
import { createRestaurant } from './restaurant.js?v=1792116146';
import { createStore } from './store.js?v=1792116146';
import { createHouse } from './house.js?v=1792116146';
import { createGasStation } from './gasstation.js?v=1792116146';
import { createSewer } from './sewer.js?v=1792116146';
import { createPhone } from './phone.js?v=1792116146';
import { modelsReady } from './models.js?v=1792116146';

const $ = (id) => document.getElementById(id);
const PIX = 3; // render at 1/3 resolution, upscale with nearest-neighbour for the chunky pixel look

// ---------------- renderer + low-res post ----------------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('game').appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 500);
camera.rotation.order = 'YXZ';
const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType });

const post = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    tDiffuse: { value: rt.texture }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 },
    sat: { value: 0.45 }, exposure: { value: 1.0 }, contrast: { value: 1.18 }, flash: { value: 0 }, red: { value: 0 },
    tint: { value: new THREE.Vector3(0.9, 0.98, 0.96) }, lift: { value: new THREE.Vector3(0.0, 0.01, 0.012) }, levels: { value: 26 }, blackout: { value: 0 }, bright: { value: 1.05 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, sat, exposure, contrast, flash, red, levels, blackout, bright; uniform vec3 tint, lift;
    varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float ign(vec2 p){ return fract(52.9829189 * fract(0.06711056*p.x + 0.00583715*p.y)); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb * exposure;
      c = aces(c);
      c = pow(c, vec3(1.0/(2.2*bright)));
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, sat) * tint;
      c += lift * (1.0 - smoothstep(0.0, 0.5, l)); // tint the shadows
      c = (c - 0.5) * contrast + 0.5;
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 1.5;
      c += (hash(vUv * res + fract(time) * 91.7) - 0.5) * 0.085;
      c = floor(c * levels + ign(gl_FragCoord.xy)) / levels;
      c = mix(c, vec3(0.55, 0.02, 0.02) * (l + 0.3), red);
      c = mix(c, vec3(1.0), flash);
      c *= 1.0 - blackout;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

function resize() {
  const W = Math.max(200, Math.floor(innerWidth / PIX)), H = Math.max(120, Math.floor(innerHeight / PIX));
  renderer.setSize(W, H, false); rt.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  post.uniforms.res.value.set(W, H);
}
addEventListener('resize', resize); resize();

// ---------------- flashlight (camera-mounted) ----------------
const flash = new THREE.SpotLight(0xfff0d8, 0, 30, 0.42, 0.55, 1.2);
flash.position.set(0.22, -0.2, 0.05);
flash.target.position.set(0.05, -0.08, -1);
camera.add(flash); camera.add(flash.target);
flash.castShadow = true; flash.shadow.mapSize.set(512, 512);
flash.shadow.camera.near = 0.3; flash.shadow.camera.far = 32; flash.shadow.bias = -0.0004; flash.shadow.normalBias = 0.04;

// ---------------- state ----------------
const audio = new AudioEngine();
const keys = new Set();
// rebindable controls
const DEFAULT_BINDS = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', crouch: 'KeyC', flashlight: 'KeyF', interact: 'KeyE', breath: 'Space', map: 'Tab' };
const BIND_NAMES = { forward: 'Move forward', back: 'Move back', left: 'Move left', right: 'Move right', sprint: 'Sprint', crouch: 'Crouch', flashlight: 'Flashlight', interact: 'Interact / hide', breath: 'Hold breath', map: 'Store map' };
let BINDS = { ...DEFAULT_BINDS };
const OPTS = { subs: true, juanVoice: true };
try { Object.assign(OPTS, JSON.parse(localStorage.getItem('lr_opts') || '{}')); } catch (e) { }
const saveOpts = () => { try { localStorage.setItem('lr_opts', JSON.stringify(OPTS)); } catch (e) { } };
try { Object.assign(BINDS, JSON.parse(localStorage.getItem('lr_binds') || '{}')); } catch (e) { }
const held = (a) => keys.has(BINDS[a]);
const is = (e, a) => e.code === BINDS[a];
const P = {
  pos: new THREE.Vector3(), yaw: 0, pitch: 0, eye: 1.62, crouch: false, stamina: 1, exhausted: false,
  hidden: null, frozen: false, reading: false, flashlight: false, battery: 1, lens: 0,
  holdingBreath: false, breath: 1, bob: 0, stepAcc: 0, sprinting: false, speedNow: 0, lookLock: null,
  health: 1, food: 0.45, carrying: null, gy: 0,
};
let phoneMode = false;
let mode = 'title', paused = false, level = null, time = 0;
let shakeAmt = 0, shakeT = 0, flashV = 0, caughtT = 0, caughtRig = null, caughtShown = false;
let currentIt = null, caughtRoll = 0, caughtEye = 1.62, caughtYaw = 0;

// ---------------- UI ----------------
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
let sayChain = Promise.resolve(), sayToken = 0, subTimer = null;
function showSub(who, text, cls, dur) {
  if (!OPTS.subs) return;
  $('subs').innerHTML = who ? `<b class="${cls || ''}">${who}:</b> ${text}` : text;
  clearTimeout(subTimer); subTimer = setTimeout(() => { $('subs').innerHTML = ''; }, dur * 1000);
}
async function speak(l, token) {
  if (token !== sayToken) return;
  if (l.wait) await sleep(l.wait);
  if (token !== sayToken) return;
  const muteJuan = !OPTS.juanVoice && /^Juan/.test(l.who || '');
  const d = muteJuan ? 0 : await audio.playVo(l.id, { radio: l.radio, pos: l.pos, gain: l.gain });
  const dur = d > 0 ? d + 0.3 : 1.3 + l.text.length * 0.055;
  showSub(l.who, l.text, l.agent ? 'agent' : '', dur + 0.2);
  await sleep(dur);
}
const ui = {
  objective(t) { $('objText').textContent = t; $('objective').style.visibility = t ? 'visible' : 'hidden'; phone.objective(t); },
  toast(t, d = 2.2) { const e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(e._t); e._t = setTimeout(() => (e.style.opacity = 0), d * 1000); },
  clock(t) { $('clock').textContent = t; phone.state.gameClock = t.replace(/ [AP]M/, ''); },
  prompt(t, prog) { $('prompt').innerHTML = t ? `${t}${prog != null ? `<div class="bar"><i style="width:${(prog * 100) | 0}%"></i></div>` : ''}` : ''; },
  // queued dialogue
  say(lines) { const tok = sayToken; sayChain = sayChain.then(async () => { for (const l of lines) await speak(l, tok); }); return sayChain; },
  // immediate line (interrupts subtitle, not the queue)
  bark(l) { if (!OPTS.juanVoice && /^Juan/.test(l.who || '')) { showSub(l.who, l.text, '', 1.2 + l.text.length * 0.05); return; } audio.playVo(l.id, { radio: l.radio, pos: l.pos, gain: l.gain }).then((d) => showSub(l.who, l.text, l.agent ? 'agent' : '', (d || 1.2 + l.text.length * 0.05) + 0.3)); },
  cancelSay() { sayToken++; sayChain = Promise.resolve(); $('subs').innerHTML = ''; },
  cards(lines) {
    return new Promise((resolve) => {
      const prevMode = mode; mode = 'cards'; document.exitPointerLock?.();
      const el = $('cards'), tx = $('cardText'); el.classList.add('on');
      let i = 0, typing = null;
      const show = () => {
        const s = lines[i]; let k = 0; tx.textContent = ''; clearInterval(typing);
        typing = setInterval(() => { k++; tx.textContent = s.slice(0, k); if (k >= s.length) { clearInterval(typing); typing = null; } }, 28);
      };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; tx.textContent = lines[i]; return; }
        i++; if (i >= lines.length) { el.classList.remove('on'); el.onclick = null; removeEventListener('keydown', kd); mode = prevMode === 'cards' ? 'play' : prevMode; resolve(); return; }
        show();
      };
      const kd = (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') next(); };
      el.onclick = next; addEventListener('keydown', kd); show();
    });
  },
  note(html, cls = '') {
    return new Promise((resolve) => {
      const n = $('note'); n.className = 'on ' + cls; n.innerHTML = html + '<div class="close">PRESS E TO CLOSE</div>';
      P.reading = true; ui._noteClose = () => { n.className = ''; P.reading = false; ui._noteClose = null; resolve(); };
    });
  },
  fade(v, dur = 1) {
    const f = $('fade'); f.style.transition = `opacity ${dur}s linear`; f.style.opacity = v; return sleep(dur);
  },
  flash(v) { flashV = Math.max(flashV, v); },
  shake(a, d = 0.5) { shakeAmt = Math.max(shakeAmt, a); shakeT = Math.max(shakeT, d); },
  bigHint(t) { const e = $('bigHint'); e.innerHTML = t; e.style.opacity = t ? 1 : 0; },
  hud(on) { $('hud').style.display = on ? 'block' : 'none'; },
  post: post.uniforms,
};

// ---------------- game API exposed to levels ----------------
const game = {
  retry: null,
  hide(spot) {
    P.hidden = spot; P.pos.set(spot.ix, 0, spot.iz); P.yaw = spot.yaw; P.pitch = 0; P.crouch = false; if (spot.eye) P.eye = spot.eye;
    $('hideView').className = 'layer on ' + spot.kind; if (spot.kind === 'bush') audio.rustle(spot.pos); else audio.creak(spot.pos); level.onHide?.(spot);
    $('breathM').style.display = 'block';
  },
  unhide() {
    const s = P.hidden; if (!s) return;
    P.hidden = null; P.pos.set(s.ex, 0, s.ez); $('hideView').className = 'layer'; if (s.kind === 'bush') audio.rustle(s.pos); else audio.creak(s.pos); level.onUnhide?.(s);
    $('breathM').style.display = 'none'; P.holdingBreath = false;
  },
  caught(rig, sub) {
    if (mode !== 'play') return;
    if (P.hidden) { $('hideView').className = 'layer'; P.hidden = null; }
    phone.close();
    mode = 'caught'; caughtT = 0; caughtRig = rig; caughtShown = false;
    ui.cancelSay(); ui.prompt(''); ui.bigHint('');
    audio.hit(1.2); audio.stinger(0.9); ui.shake(0.16, 0.5); flashV = 0.95;
    setTimeout(() => { audio.muffle(true, 0.05); audio.impact(); audio.tinnitus(); }, 550);
    caughtRoll = 0; caughtEye = P.eye; caughtYaw = P.yaw;
    $('caughtTitle').textContent = 'DETAINED';
    $('caughtSub').textContent = sub || 'Luz waited up all night.';
    level.onCaught?.();
  },
  // hunger: you pass out on the floor, someone finds you
  collapse(why) {
    if (mode !== 'play') return;
    if (P.hidden) { $('hideView').className = 'layer'; P.hidden = null; }
    mode = 'cutscene'; ui.cancelSay(); ui.prompt(''); ui.bigHint('');
    audio.impact(); audio.muffle(true, 0.4); audio.tinnitus();
    $('caughtTitle').textContent = 'COLLAPSED';
    $('caughtSub').textContent = why || 'He hadn\'t eaten in two days. Eat when you can.';
    ui.fade(1, 2.2).then(() => { ui.hud(false); document.exitPointerLock?.(); $('caught').classList.add('on'); });
  },
  // vitals carried between chapters
  eat(amount = 1) { P.food = Math.min(1, P.food + amount); P.health = Math.min(1, P.health + amount * 0.25); hungerWarned = false; audio.pickup(); },
  async win(lines) {
    mode = 'cutscene'; ui.cancelSay();
    await ui.fade(1, 2.5);
    ui.hud(false); audio.stopAll();
    await ui.cards(lines);
    audio.stopAll(); toTitle();
  },
};

// ---------------- levels ----------------
const phone = createPhone(audio);
const G = { THREE, renderer, camera, audio, ui, P, game, keys, flash, phone };
G.loadLevel = (m) => loadLevel(m);
function disposeScene(s) {
  s.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) for (const m of [].concat(o.material)) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }
  });
}
// Stacked ground surfaces (lots, roads, sidewalks, aprons, curbs, rugs) sit a centimetre or two apart, which
// flickers at a distance. Push each one's depth by its height so the higher layer always wins, cleanly.
// movement that also respects something the level adds to your body (a cart you're pushing): you slide along walls with it
function moveWith(pos, dx, dz, r, L) {
  const bl = (x, z) => L.grid.blocked(x, z, r) || L.extraBlocked(x, z);
  if (bl(pos.x, pos.z)) { if (!L.grid.blocked(pos.x + dx, pos.z + dz, r)) { pos.x += dx; pos.z += dz; } return; }
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.1) || 1, sx = dx / steps, sz = dz / steps;
  for (let k = 0; k < steps; k++) { if (!bl(pos.x + sx, pos.z)) pos.x += sx; if (!bl(pos.x, pos.z + sz)) pos.z += sz; }
}
function layerGround(scene) {
  const bb = new THREE.Box3(), seen = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse((m) => {
    if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || !m.material || Array.isArray(m.material) || m.material.isShaderMaterial) return;
    bb.setFromObject(m);
    if (bb.max.y - bb.min.y > 0.22 || bb.max.y > 0.3 || bb.max.y < -0.3) return;
    if ((bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) < 0.4) return;
    const units = -Math.round((bb.max.y + 0.3) * 300);
    let mat = m.material;
    if (seen.has(mat) && seen.get(mat) !== units) { mat = mat.clone(); m.material = mat; }
    seen.set(mat, units);
    mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = units; mat.needsUpdate = true;
  });
}
function loadLevel(make) {
  if (level) { level.dispose?.(); camera.parent?.remove(camera); disposeScene(level.scene); }
  audio.stopAll(); audio.muffle(false, 0.05); ui.cancelSay(); phone.close();
  Object.assign(P, { lookLock: null, frozen: false, reading: false, hidden: null, crouch: false, stamina: 1, exhausted: false, breath: 1, pitch: 0, eye: 1.62 });
  $('hideView').className = 'layer'; $('breathM').style.display = 'none';
  P.carrying = null; P.gy = 0; hungerWarned = false; game.retry = null;
  ui.post.exposure.value = 0.8; ui.post.sat.value = 0.55; ui.post.contrast.value = 1.16; ui.post.tint.value.set(0.9, 0.98, 0.96); ui.post.lift.value.set(0.0, 0.01, 0.012); ui.post.levels.value = 28;
  level = make(G);
  layerGround(level.scene);
  level.scene.add(camera);
  mode = 'play'; paused = false;
  ui.hud(true); ui.fade(0, 1.5);
  lockPointer();
}
function toTitle() {
  refreshContinue();
  if (level) { level.dispose?.(); camera.parent?.remove(camera); disposeScene(level.scene); level = null; }
  audio.stopAll(); audio.muffle(false, 0.05); ui.cancelSay(); ui.hud(false);
  mode = 'title'; ['caught', 'pause', 'cards'].forEach((id) => $(id).classList.remove('on'));
  $('title').classList.add('on'); $('fade').style.opacity = 1;
  document.exitPointerLock?.();
}

// ---------------- input ----------------
function lockPointer() { const c = renderer.domElement; if (document.pointerLockElement !== c) c.requestPointerLock?.(); }
renderer.domElement.addEventListener('click', () => { if (mode === 'play') lockPointer(); });
renderer.domElement.addEventListener('mousedown', () => { if (mode === 'play' && !paused) level?.onKey?.('Mouse', BINDS); });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && mode === 'play' && !P.reading && !phone.isOpen) { paused = true; $('pause').classList.add('on'); }
  if (!locked && phone.isOpen) { /* phone in hand: mouse is free to tap it */ }
  if (locked) { paused = false; $('pause').classList.remove('on'); }
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement || mode !== 'play' || paused || P.lookLock) return;
  P.yaw -= e.movementX * 0.0021; P.pitch -= e.movementY * 0.0021;
  P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch));
  if (P.hidden) {
    let d = P.yaw - P.hidden.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    P.yaw = P.hidden.yaw + Math.max(-0.7, Math.min(0.7, d));
    P.pitch = Math.max(-0.35, Math.min(0.35, P.pitch));
  }
});
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && phone.isOpen) { phone.close(); lockPointer(); return; }
  if (e.code === 'Tab' || is(e, 'map')) e.preventDefault();
  if (rebinding) return;
  if (e.repeat) return;
  keys.add(e.code);
  if (mode !== 'play' || paused) return;
  if (level?.onKey?.(e.code, BINDS)) return;
  if (is(e, 'interact')) {
    if (ui._noteClose) { ui._noteClose(); return; }
    if (P.hidden) { game.unhide(); return; }
    if (currentIt && !currentIt.hold && !P.frozen) currentIt.action();
  }
  if (is(e, 'flashlight') && level?.allowFlashlight && !P.hidden) {
    if (P.battery <= 0) { audio.click(); ui.toast('BATTERY DEAD'); return; }
    P.flashlight = !P.flashlight; audio.click(); if ($('bigHint').dataset.k === 'F') { ui.bigHint(''); $('bigHint').dataset.k = ''; }
  }
  if (is(e, 'crouch')) P.crouch = !P.crouch;
  if (is(e, 'map') && level?.drawMap && !$('map').classList.contains('on')) { const m = $('map'), draw = () => level?.drawMap && level.drawMap(m.getContext('2d'), m.width, m.height); draw(); m.classList.add('on'); clearInterval(m._t); m._t = setInterval(draw, 200); }
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (is(e, 'map')) { $('map').classList.remove('on'); clearInterval($('map')._t); } });
addEventListener('blur', () => keys.clear());

// ---------------- chapters ----------------
// food: where the bar starts when a chapter is opened from the menu
const CHAPTERS = [
  { key: 'night1', name: 'NIGHT 1 — The Walk Home', hud: 'NIGHT', num: 1, food: 0.45, cards: ['NIGHT 1\nThe Walk Home\n11:40 PM'], make: createStreet },
  { key: 'rosa', name: 'NIGHT 1 — Doña Rosa\'s House', hud: 'NIGHT', num: 1, food: 0.2, cards: ['DOÑA ROSA\'S HOUSE\nMott Street\n12:16 AM'], make: createHouse },
  { key: 'shift', name: 'DAY 2 — The Shift', hud: 'DAY', num: 2, food: 0.8, cards: ['DAY 2\nThe Shift\nHammerline Depot #0417 — 7:02 AM'], make: (g) => createStore(g, 'work') },
  { key: 'lunch', name: 'DAY 2 — Lunch Break', hud: 'DAY', num: 2, food: 0.25, cards: ['LUNCH BREAK\n5:14 PM'], make: createGasStation },
  { key: 'close', name: 'DAY 2 — Closing Time', hud: 'NIGHT', num: 2, food: 0.7, cards: ['CLOSING TIME\nHammerline Depot #0417 — 9:52 PM'], make: (g) => createStore(g, 'close') },
  { key: 'sewer', name: 'NIGHT 2 — Under the City', hud: 'NIGHT', num: 2, food: 0.5, cards: ['UNDER THE CITY\n10:47 PM'], make: createSewer },
];
let chapterI = 0;
function loadSave() { try { return JSON.parse(localStorage.getItem('lr_save') || 'null'); } catch (e) { return null; } }
function writeSave(o) { try { localStorage.setItem('lr_save', JSON.stringify(o)); } catch (e) { } refreshContinue(); }
function refreshContinue() { const s = loadSave(); $('continueBtn').style.display = s && CHAPTERS[s.chapter] ? '' : 'none'; }
// fromMenu: the chapter was picked on the title screen, so the food bar starts at that chapter's default
async function startChapter(i, fromMenu) {
  chapterI = i;
  const ch = CHAPTERS[i];
  if (fromMenu) { P.food = ch.food; P.health = 1; }
  writeSave({ chapter: i, food: P.food, health: P.health, done: false });
  $('nightLbl').textContent = ch.hud; $('nightNum').textContent = ch.num;
  await ui.cards(ch.cards);
  loadLevel(ch.make);
}
game.nextChapter = async () => {
  mode = 'cutscene'; ui.cancelSay();
  await ui.fade(1, 1.6); ui.hud(false); audio.stopAll();
  if (chapterI + 1 < CHAPTERS.length) startChapter(chapterI + 1);
};
// a save point inside a chapter (the sewer exit): CONTINUE comes back to the ending
game.saveHere = () => { writeSave({ chapter: chapterI, food: P.food, health: P.health, done: true }); ui.toast('GAME SAVED', 3); };
game.retryChapter = () => G.loadLevel(CHAPTERS[chapterI].make);
async function boot() { audio.init(); try { const v = parseFloat(localStorage.getItem('lr_vol')); if (isFinite(v)) audio.master.gain.value = v; } catch (e) { } $('title').classList.remove('on'); $('chapters').classList.remove('on'); await ensureBrightness(); await modelsReady; }
$('continueBtn').onclick = async () => {
  const s = loadSave(); if (!s) return;
  await boot();
  P.food = s.food ?? CHAPTERS[s.chapter].food; P.health = s.health ?? 1;
  if (s.done) { $('fade').style.opacity = 1; await ui.cards(SEWER_END); toTitle(); return; }
  startChapter(s.chapter);
};
const SEWER_END = [
  'Juan came up out of the street at 1:40 in the morning, a mile from the store, soaked to the knees and shaking.',
  'He walked to Soto Street with his hood up. He didn\'t look at any car twice.',
  'DAY 2 SURVIVED.\n\nDAY 3 — coming next.',
];
game.sewerEnd = () => game.win(SEWER_END);
$('startBtn').onclick = async () => {
  await boot();
  P.food = CHAPTERS[0].food; P.health = 1;
  await ui.cards([
    'Los Angeles.\nFourteen years ago, Juan Reyes crossed the desert with a backpack and his cousin\'s phone number.',
    'He built the apartments you live in.\nHe poured the sidewalks you walk on.',
    'His daughter Luz is nine. She was born here.\nHe was not.',
  ]);
  startChapter(0);
};
$('storeBtn').onclick = () => {
  const list = $('chapterList'); list.innerHTML = '';
  const unlocked = CHAPTERS.length; // all chapters open
  CHAPTERS.forEach((ch, i) => {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = i <= unlocked ? ch.name : 'LOCKED'; b.disabled = i > unlocked; b.style.opacity = i > unlocked ? 0.35 : 1;
    b.onclick = async () => { await boot(); startChapter(i, true); };
    list.appendChild(b);
  });
  $('chapters').classList.add('on');
};
$('chapBack').onclick = () => $('chapters').classList.remove('on');

// ---------------- brightness calibration ----------------
function loadBright() { try { const v = parseFloat(localStorage.getItem('lr_bright')); return isFinite(v) ? v : null; } catch (e) { return null; } }
function saveBright(v) { try { localStorage.setItem('lr_bright', String(v)); } catch (e) { } }
post.uniforms.bright.value = loadBright() ?? 1.05;
function drawBrightPreview() {
  const c = $('brightCanvas'), x = c.getContext('2d'), b = post.uniforms.bright.value;
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  [0.004, 0.015, 0.05].forEach((lin, i) => {
    let v = Math.pow(lin, 1 / (2.2 * b)); v = Math.max(0, Math.min(1, (v - 0.5) * 1.18 + 0.5));
    const g = Math.round(v * 255); x.fillStyle = `rgb(${g},${g},${g})`;
    const cx = 90 + i * 170, cy = 90;
    x.beginPath(); x.moveTo(cx, cy - 55); x.lineTo(cx + 48, cy + 40); x.lineTo(cx - 48, cy + 40); x.closePath(); x.fill();
  });
}
function openBrightness() {
  return new Promise((resolve) => {
    const prevMode = mode; if (mode === 'play') { paused = true; }
    $('bright').classList.add('on'); const sl = $('brightSlider'); sl.value = post.uniforms.bright.value; drawBrightPreview();
    sl.oninput = () => { post.uniforms.bright.value = parseFloat(sl.value); drawBrightPreview(); };
    $('brightOk').onclick = () => { saveBright(post.uniforms.bright.value); $('bright').classList.remove('on'); resolve(); };
  });
}
async function ensureBrightness() { if (loadBright() == null) await openBrightness(); }
function keyName(code) { return (code || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Left', '').replace('Right', ' R').replace('Space', 'SPACE').replace('Arrow', '').toUpperCase(); }
let rebinding = null;
function drawBinds() {
  const list = $('bindList'); list.innerHTML = '';
  for (const k of Object.keys(DEFAULT_BINDS)) {
    const row = document.createElement('div'); row.className = 'bindRow';
    row.innerHTML = `<span>${BIND_NAMES[k]}</span><button class="btn bindBtn">${rebinding === k ? 'PRESS A KEY' : keyName(BINDS[k])}</button>`;
    row.querySelector('button').onclick = () => { rebinding = k; drawBinds(); };
    list.appendChild(row);
  }
}
addEventListener('keydown', (e) => {
  if (!rebinding) return;
  e.preventDefault(); e.stopPropagation();
  if (e.code !== 'Escape') { BINDS[rebinding] = e.code; try { localStorage.setItem('lr_binds', JSON.stringify(BINDS)); } catch (er) { } }
  rebinding = null; drawBinds();
}, true);
function drawToggles() { $('optSubs').textContent = 'SUBTITLES: ' + (OPTS.subs ? 'ON' : 'OFF'); $('optJuan').textContent = 'JUAN\'S VOICE: ' + (OPTS.juanVoice ? 'ON' : 'OFF'); }
function openSettings() {
  $('settings').classList.add('on'); drawBinds(); drawToggles();
  $('volSlider').value = audio.master ? audio.master.gain.value : 0.9;
}
$('settingsBtn').onclick = () => { openSettings(); };
$('pauseSettingsBtn').onclick = () => { $('pause').classList.remove('on'); openSettings(); $('settings').dataset.fromPause = '1'; };
$('setBack').onclick = () => { rebinding = null; $('settings').classList.remove('on'); if ($('settings').dataset.fromPause) { $('settings').dataset.fromPause = ''; $('pause').classList.add('on'); } };
$('setBright').onclick = async () => { $('settings').classList.remove('on'); await openBrightness(); openSettings(); };
$('optSubs').onclick = () => { OPTS.subs = !OPTS.subs; saveOpts(); drawToggles(); };
$('optJuan').onclick = () => { OPTS.juanVoice = !OPTS.juanVoice; saveOpts(); drawToggles(); };
$('setReset').onclick = () => { BINDS = { ...DEFAULT_BINDS }; try { localStorage.removeItem('lr_binds'); } catch (e) { } drawBinds(); };
$('volSlider').oninput = (e) => { audio.init(); audio.master.gain.value = parseFloat(e.target.value); try { localStorage.setItem('lr_vol', e.target.value); } catch (er) { } };

$('retryBtn').onclick = () => { $('caught').classList.remove('on'); mode = 'play'; if (P.health <= 0 || P.food <= 0) { P.health = 1; P.food = Math.max(P.food, 0.35); } audio.muffle(false, 0.2); (game.retry || game.retryChapter)(); };
$('menuBtn').onclick = toTitle; $('pauseMenuBtn').onclick = toTitle;
$('resumeBtn').onclick = () => { $('pause').classList.remove('on'); lockPointer(); };

// ---------------- player ----------------
const tmp = new THREE.Vector3();
function updatePlayer(dt) {
  const L = level;
  if (P.hidden) {
    P.holdingBreath = held('breath') && P.breath > 0;
    if (P.holdingBreath) { P.breath -= dt / 7; if (P.breath <= 0) { P.breath = 0; P.holdingBreath = false; audio.gasp(); L.onGasp?.(); } }
    else P.breath = Math.min(1, P.breath + dt / 3.5);
    P.speedNow = 0; return;
  }
  P.breath = Math.min(1, P.breath + dt / 3.5);
  const eyeT = P.crouch ? 1.0 : 1.62; P.eye += (eyeT - P.eye) * Math.min(1, dt * 10);
  if (P.frozen || P.reading) { P.speedNow = 0; P.sprinting = false; return; }
  let f = 0, s = 0;
  if (held('forward') || keys.has('ArrowUp')) f += 1;
  if (held('back') || keys.has('ArrowDown')) f -= 1;
  if (held('right') || keys.has('ArrowRight')) s += 1;
  if (held('left') || keys.has('ArrowLeft')) s -= 1;
  const moving = f || s;
  const wantSprint = (L.chaseRun || held('sprint') || (BINDS.sprint === 'ShiftLeft' && keys.has('ShiftRight'))) && moving && f >= 0 && L.allowSprint !== false && P.carrying !== 'crate' && P.carrying !== 'cart';
  if (wantSprint && P.crouch) P.crouch = false;
  P.sprinting = wantSprint && !P.exhausted && P.stamina > 0;
  if (P.sprinting && !L.chaseRun) { P.stamina -= dt / 7.5; if (P.stamina <= 0) { P.stamina = 0; P.exhausted = true; } }
  else { P.stamina = Math.min(1, P.stamina + dt / (P.exhausted ? 8 : 4.5) * (P.food < 0.15 ? 0.6 : 1)); if (P.exhausted && P.stamina > 0.4) P.exhausted = false; }
  const speed = (P.crouch ? 1.6 : P.sprinting ? 6.2 : 3.1) * (P.exhausted ? 0.8 : 1) * (L.speedMul ?? 1) * (P.carrying === 'crate' ? 0.9 : P.carrying === 'cart' ? 0.85 : 1); // a bag of trash doesn't slow you down
  const len = Math.hypot(f, s) || 1;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const dx = ((fx * f + rx * s) / len) * speed * dt, dz = ((fz * f + rz * s) / len) * speed * dt;
  const ox = P.pos.x, oz = P.pos.z;
  if (moving) { if (L.extraBlocked) moveWith(P.pos, dx, dz, 0.3, L); else L.grid.move(P.pos, dx, dz, 0.3); }
  const moved = Math.hypot(P.pos.x - ox, P.pos.z - oz);
  P.speedNow = moved / dt;
  P.bob += moved * (P.sprinting ? 2.4 : 2.9);
  P.stepAcc += moved;
  const kind = P.sprinting ? 'sprint' : P.crouch ? 'crouch' : 'walk';
  const stride = P.sprinting ? 1.0 : P.crouch ? 0.55 : 0.75;
  if (P.stepAcc > stride) {
    P.stepAcc = 0; audio.step(kind, L.surface);
    L.onNoise?.(kind === 'sprint' ? 13 : kind === 'walk' ? 4.5 : 0, P.pos.x, P.pos.z, 'step');
  }
}

function updateInteract(dt) {
  currentIt = null;
  if (P.hidden) {
    ui.prompt(P.hidden.agentNear ? `HOLD ${keyName(BINDS.breath)} — HOLD YOUR BREATH` : `${keyName(BINDS.interact)} — LEAVE`);
    return;
  }
  if (P.frozen || P.reading) { ui.prompt(''); return; }
  let best = null, bd = 1e9;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const it of level.interactables) {
    if (it.enabled && !it.enabled()) continue;
    const dx = it.x - P.pos.x, dz = it.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > (it.r || 1.7)) continue;
    if (d > 0.5 && (dx * fx + dz * fz) / d < 0.3) continue;
    if (d < bd) { bd = d; best = it; }
  }
  currentIt = best;
  if (!best) { ui.prompt(''); return; }
  if (best.hold) {
    if (held('interact')) { best.progress = Math.min(best.hold, (best.progress || 0) + dt); best.onHold?.(dt); if (best.progress >= best.hold) { best.action(); } }
    else best.onRelease?.();
    ui.prompt(`HOLD ${keyName(BINDS.interact)} — ` + best.label, (best.progress || 0) / best.hold);
  } else ui.prompt(`${keyName(BINDS.interact)} — ` + best.label);
}

let hungerWarned = false;
function updateVitals(dt) {
  const on = level && level.vitals !== false;
  $('vitals').style.display = on ? 'flex' : 'none';
  if (!on) return;
  if (mode === 'play' && !paused) {
    P.food = Math.max(0, P.food - dt / 600 * (P.sprinting ? 2.2 : 1) * (level.hunger ?? 1));
    if (P.food <= 0) P.health = Math.max(0, P.health - dt / 90);
    else if (P.food > 0.4) P.health = Math.min(1, P.health + dt / 240);
    if (P.food < 0.2 && !hungerWarned) { hungerWarned = true; ui.toast('YOU\'RE HUNGRY — EAT SOMETHING', 3); }
    if (P.health <= 0) game.collapse();
  }
  const ring = (id, v) => { const el = $(id); el.querySelector('.arc').style.strokeDashoffset = (125.7 * (1 - v)).toFixed(1); el.classList.toggle('low', v < 0.25); };
  ring('vHealth', P.health); ring('vFood', P.food);
}

function updateFlashlight(dt) {
  const on = P.flashlight && level?.allowFlashlight && !P.hidden && P.battery > 0;
  if (on && !level.noDrain) {
    P.battery = Math.max(0, P.battery - dt / (P.lens ? 140 : 180));
    if (P.battery <= 0) { P.flashlight = false; audio.click(); audio.hit(0.5); ui.toast('BATTERY DEAD'); }
  }
  let k = on ? 1 : 0;
  if (on && P.battery < 0.18 && Math.random() < 0.06) k = Math.random() * 0.3; // dying flicker
  if (on && level.flicker) k *= level.flicker;
  flash.intensity = k * (P.lens ? 42 : 30);
  flash.angle = P.lens ? 0.56 : 0.42; flash.distance = P.lens ? 42 : 30;
  $('batBar').style.width = (P.battery * 100) + '%'; $('batPct').textContent = Math.ceil(P.battery * 100) + '%';
  $('batBar').style.background = P.battery < 0.2 ? '#b3261e' : '';
  $('staBar').style.width = (P.stamina * 100) + '%';
  $('staBar').style.background = P.exhausted ? '#b3261e' : '';
  $('breathBar').style.width = (P.breath * 100) + '%';
}

function updateCaught(dt) {
  // realistic takedown: shout, you're tackled to the wet floor, a light in your face, cuffs
  caughtT += dt;
  const g = caughtRig.group;
  const fx = -Math.sin(caughtYaw), fz = -Math.cos(caughtYaw);
  if (caughtT < 0.55) {
    // the lunge: his masked face fills the screen
    const d = Math.max(0.38, 1.4 - caughtT * 4);
    g.position.set(P.pos.x + fx * d, P.eye - 1.72, P.pos.z + fz * d);
    g.rotation.set(0, Math.atan2(-fx, -fz), 0);
    P.pitch += (0.04 - P.pitch) * Math.min(1, dt * 14);
    flashV = Math.max(flashV, 0.55 + Math.random() * 0.3);
  } else {
    const k = Math.min(1, (caughtT - 0.55) / 0.45);
    P.eye = caughtEye + (0.28 - caughtEye) * (k * k);
    caughtRoll = -1.15 * k;
    P.pitch += (0.55 - P.pitch) * Math.min(1, dt * 6);
    g.position.set(P.pos.x + fx * 1.0, 0, P.pos.z + fz * 1.0);
    g.rotation.set(0.35, Math.atan2(-fx, -fz), 0); // leaning over you
  }
  if (caughtRig.armL) { caughtRig.armL.rotation.x = -1.3; caughtRig.armR.rotation.x = -1.0; }
  if (caughtT > 1.0 && caughtT - dt <= 1.0) { audio.impact(); ui.shake(0.06, 0.3); }
  if (caughtT > 1.0 && caughtT - dt <= 1.0) audio.heartbeat(0.9);
  if (caughtT > 2.2 && caughtT - dt <= 2.2) audio.heartbeat(0.7);
  flashV = Math.max(flashV, caughtT > 0.5 ? 0.25 + Math.sin(caughtT * 9) * 0.08 : 0);
  if (caughtT > 1.2 && caughtT - dt <= 1.2) { audio.ziptie(P.pos); }
  if (caughtT > 1.6 && caughtT - dt <= 1.6) { audio.ziptie(P.pos); }
  if (caughtT > 2.0 && caughtT - dt <= 2.0) { audio.radio(null, 0.6); showSub('', '<i>(muffled, far away)</i> ...got one.', '', 2.2); }
  if (caughtT > 3.2 && !caughtShown) {
    caughtShown = true; $('fade').style.transition = 'opacity 0.6s'; $('fade').style.opacity = 1;
    ui.hud(false); document.exitPointerLock?.();
    setTimeout(() => $('caught').classList.add('on'), 900);
  }
}

// ---------------- main loop ----------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05) * (window.__ts ?? 1); // __ts: debug slow-motion
  time += dt;
  post.uniforms.time.value = time;
  if (!level) return;
  if (mode === 'play' && !paused) { updatePlayer(dt); level.update(dt); updateInteract(dt); }
  else if (mode === 'cutscene') level.update(dt);
  else if (mode === 'caught') { level.update(dt * 0.15); updateCaught(dt); }
  updateFlashlight(dt); updateVitals(dt);
  // scripted camera control (forced looks)
  if (P.lookLock && mode === 'play') {
    let dy = P.lookLock.yaw - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    P.yaw += dy * Math.min(1, dt * P.lookLock.k); P.pitch += (P.lookLock.pitch - P.pitch) * Math.min(1, dt * P.lookLock.k);
  }
  // camera (levels with uneven floors report a ground height: the sewer channel)
  { const gy = level.groundAt ? level.groundAt(P.pos.x, P.pos.z) : 0; P.gy += (gy - P.gy) * Math.min(1, dt * 8); }
  shakeT = Math.max(0, shakeT - dt); const sk = shakeT > 0 ? shakeAmt : 0; if (!shakeT) shakeAmt = 0;
  const bobY = P.speedNow > 0.1 ? Math.sin(P.bob) * (P.sprinting ? 0.055 : 0.03) : 0;
  const bobX = P.speedNow > 0.1 ? Math.cos(P.bob * 0.5) * (P.sprinting ? 0.03 : 0.015) : 0;
  camera.position.set(P.pos.x + bobX * Math.cos(P.yaw) + (Math.random() - 0.5) * sk, P.eye + P.gy + bobY + (Math.random() - 0.5) * sk, P.pos.z - bobX * Math.sin(P.yaw));
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * sk * 0.5, P.yaw + (Math.random() - 0.5) * sk * 0.5, (mode === 'caught' ? caughtRoll : 0) + (P.sprinting ? Math.sin(P.bob * 0.5) * 0.012 : 0));
  flashV = Math.max(0, flashV - dt * 2.2); post.uniforms.flash.value = flashV;
  audio.setListener(camera);
  const dg = level.danger ? level.danger() : {};
  audio.update(dt, { chase: dg.chase && mode === 'play', heart: mode === 'play' ? dg.heart || 0 : 0, breath: P.exhausted ? 1 : Math.max(0, 0.6 - P.stamina) * (P.sprinting ? 1 : 0.5) });
  $('alert').style.opacity = mode === 'play' ? Math.min(0.85, dg.alert || 0) : 0;
  renderer.setRenderTarget(rt); renderer.render(level.scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
frame();

// animated static on the title screen
(function titleNoise() {
  const c = $('titleBg'), x = c.getContext('2d'); const img = x.createImageData(320, 180);
  const tick = () => {
    if (mode === 'title') {
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 40; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0);
      // rolling bright band, like a dying VHS tape
      const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
      $('recTime').textContent = `OCT 14 2026  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      $('recDot').style.opacity = Math.floor(performance.now() / 600) % 2 ? 0 : 1;
    }
    setTimeout(tick, 80);
  };
  tick();
})();

// debug hooks (used for testing / screenshots)
refreshContinue();
// test helpers: walk to a spot and press/hold E on the nearest live interactable; wait for an objective
const dbgE = async (x, z, hold = 0) => { P.pos.set(x, 0, z); await sleep(0.15); const it = level.interactables.filter((i) => !i.enabled || i.enabled()).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0]; if (!it) return 'none'; P.yaw = Math.atan2(-(it.x - x), -(it.z - z)); await sleep(0.15); const pr = $('prompt').textContent; dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); await sleep(hold + 0.1); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); return pr; };
const dbgWait = async (pre, ms = 60000) => { const t0 = performance.now(); while (!$('objText').textContent.startsWith(pre) && performance.now() - t0 < ms) await sleep(0.25); return $('objText').textContent + ' (' + ((performance.now() - t0) / 1000 | 0) + 's)'; };
window.__dbg = { E: dbgE, waitObj: dbgWait, P, ui, audio, phone, game, get level() { return level; }, chapter: (i) => { $('title').classList.remove('on'); boot().then(() => startChapter(i, true)); }, startStreet: (o) => { $('title').classList.remove('on'); loadLevel((g) => createStreet(g, o)); }, startStore: (c = 0) => { $('title').classList.remove('on'); loadLevel((g) => createStore(g, c)); }, setMode: (m) => { mode = m; paused = false; }, startRest: () => { $('title').classList.remove('on'); loadLevel((g) => createRestaurant(g)); }, get mode() { return mode; }, get paused() { return paused; } };
