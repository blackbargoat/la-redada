// Procedural canvas textures (no external image assets needed).
import * as THREE from 'three';

const cache = {};
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function speckle(x, w, h, r, n, cols, a) {
  for (let i = 0; i < n; i++) { x.fillStyle = cols[(r() * cols.length) | 0]; x.globalAlpha = a * r(); const s = 1 + r() * 2; x.fillRect(r() * w, r() * h, s, s); }
  x.globalAlpha = 1;
}
function blotches(x, w, h, r, n, dark, light, minR, maxR) {
  for (let i = 0; i < n; i++) {
    const gx = r() * w, gy = r() * h, rad = minR + r() * (maxR - minR);
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, rad);
    g.addColorStop(0, r() < 0.6 ? dark : light); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
  }
}

const GEN = {
  concrete() {
    const [c, x] = mk(512, 512); const r = rng(7);
    x.fillStyle = '#76726b'; x.fillRect(0, 0, 512, 512);
    blotches(x, 512, 512, r, 40, 'rgba(40,36,30,0.2)', 'rgba(160,155,145,0.12)', 20, 110);
    speckle(x, 512, 512, r, 9000, ['#5a5650', '#8f8b84', '#4a4640'], 0.6);
    x.strokeStyle = 'rgba(30,28,25,0.18)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, 511, 511);
    return c;
  },
  asphalt() {
    const [c, x] = mk(512, 512); const r = rng(11);
    x.fillStyle = '#2b2d2d'; x.fillRect(0, 0, 512, 512);
    blotches(x, 512, 512, r, 60, 'rgba(10,12,12,0.35)', 'rgba(70,72,70,0.15)', 15, 80);
    speckle(x, 512, 512, r, 16000, ['#1a1b1b', '#3d3f3e', '#4a4b49', '#151616'], 0.8);
    // cracks
    x.strokeStyle = 'rgba(8,8,8,0.6)'; x.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) { let px = r() * 512, py = r() * 512; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
    return c;
  },
  // roughness: dark = shiny (puddles), light = rough
  wetRough() {
    const [c, x] = mk(256, 256); const r = rng(5);
    x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, 256, 256);
    blotches(x, 256, 256, r, 26, 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.6)', 14, 60);
    speckle(x, 256, 256, r, 3000, ['#999', '#555'], 0.4);
    return c;
  },
  sidewalk() {
    const [c, x] = mk(256, 256); const r = rng(9);
    x.fillStyle = '#6d6c67'; x.fillRect(0, 0, 256, 256);
    blotches(x, 256, 256, r, 20, 'rgba(30,30,28,0.3)', 'rgba(150,150,140,0.1)', 10, 50);
    speckle(x, 256, 256, r, 5000, ['#4f4e4a', '#85847e'], 0.6);
    x.strokeStyle = '#3c3b38'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256);
    return c;
  },
  block() {
    const [c, x] = mk(256, 256); const r = rng(3);
    x.fillStyle = '#8d8a83'; x.fillRect(0, 0, 256, 256);
    speckle(x, 256, 256, r, 5000, ['#77746d', '#a19e97'], 0.5);
    x.strokeStyle = '#66635d'; x.lineWidth = 3;
    for (let row = 0; row < 8; row++) {
      const y = row * 32; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke();
      const off = row % 2 ? 32 : 0;
      for (let col = 0; col < 5; col++) { const xx = off + col * 64; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 32); x.stroke(); }
    }
    blotches(x, 256, 256, r, 10, 'rgba(40,35,30,0.2)', 'rgba(40,35,30,0.1)', 10, 60);
    return c;
  },
  brick() {
    const [c, x] = mk(256, 256); const r = rng(21);
    x.fillStyle = '#4a3a33'; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row++) {
      const off = row % 2 ? 16 : 0;
      for (let col = -1; col < 9; col++) {
        const v = 0.75 + r() * 0.35;
        x.fillStyle = `rgb(${(122 * v) | 0},${(70 * v) | 0},${(55 * v) | 0})`;
        x.fillRect(off + col * 32 + 1, row * 16 + 1, 30, 14);
      }
    }
    speckle(x, 256, 256, r, 3000, ['#2a2220', '#8a6a5a'], 0.4);
    return c;
  },
  stucco() {
    const [c, x] = mk(256, 256); const r = rng(33);
    x.fillStyle = '#9a958a'; x.fillRect(0, 0, 256, 256);
    speckle(x, 256, 256, r, 9000, ['#7d786d', '#b0aba0', '#8a857a'], 0.5);
    blotches(x, 256, 256, r, 14, 'rgba(50,45,35,0.25)', 'rgba(50,45,35,0.12)', 20, 90);
    return c;
  },
  shutter() {
    const [c, x] = mk(128, 128); const r = rng(4);
    for (let y = 0; y < 128; y += 4) { const v = 90 + r() * 30; x.fillStyle = `rgb(${v},${v + 2},${v + 4})`; x.fillRect(0, y, 128, 3); x.fillStyle = '#3a3c3e'; x.fillRect(0, y + 3, 128, 1); }
    blotches(x, 128, 128, r, 6, 'rgba(60,40,20,0.3)', 'rgba(20,20,20,0.2)', 8, 30);
    // graffiti scribble
    x.strokeStyle = 'rgba(40,80,160,0.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(20, 80); for (let k = 0; k < 8; k++) x.lineTo(20 + k * 12, 70 + r() * 30); x.stroke();
    return c;
  },
  plywood() {
    const [c, x] = mk(256, 256); const r = rng(13);
    x.fillStyle = '#b48a55'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(110,70,30,0.35)';
    for (let i = 0; i < 60; i++) { x.lineWidth = 1 + r() * 2; x.beginPath(); const y = r() * 256; x.moveTo(0, y); x.bezierCurveTo(80, y + (r() - 0.5) * 20, 170, y + (r() - 0.5) * 20, 256, y + (r() - 0.5) * 10); x.stroke(); }
    return c;
  },
  label() {
    const [c, x] = mk(128, 128); const r = rng(17);
    x.fillStyle = '#e6e2da'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#9a968e'; x.fillRect(0, 40, 128, 42);
    x.fillStyle = '#ffffff'; x.fillRect(10, 12, 40, 18);
    x.fillStyle = '#555'; for (let i = 0; i < 5; i++) x.fillRect(10, 90 + i * 6, 40 + r() * 60, 2);
    x.strokeStyle = '#777'; x.strokeRect(0.5, 0.5, 127, 127);
    return c;
  },
  cardboard() {
    const [c, x] = mk(128, 128); const r = rng(19);
    x.fillStyle = '#a3794a'; x.fillRect(0, 0, 128, 128);
    speckle(x, 128, 128, r, 800, ['#8a6238', '#b88b5a'], 0.5);
    x.fillStyle = 'rgba(200,180,140,0.6)'; x.fillRect(56, 0, 16, 128);
    x.fillStyle = '#222'; x.font = 'bold 14px sans-serif'; x.fillText('THIS SIDE UP', 14, 112);
    return c;
  },
  wrap() {
    const [c, x] = mk(128, 128); const r = rng(23);
    x.fillStyle = '#9da3a6'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(255,255,255,${0.1 + r() * 0.2})`; x.lineWidth = 1 + r() * 3; x.beginPath(); x.moveTo(0, r() * 128); x.lineTo(128, r() * 128); x.stroke(); }
    return c;
  },
  chainlink() {
    const [c, x] = mk(64, 64);
    x.strokeStyle = 'rgba(170,175,175,0.9)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 0); x.lineTo(64, 32); x.lineTo(32, 64); x.closePath(); x.stroke();
    return c;
  },
  bark() {
    const [c, x] = mk(64, 128); const r = rng(29);
    x.fillStyle = '#3b2e24'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(15,10,8,0.7)'; x.lineWidth = 2; x.beginPath(); const px = r() * 64; x.moveTo(px, 0); x.lineTo(px + (r() - 0.5) * 10, 128); x.stroke(); }
    return c;
  },
};

export function tex(key, repeat = null, srgb = true) {
  const c = cache[key] || (cache[key] = GEN[key]());
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  return t;
}

// Text/sign texture. lines: [{text, size, color, y, font}]
export function textTex(w, h, bg, lines, opts = {}) {
  const [c, x] = mk(w, h);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  if (opts.border) { x.strokeStyle = opts.border; x.lineWidth = opts.borderW || 8; x.strokeRect(4, 4, w - 8, h - 8); }
  x.textAlign = opts.align || 'center'; x.textBaseline = 'middle';
  for (const l of lines) {
    x.fillStyle = l.color || '#fff';
    x.font = `${l.weight || 'bold'} ${l.size}px ${l.font || 'Oswald, Impact, Arial Narrow, sans-serif'}`;
    x.fillText(l.text, l.x ?? (opts.align === 'left' ? 20 : w / 2), l.y ?? h / 2);
  }
  if (opts.grime) {
    const r = rng(w + h);
    blotches(x, w, h, r, 12, 'rgba(20,15,10,0.35)', 'rgba(20,15,10,0.2)', 10, 60);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function jacketTex(side) {
  const [c, x] = mk(256, 256);
  x.fillStyle = '#121725'; x.fillRect(0, 0, 256, 256);
  const r = rng(side === 'back' ? 1 : 2);
  speckle(x, 256, 256, r, 2000, ['#0b0f18', '#1b2133'], 0.5);
  x.fillStyle = '#e3bd1c'; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (side === 'back') {
    x.font = 'bold 34px Arial Narrow, Arial, sans-serif'; x.fillText('POLICE', 128, 62);
    x.font = 'bold 112px Arial Black, Arial, sans-serif'; x.fillText('ICE', 128, 160);
  } else {
    x.font = 'bold 22px Arial Narrow, Arial, sans-serif'; x.fillText('POLICE', 70, 70);
    x.beginPath(); x.arc(186, 72, 16, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#0d1019'; x.fillRect(40, 120, 176, 110); // vest panel
    x.fillStyle = '#e3bd1c'; x.font = 'bold 30px Arial Narrow, Arial, sans-serif'; x.fillText('POLICE', 128, 150);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Building facade: upper windows (some lit) for street buildings. Returns {map, emissive}
export function facadeTex(seed, floors, cols, wallColor) {
  const r = rng(seed);
  const W = 256, H = 256 * Math.max(1, floors) / 2;
  const [c, x] = mk(W, H); const [e, ex] = mk(W, H);
  x.fillStyle = wallColor; x.fillRect(0, 0, W, H);
  speckle(x, W, H, r, 4000, ['rgba(0,0,0,0.5)', 'rgba(255,255,255,0.2)'], 0.4);
  blotches(x, W, H, r, 10, 'rgba(10,10,10,0.35)', 'rgba(10,10,10,0.2)', 10, 70);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const fh = H / floors, cw = W / cols;
  for (let f = 0; f < floors; f++) for (let k = 0; k < cols; k++) {
    const wx = k * cw + cw * 0.22, wy = f * fh + fh * 0.22, ww = cw * 0.56, wh = fh * 0.5;
    x.fillStyle = '#d8d4c8'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
    const lit = r() < 0.18;
    const warm = r() < 0.7;
    x.fillStyle = lit ? (warm ? '#e8c27a' : '#9fd6c0') : '#141a1c';
    x.fillRect(wx, wy, ww, wh);
    if (lit) {
      ex.fillStyle = warm ? '#d8a050' : '#70b8a0'; ex.fillRect(wx, wy, ww, wh);
      // curtain
      if (r() < 0.6) { x.fillStyle = 'rgba(120,40,30,0.7)'; x.fillRect(wx, wy, ww * 0.35, wh); ex.fillStyle = 'rgba(60,15,10,1)'; ex.fillRect(wx, wy, ww * 0.35, wh); }
    }
    x.fillStyle = '#2b2b2b'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh);
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const em = new THREE.CanvasTexture(e); em.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive: em };
}
