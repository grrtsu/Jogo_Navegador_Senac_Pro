/* =========================================================
   ZYRO — collision.js  (Colisões)

   Técnica: caixas alinhadas aos eixos (AABB, "Axis-Aligned
   Bounding Box"). Cada coisa vira uma caixa com começo e fim
   em 3 eixos:
     x = lado (esquerda/direita)
     y = altura
     z = profundidade (à frente / atrás do jogador)
   Duas caixas se tocam quando se sobrepõem nos TRÊS eixos ao
   mesmo tempo. É simples, rápido e suficiente para um runner.

   Sobre "d" e "z":
   - d = posição de algo na pista, em metros desde a largada
     (um obstáculo em d = 300 está no metro 300).
   - z = d − distância do jogador = quantos metros À FRENTE do
     jogador aquilo está agora. O jogador sempre está em z = 0.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Collision = {
  // Dois intervalos [a0, a1] e [b0, b1] se sobrepõem?
  // Eles NÃO se sobrepõem só se um termina antes do outro começar.
  overlap: (a0, a1, b0, b1) => a0 < b1 && b0 < a1,

  // Caixas sólidas de um obstáculo (x e y no mundo).
  // O portão (G) é especial: bloqueia as 3 faixas, menos a aberta, então vira 2 caixas.
  boxes(obstacle) {
    const type = ZYRO.OBSTACLE_TYPES[obstacle.type], laneWidth = ZYRO.CONFIG.LANE_WIDTH;
    const boxInLane = lane => ({
      x0: lane * laneWidth - type.halfW, x1: lane * laneWidth + type.halfW,
      y0: type.y0, y1: type.y1
    });
    if (obstacle.type === 'G') return [-1, 0, 1].filter(lane => lane !== obstacle.open).map(boxInLane);
    return [boxInLane(obstacle.lane)];
  },

  // O obstáculo ocupa esta faixa? (usado para saber se o jogador desviou dele)
  blocksLane(obstacle, lane) {
    return obstacle.type === 'G' ? lane !== obstacle.open : lane === obstacle.lane;
  },

  // Colisão real entre jogador e obstáculo, testando os 3 eixos.
  hits(player, obstacle, playerDistance) {
    const overlap = ZYRO.Collision.overlap;
    const z0 = obstacle.d - playerDistance, z1 = z0 + obstacle.len;   // frente e fundo do obstáculo
    const playerBox = player.box();
    if (!overlap(playerBox.z0, playerBox.z1, z0, z1)) return false;   // ainda não chegou (ou já passou): nem testa o resto
    for (const box of ZYRO.Collision.boxes(obstacle)) {
      if (overlap(playerBox.x0, playerBox.x1, box.x0, box.x1) &&
          overlap(playerBox.y0, playerBox.y1, box.y0, box.y1)) return true;
    }
    return false;
  },

  // Coleta de itens: de propósito MAIS generosa que a colisão (pegar um core "quase" já conta).
  // Colisão justa + coleta generosa = o jogo parece justo para quem joga.
  touches(player, item, playerDistance, radius = 0.45) {
    const overlap = ZYRO.Collision.overlap;
    const z = item.d - playerDistance;
    if (z > 1.1 || z < -1.1) return false;
    const playerBox = player.box();
    return overlap(playerBox.x0 - 0.15, playerBox.x1 + 0.15, item.x - radius, item.x + radius) &&
           overlap(playerBox.y0 - 0.1, playerBox.y1 + 0.2, item.y - radius, item.y + radius);
  }
};
