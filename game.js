/* =========================================================
   ZYRO — game.js  (Estado da partida e regras)
   Não desenha nada: só simula. O renderer lê o estado e a
   interface escuta os eventos do ZYRO.Bus.
   Estados: menu → playing ⇄ paused → dying → over
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Game = class {
  constructor() {
    this.player = new ZYRO.Player();
    this.gen = new ZYRO.Generator();
    this.score = new ZYRO.Score();
    this.shift = new ZYRO.Shift();
    this.state = 'menu';
    this.dist = 0; this.time = 0; this.speed = ZYRO.Progression.baseSpeed(0);
    this.obstacles = []; this.coins = []; this.powerups = []; this.platforms = [];
    this.power = { magnet: 0, shield: 0, boost: 0, jetpack: 0 };
    this.zone = 0;
    this.invuln = 0;
    this.result = null;
  }

  start() {
    this.player.reset(); this.gen.reset(); this.score.reset(); this.shift.reset();
    this.obstacles = []; this.coins = []; this.powerups = []; this.platforms = [];
    this.power = { magnet: 0, shield: 0, boost: 0, jetpack: 0 };
    this.dist = 0; this.time = 0; this.zone = 0; this.invuln = 0;
    this.speed = ZYRO.Progression.baseSpeed(0);
    this.prevBest = ZYRO.Storage.stats().melhorPontuacao;
    this.recordAnnounced = false;
    this.hitObstacle = null;
    this.result = null;
    this.state = 'playing';
    this.gen.update(this);
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
  toMenu() { this.state = 'menu'; this.obstacles = []; this.coins = []; this.powerups = []; this.platforms = []; this.player.reset(); }

  // comandos do jogador
  action(name) {
    if (this.state !== 'playing') return false;
    const p = this.player, t = this.time;
    let ok = false;
    switch (name) {
      case 'left':  ok = p.moveLane(-1, t); ZYRO.Bus.emit(ok ? 'lane' : 'bump', -1); break;
      case 'right': ok = p.moveLane(1, t);  ZYRO.Bus.emit(ok ? 'lane' : 'bump', 1); break;
      case 'up':    ok = !p.flying && p.jump(t);  if (ok) ZYRO.Bus.emit('jump'); break;   // voando de Jetpack: só troca de faixa
      case 'down':  ok = !p.flying && p.slide(t); if (ok) ZYRO.Bus.emit('slide'); break;
      case 'shift': ok = this.shift.activate(); if (!ok) ZYRO.Bus.emit('shiftDenied', this.shift.energy); break;
    }
    return ok;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);                 // evita saltos se a aba travar
    if (this.state === 'playing') {
      // em alta velocidade divide o quadro em passos curtos para a colisão nunca "pular" um obstáculo
      const n = Math.max(1, Math.ceil((this.speed * dt) / ZYRO.CONFIG.MAX_STEP));
      for (let i = 0; i < n && this.state === 'playing'; i++) this.step(dt / n);
    }
    else if (this.state === 'dying') {
      this.dieT -= dt;
      this.step(dt * 0.18, true);            // câmera lenta na colisão
      if (this.dieT <= 0) this.finish();
    } else if (this.state === 'menu') {
      this.dist += 10 * dt; this.time += dt; // modo vitrine do menu
      this.player.update(dt, 10);
    }
  }

  step(dt, dying = false) {
    const C = ZYRO.CONFIG;
    this.time += dt;
    if (!dying) {
      this.shift.update(dt);
      this.score.update(dt);
      for (const k in this.power) {
        if (this.power[k] > 0) {
          this.power[k] = Math.max(0, this.power[k] - dt);
          if (this.power[k] === 0) { if (k === 'jetpack') this.endJetpack(); ZYRO.Bus.emit('powerupEnd', k); }
        }
      }
      this.score.boost = this.power.boost > 0;
      this.invuln = Math.max(0, this.invuln - dt);
    }

    const target = ZYRO.Progression.baseSpeed(this.dist) * (this.shift.active ? C.SHIFT.speedMult : 1) *
                   (this.power.jetpack > 0 ? C.POWERUPS.jetpack.speedMult : 1);
    this.speed = ZYRO.U.lerp(this.speed, target, 1 - Math.pow(0.02, dt));
    const move = this.speed * dt;
    this.dist += move;
    this.moveTraffic();
    const p = this.player;
    if (this.power.jetpack > 0) this.flyJetpack(dt);
    const prevFloor = p.floor;
    p.update(dt, this.speed, this.floorAt(p.x, this.dist, p.y));
    if (dying) return;
    if (prevFloor === 0 && p.floor > 0 && !p.jumping) ZYRO.Bus.emit('ramp');   // começou a subir a rampa

    this.score.addDistance(move);

    const zi = ZYRO.Progression.zoneIndex(this.dist);
    if (zi !== this.zone) { this.zone = zi; ZYRO.Bus.emit('zone', zi); }

    this.gen.update(this);
    this.checkObstacles();
    if (this.state === 'playing') this.checkPlatforms();
    if (this.state !== 'playing') return;
    ZYRO.Collectibles.updateCores(this, dt);
    ZYRO.Collectibles.updatePowerups(this);

    if (!this.recordAnnounced && this.prevBest > 0 && this.score.points > this.prevBest) {
      this.recordAnnounced = true;
      ZYRO.Bus.emit('msg', { text: 'NEW RECORD!', kind: 'record' });
      ZYRO.Bus.emit('record');
    }
    this.cleanup();
  }

  // ---------- tráfego aéreo na contramão ----------
  // cada carro tem um ponto de encontro (dm); a posição real vem na direção do jogador
  moveTraffic() {
    const p = this.player;
    for (const o of this.obstacles) {
      if (!o.v) continue;
      o.d = o.dm + o.v * (o.dm - this.dist) / Math.max(1, this.speed);
      // buzina quando um carro vem na faixa do jogador (~1,3 s antes)
      if (!o.honked && o.lane === p.lane && !p.flying && (o.dm - this.dist) / this.speed < 1.3 && o.dm > this.dist) {
        o.honked = true; ZYRO.Bus.emit('horn', o);
      }
    }
  }

  // ---------- carros estacionados (plataformas) ----------
  // altura do chão sob o jogador: teto/rampa só conta se ele conseguir "pisar" (não sobe parede)
  floorAt(x, d, y) {
    const LW = ZYRO.CONFIG.LANE_W, step = ZYRO.CONFIG.PLATFORM.step;
    let f = 0;
    for (const pl of this.platforms) {
      if (Math.abs(x - pl.lane * LW) > 1.15 || d < pl.d0 || d > pl.d1) continue;
      const s = ZYRO.Platform.surface(pl, d);
      if (s <= y + step && s > f) f = s;
    }
    return f;
  }

  // bater de frente ou de lado num carro estacionado
  checkPlatforms() {
    const C = ZYRO.CONFIG, p = this.player, LW = C.LANE_W;
    if (p.flying) return;
    const pb = p.box();
    for (const pl of this.platforms) {
      if (this.dist + pb.z1 < pl.d0 || this.dist + pb.z0 > pl.d1) continue;
      if (pb.x1 <= pl.lane * LW - 1.1 || pb.x0 >= pl.lane * LW + 1.1) continue;
      const h = ZYRO.Platform.surface(pl, Math.min(pl.d1, this.dist + pb.z1));
      if (p.y >= h - C.PLATFORM.step) continue;          // em cima do teto ou subindo a rampa
      const pop = () => { p.y = pl.h; p.vy = 0; p.jumping = false; };   // protegido: é lançado para o teto
      if (this.shift.active || this.shift.grace > 0 || this.invuln > 0) { pop(); ZYRO.Bus.emit('ramp'); }
      else if (this.power.shield > 0) {
        this.power.shield = 0; this.invuln = 1; pop();
        ZYRO.Bus.emit('shieldHit', { d: this.dist, type: 'C' }); ZYRO.Bus.emit('powerupEnd', 'shield');
      } else { this.die({ type: 'C', lane: pl.lane, d: pl.d0, len: 0 }); return; }
    }
  }

  // ---------- Jetpack ----------
  startJetpack() {
    const C = ZYRO.CONFIG, J = C.POWERUPS.jetpack, p = this.player, U = ZYRO.U;
    p.flying = true; p.sliding = false; p.jumping = false; p.vy = 0;
    const v = ZYRO.Progression.baseSpeed(this.dist) * J.speedMult * (this.shift.active ? C.SHIFT.speedMult : 1);
    const land = this.dist + v * J.dur;
    // trecho de pouso sem obstáculos (no gerador e no que já existe)
    const from = land - v * 2.4, to = land + v * 1.5;
    this.gen.quiet = { from, to };
    this.obstacles = this.obstacles.filter(o => { const dm = o.dm ?? o.d; return dm < from || dm > to; });
    // trilha de cores no céu, em zigue-zague entre as faixas
    let lane = p.lane, n = 0;
    for (let cd = this.dist + 18; cd < land - v * J.landing; cd += 4, n++) {
      if (n % 8 === 7) lane = lane === 0 ? U.pick([-1, 1]) : 0;
      this.coins.push({ x: ZYRO.Lanes.x(lane), y: J.height + 0.9, d: cd, lane, super: n % 40 === 39, sky: true });
    }
    ZYRO.Bus.emit('jetpackStart');
  }
  flyJetpack(dt) {
    const J = ZYRO.CONFIG.POWERUPS.jetpack, p = this.player, rem = this.power.jetpack;
    const floor = this.floorAt(p.x, this.dist, 99);
    const k = rem > J.landing ? 1 : ZYRO.U.easeInOut(rem / J.landing);   // desce suavemente no fim
    const target = floor + (J.height - floor) * k;
    p.y = ZYRO.U.lerp(p.y, target, 1 - Math.pow(0.003, dt));
  }
  endJetpack() {
    const p = this.player;
    p.flying = false; p.jumping = p.y > 0.05; p.vy = 0;
    this.invuln = Math.max(this.invuln, ZYRO.CONFIG.POWERUPS.jetpack.grace);
    ZYRO.Bus.emit('jetpackEnd');
  }

  checkObstacles() {
    const C = ZYRO.CONFIG, p = this.player;
    for (const o of this.obstacles) {
      if (o.broken) continue;
      const z0 = o.d - this.dist;
      if (p.flying) { if (z0 <= 0) o.evaluated = true; continue; }   // voando por cima de tudo
      if (z0 > 3 || z0 + o.len < -1) {
        if (!o.evaluated && z0 + o.len < -1) o.evaluated = true;
        continue;
      }
      const hit = ZYRO.Collision.hits(p, o, this.dist);
      if (!o.evaluated && z0 <= 0) {          // frente do obstáculo chegou ao jogador
        o.evaluated = true;
        if (!hit) this.evaluateDodge(o);
      }
      if (!hit) continue;
      if (this.shift.active) {                  // ZYRO SHIFT: atravessa e ganha pontos
        o.broken = true;
        const pts = this.score.add(C.SCORE.shiftBreak);
        ZYRO.Bus.emit('break', o);
        ZYRO.Bus.emit('float', { text: '+' + pts, color: '#FFD447', d: o.d, x: p.x, y: 2.2 });
      } else if (this.shift.grace > 0 || this.invuln > 0) {
        // proteção curta: ignora
      } else if (this.power.shield > 0) {
        this.power.shield = 0;
        o.broken = true;
        this.invuln = 1;
        ZYRO.Bus.emit('shieldHit', o);
        ZYRO.Bus.emit('powerupEnd', 'shield');
      } else {
        this.die(o);
        return;
      }
    }
  }

  // Desvio perfeito: ação certa pouco antes do obstáculo chegar
  evaluateDodge(o) {
    if (this.shift.active) return;
    const C = ZYRO.CONFIG, p = this.player, a = p.lastAction;
    const since = this.time - a.time;
    let kind = null;
    if (ZYRO.Collision.blocksLane(o, p.lane)) {
      // está na faixa do obstáculo e não bateu → pulou ou deslizou
      const right = (o.type === 'L' && a.type === 'jump') || ((o.type === 'H' || o.type === 'A') && a.type === 'slide');
      if (right && since <= C.PERFECT_WINDOW + 0.1) kind = since <= C.NEAR_MISS_WINDOW ? 'near' : 'perfect';
    } else if (a.type === 'lane' && ZYRO.Collision.blocksLane(o, a.fromLane) && since <= C.PERFECT_WINDOW) {
      kind = since <= C.NEAR_MISS_WINDOW ? 'near' : 'perfect';
    }
    if (!kind) return;
    const r = this.score.dodge(kind);
    this.shift.gain(kind === 'near' ? C.SHIFT.gain.nearMiss : C.SHIFT.gain.perfect);
    ZYRO.Bus.emit('float', { text: '+' + r.pts, color: kind === 'near' ? '#00D9FF' : '#42EDAA', d: this.dist + 0.5, x: p.x, y: 2.4 });
    if (r.newMult) ZYRO.Bus.emit('msg', { text: `COMBO x${r.newMult}!`, kind: 'combo' });
    else ZYRO.Bus.emit('msg', { text: kind === 'near' ? 'AWESOME!' : 'PERFECT!', kind });
    ZYRO.Bus.emit('dodge', { kind, mult: this.score.comboMult });
  }

  collectCore(c) {
    const C = ZYRO.CONFIG;
    const bonus = this.score.core(c.super);
    this.shift.gain(c.super ? C.SHIFT.gain.superCore : C.SHIFT.gain.core);
    ZYRO.Bus.emit('core', c);
    if (c.super) ZYRO.Bus.emit('float', { text: '+' + C.SCORE.superCore * this.score.mult, color: '#00D9FF', d: c.d, x: c.x, y: c.y + 0.6 });
    if (bonus) {
      ZYRO.Bus.emit('msg', { text: 'AWESOME!', kind: 'near' });
      ZYRO.Bus.emit('float', { text: '+' + bonus, color: '#FFD447', d: this.dist + 1, x: this.player.x, y: 2.6 });
    }
  }

  activatePowerup(type) {
    const P = ZYRO.CONFIG.POWERUPS;
    const was = this.power[type] > 0;
    this.power[type] = P[type].dur;
    if (type === 'jetpack' && !was) this.startJetpack();
    ZYRO.Bus.emit('powerup', type);
    ZYRO.Bus.emit('msg', { text: ZYRO.POWERUP_TYPES[type].nome + '!', kind: 'power', color: ZYRO.POWERUP_TYPES[type].cor });
  }

  die(o) {
    this.state = 'dying';
    this.dieT = 0.85;
    this.hitObstacle = o;
    this.score.streak = 0;
    ZYRO.Bus.emit('hit', o);
  }

  finish() {
    const s = this.score;
    const run = {
      pontos: Math.floor(s.points), distancia: Math.floor(this.dist), cores: s.cores,
      combo: s.bestMult, zona: ZYRO.CONFIG.ZONES[this.zone].name, obstaculo: this.hitObstacle && this.hitObstacle.type
    };
    const saved = ZYRO.Storage.registerRun(run);
    this.result = { ...run, ...saved };
    this.state = 'over';
    ZYRO.Bus.emit('gameover', this.result);
  }

  cleanup() {
    const d = this.dist - 10;
    if (this.obstacles.length > 30 || (this.obstacles.length && this.obstacles[0].d + 3 < d)) this.obstacles = this.obstacles.filter(o => o.d + o.len > d);
    if (this.platforms.length && this.platforms[0].d1 < d) this.platforms = this.platforms.filter(pl => pl.d1 > d);
    if (this.coins.length > 120 || (this.coins.length && this.coins[0].d < d)) this.coins = this.coins.filter(c => c.d > d && !(c.taken && c.d < this.dist));
    if (this.powerups.length && this.powerups[0].d < d) this.powerups = this.powerups.filter(u => u.d > d);
  }
};
