/* =========================================================
   ZYRO — storage.js  (Dados salvos no navegador)

   O projeto não tem back-end, então recordes, estatísticas e
   configurações ficam no localStorage: um "dicionário" do
   navegador que guarda TEXTO por chave e sobrevive a fechar
   a aba. Objetos viram texto com JSON.stringify e voltam com
   JSON.parse.

   Todo acesso fica dentro de try/catch: no modo anônimo de
   alguns navegadores, ou com o armazenamento cheio/bloqueado,
   o localStorage dá erro. Nesse caso o jogo segue funcionando,
   só não lembra de nada.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Storage = {
  // nomes das chaves no localStorage (aparecem em F12 → Application → Local Storage)
  KEYS: { stats: 'zyro_estatisticas', config: 'zyro_config', history: 'zyro_historico' },

  // valores iniciais de quem nunca jogou
  defaultStats: () => ({ melhorPontuacao: 0, maiorDistancia: 0, totalCores: 0, melhorCombo: 1, partidas: 0, tutorialFeito: false }),
  defaultConfig: () => ({
    volumeEfeitos: 0.7, volumeMusica: 0.45, musica: true,
    // respeita a preferência do sistema operacional de "reduzir movimento"
    reduzirAnimacoes: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    qualidade: 'alta'
  }),

  // Lê um objeto. O spread { ...fallback, ...salvo } garante que campos novos (criados depois
  // que o jogador já tinha dados salvos) recebam o valor padrão em vez de ficar undefined.
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch (error) { return fallback; }
  },
  readList(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (error) { return []; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; }
  },

  stats() { return this.read(this.KEYS.stats, this.defaultStats()); },
  history() { return this.readList(this.KEYS.history); },
  config() { return this.read(this.KEYS.config, this.defaultConfig()); },
  saveConfig(config) { return this.write(this.KEYS.config, config); },

  // tutorial: feito uma vez, não aparece mais (dá para refazer nas Configurações)
  tutorialDone() { return !!this.stats().tutorialFeito; },
  setTutorialDone(done) { const stats = this.stats(); stats.tutorialFeito = done; this.write(this.KEYS.stats, stats); },

  // Registra uma corrida terminada. Devolve se houve recorde (para a tela de Game Over).
  registerRun(run) {
    const stats = this.stats();
    const recordeAnterior = stats.melhorPontuacao;
    const novoRecorde = run.pontos > stats.melhorPontuacao;
    stats.melhorPontuacao = Math.max(stats.melhorPontuacao, Math.floor(run.pontos));
    stats.maiorDistancia = Math.max(stats.maiorDistancia, Math.floor(run.distancia));
    stats.totalCores += run.cores;
    stats.melhorCombo = Math.max(stats.melhorCombo, run.combo);
    stats.partidas += 1;
    this.write(this.KEYS.stats, stats);

    // histórico: a corrida nova entra no começo e guardamos só as 6 últimas
    const history = this.history();
    history.unshift({ data: Date.now(), pontos: Math.floor(run.pontos), distancia: Math.floor(run.distancia), zona: run.zona });
    this.write(this.KEYS.history, history.slice(0, 6));
    return { novoRecorde: novoRecorde && run.pontos > 0, recordeAnterior, stats };
  },

  // "Apagar dados" nas Configurações (as configurações em si ficam)
  resetData() {
    try {
      localStorage.removeItem(this.KEYS.stats);
      localStorage.removeItem(this.KEYS.history);
    } catch (error) { /* sem armazenamento: nada a apagar */ }
  }
};
