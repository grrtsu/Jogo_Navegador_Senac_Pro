/* =========================================================
   ZYRO — player.js  (O personagem: faixas, pulo e deslize)

   O jogador NÃO anda para frente aqui: quem anda é o mundo
   (game.distance aumenta). O Player só cuida do que acontece
   "no lugar": trocar de faixa (x), pular e cair (y) e deslizar
   (altura da caixa). Separar assim deixa a física simples.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Player = class {
  constructor() { this.reset(); }

  reset() {
    const CONFIG = ZYRO.CONFIG;

    // ----- faixa e posição lateral -----
    this.lane = 0;              // faixa de DESTINO (-1, 0 ou 1): muda na hora em que a tecla é apertada
    this.x = 0;                 // posição lateral REAL (m): anda até a faixa de destino em LANE_TIME segundos
    this.fromX = 0;             // de onde a troca de faixa começou
    this.laneProgress = 1;      // progresso da troca de faixa: 0 = começou, 1 = chegou

    // ----- altura -----
    this.y = 0;                 // altura dos pés (m)
    this.verticalSpeed = 0;     // velocidade vertical (m/s): positiva sobe, negativa cai
    this.floor = 0;             // altura do chão embaixo do jogador (0 = pista, 2 = teto de uma van)
    this.flying = false;        // voando de Jetpack: a altura passa a ser controlada pelo game.js
    this.jumping = false;       // está no ar (pulo ou queda)

    // ----- deslize e comandos guardados -----
    this.sliding = false;
    this.slideTimeLeft = 0;
    this.slideAfterLanding = false;   // apertou ↓ no ar: desliza assim que tocar o chão
    this.jumpBufferTime = 0;          // apertou ↑ um pouco antes de pousar: pula de novo no pouso

    // ----- só para a animação (o desenho lê estes valores) -----
    this.tilt = 0;              // inclinação ao trocar de faixa
    this.runPhase = 0;          // ciclo das pernas correndo
    this.landPulse = 0;         // "amassadinha" ao pousar
    this.bump = 0;              // tentou sair da pista (treme para o lado)

    // última ação: o game.js usa para dar PERFECT quando a ação foi feita bem em cima da hora
    this.lastAction = { type: null, time: -99, fromLane: 0 };

    // ----- física do pulo -----
    // Em vez de "chutar" gravidade e impulso, calculamos os dois a partir do que queremos:
    // um pulo que dura T segundos e sobe h metros. Pelas fórmulas do lançamento vertical:
    //   impulso inicial  v0 = 4h / T
    //   gravidade         g = 8h / T²
    // Assim, mudar JUMP.height ou JUMP.duration no config.js já ajusta tudo sozinho.
    const T = CONFIG.JUMP.duration, h = CONFIG.JUMP.height;
    this.jumpVelocity = (4 * h) / T;
    this.gravity = (8 * h) / (T * T);
  }

  get onGround() { return !this.jumping; }
  // deslizando, a caixa de colisão fica baixa e passa por baixo das barreiras elevadas
  get height() { return this.sliding ? ZYRO.CONFIG.PLAYER.slideHeight : ZYRO.CONFIG.PLAYER.height; }

  // direction: -1 = esquerda, 1 = direita · now: tempo do jogo (para o PERFECT)
  moveLane(direction, now) {
    const targetLane = ZYRO.Lanes.clamp(this.lane + direction);
    if (targetLane === this.lane) { this.bump = direction; return false; }   // já está na ponta: não sai das 3 faixas
    this.lastAction = { type: 'lane', time: now, fromLane: this.lane };
    this.lane = targetLane;
    this.fromX = this.x;          // começa do x atual: dá para trocar de faixa de novo no meio de uma troca
    this.laneProgress = 0;
    this.tilt = direction;
    return true;
  }

  jump(now) {
    if (this.jumping) { this.jumpBufferTime = ZYRO.CONFIG.INPUT_BUFFER; return false; }   // no ar: guarda o comando
    this.sliding = false; this.slideTimeLeft = 0;     // pular cancela o deslize
    this.jumping = true;
    this.verticalSpeed = this.jumpVelocity;
    this.lastAction = { type: 'jump', time: now, fromLane: this.lane };
    return true;
  }

  slide(now) {
    this.lastAction = { type: 'slide', time: now, fromLane: this.lane };
    if (this.jumping) {
      // no ar: mergulha rápido para o chão e desliza ao tocar (igual ao Subway Surfers)
      this.verticalSpeed = Math.min(this.verticalSpeed, -this.jumpVelocity * 1.2);
      this.slideAfterLanding = true;
      return true;
    }
    this.sliding = true;
    this.slideTimeLeft = ZYRO.CONFIG.SLIDE_TIME;
    return true;
  }

  // Chamado a cada passo da simulação.
  // dt = segundos desde o último passo · speed = velocidade do mundo (m/s) · floor = altura do chão aqui
  update(dt, speed, floor = 0) {
    const CONFIG = ZYRO.CONFIG, Utils = ZYRO.Utils;

    // --- troca de faixa: vai de fromX até o centro da faixa nova com uma curva que freia no fim ---
    if (this.laneProgress < 1) {
      this.laneProgress = Math.min(1, this.laneProgress + dt / CONFIG.LANE_TIME);
      this.x = Utils.lerp(this.fromX, ZYRO.Lanes.x(this.lane), Utils.easeOutCubic(this.laneProgress));
    } else {
      this.x = ZYRO.Lanes.x(this.lane);
    }
    // Math.pow(fator, dt) faz o valor diminuir na mesma velocidade em qualquer FPS (30, 60 ou 144 quadros por segundo)
    this.tilt *= Math.pow(0.0008, dt);
    this.bump *= Math.pow(0.0001, dt);

    // --- pulo, queda e chão (o chão pode ser o teto de uma van) ---
    this.floor = floor;
    if (this.flying) {
      // voando de Jetpack: o game.js controla a altura
    } else if (this.jumping) {
      // a gravidade reduz a velocidade vertical; a velocidade muda a altura
      this.verticalSpeed -= this.gravity * dt;
      this.y += this.verticalSpeed * dt;
      if (this.y <= floor) this.land(floor);
    } else if (this.y > floor + 0.05) {
      this.jumping = true; this.verticalSpeed = 0;   // o teto da van acabou: começa a cair
    } else {
      this.y = floor;                                // no chão ou subindo a rampa: acompanha a superfície
    }
    this.jumpBufferTime = Math.max(0, this.jumpBufferTime - dt);
    this.landPulse = Math.max(0, this.landPulse - dt * 5);

    // --- deslize: dura SLIDE_TIME segundos ---
    if (this.sliding) {
      this.slideTimeLeft -= dt;
      if (this.slideTimeLeft <= 0) { this.sliding = false; this.slideTimeLeft = 0; }
    }

    // a perna gira mais rápido quanto maior a velocidade
    this.runPhase += dt * (6 + speed * 0.32);
  }

  // tocou o chão: executa o comando que foi guardado no ar (deslizar ou pular de novo)
  land(floor) {
    this.y = floor; this.verticalSpeed = 0; this.jumping = false;
    this.landPulse = 1;
    if (this.slideAfterLanding) {
      this.slideAfterLanding = false;
      this.sliding = true; this.slideTimeLeft = ZYRO.CONFIG.SLIDE_TIME;
    } else if (this.jumpBufferTime > 0) {
      this.jumpBufferTime = 0;
      this.jumping = true; this.verticalSpeed = this.jumpVelocity;
    }
  }

  // Caixa de colisão do jogador. O jogador está sempre em z = 0 (o mundo é que se move).
  box() {
    const PLAYER = ZYRO.CONFIG.PLAYER;
    return {
      x0: this.x - PLAYER.halfW, x1: this.x + PLAYER.halfW,
      y0: this.y,                y1: this.y + this.height,
      z0: -PLAYER.halfD,         z1: PLAYER.halfD
    };
  }
};
