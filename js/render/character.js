/* =========================================================
   ZYRO — character.js  (Desenho e animação do personagem)
   Visto de costas (câmera em 3ª pessoa). Mesmas formas do
   Figma: cabelo espetado azul com pontas rosa, faixa laranja,
   jaqueta roxa com emblema Z, tênis com propulsores.
   Poses misturadas por peso: corrida, pulo, deslize.

   Como desenhar um personagem que muda de tamanho com a
   distância? Desenhamos SEMPRE no mesmo "papel" de 200 × 260
   unidades (as coordenadas que você vê no código), e antes
   aplicamos ctx.scale para converter unidades em pixels.
   131 unidades = 1 metro do mundo.

   Misturar poses: jump e slide vão de 0 a 1 (o renderer
   suaviza). A corrida pesa o que sobra: run = 1 − jump − slide.
   Cada parte do corpo calcula sua posição como uma média
   ponderada das poses: assim ele "transiciona" em vez de pular
   de uma pose para outra.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Character = {
  UNITS_PER_M: 131,           // unidades do desenho por metro
  SKIN: '#C98663', SKIN_D: '#A86A4B', LEG: '#3D2F94', DARK: '#101A35',

  // (sx, sy) = onde ficam os pés na tela · pxPerM = escala da câmera ali
  // pose: {phase, jump(0..1), slide(0..1), tilt, shift, hit, land, alpha, jetpack}
  draw(ctx, sx, sy, pxPerM, pose) {
    const k = pxPerM / this.UNITS_PER_M;   // quantos pixels vale 1 unidade do desenho
    ctx.save();                            // save/restore: tudo que mudarmos (escala, rotação) volta ao normal no fim
    ctx.translate(sx, sy);                 // a origem vai para os pés...
    ctx.scale(k, k);                       // ...o papel é escalado...
    if (pose.hit) ctx.rotate(-0.18 * pose.hit);   // ...inclina para trás na batida...
    ctx.rotate(pose.tilt * 0.24);                 // ...inclina para o lado na troca de faixa...
    ctx.translate(-100, -252);                    // ...e o ponto (100, 252) do papel (entre os pés) fica na origem
    if (pose.alpha !== undefined) ctx.globalAlpha = pose.alpha;
    this.body(ctx, pose);
    ctx.restore();
  },

  body(ctx, P) {
    const C = ZYRO.CONFIG.COLORS, me = this;
    // J = peso do pulo, S = peso do deslize, R = peso da corrida (o que sobra)
    const J = P.jump, S = P.slide, R = Math.max(0, 1 - J - S);
    const ph = P.phase;                 // ângulo do ciclo das pernas (cresce com o tempo)
    const bob = -Math.abs(Math.sin(ph)) * 6 * R + P.land * 7;
    const bodyDy = S * 58 + bob;
    const flick = 0.85 + Math.random() * 0.3;

    // ---- aura do ZYRO SHIFT (atrás do corpo) ----
    if (P.shift) {
      const g = ctx.createRadialGradient(100, 150 + bodyDy * 0.5, 10, 100, 150 + bodyDy * 0.5, 150);
      g.addColorStop(0, 'rgba(0,217,255,.55)'); g.addColorStop(0.5, 'rgba(121,85,255,.3)'); g.addColorStop(1, 'rgba(255,79,191,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(100, 150 + bodyDy * 0.5, 120, 160, 0, 0, 7); ctx.fill();
    }

    // ---- pernas ----
    const legs = [-1, 1].map(side => {
      const hipX = 100 + side * 8, hipY = 166 + bodyDy;
      const lift = Math.max(0, Math.sin(ph + (side > 0 ? Math.PI : 0)));
      const run = { kx: side * (10 + lift * 6), ky: 38 - lift * 8, fx: side * (14 + lift * 14), fy: 72 - lift * 26 };
      const jmp = { kx: side * 12, ky: 26, fx: side * 1, fy: 42 };
      const sld = { kx: side * 26, ky: 10, fx: side * 46, fy: 14 };
      const mix = key => run[key] * R + jmp[key] * J + sld[key] * S;
      return { side, hipX, hipY, kx: hipX + mix('kx'), ky: hipY + mix('ky'), fx: hipX + mix('fx'), fy: hipY + mix('fy'), sole: lift * R + J };
    });

    // propulsores dos tênis
    for (const L of legs) {
      const len = (10 + L.sole * 18 + (P.shift ? 22 : 0)) * flick;
      const g = ctx.createLinearGradient(L.fx, L.fy, L.fx, L.fy + len + 10);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(0,217,255,.9)'); g.addColorStop(1, 'rgba(0,217,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(L.fx - 9, L.fy + 6); ctx.quadraticCurveTo(L.fx, L.fy + 6 + len * 2, L.fx + 9, L.fy + 6); ctx.closePath(); ctx.fill();
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const L of legs) {
      ctx.strokeStyle = me.LEG; ctx.lineWidth = 20;
      ctx.beginPath(); ctx.moveTo(L.hipX, L.hipY); ctx.lineTo(L.kx, L.ky); ctx.lineTo(L.fx, L.fy); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,217,255,.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L.hipX - L.side * 6, L.hipY + 4); ctx.lineTo(L.kx - L.side * 6, L.ky); ctx.lineTo(L.fx - L.side * 5, L.fy - 6); ctx.stroke();
      // tênis: sola laranja (pé levantado) ou parte de cima branca
      if (L.sole > 0.45) {
        ctx.fillStyle = C.laranja; ZYRO.Sprites.rr(ctx, L.fx - 15, L.fy - 10, 30, 24, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ZYRO.Sprites.rr(ctx, L.fx - 10, L.fy - 5, 20, 14, 6); ctx.fill();
        ctx.fillStyle = C.azul; ctx.beginPath(); ctx.arc(L.fx, L.fy + 2, 4.5, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#fff'; ZYRO.Sprites.rr(ctx, L.fx - 17, L.fy - 6, 34, 18, 8); ctx.fill();
        ctx.fillStyle = C.laranja; ZYRO.Sprites.rr(ctx, L.fx - 17, L.fy + 6, 34, 7, 3.5); ctx.fill();
        ctx.fillStyle = C.azul; ZYRO.Sprites.rr(ctx, L.fx - 6, L.fy - 2, 12, 4, 2); ctx.fill();
      }
    }

    // ---- braços ----
    for (const side of [-1, 1]) {
      const shX = 100 + side * 30, shY = 112 + bodyDy;
      const sw = Math.sin(ph + (side > 0 ? 0 : Math.PI));
      const run = { ex: side * 15, ey: 25 - sw * 5, hx: side * (8 - sw * 3), hy: 44 - sw * 12 };
      const jmp = { ex: side * 22, ey: -16, hx: side * 30, hy: -38 };
      const sld = { ex: side * 20, ey: 16, hx: side * 30, hy: 38 };
      const mix = key => run[key] * R + jmp[key] * J + sld[key] * S;
      const ex = shX + mix('ex'), ey = shY + mix('ey'), hx = shX + mix('hx'), hy = shY + mix('hy');
      ctx.strokeStyle = C.roxo; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(shX, shY + 2); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = C.azul; ctx.beginPath(); ctx.arc((ex * 0.3 + hx * 0.7), (ey * 0.3 + hy * 0.7), 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = me.SKIN; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, 7); ctx.fill();
    }

    // ---- tronco (jaqueta) ----
    ctx.save(); ctx.translate(0, bodyDy);
    ctx.fillStyle = C.roxo;
    ctx.beginPath(); ctx.moveTo(68, 106); ctx.quadraticCurveTo(100, 96, 132, 106); ctx.lineTo(138, 170); ctx.quadraticCurveTo(100, 180, 62, 170); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(68, 106); ctx.lineTo(62, 170); ctx.lineTo(75, 173); ctx.lineTo(80, 104); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(132, 106); ctx.lineTo(138, 170); ctx.lineTo(125, 173); ctx.lineTo(120, 104); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.laranja;
    ctx.beginPath(); ctx.moveTo(63, 162); ctx.quadraticCurveTo(100, 172, 137, 162); ctx.lineTo(138, 170); ctx.quadraticCurveTo(100, 180, 62, 170); ctx.closePath(); ctx.fill();
    // painel com o Z (brilha mais no SHIFT)
    ctx.fillStyle = me.DARK; ZYRO.Sprites.rr(ctx, 84, 118, 32, 38, 9); ctx.fill();
    ctx.fillStyle = P.shift ? 'rgba(0,217,255,.75)' : 'rgba(0,217,255,.25)'; ZYRO.Sprites.rr(ctx, 88, 122, 24, 30, 6); ctx.fill();
    ctx.strokeStyle = C.amarelo; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(93, 129); ctx.lineTo(107, 129); ctx.lineTo(93, 145); ctx.lineTo(107, 145); ctx.stroke();
    ctx.restore();

    // ---- Jetpack nas costas ----
    if (P.jetpack) {
      ctx.save(); ctx.translate(0, bodyDy);
      for (const x of [74, 106]) {
        const fl = (46 + Math.random() * 22) * (P.shift ? 1.3 : 1);
        const g = ctx.createLinearGradient(0, 160, 0, 160 + fl);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, '#FFD447'); g.addColorStop(0.6, 'rgba(255,157,67,.8)'); g.addColorStop(1, 'rgba(255,79,191,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 3, 158); ctx.quadraticCurveTo(x + 10, 160 + fl * 1.5, x + 17, 158); ctx.closePath(); ctx.fill();
        const body = ctx.createLinearGradient(x, 0, x + 20, 0); body.addColorStop(0, '#DDE4FF'); body.addColorStop(1, '#8C98C9');
        ctx.fillStyle = body; ZYRO.Sprites.rr(ctx, x, 104, 20, 50, 9); ctx.fill();
        ctx.fillStyle = C.laranja; ZYRO.Sprites.rr(ctx, x, 104, 20, 12, 6); ctx.fill();
        ctx.fillStyle = me.DARK; ZYRO.Sprites.rr(ctx, x + 3, 150, 14, 10, 3); ctx.fill();
        ctx.fillStyle = C.azul; ctx.fillRect(x + 4, 126, 12, 4);
      }
      ctx.fillStyle = me.DARK; ZYRO.Sprites.rr(ctx, 92, 118, 16, 26, 4); ctx.fill();
      ctx.restore();
    }

    // ---- cabeça e cabelo ----
    const headDy = bodyDy + (S ? 0 : Math.sin(ph * 2) * 1.5 * R);
    ctx.save(); ctx.translate(0, headDy);
    ctx.fillStyle = me.SKIN_D; ZYRO.Sprites.rr(ctx, 92, 86, 16, 18, 4); ctx.fill();
    ctx.fillStyle = me.SKIN;
    ctx.beginPath(); ctx.ellipse(69, 74, 5, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(131, 74, 5, 8, 0, 0, 7); ctx.fill();
    const hg = ctx.createLinearGradient(56, 10, 146, 92);
    hg.addColorStop(0, C.azul); hg.addColorStop(1, C.roxo);
    ctx.fillStyle = hg;
    const sway = R * Math.sin(ph) * 2 + J * -4;
    const spikes = [[72, 52, 56 + sway, 28, 86, 40], [86, 40, 90 + sway, 10, 106, 34], [104, 34, 124 + sway, 12, 120, 42], [118, 44, 146 + sway, 34, 130, 62], [70, 60, 48 + sway, 54, 70, 74]];
    for (const s of spikes) { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.lineTo(s[4], s[5]); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = C.rosa;
    for (const s of spikes) { ctx.beginPath(); ctx.moveTo(s[2], s[3]); ctx.lineTo(s[2] * 0.75 + s[0] * 0.25, s[3] * 0.75 + s[1] * 0.25); ctx.lineTo(s[2] * 0.75 + s[4] * 0.25, s[3] * 0.75 + s[5] * 0.25); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(68, 78); ctx.bezierCurveTo(66, 50, 80, 34, 100, 34); ctx.bezierCurveTo(120, 34, 134, 50, 132, 78);
    ctx.bezierCurveTo(126, 88, 112, 92, 100, 92); ctx.bezierCurveTo(88, 92, 74, 88, 68, 78); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.laranja; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(68, 70); ctx.quadraticCurveTo(100, 80, 132, 70); ctx.stroke();
    ctx.restore();

    // ---- colisão: estrelinhas ----
    if (P.hit) {
      ctx.fillStyle = C.amarelo;
      const t = performance.now() / 300;
      for (let i = 0; i < 3; i++) {
        const a = t + (i * Math.PI * 2) / 3, x = 100 + Math.cos(a) * 34, y = 20 + bodyDy + Math.sin(a) * 9;
        this.star(ctx, x, y, 8);
      }
    }
  },

  star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
};
