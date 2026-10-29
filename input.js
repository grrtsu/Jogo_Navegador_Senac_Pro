/* =========================================================
   ZYRO — input.js  (Teclado e gestos de toque)
   Teclado: ← → / A D, ↑ / W, ↓ / S, Shift (ZYRO SHIFT), Esc / P.
   Celular: deslizar o dedo (reage durante o movimento, sem
   esperar soltar) + botão SHIFT na tela.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Input = {
  handlers: [],
  on(fn) { this.handlers.push(fn); },
  emit(action) { for (const fn of this.handlers) fn(action); },

  KEYS: {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'shift', ShiftRight: 'shift', Escape: 'pause', KeyP: 'pause', Enter: 'confirm'
  },

  init(swipeArea) {
    window.addEventListener('keydown', e => {
      const a = this.KEYS[e.code];
      if (!a) return;
      // não rouba as teclas quando o foco está num controle da interface
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if ((a === 'confirm' || a === 'shift') && ['BUTTON', 'INPUT', 'SELECT'].includes(tag) && !document.body.classList.contains('em-jogo')) return;
      if (e.repeat && a !== 'pause') { e.preventDefault(); return; }
      if (document.body.classList.contains('em-jogo') || a === 'pause') e.preventDefault();
      this.emit(a);
    });

    // gestos
    let sx = 0, sy = 0, id = null, used = false;
    const TH = 26;
    swipeArea.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; used = false;
    });
    swipeArea.addEventListener('pointermove', e => {
      if (e.pointerId !== id || used) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
      used = true;
      if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
      else this.emit(dy > 0 ? 'down' : 'up');
    });
    const end = e => { if (e.pointerId === id) id = null; };
    swipeArea.addEventListener('pointerup', end);
    swipeArea.addEventListener('pointercancel', end);
  }
};
