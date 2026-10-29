/* =========================================================
   ZYRO — screens.js  (Interface e menus)
   Menu, Como jogar, Pausa, Game Over, Recordes e
   Configurações. Navegação por botões [data-acao].
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Screens = {
  current: 'menu', prev: 'menu',

  init(game) {
    this.game = game;
    this.$ = id => document.getElementById(id);
    this.screens = [...document.querySelectorAll('.tela')];

    // artes
    document.querySelectorAll('.logo__simbolo').forEach(el => (el.innerHTML = ZYRO.Art.logoSymbol()));
    this.$('menu-heroi').innerHTML = ZYRO.Art.hero('pump');
    this.$('legenda-obstaculos').innerHTML = [
      ['R', 'Barreira vermelha', 'Troque de faixa'], ['L', 'Barreira baixa', 'Pule'], ['H', 'Barreira elevada', 'Deslize'],
      ['B', 'Bloco energético', 'Troque de faixa'], ['G', 'Portão de energia', 'Vá para a faixa verde'],
      ['T', 'Carro na contramão', 'Troque de faixa (alto: deslize)'], ['P', 'Carro estacionado', 'Suba pela rampa e corra no teto'],
      ['J', 'Jetpack', 'Voe 9 s e pegue os cores do céu']
    ].map(([t, n, a]) => `<div class="legenda"><span class="legenda__arte">${ZYRO.Art.obstacle(t)}</span><span><b>${n}</b><small>${a}</small></span></div>`).join('');

    // botões com data-acao (delegação de eventos)
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      ZYRO.Audio.unlock(); ZYRO.Audio.play('click');
      this.act(b.dataset.acao);
    });
    this.$('btn-pausa').addEventListener('click', () => { ZYRO.Audio.play('click'); game.pause(); });
    const shiftBtn = this.$('btn-shift');
    shiftBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); game.action('shift'); });
    this.$('btn-som').addEventListener('click', () => {
      const cfg = ZYRO.Storage.config(); cfg.musica = !cfg.musica; ZYRO.Storage.saveConfig(cfg); this.applyConfig(cfg); this.fillConfig();
    });

    this.initConfig();
    this.listen();
    this.show('menu');
  },

  // ---------- navegação ----------
  returnTo: {},
  show(name) {
    if (name !== this.current) {
      // lembra de onde veio para o botão Voltar (ex.: Configurações aberta pela Pausa)
      if (['como', 'recordes', 'config'].includes(name) && !['como', 'recordes', 'config'].includes(this.current)) this.returnTo = { base: this.current };
      if (name === 'como' && this.current === 'config') this.returnTo.como = 'config';
      this.prev = this.current; this.current = name;
    }
    for (const s of this.screens) {
      const on = s.dataset.tela === name;
      s.hidden = !on;
      if (on) { s.classList.remove('entrando'); void s.offsetWidth; s.classList.add('entrando'); }
    }
    const inGame = ['jogo', 'pausa'].includes(name);
    this.$('hud').hidden = !(inGame || name === 'fim-jogo');
    document.body.classList.toggle('em-jogo', name === 'jogo');
    document.body.dataset.tela = name;
    if (name === 'menu') this.fillMenu();
    if (name === 'recordes') this.fillRecords();
    if (name === 'config') this.fillConfig();
    if (name === 'como') this.startDemos(); else this.stopDemos();
    const first = document.querySelector(`.tela[data-tela="${name}"] .btn`);
    if (first && name !== 'jogo' && matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
  },

  act(a) {
    const g = this.game;
    switch (a) {
      case 'jogar': case 'reiniciar': this.play(); break;
      case 'como': this.show('como'); break;
      case 'recordes': this.show('recordes'); break;
      case 'config': this.show('config'); break;
      case 'continuar': g.resume(); break;
      case 'menu': g.toMenu(); ZYRO.Scenery.setZone(0, true); this.show('menu'); break;
      case 'voltar': {
        let back = (this.current === 'como' && this.returnTo.como) || this.returnTo.base || 'menu';
        if (this.current === 'como') this.returnTo.como = null;
        if (back === 'pausa' && g.state !== 'paused') back = 'menu';
        if (back === 'fim' && g.state !== 'over') back = 'menu';
        if (back === 'jogo') back = g.state === 'paused' ? 'pausa' : 'menu';
        this.show(back);
        break;
      }
    }
  },

  play() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    ZYRO.Audio.unlock();
    ZYRO.Scenery.setZone(0, true);
    this.show('jogo');
    this.game.start();
    ZYRO.Audio.startMusic();
    ZYRO.Audio.muffle(false);
  },

  // tecla Enter / Esc fora da corrida
  key(a) {
    const g = this.game;
    if (a === 'pause') {
      if (g.state === 'playing') g.pause();
      else if (g.state === 'paused' && this.current === 'pausa') g.resume();
      else if (['como', 'recordes', 'config'].includes(this.current)) this.act('voltar');
      return;
    }
    if (a === 'confirm') {
      if (this.current === 'menu' || this.current === 'como') this.play();
      else if (this.current === 'fim') this.play();
      else if (this.current === 'pausa') g.resume();
    }
  },

  listen() {
    const B = ZYRO.Bus, g = this.game;
    B.on('pause', () => { this.$('pausa-resumo').textContent = `Pontos ${ZYRO.U.fmtScore(g.score.points)} · ${ZYRO.U.fmt(g.dist)} m`; this.show('pausa'); ZYRO.Audio.muffle(true); });
    B.on('resume', () => { this.show('jogo'); ZYRO.Audio.muffle(false); });
    B.on('gameover', r => { setTimeout(() => this.fillGameOver(r), 120); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) g.pause(); });
  },

  // ---------- conteúdo das telas ----------
  fillMenu() {
    const s = ZYRO.Storage.stats();
    this.$('menu-recorde').textContent = ZYRO.U.fmt(s.melhorPontuacao);
    this.$('menu-cores').textContent = ZYRO.U.fmt(s.totalCores);
  },

  fillGameOver(r) {
    const nomeObst = r.obstaculo ? ZYRO.OBSTACLE_TYPES[r.obstaculo].nome.toLowerCase() : 'um obstáculo';
    const art = 'BTAC'.includes(r.obstaculo || '-') ? 'num' : r.obstaculo === 'G' ? 'no' : 'na';
    const zona = r.zona.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
    this.$('fim-causa').textContent = `Você bateu ${art} ${nomeObst} em ${zona}.`;
    this.$('fim-pontos').textContent = ZYRO.U.fmt(r.pontos);
    this.$('fim-distancia').textContent = ZYRO.U.fmt(r.distancia) + ' m';
    this.$('fim-cores').textContent = ZYRO.U.fmt(r.cores) + ' cores';
    this.$('fim-combo').textContent = 'x' + r.combo;
    this.$('fim-recorde').textContent = ZYRO.U.fmt(r.stats.melhorPontuacao);
    this.$('fim-novo').hidden = !r.novoRecorde;
    this.$('fim-badge').hidden = !r.novoRecorde;
    this.$('fim-placar').classList.toggle('placar--recorde', r.novoRecorde);
    this.$('fim-heroi').innerHTML = ZYRO.Art.hero(r.novoRecorde ? 'both' : 'pump');
    this.$('fim-heroi').classList.toggle('comemora', r.novoRecorde);
    if (r.novoRecorde) ZYRO.Audio.play('record');
    ZYRO.Audio.muffle(true);
    this.show('fim');
  },

  fillRecords() {
    const s = ZYRO.Storage.stats(), h = ZYRO.Storage.history();
    const cards = [
      ['MELHOR PONTUAÇÃO', ZYRO.U.fmt(s.melhorPontuacao), 'trofeu', '#FFD447'],
      ['MAIOR DISTÂNCIA', ZYRO.U.fmt(s.maiorDistancia) + ' m', 'bandeira', '#00D9FF'],
      ['TOTAL DE CORES', ZYRO.U.fmt(s.totalCores), 'core', '#FFD447'],
      ['MELHOR COMBO', 'x' + s.melhorCombo, 'estrela', '#FF4FBF'],
      ['PARTIDAS JOGADAS', ZYRO.U.fmt(s.partidas), 'play', '#42EDAA']
    ];
    this.$('cards-estat').innerHTML = cards.map(([l, v, i, c]) =>
      `<div class="card-estat" style="--cor:${c}"><span class="card-estat__selo"><svg><use href="#i-${i}"/></svg></span><small>${l}</small><b>${v}</b></div>`).join('');
    const fmtDate = ts => {
      const d = new Date(ts), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
      const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (d.toDateString() === hoje.toDateString()) return 'Hoje, ' + hm;
      if (d.toDateString() === ontem.toDateString()) return 'Ontem, ' + hm;
      return d.toLocaleDateString('pt-BR') + ', ' + hm;
    };
    const rows = h.length ? h.map(r => `<tr><td>${fmtDate(r.data)}</td><td>${ZYRO.U.fmt(r.pontos)}</td><td>${ZYRO.U.fmt(r.distancia)} m</td><td>${r.zona}</td></tr>`).join('')
      : `<tr><td colspan="4" class="vazio">Nenhuma corrida ainda. Que tal a primeira?</td></tr>`;
    this.$('tabela-historico').innerHTML = `<table><thead><tr><th>ÚLTIMAS CORRIDAS</th><th>PONTOS</th><th>DISTÂNCIA</th><th>ZONA</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  // ---------- configurações ----------
  initConfig() {
    const $ = this.$, save = cfg => { ZYRO.Storage.saveConfig(cfg); this.applyConfig(cfg); };
    $('cfg-efeitos').addEventListener('input', e => { const c = ZYRO.Storage.config(); c.volumeEfeitos = e.target.value / 100; save(c); });
    $('cfg-efeitos').addEventListener('change', () => ZYRO.Audio.play('core'));
    $('cfg-musica-vol').addEventListener('input', e => { const c = ZYRO.Storage.config(); c.volumeMusica = e.target.value / 100; save(c); });
    $('cfg-musica').addEventListener('click', () => { const c = ZYRO.Storage.config(); c.musica = !c.musica; save(c); this.fillConfig(); });
    $('cfg-reduzir').addEventListener('click', () => { const c = ZYRO.Storage.config(); c.reduzirAnimacoes = !c.reduzirAnimacoes; save(c); this.fillConfig(); });
    $('cfg-qualidade').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const c = ZYRO.Storage.config(); c.qualidade = b.dataset.v; save(c); this.fillConfig(); });
    $('btn-apagar').addEventListener('click', () => { $('dialogo').hidden = false; $('dialogo-nao').focus(); });
    $('dialogo-nao').addEventListener('click', () => { $('dialogo').hidden = true; });
    $('dialogo-sim').addEventListener('click', () => {
      ZYRO.Storage.resetData(); $('dialogo').hidden = true;
      ZYRO.HUD.best = 0; this.fillMenu();
      const b = $('btn-apagar').querySelector('span'); b.textContent = 'DADOS APAGADOS'; setTimeout(() => (b.textContent = 'APAGAR DADOS'), 1800);
    });
    this.applyConfig(ZYRO.Storage.config());
  },
  fillConfig() {
    const c = ZYRO.Storage.config(), $ = this.$;
    $('cfg-efeitos').value = Math.round(c.volumeEfeitos * 100);
    $('cfg-musica-vol').value = Math.round(c.volumeMusica * 100);
    $('cfg-musica').setAttribute('aria-checked', c.musica);
    $('cfg-reduzir').setAttribute('aria-checked', c.reduzirAnimacoes);
    for (const b of $('cfg-qualidade').children) { const on = b.dataset.v === c.qualidade; b.classList.toggle('ativo', on); b.setAttribute('aria-checked', on); }
    $('btn-som').querySelector('use').setAttribute('href', c.musica ? '#i-som' : '#i-mudo');
  },
  applyConfig(c) {
    ZYRO.Audio.setVolumes(c.volumeEfeitos, c.volumeMusica, c.musica);
    ZYRO.Renderer.setOptions(c.qualidade, c.reduzirAnimacoes);
    document.body.classList.toggle('reduzir', c.reduzirAnimacoes);
    this.$('btn-som').querySelector('use').setAttribute('href', c.musica ? '#i-som' : '#i-mudo');
  },

  // ---------- animações da tela Como jogar ----------
  startDemos() {
    if (this.demoRAF) return;
    const canvases = [...document.querySelectorAll('canvas.demo')];
    const t0 = performance.now();
    const loop = now => {
      const t = (now - t0) / 1000;
      for (const cv of canvases) this.drawDemo(cv, cv.dataset.demo, t);
      this.demoRAF = requestAnimationFrame(loop);
    };
    this.demoRAF = requestAnimationFrame(loop);
  },
  stopDemos() { if (this.demoRAF) cancelAnimationFrame(this.demoRAF); this.demoRAF = null; },

  drawDemo(cv, kind, t) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, C = ZYRO.CONFIG.COLORS;
    ctx.clearRect(0, 0, W, H);
    // mini pista em perspectiva
    const hz = 34, cx = W / 2;
    ctx.fillStyle = 'rgba(16,26,53,.55)';
    ctx.beginPath(); ctx.moveTo(cx - 14, hz); ctx.lineTo(cx + 14, hz); ctx.lineTo(W + 40, H); ctx.lineTo(-40, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 60;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 5, hz); ctx.lineTo(cx + s * 52, H); ctx.stroke(); }
    ctx.setLineDash([]);
    const pose = { phase: t * 11, jump: 0, slide: 0, tilt: 0, shift: false, land: 0, hit: 0 };
    let x = cx, y = H - 10;
    const cyc = t % 1.6;
    if (kind === 'lane') { const s = Math.sin(t * 2.2); x = cx + s * 52; pose.tilt = Math.cos(t * 2.2) * 0.9; }
    if (kind === 'jump' && cyc < 0.62) { const k = cyc / 0.62; y -= Math.sin(k * Math.PI) * 52; pose.jump = Math.min(1, Math.sin(k * Math.PI) * 2.5); }
    if (kind === 'slide') pose.slide = cyc < 0.9 ? Math.min(1, Math.sin((cyc / 0.9) * Math.PI) * 2.5) : 0;
    if (kind === 'shift') {
      pose.shift = true;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * 0.8 + t * 0.4, r = 40 + ((t * 120 + i * 30) % 90); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, 70 + Math.sin(a) * r * 0.6); ctx.lineTo(cx + Math.cos(a) * (r + 18), 70 + Math.sin(a) * (r + 18) * 0.6); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(5,8,25,.35)'; ctx.beginPath(); ctx.ellipse(x, H - 10, 24, 6, 0, 0, 7); ctx.fill();
    ZYRO.Character.draw(ctx, x, y, 62, pose);
  }
};
