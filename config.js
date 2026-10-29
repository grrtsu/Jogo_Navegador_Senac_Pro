/* =========================================================
   ZYRO — config.js
   Todas as constantes do jogo em um só lugar.
   Ajuste aqui para balancear a dificuldade.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.CONFIG = {
  // Pista: 3 faixas (-1 = esquerda, 0 = centro, 1 = direita)
  LANE_W: 2.4,            // largura de uma faixa em metros
  TRACK_HALF: 3.6,        // metade da largura total da pista
  LANE_TIME: 0.16,        // segundos para trocar de faixa

  PLAYER: { height: 1.8, slideHeight: 0.85, halfW: 0.42, halfD: 0.25 },   // caixa de colisão um pouco menor que o desenho (mais justo)
  JUMP: { duration: 0.62, height: 1.55 },
  SLIDE_TIME: 0.7,
  INPUT_BUFFER: 0.15,     // comando guardado se apertado um pouco antes de pousar

  // Velocidade em "medidas": começa em 100 e sobe +25 a cada 500 m, até o máximo de 1000.
  // 1 medida = 0,12 m/s  →  100 medidas = 12 m/s · 1000 medidas = 120 m/s (atingido aos 18.000 m)
  SPEED: { base: 100, stepEvery: 500, step: 25, max: 1000, msPerUnit: 0.12 },

  ZONES: [
    { id: 1, name: 'NOVA CITY',    from: 0 },
    { id: 2, name: 'SKY DISTRICT', from: 1500 },
    { id: 3, name: 'HYPER CORE',   from: 3000 }
  ],

  // Gerador de obstáculos: tempo (s) entre fileiras [início da zona, fim da zona]
  GAP_TIME: [[1.55, 1.2], [1.15, 0.95], [0.95, 0.8]],
  FIRST_OBSTACLE: 55,     // metros livres no começo da corrida
  SPAWN_AHEAD: 235,       // até onde o mundo é gerado à frente
  DRAW_DIST: 220,         // até onde a pista é desenhada (mais longe = mais tempo para reagir em alta velocidade)
  MAX_STEP: 0.4,          // metros máximos por passo de simulação (evita atravessar obstáculos em alta velocidade)

  // Tráfego aéreo na contramão: velocidade própria dos carros (m/s) por zona
  TRAFFIC: { speed: [14, 17, 20], maxFrac: 0.8, clear: 45 },

  // Carros voadores estacionados (plataformas): teto a 2 m, rampa de 6 m na frente
  PLATFORM: { height: 2.0, carLen: 9, rampLen: 6, rampChance: 0.65, step: 0.45 },

  SHIFT: {
    duration: 5,          // segundos de SHIFT
    speedMult: 1.35,      // aceleração durante o SHIFT
    grace: 0.45,          // proteção extra ao terminar (evita morte injusta)
    gain: { core: 2, superCore: 10, perfect: 5, nearMiss: 8 }  // % de energia
  },

  SCORE: {
    perMeter: 1, core: 10, superCore: 50, perfect: 50, nearMiss: 80,
    shiftBreak: 100, coinStreak: 10, coinStreakBonus: 100, maxMult: 6
  },

  COMBO: { x2: 3, x3: 5, timeout: 4 },          // desvios seguidos para cada multiplicador
  PERFECT_WINDOW: 0.5,                         // ação até 0,5 s antes = PERFECT
  NEAR_MISS_WINDOW: 0.22,                      // ação até 0,22 s antes = desvio por pouco

  POWERUPS: {
    every: [520, 780],                         // metros entre power-ups
    magnet: { dur: 8, radius: 7 },
    shield: { dur: 20 },
    boost:  { dur: 10, mult: 2 },
    jetpack: { dur: 9, height: 9, speedMult: 1.4, landing: 1.4, grace: 1.2 }  // voo de 9 s a 9 m de altura
  },

  COLORS: {
    azul: '#00D9FF', roxo: '#7955FF', rosa: '#FF4FBF', laranja: '#FF9D43',
    amarelo: '#FFD447', verde: '#42EDAA', escuro: '#101A35', branco: '#FFFFFF',
    vermelho: '#FF4D6D'
  }
};
