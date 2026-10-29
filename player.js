/* =========================================================
   ZYRO — player.js  (Controle do personagem)
   Estados: correndo, pulando, deslizando. Troca de faixa suave.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Player = class {
  constructor() { this.reset(); }

  reset() {
    const C = ZYRO.CONFIG;
    this.lane = 0;              // faixa alvo
    this.x = 0;                 // posição real (anima entre faixas)
    this.fromX = 0;
    this.laneT = 1;             // 0..1 progresso da troca de faixa
    this.y = 0; this.vy = 0;
    this.floor = 0;             // altura do chão sob o jogador (teto de carro estacionado)
    this.flying = false;        // voando de Jetpack (altura controlada pelo jogo)
    this.jumping = false;       // no ar (pulo ou queda)
    this.sliding = false; this.slideT = 0;
    this.slideAfterLanding = false;
    this.bufferJump = 0;
    this.tilt = 0;              // inclinação visual na troca de faixa
    this.runPhase = 0;          // ciclo de corrida (animação)
    this.landPulse = 0;         // "amassadinha" ao pousar
    this.bump = 0;              // tentou sair da pista
    this.lastAction = { type: null, time: -99, fromLane: 0 };
    // física do pulo calculada a partir da altura e duração desejadas
    const T = C.JUMP.duration, h = C.JUMP.height;
    this.V0 = (4 * h) / T;
    this.G = (8 * h) / (T * T);
  }

  get onGround() { return !this.jumping; }
  get height() { return this.sliding ? ZYRO.CONFIG.PLAYER.slideHeight : ZYRO.CONFIG.PLAYER.height; }

  moveLane(dir, now) {
    const target = ZYRO.Lanes.clamp(this.lane + dir);
    if (target === this.lane) { this.bump = dir; return false; }   // não sai das 3 faixas
    this.lastAction = { type: 'lane', time: now, fromLane: this.lane };
    this.lane = target;
    this.fromX = this.x;
    this.laneT = 0;
    this.tilt = dir;
    return true;
  }

  jump(now) {
    if (this.jumping) { this.bufferJump = ZYRO.CONFIG.INPUT_BUFFER; return false; }
    this.sliding = false; this.slideT = 0;
    this.jumping = true;
    this.vy = this.V0;
    this.lastAction = { type: 'jump', time: now, fromLane: this.lane };
    return true;
  }

  slide(now) {
    this.lastAction = { type: 'slide', time: now, fromLane: this.lane };
    if (this.jumping) {          // no ar: desce rápido e desliza ao tocar o chão
      this.vy = Math.min(this.vy, -this.V0 * 1.2);
      this.slideAfterLanding = true;
      return true;
    }
    this.sliding = true;
    this.slideT = ZYRO.CONFIG.SLIDE_TIME;
    return true;
  }

  update(dt, speed, floor = 0) {
    const C = ZYRO.CONFIG;
    // troca de faixa com suavização
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / C.LANE_TIME);
      this.x = ZYRO.U.lerp(this.fromX, ZYRO.Lanes.x(this.lane), ZYRO.U.easeOutCubic(this.laneT));
    } else {
      this.x = ZYRO.Lanes.x(this.lane);
    }
    this.tilt *= Math.pow(0.0008, dt);
    this.bump *= Math.pow(0.0001, dt);

    // pulo, queda e chão (o chão pode ser o teto de um carro estacionado)
    this.floor = floor;
    if (this.flying) {
      // a altura do Jetpack é controlada pelo jogo
    } else if (this.jumping) {
      this.vy -= this.G * dt;
      this.y += this.vy * dt;
      if (this.y <= floor) {
        this.y = floor; this.vy = 0; this.jumping = false;
        this.landPulse = 1;
        if (this.slideAfterLanding) {
          this.slideAfterLanding = false;
          this.sliding = true; this.slideT = C.SLIDE_TIME;
        } else if (this.bufferJump > 0) {
          this.bufferJump = 0;
          this.jumping = true; this.vy = this.V0;
        }
      }
    } else if (this.y > floor + 0.05) {
      this.jumping = true; this.vy = 0;          // acabou o teto: cai
    } else {
      this.y = floor;                            // acompanha a rampa
    }
    this.bufferJump = Math.max(0, this.bufferJump - dt);
    this.landPulse = Math.max(0, this.landPulse - dt * 5);

    // deslize
    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0) { this.sliding = false; this.slideT = 0; }
    }

    // animação de corrida acompanha a velocidade
    this.runPhase += dt * (6 + speed * 0.32);
  }

  // caixa de colisão (coordenadas do mundo, z relativo ao jogador = 0)
  box() {
    const P = ZYRO.CONFIG.PLAYER;
    return { x0: this.x - P.halfW, x1: this.x + P.halfW, y0: this.y, y1: this.y + this.height, z0: -P.halfD, z1: P.halfD };
  }
};
