/* =========================================================
   ZYRO — renderer.js  (Desenha um quadro do jogo)
   Ordem: céu → cidade → chão → prédios → pista → postes →
   objetos (do mais longe ao mais perto) → ZYRO → efeitos.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Renderer = {
  init(canvas, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.game = game;
    this.pose = { j: 0, s: 0 };
    this.dustT = 0;
    this.shiftAmt = 0;
    this.quality = 'alta'; this.reduce = false;
    this.listen();
  },

  setOptions(quality, reduce) {
    const changed = quality !== this.quality;
    this.quality = quality; this.reduce = reduce;
    ZYRO.Effects.quality = quality; ZYRO.Effects.reduce = reduce;
    if (changed && this.W) this.resize();
  },

  resize() {
    const maxDpr = this.quality === 'baixa' ? 1 : this.quality === 'media' ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const W = window.innerWidth, H = window.innerHeight;
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
    ZYRO.Camera.resize(W, H);
    ZYRO.Scenery.init(W, H, ZYRO.Camera, this.quality);
  },

  // posição da tela de algo no mundo (para efeitos)
  screenOf(x, y, d) {
    const p = ZYRO.Camera.project(x, y, d - this.game.dist);
    return p || { x: this.W / 2, y: this.H * 0.7, s: 40 };
  },
  playerScreen() {
    const pl = this.game.player;
    return this.screenOf(pl.x, pl.y + pl.height * 0.6, this.game.dist);
  },

  listen() {
    const B = ZYRO.Bus, E = ZYRO.Effects, C = ZYRO.CONFIG.COLORS;
    B.on('core', c => {
      const p = this.screenOf(c.x, c.y, c.d);
      E.sparkle(p.x, p.y, c.super ? C.azul : C.amarelo, Math.max(3, p.s * 0.12));
    });
    B.on('float', f => {
      const p = this.screenOf(f.x, f.y, f.d);
      E.float(f.text, f.color, p.x, Math.min(p.y, ZYRO.Camera.groundY - p.s * 2.2), Math.max(16, Math.min(28, p.s * 0.45)));
    });
    B.on('break', o => {
      const p = this.screenOf(this.game.player.x, 1, o.d);
      const col = { R: C.vermelho, L: C.laranja, H: C.rosa, B: C.azul, G: C.rosa }[o.type];
      E.burst(p.x, p.y, [col, '#fff', C.amarelo], 26, { speed: 420, gravity: 700, life: 0.7, size: 7, shape: 'rect' });
      E.wave(p.x, p.y, C.azul, 160);
      ZYRO.Camera.shake = Math.max(ZYRO.Camera.shake, 0.25);
    });
    B.on('shiftStart', () => {
      const p = this.playerScreen();
      E.wave(p.x, p.y, C.azul, 340); E.wave(p.x, p.y, C.rosa, 240);
      E.burst(p.x, p.y, [C.azul, C.roxo, C.rosa, '#fff'], 40, { speed: 520, gravity: 0, life: 0.6, size: 5, shape: 'spark' });
    });
    B.on('shieldHit', () => {
      const p = this.playerScreen();
      E.wave(p.x, p.y, C.azul, 200);
      E.burst(p.x, p.y, [C.azul, '#fff'], 24, { speed: 380, gravity: 300, life: 0.6, size: 6, shape: 'rect' });
      ZYRO.Camera.shake = 0.5;
    });
    B.on('powerup', type => {
      const p = this.playerScreen();
      E.wave(p.x, p.y, ZYRO.POWERUP_TYPES[type].cor, 180);
    });
    B.on('hit', () => {
      const p = this.playerScreen();
      ZYRO.Camera.shake = 1;
      E.burst(p.x, p.y - 20, [C.amarelo, '#fff', C.vermelho], 22, { speed: 300, gravity: 400, life: 0.7, size: 6, shape: 'spark' });
    });
    B.on('gameover', r => { if (r.novoRecorde) E.confetti(this.W); });
    B.on('record', () => E.confetti(this.W));
    B.on('jump', () => { const p = this.screenOf(this.game.player.x, 0, this.game.dist); E.burst(p.x, p.y, ['#fff', C.azul], 8, { speed: 140, gravity: 120, life: 0.35, size: 5, angle: -Math.PI / 2, spread: 2.4 }); });
    B.on('jetpackStart', () => { const p = this.playerScreen(); ZYRO.Effects.wave(p.x, p.y, '#FF9D43', 260); ZYRO.Effects.burst(p.x, p.y + 30, ['#FFD447', '#FF9D43', '#fff'], 30, { speed: 380, gravity: 200, life: 0.7, size: 6, angle: Math.PI / 2, spread: 1.8 }); });
    B.on('jetpackEnd', () => { const p = this.playerScreen(); ZYRO.Effects.burst(p.x, p.y, ['#B9C4EE', '#FF9D43', '#344A80'], 14, { speed: 260, gravity: 600, life: 0.9, size: 7, shape: 'rect' }); });
    B.on('start', () => { this.pose.j = this.pose.s = 0; ZYRO.Effects.parts = []; ZYRO.Effects.floats = []; });
  },

  draw(dt) {
    const g = this.game, ctx = this.ctx, cam = ZYRO.Camera, S = ZYRO.Sprites, E = ZYRO.Effects;
    const playing = g.state !== 'menu';
    const t = g.time;
    cam.follow(playing ? g.player : { x: 0, y: 0 }, dt, this.reduce);
    if (g.state !== 'paused') { ZYRO.Scenery.update(dt); E.update(dt); }
    this.shiftAmt = ZYRO.U.lerp(this.shiftAmt, g.shift.active ? 1 : 0, 1 - Math.pow(0.001, dt));

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ZYRO.Scenery.drawSky(ctx, cam, performance.now() / 1000);
    ZYRO.Scenery.drawGround(ctx, cam, g.dist);
    ZYRO.Scenery.drawSideStructures(ctx, cam, g.dist);
    ZYRO.Scenery.drawTrack(ctx, cam, g.dist, this.shiftAmt);
    ZYRO.Scenery.drawDecor(ctx, cam, g.dist, t);

    if (playing) {
      // objetos ordenados pela profundidade
      const items = [];
      const D = ZYRO.CONFIG.DRAW_DIST;
      for (const o of g.obstacles) { const z = o.d - g.dist; if (!o.broken && z < D && z + o.len > -2.5) items.push({ z, k: 0, o }); }
      for (const c of g.coins) { const z = c.d - g.dist; if (!c.taken && z < D * 0.8 && z > -2) items.push({ z, k: 1, o: c }); }
      for (const u of g.powerups) { const z = u.d - g.dist; if (!u.taken && z < D && z > -2) items.push({ z, k: 2, o: u }); }
      // carros estacionados: cada van (e a rampa) é ordenada pela parte de trás, para as moedas do teto ficarem por cima
      const P = ZYRO.CONFIG.PLATFORM;
      for (const pl of g.platforms) {
        const z0 = pl.d0 - g.dist;
        if (z0 > D || pl.d1 - g.dist < -6) continue;
        if (pl.ramp) items.push({ z: z0 + P.rampLen, zf: z0, k: 3, o: pl, seg: -1 });
        const cs = ZYRO.Platform.carsStart(pl) - g.dist;
        for (let i = 0; i < pl.cars; i++) {
          const zc = cs + i * P.carLen;
          if (zc < D && zc + P.carLen > -6) items.push({ z: zc + P.carLen, zf: zc, k: 3, o: pl, seg: i });
        }
      }
      items.sort((a, b) => b.z - a.z);
      for (const it of items) {
        const zf = it.k === 3 ? it.zf : it.z;
        ctx.globalAlpha = it.k === 3 ? (zf > D - 25 ? ZYRO.U.clamp((D - zf) / 25, 0, 1) : 1)
                        : it.z < 0 ? ZYRO.U.clamp(1 + it.z / 2.5, 0, 1) : it.z > D - 25 ? (D - it.z) / 25 : 1;
        if (it.k === 3) { if (it.seg < 0) ZYRO.Vehicles.ramp(ctx, cam, it.o, zf); else ZYRO.Vehicles.van(ctx, cam, it.o, zf, P.carLen, t); }
        else if (it.k === 0) S.obstacle(ctx, cam, it.o, it.z, t);
        else if (it.k === 1) S.core(ctx, cam, it.o, it.z, t);
        else S.powerup(ctx, cam, it.o, it.z, t);
      }
      ctx.globalAlpha = 1;
      this.drawPlayer(ctx, dt);
    }

    E.speedLines(ctx, cam, this.shiftAmt, performance.now() / 1000, ['#FFFFFF', '#00D9FF', '#FF4FBF']);
    E.draw(ctx);
    if (this.shiftAmt > 0.02) {                // vinheta colorida do SHIFT
      const v = ctx.createRadialGradient(cam.cx, this.H * 0.55, this.H * 0.3, cam.cx, this.H * 0.55, this.H * 0.95);
      v.addColorStop(0, 'rgba(121,85,255,0)'); v.addColorStop(1, `rgba(121,85,255,${0.45 * this.shiftAmt})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.debug) this.drawDebug(ctx);
  },

  drawPlayer(ctx, dt) {
    const g = this.game, pl = g.player, cam = ZYRO.Camera, C = ZYRO.CONFIG.COLORS;
    const k = 1 - Math.pow(0.0000005, dt);
    this.pose.j = ZYRO.U.lerp(this.pose.j, pl.flying ? 0.55 : pl.jumping ? 1 : 0, k);
    this.pose.s = ZYRO.U.lerp(this.pose.s, pl.sliding ? 1 : 0, k);
    const ground = cam.project(pl.x, pl.flying ? 0 : g.floorAt(pl.x, g.dist, pl.y), 0), feet = cam.project(pl.x, pl.y, 0);
    if (!ground || !feet) return;
    // sombra (encolhe no ar)
    const sh = 1 / (1 + Math.max(0, pl.y - (pl.flying ? 0 : pl.floor)) * 0.6);
    ctx.fillStyle = 'rgba(5,8,25,.32)';
    ctx.beginPath(); ctx.ellipse(ground.x, ground.y, ground.s * 0.55 * sh, ground.s * 0.16 * sh, 0, 0, 7); ctx.fill();

    // poeira e rastro
    if (g.state === 'playing') {
      this.dustT -= dt;
      const jet = g.power.jetpack > 0;
      if (jet) {                                         // fumaça e fogo do Jetpack
        this.jetT = (this.jetT || 0) - dt;
        if (this.jetT <= 0) {
          this.jetT = this.quality === 'baixa' ? 0.06 : 0.025;
          for (const sx of [-0.13, 0.13]) {
            const n = cam.project(pl.x + sx, pl.y + 0.85, 0.1);
            if (n) ZYRO.Effects.burst(n.x, n.y, ['#FFD447', '#FF9D43', 'rgba(255,255,255,.8)'], 2, { speed: 220, gravity: 300, life: 0.4, size: 5, angle: Math.PI / 2, spread: 0.5 });
          }
        }
      }
      if (this.dustT <= 0 && !pl.jumping && !jet && this.quality !== 'baixa') {
        this.dustT = g.shift.active ? 0.02 : 0.07;
        const cols = g.shift.active ? [C.azul, C.rosa, '#fff'] : ['rgba(255,255,255,.7)', C.azul];
        ZYRO.Effects.burst(feet.x + (Math.random() - 0.5) * feet.s * 0.4, feet.y, cols, g.shift.active ? 3 : 1,
          { speed: g.shift.active ? 260 : 90, gravity: -40, life: 0.35, size: g.shift.active ? 4 : 3, angle: Math.PI / 2, spread: 1.6 });
      }
    }
    const blink = (g.invuln > 0 && Math.floor(g.time * 20) % 2) ||
                  (g.shift.active && g.shift.t < 0.7 && Math.floor(g.time * 14) % 2);
    // bolha do Shield e anel do ímã
    const mid = cam.project(pl.x, pl.y + pl.height * 0.55, 0);
    if (g.power.shield > 0) {
      ctx.fillStyle = 'rgba(0,217,255,.14)'; ctx.strokeStyle = 'rgba(0,217,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(mid.x, mid.y, mid.s * 0.8, mid.s * 1.15, 0, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (g.power.magnet > 0) {
      const r = mid.s * (0.9 + (g.time * 2 % 1) * 0.6);
      ctx.strokeStyle = `rgba(255,79,191,${0.7 - (g.time * 2 % 1) * 0.6})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(mid.x, mid.y + mid.s * 0.5, r, r * 0.35, 0, 0, 7); ctx.stroke();
    }
    ZYRO.Character.draw(ctx, feet.x, feet.y, feet.s, {
      phase: pl.runPhase, jump: this.pose.j, slide: this.pose.s * (1 - this.pose.j),
      tilt: pl.tilt + pl.bump * 0.3, shift: g.shift.active && !blink, land: pl.landPulse, jetpack: g.power.jetpack > 0,
      hit: g.state === 'dying' || g.state === 'over' ? 1 : 0, alpha: blink && !g.shift.active ? 0.45 : 1
    });
  },

  drawDebug(ctx) {
    const g = this.game, cam = ZYRO.Camera;
    ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
    const box = (x0, x1, y0, y1, z) => { const a = cam.project(x0, y1, z), b = cam.project(x1, y0, z); if (a && b) ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); };
    const pb = g.player.box(); box(pb.x0, pb.x1, pb.y0, pb.y1, 0);
    ctx.strokeStyle = '#f00';
    for (const o of g.obstacles) { const z = o.d - g.dist; if (z > -1 && z < 60) for (const b of ZYRO.Collision.boxes(o)) box(b.x0, b.x1, b.y0, b.y1, z); }
    ctx.strokeStyle = '#ff0';
    for (const p of g.platforms) { const z = p.d0 - g.dist; if (z > -1 && z < 60) box(p.lane * 2.4 - 1.1, p.lane * 2.4 + 1.1, 0, p.h, z); }
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`fps ${Math.round(this.fps || 0)}  v ${ZYRO.Progression.speedUnits(g.dist)} medidas (${g.speed.toFixed(1)} m/s)  d ${Math.floor(g.dist)}  obj ${g.obstacles.length}/${g.coins.length}`, 10, this.H - 12);
  }
};
