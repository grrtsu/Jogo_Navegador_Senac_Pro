/* =========================================================
   ZYRO — bot.js  (Jogador automático usado nos testes)
   Olha as próximas fileiras de obstáculos e escolhe uma
   faixa livre, pula, desliza ou sobe nas rampas. Serve para
   provar que o gerador sempre deixa uma rota possível.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Bot = {
  think(g) {
    const p = g.player, sp = g.speed;
    if (p.flying) return null;
    const rows = new Map();
    const add = (k, o) => { if (!rows.has(k)) rows.set(k, []); if (o) rows.get(k).push(o); };
    for (const o of g.obstacles) {
      if (o.broken) continue;
      const k = o.dm ?? o.d, z = k - g.dist;
      if (z + o.len * (o.v ? 0.5 : 1) < -0.4 || z > sp * 1.6 + 8) continue;
      add(k, o);
    }
    for (const pl of g.platforms) {            // a frente de cada carro estacionado conta como fileira
      const z = pl.d0 - g.dist;
      if (z > -0.4 && z < sp * 1.6 + 8) add(pl.d0, null);
    }
    const ds = [...rows.keys()].sort((a, b) => a - b);
    if (!ds.length) return null;
    const onRoof = l => p.lane === l && !p.jumping && p.y > 1.4;
    const cellOf = (key, l) => {
      for (const pl of g.platforms) {
        if (pl.lane !== l || key < pl.d0 - 0.01 || key > pl.d1 + 0.5) continue;
        if (onRoof(l)) return '.';
        if (Math.abs(key - pl.d0) < 0.01) return pl.ramp ? '.' : 'X';
        return p.lane === l && g.dist >= pl.d0 ? '.' : 'X';   // já está subindo a rampa
      }
      for (const o of rows.get(key)) {
        if (o.type === 'G') { if (l !== o.open) return 'X'; }
        else if (o.lane === l) return 'RBT'.includes(o.type) ? 'X' : o.type === 'A' ? 'H' : o.type;
      }
      return '.';
    };
    const k0 = ds[0], z0 = k0 - g.dist, k1 = ds[1];
    const score = l => {
      const c = cellOf(k0, l); if (c === 'X') return -99;
      let s = -Math.abs(l - p.lane) * 0.6; if (c === '.') s += 0.5;
      if (k1 !== undefined && cellOf(k1, l) === 'X') s -= 0.8;
      return s;
    };
    let best = p.lane, bs = score(p.lane);
    for (const l of [-1, 0, 1]) { const s = score(l); if (s > bs + 0.01) { bs = s; best = l; } }
    const cur = cellOf(k0, p.lane);
    if (best !== p.lane && p.laneT >= 1) {
      // não atravessa uma faixa bloqueada quando o obstáculo já está perto
      const step = p.lane + Math.sign(best - p.lane);
      const sideBlocked = g.platforms.some(pl => pl.lane === step && g.dist + 3 > pl.d0 && g.dist < pl.d1 && p.y < pl.h - 0.4);
      if (!sideBlocked && !(cellOf(k0, step) === 'X' && z0 < sp * 0.5 && cur !== 'X')) return best < p.lane ? 'left' : 'right';
    }
    if (cur === 'L' && z0 > 0 && z0 < sp * 0.3 + 0.6 && !p.jumping) return 'up';
    if (cur === 'H' && z0 > 0 && z0 < sp * 0.32 + 0.6 && !p.sliding) return 'down';
    return null;
  }
};
