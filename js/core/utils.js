/* =========================================================
   ZYRO — utils.js  (Ferramentas usadas por todo o jogo)
   Matemática, sorteios, cores e o barramento de eventos.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Utils = {
  // limita um valor entre min e max
  clamp: (value, min, max) => (value < min ? min : value > max ? max : value),

  // interpolação linear: t = 0 devolve a, t = 1 devolve b, t = 0,5 devolve o meio
  lerp: (a, b, t) => a + (b - a) * t,

  // curvas de suavização ("easing"): transformam um progresso 0→1 linear em um movimento mais natural
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),                                  // começa rápido e freia
  easeInOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),   // acelera e freia

  // sorteios
  rand: (min, max) => min + Math.random() * (max - min),                     // número quebrado entre min e max
  randInt: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),  // inteiro entre min e max (inclusive)
  pick: list => list[Math.floor(Math.random() * list.length)],               // um item qualquer da lista

  // embaralha uma lista no lugar (algoritmo de Fisher–Yates: todas as ordens têm a mesma chance)
  shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  },

  // Sorteio com peso: em [{w: 3}, {w: 1}] o primeiro sai 3 vezes mais que o segundo.
  // Funciona como uma roleta: soma os pesos, sorteia um ponto e vê em qual "fatia" caiu.
  weighted(list) {
    let total = 0;
    for (const item of list) total += item.w;
    let point = Math.random() * total;
    for (const item of list) { point -= item.w; if (point <= 0) return item; }
    return list[list.length - 1];
  },

  // Número "aleatório" FIXO para um índice: hash(5) dá sempre o mesmo valor.
  // Serve para a decoração (prédios, janelas acesas) ser igual toda vez que passa pelo mesmo lugar,
  // sem precisar guardar cada prédio na memória.
  hash(n, seed = 0) {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  },

  // cores: '#FF4FBF' → [255, 79, 191]
  hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  },
  // cor com transparência para o Canvas: rgba('#FF4FBF', 0.5)
  rgba(hex, alpha) {
    const [r, g, b] = ZYRO.Utils.hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  },
  // mistura duas cores (t = 0 → a, t = 1 → b); usado na transição entre zonas
  mixHex(a, b, t) {
    const colorA = ZYRO.Utils.hexToRgb(a), colorB = ZYRO.Utils.hexToRgb(b);
    const mixed = colorA.map((value, i) => Math.round(value + (colorB[i] - value) * t));
    return '#' + mixed.map(value => value.toString(16).padStart(2, '0')).join('');
  },

  // formatação de números para a tela
  fmt: n => Math.floor(n).toLocaleString('pt-BR'),                                               // 12345 → "12.345"
  fmtScore: n => Math.floor(n).toString().padStart(6, '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')  // 1234 → "001.234"
};

/* ---------------------------------------------------------
   Barramento de eventos (padrão "publicar/assinar")

   O jogo AVISA que algo aconteceu: ZYRO.Bus.emit('core', item)
   Quem se interessa ESCUTA:          ZYRO.Bus.on('core', fn)

   Por quê? Assim o game.js não precisa conhecer o som, o HUD
   nem os efeitos. Ele só avisa "peguei um core", e o áudio
   toca o som, o HUD anima o contador, os efeitos soltam
   brilho. Dá para tirar o som inteiro sem mexer na lógica.
   --------------------------------------------------------- */
ZYRO.Bus = {
  handlers: {},                       // { nomeDoEvento: [função, função, ...] }
  on(eventName, handler) { (this.handlers[eventName] ||= []).push(handler); },
  emit(eventName, data) { (this.handlers[eventName] || []).forEach(handler => handler(data)); },
  clear() { this.handlers = {}; }
};
