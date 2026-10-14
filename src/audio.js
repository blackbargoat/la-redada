// Procedural audio engine: every SFX and music cue is synthesized with WebAudio.
// Voice-over lines are loaded from assets/vo/<id>.mp3 when present.
export class AudioEngine {
  constructor() { this.ctx = null; this.voCache = new Map(); this.loops = {}; this.chaseLvl = 0; this.beatT = 0; this.beat = 0; this.heartT = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = 0.8; this.music.connect(this.master);
    this.voice = ctx.createGain(); this.voice.gain.value = 1.0; this.voice.connect(this.master);
    const n = ctx.sampleRate * 3;
    this.noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.brownBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const b = this.brownBuf.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    this.curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; this.curve[i] = Math.tanh(x * 5); }
  }
  get t() { return this.ctx.currentTime; }

  setListener(cam) {
    if (!this.ctx) return;
    const l = this.ctx.listener, p = cam.position;
    const f = cam.getWorldDirection(this._v || (this._v = new cam.position.constructor()));
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
  }
  out(pos, dest) {
    dest = dest || this.sfx;
    if (!pos) return dest;
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.6; p.rolloffFactor = 1.25; p.maxDistance = 90;
    p.positionX.value = pos.x; p.positionY.value = pos.y ?? 1.2; p.positionZ.value = pos.z;
    p.connect(dest); return p;
  }
  noise(o) {
    if (!this.ctx) return;
    const { dur = 0.2, type = 'lowpass', freq = 1000, freqTo, q = 1, gain = 0.3, attack = 0.005, pos, dest, when = 0, rate = 1, brown = false } = o;
    const ctx = this.ctx, t = this.t + when;
    const src = ctx.createBufferSource(); src.buffer = brown ? this.brownBuf : this.noiseBuf; src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out(pos, dest));
    src.start(t, Math.random() * 2); src.stop(t + dur + 0.05);
  }
  tone(o) {
    if (!this.ctx) return;
    const { freq = 440, freqTo, dur = 0.3, type = 'sine', gain = 0.2, attack = 0.005, pos, dest, when = 0, dist = false, filter, vib } = o;
    const ctx = this.ctx, t = this.t + when;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (freqTo) osc.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    if (vib) { const l = ctx.createOscillator(); l.frequency.value = vib[0]; const lg = ctx.createGain(); lg.gain.value = vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (dist) { const ws = ctx.createWaveShaper(); ws.curve = this.curve; node.connect(ws); node = ws; }
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; node.connect(f); node = f; }
    node.connect(g); g.connect(this.out(pos, dest));
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  // continuous noise/osc bed with controllable gain
  loop(name, build) {
    if (!this.ctx || this.loops[name]) return this.loops[name];
    const g = this.ctx.createGain(); g.gain.value = 0;
    const nodes = build(this.ctx, g) || [];
    this.loops[name] = { g, nodes };
    return this.loops[name];
  }
  setLoop(name, v, time = 0.5) {
    const L = this.loops[name]; if (!L) return;
    L.g.gain.cancelScheduledValues(this.t); L.g.gain.setTargetAtTime(v, this.t, time / 3);
  }
  stopLoop(name, time = 0.5) {
    const L = this.loops[name]; if (!L) return;
    this.setLoop(name, 0, time);
    setTimeout(() => { for (const n of L.nodes) { try { n.stop(); } catch (e) { } } L.g.disconnect(); }, time * 1000 + 300);
    delete this.loops[name];
  }
  stopAll() { for (const k of Object.keys(this.loops)) this.stopLoop(k, 0.3); this.chaseLvl = 0; this.gtr = null; }
  noiseSrc(ctx, brown) { const s = ctx.createBufferSource(); s.buffer = brown ? this.brownBuf : this.noiseBuf; s.loop = true; return s; }

  // ---------- beds ----------
  rainBed() {
    return this.loop('rain', (ctx, g) => {
      const s = this.noiseSrc(ctx); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      const s2 = this.noiseSrc(ctx, true); const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 400; const g2 = ctx.createGain(); g2.gain.value = 0.5;
      s.connect(hp); hp.connect(lp); lp.connect(g); s2.connect(lp2); lp2.connect(g2); g2.connect(g); g.connect(this.sfx);
      s.start(); s2.start(); return [s, s2];
    });
  }
  cityBed() { // distant traffic, hum
    return this.loop('city', (ctx, g) => {
      const s = this.noiseSrc(ctx, true); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      const o = ctx.createOscillator(); o.frequency.value = 60; const og = ctx.createGain(); og.gain.value = 0.04;
      s.connect(lp); lp.connect(g); o.connect(og); og.connect(g); g.connect(this.sfx); s.start(); o.start(); return [s, o];
    });
  }
  droneBed() { // night dread drone
    return this.loop('drone', (ctx, g) => {
      const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 41;
      const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = 41.6;
      const c = ctx.createOscillator(); c.type = 'sine'; c.frequency.value = 61.7;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(lp.frequency);
      const s = this.noiseSrc(ctx, true); const nlp = ctx.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 500; const ng = ctx.createGain(); ng.gain.value = 0.25;
      a.connect(lp); b.connect(lp); c.connect(lp); lp.connect(g); s.connect(nlp); nlp.connect(ng); ng.connect(g); g.connect(this.music);
      [a, b, c, lfo, s].forEach((n) => n.start()); return [a, b, c, lfo, s];
    });
  }
  buzzBed() { // fluorescent hum
    return this.loop('buzz', (ctx, g) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240; bp.Q.value = 3;
      o.connect(bp); bp.connect(g); g.connect(this.sfx); o.start(); return [o];
    });
  }
  motorBed(pos) {
    return this.loop('motor', (ctx, g) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52;
      const s = this.noiseSrc(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 1.5;
      const am = ctx.createOscillator(); am.frequency.value = 11; const amg = ctx.createGain(); amg.gain.value = 0.5;
      const mix = ctx.createGain(); mix.gain.value = 0.5; am.connect(amg); amg.connect(mix.gain);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      o.connect(lp); lp.connect(g); s.connect(bp); bp.connect(mix); mix.connect(g); g.connect(this.out(pos));
      [o, s, am].forEach((n) => n.start()); return [o, s, am];
    });
  }
  breathBed() { // panicked breathing, gain driven by exhaustion
    return this.loop('breath', (ctx, g) => {
      const s = this.noiseSrc(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.8;
      const am = ctx.createOscillator(); am.frequency.value = 0.9; const amg = ctx.createGain(); amg.gain.value = 0.5;
      const v = ctx.createGain(); v.gain.value = 0.5; am.connect(amg); amg.connect(v.gain);
      s.connect(bp); bp.connect(v); v.connect(g); g.connect(this.sfx); s.start(); am.start(); this._breathAm = am; return [s, am];
    });
  }

  // ---------- one-shots ----------
  step(kind, surface = 'concrete') {
    const g = kind === 'sprint' ? 0.2 : kind === 'crouch' ? 0.03 : 0.085;
    const wet = surface === 'wet';
    this.noise({ dur: wet ? 0.14 : 0.09, type: 'bandpass', freq: (wet ? 1500 : 700) + Math.random() * 500, q: 0.9, gain: g });
    if (wet) this.noise({ dur: 0.1, type: 'highpass', freq: 3500, gain: g * 0.5, when: 0.02 });
  }
  boot(pos, g = 0.5) {
    this.noise({ dur: 0.13, type: 'lowpass', freq: 420, gain: g, pos });
    this.tone({ freq: 110, freqTo: 45, dur: 0.1, gain: g * 0.45, pos });
    this.noise({ dur: 0.04, type: 'highpass', freq: 2500, gain: g * 0.15, pos, when: 0.03 });
  }
  radio(pos, g = 1) {
    this.noise({ dur: 0.28, type: 'bandpass', freq: 1800, q: 2.5, gain: 0.16 * g, pos });
    this.tone({ freq: 1450, dur: 0.07, type: 'square', gain: 0.04 * g, pos });
  }
  radioOut(pos, g = 1) {
    this.noise({ dur: 0.22, type: 'bandpass', freq: 2200, q: 3, gain: 0.12 * g, pos });
    this.tone({ freq: 1150, dur: 0.06, type: 'square', gain: 0.04 * g, pos, when: 0.05 });
  }
  stinger(v = 1) {
    const fs = [311, 330, 466, 494, 622, 659, 740];
    for (const f of fs) this.tone({ freq: f, freqTo: f * 0.9, dur: 1.9, type: 'sawtooth', gain: 0.09 * v, attack: 0.01, dist: true, filter: 5000, vib: [7, 9], dest: this.music });
    this.noise({ dur: 1.4, type: 'highpass', freq: 9000, freqTo: 1200, gain: 0.5 * v, attack: 0.01, dest: this.music });
    this.tone({ freq: 70, freqTo: 28, dur: 1.6, gain: 0.7 * v, attack: 0.005, dest: this.music });
  }
  hit(v = 1) { // short scare hit
    this.tone({ freq: 55, freqTo: 25, dur: 1.2, gain: 0.8 * v, attack: 0.003, dest: this.music });
    this.noise({ dur: 0.6, type: 'lowpass', freq: 3000, freqTo: 200, gain: 0.6 * v, attack: 0.003, dest: this.music });
    for (const f of [880, 932, 1245]) this.tone({ freq: f, freqTo: f * 0.85, dur: 0.9, type: 'sawtooth', gain: 0.05 * v, dist: true, filter: 6000, dest: this.music });
  }
  scream() {
    for (const f of [720, 760, 905, 1210]) this.tone({ freq: f, freqTo: f * 1.3, dur: 1.4, type: 'sawtooth', gain: 0.12, attack: 0.01, dist: true, vib: [31, 90], filter: 7000, dest: this.music });
    this.noise({ dur: 1.4, type: 'bandpass', freq: 1200, freqTo: 3400, q: 6, gain: 0.7, attack: 0.01, dest: this.music });
    this.tone({ freq: 80, freqTo: 30, dur: 1.5, gain: 0.8, dest: this.music });
    this.noise({ dur: 0.3, type: 'lowpass', freq: 600, gain: 0.9, dest: this.music });
  }
  shriek(pos) {
    for (const f of [1400, 1580, 1900]) this.tone({ freq: f, freqTo: f * 0.6, dur: 1.6, type: 'sawtooth', gain: 0.12, dist: true, vib: [9, 160], filter: 6000, pos });
    this.noise({ dur: 1.5, type: 'bandpass', freq: 2500, freqTo: 900, q: 4, gain: 0.5, pos });
    this.tone({ freq: 90, freqTo: 40, dur: 1.2, gain: 0.5, dest: this.music });
  }
  heartbeat(v) {
    this.tone({ freq: 60, freqTo: 40, dur: 0.18, gain: 0.55 * v, attack: 0.008, dest: this.music });
    this.tone({ freq: 54, freqTo: 38, dur: 0.2, gain: 0.4 * v, attack: 0.008, when: 0.22, dest: this.music });
  }
  chains(pos) {
    for (let i = 0; i < 16; i++) {
      const w = Math.random() * 1.4;
      this.tone({ freq: 1800 + Math.random() * 2600, dur: 0.12, type: 'triangle', gain: 0.07, when: w, pos });
      this.noise({ dur: 0.05, type: 'highpass', freq: 4000, gain: 0.09, when: w, pos });
    }
    this.noise({ dur: 0.5, type: 'lowpass', freq: 300, gain: 0.4, when: 0.2, pos });
  }
  boltCut(pos) {
    this.noise({ dur: 0.08, type: 'highpass', freq: 3000, gain: 0.8, pos });
    this.tone({ freq: 2400, freqTo: 1800, dur: 0.3, type: 'triangle', gain: 0.2, pos });
    this.chains(pos);
  }
  bark(pos) {
    for (const k of [0, 0.3, 0.85, 1.2]) {
      this.tone({ freq: 520, freqTo: 230, dur: 0.17, type: 'sawtooth', gain: 0.2, when: k, pos, filter: 1100 });
      this.noise({ dur: 0.12, type: 'bandpass', freq: 900, q: 1.2, gain: 0.16, when: k, pos });
    }
  }
  clunk(pos, g = 1) {
    this.noise({ dur: 0.25, type: 'lowpass', freq: 260, gain: 0.9 * g, pos });
    this.tone({ freq: 70, freqTo: 35, dur: 0.35, gain: 0.6 * g, pos });
    this.tone({ freq: 900, dur: 0.03, type: 'square', gain: 0.1 * g, pos });
  }
  slam(pos) {
    this.noise({ dur: 0.6, type: 'lowpass', freq: 500, freqTo: 120, gain: 1, pos });
    this.tone({ freq: 60, freqTo: 30, dur: 0.6, gain: 0.8, pos });
    this.noise({ dur: 1.2, type: 'bandpass', freq: 2000, q: 2, gain: 0.15, pos, when: 0.05 });
  }
  transformer(pos) { // electrical pop + bang
    this.noise({ dur: 0.08, type: 'highpass', freq: 2000, gain: 0.9, pos });
    this.tone({ freq: 3000, freqTo: 200, dur: 0.25, type: 'sawtooth', gain: 0.25, pos, dist: true });
    this.noise({ dur: 1.4, type: 'lowpass', freq: 400, freqTo: 60, gain: 1, pos, when: 0.05 });
    this.tone({ freq: 50, freqTo: 25, dur: 1.2, gain: 0.8, pos });
  }
  lampOff(pos) {
    this.tone({ freq: 120, dur: 0.12, type: 'sawtooth', gain: 0.12, pos, filter: 800 });
    this.noise({ dur: 0.05, type: 'highpass', freq: 5000, gain: 0.25, pos, when: 0.08 });
    this.tone({ freq: 2200, freqTo: 1500, dur: 0.15, type: 'triangle', gain: 0.05, pos, when: 0.08 });
  }
  creak(pos) {
    this.tone({ freq: 150, freqTo: 110, dur: 0.7, type: 'sawtooth', gain: 0.06, pos, filter: 1200, vib: [23, 15] });
    this.noise({ dur: 0.15, type: 'lowpass', freq: 800, gain: 0.2, pos, when: 0.55 });
  }
  can(pos) {
    this.tone({ freq: 880, dur: 0.25, type: 'triangle', gain: 0.18, pos });
    this.tone({ freq: 1240, dur: 0.2, type: 'triangle', gain: 0.14, pos, when: 0.16 });
    this.tone({ freq: 1050, dur: 0.18, type: 'triangle', gain: 0.1, pos, when: 0.3 });
    this.noise({ dur: 1.4, type: 'bandpass', freq: 1500, q: 3, gain: 0.06, pos, when: 0.35 });
  }
  deskPhone(pos) {
    if (!this.ctx) return;
    for (const start of [0, 2.0, 4.0]) {
      const t = this.t + start, ctx = this.ctx;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = o2.type = 'square'; o1.frequency.value = 440; o2.frequency.value = 480;
      const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = 20; const amg = ctx.createGain(); amg.gain.value = 0.5;
      const v = ctx.createGain(); v.gain.value = 0.5; am.connect(amg); amg.connect(v.gain);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.setValueAtTime(0.5, t + 1.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o1.connect(v); o2.connect(v); v.connect(bp); bp.connect(g); g.connect(this.out(pos));
      [o1, o2, am].forEach((n) => { n.start(t); n.stop(t + 1.45); });
    }
  }
  vibrate() { for (const k of [0, 0.55, 1.1]) this.tone({ freq: 150, dur: 0.38, type: 'square', gain: 0.05, when: k, filter: 380 }); }
  gasp() { this.noise({ dur: 0.6, type: 'bandpass', freq: 1700, freqTo: 600, q: 1, gain: 0.45, attack: 0.03 }); }
  pickup() { this.tone({ freq: 660, dur: 0.12, gain: 0.08 }); this.tone({ freq: 990, dur: 0.18, gain: 0.06, when: 0.08 }); }
  click() { this.noise({ dur: 0.03, type: 'highpass', freq: 3000, gain: 0.2 }); this.tone({ freq: 1800, dur: 0.02, type: 'square', gain: 0.03 }); }
  thunder() {
    this.noise({ dur: 4, type: 'lowpass', freq: 300, freqTo: 60, gain: 0.7, attack: 0.3, brown: true, dest: this.sfx });
    this.noise({ dur: 1.0, type: 'lowpass', freq: 1500, freqTo: 200, gain: 0.3, attack: 0.02 });
  }
  carDoor(pos) { this.noise({ dur: 0.25, type: 'lowpass', freq: 700, gain: 0.8, pos }); this.tone({ freq: 90, freqTo: 50, dur: 0.25, gain: 0.5, pos }); }
  tackle(pos) { this.noise({ dur: 0.4, type: 'lowpass', freq: 400, gain: 1, pos }); this.noise({ dur: 0.5, type: 'bandpass', freq: 1500, gain: 0.3, pos, when: 0.05 }); }
  ziptie(pos) { for (let i = 0; i < 9; i++) this.noise({ dur: 0.02, type: 'highpass', freq: 4000, gain: 0.15, pos, when: i * 0.035 }); }
  siren(pos, dur = 6) { this.tone({ freq: 700, dur, type: 'sawtooth', gain: 0.03, pos, filter: 1500, vib: [0.6, 250] }); }

  catScreech(pos) {
    this.tone({ freq: 700, freqTo: 1500, dur: 0.35, type: 'sawtooth', gain: 0.22, vib: [18, 120], filter: 3500, pos, dist: true });
    this.tone({ freq: 1400, freqTo: 600, dur: 0.6, type: 'sawtooth', gain: 0.16, vib: [24, 160], filter: 3000, pos, when: 0.3, dist: true });
    this.noise({ dur: 0.5, type: 'bandpass', freq: 2500, q: 2, gain: 0.25, pos });
  }
  meow(pos) { this.tone({ freq: 600, freqTo: 900, dur: 0.25, type: 'triangle', gain: 0.06, vib: [6, 30], filter: 2200, pos }); this.tone({ freq: 900, freqTo: 500, dur: 0.4, type: 'triangle', gain: 0.06, filter: 2200, pos, when: 0.22 }); }
  easBeep(pos) { for (let i = 0; i < 6; i++) this.tone({ freq: 2900, dur: 0.18, type: 'square', gain: 0.12, pos, when: i * 0.3, filter: 5000 }); }
  carAlarm(pos, dur = 8) {
    for (let t = 0; t < dur; t += 0.5) {
      const k = Math.floor(t / 2) % 3;
      if (k === 0) this.tone({ freq: 900, freqTo: 1600, dur: 0.45, type: 'square', gain: 0.05, pos, when: t, filter: 2500 });
      else if (k === 1) { this.tone({ freq: 1500, dur: 0.12, type: 'square', gain: 0.05, pos, when: t, filter: 2500 }); this.tone({ freq: 1500, dur: 0.12, type: 'square', gain: 0.05, pos, when: t + 0.25, filter: 2500 }); }
      else this.tone({ freq: 1200, dur: 0.4, type: 'sawtooth', gain: 0.04, pos, when: t, vib: [12, 300], filter: 2500 });
    }
  }
  alarmBed() {
    return this.loop('alarm', (ctx, g) => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 880;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 1.6; const lg = ctx.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(o.frequency);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
      o.connect(lp); lp.connect(g); g.connect(this.sfx); o.start(); lfo.start(); return [o, lfo];
    });
  }
  powerDown(pos) { this.tone({ freq: 180, freqTo: 18, dur: 2.6, type: 'sawtooth', gain: 0.22, filter: 900, pos }); this.tone({ freq: 60, freqTo: 15, dur: 2.8, gain: 0.4, pos }); }

  doorBell(pos) { for (const [f, w] of [[2093, 0], [2637, 0.12], [2093, 0.5], [2637, 0.62]]) this.tone({ freq: f, dur: 0.9, type: 'sine', gain: 0.06, when: w, pos }); }
  sizzleBed(pos) {
    return this.loop('sizzle', (ctx, g) => {
      const s = this.noiseSrc(ctx); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
      const am = ctx.createOscillator(); am.frequency.value = 7; const amg = ctx.createGain(); amg.gain.value = 0.3; const v = ctx.createGain(); v.gain.value = 0.7; am.connect(amg); amg.connect(v.gain);
      s.connect(hp); hp.connect(v); v.connect(g); g.connect(this.out(pos)); s.start(); am.start(); return [s, am];
    });
  }
  chatterBed() { // murmur of a busy room
    return this.loop('chatter', (ctx, g) => {
      const s = this.noiseSrc(ctx, true); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = 1.2;
      const am = ctx.createOscillator(); am.frequency.value = 3.3; const amg = ctx.createGain(); amg.gain.value = 0.35; const v = ctx.createGain(); v.gain.value = 0.6; am.connect(amg); amg.connect(v.gain);
      s.connect(bp); bp.connect(v); v.connect(g); g.connect(this.sfx); s.start(); am.start(); return [s, am];
    });
  }
  // Karplus-Strong plucked string
  pluck(freq, gain = 0.1, pos, when = 0) {
    if (!this.ctx) return;
    const key = Math.round(freq);
    let buf = this.cache.get(key);
    if (!buf) {
      const sr = this.ctx.sampleRate, n = Math.floor(sr * 1.4), p = Math.max(2, Math.round(sr / freq));
      buf = this.ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0); const ring = new Float32Array(p);
      for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
      let idx = 0; for (let i = 0; i < n; i++) { const a = ring[idx], b = ring[(idx + 1) % p]; d[i] = a; ring[idx] = (a + b) * 0.4985; idx = (idx + 1) % p; }
      this.cache.set(key, buf);
    }
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(this.out(pos, this.guitarBus || this.music)); src.start(this.t + when);
  }
  // ranchera-style waltz on a little radio/jukebox
  startGuitar(pos) {
    if (!this.ctx) return;
    this.guitarBus = this.ctx.createGain(); this.guitarBus.gain.value = 1;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.5;
    this.guitarBus.connect(bp); bp.connect(this.out(pos, this.music));
    this.gtr = { t: 0, beat: 0, on: true };
  }
  stopGuitar() { if (this.gtr) this.gtr.on = false; }
  guitarLevel(v) { if (this.guitarBus) this.guitarBus.gain.setTargetAtTime(v, this.t, 0.3); }

  // ---------- adaptive music ----------
  update(dt, st) {
    if (!this.ctx) return;
    if (this.gtr && this.gtr.on) {
      this.gtr.t -= dt;
      if (this.gtr.t <= 0) {
        this.gtr.t += 60 / 112;
        const PROG = [[98, [196, 247, 294]], [98, [196, 247, 294]], [73.4, [185, 220, 262]], [73.4, [185, 220, 262]], [73.4, [185, 220, 262]], [73.4, [185, 220, 262]], [98, [196, 247, 294]], [98, [196, 247, 294]], [130.8, [262, 330, 392]], [130.8, [262, 330, 392]], [98, [196, 247, 294]], [98, [196, 247, 294]], [73.4, [185, 220, 262]], [73.4, [185, 220, 262]], [98, [196, 247, 294]], [98, [196, 247, 294]]];
        const b = this.gtr.beat++, bar = Math.floor(b / 3) % PROG.length, k = b % 3, [root, ch] = PROG[bar];
        if (k === 0) this.pluck(root, 0.22, null);
        else ch.forEach((f, i) => this.pluck(f, 0.07, null, i * 0.018));
        if (k === 2 && Math.random() < 0.5) this.pluck(ch[2] * 2, 0.06, null, 0.25);
      }
    }
    // chase percussion
    const target = st.chase ? 1 : 0;
    this.chaseLvl += (target - this.chaseLvl) * Math.min(1, dt * (target ? 3 : 0.6));
    if (this.chaseLvl > 0.02) {
      this.beatT -= dt;
      if (this.beatT <= 0) {
        this.beatT += 60 / 150 / 2;
        const s = this.beat++ % 8, v = this.chaseLvl;
        if (s === 0 || s === 3 || s === 6) this.tone({ freq: 130, freqTo: 48, dur: 0.22, gain: 0.5 * v, dest: this.music });
        if (s === 0 || s === 4) this.tone({ freq: 55, dur: 0.35, type: 'sawtooth', gain: 0.12 * v, dist: true, filter: 300, dest: this.music });
        this.noise({ dur: 0.04, type: 'highpass', freq: 6000, gain: 0.05 * v, dest: this.music });
        if (s === 7 && Math.random() < 0.4) this.noise({ dur: 0.18, type: 'bandpass', freq: 1800, q: 3, gain: 0.08 * v, dest: this.music });
      }
    } else this.beatT = 0;
    // heartbeat driven by danger 0..1
    const h = st.heart || 0;
    if (h > 0.08) {
      this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = 1.2 - h * 0.75; this.heartbeat(0.25 + h * 0.75); }
    }
    if (this.loops.breath) { this.setLoop('breath', (st.breath || 0) * 0.16, 0.6); if (this._breathAm) this._breathAm.frequency.value = 0.7 + (st.breath || 0) * 0.9; }
  }

  // ---------- voice over ----------
  async loadVo(id) {
    if (this.voCache.has(id)) return this.voCache.get(id);
    const p = fetch(`assets/vo/${id}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? this.ctx.decodeAudioData(b) : null)).catch(() => null);
    this.voCache.set(id, p); return p;
  }
  preloadVo(ids) { if (this.ctx) ids.forEach((id) => this.loadVo(id)); }
  // returns duration in seconds (0 if no file)
  async playVo(id, o = {}) {
    if (!this.ctx) return 0;
    const buf = await this.loadVo(id);
    if (!buf) return 0;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    let node = src;
    if (o.radio) {
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 450;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      const ws = this.ctx.createWaveShaper(); ws.curve = this.curve;
      const pre = this.ctx.createGain(); pre.gain.value = 0.6;
      node.connect(hp); hp.connect(lp); lp.connect(pre); pre.connect(ws); node = ws;
    }
    const g = this.ctx.createGain(); g.gain.value = o.gain ?? 1;
    node.connect(g); g.connect(this.out(o.pos, this.voice));
    src.start(this.t + (o.delay || 0));
    return buf.duration;
  }
}
