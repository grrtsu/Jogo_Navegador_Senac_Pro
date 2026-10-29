/* =========================================================
   ZYRO — camera.js  (Projeção pseudo-3D: mundo → tela)

   O Canvas 2D só sabe desenhar em x e y da tela. Para parecer
   3D, usamos PROJEÇÃO EM PERSPECTIVA: coisas longe aparecem
   menores e mais perto do horizonte.

   A fórmula inteira é uma divisão:

       escala = f / distância até a câmera

       tela.x = centro da tela + (x − câmera.x) × escala
       tela.y = horizonte      + (câmera.y − y) × escala

   Um objeto a 10 m tem escala f/10; a 100 m, f/100 (10 vezes
   menor). É o mesmo princípio de uma foto: o "zoom" f diz
   quantos pixels um metro ocupa a 1 m da câmera.

   Sistema de coordenadas (metros):
     x = lado (0 = centro da pista)   y = altura (0 = chão)
     z = profundidade relativa ao JOGADOR (0 = onde ele está)
   A câmera fica atrás do jogador (z = −D) e acima (y = camH).

   Nomes curtos (padrão de computação gráfica):
     W, H = largura e altura da tela (px) · cx = centro x da tela
     f = distância focal ("zoom", px) · D = distância câmera→jogador (m)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Camera = {
  W: 1280, H: 720,
  D: 6.2,          // a câmera fica 6,2 m atrás do jogador
  camH: 3.0,       // e 3 m acima do chão (ajustada no resize)
  f: 700,          // distância focal em pixels (ajustada no resize)
  cx: 640, horizon: 266, groundY: 670,   // centro x, linha do horizonte e onde o chão do jogador aparece (px)
  x: 0, y: 3, z: -6.2,                    // posição atual da câmera no mundo
  shake: 0, sx: 0, sy: 0,                 // tremor (0 a 1) e o deslocamento que ele causa neste quadro (px)
  near: 0.6,       // "plano próximo": nada mais perto que isso da câmera é desenhado (evita dividir por ~0)

  // Ajusta a câmera ao tamanho da tela. A ideia é escolher f e camH de modo que:
  // - os pés do jogador fiquem em groundY (perto da base da tela);
  // - o horizonte fique em ~37% da altura (deitado) ou ~33% (em pé);
  // - as 3 faixas caibam na largura.
  resize(W, H) {
    this.W = W; this.H = H;
    this.cx = W / 2;
    const landscape = W >= H;
    this.groundY = H * (landscape ? 0.93 : 0.86);
    const wantedHorizon = H * (landscape ? 0.37 : 0.33);
    // f que coloca o horizonte no lugar certo / f que faz a pista caber na largura: vale o menor
    const focalForHeight = ((this.groundY - wantedHorizon) * this.D) / 3.0;
    const focalForWidth = (W * (landscape ? 0.47 : 0.5) * this.D) / (landscape ? 3.9 : 3.05);
    this.f = Math.min(focalForHeight, focalForWidth);
    // celular em pé: a câmera sobe para mostrar a pista inteira
    this.camH = ZYRO.Utils.clamp(((this.groundY - wantedHorizon) * this.D) / this.f, 2.6, 7.5);
    this.horizon = this.groundY - (this.camH * this.f) / this.D;
    this.baseCamH = this.camH;
  },

  // A câmera segue o jogador com atraso suave (lerp): se fosse grudada, cada troca de faixa daria um tranco na tela.
  follow(player, dt, reduceMotion) {
    const Utils = ZYRO.Utils;
    this.x = Utils.lerp(this.x, player.x * 0.72, 1 - Math.pow(0.0006, dt));   // acompanha 72% do lado: a pista não some da tela
    // Sobe junto quando o jogador está num teto ou voando de Jetpack.
    // No pulo comum ela sobe só um pouco (35%): assim dá para sentir a altura do pulo.
    const floor = player.floor || 0;
    const lift = player.flying ? player.y * 0.9 : floor * 0.85 + Math.max(0, player.y - floor) * 0.35;
    this.lift = Utils.lerp(this.lift || 0, lift, 1 - Math.pow(player.flying ? 0.02 : 0.0005, dt));
    this.y = this.baseCamH + this.lift;
    this.z = -this.D;
    // tremor de tela (batidas): deslocamento aleatório que diminui com o tempo
    if (this.shake > 0 && !reduceMotion) {
      this.sx = (Math.random() - 0.5) * 16 * this.shake;
      this.sy = (Math.random() - 0.5) * 12 * this.shake;
    } else { this.sx = this.sy = 0; }
    this.shake = Math.max(0, this.shake - dt * 2.2);
  },

  // Mundo → tela. Devolve { x, y, s } (s = escala: quantos px vale 1 m ali) ou null se estiver atrás da câmera.
  project(x, y, z) {
    const distanceToCamera = z - this.z;
    if (distanceToCamera < this.near) return null;
    const scale = this.f / distanceToCamera;
    return {
      x: this.cx + (x - this.x) * scale + this.sx,
      y: this.horizon + (this.y - y) * scale + this.sy,   // y da tela cresce para BAIXO, por isso (câmera.y − y)
      s: scale
    };
  },

  // Igual a project, mas nunca devolve null (prende no plano próximo) e devolve [x, y].
  // Usado para cantos de polígonos que atravessam a câmera (o chão perto do jogador, por exemplo).
  px(x, y, z) {
    const distanceToCamera = Math.max(this.near, z - this.z), scale = this.f / distanceToCamera;
    return [this.cx + (x - this.x) * scale + this.sx, this.horizon + (this.y - y) * scale + this.sy];
  },

  scaleAt(z) { return this.f / Math.max(this.near, z - this.z); }
};
