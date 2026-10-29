/* =========================================================
   ZYRO — hud.js  (Placar da partida: pontos, barra SHIFT...)

   O HUD é HTML por cima do canvas (não é desenhado no canvas):
   texto em HTML fica nítido, acessível e fácil de estilizar.

   Desempenho: update() roda 60 vezes por segundo, mas mexer
   no DOM é caro. Por isso set() só escreve quando o valor
   MUDOU (guardado em this.cache).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.HUD = {
  init(game) {
    this.game = game;
    const $ = id => document.getElementById(id);
    this.el = {
      root: $('hud'), points: $('hud-pontos'), distance: $('hud-distancia'), record: $('hud-recorde'), cores: $('hud-cores'),
      coresBox: $('hud-cores-box'), mult: $('hud-mult'), powers: $('hud-poderes'), messages: $('mensagens'),
      bar: $('barra-shift'), barFill: $('shift-energia'), barLabel: $('shift-label'), barValue: $('shift-valor'),
      btnShift: $('btn-shift'), ring: $('shift-anel'),
      zoneBanner: $('banner-zona'), zoneNumber: $('banner-zona-num'), zoneName: $('banner-zona-nome'),
      flash: $('flash'),
      tutorial: $('tutorial-dica'), tutorialTitle: $('tutorial-titulo'), tutorialKeys: $('tutorial-teclas'),
      tutorialGesture: $('tutorial-gesto'), tutorialText: $('tutorial-texto')
    };
    this.cache = {};
    this.chips = {};            // power-ups ativos na tela: { magnet: <div>, ... }
    this.messageBusyUntil = 0;
    this.listen();
  },

  // escreve no elemento só se o valor mudou
  set(key, element, value) { if (this.cache[key] !== value) { this.cache[key] = value; element.textContent = value; } },

  // reinicia uma animação CSS (tirar a classe, forçar o navegador a recalcular, pôr de novo)
  restartAnimation(element, className) { element.classList.remove(className); void element.offsetWidth; element.classList.add(className); },

  listen() {
    const Bus = ZYRO.Bus;
    Bus.on('start', () => {
      this.cache = {}; this.el.messages.innerHTML = ''; this.el.powers.innerHTML = ''; this.chips = {};
      this.best = ZYRO.Storage.stats().melhorPontuacao;
      this.showTutorialHint(null);
      this.message('CORRA!', 'go');
    });
    Bus.on('msg', message => this.message(message.text, message.kind, message.color));
    Bus.on('core', () => this.restartAnimation(this.el.coresBox, 'pulo'));
    Bus.on('shiftReady', () => this.message('SHIFT READY!', 'shift'));
    Bus.on('shiftStart', () => this.flash('rgba(255,255,255,.8)'));
    Bus.on('hit', () => this.flash('rgba(255,77,109,.55)'));
    Bus.on('shieldHit', () => this.flash('rgba(0,217,255,.45)'));
    Bus.on('zone', zoneIndex => this.zone(zoneIndex));
    Bus.on('powerup', type => this.addChip(type));
    Bus.on('powerupEnd', type => { if (this.chips[type]) { this.chips[type].remove(); delete this.chips[type]; } });
  },

  // clarão na tela inteira (mais fraco com "reduzir animações")
  flash(color) {
    if (ZYRO.Renderer.reduce) color = color.replace(/[\d.]+\)$/, '0.2)');
    this.el.flash.style.background = color;
    this.restartAnimation(this.el.flash, 'ativo');
  },

  // Mensagens curtas e animadas (PERFECT!, COMBO x2!...), uma de cada vez.
  // As comuns esperam a anterior terminar; as importantes passam na frente.
  message(text, kind = 'perfect', color) {
    const now = performance.now();
    const important = ['shift', 'record', 'combo', 'go', 'power'].includes(kind);
    if (!important && now < this.messageBusyUntil) return;
    this.el.messages.innerHTML = '';
    const element = document.createElement('div');
    element.className = 'msg msg--' + kind;
    if (color) element.style.setProperty('--cor', color);
    element.textContent = text;
    this.el.messages.appendChild(element);
    this.messageBusyUntil = now + 650;
    element.addEventListener('animationend', () => element.remove());
  },

  zone(zoneIndex) {
    const zone = ZYRO.CONFIG.ZONES[zoneIndex], el = this.el;
    el.zoneNumber.textContent = 'ZONA ' + zone.id; el.zoneName.textContent = zone.name;
    el.zoneBanner.dataset.zona = zone.id;
    el.zoneBanner.hidden = false;
    this.restartAnimation(el.zoneBanner, 'ativo');
    clearTimeout(this.zoneTimer); this.zoneTimer = setTimeout(() => { el.zoneBanner.hidden = true; }, 2400);
  },

  addChip(type) {
    const info = ZYRO.POWERUP_TYPES[type];
    if (this.chips[type]) return;        // pegou de novo: o chip já está lá (só o tempo renova)
    const chip = document.createElement('div');
    chip.className = 'poder'; chip.style.setProperty('--cor', info.cor);
    chip.innerHTML = `<svg><use href="#i-${info.icone}"/></svg><span class="poder__tempo"><i></i></span>`;
    chip.title = info.nome;
    this.el.powers.appendChild(chip);
    this.chips[type] = chip;
  },

  // Dica do tutorial: título, teclas (computador) ou gesto (celular) e um texto opcional.
  // O CSS decide qual dos dois mostrar pela classe "toque" no body.
  showTutorialHint(hint) {
    const el = this.el;
    if (this.cache.hint === hint) return;
    this.cache.hint = hint;
    el.tutorial.hidden = !hint;
    if (!hint) return;
    el.tutorialTitle.textContent = hint.title;
    el.tutorialKeys.innerHTML = (hint.keys || []).map(key => `<kbd>${key}</kbd>`).join('');
    el.tutorialKeys.hidden = !hint.keys;
    el.tutorialGesture.textContent = hint.gesture || '';
    el.tutorialGesture.hidden = !hint.gesture;
    el.tutorialText.textContent = hint.text || '';
    el.tutorialText.hidden = !hint.text;
    this.restartAnimation(el.tutorial, 'entrando');
  },

  update() {
    const game = this.game, el = this.el, score = game.score, shift = game.shift, Utils = ZYRO.Utils;
    this.set('points', el.points, Utils.fmtScore(score.points));
    this.set('distance', el.distance, Utils.fmt(game.distance) + ' m');
    this.set('record', el.record, Utils.fmt(Math.max(this.best || 0, score.points)));
    this.set('cores', el.cores, Utils.fmt(score.cores));
    this.showTutorialHint(game.tutorial ? game.tutorial.hint : null);

    const mult = score.mult;
    if (this.cache.mult !== mult) {
      this.cache.mult = mult; el.mult.hidden = mult <= 1; el.mult.textContent = 'x' + mult;
      this.restartAnimation(el.mult, 'pulo');
    }
    // barrinha de tempo de cada power-up
    for (const [type, chip] of Object.entries(this.chips)) {
      const percent = (game.power[type] / ZYRO.CONFIG.POWERUPS[type].duration) * 100;
      chip.querySelector('i').style.width = percent.toFixed(1) + '%';
    }
    // barra do SHIFT: o atributo data-estado muda a cor pelo CSS
    const state = shift.active ? 'ativo' : shift.ready ? 'pronto' : 'carregando';
    if (this.cache.shiftState !== state) {
      this.cache.shiftState = state;
      el.bar.dataset.estado = state; el.btnShift.dataset.estado = state;
      el.barLabel.textContent = shift.active ? 'SHIFT ATIVO' : shift.ready ? 'SHIFT READY!' : 'ZYRO SHIFT';
    }
    const percent = Math.round(shift.energy);
    if (this.cache.energy !== percent) {
      this.cache.energy = percent;
      el.barFill.style.width = shift.energy + '%';
      el.barValue.textContent = shift.active ? shift.timeLeft.toFixed(1).replace('.', ',') + ' s' : shift.ready ? 'SHIFT' : percent + '%';
      // anel do botão do celular: um círculo SVG com traço tracejado; o tamanho do traço = a energia
      const circumference = 2 * Math.PI * 44;
      el.ring.style.strokeDasharray = `${(circumference * shift.energy) / 100} ${circumference}`;
    }
  }
};
