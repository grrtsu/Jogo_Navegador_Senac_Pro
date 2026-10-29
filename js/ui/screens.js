/* =========================================================
   ZYRO — screens.js  (Telas e menus)

   Menu, Como jogar, Pausa, Game Over, Recordes e Configurações.
   Todas as telas já existem no index.html; mostrar uma tela é
   só tirar o atributo "hidden" dela e colocar nas outras.

   Os botões não têm um addEventListener cada: eles têm o
   atributo data-acao="..." e UM único ouvinte no documento
   decide o que fazer (delegação de eventos). Assim, criar um
   botão novo é só escrever o HTML com o data-acao certo.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Screens = {
  current: 'menu', prev: 'menu',

  init(game) {
    this.game = game;
    this.$ = id => document.getElementById(id);
    this.screens = [...document.querySelectorAll('.tela')];

    // artes geradas em SVG (art.js)
    document.querySelectorAll('.logo__simbolo').forEach(el => (el.innerHTML = ZYRO.Art.logoSymbol()));
    this.$('menu-heroi').innerHTML = ZYRO.Art.hero('pump');
    // legenda de obstáculos da tela Como jogar: [letra, nome, o que fazer]
    this.$('legenda-obstaculos').innerHTML = [
      ['R', 'Barreira vermelha', 'Troque de faixa'], ['L', 'Barreira baixa', 'Pule'], ['H', 'Barreira elevada', 'Deslize'],
      ['B', 'Bloco energético', 'Troque de faixa'], ['G', 'Portão de energia', 'Vá para a faixa verde'],
      ['T', 'Carro na contramão', 'Troque de faixa (alto: deslize)'], ['P', 'Carro estacionado', 'Suba pela rampa e corra no teto'],
      ['J', 'Jetpack', 'Voe 9 s e pegue os cores do céu']
    ].map(([letter, name, todo]) =>
      `<div class="legenda"><span class="legenda__arte">${ZYRO.Art.obstacle(letter)}</span><span><b>${name}</b><small>${todo}</small></span></div>`
    ).join('');

    // delegação de eventos: um ouvinte para todos os botões com data-acao
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-acao]');
      if (!button) return;
      ZYRO.Audio.unlock(); ZYRO.Audio.play('click');
      this.act(button.dataset.acao);
    });
    this.$('btn-pausa').addEventListener('click', () => { ZYRO.Audio.play('click'); game.pause(); });
    // botão SHIFT do celular: pointerdown (e não click) para reagir no instante do toque
    this.$('btn-shift').addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); game.action('shift'); });
    this.$('btn-som').addEventListener('click', () => {
      const config = ZYRO.Storage.config(); config.musica = !config.musica;
      ZYRO.Storage.saveConfig(config); this.applyConfig(config); this.fillConfig();
    });

    this.initConfig();
    this.listen();
    this.show('menu');
  },

  // ---------- Navegação ----------
  returnTo: {},
  show(name) {
    if (name !== this.current) {
      // lembra de onde veio, para o botão Voltar (ex.: Configurações aberta pela Pausa volta para a Pausa)
      const subScreens = ['como', 'recordes', 'config'];
      if (subScreens.includes(name) && !subScreens.includes(this.current)) this.returnTo = { base: this.current };
      if (name === 'como' && this.current === 'config') this.returnTo.como = 'config';
      this.prev = this.current; this.current = name;
    }
    for (const screen of this.screens) {
      const visible = screen.dataset.tela === name;
      screen.hidden = !visible;
      // reinicia a animação de entrada (tirar e pôr a classe; o offsetWidth força o navegador a "perceber")
      if (visible) { screen.classList.remove('entrando'); void screen.offsetWidth; screen.classList.add('entrando'); }
    }
    const inGame = ['jogo', 'pausa'].includes(name);
    this.$('hud').hidden = !(inGame || name === 'fim-jogo');
    document.body.classList.toggle('em-jogo', name === 'jogo');
    document.body.dataset.tela = name;
    if (name === 'menu') this.fillMenu();
    if (name === 'recordes') this.fillRecords();
    if (name === 'config') this.fillConfig();
    if (name === 'como') this.startDemos(); else this.stopDemos();
    // no computador, foca o primeiro botão (dá para navegar só com Tab e Enter)
    const firstButton = document.querySelector(`.tela[data-tela="${name}"] .btn`);
    if (firstButton && name !== 'jogo' && matchMedia('(pointer: fine)').matches) firstButton.focus({ preventScroll: true });
  },

  act(action) {
    const game = this.game;
    switch (action) {
      case 'jogar': case 'reiniciar': this.play(); break;
      case 'como': this.show('como'); break;
      case 'recordes': this.show('recordes'); break;
      case 'config': this.show('config'); break;
      case 'continuar': game.resume(); break;
      case 'menu': game.toMenu(); ZYRO.Scenery.setZone(0, true); this.show('menu'); break;
      case 'voltar': {
        let back = (this.current === 'como' && this.returnTo.como) || this.returnTo.base || 'menu';
        if (this.current === 'como') this.returnTo.como = null;
        // a tela de origem pode não fazer mais sentido (ex.: a partida acabou enquanto estava na Pausa)
        if (back === 'pausa' && game.state !== 'paused') back = 'menu';
        if (back === 'fim' && game.state !== 'over') back = 'menu';
        if (back === 'jogo') back = game.state === 'paused' ? 'pausa' : 'menu';
        this.show(back);
        break;
      }
    }
  },

  play() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // Enter não "clica" de novo
    ZYRO.Audio.unlock();
    ZYRO.Scenery.setZone(0, true);
    this.show('jogo');
    this.game.start();
    ZYRO.Audio.startMusic();
    ZYRO.Audio.muffle(false);
  },

  // Enter e Esc fora da corrida
  key(action) {
    const game = this.game;
    if (action === 'pause') {
      if (game.state === 'playing') game.pause();
      else if (game.state === 'paused' && this.current === 'pausa') game.resume();
      else if (['como', 'recordes', 'config'].includes(this.current)) this.act('voltar');
      return;
    }
    if (action === 'confirm') {
      if (this.current === 'menu' || this.current === 'como' || this.current === 'fim') this.play();
      else if (this.current === 'pausa') game.resume();
    }
  },

  listen() {
    const Bus = ZYRO.Bus, game = this.game;
    Bus.on('pause', () => {
      this.$('pausa-resumo').textContent = `Pontos ${ZYRO.Utils.fmtScore(game.score.points)} · ${ZYRO.Utils.fmt(game.distance)} m`;
      this.show('pausa'); ZYRO.Audio.muffle(true);
    });
    Bus.on('resume', () => { this.show('jogo'); ZYRO.Audio.muffle(false); });
    Bus.on('gameover', result => { setTimeout(() => this.fillGameOver(result), 120); });
    // trocou de aba ou minimizou: pausa sozinho
    document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
  },

  // ---------- Conteúdo das telas ----------
  fillMenu() {
    const stats = ZYRO.Storage.stats();
    this.$('menu-recorde').textContent = ZYRO.Utils.fmt(stats.melhorPontuacao);
    this.$('menu-cores').textContent = ZYRO.Utils.fmt(stats.totalCores);
  },

  fillGameOver(result) {
    const obstacleName = result.obstaculo ? ZYRO.OBSTACLE_TYPES[result.obstaculo].nome.toLowerCase() : 'um obstáculo';
    // artigo certo em português: "num carro", "no portão", "na barreira"
    const article = 'BTAC'.includes(result.obstaculo || '-') ? 'num' : result.obstaculo === 'G' ? 'no' : 'na';
    const zoneName = result.zona.toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());   // "NOVA CITY" → "Nova City"
    this.$('fim-causa').textContent = `Você bateu ${article} ${obstacleName} em ${zoneName}.`;
    this.$('fim-pontos').textContent = ZYRO.Utils.fmt(result.pontos);
    this.$('fim-distancia').textContent = ZYRO.Utils.fmt(result.distancia) + ' m';
    this.$('fim-cores').textContent = ZYRO.Utils.fmt(result.cores) + ' cores';
    this.$('fim-combo').textContent = 'x' + result.combo;
    this.$('fim-recorde').textContent = ZYRO.Utils.fmt(result.stats.melhorPontuacao);
    this.$('fim-novo').hidden = !result.novoRecorde;
    this.$('fim-badge').hidden = !result.novoRecorde;
    this.$('fim-placar').classList.toggle('placar--recorde', result.novoRecorde);
    this.$('fim-heroi').innerHTML = ZYRO.Art.hero(result.novoRecorde ? 'both' : 'pump');
    this.$('fim-heroi').classList.toggle('comemora', result.novoRecorde);
    if (result.novoRecorde) ZYRO.Audio.play('record');
    ZYRO.Audio.muffle(true);
    this.show('fim');
  },

  fillRecords() {
    const stats = ZYRO.Storage.stats(), history = ZYRO.Storage.history(), fmt = ZYRO.Utils.fmt;
    const cards = [   // [rótulo, valor, ícone, cor]
      ['MELHOR PONTUAÇÃO', fmt(stats.melhorPontuacao), 'trofeu', '#FFD447'],
      ['MAIOR DISTÂNCIA', fmt(stats.maiorDistancia) + ' m', 'bandeira', '#00D9FF'],
      ['TOTAL DE CORES', fmt(stats.totalCores), 'core', '#FFD447'],
      ['MELHOR COMBO', 'x' + stats.melhorCombo, 'estrela', '#FF4FBF'],
      ['PARTIDAS JOGADAS', fmt(stats.partidas), 'play', '#42EDAA']
    ];
    this.$('cards-estat').innerHTML = cards.map(([label, value, icon, color]) =>
      `<div class="card-estat" style="--cor:${color}"><span class="card-estat__selo"><svg><use href="#i-${icon}"/></svg></span><small>${label}</small><b>${value}</b></div>`).join('');

    // "Hoje, 14:32" · "Ontem, 09:10" · "21/10/2026, 18:00"
    const formatDate = timestamp => {
      const date = new Date(timestamp), today = new Date(), yesterday = new Date(Date.now() - 864e5);
      const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (date.toDateString() === today.toDateString()) return 'Hoje, ' + time;
      if (date.toDateString() === yesterday.toDateString()) return 'Ontem, ' + time;
      return date.toLocaleDateString('pt-BR') + ', ' + time;
    };
    const rows = history.length
      ? history.map(run => `<tr><td>${formatDate(run.data)}</td><td>${fmt(run.pontos)}</td><td>${fmt(run.distancia)} m</td><td>${run.zona}</td></tr>`).join('')
      : `<tr><td colspan="4" class="vazio">Nenhuma corrida ainda. Que tal a primeira?</td></tr>`;
    this.$('tabela-historico').innerHTML = `<table><thead><tr><th>ÚLTIMAS CORRIDAS</th><th>PONTOS</th><th>DISTÂNCIA</th><th>ZONA</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  // ---------- Configurações ----------
  // Cada controle lê a configuração salva, muda um campo, salva e aplica na hora.
  initConfig() {
    const $ = this.$;
    const save = config => { ZYRO.Storage.saveConfig(config); this.applyConfig(config); };
    const change = mutate => { const config = ZYRO.Storage.config(); mutate(config); save(config); };

    $('cfg-efeitos').addEventListener('input', event => change(config => { config.volumeEfeitos = event.target.value / 100; }));
    $('cfg-efeitos').addEventListener('change', () => ZYRO.Audio.play('core'));          // som de exemplo ao soltar
    $('cfg-musica-vol').addEventListener('input', event => change(config => { config.volumeMusica = event.target.value / 100; }));
    $('cfg-musica').addEventListener('click', () => { change(config => { config.musica = !config.musica; }); this.fillConfig(); });
    $('cfg-reduzir').addEventListener('click', () => { change(config => { config.reduzirAnimacoes = !config.reduzirAnimacoes; }); this.fillConfig(); });
    $('cfg-qualidade').addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      change(config => { config.qualidade = button.dataset.v; }); this.fillConfig();
    });

    // refazer o tutorial na próxima corrida
    $('btn-tutorial').addEventListener('click', () => {
      ZYRO.Storage.setTutorialDone(false);
      this.flashLabel($('btn-tutorial'), 'NA PRÓXIMA CORRIDA', 'REFAZER');
    });

    // apagar dados: pede confirmação antes (ação que não dá para desfazer)
    $('btn-apagar').addEventListener('click', () => { $('dialogo').hidden = false; $('dialogo-nao').focus(); });
    $('dialogo-nao').addEventListener('click', () => { $('dialogo').hidden = true; });
    $('dialogo-sim').addEventListener('click', () => {
      ZYRO.Storage.resetData(); $('dialogo').hidden = true;
      ZYRO.HUD.best = 0; this.fillMenu();
      this.flashLabel($('btn-apagar'), 'DADOS APAGADOS', 'APAGAR DADOS');
    });
    this.applyConfig(ZYRO.Storage.config());
  },

  // troca o texto de um botão por alguns segundos (confirmação visual)
  flashLabel(button, temporary, original) {
    const label = button.querySelector('span');
    label.textContent = temporary;
    setTimeout(() => (label.textContent = original), 1800);
  },

  // mostra nos controles o que está salvo
  fillConfig() {
    const config = ZYRO.Storage.config(), $ = this.$;
    $('cfg-efeitos').value = Math.round(config.volumeEfeitos * 100);
    $('cfg-musica-vol').value = Math.round(config.volumeMusica * 100);
    $('cfg-musica').setAttribute('aria-checked', config.musica);
    $('cfg-reduzir').setAttribute('aria-checked', config.reduzirAnimacoes);
    for (const button of $('cfg-qualidade').children) {
      const selected = button.dataset.v === config.qualidade;
      button.classList.toggle('ativo', selected); button.setAttribute('aria-checked', selected);
    }
    $('btn-som').querySelector('use').setAttribute('href', config.musica ? '#i-som' : '#i-mudo');
  },

  // aplica a configuração no jogo de verdade (som, gráficos, animações)
  applyConfig(config) {
    ZYRO.Audio.setVolumes(config.volumeEfeitos, config.volumeMusica, config.musica);
    ZYRO.Renderer.setOptions(config.qualidade, config.reduzirAnimacoes);
    document.body.classList.toggle('reduzir', config.reduzirAnimacoes);
    this.$('btn-som').querySelector('use').setAttribute('href', config.musica ? '#i-som' : '#i-mudo');
  },

  // ---------- Animações da tela Como jogar ----------
  // Um laço de animação próprio, ligado só enquanto a tela está aberta (não gasta processamento à toa).
  startDemos() {
    if (this.demoFrame) return;
    const canvases = [...document.querySelectorAll('canvas.demo')];
    const startTime = performance.now();
    const loop = now => {
      const seconds = (now - startTime) / 1000;
      for (const canvas of canvases) this.drawDemo(canvas, canvas.dataset.demo, seconds);
      this.demoFrame = requestAnimationFrame(loop);
    };
    this.demoFrame = requestAnimationFrame(loop);
  },
  stopDemos() { if (this.demoFrame) cancelAnimationFrame(this.demoFrame); this.demoFrame = null; },

  // mini pista + Zyro fazendo o movimento do card (lane, jump, slide ou shift)
  drawDemo(canvas, kind, t) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const horizon = 34, centerX = W / 2;
    ctx.fillStyle = 'rgba(16,26,53,.55)';
    ctx.beginPath(); ctx.moveTo(centerX - 14, horizon); ctx.lineTo(centerX + 14, horizon); ctx.lineTo(W + 40, H); ctx.lineTo(-40, H); ctx.closePath(); ctx.fill();
    // faixas tracejadas andando (lineDashOffset muda com o tempo)
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 60;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(centerX + side * 5, horizon); ctx.lineTo(centerX + side * 52, H); ctx.stroke(); }
    ctx.setLineDash([]);

    const pose = { phase: t * 11, jump: 0, slide: 0, tilt: 0, shift: false, land: 0, hit: 0 };
    let x = centerX, y = H - 10;
    const cycle = t % 1.6;   // cada demo se repete a cada 1,6 s
    if (kind === 'lane') { x = centerX + Math.sin(t * 2.2) * 52; pose.tilt = Math.cos(t * 2.2) * 0.9; }
    if (kind === 'jump' && cycle < 0.62) { const k = cycle / 0.62; y -= Math.sin(k * Math.PI) * 52; pose.jump = Math.min(1, Math.sin(k * Math.PI) * 2.5); }
    if (kind === 'slide') pose.slide = cycle < 0.9 ? Math.min(1, Math.sin((cycle / 0.9) * Math.PI) * 2.5) : 0;
    if (kind === 'shift') {
      pose.shift = true;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = i * 0.8 + t * 0.4, radius = 40 + ((t * 120 + i * 30) % 90);
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * radius, 70 + Math.sin(angle) * radius * 0.6);
        ctx.lineTo(centerX + Math.cos(angle) * (radius + 18), 70 + Math.sin(angle) * (radius + 18) * 0.6);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(5,8,25,.35)'; ctx.beginPath(); ctx.ellipse(x, H - 10, 24, 6, 0, 0, 7); ctx.fill();   // sombra
    ZYRO.Character.draw(ctx, x, y, 62, pose);
  }
};
