/* =========================================================
   ZYRO — main.js  (Inicialização e laço principal)
   ========================================================= */
window.ZYRO = window.ZYRO || {};

(async function iniciar() {
  const canvas = document.getElementById('jogo');
  // tela de toque: mostra o botão SHIFT e usa gestos
  const toque = () => document.body.classList.add('toque');
  if (matchMedia('(pointer: coarse)').matches) toque();
  window.addEventListener('touchstart', toque, { once: true, passive: true });
  const game = new ZYRO.Game();
  ZYRO.game = game;                       // acesso pelo console (útil nos testes)

  // espera as fontes para o texto do canvas sair certo
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* segue */ }

  ZYRO.Sprites.init();
  ZYRO.Vehicles.init();
  ZYRO.Renderer.init(canvas, game);
  ZYRO.Renderer.debug = /[?&]debug=1/.test(location.search) || location.hash === '#debug';
  ZYRO.HUD.init(game);
  ZYRO.Screens.init(game);                // aplica configurações salvas (qualidade, volume…)
  ZYRO.Renderer.resize();
  window.addEventListener('resize', () => ZYRO.Renderer.resize());

  // sons ligados aos eventos do jogo
  const A = ZYRO.Audio, B = ZYRO.Bus;
  B.on('core', c => A.play(c.super ? 'superCore' : 'core'));
  B.on('jump', () => A.play('jump'));
  B.on('slide', () => A.play('slide'));
  B.on('lane', () => A.play('lane'));
  B.on('bump', () => A.play('bump'));
  B.on('dodge', d => A.play(d.kind === 'near' ? 'near' : 'perfect'));
  B.on('msg', m => { if (m.kind === 'combo') A.play('combo'); });
  B.on('shiftReady', () => A.play('shiftReady'));
  B.on('shiftDenied', () => A.play('shiftDenied'));
  B.on('shiftStart', () => { A.play('shift'); A.intensity = 1; });
  B.on('shiftEnd', () => { A.play('shiftEnd'); A.intensity = 0; });
  B.on('break', () => A.play('break'));
  B.on('hit', () => A.play('hit'));
  B.on('shieldHit', () => A.play('shield'));
  B.on('powerup', () => A.play('powerup'));
  B.on('record', () => A.play('record'));
  B.on('zone', () => A.play('zone'));
  B.on('jetpackStart', () => A.play('jetpack'));
  B.on('jetpackEnd', () => A.play('jetpackEnd'));
  B.on('ramp', () => A.play('ramp'));
  B.on('horn', () => A.play('horn'));
  B.on('zone', z => ZYRO.Scenery.setZone(z));

  // controles → jogo
  ZYRO.Input.init(document.getElementById('app'));
  ZYRO.Input.on(a => {
    A.unlock();
    if (a === 'pause' || a === 'confirm') return ZYRO.Screens.key(a);
    if (game.state === 'playing') game.action(a);
  });
  // primeiro toque em qualquer lugar libera o áudio e começa a música
  const liberar = () => { A.unlock(); A.startMusic(); window.removeEventListener('pointerdown', liberar); window.removeEventListener('keydown', liberar); };
  window.addEventListener('pointerdown', liberar); window.addEventListener('keydown', liberar);

  // laço principal: atualiza (se não estiver pausado) e desenha
  let last = performance.now(), acc = 0, frames = 0;
  function quadro(agora) {
    const dt = Math.min((agora - last) / 1000, 0.1);
    last = agora;
    if (!ZYRO.freeze) game.update(dt);     // a pausa é tratada dentro do jogo (freeze = usado pelos testes)
    ZYRO.Renderer.draw(dt);
    if (game.state !== 'menu') ZYRO.HUD.update();
    acc += dt; frames++;
    if (acc > 0.5) { ZYRO.Renderer.fps = frames / acc; acc = 0; frames = 0; }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  document.getElementById('carregando').classList.add('saindo');

  // modo de testes automáticos: index.html?testes=1
  if (/[?&]testes=1/.test(location.search) || location.hash === '#testes') {
    for (const src of ['testes/bot.js', 'testes/testes.js']) {
      await new Promise(r => { const s = document.createElement('script'); s.src = src; s.onload = r; document.body.appendChild(s); });
    }
  }
  setTimeout(() => document.getElementById('carregando').remove(), 500);
})();
