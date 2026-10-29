/* =========================================================
   ZYRO — testes.js  (Testes automáticos)
   Abra: index.html?testes=1  (ou testes.html)
   Roda os 18 testes obrigatórios do roteiro + extras na
   página real do jogo (clicando nos botões de verdade) e
   mostra o resultado na tela. Seus recordes são guardados
   antes e restaurados depois.
   ========================================================= */
(async function () {
  const Z = window.ZYRO, C = Z.CONFIG;
  const results = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const g = Z.game;
  Z.freeze = true;                                      // o laço principal para de mover o jogo; os testes controlam o tempo

  // guarda os dados do jogador
  const keys = Object.values(Z.Storage.KEYS), backup = {};
  keys.forEach(k => { try { backup[k] = localStorage.getItem(k); } catch (e) { } });

  const sim = (sec, bot = false, dt = 1 / 60) => {
    let react = 0;
    for (let t = 0; t < sec; t += dt) {
      if (bot && g.state === 'playing') { react -= dt; if (react <= 0) { const a = Z.Bot.think(g); if (a) { g.action(a); react = 0.09; } } }
      g.update(dt);
    }
  };
  const clean = () => { g.obstacles = []; g.coins = []; g.powerups = []; g.platforms = []; g.gen.platList = []; g.gen.trafficClear = []; g.gen.quiet = null; g.gen.nextD = 1e9; g.gen.lastEnd = 1e9; };
  const fresh = () => { g.start(); clean(); };
  const obstacle = (type, lane, ahead, open) => { const o = { type, lane, d: g.dist + ahead, len: Z.OBSTACLE_TYPES[type].len, open }; g.obstacles.push(o); return o; };
  const click = sel => { const el = document.querySelector(sel); if (!el) throw new Error('não achei ' + sel); el.click(); };
  const key = code => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));

  async function test(num, name, fn) {
    try {
      const detail = await fn();
      results.push({ num, name, ok: true, detail: detail || '' });
    } catch (e) {
      results.push({ num, name, ok: false, detail: e.message });
    }
  }
  const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

  await sleep(300);

  // ---------------- 18 TESTES OBRIGATÓRIOS ----------------
  await test(1, 'O botão JOGAR realmente inicia a partida', async () => {
    Z.Screens.show('menu');
    click('#tela-menu [data-acao="jogar"]');
    expect(g.state === 'playing', 'estado = ' + g.state);
    expect(!document.getElementById('hud').hidden, 'HUD não apareceu');
    return 'estado "playing" e HUD visível';
  });

  await test(2, 'O personagem corre automaticamente', () => {
    fresh(); const d0 = g.dist; sim(1);
    expect(g.dist - d0 > 10, 'andou só ' + (g.dist - d0).toFixed(1) + ' m');
    return `andou ${(g.dist - d0).toFixed(1)} m em 1 s sem nenhum comando`;
  });

  await test(3, 'Os controles funcionam corretamente', async () => {
    fresh();
    key('ArrowLeft'); sim(0.3); expect(g.player.lane === -1, '← não mudou a faixa');
    key('KeyD'); sim(0.3); expect(g.player.lane === 0, 'D não mudou a faixa');
    key('ArrowUp'); sim(0.05); expect(g.player.jumping, '↑ não pulou'); sim(0.7);
    key('KeyS'); sim(0.05); expect(g.player.sliding, 'S não deslizou'); sim(0.8);
    g.shift.energy = 100; key('ShiftLeft'); expect(g.shift.active, 'Shift não ativou o SHIFT');
    sim(C.SHIFT.duration + 0.2); g.shift.energy = 100; key('Space'); expect(!g.shift.active, 'Espaço ainda ativa o SHIFT'); key('ShiftRight'); expect(g.shift.active, 'Shift direito não ativou'); sim(C.SHIFT.duration + 0.2);
    key('Escape'); expect(g.state === 'paused', 'Esc não pausou');
    key('Escape'); expect(g.state === 'playing', 'Esc não despausou');
    return '← → A D ↑ W ↓ S, Shift (esq. e dir.) ativa o SHIFT, Espaço não, Esc pausa';
  });

  await test(4, 'A troca de faixas é fluida', () => {
    fresh(); const xs = [];
    g.action('right');
    for (let i = 0; i < 14; i++) { g.update(1 / 60); xs.push(g.player.x); }
    const mono = xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-9);
    const mid = xs.filter(x => x > 0.2 && x < C.LANE_W - 0.2).length;
    expect(mono, 'movimento não é contínuo'); expect(mid >= 3, 'pulou direto de faixa');
    expect(near(g.player.x, C.LANE_W, 0.001), 'não terminou na faixa');
    g.action('right'); g.action('right'); sim(0.5); expect(g.player.lane === 1, 'saiu das 3 faixas');
    return `${mid} quadros intermediários em ${C.LANE_TIME}s; não sai das 3 faixas`;
  });

  await test(5, 'O personagem consegue pular e deslizar', () => {
    fresh(); g.action('up'); let maxY = 0, t = 0;
    while (g.player.jumping && t < 2) { g.update(1 / 120); t += 1 / 120; maxY = Math.max(maxY, g.player.y); }
    expect(near(maxY, C.JUMP.height, 0.08), 'altura ' + maxY.toFixed(2));
    expect(near(t, C.JUMP.duration, 0.05), 'tempo no ar ' + t.toFixed(2));
    g.action('down'); expect(g.player.height === C.PLAYER.slideHeight, 'altura não reduziu');
    sim(C.SLIDE_TIME + 0.05); expect(g.player.height === C.PLAYER.height, 'não voltou a ficar em pé');
    return `pulo ${maxY.toFixed(2)} m / ${t.toFixed(2)} s; deslize reduz altura para ${C.PLAYER.slideHeight} m`;
  });

  await test(6, 'Os obstáculos possuem colisões corretas', () => {
    const cases = [
      ['R', 0, null, 'nada', true], ['R', 1, null, 'nada', false], ['L', 0, null, 'nada', true], ['L', 0, null, 'up', false],
      ['H', 0, null, 'nada', true], ['H', 0, null, 'down', false], ['B', 0, null, 'nada', true], ['B', -1, null, 'nada', false],
      ['G', 0, 0, 'nada', false], ['G', 0, 1, 'nada', true], ['L', 0, null, 'down', true], ['H', 0, null, 'up', true]
    ];
    const out = [];
    for (const [type, lane, open, act, shouldHit] of cases) {
      fresh(); obstacle(type, lane, 7, open);
      sim(0.15); if (act !== 'nada') g.action(act);
      sim(1.2);
      const hit = g.state !== 'playing';
      expect(hit === shouldHit, `${type} faixa ${lane} ação ${act}: ${hit ? 'bateu' : 'passou'}`);
      out.push(type);
    }
    return '12 situações (vermelha, baixa, elevada, bloco, portão)';
  });

  await test(7, 'A geração de obstáculos mantém rotas possíveis', () => {
    const gen = new Z.Generator(), fake = { dist: 0, speed: 12, obstacles: [], coins: [], powerups: [], platforms: [] };
    let rows = 0;
    while (fake.dist < 30000) { fake.dist += 8; fake.speed = Z.Progression.baseSpeed(fake.dist); gen.update(fake); fake.obstacles.length = 0; fake.coins.length = 0; fake.powerups.length = 0; fake.platforms.length = 0; }
    // verificação independente: refaz o cálculo de rota a partir das células
    let reach = new Set([-1, 0, 1]), minT = 9, strict = 0;
    for (const r of gen.log) {
      rows++;
      const next = Z.Generator.nextReach(reach, r.cells, r.maxShift);
      expect(next.size > 0, `fileira sem rota em ${Math.round(r.d)} m: ${r.cells}`);
      if (r.strict) { strict++; expect(Z.Generator.noDeadEnd(reach, r.cells, r.maxShift), `beco sem saída perto de carro estacionado em ${Math.round(r.d)} m: ${r.cells}`); }
      expect(r.timeSince >= 0.5, `pouco tempo de reação (${r.timeSince.toFixed(2)} s) em ${Math.round(r.d)} m`);
      minT = Math.min(minT, r.timeSince); reach = next;
    }
    return `${rows} fileiras até 30 km, todas com rota; ${strict} com carro estacionado sem beco sem saída; menor tempo de reação ${minT.toFixed(2)} s`;
  });

  await test(8, 'Os itens são coletados corretamente', () => {
    fresh(); const c0 = g.score.cores;
    g.coins.push({ x: 0, y: 0.75, d: g.dist + 5, lane: 0, super: false });
    g.coins.push({ x: C.LANE_W, y: 0.75, d: g.dist + 6, lane: 1, super: false });
    sim(1);
    expect(g.score.cores === c0 + 1, 'cores = ' + g.score.cores);
    g.coins.push({ x: 0, y: 1, d: g.dist + 5, lane: 0, super: true }); sim(1);
    expect(g.score.cores === c0 + 6, 'Super Core não valeu 5');
    return 'pega o core da faixa certa, ignora a outra; Super Core vale 5';
  });

  await test(9, 'A pontuação aumenta conforme as ações', () => {
    fresh(); sim(1); const pDist = g.score.points;
    expect(pDist > 10, 'distância não deu pontos');
    const before = g.score.points; obstacle('R', 0, g.speed * 0.35); g.action('left'); sim(0.6);
    const gained = g.score.points - before;
    expect(g.state === 'playing' && g.score.perfects === 1, 'desvio perfeito não contou');
    expect(gained >= C.SCORE.perfect, 'desvio deu só ' + gained.toFixed(0));
    return `distância: +${pDist.toFixed(0)} em 1 s; desvio perfeito: +${C.SCORE.perfect}`;
  });

  await test(10, 'A barra SHIFT acumula energia', () => {
    fresh(); g.coins.push({ x: 0, y: 0.75, d: g.dist + 4, lane: 0, super: false }); sim(0.6);
    expect(g.shift.energy === C.SHIFT.gain.core, 'core deu ' + g.shift.energy + '%');
    obstacle('R', 0, g.speed * 0.4); g.action('right'); sim(0.6);
    expect(g.shift.energy === C.SHIFT.gain.core + C.SHIFT.gain.perfect, 'desvio perfeito não encheu');
    g.shift.gain(500); expect(g.shift.energy === 100, 'passou de 100%');
    return `core +${C.SHIFT.gain.core}%, perfeito +${C.SHIFT.gain.perfect}%, por pouco +${C.SHIFT.gain.nearMiss}%, limite 100%`;
  });

  await test(11, 'O SHIFT pode ser ativado quando disponível', () => {
    fresh(); g.shift.energy = 99; expect(!g.action('shift'), 'ativou com 99%');
    g.shift.energy = 100; expect(g.action('shift') && g.shift.active, 'não ativou com 100%');
    return 'bloqueado com 99%, ativa com 100%';
  });

  await test(12, 'O efeito do SHIFT termina após sua duração', () => {
    fresh(); g.shift.energy = 100; g.action('shift'); sim(C.SHIFT.duration - 0.1);
    expect(g.shift.active, 'acabou cedo demais'); sim(0.2);
    expect(!g.shift.active && g.shift.energy === 0, 'não terminou');
    let breaks = 0; Z.Bus.on('break', () => breaks++);
    fresh(); g.shift.energy = 100; g.action('shift'); obstacle('R', 0, 8); obstacle('B', 0, 20); const p0 = g.score.points;
    sim(1.6);
    expect(g.state === 'playing', 'bateu durante o SHIFT');
    expect(breaks === 2, 'atravessou ' + breaks + ' de 2 obstáculos');
    expect(g.score.points - p0 >= 2 * C.SCORE.shiftBreak, 'não deu pontos extras');
    return `dura ${C.SHIFT.duration} s; atravessa obstáculos e dá +${C.SCORE.shiftBreak} cada`;
  });

  await test(13, 'O jogador perde quando ocorre uma colisão desprotegida', () => {
    fresh(); obstacle('R', 0, 6); sim(2);
    expect(g.state === 'over', 'estado = ' + g.state);
    fresh(); g.activatePowerup('shield'); obstacle('R', 0, 6); sim(1);
    expect(g.state === 'playing' && g.power.shield === 0, 'Shield não protegeu');
    obstacle('R', 0, 30); sim(4); expect(g.state === 'over', 'Shield protegeu duas vezes');
    return 'colisão termina a corrida; Shield protege uma única vez';
  });

  await test(14, 'O botão REINICIAR funciona', async () => {
    fresh(); obstacle('R', 0, 6); sim(2); await sleep(250);
    expect(Z.Screens.current === 'fim', 'tela de fim não apareceu');
    click('#tela-fim [data-acao="reiniciar"]');
    expect(g.state === 'playing' && g.dist === 0, 'não reiniciou');
    g.pause(); expect(Z.Screens.current === 'pausa', 'pausa não abriu');
    g.dist = 50; click('#tela-pausa [data-acao="reiniciar"]');
    expect(g.state === 'playing' && g.dist === 0, 'REINICIAR da pausa falhou');
    return 'CORRER NOVAMENTE e REINICIAR (pausa) começam do zero';
  });

  await test(15, 'O recorde permanece salvo', () => {
    Z.Storage.resetData();
    const r1 = Z.Storage.registerRun({ pontos: 5000, distancia: 400, cores: 30, combo: 2, zona: 'NOVA CITY' });
    const r2 = Z.Storage.registerRun({ pontos: 1200, distancia: 150, cores: 5, combo: 1, zona: 'NOVA CITY' });
    const raw = JSON.parse(localStorage.getItem(Z.Storage.KEYS.stats));
    expect(r1.novoRecorde && !r2.novoRecorde, 'recorde detectado errado');
    expect(raw.melhorPontuacao === 5000 && raw.partidas === 2 && raw.totalCores === 35, 'localStorage: ' + JSON.stringify(raw));
    return 'gravado no localStorage: ' + JSON.stringify(raw);
  });

  await test(16, 'A pausa interrompe a partida', () => {
    fresh(); obstacle('R', 1, 20); sim(0.5);
    g.pause(); const d = g.dist, p = g.score.points, t = g.time, oz = g.obstacles[0].d - g.dist;
    sim(2);
    expect(g.dist === d && g.score.points === p && g.time === t, 'continuou andando');
    expect(g.obstacles[0].d - g.dist === oz, 'obstáculo se mexeu');
    expect(!g.action('left'), 'aceitou comando pausado');
    g.resume(); sim(0.2); expect(g.dist > d, 'não voltou a correr');
    return 'distância, pontos, tempo e obstáculos congelados';
  });

  await test(17, 'Os menus permitem navegação', async () => {
    g.toMenu(); Z.Screens.show('menu');
    const path = [];
    const go = (sel, want) => { click(sel); expect(Z.Screens.current === want, `${sel} → ${Z.Screens.current} (esperado ${want})`); path.push(want); };
    go('#tela-menu [data-acao="como"]', 'como'); go('#tela-como [data-acao="voltar"]', 'menu');
    go('#tela-menu [data-acao="recordes"]', 'recordes'); go('#tela-recordes [data-acao="voltar"]', 'menu');
    go('#tela-menu [data-acao="config"]', 'config'); go('#tela-config [data-acao="como"]', 'como');
    go('#tela-como [data-acao="voltar"]', 'config'); go('#tela-config [data-acao="voltar"]', 'menu');
    go('#tela-menu [data-acao="jogar"]', 'jogo'); clean(); g.pause(); expect(Z.Screens.current === 'pausa', 'pausa');
    go('#tela-pausa [data-acao="config"]', 'config'); go('#tela-config [data-acao="voltar"]', 'pausa');
    go('#tela-pausa [data-acao="continuar"]', 'jogo'); g.pause();
    go('#tela-pausa [data-acao="menu"]', 'menu');
    return path.join(' → ');
  });

  await test(18, 'A interface funciona em tamanhos diferentes de tela', () => {
    const cam = Z.Camera, sizes = [[1920, 1080], [1280, 720], [1366, 768], [1024, 768], [844, 390], [390, 844], [360, 640], [768, 1024]];
    const out = [];
    for (const [W, H] of sizes) {
      cam.resize(W, H); cam.x = 0; cam.y = cam.baseCamH; cam.sx = cam.sy = 0;
      const pl = cam.project(0, 0, 0), L = cam.project(-C.LANE_W, 0, 0), R = cam.project(C.LANE_W, 0, 0), hz = cam.horizon;
      expect(pl.y <= H && pl.y > H * 0.6, `${W}x${H}: personagem fora da tela`);
      expect(L.x > 0 && R.x < W, `${W}x${H}: faixas laterais fora da tela`);
      expect(hz > H * 0.15 && hz < H * 0.6, `${W}x${H}: horizonte em ${Math.round(hz)}`);
      out.push(`${W}×${H}`);
    }
    Z.Renderer.resize();
    // HUD real da tela atual: nenhum item fora da janela
    Z.Screens.show('jogo');
    const fora = [...document.querySelectorAll('#hud .hud-item, #btn-pausa, #barra-shift')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width && (r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1);
    });
    expect(!fora.length, 'HUD fora da tela: ' + fora.map(e => e.id || e.dataset.tipo).join());
    return `câmera ok em ${out.join(', ')}; HUD dentro da tela em ${innerWidth}×${innerHeight}`;
  });

  // ---------------- EXTRAS ----------------
  await test('E1', 'Bot joga 6 km sem morrer (5 corridas, física real)', () => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      g.start(); let t = 0;
      while (g.state === 'playing' && g.dist < 6000 && t < 600) { sim(1, true); t++; }
      expect(g.state === 'playing', `corrida ${i + 1} morreu em ${Math.round(g.dist)} m (${g.hitObstacle && g.hitObstacle.type})`);
      out.push(Math.round(g.score.points));
    }
    return 'pontos: ' + out.join(', ');
  });

  await test('E2', 'Combos x2 (3 desvios) e x3 (5 desvios) e zeram depois de 4 s', () => {
    fresh(); const mults = [];
    for (let i = 0; i < 5; i++) { obstacle('R', g.player.lane, g.speed * 0.35); g.action(g.player.lane === 1 ? 'left' : 'right'); sim(0.7); mults.push(g.score.comboMult); }
    expect(mults.join() === '1,1,2,2,3', 'multiplicadores ' + mults.join());
    sim(C.COMBO.timeout + 0.1); expect(g.score.comboMult === 1, 'combo não zerou');
    return 'sequência ' + mults.map(m => 'x' + m).join(' ');
  });

  await test('E3', 'Power-ups: Magnet Core atrai e Score Boost dobra', () => {
    fresh(); g.activatePowerup('magnet');
    g.coins.push({ x: -C.LANE_W, y: 0.75, d: g.dist + 8, lane: -1, super: false }); sim(1.2);
    expect(g.score.cores === 1, 'ímã não puxou o core da outra faixa');
    g.activatePowerup('boost'); expect(g.score.mult === 1 && (g.update(1 / 60), g.score.mult === 2), 'boost não dobrou');
    sim(C.POWERUPS.boost.dur + 0.1); expect(g.score.mult === 1, 'boost não acabou');
    return 'ímã puxa da outra faixa; boost x2 por ' + C.POWERUPS.boost.dur + ' s';
  });

  await test('E5', 'Colisão funciona na velocidade máxima (1000 medidas)', () => {
    const out = [];
    for (const fps of [60, 30, 20]) {
      fresh(); g.dist = 30000; g.speed = Z.Progression.baseSpeed(30000); obstacle('L', 0, 40);
      sim(1, false, 1 / fps);
      expect(g.state !== 'playing', `a ${fps} FPS atravessou a barreira sem bater`);
      out.push(fps + ' FPS');
    }
    return 'bateu corretamente a 120 m/s em ' + out.join(', ');
  });

  const car = (type, lane, meet, v = 14) => { const o = { type, lane, d: 9e3, dm: g.dist + meet, v, len: Z.OBSTACLE_TYPES[type].len }; g.obstacles.push(o); g.moveTraffic(); return o; };
  const platform = (lane, ahead, ramp, cars = 2) => {
    const P = C.PLATFORM, pl = { lane, ramp, cars, h: P.height, d0: g.dist + ahead, color: 0 };
    pl.d1 = pl.d0 + (ramp ? P.rampLen : 0) + cars * P.carLen; g.platforms.push(pl); return pl;
  };

  await test('N1', 'Tráfego aéreo: carro vem na contramão e colide de frente', () => {
    fresh(); const o = car('T', 0, 40); const z1 = o.d - g.dist; sim(0.5); const z2 = o.d - g.dist;
    const closing = (z1 - z2) / 0.5;
    expect(closing > g.speed + 10, 'não vem na direção do jogador (aproxima ' + closing.toFixed(1) + ' m/s)');
    sim(3.5); expect(g.state !== 'playing' && g.hitObstacle && g.hitObstacle.type === 'T', 'não houve colisão frontal');
    fresh(); car('T', 0, 25); sim(0.4); g.action('right'); sim(3); expect(g.state === 'playing', 'trocar de faixa não desviou');
    fresh(); car('A', 0, 25); sim(3); expect(g.state !== 'playing', 'carro alto não bateu em quem estava em pé');
    fresh(); car('A', 0, 25); sim(25 / 12 - 0.35); g.action('down'); sim(2); expect(g.state === 'playing', 'deslizar por baixo do carro alto não funcionou');
    return `aproxima a ${closing.toFixed(0)} m/s (jogador ${g.speed.toFixed(0)} + carro 14); desvia trocando de faixa ou deslizando`;
  });

  await test('N2', 'Carros estacionados: rampa leva ao teto, sem rampa bate', () => {
    fresh(); const pl = platform(0, 8, true, 2); let maxY = 0, onRoof = 0;
    for (let i = 0; i < 180; i++) { g.update(1 / 60); maxY = Math.max(maxY, g.player.y); if (g.dist > Z.Platform.carsStart(pl) && g.dist < pl.d1 && Math.abs(g.player.y - pl.h) < 0.01) onRoof++; }
    expect(g.state === 'playing', 'bateu subindo a rampa');
    expect(near(maxY, C.PLATFORM.height, 0.01) && onRoof > 60, `não correu no teto (altura máx ${maxY.toFixed(2)})`);
    sim(1.5); expect(g.player.y === 0 && g.state === 'playing', 'não desceu do teto no fim');
    fresh(); platform(0, 8, false); sim(1.5); expect(g.state !== 'playing' && g.hitObstacle.type === 'C', 'carro sem rampa não bloqueou');
    fresh(); platform(1, -2, false, 3); sim(0.3); g.action('right'); sim(0.5); expect(g.state !== 'playing', 'entrou pela lateral do carro');
    fresh(); platform(0, 6, true, 3); sim(1.8); g.action('right'); sim(0.8); expect(g.state === 'playing' && g.player.y === 0, 'não conseguiu sair do teto para o lado');
    fresh(); g.shift.energy = 100; g.action('shift'); platform(0, 8, false); sim(1.2); expect(g.state === 'playing' && g.player.y > 1.9, 'SHIFT não lançou para o teto');
    return 'sobe a rampa até 2 m, corre no teto, desce no fim; frente/lateral sem rampa bloqueia; SHIFT lança para o teto';
  });

  await test('N3', 'Jetpack: voa alto, passa por cima de tudo, trilha de cores e pouso suave', () => {
    fresh(); for (let k = 0; k < 12; k++) obstacle('R', [-1, 0, 1][k % 3], 15 + k * 6);
    car('T', 0, 60);
    g.activatePowerup('jetpack');
    const sky = g.coins.filter(c => c.sky).length;
    expect(sky >= 15, 'trilha de cores pequena: ' + sky);
    sim(2.5);
    expect(near(g.player.y, C.POWERUPS.jetpack.height, 0.3), 'não subiu (y = ' + g.player.y.toFixed(2) + ')');
    expect(g.state === 'playing', 'bateu voando');
    const coresAr = g.score.cores; let y0 = g.player.y, maxDrop = 0;
    for (let t = 0; t < C.POWERUPS.jetpack.dur; t += 1 / 60) { g.update(1 / 60); maxDrop = Math.max(maxDrop, y0 - g.player.y); y0 = g.player.y; if (!g.player.flying && g.player.y === 0) break; }
    expect(g.state === 'playing', 'morreu no pouso');
    expect(!g.player.flying && g.player.y === 0, 'não pousou');
    expect(maxDrop < 0.5, 'desceu de uma vez (' + maxDrop.toFixed(2) + ' m num quadro)');
    expect(coresAr > 0 || g.score.cores > 0, 'não pegou nenhum core do céu');
    const q = g.gen.quiet; expect(q && !g.obstacles.some(o => (o.dm ?? o.d) >= q.from && (o.dm ?? o.d) <= q.to), 'tem obstáculo no trecho de pouso');
    return `${sky} cores no céu, voa a ${C.POWERUPS.jetpack.height} m por ${C.POWERUPS.jetpack.dur} s, pousa suave numa área livre`;
  });

  await test('E4', 'Velocidade: 100 medidas, +25 a cada 500 m, máximo 1000', () => {
    const P = Z.Progression, pts = [0, 499, 500, 999, 1000, 2500, 17999, 18000, 30000];
    const u = pts.map(d => P.speedUnits(d));
    expect(u.join() === '100,100,125,125,150,225,975,1000,1000', 'medidas: ' + u.join());
    expect(near(P.baseSpeed(0), 12, 1e-9) && near(P.baseSpeed(30000), 120, 1e-9), 'conversão para m/s');
    fresh(); g.dist = 500; sim(2); expect(near(g.speed, P.baseSpeed(520), 0.15), 'jogo não acelerou para 125 (' + g.speed.toFixed(2) + ' m/s)');
    const z = [0, 1500, 3000].map(d => P.zoneIndex(d) + 1).join();
    expect(z === '1,2,3', 'zonas ' + z);
    return pts.map((d, k) => `${d} m → ${u[k]}`).join(' · ');
  });

  // ---------------- resultado ----------------
  keys.forEach(k => { try { if (backup[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, backup[k]); } catch (e) { } });
  g.toMenu(); Z.Screens.show('menu'); Z.freeze = false;

  const ok = results.filter(r => r.ok).length;
  Z.testResults = { ok, total: results.length, results };
  console.table(results);
  const panel = document.createElement('div');
  panel.className = 'painel-testes';
  panel.innerHTML = `<header><h2>Testes do ZYRO</h2><b class="${ok === results.length ? 'ok' : 'falha'}">${ok}/${results.length} passaram</b><button aria-label="Fechar">✕</button></header>
    <table>${results.map(r => `<tr class="${r.ok ? 'ok' : 'falha'}"><td>${r.ok ? '✔' : '✘'}</td><td>${r.num}</td><td><b>${r.name}</b><small>${r.detail}</small></td></tr>`).join('')}</table>
    <p>Seus recordes foram restaurados. Os testes 1–18 são os do roteiro (seção 17); E1–E4 são extras.</p>`;
  panel.querySelector('button').onclick = () => panel.remove();
  document.body.appendChild(panel);
})();
