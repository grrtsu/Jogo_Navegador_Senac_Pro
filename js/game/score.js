/* =========================================================
   ZYRO — score.js  (Pontuação, combos e multiplicadores)
   Multiplicador = combo (x1, x2, x3) × Score Boost (x2), máximo x6.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Score = class {
  constructor() { this.reset(); }

  reset() {
    this.points = 0;
    this.cores = 0;           // ZYRO CORES coletados (super vale 5)
    this.streak = 0;          // desvios perfeitos seguidos
    this.comboTimer = 0;
    this.bestMult = 1;        // melhor combo da corrida
    this.coinStreak = 0;      // cores seguidos sem perder nenhum
    this.boost = false;       // Score Boost ativo
    this.perfects = 0;
  }

  get comboMult() {
    const C = ZYRO.CONFIG.COMBO;
    return this.streak >= C.x3 ? 3 : this.streak >= C.x2 ? 2 : 1;
  }

  get mult() { return Math.min(ZYRO.CONFIG.SCORE.maxMult, this.comboMult * (this.boost ? ZYRO.CONFIG.POWERUPS.boost.mult : 1)); }

  add(pts, useMult = true) {
    const v = useMult ? pts * this.mult : pts;
    this.points += v;
    return v;
  }

  addDistance(m) { this.points += m * ZYRO.CONFIG.SCORE.perMeter * this.mult; }

  // desvio perfeito ('perfect') ou por pouco ('near'); devolve {pts, newMult}
  dodge(kind) {
    const before = this.comboMult;
    this.streak++;
    this.perfects++;
    this.comboTimer = ZYRO.CONFIG.COMBO.timeout;
    const base = kind === 'near' ? ZYRO.CONFIG.SCORE.nearMiss : ZYRO.CONFIG.SCORE.perfect;
    const pts = this.add(base);
    const after = this.comboMult;
    this.bestMult = Math.max(this.bestMult, after);
    return { pts, newMult: after > before ? after : 0 };
  }

  // coleta de um core; devolve bônus de sequência (0 se não houver)
  core(isSuper) {
    const S = ZYRO.CONFIG.SCORE;
    this.cores += isSuper ? 5 : 1;
    this.add(isSuper ? S.superCore : S.core);
    this.coinStreak++;
    if (this.coinStreak % S.coinStreak === 0) return this.add(S.coinStreakBonus);
    return 0;
  }

  missCore() { this.coinStreak = 0; }

  update(dt) {
    if (this.streak > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.streak = 0; ZYRO.Bus.emit('comboEnd'); }
    }
  }
};
