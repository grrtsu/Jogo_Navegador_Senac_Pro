/* =========================================================
   ZYRO — sprites.js  (Obstáculos, ZYRO CORES e power-ups)

   Duas técnicas principais:

   1. TEXTURAS PRÉ-DESENHADAS (canvas fora da tela)
      Listras, ícones e degradês são caros de desenhar. Em vez
      de redesenhar a cada quadro, init() desenha cada textura
      UMA vez num canvas invisível; depois só "carimbamos" a
      imagem pronta com drawImage (muito mais rápido).

   2. CAIXAS EM PERSPECTIVA (box)
      Cada obstáculo é feito de caixas: frente + topo + lateral.
      Projetamos os cantos com a câmera e pintamos as faces
      que a câmera consegue ver.

   Nos init: "c" é o contexto 2D do canvas da textura, e
   "w"/"h" o tamanho dela em px. "S" é atalho para this.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Sprites = {
  tex: {}, glows: {},

  // cria um canvas invisível de w × h e desenha nele com a função draw (é o "molde" de cada textura)
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  },
  // retângulo de cantos arredondados (rounded rect) com raio r
  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  },
  // listras diagonais (de alerta) a cada "step" px
  stripes(ctx, w, h, color, alpha, step, width) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    for (let i = -h; i < w + h; i += step) { ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke(); }
    ctx.restore();
  },
  // ícones como caminhos SVG (o mesmo desenho do index.html), desenhados no canvas com Path2D
  ICONS: {
    ima: 'M6 3v8a6 6 0 0012 0V3 M6 3h4v8a2 2 0 004 0V3h4 M6 7h4M14 7h4',
    escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z M9 12l2 2 4-4',
    estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    raio: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
    foguete: 'M12 2c2.6 2 4 5 4 9v5H8v-5c0-4 1.4-7 4-9z M8 12l-3 3v4h3 M16 12l3 3v4h-3 M10 20v2 M14 20v2 M12 8v1'
  },
  icon(ctx, name, x, y, size, color, lw = 2.4) {
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(this.ICONS[name])); ctx.restore();
  },

  // brilho radial de uma cor. Guardado em this.glows: cada cor só é desenhada uma vez (cache).
  glow(color) {
    if (!this.glows[color]) {
      this.glows[color] = this.canvas(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, ZYRO.Utils.rgba(color, 0.9)); g.addColorStop(0.25, ZYRO.Utils.rgba(color, 0.45)); g.addColorStop(1, ZYRO.Utils.rgba(color, 0));
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      });
    }
    return this.glows[color];
  },

  // Desenha todas as texturas uma vez, quando o jogo carrega.
  init() {
    const S = this, C = ZYRO.CONFIG.COLORS;
    // barreira vermelha: listras brancas, borda clara e um "X" no meio
    S.tex.red = S.canvas(256, 240, (c, w, h) => {
      S.rr(c, 6, 6, w - 12, h - 12, 22); c.fillStyle = '#FF4D6D'; c.fill();
      c.save(); c.clip(); S.stripes(c, w, h, '#fff', 0.28, 34, 13);
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.22)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h); c.restore();
      S.rr(c, 6, 6, w - 12, h - 12, 22); c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke();
      S.rr(c, 56, 66, 144, 104, 18); c.fillStyle = C.escuro; c.fill();
      c.lineCap = 'round'; c.lineWidth = 16; c.strokeStyle = '#FF4D6D';
      c.beginPath(); c.moveTo(102, 92); c.lineTo(154, 144); c.moveTo(154, 92); c.lineTo(102, 144); c.stroke();
      c.fillStyle = C.amarelo; [[38, 34], [218, 34]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); });
    });
    // barreira baixa: laranja com listras amarelas
    S.tex.low = S.canvas(320, 64, (c, w, h) => {
      S.rr(c, 4, 4, w - 8, h - 8, 12); c.fillStyle = C.laranja; c.fill();
      c.save(); c.clip(); S.stripes(c, w, h, C.amarelo, 0.95, 38, 15); c.restore();
      S.rr(c, 4, 4, w - 8, h - 8, 12); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
    });
    // barreira elevada: rosa com setas para baixo (dica: deslize)
    S.tex.high = S.canvas(320, 80, (c, w, h) => {
      S.rr(c, 4, 4, w - 8, h - 8, 14); c.fillStyle = C.rosa; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
      c.strokeStyle = C.escuro; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
      [80, 160, 240].forEach(x => { c.beginPath(); c.moveTo(x - 20, 28); c.lineTo(x, 50); c.lineTo(x + 20, 28); c.stroke(); });
    });
    // campo de energia translúcido embaixo da barreira elevada
    S.tex.field = S.canvas(320, 140, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,79,191,.55)'); g.addColorStop(1, 'rgba(255,79,191,.12)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2;
      for (let y = 14; y < h; y += 22) { c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 20) c.lineTo(x, y + Math.sin(x / 30 + y) * 4); c.stroke(); }
    });
    // bloco energético: grade azul com um raio no centro
    S.tex.block = S.canvas(240, 240, (c, w, h) => {
      c.fillStyle = '#223463'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(0,217,255,.45)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
      const g = c.createRadialGradient(120, 120, 0, 120, 120, 80); g.addColorStop(0, 'rgba(0,217,255,.8)'); g.addColorStop(1, 'rgba(0,217,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = C.azul; c.beginPath(); c.arc(120, 120, 36, 0, 7); c.fill();
      c.fillStyle = C.escuro; c.beginPath(); c.moveTo(127, 92); c.lineTo(104, 126); c.lineTo(122, 126); c.lineTo(114, 150); c.lineTo(138, 114); c.lineTo(120, 114); c.closePath(); c.fill();
      c.strokeStyle = C.azul; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    });
    // portão de energia (as faixas fechadas)
    S.tex.gate = S.canvas(240, 320, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,79,191,.75)'); g.addColorStop(1, 'rgba(255,79,191,.35)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3;
      for (let y = 20; y < h; y += 30) { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(w / 2, y - 14, w, y); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      S.icon(c, 'raio', w / 2, h / 2, 90, 'rgba(255,255,255,.75)', 2);
    });
    // setas que flutuam sobre os obstáculos: verde para cima (pule) e rosa para baixo (deslize)
    S.tex.chevUp = S.canvas(120, 120, (c) => {
      c.strokeStyle = C.verde; c.lineWidth = 14; c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = C.verde; c.shadowBlur = 14;
      [[60, 30], [60, 70]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 32, y + 26); c.lineTo(x, y); c.lineTo(x + 32, y + 26); c.stroke(); });
    });
    S.tex.chevDown = S.canvas(120, 120, (c) => {
      c.strokeStyle = C.rosa; c.lineWidth = 14; c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = C.rosa; c.shadowBlur = 14;
      [[60, 50], [60, 90]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 32, y - 26); c.lineTo(x, y); c.lineTo(x + 32, y - 26); c.stroke(); });
    });

    // ZYRO CORE: anel + losango (o losango gira, o anel fica)
    const coreParts = (top, bottom, ring) => ({
      ring: S.canvas(160, 160, (c) => {
        c.save(); c.translate(80, 86); c.rotate(-0.3); c.scale(1, 0.32);
        c.beginPath(); c.arc(0, 0, 66, 0, 7); c.lineWidth = 9; c.strokeStyle = ring; c.stroke(); c.restore();
      }),
      gem: S.canvas(100, 160, (c) => {
        const g = c.createLinearGradient(0, 8, 0, 152); g.addColorStop(0, top); g.addColorStop(1, bottom);
        c.fillStyle = g; c.beginPath(); c.moveTo(50, 6); c.lineTo(94, 80); c.lineTo(50, 154); c.lineTo(6, 80); c.closePath(); c.fill();
        c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(50, 6); c.lineTo(66, 80); c.lineTo(50, 154); c.lineTo(36, 80); c.closePath(); c.fill();
        c.fillStyle = ring; c.beginPath(); c.arc(50, 80, 17, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(50, 80, 7, 0, 7); c.fill();
      })
    });
    S.coreGold = coreParts(C.amarelo, C.laranja, C.azul);
    S.coreBlue = coreParts(C.azul, C.roxo, C.rosa);

    // cápsulas de power-up
    S.caps = {};
    for (const [k, T] of Object.entries(ZYRO.POWERUP_TYPES)) {
      S.caps[k] = S.canvas(160, 160, (c) => {
        const g = c.createRadialGradient(64, 60, 4, 80, 80, 70); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, ZYRO.Utils.rgba(T.cor, 0.45)); g.addColorStop(1, ZYRO.Utils.rgba(T.cor, 0.75));
        c.fillStyle = g; c.beginPath(); c.arc(80, 80, 66, 0, 7); c.fill();
        c.lineWidth = 8; c.strokeStyle = T.cor; c.stroke();
        c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(80, 80, 52, 3.6, 4.6); c.stroke();
        S.icon(c, T.icone, 80, 82, 78, '#fff', 2.6);
      });
    }
  },

  // ---------- Caixa 3D em perspectiva ----------
  // Uma caixa de x0..x1 (lado), y0..y1 (altura) e z0..z1 (profundidade), com o estilo de cada face:
  // style = { front | tex (textura da frente), top, side, edge, frontEdge, edgeW }
  // Só pintamos as faces que a câmera VÊ: o topo se a câmera está acima dele; a lateral esquerda
  // se a câmera está à esquerda da caixa, e vice-versa. A frente é desenhada por último (fica por cima).
  box(ctx, cam, x0, x1, y0, y1, z0, z1, style) {
    const P = (x, y, z) => cam.px(x, y, z);
    const polygon = (points, fill) => {
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (style.edge) { ctx.strokeStyle = style.edge; ctx.lineWidth = style.edgeW || 1.5; ctx.stroke(); }
    };
    if (z1 - z0 > 0.02) {   // caixa "chapada" (sem profundidade) não tem topo nem lateral
      if (style.top && cam.y > y1) polygon([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], style.top);
      if (style.side && cam.x < x0) polygon([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], style.side);
      if (style.side && cam.x > x1) polygon([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], style.side);
    }
    // a frente é um retângulo de verdade (está toda à mesma distância): cantos superior esquerdo e inferior direito
    const topLeft = P(x0, y1, z0), bottomRight = P(x1, y0, z0);
    const width = bottomRight[0] - topLeft[0], height = bottomRight[1] - topLeft[1];
    if (style.tex) ctx.drawImage(style.tex, topLeft[0], topLeft[1], width, height);
    else if (style.front) { ctx.fillStyle = style.front; ctx.fillRect(topLeft[0], topLeft[1], width, height); }
    if (style.frontEdge) { ctx.strokeStyle = style.frontEdge; ctx.lineWidth = style.edgeW || 2; ctx.strokeRect(topLeft[0], topLeft[1], width, height); }
    return { a: topLeft, b: bottomRight };
  },

  // sombra: um retângulo escuro deitado no chão (y ≈ 0)
  shadow(ctx, cam, x0, x1, z0, z1, alpha = 0.28) {
    const pts = [cam.px(x0, 0.01, z0), cam.px(x1, 0.01, z0), cam.px(x1, 0.01, z1), cam.px(x0, 0.01, z1)];
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...pts[i]); ctx.closePath();
    ctx.fillStyle = `rgba(5,8,25,${alpha})`; ctx.fill();
  },

  // "Billboard": imagem plana sempre virada para a câmera (setas, hologramas).
  // widthMeters/heightMeters = tamanho no mundo; a escala da projeção converte para pixels.
  billboard(ctx, cam, image, x, y, z, widthMeters, heightMeters, alpha = 1) {
    const point = cam.project(x, y, z); if (!point) return;
    const width = widthMeters * point.s, height = heightMeters * point.s;
    ctx.globalAlpha = alpha; ctx.drawImage(image, point.x - width / 2, point.y - height, width, height); ctx.globalAlpha = 1;
  },

  // ---------- Obstáculos (cada um é uma montagem de caixas) ----------
  // z0 = distância da frente do obstáculo até o jogador · t = tempo (para as animações)
  obstacle(ctx, cam, o, z0, t) {
    const S = this, LW = ZYRO.CONFIG.LANE_WIDTH, z1 = z0 + o.len, x = o.lane * LW;
    const pulse = 0.65 + Math.sin(t * 6 + o.d) * 0.25;   // brilho pulsante das setas (o + o.d desencontra os pulsos)
    switch (o.type) {
      case 'R':   // barreira vermelha: dois pés + painel com textura
        S.shadow(ctx, cam, x - 1.15, x + 1.15, z0 - 0.2, z1 + 0.6);
        S.box(ctx, cam, x - 0.95, x - 0.75, 0, 0.25, z0 + 0.05, z1, { front: '#223463', top: '#344A80', side: '#18264D' });
        S.box(ctx, cam, x + 0.75, x + 0.95, 0, 0.25, z0 + 0.05, z1, { front: '#223463', top: '#344A80', side: '#18264D' });
        S.box(ctx, cam, x - 1.0, x + 1.0, 0.18, 1.9, z0, z1, { tex: S.tex.red, top: '#E8506A', side: '#B02A45' });
        break;
      case 'L':   // barreira baixa: dois postes + faixa laranja + seta "pule"
        S.shadow(ctx, cam, x - 1.15, x + 1.15, z0 - 0.1, z1 + 0.5, 0.22);
        S.box(ctx, cam, x - 1.0, x - 0.86, 0, 0.6, z0 + 0.1, z1, { front: '#344A80', top: '#4B5DA8', side: '#223463' });
        S.box(ctx, cam, x + 0.86, x + 1.0, 0, 0.6, z0 + 0.1, z1, { front: '#344A80', top: '#4B5DA8', side: '#223463' });
        S.box(ctx, cam, x - 1.08, x + 1.08, 0.55, 0.95, z0, z1, { tex: S.tex.low, top: '#FFC36B', side: '#D9772A' });
        S.billboard(ctx, cam, S.tex.chevUp, x, 1.25 + Math.sin(t * 5) * 0.08, z0, 0.9, 0.9, pulse);
        break;
      case 'H':   // barreira elevada: pórtico roxo + painel rosa no alto + seta "deslize" no chão
        S.shadow(ctx, cam, x - 1.2, x + 1.2, z0 - 0.1, z1 + 0.5, 0.2);
        S.box(ctx, cam, x - 1.12, x - 0.9, 0, 3.2, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6' });
        S.box(ctx, cam, x + 0.9, x + 1.12, 0, 3.2, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6' });
        S.box(ctx, cam, x - 0.9, x + 0.9, 1.6, 2.85, z0 + 0.15, z0 + 0.15, { tex: S.tex.field });
        S.box(ctx, cam, x - 1.15, x + 1.15, 2.85, 3.25, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6', frontEdge: '#FF4FBF' });
        S.box(ctx, cam, x - 1.0, x + 1.0, 1.0, 1.6, z0, z1, { tex: S.tex.high, top: '#FF7ED1', side: '#D93A9E' });
        S.billboard(ctx, cam, S.tex.chevDown, x, 0.15 + Math.sin(t * 5) * 0.06, z0 - 0.2, 0.75, 0.75, pulse);
        break;
      case 'B':   // bloco energético: um cubo
        S.shadow(ctx, cam, x - 1.25, x + 1.25, z0 - 0.2, z1 + 0.8, 0.3);
        S.box(ctx, cam, x - 1.05, x + 1.05, 0, 2.2, z0, z1, { tex: S.tex.block, top: '#344A80', side: '#18264D', edge: 'rgba(0,217,255,.8)', edgeW: 2 });
        break;
      case 'T': case 'A':   // carros na contramão: desenhados em vehicles.js
        ZYRO.Vehicles.oncoming(ctx, cam, o, z0, t);
        break;
      case 'G': {   // portão: 3 faixas, campo de energia nas fechadas, seta verde na aberta, luzes no alto
        S.shadow(ctx, cam, -3.8, 3.8, z0 - 0.2, z1 + 0.6, 0.18);
        for (const l of [-1, 0, 1]) {
          if (l === o.open) {
            S.billboard(ctx, cam, S.tex.chevUp, l * LW, 0.2 + Math.sin(t * 6) * 0.1, z0 + 0.1, 1.3, 1.3, pulse);
          } else {
            ctx.globalAlpha = 0.9;
            S.box(ctx, cam, l * LW - 1.08, l * LW + 1.08, 0, 3.2, z0 + 0.1, z0 + 0.1, { tex: S.tex.gate });
            ctx.globalAlpha = 1;
          }
        }
        for (const px of [-3.6, -1.2, 1.2, 3.6]) S.box(ctx, cam, px - 0.14, px + 0.14, 0, 3.7, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6' });
        const beam = S.box(ctx, cam, -3.8, 3.8, 3.2, 3.7, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6', frontEdge: '#00D9FF', edgeW: 2.5 });
        for (const l of [-1, 0, 1]) {
          const p = cam.project(l * LW, 3.45, z0); if (!p) continue;
          const col = l === o.open ? '#42EDAA' : '#FF4D6D', r = 0.5 * p.s;
          ctx.drawImage(S.glow(col), p.x - r * 2, p.y - r * 2, r * 4, r * 4);
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.35, 0, 7); ctx.fill();
        }
        break;
      }
    }
  },

  // ---------- Coletáveis ----------
  core(ctx, cam, core, z, t) {
    const bob = Math.sin(t * 3 + core.d * 0.7) * 0.1;            // flutua para cima e para baixo
    const point = cam.project(core.x, core.y + bob, z); if (!point) return;
    const parts = core.super ? this.coreBlue : this.coreGold;
    const size = (core.super ? 0.95 : 0.72) * point.s;
    ctx.drawImage(this.glow(core.super ? '#00D9FF' : '#FFD447'), point.x - size * 1.1, point.y - size * 1.1, size * 2.2, size * 2.2);
    if (core.y > 0.3 && core.y < 4 && !core.roof) {                // sombrinha no chão (ajuda a perceber a altura)
      const shadow = cam.project(core.x, 0.01, z);
      if (shadow) { ctx.fillStyle = 'rgba(5,8,25,.25)'; ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, size * 0.35, size * 0.1, 0, 0, 7); ctx.fill(); }
    }
    ctx.drawImage(parts.ring, point.x - size * 0.75, point.y - size * 0.75, size * 1.5, size * 1.5);
    // "Girar" sem 3D: a largura do losango segue |cos(t)|. Largo → fino → largo parece uma moeda girando.
    const spin = Math.cos(t * 4 + core.d * 0.3);
    const gemWidth = size * 0.6 * Math.max(0.12, Math.abs(spin)), gemHeight = size * 0.98;
    ctx.drawImage(parts.gem, point.x - gemWidth / 2, point.y - gemHeight / 2, gemWidth, gemHeight);
  },

  powerup(ctx, cam, item, z, t) {
    const point = cam.project(item.x, item.y + Math.sin(t * 2.5 + item.d) * 0.15, z); if (!point) return;
    const color = ZYRO.POWERUP_TYPES[item.type].cor, size = 1.15 * point.s;
    ctx.drawImage(this.glow(color), point.x - size * 1.3, point.y - size * 1.3, size * 2.6, size * 2.6);
    ctx.drawImage(this.caps[item.type], point.x - size / 2, point.y - size / 2, size, size);
  }
};
