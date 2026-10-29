/* =========================================================
   ZYRO — camera.js  (Projeção pseudo-3D)
   Cada objeto tem posição no mundo (x, y, z). A câmera fica
   atrás e acima do jogador. Quanto mais longe, menor e mais
   perto do horizonte o objeto aparece.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Camera = {
  W: 1280, H: 720,
  D: 6.2,          // distância da câmera até o jogador (m)
  camH: 3.0,       // altura da câmera (m)
  f: 700,          // "zoom" em pixels
  cx: 640, horizon: 266, groundY: 670,
  x: 0, y: 3, z: -6.2,
  shake: 0, sx: 0, sy: 0,
  near: 0.6,

  resize(W, H) {
    this.W = W; this.H = H;
    this.cx = W / 2;
    const landscape = W >= H;
    this.groundY = H * (landscape ? 0.93 : 0.86);
    const wantHorizon = H * (landscape ? 0.37 : 0.33);
    const fv = ((this.groundY - wantHorizon) * this.D) / 3.0;
    const fh = (W * (landscape ? 0.47 : 0.5) * this.D) / (landscape ? 3.9 : 3.05);
    this.f = Math.min(fv, fh);
    // em tela estreita (celular em pé) a câmera sobe para mostrar a pista inteira
    this.camH = ZYRO.U.clamp(((this.groundY - wantHorizon) * this.D) / this.f, 2.6, 7.5);
    this.horizon = this.groundY - (this.camH * this.f) / this.D;
    this.baseCamH = this.camH;
  },

  follow(player, dt, reduceMotion) {
    const k = 1 - Math.pow(0.0006, dt);
    this.x = ZYRO.U.lerp(this.x, player.x * 0.72, k);
    // sobe junto quando o jogador está num teto ou voando de Jetpack (pulos continuam com pouca subida)
    const floor = player.floor || 0;
    const lift = player.flying ? player.y * 0.9 : floor * 0.85 + Math.max(0, player.y - floor) * 0.35;
    this.lift = ZYRO.U.lerp(this.lift || 0, lift, 1 - Math.pow(player.flying ? 0.02 : 0.0005, dt));
    this.y = this.baseCamH + this.lift;
    this.z = -this.D;
    if (this.shake > 0 && !reduceMotion) {
      this.sx = (Math.random() - 0.5) * 16 * this.shake;
      this.sy = (Math.random() - 0.5) * 12 * this.shake;
    } else { this.sx = this.sy = 0; }
    this.shake = Math.max(0, this.shake - dt * 2.2);
  },

  // mundo → tela. z é relativo ao jogador (0 = posição do jogador)
  project(x, y, z) {
    const zr = z - this.z;
    if (zr < this.near) return null;
    const s = this.f / zr;
    return { x: this.cx + (x - this.x) * s + this.sx, y: this.horizon + (this.y - y) * s + this.sy, s };
  },
  // versão sem checagem, para polígonos já cortados no plano próximo
  px(x, y, z) {
    const zr = Math.max(this.near, z - this.z), s = this.f / zr;
    return [this.cx + (x - this.x) * s + this.sx, this.horizon + (this.y - y) * s + this.sy];
  },
  scaleAt(z) { return this.f / Math.max(this.near, z - this.z); }
};
