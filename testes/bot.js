/* =========================================================
   ZYRO — bot.js  (Jogador automático usado nos testes)

   Para PROVAR que o gerador nunca cria fase impossível, um
   robô joga milhares de metros sozinho (teste E1). Ele usa as
   mesmas teclas que uma pessoa (game.action) e reage com um
   atraso de 0,09 s, como alguém com bons reflexos.

   Estratégia simples, olhando só as 2 próximas fileiras:
   1. dá uma nota para cada faixa (bloqueada = −99, longe =
      perde um pouco, livre = ganha um pouco, se a fileira
      seguinte também estiver bloqueada ali = perde mais);
   2. vai para a faixa de melhor nota;
   3. se ficar na faixa de uma barreira baixa, pula; se for
      elevada, desliza — no momento certo.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Bot = {
  // Devolve a ação a fazer agora ('left', 'right', 'up', 'down') ou null.
  think(game) {
    const player = game.player, speed = game.speed;
    if (player.flying) return null;
    const lookAhead = speed * 1.6 + 8;      // enxerga ~1,6 s à frente

    // Agrupa os obstáculos próximos em fileiras (pela distância). Carro na contramão conta onde ele vai cruzar.
    const rows = new Map();
    const addToRow = (key, obstacle) => { if (!rows.has(key)) rows.set(key, []); if (obstacle) rows.get(key).push(obstacle); };
    for (const obstacle of game.obstacles) {
      if (obstacle.broken) continue;
      const key = obstacle.meetAt ?? obstacle.d, z = key - game.distance;
      if (z + obstacle.len * (obstacle.ownSpeed ? 0.5 : 1) < -0.4 || z > lookAhead) continue;
      addToRow(key, obstacle);
    }
    for (const platform of game.platforms) {   // a frente de cada van também conta como fileira
      const z = platform.d0 - game.distance;
      if (z > -0.4 && z < lookAhead) addToRow(platform.d0, null);
    }
    const rowKeys = [...rows.keys()].sort((a, b) => a - b);
    if (!rowKeys.length) return null;

    // O que tem na faixa "lane" desta fileira? '.' livre · 'L' pular · 'H' deslizar · 'X' bloqueado
    const onRoof = lane => player.lane === lane && !player.jumping && player.y > 1.4;
    const cellOf = (key, lane) => {
      for (const platform of game.platforms) {
        if (platform.lane !== lane || key < platform.d0 - 0.01 || key > platform.d1 + 0.5) continue;
        if (onRoof(lane)) return '.';
        if (Math.abs(key - platform.d0) < 0.01) return platform.ramp ? '.' : 'X';            // frente da van
        return player.lane === lane && game.distance >= platform.d0 ? '.' : 'X';             // já está subindo a rampa
      }
      for (const obstacle of rows.get(key)) {
        if (obstacle.type === 'G') { if (lane !== obstacle.open) return 'X'; }
        else if (obstacle.lane === lane) return 'RBT'.includes(obstacle.type) ? 'X' : obstacle.type === 'A' ? 'H' : obstacle.type;
      }
      return '.';
    };

    const nextKey = rowKeys[0], metersToNext = nextKey - game.distance, afterKey = rowKeys[1];
    const laneScore = lane => {
      const cell = cellOf(nextKey, lane);
      if (cell === 'X') return -99;
      let score = -Math.abs(lane - player.lane) * 0.6;          // trocar de faixa tem um custo
      if (cell === '.') score += 0.5;                           // livre é melhor que pular/deslizar
      if (afterKey !== undefined && cellOf(afterKey, lane) === 'X') score -= 0.8;   // pensa um passo à frente
      return score;
    };
    let bestLane = player.lane, bestScore = laneScore(player.lane);
    for (const lane of [-1, 0, 1]) { const score = laneScore(lane); if (score > bestScore + 0.01) { bestScore = score; bestLane = lane; } }

    const currentCell = cellOf(nextKey, player.lane);
    if (bestLane !== player.lane && player.laneProgress >= 1) {
      // não atravessa uma faixa bloqueada quando o obstáculo já está perto (nem a lateral de uma van)
      const passLane = player.lane + Math.sign(bestLane - player.lane);
      const sideBlocked = game.platforms.some(platform => platform.lane === passLane && game.distance + 3 > platform.d0 && game.distance < platform.d1 && player.y < platform.h - 0.4);
      const tooLateToCross = cellOf(nextKey, passLane) === 'X' && metersToNext < speed * 0.5 && currentCell !== 'X';
      if (!sideBlocked && !tooLateToCross) return bestLane < player.lane ? 'left' : 'right';
    }
    // pula ou desliza na hora certa (perto, mas não cedo demais)
    if (currentCell === 'L' && metersToNext > 0 && metersToNext < speed * 0.3 + 0.6 && !player.jumping) return 'up';
    if (currentCell === 'H' && metersToNext > 0 && metersToNext < speed * 0.32 + 0.6 && !player.sliding) return 'down';
    return null;
  }
};
