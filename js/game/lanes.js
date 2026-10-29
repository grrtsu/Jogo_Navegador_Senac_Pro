/* =========================================================
   ZYRO — lanes.js  (As 3 faixas)
   Faixas: -1 (esquerda), 0 (centro), 1 (direita).
   Converter faixa ↔ posição x fica num lugar só, para que a
   lógica do jogo e o desenho sempre concordem.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Lanes = {
  LIST: [-1, 0, 1],

  // posição x (em metros) do centro de uma faixa: -2,4 · 0 · 2,4
  x(lane) { return lane * ZYRO.CONFIG.LANE_WIDTH; },

  // impede sair das 3 faixas (ex.: apertar ← já estando na esquerda)
  clamp(lane) { return ZYRO.Utils.clamp(lane, -1, 1); },

  // faixa mais próxima de uma posição x (usado no meio de uma troca de faixa)
  fromX(x) { return ZYRO.Lanes.clamp(Math.round(x / ZYRO.CONFIG.LANE_WIDTH)); }
};
