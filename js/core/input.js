/* =========================================================
   ZYRO — input.js  (Teclado e gestos de toque)

   Transforma "o que o jogador apertou" em AÇÕES com nome:
   'left', 'right', 'up', 'down', 'shift', 'pause', 'confirm'.
   O resto do jogo só conhece as ações, nunca as teclas.
   Vantagem: teclado e celular viram a mesma coisa, e trocar
   uma tecla é mudar uma linha da tabela KEYS.

   Teclado: ← → / A D, ↑ / W, ↓ / S, Shift, Esc / P, Enter.
   Celular: deslizar o dedo (reage DURANTE o movimento, sem
   esperar soltar, para ser rápido) + botão SHIFT na tela.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Input = {
  listeners: [],
  on(listener) { this.listeners.push(listener); },
  emit(action) { for (const listener of this.listeners) listener(action); },

  // e.code identifica a tecla FÍSICA (KeyA é sempre a mesma tecla, em qualquer layout de teclado)
  KEYS: {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'shift', ShiftRight: 'shift', Escape: 'pause', KeyP: 'pause', Enter: 'confirm'
  },

  init(swipeArea) {
    // ---------- teclado ----------
    window.addEventListener('keydown', event => {
      const action = this.KEYS[event.code];
      if (!action) return;
      const inGame = document.body.classList.contains('em-jogo');
      // Fora do jogo, Enter e Shift num botão focado são do botão (acessibilidade): não roubamos.
      const focusedTag = (document.activeElement && document.activeElement.tagName) || '';
      if ((action === 'confirm' || action === 'shift') && ['BUTTON', 'INPUT', 'SELECT'].includes(focusedTag) && !inGame) return;
      // Segurar a tecla gera repetições automáticas: ignoramos, senão segurar → trocaria 10 faixas.
      if (event.repeat && action !== 'pause') { event.preventDefault(); return; }
      // No jogo, as setas não podem rolar a página.
      if (inGame || action === 'pause') event.preventDefault();
      this.emit(action);
    });

    // ---------- gestos (Pointer Events: o mesmo código serve para dedo, caneta e mouse) ----------
    const MIN_DISTANCE = 26;     // px que o dedo precisa andar para contar como gesto (evita toques acidentais)
    let startX = 0, startY = 0, activePointer = null, alreadyUsed = false;

    swipeArea.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;   // só botão esquerdo
      activePointer = event.pointerId; startX = event.clientX; startY = event.clientY; alreadyUsed = false;
    });
    swipeArea.addEventListener('pointermove', event => {
      if (event.pointerId !== activePointer || alreadyUsed) return;      // um gesto = uma ação
      const dx = event.clientX - startX, dy = event.clientY - startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN_DISTANCE) return;
      alreadyUsed = true;
      // o eixo que andou mais decide: horizontal = trocar de faixa, vertical = pular/deslizar
      if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
      else this.emit(dy > 0 ? 'down' : 'up');
    });
    const release = event => { if (event.pointerId === activePointer) activePointer = null; };
    swipeArea.addEventListener('pointerup', release);
    swipeArea.addEventListener('pointercancel', release);
  }
};
