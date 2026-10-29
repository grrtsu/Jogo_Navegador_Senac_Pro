/* =========================================================
   ZYRO — storage.js  (Persistência local com localStorage)
   Nada sai do navegador: sem servidor, sem login.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Storage = {
  KEYS: { stats: 'zyro_estatisticas', config: 'zyro_config', hist: 'zyro_historico' },

  defaultStats: () => ({ melhorPontuacao: 0, maiorDistancia: 0, totalCores: 0, melhorCombo: 1, partidas: 0 }),
  defaultConfig: () => ({
    volumeEfeitos: 0.7, volumeMusica: 0.45, musica: true,
    reduzirAnimacoes: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    qualidade: 'alta'
  }),

  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch (e) { return fallback; }   // modo privado / armazenamento bloqueado
  },
  readList(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  },

  stats() { return this.read(this.KEYS.stats, this.defaultStats()); },
  history() { return this.readList(this.KEYS.hist); },
  config() { return this.read(this.KEYS.config, this.defaultConfig()); },
  saveConfig(cfg) { return this.write(this.KEYS.config, cfg); },

  // registra uma corrida terminada e devolve se houve recorde
  registerRun(run) {
    const s = this.stats();
    const recordeAnterior = s.melhorPontuacao;
    const novoRecorde = run.pontos > s.melhorPontuacao;
    s.melhorPontuacao = Math.max(s.melhorPontuacao, Math.floor(run.pontos));
    s.maiorDistancia = Math.max(s.maiorDistancia, Math.floor(run.distancia));
    s.totalCores += run.cores;
    s.melhorCombo = Math.max(s.melhorCombo, run.combo);
    s.partidas += 1;
    this.write(this.KEYS.stats, s);

    const h = this.history();
    h.unshift({ data: Date.now(), pontos: Math.floor(run.pontos), distancia: Math.floor(run.distancia), zona: run.zona });
    this.write(this.KEYS.hist, h.slice(0, 6));
    return { novoRecorde: novoRecorde && run.pontos > 0, recordeAnterior, stats: s };
  },

  resetData() {
    try {
      localStorage.removeItem(this.KEYS.stats);
      localStorage.removeItem(this.KEYS.hist);
    } catch (e) { /* ignora */ }
  }
};
