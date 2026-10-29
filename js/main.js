/* =========================================================
   ZYRO — main.js  (Liga tudo e roda o laço principal)

   É o último script carregado. Ele cria o jogo, liga os
   módulos uns aos outros e inicia o "game loop": a função
   que roda ~60 vezes por segundo atualizando e desenhando.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

// A função se chama sozinha logo que o arquivo carrega (IIFE). É async para poder esperar as fontes.
(async function startZyro() {
  const canvas = document.getElementById('jogo');

  // Tela de toque? Então mostra o botão SHIFT e as dicas de gesto (o CSS usa a classe "toque").
  const enableTouchMode = () => document.body.classList.add('toque');
  if (matchMedia('(pointer: coarse)').matches) enableTouchMode();
  window.addEventListener('touchstart', enableTouchMode, { once: true, passive: true });

  const game = new ZYRO.Game();
  ZYRO.game = game;          // deixa o jogo acessível no Console (F12): ZYRO.game.player, ZYRO.game.distance...

  // O canvas desenha texto com a fonte que estiver carregada NA HORA. Esperamos as fontes
  // (no máximo 1,5 s) para o texto não sair com a fonte padrão.
  try { await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]); } catch (error) { /* segue sem esperar */ }

  // Prepara as texturas uma vez só (desenhar texturas a cada quadro seria lento).
  ZYRO.Sprites.init();
  ZYRO.Vehicles.init();
  ZYRO.Renderer.init(canvas, game);
  ZYRO.Renderer.debug = /[?&]debug=1/.test(location.search) || location.hash === '#debug';
  ZYRO.HUD.init(game);
  ZYRO.Screens.init(game);   // aplica as configurações salvas (qualidade, volume…)
  ZYRO.Renderer.resize();
  window.addEventListener('resize', () => ZYRO.Renderer.resize());

  // ---------- Sons ligados aos eventos do jogo (ver ZYRO.Bus em utils.js) ----------
  // O game.js só avisa "pulou", "pegou core"... Quem decide o som é este bloco.
  const Audio = ZYRO.Audio, Bus = ZYRO.Bus;
  Bus.on('core', core => Audio.play(core.super ? 'superCore' : 'core'));
  Bus.on('jump', () => Audio.play('jump'));
  Bus.on('slide', () => Audio.play('slide'));
  Bus.on('lane', () => Audio.play('lane'));
  Bus.on('bump', () => Audio.play('bump'));
  Bus.on('dodge', dodge => Audio.play(dodge.kind === 'near' ? 'near' : 'perfect'));
  Bus.on('msg', message => { if (message.kind === 'combo') Audio.play('combo'); });
  Bus.on('shiftReady', () => Audio.play('shiftReady'));
  Bus.on('shiftDenied', () => Audio.play('shiftDenied'));
  Bus.on('shiftStart', () => { Audio.play('shift'); Audio.intensity = 1; });
  Bus.on('shiftEnd', () => { Audio.play('shiftEnd'); Audio.intensity = 0; });
  Bus.on('break', () => Audio.play('break'));
  Bus.on('hit', () => Audio.play('hit'));
  Bus.on('shieldHit', () => Audio.play('shield'));
  Bus.on('powerup', () => Audio.play('powerup'));
  Bus.on('record', () => Audio.play('record'));
  Bus.on('zone', () => Audio.play('zone'));
  Bus.on('jetpackStart', () => Audio.play('jetpack'));
  Bus.on('jetpackEnd', () => Audio.play('jetpackEnd'));
  Bus.on('ramp', () => Audio.play('ramp'));
  Bus.on('horn', () => Audio.play('horn'));
  Bus.on('tutorialStep', () => Audio.play('click'));
  Bus.on('tutorialDone', () => Audio.play('perfect'));
  Bus.on('zone', zoneIndex => ZYRO.Scenery.setZone(zoneIndex));

  // ---------- Controles → jogo ----------
  ZYRO.Input.init(document.getElementById('app'));
  ZYRO.Input.on(action => {
    Audio.unlock();
    if (action === 'pause' || action === 'confirm') return ZYRO.Screens.key(action);   // teclas de menu
    if (game.state === 'playing') game.action(action);                                // teclas de jogo
  });
  // Navegadores só deixam tocar som depois de uma interação do usuário: o primeiro toque/tecla libera o áudio.
  const unlockAudio = () => {
    Audio.unlock(); Audio.startMusic();
    window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio); window.addEventListener('keydown', unlockAudio);

  // ---------- Laço principal (game loop) ----------
  // requestAnimationFrame chama "frame" antes de cada atualização da tela (~60 vezes por segundo)
  // e pausa sozinho quando a aba fica escondida (economiza bateria).
  // dt ("delta time") = segundos desde o quadro anterior. Tudo no jogo é multiplicado por dt,
  // por isso o jogo roda na MESMA velocidade num monitor de 60 Hz ou de 144 Hz.
  let lastTime = performance.now(), fpsTime = 0, fpsFrames = 0;
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);   // no máximo 0,1 s: se a aba travou, não "pula" o mundo
    lastTime = now;
    if (!ZYRO.freeze) game.update(dt);     // a pausa é tratada dentro do jogo; freeze é usado só pelos testes
    ZYRO.Renderer.draw(dt);
    if (game.state !== 'menu') ZYRO.HUD.update();
    // FPS medido a cada meio segundo (aparece no modo #debug)
    fpsTime += dt; fpsFrames++;
    if (fpsTime > 0.5) { ZYRO.Renderer.fps = fpsFrames / fpsTime; fpsTime = 0; fpsFrames = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.getElementById('carregando').classList.add('saindo');

  // ---------- Modo de testes automáticos: index.html?testes=1 ----------
  // Os scripts de teste só são baixados quando pedidos, para não pesar o jogo normal.
  if (/[?&]testes=1/.test(location.search) || location.hash === '#testes') {
    for (const src of ['testes/bot.js', 'testes/testes.js']) {
      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = src; script.onload = resolve;
        document.body.appendChild(script);
      });
    }
  }
  setTimeout(() => document.getElementById('carregando').remove(), 500);
})();
