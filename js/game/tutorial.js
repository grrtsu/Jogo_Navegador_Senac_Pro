/* =========================================================
   ZYRO — tutorial.js  (Tutorial jogável nos primeiros 250 m)

   Na PRIMEIRA corrida, em vez de obstáculos sorteados, o
   começo da pista é montado à mão, um movimento por vez:
     1. trocar de faixa   2. pular   3. deslizar
     4. pegar cores       5. usar o ZYRO SHIFT

   Como funciona cada passo:
   - quando o passo começa, o obstáculo é colocado ~45 m à
     frente, NA FAIXA EM QUE O JOGADOR ESTÁ;
   - ~1 s antes de chegar, aparece a dica e o tempo entra em
     câmera lenta; bem perto, o tempo PARA;
   - enquanto espera, só a ação certa é aceita (as outras
     teclas são ignoradas, para ninguém perder no tutorial);
   - fez a ação certa: o tempo volta ao normal e o Zyro passa.

   O game.js multiplica o dt pelo valor que update() devolve:
   1 = tempo normal, 0,3 = câmera lenta, 0 = parado.
   Ao terminar, o tutorial fica marcado no localStorage e não
   aparece de novo (dá para refazer nas Configurações).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Tutorial = class {
  constructor(game) {
    this.game = game;
    this.stepIndex = 0;
    this.timeScale = 1;          // velocidade do tempo agora (vai suavemente até o alvo)
    this.hint = null;            // dica visível (o HUD lê daqui) ou null
    this.finished = false;

    // at = distância (m) do obstáculo · wants = ação esperada (null = só uma dica rápida)
    // build = o que colocar na pista · alreadyDone = o jogador já resolveu sozinho antes da dica?
    // Na dica, o HUD mostra "keys" no computador e "gesture" no celular.
    this.steps = [
      {
        at: 45, wants: 'lane',
        hint: { title: 'TROQUE DE FAIXA', keys: ['←', '→'], gesture: 'Deslize o dedo para o lado' },
        build: lane => [this.obstacle('R', lane)],
        alreadyDone: step => this.game.player.lane !== step.items[0].lane     // já saiu da faixa da barreira
      },
      {
        at: 95, wants: 'up',
        hint: { title: 'PULE A BARREIRA', keys: ['↑'], gesture: 'Deslize o dedo para cima' },
        build: () => [-1, 0, 1].map(lane => this.obstacle('L', lane))
      },
      {
        at: 145, wants: 'down',
        hint: { title: 'DESLIZE POR BAIXO', keys: ['↓'], gesture: 'Deslize o dedo para baixo' },
        build: () => [-1, 0, 1].map(lane => this.obstacle('H', lane))
      },
      {
        // sem espera: uma trilha de cores e uma dica rápida
        at: 200, wants: null, showAt: 168, showFor: 2.6,
        hint: { title: 'PEGUE OS ZYRO CORES', text: 'Eles enchem a barra do SHIFT' },
        build: lane => this.coreTrail(lane, 175, 199)
      },
      {
        at: 240, wants: 'shift',
        hint: { title: 'BARRA CHEIA! ATIVE O SHIFT', keys: ['⇧ SHIFT'], gesture: 'Toque no botão SHIFT', text: 'Por 5 segundos você atravessa tudo' },
        // um muro nas 3 faixas: o único jeito de passar é com o SHIFT (a barra é enchida aqui)
        build: () => { this.game.shift.gain(100); return [-1, 0, 1].map(lane => this.obstacle('B', lane)); },
        alreadyDone: () => this.game.shift.active                             // apertou SHIFT antes da dica
      }
    ];
    // o gerador normal começa depois do último passo
    this.endDistance = this.steps[this.steps.length - 1].at + 30;
  }

  get currentStep() { return this.steps[this.stepIndex]; }

  obstacle(type, lane) {
    return { type, lane, d: this.currentStep.at, len: ZYRO.OBSTACLE_TYPES[type].len };
  }

  coreTrail(lane, from, to) {
    const cores = [];
    for (let d = from; d <= to; d += 3) cores.push({ x: ZYRO.Lanes.x(lane), y: 0.75, d, lane, super: false, isCore: true });
    return cores;
  }

  // A ação feita é a que o passo pede? ('lane' aceita esquerda ou direita)
  matches(action) {
    const wants = this.currentStep.wants;
    return wants === 'lane' ? (action === 'left' || action === 'right') : action === wants;
  }

  // Está esperando uma ação? (dica na tela e o jogador ainda não fez a ação certa)
  get waiting() { const step = this.currentStep; return !!(step && step.wants && step.hintShown && !step.done); }

  // O game.js pergunta antes de executar um comando: enquanto espera, só a ação certa passa.
  allows(action) { return !this.waiting || this.matches(action); }

  // O game.js avisa depois que um comando foi executado.
  onAction(action) {
    if (!this.waiting || !this.matches(action)) return;
    this.currentStep.done = true;
    this.hint = null;
    ZYRO.Bus.emit('tutorialStep', this.stepIndex);
  }

  // Chamado a cada quadro com o dt REAL. Devolve o multiplicador do tempo.
  update(realDt) {
    const game = this.game, player = game.player, step = this.currentStep;
    if (!step) return this.finish();

    // 1) monta o passo assim que ele começa (no máximo 70 m antes), na faixa em que o jogador está
    if (!step.items && game.distance >= step.at - 70) {
      step.items = step.build(player.lane);
      for (const item of step.items) (item.isCore ? game.coins : game.obstacles).push(item);
    }

    // 2) dica: ~1,1 s antes do obstáculo (ou ao chegar na trilha de cores)
    const metersAhead = step.at - game.distance;
    const timeForHint = step.wants ? metersAhead <= game.speed * 1.1 : game.distance >= step.showAt;
    if (step.items && !step.hintShown && timeForHint) {
      step.hintShown = true;
      step.shownAt = game.time;
      if (step.wants && step.alreadyDone && step.alreadyDone(step)) {
        step.done = true;                        // resolveu sozinho: não precisa parar o tempo
      } else {
        this.hint = step.hint;
        ZYRO.Bus.emit('tutorialHint', step.hint);
      }
    }
    // a dica sem espera some sozinha
    if (!step.wants && step.hintShown && !step.done && game.time - step.shownAt > step.showFor) { step.done = true; this.hint = null; }

    // 3) velocidade do tempo
    let target = 1;
    if (this.waiting) {
      // Bem perto, o tempo para. Se o jogador estiver no ar (pulou antes da hora), deixa cair
      // em câmera lenta primeiro: parado no ar ele não conseguiria fazer nada.
      target = metersAhead <= 5.5 && player.onGround ? 0 : 0.3;
    }
    // muda aos poucos (de 1 para 0 de uma vez seria um tranco); perto de 0, para de vez
    this.timeScale = ZYRO.Utils.lerp(this.timeScale, target, 1 - Math.pow(0.0005, realDt));
    if (target === 0 && this.timeScale < 0.05) this.timeScale = 0;

    // 4) passou do obstáculo: próximo passo
    if (step.done && game.distance > step.at + 4) this.stepIndex++;
    return this.timeScale;
  }

  finish() {
    if (!this.finished) {
      this.finished = true;
      this.hint = null;
      ZYRO.Storage.setTutorialDone(true);
      ZYRO.Bus.emit('msg', { text: 'AGORA É COM VOCÊ!', kind: 'go' });
      ZYRO.Bus.emit('tutorialDone');
    }
    return 1;
  }
};
