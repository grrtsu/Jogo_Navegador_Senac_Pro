/* =========================================================
   ZYRO — config.js  (Todas as constantes do jogo)

   Por que um arquivo só para números?
   Balancear um jogo é mexer em números o tempo todo. Se cada
   valor estivesse espalhado pelo código, mudar a dificuldade
   seria uma caça ao tesouro. Aqui fica tudo junto: mude um
   valor, recarregue a página e veja o efeito.

   Unidades usadas no projeto inteiro:
   - distância em METROS (m)
   - tempo em SEGUNDOS (s)
   - velocidade em METROS POR SEGUNDO (m/s) na física, e em
     "medidas" só para mostrar ao jogador (ver SPEED abaixo)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.CONFIG = {
  // ---------- Pista ----------
  // 3 faixas numeradas -1 (esquerda), 0 (centro) e 1 (direita).
  // Usar -1/0/1 deixa a conta da posição simples: x = faixa × largura.
  LANE_WIDTH: 2.4,          // largura de uma faixa (m)
  TRACK_HALF_WIDTH: 3.6,    // metade da largura total da pista (m)
  LANE_TIME: 0.16,          // tempo da animação de troca de faixa (s)

  // ---------- Jogador ----------
  // A caixa de colisão é um pouco MENOR que o desenho do Zyro.
  // Assim, quando o jogador acha que passou "raspando", ele passou mesmo.
  PLAYER: {
    height: 1.8,            // altura em pé (m)
    slideHeight: 0.85,      // altura deslizando (m): cabe por baixo das barreiras elevadas
    halfW: 0.42,            // meia largura da caixa (m)
    halfD: 0.25             // meia profundidade da caixa (m)
  },
  JUMP: { duration: 0.62, height: 1.55 },   // o pulo dura 0,62 s e sobe 1,55 m
  SLIDE_TIME: 0.7,                          // o deslize dura 0,7 s
  INPUT_BUFFER: 0.15,       // comando apertado até 0,15 s antes de pousar é guardado e executado no pouso

  // ---------- Velocidade ----------
  // O jogador vê "medidas": começa em 100 e sobe +25 a cada 500 m, até 1000.
  // A física usa m/s: cada medida vale 0,12 m/s.
  // 100 medidas = 12 m/s (início) · 1000 medidas = 120 m/s (atingido aos 18.000 m)
  SPEED: { base: 100, stepEvery: 500, step: 25, max: 1000, metersPerSecondPerUnit: 0.12 },

  // ---------- Zonas (mudam o visual da cidade) ----------
  ZONES: [
    { id: 1, name: 'NOVA CITY',    from: 0 },
    { id: 2, name: 'SKY DISTRICT', from: 1500 },
    { id: 3, name: 'HYPER CORE',   from: 3000 }
  ],

  // ---------- Gerador de obstáculos ----------
  // Tempo (s) entre uma fileira de obstáculos e a próxima, por zona: [no início da zona, no fim da zona].
  // É medido em TEMPO e não em metros porque o que importa para o jogador é quanto tempo ele tem para reagir:
  // a 120 m/s, 20 m passam em 0,17 s; a 12 m/s, em 1,7 s.
  GAP_TIME: [[1.55, 1.2], [1.15, 0.95], [0.95, 0.8]],
  FIRST_OBSTACLE: 55,       // metros livres no começo da corrida
  SPAWN_AHEAD: 235,         // até quantos metros à frente o mundo já é criado
  DRAW_DIST: 220,           // até onde a pista é desenhada (mais longe = mais tempo para ver o que vem)
  MAX_STEP: 0.4,            // metros máximos por passo de simulação (ver Game.update: evita atravessar obstáculos)

  // ---------- Tráfego aéreo na contramão ----------
  TRAFFIC: {
    speed: [14, 17, 20],    // velocidade própria dos carros (m/s) em cada zona
    maxFraction: 0.8,       // ...mas nunca mais que 80% da velocidade do jogador (senão não daria tempo de reagir)
    clear: 45               // metros livres na faixa depois de um carro (para ele não "nascer" dentro de outro obstáculo)
  },

  // ---------- Carros voadores estacionados (plataformas) ----------
  PLATFORM: {
    height: 2.0,            // altura do teto (m)
    carLen: 9,              // comprimento de cada van (m)
    rampLen: 6,             // comprimento da rampa (m)
    rampChance: 0.65,       // chance de um carro estacionado ter rampa
    stepUp: 0.45            // o jogador "pisa" numa superfície até 0,45 m acima do pé; mais alto que isso é parede
  },

  // ---------- ZYRO SHIFT ----------
  SHIFT: {
    duration: 5,            // segundos de SHIFT
    speedMult: 1.35,        // acelera 35% durante o SHIFT
    grace: 0.45,            // proteção extra ao terminar (sem isso, um obstáculo colado no fim do SHIFT mataria sem chance)
    gain: { core: 2, superCore: 10, perfect: 5, nearMiss: 8 }  // quanto cada ação enche a barra (%)
  },

  // ---------- Pontuação ----------
  SCORE: {
    perMeter: 1, core: 10, superCore: 50, perfect: 50, nearMiss: 80,
    shiftBreak: 100,        // por obstáculo atravessado no SHIFT
    coinStreak: 10,         // cores seguidos sem errar...
    coinStreakBonus: 100,   // ...valem este bônus
    maxMult: 6              // multiplicador máximo (combo × boost)
  },

  COMBO: { x2: 3, x3: 5, timeout: 4 },  // 3 desvios seguidos = x2, 5 = x3; o combo acaba após 4 s sem desvio
  PERFECT_WINDOW: 0.5,                  // agir até 0,5 s antes do obstáculo = PERFECT
  NEAR_MISS_WINDOW: 0.22,               // agir até 0,22 s antes = desvio por pouco (AWESOME)

  // ---------- Power-ups ----------
  POWERUPS: {
    every: [520, 780],                  // metros entre um power-up e outro (sorteado nesse intervalo)
    magnet:  { duration: 8, radius: 7 },  // puxa cores num raio de 7 m
    shield:  { duration: 20 },            // aguenta uma batida
    boost:   { duration: 10, mult: 2 },   // pontos em dobro
    jetpack: {
      duration: 9,          // segundos de voo
      height: 9,            // altura do voo (m): acima de todos os obstáculos e carros
      speedMult: 1.4,       // voa 40% mais rápido
      landing: 1.4,         // os últimos 1,4 s são a descida suave
      grace: 1.2            // proteção depois de pousar (s)
    }
  },

  // Paleta (a mesma do Design System no Figma)
  COLORS: {
    azul: '#00D9FF', roxo: '#7955FF', rosa: '#FF4FBF', laranja: '#FF9D43',
    amarelo: '#FFD447', verde: '#42EDAA', escuro: '#101A35', branco: '#FFFFFF',
    vermelho: '#FF4D6D'
  }
};
