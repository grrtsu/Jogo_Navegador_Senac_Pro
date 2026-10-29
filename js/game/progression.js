/* =========================================================
   ZYRO — progression.js  (Progressão: velocidade e zonas)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Progression = {
  zoneIndex(dist) {
    const Z = ZYRO.CONFIG.ZONES;
    for (let i = Z.length - 1; i >= 0; i--) if (dist >= Z[i].from) return i;
    return 0;
  },

  // velocidade em medidas: 100 no início, +25 a cada 500 m, no máximo 1000
  speedUnits(dist) {
    const S = ZYRO.CONFIG.SPEED;
    return Math.min(S.max, S.base + Math.floor(Math.max(0, dist) / S.stepEvery) * S.step);
  },

  // a mesma velocidade convertida para metros por segundo (usada na física)
  baseSpeed(dist) {
    return this.speedUnits(dist) * ZYRO.CONFIG.SPEED.msPerUnit;
  }
};
