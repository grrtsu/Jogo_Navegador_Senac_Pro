/* =========================================================
   ZYRO — game.js  (A partida: estado e regras)

   Este arquivo NÃO desenha nada: só simula. O renderer lê o
   estado (posições, altura, power-ups) e desenha; o HUD e o
   áudio escutam os avisos do ZYRO.Bus. Por isso dá para rodar
   uma partida inteira sem tela, como fazem os testes.

   Estados da partida:
     menu → playing ⇄ paused
                ↓
              dying (câmera lenta da batida, 0,85 s) → over

   Ideia central do runner: o jogador fica parado em z = 0 e o
   MUNDO anda. "distance" é quantos metros a pista já rolou.
   Um obstáculo em d = 300 chega ao jogador quando distance = 300.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Game = class {
  constructor() {
    this.player = new ZYRO.Player();
    this.generator = new ZYRO.Generator();   // cria obstáculos, cores e power-ups à frente
    this.score = new ZYRO.Score();
    this.shift = new ZYRO.Shift();
    this.tutorial = null;                    // ZYRO.Tutorial na primeira corrida, senão null
    this.state = 'menu';
    this.distance = 0;                       // metros percorridos
    this.time = 0;                           // segundos de jogo (para PERFECT e animações)
    this.speed = ZYRO.Progression.baseSpeed(0);   // velocidade atual (m/s)
    this.clearWorld();
    this.zone = 0;
    this.invulnerable = 0;                   // segundos de proteção (depois do Shield ou do Jetpack)
    this.result = null;
  }

  // listas de tudo que existe na pista
  clearWorld() {
    this.obstacles = [];     // { type, lane, d, len } — carros na contramão também têm meetAt e ownSpeed
    this.coins = [];         // ZYRO CORES { x, y, d, lane, super }
    this.powerups = [];      // { type, x, y, d, lane }
    this.platforms = [];     // carros estacionados { lane, ramp, cars, h, d0, d1 }
    this.power = { magnet: 0, shield: 0, boost: 0, jetpack: 0 };   // segundos restantes de cada power-up
  }

  start() {
    this.player.reset(); this.generator.reset(); this.score.reset(); this.shift.reset();
    this.clearWorld();
    this.distance = 0; this.time = 0; this.zone = 0; this.invulnerable = 0;
    this.speed = ZYRO.Progression.baseSpeed(0);
    this.prevBest = ZYRO.Storage.stats().melhorPontuacao;
    this.recordAnnounced = false;
    this.hitObstacle = null;
    this.result = null;
    this.state = 'playing';
    // Primeira corrida: o tutorial monta os primeiros 200 m e o gerador só começa depois dele.
    this.tutorial = ZYRO.Storage.tutorialDone() ? null : new ZYRO.Tutorial(this);
    if (this.tutorial) this.generator.startAt(this.tutorial.endDistance);
    this.generator.update(this);
    ZYRO.Bus.emit('start');
  }

  pause() {
    if (this.state !== 'playing') return false;
    this.state = 'paused';
    ZYRO.Bus.emit('pause');
    return true;
  }
  resume() {
    if (this.state !== 'paused') return false;
    this.state = 'playing';
    ZYRO.Bus.emit('resume');
    return true;
  }
  toMenu() { this.state = 'menu'; this.tutorial = null; this.clearWorld(); this.player.reset(); }

  // ---------- Comandos do jogador (vindos do input.js) ----------
  action(name) {
    if (this.state !== 'playing') return false;
    // no tutorial, enquanto uma dica espera a ação certa, as outras teclas não fazem nada
    if (this.tutorial && !this.tutorial.allows(name)) return false;
    const player = this.player, now = this.time;
    let accepted = false;
    switch (name) {
      case 'left':  accepted = player.moveLane(-1, now); ZYRO.Bus.emit(accepted ? 'lane' : 'bump', -1); break;
      case 'right': accepted = player.moveLane(1, now);  ZYRO.Bus.emit(accepted ? 'lane' : 'bump', 1); break;
      // voando de Jetpack só dá para trocar de faixa
      case 'up':    accepted = !player.flying && player.jump(now);  if (accepted) ZYRO.Bus.emit('jump'); break;
      case 'down':  accepted = !player.flying && player.slide(now); if (accepted) ZYRO.Bus.emit('slide'); break;
      case 'shift': accepted = this.shift.activate(); if (!accepted) ZYRO.Bus.emit('shiftDenied', this.shift.energy); break;
    }
    if (accepted && this.tutorial) this.tutorial.onAction(name);
    return accepted;
  }

  // ---------- Atualização (chamada pelo laço principal a cada quadro) ----------
  update(dt) {
    dt = Math.min(dt, 0.05);                 // se a aba travou por 2 s, não simulamos 2 s de uma vez
    if (this.state === 'playing') {
      // o tutorial pode deixar o tempo em câmera lenta (ou parado) esperando o jogador agir
      if (this.tutorial) dt *= this.tutorial.update(dt);
      // SUB-PASSOS: a 120 m/s, um quadro de 1/60 s anda 2 m — mais que a espessura de uma barreira (0,5 m).
      // Testando a colisão só no fim do quadro, o jogador "atravessaria" a barreira sem bater (tunneling).
      // Então dividimos o quadro em passos de no máximo MAX_STEP metros e testamos em cada um.
      const steps = Math.max(1, Math.ceil((this.speed * dt) / ZYRO.CONFIG.MAX_STEP));
      for (let i = 0; i < steps && this.state === 'playing'; i++) this.step(dt / steps);
      if (this.tutorial && this.tutorial.finished) this.tutorial = null;
    } else if (this.state === 'dying') {
      this.dyingTimer -= dt;
      this.step(dt * 0.18, true);            // câmera lenta da batida
      if (this.dyingTimer <= 0) this.finish();
    } else if (this.state === 'menu') {
      this.distance += 10 * dt; this.time += dt;   // atrás do menu a cidade continua passando ("vitrine")
      this.player.update(dt, 10);
    }
  }

  // Um passo de simulação. A ordem importa: move o mundo → move o jogador → testa colisões → coleta itens.
  step(dt, dying = false) {
    const CONFIG = ZYRO.CONFIG, player = this.player;
    this.time += dt;
    if (!dying) {
      this.shift.update(dt);
      this.score.update(dt);
      this.updatePowerTimers(dt);
      this.invulnerable = Math.max(0, this.invulnerable - dt);
    }

    // Velocidade-alvo: a da distância atual, mais rápida com SHIFT e com Jetpack.
    // Em vez de pular direto para o alvo, chegamos nele aos poucos (lerp) para a aceleração ser suave.
    const targetSpeed = ZYRO.Progression.baseSpeed(this.distance) *
                        (this.shift.active ? CONFIG.SHIFT.speedMult : 1) *
                        (this.power.jetpack > 0 ? CONFIG.POWERUPS.jetpack.speedMult : 1);
    this.speed = ZYRO.Utils.lerp(this.speed, targetSpeed, 1 - Math.pow(0.02, dt));
    const metersThisStep = this.speed * dt;
    this.distance += metersThisStep;
    this.moveTraffic();

    if (this.power.jetpack > 0) this.flyJetpack(dt);
    const floorBefore = player.floor;
    player.update(dt, this.speed, this.floorAt(player.x, this.distance, player.y));
    if (dying) return;
    if (floorBefore === 0 && player.floor > 0 && !player.jumping) ZYRO.Bus.emit('ramp');   // começou a subir uma rampa

    this.score.addDistance(metersThisStep);
    const zoneIndex = ZYRO.Progression.zoneIndex(this.distance);
    if (zoneIndex !== this.zone) { this.zone = zoneIndex; ZYRO.Bus.emit('zone', zoneIndex); }

    this.generator.update(this);
    this.checkObstacles();
    if (this.state === 'playing') this.checkPlatforms();
    if (this.state !== 'playing') return;    // bateu: o resto do passo não importa
    ZYRO.Collectibles.updateCores(this, dt);
    ZYRO.Collectibles.updatePowerups(this);

    if (!this.recordAnnounced && this.prevBest > 0 && this.score.points > this.prevBest) {
      this.recordAnnounced = true;
      ZYRO.Bus.emit('msg', { text: 'NEW RECORD!', kind: 'record' });
      ZYRO.Bus.emit('record');
    }
    this.cleanup();
  }

  // cada power-up é só um cronômetro: maior que 0 = ativo
  updatePowerTimers(dt) {
    for (const type in this.power) {
      if (this.power[type] <= 0) continue;
      this.power[type] = Math.max(0, this.power[type] - dt);
      if (this.power[type] === 0) {
        if (type === 'jetpack') this.endJetpack();
        ZYRO.Bus.emit('powerupEnd', type);
      }
    }
    this.score.boost = this.power.boost > 0;
  }

  // ---------- Tráfego aéreo na contramão ----------
  // Cada carro nasce com um PONTO DE ENCONTRO (meetAt): a distância em que ele vai cruzar com o jogador.
  // Calcular a posição a partir desse ponto (e não somando a velocidade a cada passo) tem duas vantagens:
  //  1. o gerador sabe exatamente onde o carro vai estar quando o jogador chegar, e garante uma rota livre;
  //  2. se o jogador acelera (SHIFT), o encontro continua no mesmo lugar da pista.
  // Conta: faltam (meetAt − distance) metros para o jogador chegar, o que leva (meetAt − distance) / speed segundos.
  // Nesse tempo o carro anda ownSpeed × tempo na direção contrária. Então ele está AGORA nessa distância além do encontro.
  moveTraffic() {
    const player = this.player;
    for (const car of this.obstacles) {
      if (!car.ownSpeed) continue;            // obstáculo parado
      const secondsToMeet = (car.meetAt - this.distance) / Math.max(1, this.speed);
      car.d = car.meetAt + car.ownSpeed * secondsToMeet;
      // buzina ~1,3 s antes se o carro vem na faixa do jogador
      if (!car.honked && car.lane === player.lane && !player.flying && secondsToMeet < 1.3 && secondsToMeet > 0) {
        car.honked = true; ZYRO.Bus.emit('horn', car);
      }
    }
  }

  // ---------- Carros estacionados (plataformas) ----------
  // Altura do chão sob o jogador. Um teto ou rampa só conta se estiver até stepUp acima dos pés:
  // assim o jogador SOBE a rampa (que cresce aos poucos) mas não "sobe" a parede da frente de uma van.
  floorAt(x, d, feetHeight) {
    const laneWidth = ZYRO.CONFIG.LANE_WIDTH, stepUp = ZYRO.CONFIG.PLATFORM.stepUp;
    let floor = 0;
    for (const platform of this.platforms) {
      if (Math.abs(x - platform.lane * laneWidth) > 1.15 || d < platform.d0 || d > platform.d1) continue;
      const surface = ZYRO.Platform.surface(platform, d);
      if (surface <= feetHeight + stepUp && surface > floor) floor = surface;
    }
    return floor;
  }

  // Bater de frente (ou de lado, trocando de faixa) numa van estacionada.
  checkPlatforms() {
    const CONFIG = ZYRO.CONFIG, player = this.player, laneWidth = CONFIG.LANE_WIDTH;
    if (player.flying) return;
    const playerBox = player.box();
    for (const platform of this.platforms) {
      // longe na pista ou em outra faixa: pula
      if (this.distance + playerBox.z1 < platform.d0 || this.distance + playerBox.z0 > platform.d1) continue;
      if (playerBox.x1 <= platform.lane * laneWidth - 1.1 || playerBox.x0 >= platform.lane * laneWidth + 1.1) continue;
      const surfaceHere = ZYRO.Platform.surface(platform, Math.min(platform.d1, this.distance + playerBox.z1));
      if (player.y >= surfaceHere - CONFIG.PLATFORM.stepUp) continue;     // em cima do teto ou subindo a rampa: tudo certo

      // bateu. Com proteção, em vez de morrer o Zyro é jogado para o teto.
      const popOntoRoof = () => { player.y = platform.h; player.verticalSpeed = 0; player.jumping = false; };
      if (this.shift.active || this.shift.grace > 0 || this.invulnerable > 0) {
        popOntoRoof(); ZYRO.Bus.emit('ramp');
      } else if (this.power.shield > 0) {
        this.power.shield = 0; this.invulnerable = 1; popOntoRoof();
        ZYRO.Bus.emit('shieldHit', { d: this.distance, type: 'C' }); ZYRO.Bus.emit('powerupEnd', 'shield');
      } else {
        this.die({ type: 'C', lane: platform.lane, d: platform.d0, len: 0 });
        return;
      }
    }
  }

  // ---------- Jetpack ----------
  startJetpack() {
    const CONFIG = ZYRO.CONFIG, JETPACK = CONFIG.POWERUPS.jetpack, player = this.player;
    player.flying = true; player.sliding = false; player.jumping = false; player.verticalSpeed = 0;

    // Onde ele vai pousar? velocidade de voo × duração.
    const flySpeed = ZYRO.Progression.baseSpeed(this.distance) * JETPACK.speedMult * (this.shift.active ? CONFIG.SHIFT.speedMult : 1);
    const landingAt = this.distance + flySpeed * JETPACK.duration;
    // Pousar em cima de um obstáculo seria injusto: limpamos um trecho em volta do pouso,
    // tanto no que já existe quanto no que o gerador ainda vai criar (generator.quiet).
    const quietFrom = landingAt - flySpeed * 2.4, quietTo = landingAt + flySpeed * 1.5;
    this.generator.quiet = { from: quietFrom, to: quietTo };
    this.obstacles = this.obstacles.filter(obstacle => {
      const where = obstacle.meetAt ?? obstacle.d;    // carro na contramão: vale onde ele vai cruzar
      return where < quietFrom || where > quietTo;
    });

    // Trilha de cores no céu, a cada 4 m, trocando de faixa a cada 8 cores (zigue-zague).
    let lane = player.lane, count = 0;
    for (let coreD = this.distance + 18; coreD < landingAt - flySpeed * JETPACK.landing; coreD += 4, count++) {
      if (count % 8 === 7) lane = lane === 0 ? ZYRO.Utils.pick([-1, 1]) : 0;
      this.coins.push({ x: ZYRO.Lanes.x(lane), y: JETPACK.height + 0.9, d: coreD, lane, super: count % 40 === 39, sky: true });
    }
    ZYRO.Bus.emit('jetpackStart');
  }

  // Durante o voo: fica na altura do voo; nos últimos segundos desce suave até o chão (ou o teto de uma van).
  flyJetpack(dt) {
    const JETPACK = ZYRO.CONFIG.POWERUPS.jetpack, player = this.player, timeLeft = this.power.jetpack;
    const ground = this.floorAt(player.x, this.distance, 99);      // 99 = "de cima": qualquer superfície serve
    const heightShare = timeLeft > JETPACK.landing ? 1 : ZYRO.Utils.easeInOut(timeLeft / JETPACK.landing);
    const targetHeight = ground + (JETPACK.height - ground) * heightShare;
    player.y = ZYRO.Utils.lerp(player.y, targetHeight, 1 - Math.pow(0.003, dt));
  }

  endJetpack() {
    const player = this.player;
    player.flying = false; player.jumping = player.y > 0.05; player.verticalSpeed = 0;   // se ainda está no ar, cai
    this.invulnerable = Math.max(this.invulnerable, ZYRO.CONFIG.POWERUPS.jetpack.grace);
    ZYRO.Bus.emit('jetpackEnd');
  }

  // ---------- Obstáculos ----------
  checkObstacles() {
    const CONFIG = ZYRO.CONFIG, player = this.player;
    for (const obstacle of this.obstacles) {
      if (obstacle.broken) continue;
      const z0 = obstacle.d - this.distance;                  // metros até a frente do obstáculo
      if (player.flying) { if (z0 <= 0) obstacle.evaluated = true; continue; }   // voando por cima de tudo
      // longe demais (à frente ou atrás): nem testa a colisão (economiza processamento)
      if (z0 > 3 || z0 + obstacle.len < -1) {
        if (!obstacle.evaluated && z0 + obstacle.len < -1) obstacle.evaluated = true;
        continue;
      }
      const hit = ZYRO.Collision.hits(player, obstacle, this.distance);
      if (!obstacle.evaluated && z0 <= 0) {                   // a frente do obstáculo acabou de chegar ao jogador
        obstacle.evaluated = true;
        if (!hit) this.evaluateDodge(obstacle);
      }
      if (!hit) continue;

      if (this.shift.active) {                                 // ZYRO SHIFT: atravessa e ganha pontos
        obstacle.broken = true;
        const pts = this.score.add(CONFIG.SCORE.shiftBreak);
        ZYRO.Bus.emit('break', obstacle);
        ZYRO.Bus.emit('float', { text: '+' + pts, color: '#FFD447', d: obstacle.d, x: player.x, y: 2.2 });
      } else if (this.shift.grace > 0 || this.invulnerable > 0) {
        // proteção curta depois do SHIFT, do Shield ou do Jetpack: ignora
      } else if (this.power.shield > 0) {                      // Shield: aguenta uma batida
        this.power.shield = 0;
        obstacle.broken = true;
        this.invulnerable = 1;
        ZYRO.Bus.emit('shieldHit', obstacle);
        ZYRO.Bus.emit('powerupEnd', 'shield');
      } else {
        this.die(obstacle);
        return;
      }
    }
  }

  // Desvio perfeito: fez a ação certa POUCO antes do obstáculo chegar (ver PERFECT_WINDOW no config).
  evaluateDodge(obstacle) {
    if (this.shift.active) return;
    const CONFIG = ZYRO.CONFIG, player = this.player, last = player.lastAction;
    const secondsSince = this.time - last.time;
    let kind = null;
    if (ZYRO.Collision.blocksLane(obstacle, player.lane)) {
      // está na faixa do obstáculo e não bateu → passou por cima (pulo) ou por baixo (deslize)
      const rightMove = (obstacle.type === 'L' && last.type === 'jump') ||
                        ((obstacle.type === 'H' || obstacle.type === 'A') && last.type === 'slide');
      if (rightMove && secondsSince <= CONFIG.PERFECT_WINDOW + 0.1) kind = secondsSince <= CONFIG.NEAR_MISS_WINDOW ? 'near' : 'perfect';
    } else if (last.type === 'lane' && ZYRO.Collision.blocksLane(obstacle, last.fromLane) && secondsSince <= CONFIG.PERFECT_WINDOW) {
      // saiu da faixa do obstáculo em cima da hora
      kind = secondsSince <= CONFIG.NEAR_MISS_WINDOW ? 'near' : 'perfect';
    }
    if (!kind) return;

    const result = this.score.dodge(kind);
    this.shift.gain(kind === 'near' ? CONFIG.SHIFT.gain.nearMiss : CONFIG.SHIFT.gain.perfect);
    ZYRO.Bus.emit('float', { text: '+' + result.pts, color: kind === 'near' ? '#00D9FF' : '#42EDAA', d: this.distance + 0.5, x: player.x, y: 2.4 });
    if (result.newMult) ZYRO.Bus.emit('msg', { text: `COMBO x${result.newMult}!`, kind: 'combo' });
    else ZYRO.Bus.emit('msg', { text: kind === 'near' ? 'AWESOME!' : 'PERFECT!', kind });
    ZYRO.Bus.emit('dodge', { kind, mult: this.score.comboMult });
  }

  // ---------- Itens ----------
  collectCore(core) {
    const CONFIG = ZYRO.CONFIG;
    const streakBonus = this.score.core(core.super);
    this.shift.gain(core.super ? CONFIG.SHIFT.gain.superCore : CONFIG.SHIFT.gain.core);
    ZYRO.Bus.emit('core', core);
    if (core.super) ZYRO.Bus.emit('float', { text: '+' + CONFIG.SCORE.superCore * this.score.mult, color: '#00D9FF', d: core.d, x: core.x, y: core.y + 0.6 });
    if (streakBonus) {
      ZYRO.Bus.emit('msg', { text: 'AWESOME!', kind: 'near' });
      ZYRO.Bus.emit('float', { text: '+' + streakBonus, color: '#FFD447', d: this.distance + 1, x: this.player.x, y: 2.6 });
    }
  }

  activatePowerup(type) {
    const POWERUPS = ZYRO.CONFIG.POWERUPS, info = ZYRO.POWERUP_TYPES[type];
    const wasActive = this.power[type] > 0;
    this.power[type] = POWERUPS[type].duration;        // pegar de novo renova o tempo
    if (type === 'jetpack' && !wasActive) this.startJetpack();
    ZYRO.Bus.emit('powerup', type);
    ZYRO.Bus.emit('msg', { text: info.nome + '!', kind: 'power', color: info.cor });
  }

  // ---------- Fim de corrida ----------
  die(obstacle) {
    this.state = 'dying';
    this.dyingTimer = 0.85;
    this.hitObstacle = obstacle;               // a tela de Game Over diz em que você bateu
    this.score.streak = 0;
    ZYRO.Bus.emit('hit', obstacle);
  }

  finish() {
    const score = this.score;
    const run = {
      pontos: Math.floor(score.points), distancia: Math.floor(this.distance), cores: score.cores,
      combo: score.bestMult, zona: ZYRO.CONFIG.ZONES[this.zone].name,
      obstaculo: this.hitObstacle && this.hitObstacle.type
    };
    const saved = ZYRO.Storage.registerRun(run);
    this.result = { ...run, ...saved };
    this.state = 'over';
    ZYRO.Bus.emit('gameover', this.result);
  }

  // Remove o que ficou para trás. Sem isso as listas cresceriam para sempre e o jogo ficaria lento.
  cleanup() {
    const behind = this.distance - 10;
    if (this.obstacles.length > 30 || (this.obstacles.length && this.obstacles[0].d + 3 < behind)) {
      this.obstacles = this.obstacles.filter(obstacle => obstacle.d + obstacle.len > behind);
    }
    if (this.platforms.length && this.platforms[0].d1 < behind) this.platforms = this.platforms.filter(platform => platform.d1 > behind);
    if (this.coins.length > 120 || (this.coins.length && this.coins[0].d < behind)) {
      this.coins = this.coins.filter(core => core.d > behind && !(core.taken && core.d < this.distance));
    }
    if (this.powerups.length && this.powerups[0].d < behind) this.powerups = this.powerups.filter(item => item.d > behind);
  }
};
