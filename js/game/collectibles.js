/* =========================================================
   ZYRO — collectibles.js  (ZYRO CORES e power-ups)
   Os itens são criados pelo gerador (obstacles.js); aqui só
   cuidamos do ímã e da coleta.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

// nome e cor que aparecem na tela; icone = id do símbolo SVG no index.html
ZYRO.POWERUP_TYPES = {
  magnet:  { nome: 'MAGNET CORE', cor: '#FF4FBF', icone: 'ima' },
  shield:  { nome: 'SHIELD',      cor: '#00D9FF', icone: 'escudo' },
  boost:   { nome: 'SCORE BOOST', cor: '#FFD447', icone: 'estrela' },
  jetpack: { nome: 'JETPACK',     cor: '#FF9D43', icone: 'foguete' }
};

ZYRO.Collectibles = {
  // ZYRO CORES: ímã, coleta e cores que passaram sem ser pegos
  updateCores(game, dt) {
    const CONFIG = ZYRO.CONFIG, Utils = ZYRO.Utils, player = game.player;
    const magnetOn = game.power.magnet > 0;
    // quanto o core anda em direção ao jogador neste passo (independente do FPS, como no player.js)
    const pull = 1 - Math.pow(0.00002, dt);

    for (const core of game.coins) {
      if (core.taken) continue;
      const z = core.d - game.distance;     // metros à frente do jogador

      // o ímã "fisga" o core quando ele entra no alcance; depois disso ele voa até o jogador mesmo se o ímã acabar
      if (magnetOn && !core.magnetized && z < CONFIG.POWERUPS.magnet.radius * 2 && z > -1) core.magnetized = true;
      if (core.magnetized) {
        core.x = Utils.lerp(core.x, player.x, pull);
        core.y = Utils.lerp(core.y, player.y + player.height * 0.55, pull);
        core.d = Utils.lerp(core.d, game.distance, pull);
      }

      if (ZYRO.Collision.touches(player, core, game.distance)) {
        core.taken = true;
        game.collectCore(core);
      } else if (z < -1.6 && !core.missed) {
        core.missed = true;               // passou: quebra a sequência de cores
        game.score.missCore();
      }
    }
  },

  updatePowerups(game) {
    for (const item of game.powerups) {
      if (item.taken) continue;
      if (ZYRO.Collision.touches(game.player, item, game.distance, 0.65)) {   // raio maior: power-up é raro, errar dói
        item.taken = true;
        game.activatePowerup(item.type);
      }
    }
  }
};
