/* =========================================================
   ZYRO — hud.js  (HUD da partida)
   Atualiza o DOM só quando o valor muda (leve para o navegador).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.HUD = {
  init(game) {
    this.game = game;
    const $ = id => document.getElementById(id);
    this.el = {
      root: $('hud'), pontos: $('hud-pontos'), dist: $('hud-distancia'), rec: $('hud-recorde'), cores: $('hud-cores'),
      coresBox: $('hud-cores-box'), mult: $('hud-mult'), poderes: $('hud-poderes'), msgs: $('mensagens'),
      bar: $('barra-shift'), barFill: $('shift-energia'), barLabel: $('shift-label'), barVal: $('shift-valor'),
      btnShift: $('btn-shift'), anel: $('shift-anel'), zona: $('banner-zona'), zonaNum: $('banner-zona-num'), zonaNome: $('banner-zona-nome'),
      flash: $('flash')
    };
    this.cache = {};
    this.chips = {};
    this.msgBusy = 0;
    this.listen();
  },

  set(key, el, val) { if (this.cache[key] !== val) { this.cache[key] = val; el.textContent = val; } },

  listen() {
    const B = ZYRO.Bus;
    B.on('start', () => {
      this.cache = {}; this.el.msgs.innerHTML = ''; this.el.poderes.innerHTML = ''; this.chips = {};
      this.best = ZYRO.Storage.stats().melhorPontuacao;
      this.message('CORRA!', 'go');
    });
    B.on('msg', m => this.message(m.text, m.kind, m.color));
    B.on('core', () => {
      const b = this.el.coresBox; b.classList.remove('pulo'); void b.offsetWidth; b.classList.add('pulo');
    });
    B.on('shiftReady', () => this.message('SHIFT READY!', 'shift'));
    B.on('shiftStart', () => this.flash('rgba(255,255,255,.8)'));
    B.on('hit', () => this.flash('rgba(255,77,109,.55)'));
    B.on('shieldHit', () => this.flash('rgba(0,217,255,.45)'));
    B.on('zone', z => this.zone(z));
    B.on('powerup', t => this.addChip(t));
    B.on('powerupEnd', t => { if (this.chips[t]) { this.chips[t].remove(); delete this.chips[t]; } });
  },

  flash(color) {
    if (ZYRO.Renderer.reduce) color = color.replace(/[\d.]+\)$/, '0.2)');
    const f = this.el.flash; f.style.background = color;
    f.classList.remove('ativo'); void f.offsetWidth; f.classList.add('ativo');
  },

  // mensagens curtas e animadas, uma de cada vez (não cobrem a pista)
  message(text, kind = 'perfect', color) {
    const now = performance.now();
    const important = ['shift', 'record', 'combo', 'go', 'power'].includes(kind);
    if (!important && now < this.msgBusy) return;
    this.el.msgs.innerHTML = '';
    const m = document.createElement('div');
    m.className = 'msg msg--' + kind;
    if (color) m.style.setProperty('--cor', color);
    m.textContent = text;
    this.el.msgs.appendChild(m);
    this.msgBusy = now + 650;
    m.addEventListener('animationend', () => m.remove());
  },

  zone(z) {
    const Z = ZYRO.CONFIG.ZONES[z], e = this.el;
    e.zonaNum.textContent = 'ZONA ' + Z.id; e.zonaNome.textContent = Z.name;
    e.zona.dataset.zona = Z.id;
    e.zona.hidden = false; e.zona.classList.remove('ativo'); void e.zona.offsetWidth; e.zona.classList.add('ativo');
    clearTimeout(this.zt); this.zt = setTimeout(() => { e.zona.hidden = true; }, 2400);
  },

  addChip(type) {
    const T = ZYRO.POWERUP_TYPES[type];
    if (this.chips[type]) return;
    const c = document.createElement('div');
    c.className = 'poder'; c.style.setProperty('--cor', T.cor);
    c.innerHTML = `<svg><use href="#i-${T.icone}"/></svg><span class="poder__tempo"><i></i></span>`;
    c.title = T.nome;
    this.el.poderes.appendChild(c);
    this.chips[type] = c;
  },

  update() {
    const g = this.game, e = this.el, s = g.score, sh = g.shift;
    this.set('p', e.pontos, ZYRO.U.fmtScore(s.points));
    this.set('d', e.dist, ZYRO.U.fmt(g.dist) + ' m');
    this.set('r', e.rec, ZYRO.U.fmt(Math.max(this.best || 0, s.points)));
    this.set('c', e.cores, ZYRO.U.fmt(s.cores));
    const mult = s.mult;
    if (this.cache.m !== mult) {
      this.cache.m = mult; e.mult.hidden = mult <= 1; e.mult.textContent = 'x' + mult;
      e.mult.classList.remove('pulo'); void e.mult.offsetWidth; e.mult.classList.add('pulo');
    }
    for (const [k, c] of Object.entries(this.chips)) {
      const pct = (g.power[k] / ZYRO.CONFIG.POWERUPS[k].dur) * 100;
      c.querySelector('i').style.width = pct.toFixed(1) + '%';
    }
    const estado = sh.active ? 'ativo' : sh.ready ? 'pronto' : 'carregando';
    if (this.cache.st !== estado) {
      this.cache.st = estado;
      e.bar.dataset.estado = estado; e.btnShift.dataset.estado = estado;
      e.barLabel.textContent = sh.active ? 'SHIFT ATIVO' : sh.ready ? 'SHIFT READY!' : 'ZYRO SHIFT';
    }
    const pct = Math.round(sh.energy);
    if (this.cache.e !== pct) {
      this.cache.e = pct;
      e.barFill.style.width = sh.energy + '%';
      e.barVal.textContent = sh.active ? sh.t.toFixed(1).replace('.', ',') + ' s' : sh.ready ? 'SHIFT' : pct + '%';
      const C = 2 * Math.PI * 44;
      e.anel.style.strokeDasharray = `${(C * sh.energy) / 100} ${C}`;
    }
  }
};
