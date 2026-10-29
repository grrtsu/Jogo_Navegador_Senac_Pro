/* =========================================================
   ZYRO — obstacles.js  (Obstáculos, veículos e gerador justo)
   O gerador cria "fileiras" de obstáculos. Cada fileira é
   validada: SEMPRE existe pelo menos uma faixa possível e
   alcançável a partir da fileira anterior, respeitando o
   tempo necessário para o jogador reagir.

   Letras usadas nas fileiras (índice 0 = faixa esquerda):
     .  livre            R  barreira vermelha    L  barreira baixa (pular)
     H  barreira elevada (deslizar)              B  bloco energético
     G  portão de energia                        T  carro voador na contramão
     A  carro voador alto na contramão (deslizar)
     P  carro estacionado COM rampa (sobe no teto)
     C  carro estacionado SEM rampa (bloqueia)   U  teto do carro (só quem já está em cima)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

// Geometria de cada obstáculo (metros). needs = ação que o jogador precisa fazer.
ZYRO.OBSTACLE_TYPES = {
  R: { nome: 'Barreira vermelha', halfW: 1.0,  y0: 0,    y1: 1.9,  len: 0.5, needs: 'lane'  },
  L: { nome: 'Barreira baixa',    halfW: 1.05, y0: 0,    y1: 0.82, len: 0.4, needs: 'jump'  },  // desenho vai até 0,95 m
  H: { nome: 'Barreira elevada',  halfW: 1.05, y0: 1.0,  y1: 3.2,  len: 0.4, needs: 'slide' },
  B: { nome: 'Bloco energético',  halfW: 1.05, y0: 0,    y1: 2.2,  len: 2.2, needs: 'lane'  },
  G: { nome: 'Portão de energia', halfW: 1.2,  y0: 0,    y1: 3.2,  len: 0.5, needs: 'lane'  },
  T: { nome: 'Carro voador na contramão', halfW: 1.0, y0: 0.25, y1: 2.5, len: 7.5, needs: 'lane',  moving: true },
  A: { nome: 'Carro voador alto',         halfW: 1.0, y0: 1.0,  y1: 3.2, len: 7.5, needs: 'slide', moving: true },
  C: { nome: 'Carro voador estacionado',  halfW: 1.1, y0: 0,    y1: 2.0, len: 0,   needs: 'lane'  }
};

// Plataformas (carros estacionados): altura da superfície em cada ponto
ZYRO.Platform = {
  surface(pl, d) {
    const P = ZYRO.CONFIG.PLATFORM;
    if (d < pl.d0 || d > pl.d1) return 0;
    if (pl.ramp && d < pl.d0 + P.rampLen) return pl.h * (d - pl.d0) / P.rampLen;
    return pl.h;
  },
  carsStart(pl) { return pl.d0 + (pl.ramp ? ZYRO.CONFIG.PLATFORM.rampLen : 0); }
};

ZYRO.Generator = class {
  constructor() { this.reset(); }

  reset() {
    const C = ZYRO.CONFIG;
    this.nextD = C.FIRST_OBSTACLE;      // posição (m) da próxima fileira
    this.lastEnd = 0;                   // fim da última fileira
    this.reach = new Set([-1, 0, 1]);   // faixas onde o jogador pode estar
    this.rows = 0;
    this.queue = [];                    // sequências combinadas pendentes
    this.nextPowerD = ZYRO.U.rand(...C.POWERUPS.every) * 0.6;
    this.lastCoinLane = 0;
    this.platList = [];                 // carros estacionados já criados
    this.trafficClear = [];             // trechos livres atrás de carros na contramão
    this.quiet = null;                  // trecho sem obstáculos (pouso do Jetpack)
    this.log = [];                      // histórico (usado nos testes)
  }

  // Tempo entre fileiras: diminui dentro de cada zona
  gapTime(dist) {
    const C = ZYRO.CONFIG;
    const zi = ZYRO.Progression.zoneIndex(dist);
    const span = zi < 2 ? C.ZONES[zi + 1].from - C.ZONES[zi].from : 3000;
    const p = ZYRO.U.clamp((dist - C.ZONES[zi].from) / span, 0, 1);
    return ZYRO.U.lerp(C.GAP_TIME[zi][0], C.GAP_TIME[zi][1], p);
  }

  update(game) {
    const C = ZYRO.CONFIG;
    let guard = 0;
    while (this.nextD < game.dist + C.SPAWN_AHEAD && guard++ < 20) this.spawnRow(game);
  }

  // ---------- modelos de fileira por zona ----------
  pickTemplate(zi) {
    const U = ZYRO.U;
    const single = (s, w) => ({ w, rows: [{ cells: s, shuffle: true }] });
    const plat = w => ({ w, rows: [{ platform: true }] });
    const list = [
      single('R..', 5), single('RR.', 3), single('L..', 2.4), single('H..', 2.4),
      single('LLL', 0.8), { w: 1.2, rows: [{ cells: '...', shuffle: false }] }
    ];
    if (this.rows < 4) return { rows: [{ cells: U.pick(['R..', 'RR.', 'R..']), shuffle: true }] }; // introdução
    if (this.rows >= 6) list.push(plat(1.6), single('T..', 1.3));                 // carros voadores aparecem cedo
    if (zi >= 1) list.push(
      single('B..', 3), single('BB.', 1.5), { w: 2.2, rows: [{ gate: true }] },
      single('RL.', 2), single('RH.', 2), single('BL.', 1.2), single('HHH', 0.8), single('BH.', 1),
      plat(1.4), single('TT.', 1.2), single('A..', 1.3), single('TR.', 1)
    );
    if (zi >= 2) list.push(
      { w: 2, rows: [{ cells: 'RR.' }, { cells: 'R.R', gapMul: 0.85 }, { cells: '.RR', gapMul: 0.85 }], mirror: true }, // zigue-zague
      { w: 1.6, rows: [{ cells: 'LLL' }, { cells: 'HHH', gapMul: 0.9 }] },                                          // pula e desliza
      { w: 1.4, rows: [{ gate: true }, { gate: true, gapMul: 0.9 }] },                                               // dois portões
      { w: 1.4, rows: [{ cells: 'B.B' }, { cells: 'RLR', gapMul: 0.85 }, { cells: 'BHB', gapMul: 0.85 }] },          // túnel
      single('TA.', 1.2), plat(1)
    );
    return U.weighted(list);
  }

  activePlatform(d) { return this.platList.some(pl => d > pl.d0 - 1 && d <= pl.d1 + 30); }
  inQuiet(d) { return this.quiet && d >= this.quiet.from && d <= this.quiet.to; }

  // Resolve um modelo em células concretas: 3 letras, índice 0 = faixa -1
  resolveRow(row, mirror, maxShift = 1, d = 0) {
    const U = ZYRO.U, P = ZYRO.CONFIG.PLATFORM;
    if (row.gate) {
      // abertura numa faixa alcançável a partir de onde o jogador pode estar
      const opts = [-1, 0, 1].filter(l => [...this.reach].some(r => Math.abs(l - r) <= maxShift));
      const open = U.pick(opts.length ? opts : [0]);
      const cells = [-1, 0, 1].map(l => (l === open ? '.' : 'G')).join('');
      return { cells, gate: true, open };
    }
    if (row.platform) {
      // carro estacionado numa faixa livre de outros carros e do rastro da contramão
      const busy = l => this.platList.some(pl => pl.lane === l && d <= pl.d1 + 30) ||
                        this.trafficClear.some(tc => tc.lane === l && d <= tc.until);
      const free = [-1, 0, 1].filter(l => !busy(l));
      if (!free.length) return this.resolveRow({ cells: 'R..', shuffle: true }, mirror, maxShift, d);
      const lane = U.pick(free), ramp = Math.random() < P.rampChance;
      const pool = ['.', '.', '.', 'R', 'L', 'T'];
      const cells = [-1, 0, 1].map(l => (l === lane ? (ramp ? 'P' : 'C') : U.pick(pool))).join('');
      return { cells, gate: false, platform: { lane, ramp, cars: U.randInt(1, ZYRO.Progression.zoneIndex(d) ? 3 : 2) } };
    }
    let cells = row.cells.split('');
    if (row.shuffle) U.shuffle(cells);
    if (mirror) cells.reverse();
    return { cells: cells.join(''), gate: false };
  }

  // regras que valem por cima de qualquer modelo (tetos, rastro da contramão, pouso do Jetpack)
  applyForced(cells, d, speed) {
    const a = cells.split('');
    for (const pl of this.platList) {
      if (d > pl.d0 + 0.01 && d <= pl.d1 + 1) a[pl.lane + 1] = 'U';
      else if (d > pl.d1 + 1 && d <= pl.d1 + speed * 0.9 + 2) a[pl.lane + 1] = '.';   // espaço para descer do teto
    }
    for (const tc of this.trafficClear) if (d > tc.from && d <= tc.until && a[tc.lane + 1] !== 'U') a[tc.lane + 1] = '.';
    if (this.inQuiet(d)) for (let i = 0; i < 3; i++) if (a[i] !== 'U') a[i] = '.';
    return a.join('');
  }

  // dá para ir da faixa r (fileira anterior) para a faixa l (esta fileira)?
  static canMove(r, l, cells, maxShift) {
    const c = cells[l + 1];
    if (Math.abs(l - r) > maxShift) return false;
    if (c === 'U') return l === r;                                   // só continua no teto quem já está nele
    if (!'.LHAP'.includes(c)) return false;
    if (Math.abs(l - r) === 2 && cells[1] === 'U') return false;    // não atravessa um carro estacionado
    return true;
  }

  // Faixas alcançáveis na próxima fileira (regra de rota válida)
  static nextReach(reach, cells, maxShift) {
    const out = new Set();
    for (const l of [-1, 0, 1]) for (const r of reach) if (ZYRO.Generator.canMove(r, l, cells, maxShift)) { out.add(l); break; }
    return out;
  }

  // Sem beco sem saída: de TODA faixa possível existe para onde ir
  static noDeadEnd(reach, cells, maxShift) {
    for (const r of reach) if (![-1, 0, 1].some(l => ZYRO.Generator.canMove(r, l, cells, maxShift))) return false;
    return true;
  }

  spawnRow(game) {
    const C = ZYRO.CONFIG, U = ZYRO.U;
    const speed = Math.max(game.speed, ZYRO.Progression.baseSpeed(this.nextD));
    const zi = ZYRO.Progression.zoneIndex(this.nextD);

    if (!this.queue.length) {
      const t = this.pickTemplate(zi);
      const mirror = t.mirror && Math.random() < 0.5;
      this.queue = t.rows.map(r => ({ ...r, mirror }));
    }
    let tmpl = this.queue.shift();
    const gapT = this.gapTime(this.nextD) * (tmpl.gapMul || 1);
    let d = this.lastEnd === 0 ? this.nextD : Math.max(this.nextD, this.lastEnd + gapT * speed);
    // o carro estacionado bloqueia a troca de faixa até o fim dele: a fileira seguinte respeita o tempo de reação a partir dali
    for (const pl of this.platList) if (d > pl.d1 + 1 && d < pl.d1 + gapT * speed) d = pl.d1 + gapT * speed;
    const timeSince = this.lastEnd === 0 ? 9 : (d - this.lastEnd) / speed;
    const maxShift = timeSince >= 0.9 ? 2 : 1;
    // portões ocupam as 3 faixas: não combinam com carros estacionados nem com o pouso do Jetpack
    if (tmpl.gate && (this.activePlatform(d) || this.inQuiet(d) || this.trafficClear.some(tc => d <= tc.until))) tmpl = { cells: 'R..', shuffle: true };
    if (tmpl.platform && this.inQuiet(d)) tmpl = { cells: '...' };

    // tenta até achar uma fileira com rota possível
    let row = null, reach = null;
    for (let i = 0; i < 12 && !reach; i++) {
      // 1ª tentativa: o modelo sorteado; depois: modelos simples
      const src = i < 3 ? tmpl : { cells: U.pick(['R..', 'L..', 'H..', '...']), shuffle: true };
      const cand = this.resolveRow(src, tmpl.mirror, maxShift, d);
      cand.cells = this.applyForced(cand.cells, d, speed);
      const nr = ZYRO.Generator.nextReach(this.reach, cand.cells, maxShift);
      // com carros estacionados no caminho a regra é mais forte: ninguém pode ficar encurralado
      const strict = /[UCP]/.test(cand.cells);
      if (nr.size && (!strict || ZYRO.Generator.noDeadEnd(this.reach, cand.cells, maxShift))) { row = cand; reach = nr; if (i >= 3) this.queue = []; }
    }
    if (!reach) {
      row = { cells: this.applyForced('...', d, speed), gate: false };
      reach = ZYRO.Generator.nextReach(this.reach, row.cells, maxShift); this.queue = [];
    }
    row.strict = /[UCP]/.test(row.cells);

    // cria as entidades
    let len = 0.5;
    if (row.gate) {
      game.obstacles.push({ type: 'G', lane: 0, open: row.open, d, len: ZYRO.OBSTACLE_TYPES.G.len });
    } else {
      [-1, 0, 1].forEach(l => {
        const ch = row.cells[l + 1];
        if ('.UPC'.includes(ch)) return;
        const T = ZYRO.OBSTACLE_TYPES[ch];
        if (T.moving) {
          // carro na contramão: "dm" é onde ele encontra o jogador; a posição real anda na direção dele
          const v = Math.min(C.TRAFFIC.speed[zi], speed * C.TRAFFIC.maxFrac);
          game.obstacles.push({ type: ch, lane: l, d: d + 9999, dm: d, v, len: T.len });
          len = Math.max(len, T.len * speed / (speed + v));
          this.trafficClear.push({ lane: l, from: d, until: d + C.TRAFFIC.clear });
        } else {
          len = Math.max(len, T.len);
          game.obstacles.push({ type: ch, lane: l, d, len: T.len });
        }
      });
    }
    if (row.platform && row.cells[row.platform.lane + 1] !== 'U') {
      const P = C.PLATFORM, pf = row.platform;
      const pl = { lane: pf.lane, ramp: pf.ramp, cars: pf.cars, h: P.height, d0: d, d1: d + (pf.ramp ? P.rampLen : 0) + pf.cars * P.carLen, color: U.randInt(0, 2) };
      this.platList.push(pl);
      game.platforms.push(pl);
      if (pl.ramp && Math.random() < 0.85) {          // cores subindo a rampa e por cima do teto
        for (let cd = d + 1; cd < pl.d1 - 1; cd += 3) game.coins.push({ x: ZYRO.Lanes.x(pl.lane), y: ZYRO.Platform.surface(pl, cd) + 0.75, d: cd, lane: pl.lane, super: false, roof: true });
      }
    }

    // ZYRO CORES e power-ups no espaço antes desta fileira
    this.placeCollectibles(game, row, reach, d);

    this.log.push({ d, cells: row.cells, strict: row.strict, maxShift, timeSince, reachBefore: [...this.reach], reachAfter: [...reach] });
    if (this.log.length > 6000) this.log.shift();
    this.reach = reach;
    this.lastEnd = d + len;
    this.nextD = this.lastEnd + gapT * speed;
    this.rows++;
    // limpa listas antigas
    if (this.platList.length > 12) this.platList = this.platList.filter(pl => pl.d1 + 300 > this.nextD);
    if (this.trafficClear.length > 12) this.trafficClear = this.trafficClear.filter(tc => tc.until + 50 > this.nextD);
  }

  // altura do chão (teto de carro) numa faixa — moedas acompanham
  heightAt(lane, d) {
    let h = 0;
    for (const pl of this.platList) if (pl.lane === lane) h = Math.max(h, ZYRO.Platform.surface(pl, d));
    return h;
  }

  placeCollectibles(game, row, reach, d) {
    const C = ZYRO.CONFIG, U = ZYRO.U;
    const start = Math.max(this.lastEnd + 3, d - 40);
    let lanes = [...reach].filter(l => row.cells[l + 1] !== 'U');     // tetos já têm as próprias moedas
    if (!lanes.length || d - start < 6) return;

    // power-up no lugar das moedas, de tempos em tempos
    if (d > this.nextPowerD) {
      const type = U.weighted([{ w: 1, t: 'magnet' }, { w: 1, t: 'shield' }, { w: 1, t: 'boost' }, { w: 1, t: 'jetpack' }]).t;
      const lane = U.pick(lanes.filter(l => row.cells[l + 1] === '.').concat(lanes));
      const pd = (start + d) / 2;
      game.powerups.push({ type, lane, x: ZYRO.Lanes.x(lane), y: 1.0 + this.heightAt(lane, pd), d: pd });
      this.nextPowerD = d + U.rand(...C.POWERUPS.every);
      return;
    }
    if (Math.random() > 0.72) return;

    // prefere continuar na faixa das moedas anteriores (convida a arriscar)
    const lane = lanes.includes(this.lastCoinLane) && Math.random() < 0.5 ? this.lastCoinLane : U.pick(lanes);
    this.lastCoinLane = lane;
    const cell = row.cells[lane + 1];
    const x = ZYRO.Lanes.x(lane);
    const H = cd => this.heightAt(lane, cd);
    for (let cd = start; cd <= d - (cell === 'L' ? 5 : 2); cd += 3) game.coins.push({ x, y: 0.75 + H(cd), d: cd, lane, super: false });
    if (cell === 'L') {                     // arco de moedas por cima da barreira baixa
      for (let i = 0; i <= 4; i++) {
        const t = i / 4, cd = d - 4 + t * 8.4;
        game.coins.push({ x, y: 0.9 + Math.sin(t * Math.PI) * 1.55, d: cd, lane, super: false });
      }
    } else if (cell === 'H' || cell === 'A') {   // moedas baixas por baixo da barreira elevada / carro alto
      for (let cd = d - 1; cd <= d + 2; cd += 1.5) game.coins.push({ x, y: 0.45, d: cd, lane, super: false });
    }
    // Super Core azul (raro) em outra faixa alcançável
    if (Math.random() < 0.06 && lanes.length > 1) {
      const other = U.pick(lanes.filter(l => l !== lane)), sd = (start + d) / 2;
      game.coins.push({ x: ZYRO.Lanes.x(other), y: 1.0 + this.heightAt(other, sd), d: sd, lane: other, super: true });
    }
  }
};
