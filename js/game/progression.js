/* =========================================================
   ZYRO — progression.js  (Progressão: velocidade e zonas)

   Tudo aqui é função PURA da distância: recebe os metros
   percorridos e devolve um valor, sem guardar estado.
   Isso facilita testar (o teste E4 chama speedUnits com
   várias distâncias) e evita bugs de "esqueci de atualizar".
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Progression = {
  // Em qual zona (0, 1 ou 2) o jogador está nesta distância?
  // Percorre as zonas de trás para frente: a primeira cujo início já passou é a atual.
  zoneIndex(distance) {
    const zones = ZYRO.CONFIG.ZONES;
    for (let i = zones.length - 1; i >= 0; i--) {
      if (distance >= zones[i].from) return i;
    }
    return 0;
  },

  // Velocidade em medidas: 100 no início, +25 a cada 500 m, no máximo 1000.
  // Math.floor faz a velocidade subir em DEGRAUS (não aos poucos): aos 499 m ainda é 100, aos 500 m vira 125.
  speedUnits(distance) {
    const SPEED = ZYRO.CONFIG.SPEED;
    const stepsTaken = Math.floor(Math.max(0, distance) / SPEED.stepEvery);
    return Math.min(SPEED.max, SPEED.base + stepsTaken * SPEED.step);
  },

  // A mesma velocidade convertida para metros por segundo (é o que a física usa).
  baseSpeed(distance) {
    return this.speedUnits(distance) * ZYRO.CONFIG.SPEED.metersPerSecondPerUnit;
  }
};
