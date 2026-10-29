/* =========================================================
   ZYRO — lanes.js  (Gerenciamento das faixas)
   3 faixas fixas: -1 (esquerda), 0 (centro), 1 (direita).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Lanes = {
  LIST: [-1, 0, 1],
  // posição x (em metros) do centro de uma faixa
  x(lane) { return lane * ZYRO.CONFIG.LANE_W; },
  // impede sair das 3 faixas
  clamp(lane) { return ZYRO.U.clamp(lane, -1, 1); },
  // faixa mais próxima de uma posição x
  fromX(x) { return ZYRO.Lanes.clamp(Math.round(x / ZYRO.CONFIG.LANE_W)); }
};
