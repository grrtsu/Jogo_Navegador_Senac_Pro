/* =========================================================
   ZYRO — shift.js  (Barra de energia e ZYRO SHIFT)

   A barra enche com cores, desvios perfeitos e desvios por
   pouco. Em 100%, o Shift ativa: 5 segundos atravessando
   obstáculos. Enquanto o SHIFT está ativo, a barra serve de
   cronômetro (esvazia até o fim).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Shift = class {
  constructor() { this.reset(); }

  reset() {
    this.energy = 0;      // 0 a 100 (%)
    this.active = false;
    this.timeLeft = 0;    // segundos restantes de SHIFT
    this.grace = 0;       // proteção curta depois que acaba (ver CONFIG.SHIFT.grace)
    this.uses = 0;        // quantas vezes foi usado na corrida
  }

  get ready() { return !this.active && this.energy >= 100; }
  get protected() { return this.active || this.grace > 0; }

  gain(percent) {
    if (this.active || percent <= 0) return;     // durante o SHIFT a barra não enche
    const before = this.energy;
    this.energy = Math.min(100, this.energy + percent);
    // avisa só no momento em que cruzou os 100% (e não a cada core depois disso)
    if (before < 100 && this.energy >= 100) ZYRO.Bus.emit('shiftReady');
  }

  activate() {
    if (!this.ready) return false;
    this.active = true;
    this.timeLeft = ZYRO.CONFIG.SHIFT.duration;
    this.uses++;
    ZYRO.Bus.emit('shiftStart');
    return true;
  }

  update(dt) {
    const SHIFT = ZYRO.CONFIG.SHIFT;
    if (this.active) {
      this.timeLeft -= dt;
      this.energy = Math.max(0, (100 * this.timeLeft) / SHIFT.duration);   // barra = tempo que falta
      if (this.timeLeft <= 0) {
        this.active = false; this.timeLeft = 0; this.energy = 0;
        this.grace = SHIFT.grace;
        ZYRO.Bus.emit('shiftEnd');
      }
    } else if (this.grace > 0) {
      this.grace = Math.max(0, this.grace - dt);
    }
  }
};
