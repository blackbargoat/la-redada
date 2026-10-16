// NIGHT 1 — Doña Rosa's house on Mott St. The power is out. He tells her, he eats, he sleeps in Santiago's room.
import * as THREE from 'three';
import { Grid } from './grid.js?v=1792117111';
import { tex, textTex, rng } from './textures.js?v=1792117111';
import { makeCharacter, animateWalk, makeGlow, std } from './models.js?v=1792117111';

const VO = {
  r1: { id: 'h_r1', who: 'Doña Rosa', text: '¡Juan! Ay, gracias a Dios. The lights went out on the whole street, I heard the sirens... ¿Y Santiago? Where\'s my son?' },
  j1: { id: 'h_j1', who: 'Juan', text: 'Doña Rosa... please. Sit down.' },
  r2: { id: 'h_r2', who: 'Doña Rosa', text: 'No. Don\'t tell me sit down. Tell me.' },
  j2: { id: 'h_j2', who: 'Juan', text: 'They were waiting for us on Whittier. A car with no plates. We ran. He was right behind me, and then... they shot. I turned around and he was on the ground.' },
  r3: { id: 'h_r3', who: 'Doña Rosa', text: 'No... no, no, no. Mi niño. Is he alive? Juan. Is he alive?' },
  j3: { id: 'h_j3', who: 'Juan', text: 'I don\'t know. I didn\'t stop. They were right behind me. Perdóneme, Doña Rosa. I didn\'t stop.' },
  r4: { id: 'h_r4', who: 'Doña Rosa', text: '...Tomorrow I go to the church. Padre Tomás knows a lawyer. They have to tell us where they took him. They have to.' },
  r5: { id: 'h_r5', who: 'Doña Rosa', text: 'Sit. Eat something. You\'re shaking. He would never forgive me if I let you go hungry.' },
  r6: { id: 'h_r6', who: 'Doña Rosa', text: 'He was supposed to bring tortillas. Every time he says he won\'t, and every time he does.' },
  j4: { id: 'h_j4', who: 'Juan', text: 'On the phone... he told me to tell you he loves you. That\'s the last thing he said. He loves you.' },
  r7: { id: 'h_r7', who: 'Doña Rosa', text: '...You stay here tonight. They\'re still out there. Sleep in his room.' },
  j5: { id: 'h_j5', who: 'Juan', text: 'I have work at seven. If I don\'t show up, Dale gives my hours to somebody else.' },
  r8: { id: 'h_r8', who: 'Doña Rosa', text: 'Then sleep, mijo. Go. I\'ll wake you.' },
};
export const HOUSE_VO = Object.values(VO).map((l) => l.id);

export function createHouse(G) {
  const { audio, ui, P, game } = G;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020304);
  scene.fog = new THREE.FogExp2(0x05070a, 0.05);
  const grid = new Grid(14, 12, 0, 0);
  const L = { scene, grid, interactables: [], allowFlashlight: true, noDrain: true, surface: 'concrete', allowSprint: false, hunger: 0.5 };
  const r = rng(515);
  ui.post.exposure.value = 0.95; ui.post.sat.value = 0.6; ui.post.tint.value.set(1.0, 0.96, 0.9); ui.post.lift.value.set(0.004, 0.006, 0.01);

  // ---------------- materials ----------------
  const canvasT = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const tileT = canvasT(128, 128, (x) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 0.85 + r() * 0.15; x.fillStyle = `rgb(${(196 * v) | 0},${(178 * v) | 0},${(150 * v) | 0})`; x.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); } x.fillStyle = '#5a5044'; for (let k = 0; k <= 2; k++) { x.fillRect(k * 64 - 1, 0, 2, 128); x.fillRect(0, k * 64 - 1, 128, 2); } }, [14, 12]);
  const floorM = std(0xffffff, { map: tileT, roughness: 0.5 });
  const paintT = canvasT(64, 64, (x) => { x.fillStyle = '#c9b48e'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,240,210' : '90,70,40'},0.06)`; x.fillRect(r() * 64, r() * 64, 2, 2); } });
  const wallM = std(0xffffff, { map: paintT, roughness: 0.95 });
  const roomM = std(0x6a7a8a, { roughness: 0.95 }); // Santiago's room: blue walls
  const woodM = std(0x5a3a22, { map: tex('plywood', [1, 1]), roughness: 0.7 });
  const darkWoodM = std(0x3a2416, { roughness: 0.7 });
  const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  function wall(x0, z0, x1, z1, mat = wallM) { grid.rect(x0, z0, x1, z1, 1, 1); return box(x1 - x0 + 1, 2.7, z1 - z0 + 1, mat, (x0 + x1 + 1) / 2, 1.35, (z0 + z1 + 1) / 2, false); }

  // ---------------- shell ----------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(7, 0, 6); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), std(0xd8ccb4, { roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(7, 2.7, 6); scene.add(ceil);
  wall(0, 0, 13, 0); wall(0, 1, 0, 10); wall(13, 1, 13, 10);
  wall(0, 11, 2, 11); wall(5, 11, 13, 11); // front wall, door at x 3..4
  grid.rect(3, 11, 4, 11, 1, 1);
  const frontDoor = box(1.9, 2.2, 0.08, std(0x5a2a1a, { roughness: 0.6 }), 4, 1.1, 11.05, false);
  box(1.9, 0.5, 1, wallM, 4, 2.45, 11.5, false);
  wall(1, 5, 2, 5); wall(6, 5, 7, 5); // half wall between kitchen and living room
  wall(8, 1, 8, 2); wall(8, 5, 8, 10); // Santiago's room wall, door at z 3..4
  box(1, 0.5, 2, wallM, 8.5, 2.45, 4, false);
  const roomWall = box(3.98, 2.69, 9.98, roomM, 11, 1.35, 6, false); roomWall.material.side = THREE.BackSide; // blue paint inside his room
  // windows: grey moonlight through the blinds
  const winM = std(0x0a1218, { emissive: 0x22303a, emissiveIntensity: 0.6, roughness: 0.2 });
  for (const [x, z, ry] of [[1.6, 11.02, Math.PI], [6.5, 11.02, Math.PI], [12.98, 7, -Math.PI / 2], [1.02, 2.8, Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), winM); w.position.set(x, 1.6, z); w.rotation.y = ry; scene.add(w); for (let k = 0; k < 7; k++) { const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.05), std(0xb8b0a0)); sl.position.set(x - Math.sin(ry) * 0.01, 1.15 + k * 0.15, z - Math.cos(ry) * 0.01); sl.rotation.y = ry; scene.add(sl); } }
  const moon = new THREE.DirectionalLight(0x8aa0c0, 0.25); moon.position.set(4, 6, 20); scene.add(moon);
  scene.add(new THREE.HemisphereLight(0x405060, 0x100c08, 0.07));

  // ---------------- kitchen ----------------
  box(0.8, 1.9, 0.75, std(0xd8d4c8, { metalness: 0.2, roughness: 0.4 }), 1.5, 0.95, 1.4); grid.rect(1, 1, 1, 1); // fridge
  box(2.6, 0.9, 0.7, woodM, 3.4, 0.45, 1.35); box(2.7, 0.05, 0.75, std(0xd8cfb8, { roughness: 0.3 }), 3.4, 0.92, 1.35); grid.rect(2, 1, 4, 1);
  box(0.8, 0.9, 0.7, std(0xe0dcd0, { roughness: 0.4 }), 5.2, 0.45, 1.35); grid.rect(5, 1, 5, 1); // stove
  box(0.8, 0.03, 0.7, std(0x1a1a1a), 5.2, 0.92, 1.35);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.28, 12), std(0xb03020, { roughness: 0.5 })); pot.position.set(5.2, 1.08, 1.35); scene.add(pot);
  const burner = makeGlow(0x4a7aff, 0.35, 0.5); burner.position.set(5.2, 0.95, 1.35); scene.add(burner); // gas still works
  box(1.3, 0.9, 0.7, woodM, 6.6, 0.45, 1.35); grid.rect(6, 1, 7, 1);
  // magnets + drawings on the fridge
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), std([0xf0e8d0, 0xe8e0f0, 0xf0f0e0, 0xe0f0e8][i])); p.position.set(1.15 + (i % 2) * 0.3, 1.2 + Math.floor(i / 2) * 0.32, 1.78); scene.add(p); }
  // table
  box(1.6, 0.05, 0.95, darkWoodM, 4, 0.76, 3.2); for (const [dx, dz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) box(0.06, 0.74, 0.06, darkWoodM, 4 + dx, 0.37, 3.2 + dz);
  grid.rect(3, 2, 4, 3, 1, 0);
  const chairs = [[4, 4.1, Math.PI], [4, 2.3, 0], [2.9, 3.2, Math.PI / 2]].map(([x, z, ry]) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), darkWoodM); seat.position.y = 0.45; g.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04), darkWoodM); back.position.set(0, 0.7, -0.2); g.add(back); scene.add(g); return g; });
  // oilcloth + the bowl that's waiting for him + a stack of tortillas
  box(1.5, 0.005, 0.9, std(0xc8302a, { roughness: 0.3 }), 4, 0.79, 3.2, false);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.08, 14, 1, true), std(0xd8c8a0, { side: THREE.DoubleSide })); bowl.position.set(4, 0.83, 3.55); scene.add(bowl);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.01, 14), std(0x9a2a14, { roughness: 0.3 })); soup.position.set(4, 0.876, 3.55); scene.add(soup);
  const steam = makeGlow(0xd8d0c8, 0.3, 0.12); steam.position.set(4, 0.98, 3.55); scene.add(steam);
  const tablecandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), std(0xf0e8d8, { emissive: 0x6a4020, emissiveIntensity: 0.6 })); tablecandle.position.set(4.45, 0.88, 3.0); scene.add(tablecandle);
  const tcFlame = makeGlow(0xffb050, 0.22, 0.95); tcFlame.position.set(4.45, 1.0, 3.0); scene.add(tcFlame);
  const tcLight = new THREE.PointLight(0xffa040, 4, 6, 1.6); tcLight.position.set(4.45, 1.15, 3.0); tcLight.castShadow = true; tcLight.shadow.mapSize.set(256, 256); scene.add(tcLight);
  const tort = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), std(0xe8d8a0)); tort.position.set(3.55, 0.82, 3.1); scene.add(tort);

  // ---------------- living room ----------------
  box(0.9, 0.45, 2.2, std(0x5a3a3a, { roughness: 0.9 }), 1.45, 0.23, 8); box(0.25, 0.5, 2.2, std(0x5a3a3a), 1.1, 0.7, 8); grid.rect(1, 7, 1, 8, 1, 0); // couch
  box(0.9, 0.4, 0.5, darkWoodM, 3.4, 0.2, 8); grid.rect(3, 8, 3, 8, 1, 0); // coffee table
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), std(0x7a2a2a, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(3.2, 0.01, 8); scene.add(rug);
  box(1.2, 0.6, 0.45, darkWoodM, 6.4, 0.3, 10.5); grid.rect(6, 10, 6, 10, 1, 0);
  const tv = box(0.9, 0.55, 0.08, std(0x0a0a0a, { roughness: 0.2 }), 6.4, 0.9, 10.55); // dead, no power
  // the altar: la Virgen, veladoras, a photo of Santiago in his first communion suit
  box(1.0, 0.05, 0.35, darkWoodM, 7.45, 1.25, 7.5, false); grid.rect(7, 7, 7, 7, 1, 0);
  const virgenT = textTex(96, 140, '#1d3a6a', [{ text: '✦', size: 30, color: '#f0d27a', y: 30 }], { border: '#c8a040', borderW: 6 });
  { const cv = virgenT.image.getContext('2d'); cv.fillStyle = '#2a5a3a'; cv.beginPath(); cv.ellipse(48, 82, 22, 46, 0, 0, 7); cv.fill(); cv.fillStyle = '#c89a70'; cv.beginPath(); cv.arc(48, 46, 9, 0, 7); cv.fill(); virgenT.needsUpdate = true; }
  const virgen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), std(0xffffff, { map: virgenT })); virgen.position.set(7.88, 1.6, 7.5); virgen.rotation.y = -Math.PI / 2; scene.add(virgen);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), std(0x8a7a6a)); photo.position.set(7.82, 1.4, 7.15); photo.rotation.y = -Math.PI / 2; scene.add(photo);
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8), new THREE.MeshStandardMaterial({ color: [0xc8302a, 0xe0b030, 0xc8302a][i], transparent: true, opacity: 0.85, emissive: 0x401008 })); v.position.set(7.4, 1.38, 7.25 + i * 0.25); scene.add(v);
    const f = makeGlow(0xffb050, 0.2, 0.9); f.position.set(7.4, 1.52, 7.25 + i * 0.25); scene.add(f); flames.push(f);
  }
  const altarL = new THREE.PointLight(0xffa040, 3, 6, 1.6); altarL.position.set(7.2, 1.7, 7.5); scene.add(altarL);

  // ---------------- Santiago's room ----------------
  box(1.1, 0.45, 2.0, std(0x3a3a48), 11.95, 0.23, 2.1); box(1.1, 0.6, 0.08, darkWoodM, 11.95, 0.75, 1.1); grid.rect(11, 1, 12, 3, 1, 0);
  const blanket = box(1.05, 0.08, 1.4, std(0x6a2a2a, { roughness: 1 }), 11.95, 0.5, 2.4, false);
  const pillow = box(0.6, 0.1, 0.35, std(0xe0dcd0), 11.95, 0.52, 1.4, false);
  box(1.2, 0.75, 0.6, darkWoodM, 9.7, 0.38, 1.4); grid.rect(9, 1, 10, 1, 1, 0); // desk
  const clockFace = box(0.2, 0.1, 0.08, std(0x111111, { emissive: 0x000000 }), 9.4, 0.8, 1.35, false); // alarm clock (dead)
  // the América jersey on the wall, his work boots by the bed
  const jerseyT = textTex(128, 128, '#e8d230', [{ text: '10', size: 64, color: '#1a2a6a' }]);
  const jersey = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), std(0xffffff, { map: jerseyT })); jersey.position.set(12.97, 1.7, 5.5); jersey.rotation.y = -Math.PI / 2; scene.add(jersey);
  for (const dx of [-0.13, 0.13]) box(0.12, 0.25, 0.3, std(0x4a3420), 11.2 + dx, 0.13, 3.6);
  box(0.6, 1.8, 0.5, darkWoodM, 9.5, 0.9, 9.6); grid.rect(9, 9, 9, 9, 1, 0); // dresser

  // ---------------- Rosa ----------------
  const rosa = makeCharacter('rosa', { shirt: 0xe8e0d0, pants: 0x222222, skin: 0x9a6a4a, hair: 0x9a9a9a }, 1.58);
  rosa.group.position.set(4.6, 0, 2.6); scene.add(rosa.group);
  const rosaCandle = new THREE.PointLight(0xffa040, 0, 5, 1.6); scene.add(rosaCandle);
  const rosaFlame = makeGlow(0xffb050, 0.18, 0); scene.add(rosaFlame);
  let rosaWalk = null, rosaPhase = 0, rosaLook = null;

  // ---------------- story ----------------
  const events = []; let tl = 0, stage = 0, sitT = -1, eatT = -1;
  const at = (t, fn) => events.push({ t: tl + t, fn });
  const say = (...k) => ui.say(k.map((x) => VO[x]));
  audio.preloadVo(HOUSE_VO);
  audio.rainBed(); audio.setLoop('rain', 0.07, 2);
  audio.sirenBed(); audio.setLoop('siren', 0.012, 3);
  ui.clock('12:16 AM'); ui.objective('');
  P.pos.set(3.5, 0, 10.2); P.yaw = 0; P.pitch = -0.05; P.flashlight = false; P.frozen = true;
  at(0.3, () => { audio.slam({ x: 4, y: 1.2, z: 11 }); });
  at(0.8, () => { rosaWalk = [[4, 6], [3.6, 8.6]]; rosaCandle.intensity = 3; });
  at(1.6, () => say('r1', 'j1', 'r2', 'j2', 'r3', 'j3').then(() => {
    // she holds on to the back of the couch. Nobody says anything for a while.
    audio.noise({ dur: 2.5, type: 'bandpass', freq: 700, q: 0.8, gain: 0.05, attack: 0.6, pos: { x: rosa.group.position.x, y: 1.4, z: rosa.group.position.z } });
    at(3.2, () => say('r4', 'r5').then(() => {
      P.frozen = false; stage = 1; rosaWalk = [[4, 6], [5.0, 2.3]]; rosaLook = 'player';
      ui.objective('Eat. Sit at the kitchen table.');
    }));
  }));

  const it = (o) => { L.interactables.push(o); return o; };
  it({ x: 4, z: 4.6, r: 1.6, label: 'Sit down and eat', enabled: () => stage === 1, action: () => {
    stage = 2; ui.objective(''); P.frozen = true; sitT = 0; chairs[0].visible = false; ui.toast('E — STAND UP', 3);
    at(1.2, () => { eatT = 0; });
    at(2.0, () => say('r6', 'j4').then(() => at(1.5, () => {
      G.phone.receive('Luz', 'papi?? you didnt come home. mami keeps calling you', 0, 1.2).then(() => at(2.2, () => {
        ui.bark({ id: 'none', who: 'Juan (texting)', text: 'Estoy bien, mija. I\'m at Doña Rosa\'s. Go to sleep. Te quiero.' });
        audio.tone({ freq: 1200, freqTo: 1600, dur: 0.12, gain: 0.04 });
        at(4, () => say('r7', 'j5', 'r8').then(() => {
          stage = 3; sitT = -1; P.frozen = false; P.eye = 1.62; chairs[0].visible = true;
          ui.objective('Go to bed. Santiago\'s room, through the door past the table.');
          ui.bigHint('PRESS <kbd>F</kbd> FLASHLIGHT<small>HIS ROOM IS DARK</small>'); document.getElementById('bigHint').dataset.k = 'F';
          setTimeout(() => { if (document.getElementById('bigHint').dataset.k === 'F') ui.bigHint(''); }, 6000);
        }));
      }));
    })));
  } });
  it({ x: 11.4, z: 2.6, r: 1.5, label: 'Lie down', enabled: () => stage === 3, action: async () => {
    stage = 4; ui.objective(''); P.frozen = true; P.lookLock = { yaw: Math.PI / 2, pitch: 0.6, k: 2 };
    await ui.fade(1, 2.5);
    ui.hud(false); audio.stopAll();
    await ui.cards([
      'He lay down on top of the blanket with his boots still on.',
      'The street was quiet by three. He didn\'t sleep.',
      'At 6:10 he washed his face in Rosa\'s sink, ate the last tortilla standing up, and walked to work the long way.',
    ]);
    game.nextChapter();
  } });
  it({ x: 6.9, z: 7.5, r: 1.4, label: 'Look at the altar', enabled: () => stage >= 1, action: () => ui.note('<h3>THE ALTAR</h3>La Virgen de Guadalupe, three veladoras, a plastic rose.\n\nSantiago at his first communion, maybe eight years old, in a white suit two sizes too big. Someone has written on the back in pen: <i>"Santi, 1997. Mi angelito."</i>\n\nTucked in the frame: his Hammerline badge photo, laminated, with the corner bent.') });
  it({ x: 1.5, z: 2.0, r: 1.3, label: 'Look at the fridge', enabled: () => stage >= 1, action: () => ui.note('<h3>THE FRIDGE</h3>A church bulletin. A dentist reminder card for Santiago, "Thursday 3:15, please call to confirm."\n\nA crayon drawing of a house with a purple roof, signed <b>LUZ</b>, and under it in Santiago\'s handwriting: "para mi tía Rosa."') });

  function standUp() { sitT = -1; P.frozen = false; chairs[0].visible = true; }
  // you can always get up: E or any movement key stands you up; the scene keeps going
  L.onKey = (code, B) => {
    if (sitT < 0 || !P.frozen) return false;
    if (code === B.interact || code === B.forward || code === B.back || code === B.left || code === B.right) { standUp(); return true; }
    return false;
  };

  L.update = (dt) => {
    tl += dt;
    for (let i = events.length - 1; i >= 0; i--) if (tl >= events[i].t) { const e = events[i]; events.splice(i, 1); e.fn(); }
    // candle flicker
    const fl = 0.85 + Math.random() * 0.15;
    tcLight.intensity = 4 * fl; altarL.intensity = 3 * (0.85 + Math.random() * 0.15);
    flames.forEach((f) => (f.material.opacity = 0.8 + Math.random() * 0.2));
    steam.material.opacity = 0.08 + Math.sin(tl * 2) * 0.04; steam.position.y = 0.98 + Math.sin(tl * 1.3) * 0.02;
    // Rosa
    const g = rosa.group.position; let moving = false;
    if (rosaWalk && rosaWalk.length) {
      const [tx, tz] = rosaWalk[0], dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
      if (d < 0.15) rosaWalk.shift(); else { g.x += dx / d * 1.1 * dt; g.z += dz / d * 1.1 * dt; rosa.group.rotation.y = Math.atan2(dx, dz); moving = true; rosaPhase += dt * 3.5; }
    } else {
      const want = Math.atan2(P.pos.x - g.x, P.pos.z - g.z); let df = want - rosa.group.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); rosa.group.rotation.y += df * Math.min(1, dt * 2);
    }
    animateWalk(rosa, rosaPhase, moving ? 1 : 0, false);
    const ry = rosa.group.rotation.y;
    rosaCandle.position.set(g.x + Math.sin(ry) * 0.35 + Math.cos(ry) * 0.2, 1.1, g.z + Math.cos(ry) * 0.35 - Math.sin(ry) * 0.2); rosaCandle.intensity = rosaCandle.intensity > 0 ? 2.5 * fl : 0;
    rosaFlame.position.copy(rosaCandle.position); rosaFlame.material.opacity = rosaCandle.intensity > 0 ? 0.9 : 0;
    // sitting down at the table
    if (sitT >= 0) {
      sitT += dt;
      P.pos.x += (4 - P.pos.x) * Math.min(1, dt * 3); P.pos.z += (4.15 - P.pos.z) * Math.min(1, dt * 3);
      P.eye += (1.12 - P.eye) * Math.min(1, dt * 3);
      if (sitT < 1.4) { P.yaw += (0 - P.yaw) * Math.min(1, dt * 3); P.pitch += (-0.42 - P.pitch) * Math.min(1, dt * 3); }
    }
    // eating: the food bar fills spoon by spoon
    if (eatT >= 0 && eatT < 10) {
      const before = eatT; eatT += dt;
      if (Math.floor(eatT / 1.3) !== Math.floor(before / 1.3)) audio.spoon();
      P.food = Math.min(1, P.food + dt / 10);
      soup.scale.setScalar(Math.max(0.2, 1 - eatT / 10)); soup.position.y = 0.876 - eatT * 0.002;
      if (eatT >= 10) { P.food = 1; game.eat(0); ui.toast('YOU ATE'); steam.visible = false; }
    }
  };
  L.danger = () => ({ heart: 0 });
  L.dispose = () => { ui.bigHint(''); };
  return L;
}
