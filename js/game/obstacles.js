/* =========================================================
   ZYRO — obstacles.js  (Obstáculos, veículos e o gerador justo)

   O mundo é criado aos poucos, à frente do jogador, em
   FILEIRAS: cada fileira é uma linha da pista com 3 casas
   (uma por faixa). Exemplo: "R.L" = barreira vermelha na
   esquerda, centro livre, barreira baixa na direita.

   A regra mais importante do jogo mora aqui: o gerador NUNCA
   cria uma fase impossível. Antes de aceitar uma fileira, ele
   confere se existe pelo menos uma faixa onde o jogador possa
   estar, chegando a tempo a partir da fileira anterior.

   Letras das fileiras (posição 0 = faixa esquerda):
     .  livre                         R  barreira vermelha (troque de faixa)
     L  barreira baixa (pule)         H  barreira elevada (deslize)
     B  bloco energético              G  portão de energia (só uma faixa aberta)
     T  carro voador na contramão     A  carro voador ALTO na contramão (deslize)
     P  carro estacionado COM rampa   C  carro estacionado SEM rampa (bloqueia)
     U  teto de um carro estacionado (só continua nele quem já está em cima)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

// Geometria de cada obstáculo (metros). halfW = meia largura · y0/y1 = de que altura até que altura é sólido
// len = comprimento na pista · needs = ação que o jogador precisa fazer para passar.
ZYRO.OBSTACLE_TYPES = {
  R: { nome: 'Barreira vermelha', halfW: 1.0,  y0: 0,    y1: 1.9,  len: 0.5, needs: 'lane'  },
  L: { nome: 'Barreira baixa',    halfW: 1.05, y0: 0,    y1: 0.82, len: 0.4, needs: 'jump'  },  // o desenho vai até 0,95 m: o pulo "raspando" passa
  H: { nome: 'Barreira elevada',  halfW: 1.05, y0: 1.0,  y1: 3.2,  len: 0.4, needs: 'slide' },  // embaixo dela há 1 m livre; deslizando o jogador tem 0,85 m
  B: { nome: 'Bloco energético',  halfW: 1.05, y0: 0,    y1: 2.2,  len: 2.2, needs: 'lane'  },
  G: { nome: 'Portão de energia', halfW: 1.2,  y0: 0,    y1: 3.2,  len: 0.5, needs: 'lane'  },
  T: { nome: 'Carro voador na contramão', halfW: 1.0, y0: 0.25, y1: 2.5, len: 7.5, needs: 'lane',  moving: true },
  A: { nome: 'Carro voador alto',         halfW: 1.0, y0: 1.0,  y1: 3.2, len: 7.5, needs: 'slide', moving: true },
  C: { nome: 'Carro voador estacionado',  halfW: 1.1, y0: 0,    y1: 2.0, len: 0,   needs: 'lane'  }   // a colisão dele fica em Game.checkPlatforms
};

// Carros estacionados: rampa (opcional) + 1 a 3 vans em fila. Um "platform" é { lane, ramp, cars, h, d0, d1 }.
ZYRO.Platform = {
  // altura da superfície (rampa ou teto) na distância d; 0 fora do carro
  surface(platform, d) {
    const PLATFORM = ZYRO.CONFIG.PLATFORM;
    if (d < platform.d0 || d > platform.d1) return 0;
    // na rampa a altura cresce em linha reta de 0 até o teto (regra de três)
    if (platform.ramp && d < platform.d0 + PLATFORM.rampLen) return platform.h * (d - platform.d0) / PLATFORM.rampLen;
    return platform.h;
  },
  // onde começam as vans (depois da rampa)
  carsStart(platform) { return platform.d0 + (platform.ramp ? ZYRO.CONFIG.PLATFORM.rampLen : 0); }
};

ZYRO.Generator = class {
  constructor() { this.reset(); }

  reset() {
    const CONFIG = ZYRO.CONFIG;
    this.nextRowAt = CONFIG.FIRST_OBSTACLE;  // distância (m) da próxima fileira
    this.lastRowEnd = 0;                     // onde a última fileira termina (0 = ainda não houve fileira)
    // REACH = faixas onde o jogador PODE estar depois da última fileira, se jogar certo.
    // Começa com as 3: antes do primeiro obstáculo ele pode estar em qualquer uma.
    this.reach = new Set([-1, 0, 1]);
    this.rows = 0;                           // fileiras criadas
    this.queue = [];                         // fileiras pendentes de uma sequência combinada (ex.: zigue-zague)
    this.nextPowerupAt = ZYRO.Utils.rand(...CONFIG.POWERUPS.every) * 0.6;
    this.lastCoinLane = 0;
    this.platformList = [];                  // carros estacionados já criados
    this.trafficClear = [];                  // trechos que ficam livres atrás de um carro na contramão
    this.quiet = null;                       // trecho sem obstáculos (pouso do Jetpack)
    this.log = [];                           // histórico das fileiras (os testes conferem a justiça por aqui)
  }

  // o tutorial ocupa o começo da pista: o gerador só começa depois dele
  startAt(distance) { this.nextRowAt = distance; }

  // Tempo entre fileiras: diminui aos poucos dentro de cada zona (a dificuldade sobe sem saltos).
  gapTime(distance) {
    const CONFIG = ZYRO.CONFIG, Utils = ZYRO.Utils;
    const zoneIndex = ZYRO.Progression.zoneIndex(distance);
    const zoneLength = zoneIndex < 2 ? CONFIG.ZONES[zoneIndex + 1].from - CONFIG.ZONES[zoneIndex].from : 3000;
    const progressInZone = Utils.clamp((distance - CONFIG.ZONES[zoneIndex].from) / zoneLength, 0, 1);
    const [gapAtStart, gapAtEnd] = CONFIG.GAP_TIME[zoneIndex];
    return Utils.lerp(gapAtStart, gapAtEnd, progressInZone);
  }

  // Cria fileiras até SPAWN_AHEAD metros à frente do jogador.
  // O limite de 20 por chamada é uma trava de segurança contra laço infinito.
  update(game) {
    let created = 0;
    while (this.nextRowAt < game.distance + ZYRO.CONFIG.SPAWN_AHEAD && created++ < 20) this.spawnRow(game);
  }

  // ---------- Modelos de fileira ----------
  // Cada modelo tem um peso (w): quanto maior, mais aparece. Zonas mais avançadas liberam modelos mais difíceis.
  pickTemplate(zoneIndex) {
    const Utils = ZYRO.Utils;
    const single = (cells, w) => ({ w, rows: [{ cells, shuffle: true }] });   // uma fileira, faixas embaralhadas
    const parked = w => ({ w, rows: [{ platform: true }] });                   // carro estacionado
    const list = [
      single('R..', 5), single('RR.', 3), single('L..', 2.4), single('H..', 2.4),
      single('LLL', 0.8), { w: 1.2, rows: [{ cells: '...', shuffle: false }] }
    ];
    // as 4 primeiras fileiras só têm barreiras vermelhas: o jogador aprende a trocar de faixa primeiro
    if (this.rows < 4) return { rows: [{ cells: Utils.pick(['R..', 'RR.', 'R..']), shuffle: true }] };
    if (this.rows >= 6) list.push(parked(1.6), single('T..', 1.3));
    if (zoneIndex >= 1) list.push(
      single('B..', 3), single('BB.', 1.5), { w: 2.2, rows: [{ gate: true }] },
      single('RL.', 2), single('RH.', 2), single('BL.', 1.2), single('HHH', 0.8), single('BH.', 1),
      parked(1.4), single('TT.', 1.2), single('A..', 1.3), single('TR.', 1)
    );
    if (zoneIndex >= 2) list.push(
      { w: 2, rows: [{ cells: 'RR.' }, { cells: 'R.R', gapMul: 0.85 }, { cells: '.RR', gapMul: 0.85 }], mirror: true }, // zigue-zague
      { w: 1.6, rows: [{ cells: 'LLL' }, { cells: 'HHH', gapMul: 0.9 }] },                                          // pula e desliza
      { w: 1.4, rows: [{ gate: true }, { gate: true, gapMul: 0.9 }] },                                               // dois portões
      { w: 1.4, rows: [{ cells: 'B.B' }, { cells: 'RLR', gapMul: 0.85 }, { cells: 'BHB', gapMul: 0.85 }] },          // túnel
      single('TA.', 1.2), parked(1)
    );
    return Utils.weighted(list);
  }

  // há um carro estacionado ocupando (ou acabando de ocupar) esta distância?
  activePlatform(d) { return this.platformList.some(platform => d > platform.d0 - 1 && d <= platform.d1 + 30); }
  inQuiet(d) { return this.quiet && d >= this.quiet.from && d <= this.quiet.to; }

  // Transforma um modelo em 3 letras concretas (posição 0 = faixa -1).
  resolveRow(template, mirror, maxShift = 1, d = 0) {
    const Utils = ZYRO.Utils, PLATFORM = ZYRO.CONFIG.PLATFORM;

    if (template.gate) {
      // a abertura do portão fica numa faixa que o jogador consegue alcançar de onde ele pode estar
      const options = [-1, 0, 1].filter(lane => [...this.reach].some(from => Math.abs(lane - from) <= maxShift));
      const open = Utils.pick(options.length ? options : [0]);
      const cells = [-1, 0, 1].map(lane => (lane === open ? '.' : 'G')).join('');
      return { cells, gate: true, open };
    }

    if (template.platform) {
      // a van vai numa faixa sem outra van recente e sem o rastro de um carro na contramão
      const busy = lane => this.platformList.some(platform => platform.lane === lane && d <= platform.d1 + 30) ||
                           this.trafficClear.some(clear => clear.lane === lane && d <= clear.until);
      const freeLanes = [-1, 0, 1].filter(lane => !busy(lane));
      if (!freeLanes.length) return this.resolveRow({ cells: 'R..', shuffle: true }, mirror, maxShift, d);
      const lane = Utils.pick(freeLanes), ramp = Math.random() < PLATFORM.rampChance;
      const besideOptions = ['.', '.', '.', 'R', 'L', 'T'];   // o que pode vir nas outras faixas ao lado da van
      const cells = [-1, 0, 1].map(l => (l === lane ? (ramp ? 'P' : 'C') : Utils.pick(besideOptions))).join('');
      const cars = Utils.randInt(1, ZYRO.Progression.zoneIndex(d) ? 3 : 2);
      return { cells, gate: false, platform: { lane, ramp, cars } };
    }

    const cells = template.cells.split('');
    if (template.shuffle) Utils.shuffle(cells);
    if (mirror) cells.reverse();
    return { cells: cells.join(''), gate: false };
  }

  // Regras que valem POR CIMA de qualquer modelo sorteado.
  applyForced(cells, d, speed) {
    const result = cells.split('');
    for (const platform of this.platformList) {
      if (d > platform.d0 + 0.01 && d <= platform.d1 + 1) result[platform.lane + 1] = 'U';                    // em cima da van: teto
      else if (d > platform.d1 + 1 && d <= platform.d1 + speed * 0.9 + 2) result[platform.lane + 1] = '.';   // logo depois: espaço para descer do teto
    }
    // atrás de um carro na contramão a faixa fica livre (senão ele "nasceria" dentro de outro obstáculo)
    for (const clear of this.trafficClear) {
      if (d > clear.from && d <= clear.until && result[clear.lane + 1] !== 'U') result[clear.lane + 1] = '.';
    }
    // pouso do Jetpack: tudo livre
    if (this.inQuiet(d)) for (let i = 0; i < 3; i++) if (result[i] !== 'U') result[i] = '.';
    return result.join('');
  }

  // ---------- A regra de rota possível ----------
  // Dá para ir da faixa "from" (fileira anterior) para a faixa "to" (esta fileira)?
  // maxShift = quantas faixas dá para trocar no tempo entre as fileiras (1, ou 2 se houver tempo de sobra).
  static canMove(from, to, cells, maxShift) {
    const cell = cells[to + 1];
    if (Math.abs(to - from) > maxShift) return false;          // longe demais para chegar a tempo
    if (cell === 'U') return to === from;                       // só continua no teto quem já está nele
    if (!'.LHAP'.includes(cell)) return false;                  // sólido: R, B, G, T, C
    if (Math.abs(to - from) === 2 && cells[1] === 'U') return false;   // não dá para atravessar uma van no meio
    return true;
  }

  // Quais faixas o jogador pode alcançar nesta fileira, vindo de alguma faixa do reach anterior?
  // (É um passo de busca em largura: o conjunto de "onde posso estar" anda fileira por fileira.)
  // Se o resultado for vazio, a fileira é impossível e o gerador tenta outra.
  static nextReach(reach, cells, maxShift) {
    const reachable = new Set();
    for (const to of [-1, 0, 1]) {
      for (const from of reach) {
        if (ZYRO.Generator.canMove(from, to, cells, maxShift)) { reachable.add(to); break; }
      }
    }
    return reachable;
  }

  // Regra extra perto de vans: de TODA faixa possível tem que existir uma saída.
  // Sem ela, quem estivesse ao lado de uma van poderia ficar preso sem caminho (beco sem saída).
  static noDeadEnd(reach, cells, maxShift) {
    for (const from of reach) {
      if (![-1, 0, 1].some(to => ZYRO.Generator.canMove(from, to, cells, maxShift))) return false;
    }
    return true;
  }

  // ---------- Cria uma fileira ----------
  spawnRow(game) {
    const CONFIG = ZYRO.CONFIG, Utils = ZYRO.Utils;
    const speed = Math.max(game.speed, ZYRO.Progression.baseSpeed(this.nextRowAt));
    const zoneIndex = ZYRO.Progression.zoneIndex(this.nextRowAt);

    // 1) Escolhe o modelo (ou continua uma sequência combinada que está na fila)
    if (!this.queue.length) {
      const template = this.pickTemplate(zoneIndex);
      const mirror = template.mirror && Math.random() < 0.5;
      this.queue = template.rows.map(row => ({ ...row, mirror }));
    }
    let template = this.queue.shift();

    // 2) Onde a fileira fica: depois da anterior + o tempo de reação dessa zona (convertido em metros)
    const gapTime = this.gapTime(this.nextRowAt) * (template.gapMul || 1);
    let d = this.lastRowEnd === 0 ? this.nextRowAt : Math.max(this.nextRowAt, this.lastRowEnd + gapTime * speed);
    // Uma van bloqueia a troca de faixa até o FIM dela; então a fileira seguinte conta o tempo de reação a partir dali.
    for (const platform of this.platformList) {
      if (d > platform.d1 + 1 && d < platform.d1 + gapTime * speed) d = platform.d1 + gapTime * speed;
    }
    const secondsSinceLast = this.lastRowEnd === 0 ? 9 : (d - this.lastRowEnd) / speed;
    const maxShift = secondsSinceLast >= 0.9 ? 2 : 1;   // com 0,9 s dá tempo de trocar 2 faixas

    // portões fecham as 3 faixas: não combinam com vans, com o rastro da contramão nem com o pouso do Jetpack
    if (template.gate && (this.activePlatform(d) || this.inQuiet(d) || this.trafficClear.some(clear => d <= clear.until))) {
      template = { cells: 'R..', shuffle: true };
    }
    if (template.platform && this.inQuiet(d)) template = { cells: '...' };

    // 3) Sorteia e VALIDA. Tenta o modelo escolhido 3 vezes; se não passar, tenta modelos simples.
    let row = null, reach = null;
    for (let attempt = 0; attempt < 12 && !reach; attempt++) {
      const source = attempt < 3 ? template : { cells: Utils.pick(['R..', 'L..', 'H..', '...']), shuffle: true };
      const candidate = this.resolveRow(source, template.mirror, maxShift, d);
      candidate.cells = this.applyForced(candidate.cells, d, speed);
      const candidateReach = ZYRO.Generator.nextReach(this.reach, candidate.cells, maxShift);
      // com vans no caminho a regra é mais forte: ninguém pode ficar encurralado
      const strict = /[UCP]/.test(candidate.cells);
      if (candidateReach.size && (!strict || ZYRO.Generator.noDeadEnd(this.reach, candidate.cells, maxShift))) {
        row = candidate; reach = candidateReach;
        if (attempt >= 3) this.queue = [];     // a sequência combinada foi abandonada
      }
    }
    if (!reach) {                              // última garantia: fileira vazia (só as regras forçadas)
      row = { cells: this.applyForced('...', d, speed), gate: false };
      reach = ZYRO.Generator.nextReach(this.reach, row.cells, maxShift); this.queue = [];
    }
    row.strict = /[UCP]/.test(row.cells);

    // 4) Cria os objetos de verdade na pista
    let rowLength = 0.5;
    if (row.gate) {
      game.obstacles.push({ type: 'G', lane: 0, open: row.open, d, len: ZYRO.OBSTACLE_TYPES.G.len });
    } else {
      [-1, 0, 1].forEach(lane => {
        const letter = row.cells[lane + 1];
        if ('.UPC'.includes(letter)) return;     // livre, teto e vans não viram obstáculo comum
        const type = ZYRO.OBSTACLE_TYPES[letter];
        if (type.moving) {
          // carro na contramão: d é onde ele ENCONTRA o jogador (meetAt). Game.moveTraffic calcula a posição real.
          const ownSpeed = Math.min(CONFIG.TRAFFIC.speed[zoneIndex], speed * CONFIG.TRAFFIC.maxFraction);
          game.obstacles.push({ type: letter, lane, d: d + 9999, meetAt: d, ownSpeed, len: type.len });
          // como o carro também anda, ele passa pelo jogador mais rápido: ocupa menos "pista" do ponto de vista dele
          rowLength = Math.max(rowLength, type.len * speed / (speed + ownSpeed));
          this.trafficClear.push({ lane, from: d, until: d + CONFIG.TRAFFIC.clear });
        } else {
          rowLength = Math.max(rowLength, type.len);
          game.obstacles.push({ type: letter, lane, d, len: type.len });
        }
      });
    }
    // A van só nasce se a letra dela (P ou C) sobreviveu às regras forçadas: se applyForced trocou por '.',
    // a fileira foi validada como livre naquela faixa, e criar a van mesmo assim seria uma armadilha.
    if (row.platform && 'PC'.includes(row.cells[row.platform.lane + 1])) {
      const PLATFORM = CONFIG.PLATFORM, spec = row.platform;
      const platform = {
        lane: spec.lane, ramp: spec.ramp, cars: spec.cars, h: PLATFORM.height,
        d0: d, d1: d + (spec.ramp ? PLATFORM.rampLen : 0) + spec.cars * PLATFORM.carLen,
        color: Utils.randInt(0, 2)
      };
      this.platformList.push(platform);
      game.platforms.push(platform);
      if (platform.ramp && Math.random() < 0.85) {        // cores subindo a rampa e por cima do teto: convite para subir
        for (let coreD = d + 1; coreD < platform.d1 - 1; coreD += 3) {
          game.coins.push({ x: ZYRO.Lanes.x(platform.lane), y: ZYRO.Platform.surface(platform, coreD) + 0.75, d: coreD, lane: platform.lane, super: false, roof: true });
        }
      }
    }

    // 5) ZYRO CORES e power-ups no espaço livre antes desta fileira
    this.placeCollectibles(game, row, reach, d);

    this.log.push({ d, cells: row.cells, strict: row.strict, maxShift, timeSince: secondsSinceLast, reachBefore: [...this.reach], reachAfter: [...reach] });
    if (this.log.length > 6000) this.log.shift();
    this.reach = reach;
    this.lastRowEnd = d + rowLength;
    this.nextRowAt = this.lastRowEnd + gapTime * speed;
    this.rows++;
    // esquece o que ficou muito para trás
    if (this.platformList.length > 12) this.platformList = this.platformList.filter(platform => platform.d1 + 300 > this.nextRowAt);
    if (this.trafficClear.length > 12) this.trafficClear = this.trafficClear.filter(clear => clear.until + 50 > this.nextRowAt);
  }

  // altura do chão numa faixa (teto de van ou 0): os cores e power-ups acompanham
  heightAt(lane, d) {
    let height = 0;
    for (const platform of this.platformList) if (platform.lane === lane) height = Math.max(height, ZYRO.Platform.surface(platform, d));
    return height;
  }

  // Cores e power-ups SÓ em faixas do reach: todo item é alcançável por quem está jogando certo.
  placeCollectibles(game, row, reach, d) {
    const CONFIG = ZYRO.CONFIG, Utils = ZYRO.Utils;
    const start = Math.max(this.lastRowEnd + 3, d - 40);
    const lanes = [...reach].filter(lane => row.cells[lane + 1] !== 'U');   // tetos já têm os próprios cores
    if (!lanes.length || d - start < 6) return;

    // de tempos em tempos, um power-up no lugar dos cores
    if (d > this.nextPowerupAt) {
      const type = Utils.weighted([{ w: 1, t: 'magnet' }, { w: 1, t: 'shield' }, { w: 1, t: 'boost' }, { w: 1, t: 'jetpack' }]).t;
      const lane = Utils.pick(lanes.filter(l => row.cells[l + 1] === '.').concat(lanes));   // prefere faixa livre
      const itemD = (start + d) / 2;
      game.powerups.push({ type, lane, x: ZYRO.Lanes.x(lane), y: 1.0 + this.heightAt(lane, itemD), d: itemD });
      this.nextPowerupAt = d + Utils.rand(...CONFIG.POWERUPS.every);
      return;
    }
    if (Math.random() > 0.72) return;          // nem todo espaço tem cores

    // metade das vezes continua na faixa dos cores anteriores: forma "trilhas" que convidam a arriscar
    const lane = lanes.includes(this.lastCoinLane) && Math.random() < 0.5 ? this.lastCoinLane : Utils.pick(lanes);
    this.lastCoinLane = lane;
    const letter = row.cells[lane + 1];
    const x = ZYRO.Lanes.x(lane);
    for (let coreD = start; coreD <= d - (letter === 'L' ? 5 : 2); coreD += 3) {
      game.coins.push({ x, y: 0.75 + this.heightAt(lane, coreD), d: coreD, lane, super: false });
    }
    if (letter === 'L') {
      // arco de cores por cima da barreira baixa (seno de 0 a π = meia onda: sobe e desce como o pulo)
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        game.coins.push({ x, y: 0.9 + Math.sin(t * Math.PI) * 1.55, d: d - 4 + t * 8.4, lane, super: false });
      }
    } else if (letter === 'H' || letter === 'A') {
      // cores baixos por baixo da barreira elevada / carro alto: ensinam a deslizar
      for (let coreD = d - 1; coreD <= d + 2; coreD += 1.5) game.coins.push({ x, y: 0.45, d: coreD, lane, super: false });
    }
    // Super Core azul (raro) em outra faixa alcançável
    if (Math.random() < 0.06 && lanes.length > 1) {
      const otherLane = Utils.pick(lanes.filter(l => l !== lane)), superD = (start + d) / 2;
      game.coins.push({ x: ZYRO.Lanes.x(otherLane), y: 1.0 + this.heightAt(otherLane, superD), d: superD, lane: otherLane, super: true });
    }
  }
};
