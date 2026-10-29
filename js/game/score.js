/* =========================================================
   ZYRO — score.js  (Pontuação, combos e multiplicadores)

   Multiplicador = combo (x1, x2, x3) × Score Boost (x2),
   limitado a x6. Tudo que dá ponto passa por add(), então o
   multiplicador é aplicado num lugar só.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Score = class {
  constructor() { this.reset(); }

  reset() {
    this.points = 0;
    this.cores = 0;           // ZYRO CORES coletados (o Super Core vale 5)
    this.streak = 0;          // desvios perfeitos seguidos (define o combo)
    this.comboTimer = 0;      // segundos até o combo acabar se não houver outro desvio
    this.bestMult = 1;        // melhor combo da corrida (vai para o Game Over)
    this.coinStreak = 0;      // cores seguidos sem deixar nenhum passar
    this.boost = false;       // Score Boost ativo
    this.perfects = 0;        // total de desvios perfeitos
  }

  // 3 desvios seguidos = x2, 5 = x3
  get comboMult() {
    const COMBO = ZYRO.CONFIG.COMBO;
    return this.streak >= COMBO.x3 ? 3 : this.streak >= COMBO.x2 ? 2 : 1;
  }

  get mult() {
    const boostMult = this.boost ? ZYRO.CONFIG.POWERUPS.boost.mult : 1;
    return Math.min(ZYRO.CONFIG.SCORE.maxMult, this.comboMult * boostMult);
  }

  // soma pontos (já multiplicados) e devolve quanto somou, para mostrar "+100" na tela
  add(points, useMult = true) {
    const value = useMult ? points * this.mult : points;
    this.points += value;
    return value;
  }

  // 1 ponto por metro (vezes o multiplicador)
  addDistance(meters) { this.points += meters * ZYRO.CONFIG.SCORE.perMeter * this.mult; }

  // desvio perfeito ('perfect') ou por pouco ('near').
  // Devolve { pts, newMult }: newMult é o combo novo SE ele acabou de subir (para mostrar "COMBO x2!"), senão 0.
  dodge(kind) {
    const SCORE = ZYRO.CONFIG.SCORE;
    const multBefore = this.comboMult;
    this.streak++;
    this.perfects++;
    this.comboTimer = ZYRO.CONFIG.COMBO.timeout;     // cada desvio renova o prazo do combo
    const pts = this.add(kind === 'near' ? SCORE.nearMiss : SCORE.perfect);
    const multAfter = this.comboMult;
    this.bestMult = Math.max(this.bestMult, multAfter);
    return { pts, newMult: multAfter > multBefore ? multAfter : 0 };
  }

  // coleta de um core; devolve o bônus de sequência (a cada 10 seguidos) ou 0
  core(isSuper) {
    const SCORE = ZYRO.CONFIG.SCORE;
    this.cores += isSuper ? 5 : 1;
    this.add(isSuper ? SCORE.superCore : SCORE.core);
    this.coinStreak++;
    if (this.coinStreak % SCORE.coinStreak === 0) return this.add(SCORE.coinStreakBonus);
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
