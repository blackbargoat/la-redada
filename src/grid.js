// Walkability / sight grid with A* pathfinding. 1 cell = 1 meter.
export class Grid {
  constructor(w, d, ox = 0, oz = 0) {
    this.w = w; this.d = d; this.ox = ox; this.oz = oz;
    this.solid = new Uint8Array(w * d);
    this.opaque = new Uint8Array(w * d);
  }
  cx(x) { return Math.floor(x - this.ox); }
  cz(z) { return Math.floor(z - this.oz); }
  inb(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.d; }
  // world-space inclusive rectangle of cells (x0..x1, z0..z1 are world cell coords)
  rect(x0, z0, x1, z1, s = 1, o = 1) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = x - this.ox, j = z - this.oz;
      if (!this.inb(i, j)) continue;
      const k = j * this.w + i; this.solid[k] = s; this.opaque[k] = o;
    }
  }
  fillAll(s, o) { this.solid.fill(s); this.opaque.fill(o); }
  solidC(i, j) { return !this.inb(i, j) || this.solid[j * this.w + i] === 1; }
  opaqueC(i, j) { return !this.inb(i, j) || this.opaque[j * this.w + i] === 1; }
  isSolid(x, z) { return this.solidC(this.cx(x), this.cz(z)); }
  blocked(px, pz, r) {
    const i0 = this.cx(px - r), i1 = this.cx(px + r), j0 = this.cz(pz - r), j1 = this.cz(pz + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (this.solidC(i, j)) return true;
    return false;
  }
  move(pos, dx, dz, r) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2) || 1;
    const sx = dx / steps, sz = dz / steps;
    for (let k = 0; k < steps; k++) {
      if (!this.blocked(pos.x + sx, pos.z, r)) pos.x += sx;
      if (!this.blocked(pos.x, pos.z + sz, r)) pos.z += sz;
    }
  }
  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const n = Math.ceil(Math.hypot(dx, dz) / 0.25);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (this.opaqueC(this.cx(ax + dx * t), this.cz(az + dz * t))) return false;
    }
    return true;
  }
  nearestFree(i, j) {
    if (!this.solidC(i, j)) return { i, j };
    for (let r = 1; r < 6; r++)
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
        if (!this.solidC(i + a, j + b)) return { i: i + a, j: j + b };
      }
    return null;
  }
  path(sx, sz, tx, tz) {
    const w = this.w;
    const s = this.nearestFree(this.cx(sx), this.cz(sz));
    const t = this.nearestFree(this.cx(tx), this.cz(tz));
    if (!s || !t) return null;
    const S = s.j * w + s.i, T = t.j * w + t.i;
    const N = w * this.d;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = [];
    const push = (f, i) => {
      heap.push([f, i]); let c = heap.length - 1;
      while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last; let c = 0;
        for (;;) {
          const l = 2 * c + 1, r = l + 1; let m = c;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m;
        }
      }
      return top[1];
    };
    const ti = t.i, tj = t.j;
    const h = (k) => { const dx = Math.abs(k % w - ti), dz = Math.abs(((k / w) | 0) - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    g[S] = 0; push(h(S), S);
    let iter = 0;
    while (heap.length && iter++ < 20000) {
      const cur = pop();
      if (cur === T) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % w, cj = (cur / w) | 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue;
        const ni = ci + a, nj = cj + b;
        if (this.solidC(ni, nj)) continue;
        if (a && b && (this.solidC(ci + a, cj) || this.solidC(ci, cj + b))) continue;
        const k = nj * w + ni, ng = g[cur] + (a && b ? 1.414 : 1);
        if (ng < g[k]) { g[k] = ng; came[k] = cur; push(ng + h(k), k); }
      }
    }
    if (S !== T && came[T] === -1) return null;
    const pts = [];
    for (let k = T; k !== -1 && k !== S; k = came[k]) pts.push({ x: (k % w) + this.ox + 0.5, z: ((k / w) | 0) + this.oz + 0.5 });
    pts.reverse();
    if (pts.length && !this.isSolid(tx, tz)) pts[pts.length - 1] = { x: tx, z: tz };
    return pts;
  }
}
