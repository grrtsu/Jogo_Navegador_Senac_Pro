/* =========================================================
   ZYRO — sprites.js  (Obstáculos, ZYRO CORES e power-ups)
   Texturas são desenhadas uma vez em canvas fora da tela
   (mais rápido) e depois aplicadas nas faces em perspectiva.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Sprites = {
  tex: {}, glows: {},

  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  },
  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  },
  stripes(ctx, w, h, color, alpha, step, width) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    for (let i = -h; i < w + h; i += step) { ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke(); }
    ctx.restore();
  },
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

  // brilho radial colorido (reaproveitado)
  glow(color) {
    if (!this.glows[color]) {
      this.glows[color] = this.canvas(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, ZYRO.U.rgba(color, 0.9)); g.addColorStop(0.25, ZYRO.U.rgba(color, 0.45)); g.addColorStop(1, ZYRO.U.rgba(color, 0));
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      });
    }
    return this.glows[color];
  },

  init() {
    const S = this, C = ZYRO.CONFIG.COLORS;
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
    S.tex.low = S.canvas(320, 64, (c, w, h) => {
      S.rr(c, 4, 4, w - 8, h - 8, 12); c.fillStyle = C.laranja; c.fill();
      c.save(); c.clip(); S.stripes(c, w, h, C.amarelo, 0.95, 38, 15); c.restore();
      S.rr(c, 4, 4, w - 8, h - 8, 12); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
    });
    S.tex.high = S.canvas(320, 80, (c, w, h) => {
      S.rr(c, 4, 4, w - 8, h - 8, 14); c.fillStyle = C.rosa; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
      c.strokeStyle = C.escuro; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
      [80, 160, 240].forEach(x => { c.beginPath(); c.moveTo(x - 20, 28); c.lineTo(x, 50); c.lineTo(x + 20, 28); c.stroke(); });
    });
    S.tex.field = S.canvas(320, 140, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,79,191,.55)'); g.addColorStop(1, 'rgba(255,79,191,.12)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2;
      for (let y = 14; y < h; y += 22) { c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 20) c.lineTo(x, y + Math.sin(x / 30 + y) * 4); c.stroke(); }
    });
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
    S.tex.gate = S.canvas(240, 320, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,79,191,.75)'); g.addColorStop(1, 'rgba(255,79,191,.35)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3;
      for (let y = 20; y < h; y += 30) { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(w / 2, y - 14, w, y); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      S.icon(c, 'raio', w / 2, h / 2, 90, 'rgba(255,255,255,.75)', 2);
    });
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
        const g = c.createRadialGradient(64, 60, 4, 80, 80, 70); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, ZYRO.U.rgba(T.cor, 0.45)); g.addColorStop(1, ZYRO.U.rgba(T.cor, 0.75));
        c.fillStyle = g; c.beginPath(); c.arc(80, 80, 66, 0, 7); c.fill();
        c.lineWidth = 8; c.strokeStyle = T.cor; c.stroke();
        c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(80, 80, 52, 3.6, 4.6); c.stroke();
        S.icon(c, T.icone, 80, 82, 78, '#fff', 2.6);
      });
    }
  },

  // ---------- caixa 3D em perspectiva ----------
  box(ctx, cam, x0, x1, y0, y1, z0, z1, st) {
    const P = (x, y, z) => cam.px(x, y, z);
    const poly = (pts, fill) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (st.edge) { ctx.strokeStyle = st.edge; ctx.lineWidth = st.edgeW || 1.5; ctx.stroke(); }
    };
    if (z1 - z0 > 0.02) {
      if (st.top && cam.y > y1) poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], st.top);
      if (st.side && cam.x < x0) poly([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], st.side);
      if (st.side && cam.x > x1) poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], st.side);
    }
    const a = P(x0, y1, z0), b = P(x1, y0, z0);
    if (st.tex) ctx.drawImage(st.tex, a[0], a[1], b[0] - a[0], b[1] - a[1]);
    else if (st.front) { ctx.fillStyle = st.front; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
    if (st.frontEdge) { ctx.strokeStyle = st.frontEdge; ctx.lineWidth = st.edgeW || 2; ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
    return { a, b };
  },

  shadow(ctx, cam, x0, x1, z0, z1, alpha = 0.28) {
    const pts = [cam.px(x0, 0.01, z0), cam.px(x1, 0.01, z0), cam.px(x1, 0.01, z1), cam.px(x0, 0.01, z1)];
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...pts[i]); ctx.closePath();
    ctx.fillStyle = `rgba(5,8,25,${alpha})`; ctx.fill();
  },

  // sprite "em pé" virado para a câmera (hologramas, setas)
  billboard(ctx, cam, img, x, y, z, wM, hM, alpha = 1) {
    const p = cam.project(x, y, z); if (!p) return;
    const w = wM * p.s, h = hM * p.s;
    ctx.globalAlpha = alpha; ctx.drawImage(img, p.x - w / 2, p.y - h, w, h); ctx.globalAlpha = 1;
  },

  // ---------- obstáculos ----------
  obstacle(ctx, cam, o, z0, t) {
    const S = this, LW = ZYRO.CONFIG.LANE_W, z1 = z0 + o.len, x = o.lane * LW;
    const pulse = 0.65 + Math.sin(t * 6 + o.d) * 0.25;
    switch (o.type) {
      case 'R':
        S.shadow(ctx, cam, x - 1.15, x + 1.15, z0 - 0.2, z1 + 0.6);
        S.box(ctx, cam, x - 0.95, x - 0.75, 0, 0.25, z0 + 0.05, z1, { front: '#223463', top: '#344A80', side: '#18264D' });
        S.box(ctx, cam, x + 0.75, x + 0.95, 0, 0.25, z0 + 0.05, z1, { front: '#223463', top: '#344A80', side: '#18264D' });
        S.box(ctx, cam, x - 1.0, x + 1.0, 0.18, 1.9, z0, z1, { tex: S.tex.red, top: '#E8506A', side: '#B02A45' });
        break;
      case 'L':
        S.shadow(ctx, cam, x - 1.15, x + 1.15, z0 - 0.1, z1 + 0.5, 0.22);
        S.box(ctx, cam, x - 1.0, x - 0.86, 0, 0.6, z0 + 0.1, z1, { front: '#344A80', top: '#4B5DA8', side: '#223463' });
        S.box(ctx, cam, x + 0.86, x + 1.0, 0, 0.6, z0 + 0.1, z1, { front: '#344A80', top: '#4B5DA8', side: '#223463' });
        S.box(ctx, cam, x - 1.08, x + 1.08, 0.55, 0.95, z0, z1, { tex: S.tex.low, top: '#FFC36B', side: '#D9772A' });
        S.billboard(ctx, cam, S.tex.chevUp, x, 1.25 + Math.sin(t * 5) * 0.08, z0, 0.9, 0.9, pulse);
        break;
      case 'H':
        S.shadow(ctx, cam, x - 1.2, x + 1.2, z0 - 0.1, z1 + 0.5, 0.2);
        S.box(ctx, cam, x - 1.12, x - 0.9, 0, 3.2, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6' });
        S.box(ctx, cam, x + 0.9, x + 1.12, 0, 3.2, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6' });
        S.box(ctx, cam, x - 0.9, x + 0.9, 1.6, 2.85, z0 + 0.15, z0 + 0.15, { tex: S.tex.field });
        S.box(ctx, cam, x - 1.15, x + 1.15, 2.85, 3.25, z0, z1, { front: '#7955FF', top: '#9C83FF', side: '#5A44D6', frontEdge: '#FF4FBF' });
        S.box(ctx, cam, x - 1.0, x + 1.0, 1.0, 1.6, z0, z1, { tex: S.tex.high, top: '#FF7ED1', side: '#D93A9E' });
        S.billboard(ctx, cam, S.tex.chevDown, x, 0.15 + Math.sin(t * 5) * 0.06, z0 - 0.2, 0.75, 0.75, pulse);
        break;
      case 'B':
        S.shadow(ctx, cam, x - 1.25, x + 1.25, z0 - 0.2, z1 + 0.8, 0.3);
        S.box(ctx, cam, x - 1.05, x + 1.05, 0, 2.2, z0, z1, { tex: S.tex.block, top: '#344A80', side: '#18264D', edge: 'rgba(0,217,255,.8)', edgeW: 2 });
        break;
      case 'T': case 'A':
        ZYRO.Vehicles.oncoming(ctx, cam, o, z0, t);
        break;
      case 'G': {
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

  // ---------- coletáveis ----------
  core(ctx, cam, c, z, t) {
    const bob = Math.sin(t * 3 + c.d * 0.7) * 0.1;
    const p = cam.project(c.x, c.y + bob, z); if (!p) return;
    const parts = c.super ? this.coreBlue : this.coreGold;
    const size = (c.super ? 0.95 : 0.72) * p.s;
    const g = this.glow(c.super ? '#00D9FF' : '#FFD447');
    ctx.drawImage(g, p.x - size * 1.1, p.y - size * 1.1, size * 2.2, size * 2.2);
    if (c.y > 0.3 && c.y < 4 && !c.roof) {
      const sh = cam.project(c.x, 0.01, z);
      if (sh) { ctx.fillStyle = 'rgba(5,8,25,.25)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, size * 0.35, size * 0.1, 0, 0, 7); ctx.fill(); }
    }
    ctx.drawImage(parts.ring, p.x - size * 0.75, p.y - size * 0.75, size * 1.5, size * 1.5);
    const spin = Math.cos(t * 4 + c.d * 0.3);
    const gw = size * 0.6 * Math.max(0.12, Math.abs(spin)), gh = size * 0.98;
    ctx.drawImage(parts.gem, p.x - gw / 2, p.y - gh / 2, gw, gh);
  },

  powerup(ctx, cam, u, z, t) {
    const p = cam.project(u.x, u.y + Math.sin(t * 2.5 + u.d) * 0.15, z); if (!p) return;
    const col = ZYRO.POWERUP_TYPES[u.type].cor, size = 1.15 * p.s;
    ctx.drawImage(this.glow(col), p.x - size * 1.3, p.y - size * 1.3, size * 2.6, size * 2.6);
    ctx.drawImage(this.caps[u.type], p.x - size / 2, p.y - size / 2, size, size);
  }
};
