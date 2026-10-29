/* =========================================================
   ZYRO — shift.js  (Energia e ZYRO SHIFT)
   A barra enche com cores, movimentos perfeitos e desvios
   por pouco. Em 100% o SHIFT pode ser ativado: 5 segundos
   atravessando obstáculos.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Shift = class {
  constructor() { this.reset(); }

  reset() {
    this.energy = 0;      // 0..100
    this.active = false;
    this.t = 0;           // tempo restante do SHIFT
    this.grace = 0;       // proteção curta depois que acaba
    this.uses = 0;
  }

  get ready() { return !this.active && this.energy >= 100; }
  get protected() { return this.active || this.grace > 0; }

  gain(percent) {
    if (this.active || percent <= 0) return;
    const before = this.energy;
    this.energy = Math.min(100, this.energy + percent);
    if (before < 100 && this.energy >= 100) ZYRO.Bus.emit('shiftReady');
  }

  activate() {
    if (!this.ready) return false;
    this.active = true;
    this.t = ZYRO.CONFIG.SHIFT.duration;
    this.uses++;
    ZYRO.Bus.emit('shiftStart');
    return true;
  }

  update(dt) {
    if (this.active) {
      this.t -= dt;
      this.energy = Math.max(0, (100 * this.t) / ZYRO.CONFIG.SHIFT.duration);
      if (this.t <= 0) {
        this.active = false; this.t = 0; this.energy = 0;
        this.grace = ZYRO.CONFIG.SHIFT.grace;
        ZYRO.Bus.emit('shiftEnd');
      }
    } else if (this.grace > 0) {
      this.grace = Math.max(0, this.grace - dt);
    }
  }
};
