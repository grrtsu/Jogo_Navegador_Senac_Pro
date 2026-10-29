/* =========================================================
   ZYRO — collision.js  (Colisões)
   Caixas alinhadas: faixa (x) + profundidade (z) + altura (y).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Collision = {
  overlap: (a0, a1, b0, b1) => a0 < b1 && b0 < a1,

  // caixas sólidas de um obstáculo (x e y no mundo)
  boxes(o) {
    const T = ZYRO.OBSTACLE_TYPES[o.type], LW = ZYRO.CONFIG.LANE_W;
    if (o.type === 'G') {
      return [-1, 0, 1].filter(l => l !== o.open)
        .map(l => ({ x0: l * LW - T.halfW, x1: l * LW + T.halfW, y0: T.y0, y1: T.y1 }));
    }
    return [{ x0: o.lane * LW - T.halfW, x1: o.lane * LW + T.halfW, y0: T.y0, y1: T.y1 }];
  },

  // o obstáculo bloqueia esta faixa (para quem está em pé)?
  blocksLane(o, lane) {
    return o.type === 'G' ? lane !== o.open : lane === o.lane;
  },

  // colisão real entre jogador e obstáculo
  hits(player, o, dist) {
    const O = ZYRO.Collision.overlap;
    const z0 = o.d - dist, z1 = z0 + o.len;
    const pb = player.box();
    if (!O(pb.z0, pb.z1, z0, z1)) return false;
    for (const b of ZYRO.Collision.boxes(o)) {
      if (O(pb.x0, pb.x1, b.x0, b.x1) && O(pb.y0, pb.y1, b.y0, b.y1)) return true;
    }
    return false;
  },

  // coleta de itens (um pouco mais generosa que a colisão)
  touches(player, item, dist, r = 0.45) {
    const O = ZYRO.Collision.overlap;
    const z = item.d - dist;
    if (z > 1.1 || z < -1.1) return false;
    const pb = player.box();
    return O(pb.x0 - 0.15, pb.x1 + 0.15, item.x - r, item.x + r) &&
           O(pb.y0 - 0.1, pb.y1 + 0.2, item.y - r, item.y + r);
  }
};
