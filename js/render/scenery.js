/* =========================================================
   ZYRO — scenery.js  (Cenário das 3 zonas)
   Céu → skyline (pré-desenhado) → chão → prédios laterais →
   pista com faixas → paredes → postes e arcos.
   As 3 zonas usam a mesma pista e mudam cores e decoração.

   Ideias usadas aqui:
   - TEMAS COMO DADOS: cada zona é só um objeto de cores e
     opções (THEMES). O código de desenho é o mesmo para as 3.
   - SKYLINE PRÉ-DESENHADO: a cidade do horizonte é desenhada
     uma vez num canvas invisível (buildSkyline) e depois só
     copiada a cada quadro.
   - CIDADE INFINITA SEM MEMÓRIA: a pista é dividida em
     "vagas" a cada N metros (k = 0, 1, 2...). Utils.hash(k)
     sorteia SEMPRE o mesmo número para a mesma vaga, então o
     prédio da vaga 57 é sempre igual, sem guardar nada.
   - TRANSIÇÃO DE ZONA: zoneFrom → zoneTo com zt indo de 0 a 1;
     as cores são misturadas (mixHex) durante a troca.
   - Laços de "vagas" vão do LONGE para o PERTO (k decrescente):
     algoritmo do pintor, o mais perto cobre o mais longe.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Scenery = {
  THEMES: [
    { // ZONA 1 — NOVA CITY: céu iluminado, prédios coloridos
      name: 'NOVA CITY',
      sky: [[0, '#2E5BFF'], [0.45, '#8A6BFF'], [0.78, '#FF7EC8'], [1, '#FFB36B']],
      sun: true, far: '#B49CFF', buildings: ['#7955FF', '#3C6CF0', '#FF4FBF', '#5A44D6', '#2DB5D9', '#FF9D43'],
      win: '#FFF2B0', neon: ['#00D9FF', '#FF4FBF'],
      ground: ['#5A4FB0', '#1B2A5C'], road: ['#5C6FC0', '#2A3870'], band: 'rgba(255,255,255,.06)',
      dash: '#FFFFFF', wall: '#7955FF', wallTop: '#B9A5FF', rail: '#00D9FF', lamp: '#FFD447', arch: '#00D9FF',
      side: 'city', cars: true, clouds: true
    },
    { // ZONA 2 — SKY DISTRICT: plataformas no céu, veículos voadores
      name: 'SKY DISTRICT',
      sky: [[0, '#3E8BFF'], [0.45, '#9C8CFF'], [0.75, '#FFC2E2'], [1, '#FFE3F2']],
      sun: false, moon: true, far: '#C9C0FF', buildings: ['#7955FF', '#3C6CF0', '#FF4FBF', '#2DB5D9'],
      win: '#FFFFFF', neon: ['#FF4FBF', '#00D9FF'],
      ground: null, below: ['#FFD6EC', '#FFFFFF'], road: ['#7A6BE6', '#3A2F94'], band: 'rgba(255,255,255,.08)',
      dash: '#FFFFFF', wall: '#FF4FBF', wallTop: '#FFA3DD', rail: '#FFFFFF', lamp: '#00D9FF', arch: '#FF4FBF',
      side: 'clouds', cars: true, clouds: false, islands: true
    },
    { // ZONA 3 — HYPER CORE: estruturas tecnológicas, núcleos gigantes
      name: 'HYPER CORE',
      sky: [[0, '#170B3D'], [0.6, '#3A1673'], [1, '#5A2AB0']],
      sun: false, far: '#4A2A9C', buildings: ['#2A1A6E', '#3B1A7A', '#24145E'],
      win: '#00D9FF', neon: ['#FF4FBF', '#FFD447'],
      ground: ['#1F1060', '#0E0730'], grid: '#7955FF', road: ['#3A2690', '#140B3A'], band: 'rgba(255,79,191,.07)',
      dash: '#FFD447', wall: '#3B1A7A', wallTop: '#7955FF', rail: '#FF4FBF', lamp: '#00D9FF', arch: '#FFD447',
      side: 'pylons', cars: false, clouds: false, bigCores: true
    }
  ],

  skylines: [], winTex: [], cars: [], skyClouds: [],
  zoneFrom: 0, zoneTo: 0, zt: 1,

  init(W, H, cam, quality) {
    this.W = W; this.H = H; this.quality = quality;
    this.skylines = this.THEMES.map((t, i) => this.buildSkyline(i, cam));
    this.winTex = this.THEMES.map(t => [0, 1, 2, 3].map(v => this.buildWindows(t, v)));
    this.skyGrad = {};
    if (!this.skyClouds.length) for (let i = 0; i < 7; i++) this.skyClouds.push({ x: Math.random(), y: 0.1 + Math.random() * 0.35, w: 0.08 + Math.random() * 0.12, v: 0.004 + Math.random() * 0.006 });
  },

  // começa a transição para a zona z (instant = troca na hora, usado ao iniciar uma corrida)
  setZone(z, instant) {
    if (instant) { this.zoneFrom = this.zoneTo = z; this.zt = 1; return; }
    if (z === this.zoneTo) return;
    this.zoneFrom = this.zoneTo; this.zoneTo = z; this.zt = 0;
  },

  // ---------- pré-desenho do horizonte da cidade ----------
  buildSkyline(i, cam) {
    const T = this.THEMES[i], W = Math.ceil(this.W * 1.5), h = Math.ceil(cam.horizon + 4);
    const U = ZYRO.Utils;
    // gerador de números aleatórios com SEMENTE (congruencial linear): a mesma semente dá sempre a mesma cidade
    let seed = 11 + i * 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const unit = Math.max(0.55, h / 300);
    return ZYRO.Sprites.canvas(W, h, (c) => {
      // silhuetas distantes
      c.fillStyle = U.rgba(T.far, i === 2 ? 0.9 : 0.5);
      for (let x = 0; x < W; x += 44 * unit) { const bh = (30 + rnd() * 110) * unit; ZYRO.Sprites.rr(c, x, h - bh, 40 * unit, bh + 4, 8 * unit); c.fill(); }
      if (T.islands) {        // ilhas flutuantes
        const isl = [[0.05, 0.78, 0.17], [0.3, 0.5, 0.1], [0.62, 0.48, 0.09], [0.8, 0.74, 0.19], [0.47, 0.82, 0.12]];
        for (const [fx, fy, fw] of isl) this.island(c, fx * W, fy * h, fw * W, T, rnd, unit);
        return;
      }
      const cols = T.buildings, step = 70 * unit;
      for (let x = -20; x < W; x += step * (0.8 + rnd() * 0.5)) {
        const bw = (52 + rnd() * 34) * unit, top = h - (90 + rnd() * 170) * unit;
        this.tower(c, x, top, bw, h, cols[Math.floor(rnd() * cols.length)], T, rnd, unit, i === 2);
      }
      if (i === 0) for (const fx of [0.12, 0.55, 0.86]) this.holo(c, fx * W, h * 0.3 + rnd() * h * 0.15, 80 * unit, 50 * unit, U.pick(T.neon));
      if (i === 2) {           // feixes de luz verticais
        for (const [fx, col] of [[0.18, '#00D9FF'], [0.5, '#FFD447'], [0.8, '#FF4FBF']]) {
          const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, U.rgba(col, 0)); g.addColorStop(1, U.rgba(col, 0.35));
          c.fillStyle = g; c.fillRect(fx * W - 8 * unit, 0, 16 * unit, h);
        }
      }
    });
  },
  tower(c, x, top, w, base, col, T, rnd, unit, tech) {
    if (tech) {
      c.fillStyle = col; c.beginPath(); c.moveTo(x, base); c.lineTo(x, top + 14 * unit); c.lineTo(x + 14 * unit, top); c.lineTo(x + w - 14 * unit, top); c.lineTo(x + w, top + 14 * unit); c.lineTo(x + w, base); c.closePath(); c.fill();
      c.strokeStyle = '#7955FF'; c.lineWidth = 2; c.stroke();
      c.fillStyle = rnd() < 0.5 ? '#00D9FF' : '#FF4FBF';
      for (let y = top + 24 * unit; y < base - 10; y += 26 * unit) c.fillRect(x + w * 0.2, y, w * 0.6, 3 * unit);
      return;
    }
    ZYRO.Sprites.rr(c, x, top, w, base - top + 6, Math.min(10 * unit, w / 6)); c.fillStyle = col; c.fill();
    c.fillStyle = ZYRO.Utils.rgba('#ffffff', 0.12); c.fillRect(x + w * 0.62, top + 6, w * 0.38 - 6, base - top);
    c.fillStyle = T.neon[0]; c.fillRect(x, top + 8, 3 * unit, base - top);
    c.fillStyle = col; c.fillRect(x + w / 2 - 1.5 * unit, top - 16 * unit, 3 * unit, 16 * unit);
    c.fillStyle = T.neon[1]; c.beginPath(); c.arc(x + w / 2, top - 18 * unit, 3.5 * unit, 0, 7); c.fill();
    for (let y = top + 12 * unit; y < base - 8 * unit; y += 15 * unit)
      for (let xx = x + 9 * unit; xx < x + w - 8 * unit; xx += 13 * unit)
        if (rnd() < 0.55) { c.globalAlpha = 0.45 + rnd() * 0.55; c.fillStyle = T.win; c.fillRect(xx, y, 6 * unit, 8 * unit); }
    c.globalAlpha = 1;
  },
  island(c, x, y, w, T, rnd, unit) {
    c.fillStyle = '#5A44D6'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w * 0.75, y + w * 0.32); c.lineTo(x + w * 0.25, y + w * 0.32); c.closePath(); c.fill();
    c.fillStyle = '#00D9FF'; ZYRO.Sprites.rr(c, x, y - 5 * unit, w, 8 * unit, 4 * unit); c.fill();
    for (let i = 0; i < 3; i++) {
      const bw = w / 5, bx = x + w * 0.12 + i * w * 0.3, bt = y - (40 + rnd() * 80) * unit;
      this.tower(c, bx, bt, bw, y - 4 * unit, ZYRO.Utils.pick(T.buildings), T, rnd, unit * 0.8, false);
    }
  },
  holo(c, x, y, w, h, col) {
    c.fillStyle = ZYRO.Utils.rgba(col, 0.25); ZYRO.Sprites.rr(c, x, y, w, h, 6); c.fill();
    c.strokeStyle = col; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x + w * 0.3, y + h * 0.3); c.lineTo(x + w * 0.7, y + h * 0.3); c.lineTo(x + w * 0.3, y + h * 0.7); c.lineTo(x + w * 0.7, y + h * 0.7); c.stroke();
  },
  buildWindows(T, v) {
    return ZYRO.Sprites.canvas(128, 256, (c, w, h) => {
      const col = T.buildings[v % T.buildings.length];
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(w * 0.6, 0, w * 0.4, h);
      c.fillStyle = T.neon[v % 2]; c.fillRect(0, 0, 5, h); c.fillRect(0, 0, w, 5);
      let s = v * 13 + 1; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      for (let y = 14; y < h - 8; y += 16) for (let x = 12; x < w - 10; x += 14) {
        if (rnd() < 0.5) { c.globalAlpha = 0.5 + rnd() * 0.5; c.fillStyle = T.win; c.fillRect(x, y, 7, 9); }
      }
      c.globalAlpha = 1;
    });
  },

  // cor do tema atual misturada durante a transição de zona
  col(key) {
    const a = this.THEMES[this.zoneFrom][key], b = this.THEMES[this.zoneTo][key];
    if (this.zt >= 1 || !a || !b || typeof a !== 'string' || !a.startsWith('#')) return this.zt >= 0.5 ? b : a;
    return ZYRO.Utils.mixHex(a, b, this.zt);
  },

  update(dt) {
    if (this.zt < 1) this.zt = Math.min(1, this.zt + dt / 1.6);
    for (const cl of this.skyClouds) { cl.x += cl.v * dt; if (cl.x > 1.2) cl.x = -0.25; }
    // veículos voadores
    const T = this.THEMES[this.zoneTo];
    if (T.cars && this.cars.length < (this.quality === 'baixa' ? 2 : 5) && Math.random() < dt * 0.8) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.cars.push({ x: dir > 0 ? -0.1 : 1.1, y: 0.15 + Math.random() * 0.6, v: (0.08 + Math.random() * 0.12) * dir, s: 0.6 + Math.random() * 0.7, c: ZYRO.Utils.pick(['#00D9FF', '#FF4FBF', '#FFD447', '#42EDAA']) });
    }
    for (const car of this.cars) car.x += car.v * dt;
    this.cars = this.cars.filter(c => c.x > -0.2 && c.x < 1.2);
  },

  // ---------- desenho ----------
  drawSky(ctx, cam, t) {
    const W = this.W, H = this.H;
    const drawOne = (i, alpha) => {
      const T = this.THEMES[i];
      const key = i + ':' + H;
      if (!this.skyGrad[key]) {
        const g = ctx.createLinearGradient(0, 0, 0, T.below ? H : cam.horizon);
        const stops = T.below ? T.sky.map(([p, c]) => [p * (cam.horizon / H), c]).concat([[Math.min(1, cam.horizon / H + 0.15), T.below[0]], [1, T.below[1]]]) : T.sky;
        stops.forEach(([p, c]) => g.addColorStop(p, c));
        this.skyGrad[key] = g;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.skyGrad[key]; ctx.fillRect(0, 0, W, T.below ? H : cam.horizon + 2);
      const sunX = W / 2 - cam.x * 4, sunY = cam.horizon - 4;
      if (T.sun) {
        const r = Math.min(W, H) * 0.22;
        ctx.drawImage(ZYRO.Sprites.glow('#FFD447'), sunX - r * 1.6, sunY - r * 1.6, r * 3.2, r * 3.2);
        ctx.fillStyle = '#FFF0B0'; ctx.beginPath(); ctx.arc(sunX, sunY, r * 0.42, Math.PI, 0); ctx.fill();
      }
      if (T.moon) { const r = Math.min(W, H) * 0.05; ctx.fillStyle = 'rgba(255,246,214,.9)'; ctx.beginPath(); ctx.arc(W * 0.78 - cam.x * 2, cam.horizon * 0.3, r, 0, 7); ctx.fill(); }
      if (T.clouds) for (const cl of this.skyClouds) {
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.ellipse(cl.x * W, cl.y * cam.horizon, cl.w * W, cl.w * W * 0.14, 0, 0, 7); ctx.fill();
      }
      if (T.bigCores) this.bigCores(ctx, cam, t);
      // skyline com paralaxe
      const sk = this.skylines[i];
      if (sk) ctx.drawImage(sk, -W * 0.25 - cam.x * 9, cam.horizon - sk.height + 4);
      if (T.cars) for (const car of this.cars) this.car(ctx, car.x * W, car.y * cam.horizon, car.s * Math.max(0.6, H / 720), car.v > 0 ? 1 : -1, car.c);
      ctx.globalAlpha = 1;
    };
    if (this.zt < 1) { drawOne(this.zoneFrom, 1); drawOne(this.zoneTo, this.zt); }
    else drawOne(this.zoneTo, 1);
  },
  car(ctx, x, y, s, dir, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    const g = ctx.createLinearGradient(-70, 0, -8, 0); g.addColorStop(0, ZYRO.Utils.rgba(col, 0)); g.addColorStop(1, ZYRO.Utils.rgba(col, 0.8));
    ctx.fillStyle = g; ctx.fillRect(-70, -1.5, 62, 4);
    ctx.fillStyle = '#fff'; ZYRO.Sprites.rr(ctx, -10, -6, 30, 12, 6); ctx.fill();
    ctx.fillStyle = col; ZYRO.Sprites.rr(ctx, 2, -5, 12, 6, 3); ctx.fill();
    ctx.restore();
  },
  bigCores(ctx, cam, t) {
    const W = this.W, h = cam.horizon;
    for (const [fx, fy, r, col] of [[0.16, 0.42, 0.07, '#00D9FF'], [0.84, 0.36, 0.085, '#FF4FBF'], [0.5, 0.62, 0.045, '#FFD447']]) {
      const x = fx * W - cam.x * 5, y = fy * h, R = r * Math.min(W, h * 2.2);
      ctx.drawImage(ZYRO.Sprites.glow(col), x - R * 2.2, y - R * 2.2, R * 4.4, R * 4.4);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, R * 0.5, 0, 7); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, R * 0.08);
      ctx.beginPath(); ctx.ellipse(x, y, R * 1.4, R * 0.36, -0.26 + Math.sin(t * 0.6) * 0.1, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1, R * 0.04);
      ctx.beginPath(); ctx.ellipse(x, y, R * 1.2, R * 0.3, 0.44 + t * 0.4, 0, 7); ctx.stroke();
    }
  },

  drawGround(ctx, cam, distance) {
    const T = this.THEMES[this.zt >= 0.5 ? this.zoneTo : this.zoneFrom];
    const Tf = this.THEMES[this.zoneFrom];
    if (!T.ground && Tf.ground && this.zt < 1) {        // saindo do chão para o céu: o chão some aos poucos
      ctx.globalAlpha = 1 - this.zt;
      const gf = ctx.createLinearGradient(0, cam.horizon, 0, this.H); gf.addColorStop(0, Tf.ground[0]); gf.addColorStop(1, Tf.ground[1]);
      ctx.fillStyle = gf; ctx.fillRect(0, cam.horizon, this.W, this.H - cam.horizon); ctx.globalAlpha = 1;
    }
    if (T.ground) {
      const g = ctx.createLinearGradient(0, cam.horizon, 0, this.H);
      g.addColorStop(0, this.zt < 1 && this.THEMES[this.zoneFrom].ground && this.THEMES[this.zoneTo].ground ? ZYRO.Utils.mixHex(this.THEMES[this.zoneFrom].ground[0], this.THEMES[this.zoneTo].ground[0], this.zt) : T.ground[0]);
      g.addColorStop(1, T.ground[1]);
      ctx.fillStyle = g; ctx.fillRect(0, cam.horizon, this.W, this.H - cam.horizon);
      if (T.grid) {                     // grade do Hyper Core
        ctx.strokeStyle = ZYRO.Utils.rgba(T.grid, 0.25); ctx.lineWidth = 1;
        for (let x = -60; x <= 60; x += 6) { const a = cam.px(x, 0, cam.z + 0.7), b = cam.px(x, 0, 150); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        const off = distance % 8;
        for (let z = -off; z < 150; z += 8) { if (z - cam.z < 0.7) continue; const a = cam.px(-60, 0, z), b = cam.px(60, 0, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
    }
    if (T.side === 'clouds') this.cloudSea(ctx, cam, distance);
  },
  cloudSea(ctx, cam, distance) {
    const sp = 14;
    for (let k = Math.ceil((distance + 150) / sp); k >= Math.floor((distance - 6) / sp); k--) {
      for (const side of [-1, 1]) {
        const h = ZYRO.Utils.hash(k, side + 5);
        const z = k * sp - distance + h * 8, x = side * (6 + h * 26), y = -3 - h * 7;
        const p = cam.project(x, y, z); if (!p) continue;
        const r = (5 + h * 6) * p.s;
        ctx.fillStyle = `rgba(255,255,255,${0.55 + h * 0.35})`;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.32, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(p.x + r * 0.4, p.y - r * 0.12, r * 0.6, r * 0.28, 0, 0, 7); ctx.fill();
      }
    }
  },

  // prédios / torres que passam ao lado da pista
  drawSideStructures(ctx, cam, distance) {
    const T = this.THEMES[this.zt >= 0.5 ? this.zoneTo : this.zoneFrom];
    if (T.side === 'clouds') return;
    const ti = this.zt >= 0.5 ? this.zoneTo : this.zoneFrom;
    const sp = this.quality === 'baixa' ? 34 : 22;
    for (let k = Math.ceil((distance + 150) / sp); k >= Math.floor((distance - 30) / sp); k--) {
      for (const side of [-1, 1]) {
        const h = ZYRO.Utils.hash(k, side), h2 = ZYRO.Utils.hash(k + 77, side);
        if (h < 0.3) continue;
        const z0 = k * sp - distance, depth = 9 + h2 * 8, z1 = z0 + depth;
        if (z1 - cam.z < 1) continue;
        const inner = side * (10 + h2 * 9), outer = inner + side * (8 + h * 6);
        const top = T.side === 'pylons' ? 18 + h * 26 : 9 + h * 24;
        const xa = Math.min(inner, outer), xb = Math.max(inner, outer);
        const col = T.buildings[Math.floor(h2 * T.buildings.length)];
        // face lateral (virada para a pista)
        const A = cam.px(inner, 0, Math.max(z0, cam.z + 0.7)), B = cam.px(inner, top, Math.max(z0, cam.z + 0.7)), Cc = cam.px(inner, top, z1), Dd = cam.px(inner, 0, z1);
        ctx.fillStyle = ZYRO.Utils.mixHex(col, '#1B1F4A', 0.62);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(Cc[0], Cc[1]); ctx.lineTo(Dd[0], Dd[1]); ctx.closePath(); ctx.fill();
        if (T.side === 'pylons') {
          ctx.strokeStyle = T.neon[k % 2]; ctx.lineWidth = Math.max(1, cam.scaleAt(z0) * 0.25);
          for (let y = 3; y < top; y += 5) { const a = cam.px(inner, y, Math.max(z0, cam.z + 0.7)), b = cam.px(inner, y, z1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        }
        // face da frente com janelas
        if (z0 - cam.z > 0.7) {
          const a = cam.px(xa, top, z0), b = cam.px(xb, 0, z0);
          ctx.drawImage(this.winTex[ti][k % 4], a[0], a[1], b[0] - a[0], b[1] - a[1]);
          ctx.strokeStyle = T.neon[(k + 1) % 2]; ctx.lineWidth = Math.max(1.5, cam.scaleAt(z0) * 0.18);
          ctx.beginPath(); ctx.moveTo(side < 0 ? b[0] : a[0], a[1]); ctx.lineTo(side < 0 ? b[0] : a[0], b[1]); ctx.stroke();
        }
      }
    }
  },

  drawTrack(ctx, cam, distance, shiftAmt) {
    const H = ZYRO.CONFIG.TRACK_HALF_WIDTH, zN = cam.z + 0.62, zF = ZYRO.CONFIG.DRAW_DIST;
    const Tz = this.THEMES[this.zoneTo], Tf = this.THEMES[this.zoneFrom];
    const near = this.zt < 1 ? ZYRO.Utils.mixHex(Tf.road[1], Tz.road[1], this.zt) : Tz.road[1];
    const far = this.zt < 1 ? ZYRO.Utils.mixHex(Tf.road[0], Tz.road[0], this.zt) : Tz.road[0];
    const quad = (x0, x1, z0, z1, y = 0) => {
      const a = cam.px(x0, y, z0), b = cam.px(x1, y, z0), c = cam.px(x1, y, z1), d = cam.px(x0, y, z1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
    };
    // piso da pista
    const g = ctx.createLinearGradient(0, cam.horizon, 0, this.H);
    g.addColorStop(0, far); g.addColorStop(1, near);
    quad(-H, H, zN, zF); ctx.fillStyle = g; ctx.fill();
    // faixas claras que passam (sensação de velocidade)
    ctx.fillStyle = this.col('band') || 'rgba(255,255,255,.06)';
    const off = distance % 12;
    for (let z = -off - 12; z < zF; z += 12) { const z0 = Math.max(zN, z), z1 = Math.max(zN, z + 6); if (z1 > z0) { quad(-H, H, z0, z1); ctx.fill(); } }
    // reflexos do céu
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    quad(-0.6, -0.25, zN, zF); ctx.fill(); quad(1.4, 1.7, zN, zF); ctx.fill();
    // divisórias tracejadas das faixas
    ctx.fillStyle = this.col('dash');
    const dOff = distance % 9;
    for (const lx of [-1.2, 1.2]) {
      for (let z = -dOff - 9; z < zF; z += 9) {
        const z0 = Math.max(zN, z), z1 = Math.max(zN, z + 3.2);
        if (z1 > z0) { quad(lx - 0.07, lx + 0.07, z0, z1); ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1; }
      }
    }
    // luz do SHIFT sobre a pista
    if (shiftAmt > 0) {
      const sg = ctx.createLinearGradient(0, cam.horizon, 0, this.H);
      sg.addColorStop(0, `rgba(255,79,191,${0.25 * shiftAmt})`); sg.addColorStop(1, `rgba(0,217,255,${0.35 * shiftAmt})`);
      quad(-H, H, zN, zF); ctx.fillStyle = sg; ctx.fill();
    }
    // paredes laterais e trilhos neon
    const wall = this.col('wall'), wallTop = this.col('wallTop'), rail = this.col('rail');
    for (const s of [-1, 1]) {
      const x = s * H;
      const a = cam.px(x, 0, zN), b = cam.px(x, 0.55, zN), c = cam.px(x, 0.55, zF), d = cam.px(x, 0, zF);
      ctx.fillStyle = wall; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
      quad(x, x + s * 0.3, zN, zF, 0.55); ctx.fillStyle = wallTop; ctx.fill();
      const r0 = cam.px(x, 0.55, zN), r1 = cam.px(x, 0.55, zF);
      ctx.strokeStyle = ZYRO.Utils.rgba(rail, 0.35); ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
      ctx.strokeStyle = rail; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
      // luzinhas na parede
      ctx.fillStyle = this.col('lamp');
      const lo = distance % 6;
      for (let z = 6 - lo; z < 90; z += 6) { const p = cam.project(x, 0.28, z); if (p) { ctx.fillRect(p.x - p.s * 0.05, p.y - p.s * 0.05, p.s * 0.1, p.s * 0.1); } }
    }
  },

  // postes e arcos (passarelas) — desenhados do mais longe ao mais perto
  drawDecor(ctx, cam, distance, t) {
    const lamp = this.col('lamp'), arch = this.col('arch');
    const T = this.THEMES[this.zt >= 0.5 ? this.zoneTo : this.zoneFrom];
    const items = [];
    const ls = this.quality === 'baixa' ? 28 : 16;
    for (let k = Math.floor((distance - 6) / ls); k * ls < distance + 140; k++) items.push({ z: k * ls - distance, kind: 'lamp', k });
    for (let k = Math.floor((distance - 6) / 110); k * 110 < distance + 150; k++) if (k > 0) items.push({ z: k * 110 - distance + 40, kind: 'arch', k });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) {
      if (it.z < (it.kind === 'lamp' ? 3 : -4) || it.z - cam.z < 1.2) continue;
      if (it.kind === 'lamp') {
        for (const s of [-1, 1]) {
          const b = cam.px(s * 4.6, 0, it.z), m = cam.px(s * 4.6, 4.6, it.z), tp = cam.px(s * 3.9, 5.0, it.z);
          const sc = cam.scaleAt(it.z);
          ctx.strokeStyle = '#2A2F5C'; ctx.lineWidth = Math.max(1, sc * 0.16); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
          const r = Math.min(sc * 0.9, 90);
          if (this.quality !== 'baixa') ctx.drawImage(ZYRO.Sprites.glow(lamp), tp[0] - r, tp[1] - r, r * 2, r * 2);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tp[0], tp[1], Math.max(1, sc * 0.14), 0, 7); ctx.fill();
        }
      } else {
        const sc = cam.scaleAt(it.z);
        for (const s of [-1, 1]) ZYRO.Sprites.box(ctx, cam, s * 5.4 - 0.35, s * 5.4 + 0.35, 0, 6.6, it.z, it.z + 0.7, { front: '#2A2F5C', side: '#1C2048', top: '#3A4080', frontEdge: arch, edgeW: Math.max(1, sc * 0.08) });
        const r = ZYRO.Sprites.box(ctx, cam, -5.8, 5.8, 6.2, 7.3, it.z, it.z + 0.7, { front: '#1C2048', frontEdge: arch, edgeW: Math.max(1.5, sc * 0.1) });
        const w = r.b[0] - r.a[0], h = r.b[1] - r.a[1];
        if (h > 9) {
          ctx.fillStyle = arch; ctx.font = `900 italic ${Math.floor(h * 0.62)}px "Exo 2", system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.k % 3 === 0 ? 'ZYRO' : T.name, r.a[0] + w / 2, r.a[1] + h / 2 + 1);
        }
      }
    }
  }
};
