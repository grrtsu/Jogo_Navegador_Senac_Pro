/* =========================================================
   ZYRO — effects.js  (Partículas e efeitos de tela)
   Brilho de coleta, detritos, poeira, confete, linhas de
   velocidade e ondas de energia. Usa poucos objetos e
   respeita "Redução de animações" e "Qualidade gráfica".

   SISTEMA DE PARTÍCULAS: cada partícula é um objeto simples
   { x, y, vx, vy, life }. A cada quadro: a gravidade muda vy,
   a velocidade muda a posição e a vida diminui. Quando a vida
   acaba, ela sai da lista. Os efeitos ficam em coordenadas de
   TELA (px), não do mundo: são rápidos e não precisam de 3D.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Effects = {
  parts: [],    // partículas (pontos, retângulos, faíscas)
  floats: [],   // textos que sobem ("+100")
  rings: [],    // ondas de energia (elipses que crescem)
  reduce: false, quality: 'alta',

  // "Orçamento" de partículas: com qualidade baixa ou animações reduzidas, solta menos
  get budget() { return this.reduce ? 0.35 : this.quality === 'baixa' ? 0.4 : this.quality === 'media' ? 0.7 : 1; },

  // Explosão de n partículas em (x, y). Opções: angle + spread (direção do leque), speed, gravity, life, size, shape.
  burst(x, y, colors, n, o = {}) {
    n = Math.max(1, Math.round(n * this.budget));
    for (let i = 0; i < n && this.parts.length < 420; i++) {   // limite de 420 para nunca pesar o jogo
      const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2;
      const v = (o.speed || 240) * (0.4 + Math.random() * 0.8);
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity ?? 500,
        life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), max: 0,
        size: (o.size || 6) * (0.5 + Math.random()), color: colors[i % colors.length],
        shape: o.shape || 'dot', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12
      });
      this.parts[this.parts.length - 1].max = this.parts[this.parts.length - 1].life;
    }
  },
  sparkle(x, y, color, size) {
    this.burst(x, y, [color, '#FFFFFF'], 10, { speed: 220, gravity: 80, life: 0.45, size: size || 5, shape: 'spark' });
    this.rings.push({ x, y, r: 4, max: 34, life: 0.3, t: 0.3, color, w: 3 });
  },
  wave(x, y, color, max = 260) {
    if (this.reduce) max *= 0.6;
    this.rings.push({ x, y, r: 10, max, life: 0.55, t: 0.55, color, w: 10 });
  },
  confetti(W) {
    const cols = ['#00D9FF', '#FF4FBF', '#FFD447', '#42EDAA', '#FF9D43', '#7955FF'];
    const n = Math.round(90 * this.budget);
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 140, g: 60,
        life: 4.5, max: 4.5, size: 7 + Math.random() * 6, color: cols[i % 6], shape: 'rect', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8 });
    }
  },
  float(text, color, x, y, size = 26) {
    this.floats.push({ text, color, x, y, t: 0, life: 0.9, size });
  },

  // física simples: gravidade → velocidade → posição; remove o que morreu
  update(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter(f => f.t < f.life);
    for (const r of this.rings) { r.t -= dt; r.r = r.max * (1 - r.t / r.life); }
    this.rings = this.rings.filter(r => r.t > 0);
  },

  draw(ctx) {
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.t / r.life);
      ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (r.t / r.life) + 1;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.55, 0, 0, 7); ctx.stroke();
    }
    for (const p of this.parts) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
      } else if (p.shape === 'spark') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -1, p.size * 2, 2); ctx.fillRect(-1, -p.size, 2, p.size * 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.max * 0.6 + 0.4), 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of this.floats) {
      const k = f.t / f.life, y = f.y - 60 * ZYRO.Utils.easeOutCubic(k), s = 1 + (k < 0.15 ? (0.15 - k) * 3 : 0);
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      ctx.font = `900 italic ${Math.round(f.size * s)}px "Exo 2", system-ui, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#101A35'; ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
  },

  // linhas de velocidade saindo do ponto de fuga
  speedLines(ctx, cam, amount, t, colors) {
    if (amount <= 0.01) return;
    const n = Math.round((this.reduce ? 10 : 28) * amount);
    const cx = cam.cx, cy = cam.horizon + (cam.groundY - cam.horizon) * 0.25;
    const R = Math.hypot(cam.W, cam.H);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const seed = ZYRO.Utils.hash(i, Math.floor(t * 9));
      const a = seed * Math.PI * 2, r0 = R * (0.22 + ZYRO.Utils.hash(i + 9, Math.floor(t * 9)) * 0.25), r1 = r0 + R * (0.12 + seed * 0.2);
      ctx.strokeStyle = colors[i % colors.length]; ctx.globalAlpha = 0.25 + 0.35 * amount; ctx.lineWidth = 1.5 + seed * 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};
