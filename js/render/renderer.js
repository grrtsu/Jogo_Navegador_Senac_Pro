/* =========================================================
   ZYRO — renderer.js  (Desenha um quadro do jogo)

   Algoritmo do PINTOR: desenha do mais longe para o mais
   perto, e o que vem depois cobre o que veio antes. Ordem:
     céu → cidade → chão → prédios → pista → postes →
     objetos (ordenados do fundo para a frente) → Zyro → efeitos

   O renderer só LÊ o estado do jogo; nunca muda regras.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Renderer = {
  init(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });   // sem transparência: o navegador desenha mais rápido
    this.game = game;
    this.pose = { jump: 0, slide: 0 };   // pose suavizada do Zyro (0 a 1)
    this.dustTimer = 0;
    this.jetTimer = 0;
    this.shiftAmount = 0;                // 0 a 1: quanto do visual do SHIFT está ligado (para entrar e sair suave)
    this.quality = 'alta'; this.reduce = false;
    this.listen();
  },

  setOptions(quality, reduce) {
    const changed = quality !== this.quality;
    this.quality = quality; this.reduce = reduce;
    ZYRO.Effects.quality = quality; ZYRO.Effects.reduce = reduce;
    if (changed && this.W) this.resize();
  },

  // Telas de celular têm 2 ou 3 pixels físicos por pixel CSS (devicePixelRatio).
  // Desenhar em resolução cheia deixa nítido; na qualidade baixa limitamos a 1 para ganhar desempenho.
  resize() {
    const maxRatio = this.quality === 'baixa' ? 1 : this.quality === 'media' ? 1.5 : 2;
    const ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
    const W = window.innerWidth, H = window.innerHeight;
    this.W = W; this.H = H; this.dpr = ratio;
    this.canvas.width = Math.round(W * ratio); this.canvas.height = Math.round(H * ratio);
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
    ZYRO.Camera.resize(W, H);
    ZYRO.Scenery.init(W, H, ZYRO.Camera, this.quality);
  },

  // posição na tela de algo do mundo (usada para soltar efeitos no lugar certo)
  screenOf(x, y, d) {
    const point = ZYRO.Camera.project(x, y, d - this.game.distance);
    return point || { x: this.W / 2, y: this.H * 0.7, s: 40 };
  },
  playerScreen() {
    const player = this.game.player;
    return this.screenOf(player.x, player.y + player.height * 0.6, this.game.distance);
  },

  // Efeitos visuais ligados aos eventos do jogo (o game.js não sabe que eles existem)
  listen() {
    const Bus = ZYRO.Bus, Effects = ZYRO.Effects, COLORS = ZYRO.CONFIG.COLORS;
    Bus.on('core', core => {
      const point = this.screenOf(core.x, core.y, core.d);
      Effects.sparkle(point.x, point.y, core.super ? COLORS.azul : COLORS.amarelo, Math.max(3, point.s * 0.12));
    });
    Bus.on('float', text => {
      const point = this.screenOf(text.x, text.y, text.d);
      Effects.float(text.text, text.color, point.x, Math.min(point.y, ZYRO.Camera.groundY - point.s * 2.2), Math.max(16, Math.min(28, point.s * 0.45)));
    });
    Bus.on('break', obstacle => {
      const point = this.screenOf(this.game.player.x, 1, obstacle.d);
      const color = { R: COLORS.vermelho, L: COLORS.laranja, H: COLORS.rosa, B: COLORS.azul, G: COLORS.rosa }[obstacle.type];
      Effects.burst(point.x, point.y, [color, '#fff', COLORS.amarelo], 26, { speed: 420, gravity: 700, life: 0.7, size: 7, shape: 'rect' });
      Effects.wave(point.x, point.y, COLORS.azul, 160);
      ZYRO.Camera.shake = Math.max(ZYRO.Camera.shake, 0.25);
    });
    Bus.on('shiftStart', () => {
      const point = this.playerScreen();
      Effects.wave(point.x, point.y, COLORS.azul, 340); Effects.wave(point.x, point.y, COLORS.rosa, 240);
      Effects.burst(point.x, point.y, [COLORS.azul, COLORS.roxo, COLORS.rosa, '#fff'], 40, { speed: 520, gravity: 0, life: 0.6, size: 5, shape: 'spark' });
    });
    Bus.on('shieldHit', () => {
      const point = this.playerScreen();
      Effects.wave(point.x, point.y, COLORS.azul, 200);
      Effects.burst(point.x, point.y, [COLORS.azul, '#fff'], 24, { speed: 380, gravity: 300, life: 0.6, size: 6, shape: 'rect' });
      ZYRO.Camera.shake = 0.5;
    });
    Bus.on('powerup', type => {
      const point = this.playerScreen();
      Effects.wave(point.x, point.y, ZYRO.POWERUP_TYPES[type].cor, 180);
    });
    Bus.on('hit', () => {
      const point = this.playerScreen();
      ZYRO.Camera.shake = 1;
      Effects.burst(point.x, point.y - 20, [COLORS.amarelo, '#fff', COLORS.vermelho], 22, { speed: 300, gravity: 400, life: 0.7, size: 6, shape: 'spark' });
    });
    Bus.on('gameover', result => { if (result.novoRecorde) Effects.confetti(this.W); });
    Bus.on('record', () => Effects.confetti(this.W));
    Bus.on('jump', () => {
      const point = this.screenOf(this.game.player.x, 0, this.game.distance);
      Effects.burst(point.x, point.y, ['#fff', COLORS.azul], 8, { speed: 140, gravity: 120, life: 0.35, size: 5, angle: -Math.PI / 2, spread: 2.4 });
    });
    Bus.on('jetpackStart', () => {
      const point = this.playerScreen();
      Effects.wave(point.x, point.y, '#FF9D43', 260);
      Effects.burst(point.x, point.y + 30, ['#FFD447', '#FF9D43', '#fff'], 30, { speed: 380, gravity: 200, life: 0.7, size: 6, angle: Math.PI / 2, spread: 1.8 });
    });
    Bus.on('jetpackEnd', () => {   // o jetpack descartado se desmancha em pedaços
      const point = this.playerScreen();
      Effects.burst(point.x, point.y, ['#B9C4EE', '#FF9D43', '#344A80'], 14, { speed: 260, gravity: 600, life: 0.9, size: 7, shape: 'rect' });
    });
    Bus.on('start', () => { this.pose.jump = this.pose.slide = 0; Effects.parts = []; Effects.floats = []; });
  },

  // Desenha um quadro inteiro (chamado pelo laço principal, ~60 vezes por segundo)
  draw(dt) {
    const game = this.game, ctx = this.ctx, camera = ZYRO.Camera, Sprites = ZYRO.Sprites, Effects = ZYRO.Effects;
    const inRun = game.state !== 'menu';
    const time = game.time;
    camera.follow(inRun ? game.player : { x: 0, y: 0 }, dt, this.reduce);
    if (game.state !== 'paused') { ZYRO.Scenery.update(dt); Effects.update(dt); }
    this.shiftAmount = ZYRO.Utils.lerp(this.shiftAmount, game.shift.active ? 1 : 0, 1 - Math.pow(0.001, dt));

    // escala tudo pela densidade de pixels (desenhamos em px CSS, o canvas tem px físicos)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ZYRO.Scenery.drawSky(ctx, camera, performance.now() / 1000);
    ZYRO.Scenery.drawGround(ctx, camera, game.distance);
    ZYRO.Scenery.drawSideStructures(ctx, camera, game.distance);
    ZYRO.Scenery.drawTrack(ctx, camera, game.distance, this.shiftAmount);
    ZYRO.Scenery.drawDecor(ctx, camera, game.distance, time);

    if (inRun) {
      this.drawWorldObjects(ctx, camera, Sprites, time);
      this.drawPlayer(ctx, dt);
    }

    Effects.speedLines(ctx, camera, this.shiftAmount, performance.now() / 1000, ['#FFFFFF', '#00D9FF', '#FF4FBF']);
    Effects.draw(ctx);
    if (this.shiftAmount > 0.02) {                // vinheta roxa nas bordas durante o SHIFT
      const vignette = ctx.createRadialGradient(camera.cx, this.H * 0.55, this.H * 0.3, camera.cx, this.H * 0.55, this.H * 0.95);
      vignette.addColorStop(0, 'rgba(121,85,255,0)'); vignette.addColorStop(1, `rgba(121,85,255,${0.45 * this.shiftAmount})`);
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.debug) this.drawDebug(ctx);
  },

  // Obstáculos, cores, power-ups e vans: junta tudo numa lista, ordena pela distância e desenha do fundo para a frente.
  drawWorldObjects(ctx, camera, Sprites, time) {
    const game = this.game, DRAW_DIST = ZYRO.CONFIG.DRAW_DIST, PLATFORM = ZYRO.CONFIG.PLATFORM;
    const KIND = { obstacle: 0, core: 1, powerup: 2, van: 3 };
    const items = [];
    for (const obstacle of game.obstacles) {
      const z = obstacle.d - game.distance;
      if (!obstacle.broken && z < DRAW_DIST && z + obstacle.len > -2.5) items.push({ z, kind: KIND.obstacle, object: obstacle });
    }
    for (const core of game.coins) {
      const z = core.d - game.distance;
      if (!core.taken && z < DRAW_DIST * 0.8 && z > -2) items.push({ z, kind: KIND.core, object: core });
    }
    for (const item of game.powerups) {
      const z = item.d - game.distance;
      if (!item.taken && z < DRAW_DIST && z > -2) items.push({ z, kind: KIND.powerup, object: item });
    }
    // Vans: cada van (e a rampa) vira um item ordenado pela parte de TRÁS.
    // Assim os cores em cima do teto (que estão "na frente" do fundo da van) são desenhados por cima dela.
    for (const platform of game.platforms) {
      const z0 = platform.d0 - game.distance;
      if (z0 > DRAW_DIST || platform.d1 - game.distance < -6) continue;
      if (platform.ramp) items.push({ z: z0 + PLATFORM.rampLen, front: z0, kind: KIND.van, object: platform, segment: -1 });
      const carsZ = ZYRO.Platform.carsStart(platform) - game.distance;
      for (let i = 0; i < platform.cars; i++) {
        const carZ = carsZ + i * PLATFORM.carLen;
        if (carZ < DRAW_DIST && carZ + PLATFORM.carLen > -6) items.push({ z: carZ + PLATFORM.carLen, front: carZ, kind: KIND.van, object: platform, segment: i });
      }
    }
    items.sort((a, b) => b.z - a.z);   // maior z (mais longe) primeiro

    for (const item of items) {
      const front = item.kind === KIND.van ? item.front : item.z;
      // aparece aos poucos no horizonte (fade-in nos últimos 25 m) e some suave ao passar do jogador
      if (item.kind === KIND.van) ctx.globalAlpha = front > DRAW_DIST - 25 ? ZYRO.Utils.clamp((DRAW_DIST - front) / 25, 0, 1) : 1;
      else ctx.globalAlpha = item.z < 0 ? ZYRO.Utils.clamp(1 + item.z / 2.5, 0, 1) : item.z > DRAW_DIST - 25 ? (DRAW_DIST - item.z) / 25 : 1;

      if (item.kind === KIND.van) {
        if (item.segment < 0) ZYRO.Vehicles.ramp(ctx, camera, item.object, front);
        else ZYRO.Vehicles.van(ctx, camera, item.object, front, PLATFORM.carLen, time);
      } else if (item.kind === KIND.obstacle) Sprites.obstacle(ctx, camera, item.object, item.z, time);
      else if (item.kind === KIND.core) Sprites.core(ctx, camera, item.object, item.z, time);
      else Sprites.powerup(ctx, camera, item.object, item.z, time);
    }
    ctx.globalAlpha = 1;
  },

  drawPlayer(ctx, dt) {
    const game = this.game, player = game.player, camera = ZYRO.Camera, COLORS = ZYRO.CONFIG.COLORS, Effects = ZYRO.Effects;
    // pose suave: o desenho não "pula" de correndo para agachado, ele transiciona
    const blend = 1 - Math.pow(0.0000005, dt);
    this.pose.jump = ZYRO.Utils.lerp(this.pose.jump, player.flying ? 0.55 : player.jumping ? 1 : 0, blend);
    this.pose.slide = ZYRO.Utils.lerp(this.pose.slide, player.sliding ? 1 : 0, blend);
    const ground = camera.project(player.x, player.flying ? 0 : game.floorAt(player.x, game.distance, player.y), 0);
    const feet = camera.project(player.x, player.y, 0);
    if (!ground || !feet) return;

    // sombra no chão (encolhe quanto mais alto ele está)
    const shadowSize = 1 / (1 + Math.max(0, player.y - (player.flying ? 0 : player.floor)) * 0.6);
    ctx.fillStyle = 'rgba(5,8,25,.32)';
    ctx.beginPath(); ctx.ellipse(ground.x, ground.y, ground.s * 0.55 * shadowSize, ground.s * 0.16 * shadowSize, 0, 0, 7); ctx.fill();

    // poeira dos pés e fogo do jetpack
    if (game.state === 'playing') {
      this.dustTimer -= dt;
      const jetpackOn = game.power.jetpack > 0;
      if (jetpackOn) {
        this.jetTimer -= dt;
        if (this.jetTimer <= 0) {
          this.jetTimer = this.quality === 'baixa' ? 0.06 : 0.025;
          for (const offsetX of [-0.13, 0.13]) {        // um jato em cada tanque
            const nozzle = camera.project(player.x + offsetX, player.y + 0.85, 0.1);
            if (nozzle) Effects.burst(nozzle.x, nozzle.y, ['#FFD447', '#FF9D43', 'rgba(255,255,255,.8)'], 2, { speed: 220, gravity: 300, life: 0.4, size: 5, angle: Math.PI / 2, spread: 0.5 });
          }
        }
      }
      if (this.dustTimer <= 0 && !player.jumping && !jetpackOn && this.quality !== 'baixa') {
        this.dustTimer = game.shift.active ? 0.02 : 0.07;
        const colors = game.shift.active ? [COLORS.azul, COLORS.rosa, '#fff'] : ['rgba(255,255,255,.7)', COLORS.azul];
        Effects.burst(feet.x + (Math.random() - 0.5) * feet.s * 0.4, feet.y, colors, game.shift.active ? 3 : 1,
          { speed: game.shift.active ? 260 : 90, gravity: -40, life: 0.35, size: game.shift.active ? 4 : 3, angle: Math.PI / 2, spread: 1.6 });
      }
    }
    // pisca quando está protegido, e nos últimos 0,7 s de SHIFT (aviso de que vai acabar)
    const blink = (game.invulnerable > 0 && Math.floor(game.time * 20) % 2) ||
                  (game.shift.active && game.shift.timeLeft < 0.7 && Math.floor(game.time * 14) % 2);
    // bolha do Shield e anel do ímã
    const middle = camera.project(player.x, player.y + player.height * 0.55, 0);
    if (game.power.shield > 0) {
      ctx.fillStyle = 'rgba(0,217,255,.14)'; ctx.strokeStyle = 'rgba(0,217,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(middle.x, middle.y, middle.s * 0.8, middle.s * 1.15, 0, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (game.power.magnet > 0) {
      const pulse = game.time * 2 % 1, radius = middle.s * (0.9 + pulse * 0.6);
      ctx.strokeStyle = `rgba(255,79,191,${0.7 - pulse * 0.6})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(middle.x, middle.y + middle.s * 0.5, radius, radius * 0.35, 0, 0, 7); ctx.stroke();
    }
    ZYRO.Character.draw(ctx, feet.x, feet.y, feet.s, {
      phase: player.runPhase, jump: this.pose.jump, slide: this.pose.slide * (1 - this.pose.jump),
      tilt: player.tilt + player.bump * 0.3, shift: game.shift.active && !blink, land: player.landPulse, jetpack: game.power.jetpack > 0,
      hit: game.state === 'dying' || game.state === 'over' ? 1 : 0, alpha: blink && !game.shift.active ? 0.45 : 1
    });
  },

  // index.html#debug: mostra as caixas de colisão (verde = jogador, vermelho = obstáculos, amarelo = vans)
  drawDebug(ctx) {
    const game = this.game, camera = ZYRO.Camera, laneWidth = ZYRO.CONFIG.LANE_WIDTH;
    const drawBox = (x0, x1, y0, y1, z) => {
      const topLeft = camera.project(x0, y1, z), bottomRight = camera.project(x1, y0, z);
      if (topLeft && bottomRight) ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    };
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0f0';
    const playerBox = game.player.box(); drawBox(playerBox.x0, playerBox.x1, playerBox.y0, playerBox.y1, 0);
    ctx.strokeStyle = '#f00';
    for (const obstacle of game.obstacles) {
      const z = obstacle.d - game.distance;
      if (z > -1 && z < 60) for (const box of ZYRO.Collision.boxes(obstacle)) drawBox(box.x0, box.x1, box.y0, box.y1, z);
    }
    ctx.strokeStyle = '#ff0';
    for (const platform of game.platforms) {
      const z = platform.d0 - game.distance;
      if (z > -1 && z < 60) drawBox(platform.lane * laneWidth - 1.1, platform.lane * laneWidth + 1.1, 0, platform.h, z);
    }
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`fps ${Math.round(this.fps || 0)}  v ${ZYRO.Progression.speedUnits(game.distance)} medidas (${game.speed.toFixed(1)} m/s)  d ${Math.floor(game.distance)}  obj ${game.obstacles.length}/${game.coins.length}`, 10, this.H - 12);
  }
};
