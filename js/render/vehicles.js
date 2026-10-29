/* =========================================================
   ZYRO — vehicles.js  (Carros voadores e rampas)
   • Contramão: carro rosa com faróis brancos vindo na direção
     do jogador. Lá longe ele voa alto e desce para a faixa.
   • Estacionados: vans flutuantes de teto plano (plataformas),
     com lanternas vermelhas e, às vezes, rampa amarela na frente.

   Usa as mesmas ferramentas do sprites.js: texturas feitas uma
   vez no init() e caixas em perspectiva (ZYRO.Sprites.box).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Vehicles = {
  VAN_COLORS: [['#2DB5D9', '#1C7FA0'], ['#7955FF', '#5536C9'], ['#FF9D43', '#D06A1C']],

  init() {
    const S = ZYRO.Sprites, C = ZYRO.CONFIG.COLORS;
    // frente do carro na contramão (parte de baixo)
    const body = (top, bottom) => S.canvas(240, 120, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom);
      S.rr(c, 4, 4, w - 8, h - 8, 26); c.fillStyle = g; c.fill();
      c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke();
      c.fillStyle = '#101A35'; S.rr(c, 70, 52, 100, 34, 10); c.fill();
      c.strokeStyle = C.azul; c.lineWidth = 3; for (let x = 82; x < 168; x += 14) { c.beginPath(); c.moveTo(x, 58); c.lineTo(x, 80); c.stroke(); }
      for (const x of [16, 170]) {                       // faróis
        c.fillStyle = '#fff'; S.rr(c, x, 26, 54, 30, 12); c.fill();
        c.fillStyle = C.azul; S.rr(c, x + 6, 32, 42, 18, 8); c.fill();
        c.fillStyle = '#fff'; S.rr(c, x + 12, 36, 30, 10, 5); c.fill();
      }
      c.fillStyle = C.amarelo; c.fillRect(40, 96, 160, 6);
    });
    this.carBody = body('#FF6FCB', '#B4259A');     // carro baixo: troque de faixa
    this.carBodyA = body('#B9A5FF', '#5536C9');    // carro alto: deslize por baixo
    // para-brisa
    this.carGlass = S.canvas(180, 90, (c, w, h) => {
      c.fillStyle = '#1B2A5C'; c.beginPath(); c.moveTo(18, h - 4); c.lineTo(36, 6); c.lineTo(w - 36, 6); c.lineTo(w - 18, h - 4); c.closePath(); c.fill();
      c.strokeStyle = '#FF6FCB'; c.lineWidth = 6; c.stroke();
      c.strokeStyle = 'rgba(127,235,255,.55)'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(56, 70); c.lineTo(80, 18); c.moveTo(80, 74); c.lineTo(100, 32); c.stroke();
    });
    // traseira das vans estacionadas (3 cores)
    this.vanRear = this.VAN_COLORS.map(([a, b]) => S.canvas(240, 200, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b);
      S.rr(c, 4, 4, w - 8, h - 8, 22); c.fillStyle = g; c.fill();
      c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.65)'; c.stroke();
      c.fillStyle = '#101A35'; S.rr(c, 30, 20, 180, 66, 14); c.fill();
      c.strokeStyle = 'rgba(127,235,255,.5)'; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 74); c.lineTo(84, 30); c.stroke();
      for (const x of [18, 172]) { c.fillStyle = '#FF4D6D'; S.rr(c, x, 104, 50, 22, 8); c.fill(); c.fillStyle = '#FFC2CC'; S.rr(c, x + 8, 109, 22, 8, 4); c.fill(); }
      c.fillStyle = '#101A35'; c.beginPath(); c.arc(120, 124, 24, 0, 7); c.fill();
      c.strokeStyle = C.amarelo; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(110, 113); c.lineTo(130, 113); c.lineTo(110, 135); c.lineTo(130, 135); c.stroke();
      c.fillStyle = 'rgba(16,26,53,.55)'; c.fillRect(10, 160, w - 20, 26);
      c.fillStyle = C.azul; c.fillRect(20, 168, w - 40, 6);
    }));
  },

  // Altura extra dos carros na contramão enquanto estão longe: acima de 45 m eles voam alto e vão descendo
  // até a faixa. É só visual (a colisão usa a altura normal), mas mostra de onde o carro está vindo.
  altitude(z) { return ZYRO.Utils.clamp((z - 45) * 0.07, 0, 7); },

  // polígono a partir de uma lista de pontos [x, y] já projetados
  poly(ctx, points, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  },

  // brilho achatado embaixo do veículo (luz dos propulsores refletida)
  underGlow(ctx, cam, x, y, z, w, color) {
    const p = cam.project(x, y, z); if (!p) return;
    const r = w * p.s;
    ctx.save(); ctx.globalAlpha *= 0.8; ctx.drawImage(ZYRO.Sprites.glow(color), p.x - r, p.y - r * 0.3, r * 2, r * 0.6); ctx.restore();
  },

  // ---------- Carro na contramão ----------
  // Montado com 2 caixas: carroceria (com a textura da frente) e cabine (para-brisa).
  // base = altura de baixo da carroceria: o carro alto (A) flutua a 1 m, para dar para deslizar por baixo.
  oncoming(ctx, cam, o, z0, t) {
    const S = ZYRO.Sprites, LW = ZYRO.CONFIG.LANE_WIDTH, x = o.lane * LW, len = o.len;
    const extraHeight = this.altitude(z0), base = (o.type === 'A' ? 1.0 : 0.25) + extraHeight;
    if (extraHeight < 1.5) S.shadow(ctx, cam, x - 1.1, x + 1.1, z0, z0 + len, 0.26 * (1 - extraHeight / 1.5));
    // rastro de velocidade
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    for (const sx of [-0.9, 0.9]) {
      const a = cam.project(x + sx, base + 0.6, z0 + len), b = cam.project(x + sx, base + 0.6, z0 + len + 9);
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    this.underGlow(ctx, cam, x, base - 0.05, z0 + len * 0.4, 1.4, o.type === 'A' ? '#FF4FBF' : '#00D9FF');
    const high = o.type === 'A';
    if (high && extraHeight < 0.5) S.billboard(ctx, cam, S.tex.chevDown, x, 0.1 + Math.sin(t * 6) * 0.05, z0 - 0.3, 0.8, 0.8, 0.85);
    S.box(ctx, cam, x - 1.0, x + 1.0, base, base + 1.25, z0, z0 + len, high ? { tex: this.carBodyA, top: '#9C83FF', side: '#4A34B0' } : { tex: this.carBody, top: '#E04FB4', side: '#8E2C8F' });
    S.box(ctx, cam, x - 0.75, x + 0.75, base + 1.25, base + 2.15, z0 + 1.6, z0 + len - 1.4, { tex: this.carGlass, top: '#3A2A8C', side: '#24306A' });
    // faróis acesos
    for (const sx of [-0.62, 0.62]) {
      const p = cam.project(x + sx, base + 0.62, z0); if (!p) continue;
      const r = 0.75 * p.s * (0.9 + Math.sin(t * 20) * 0.05);
      ctx.drawImage(S.glow('#FFFFFF'), p.x - r, p.y - r, r * 2, r * 2);
    }
    // propulsores
    for (const sx of [-0.7, 0.7]) {
      const p = cam.project(x + sx, base - 0.05, z0 + 1.2); if (!p) continue;
      const r = 0.35 * p.s;
      ctx.drawImage(S.glow('#00D9FF'), p.x - r, p.y - r, r * 2, r * 2);
    }
  },

  // ---------- Rampa amarela na frente da van ----------
  // A rampa é um plano inclinado: começa no chão (y = 0) em z0 e chega no teto (y = h) em z1.
  // As laterais são triângulos (só a que a câmera vê).
  ramp(ctx, cam, platform, z0) {
    const P = ZYRO.CONFIG.PLATFORM, x = platform.lane * ZYRO.CONFIG.LANE_WIDTH, x0 = x - 1.05, x1 = x + 1.05, z1 = z0 + P.rampLen, h = platform.h;
    const Q = (a, b, c) => cam.px(a, b, c);
    if (cam.x < x0) this.poly(ctx, [Q(x0, 0, z0), Q(x0, 0, z1), Q(x0, h, z1)], '#B08A1C');
    if (cam.x > x1) this.poly(ctx, [Q(x1, 0, z0), Q(x1, 0, z1), Q(x1, h, z1)], '#B08A1C');
    this.poly(ctx, [Q(x0, 0, z0), Q(x1, 0, z0), Q(x1, h, z1), Q(x0, h, z1)], '#FFD447', 'rgba(255,255,255,.7)', 1.5);
    // listras diagonais escuras
    ctx.strokeStyle = 'rgba(16,26,53,.75)';
    for (let i = 1; i < 6; i++) {
      const k = i / 6, zz = z0 + k * P.rampLen, yy = h * k;
      const a = cam.project(x0 + 0.15, yy, zz), b = cam.project(x, yy + 0.08, zz + 0.25), c = cam.project(x1 - 0.15, yy, zz);
      if (!a || !b || !c) continue;
      ctx.lineWidth = Math.max(1.5, b.s * 0.1);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
  },

  // ---------- Uma van estacionada (cada platform tem de 1 a 3) ----------
  // zc = onde esta van começa (relativo ao jogador) · len = comprimento de uma van
  van(ctx, cam, platform, zc, len, t) {
    const S = ZYRO.Sprites, x = platform.lane * ZYRO.CONFIG.LANE_WIDTH, x0 = x - 1.05, x1 = x + 1.05, z1 = zc + len - 0.4, h = platform.h;
    const [col, dark] = this.VAN_COLORS[platform.color];
    S.shadow(ctx, cam, x0 - 0.1, x1 + 0.1, zc, z1, 0.3);
    this.underGlow(ctx, cam, x, 0.15, zc + len / 2, 1.5, '#00D9FF');
    S.box(ctx, cam, x0, x1, 0.3, h, zc, z1, { tex: this.vanRear[platform.color], top: '#3A4A8A', side: ZYRO.Utils.mixHex(dark, '#101A35', 0.25) });
    // janelas na lateral visível
    const side = cam.x < x0 ? x0 : cam.x > x1 ? x1 : null;
    if (side !== null) {
      for (let wz = zc + 0.9; wz < z1 - 1.2; wz += 2.1) {
        this.poly(ctx, [cam.px(side, 1.15, wz), cam.px(side, 1.72, wz), cam.px(side, 1.72, wz + 1.5), cam.px(side, 1.15, wz + 1.5)], '#101A35', 'rgba(127,235,255,.45)', 1);
      }
      const a = cam.px(side, 0.75, Math.max(zc, cam.z + 0.7)), b = cam.px(side, 0.75, z1);
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, cam.scaleAt(zc) * 0.08);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // bordas neon do teto (onde dá para correr)
    ctx.strokeStyle = '#00D9FF'; ctx.lineWidth = Math.max(1.5, cam.scaleAt(Math.max(zc, 0)) * 0.05);
    for (const ex of [x0, x1]) {
      const a = cam.px(ex, h, Math.max(zc, cam.z + 0.7)), b = cam.px(ex, h, z1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // propulsores embaixo
    for (const sx of [-0.75, 0.75]) {
      const p = cam.project(x + sx, 0.28, zc + 0.6); if (!p) continue;
      const r = 0.38 * p.s * (0.85 + Math.sin(t * 14 + zc) * 0.15);
      ctx.drawImage(S.glow('#00D9FF'), p.x - r, p.y - r, r * 2, r * 2);
    }
  }
};
