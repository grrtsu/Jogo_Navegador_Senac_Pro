/* =========================================================
   ZYRO — utils.js
   Funções matemáticas, aleatoriedade e um barramento de eventos.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  // escolhe um item de [{w, ...}] proporcional ao peso
  weighted(list) {
    let total = 0;
    for (const it of list) total += it.w;
    let r = Math.random() * total;
    for (const it of list) { r -= it.w; if (r <= 0) return it; }
    return list[list.length - 1];
  },
  // número pseudoaleatório fixo para um índice (decoração sempre igual no mesmo lugar)
  hash(n, seed = 0) {
    let x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  },
  hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  },
  rgba(hex, a) {
    const [r, g, b] = ZYRO.U.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  },
  mixHex(a, b, t) {
    const A = ZYRO.U.hexToRgb(a), B = ZYRO.U.hexToRgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  },
  fmt: n => Math.floor(n).toLocaleString('pt-BR'),
  fmtScore: n => Math.floor(n).toString().padStart(6, '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
};

// Barramento de eventos: os módulos do jogo avisam, a interface escuta.
ZYRO.Bus = {
  handlers: {},
  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); },
  emit(evt, data) { (this.handlers[evt] || []).forEach(fn => fn(data)); },
  clear() { this.handlers = {}; }
};
