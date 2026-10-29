/* =========================================================
   ZYRO — collectibles.js  (ZYRO CORES e power-ups)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.POWERUP_TYPES = {
  magnet: { nome: 'MAGNET CORE', cor: '#FF4FBF', icone: 'ima' },
  shield: { nome: 'SHIELD',      cor: '#00D9FF', icone: 'escudo' },
  boost:  { nome: 'SCORE BOOST', cor: '#FFD447', icone: 'estrela' },
  jetpack: { nome: 'JETPACK',    cor: '#FF9D43', icone: 'foguete' }
};

ZYRO.Collectibles = {
  // atualiza ZYRO CORES: ímã, coleta e cores perdidos
  updateCores(game, dt) {
    const C = ZYRO.CONFIG, p = game.player;
    const magnet = game.power.magnet > 0;
    const k = 1 - Math.pow(0.00002, dt);
    for (const c of game.coins) {
      if (c.taken) continue;
      const z = c.d - game.dist;
      if (magnet && !c.mag && z < C.POWERUPS.magnet.radius * 2 && z > -1) c.mag = true;
      if (c.mag) {                               // voa até o jogador
        c.x = ZYRO.U.lerp(c.x, p.x, k);
        c.y = ZYRO.U.lerp(c.y, p.y + p.height * 0.55, k);
        c.d = ZYRO.U.lerp(c.d, game.dist, k);
      }
      if (ZYRO.Collision.touches(p, c, game.dist)) {
        c.taken = true;
        game.collectCore(c);
      } else if (z < -1.6 && !c.missed) {
        c.missed = true;
        game.score.missCore();
      }
    }
  },

  updatePowerups(game) {
    for (const u of game.powerups) {
      if (u.taken) continue;
      if (ZYRO.Collision.touches(game.player, u, game.dist, 0.65)) {
        u.taken = true;
        game.activatePowerup(u.type);
      }
    }
  }
};
