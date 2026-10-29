/* =========================================================
   ZYRO — audio.js  (Efeitos sonoros e música)
   Tudo sintetizado com Web Audio API: nenhum arquivo de
   som externo, nenhum custo. O áudio só liga depois do
   primeiro toque/clique (regra dos navegadores).
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Audio = {
  ctx: null, sfx: null, music: null, master: null,
  sfxVol: 0.7, musicVol: 0.45, musicOn: true,
  playing: false, step: 0, nextT: 0, timer: null, intensity: 0,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.music = this.ctx.createGain(); this.music.connect(this.master);
    this.musicFilter = this.ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 9000;
    this.musicFilter.connect(this.music);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
    if (this.wantMusic) this.startMusic();
  },

  apply() {
    if (!this.ctx) return;
    this.sfx.gain.value = this.sfxVol * 0.9;
    this.music.gain.setTargetAtTime(this.musicOn ? this.musicVol * 0.5 : 0, this.ctx.currentTime, 0.1);
  },
  setVolumes(sfx, music, on) { this.sfxVol = sfx; this.musicVol = music; this.musicOn = on; this.apply(); },
  muffle(on) { if (this.ctx) this.musicFilter.frequency.setTargetAtTime(on ? 700 : 9000, this.ctx.currentTime, 0.08); },

  tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2, type = 'highpass', freq = 1000, when = 0, slideTo = null, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t); s.stop(t + dur);
  },

  play(name, arg) {
    if (!this.ctx || this.sfxVol <= 0) return;
    switch (name) {
      case 'core': this.tone(1046, 0.08, 'triangle', 0.18); this.tone(1568, 0.12, 'triangle', 0.16, null, 0.05); break;
      case 'superCore': [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.16, null, i * 0.05)); break;
      case 'jump': this.tone(320, 0.18, 'sine', 0.22, 760); break;
      case 'slide': this.noise(0.28, 0.16, 'lowpass', 2400, 0, 300); break;
      case 'lane': this.noise(0.07, 0.07, 'highpass', 3000); break;
      case 'bump': this.tone(140, 0.08, 'square', 0.08); break;
      case 'perfect': this.tone(880, 0.09, 'triangle', 0.18); this.tone(1320, 0.14, 'triangle', 0.18, null, 0.07); break;
      case 'near': [988, 1318, 1760].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.17, null, i * 0.05)); break;
      case 'combo': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, null, i * 0.045)); break;
      case 'shiftReady': [659, 880, 1174, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.17, null, i * 0.07)); break;
      case 'shiftDenied': this.tone(220, 0.12, 'square', 0.07, 180); break;
      case 'shift': this.tone(180, 0.55, 'sawtooth', 0.14, 1400); this.noise(0.6, 0.18, 'bandpass', 600, 0, 6000); this.tone(90, 0.5, 'sine', 0.3, 45); break;
      case 'shiftEnd': this.tone(900, 0.3, 'sine', 0.12, 300); break;
      case 'break': this.noise(0.25, 0.3, 'bandpass', 1800, 0, 400); this.tone(200, 0.15, 'square', 0.1, 80); break;
      case 'hit': this.tone(160, 0.45, 'square', 0.22, 45); this.noise(0.4, 0.35, 'lowpass', 1600, 0, 120); break;
      case 'shield': this.tone(1400, 0.3, 'sine', 0.2, 700); this.noise(0.2, 0.15, 'highpass', 4000); break;
      case 'powerup': [784, 988, 1174, 1568].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.2, null, i * 0.06)); break;
      case 'record': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, null, i * 0.11)); break;
      case 'jetpack': this.noise(1.0, 0.25, 'bandpass', 300, 0, 2400); this.tone(140, 0.9, 'sawtooth', 0.12, 520); break;
      case 'jetpackEnd': this.noise(0.5, 0.18, 'lowpass', 1800, 0, 200); this.tone(500, 0.4, 'sine', 0.12, 160); break;
      case 'ramp': this.tone(260, 0.22, 'triangle', 0.18, 620); break;
      case 'horn': this.tone(392, 0.32, 'square', 0.1); this.tone(330, 0.32, 'square', 0.08); break;
      case 'click': this.tone(660, 0.05, 'triangle', 0.12); break;
      case 'zone': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.06, null, i * 0.09)); break;
    }
  },

  // ---- música: sequenciador simples (baixo + arpejo + bateria) ----
  CHORDS: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   // Lá m, Fá, Dó, Sol
  midi: n => 440 * Math.pow(2, (n - 69) / 12),

  startMusic() {
    this.wantMusic = true;
    if (!this.ctx || this.playing) return;
    this.playing = true; this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  },
  stopMusic() { this.wantMusic = false; this.playing = false; clearInterval(this.timer); },

  schedule() {
    const c = this.ctx, spb = 60 / 120 / 4;                 // semicolcheias a 120 bpm
    while (this.nextT < c.currentTime + 0.12) {
      const s = this.step % 64, chord = this.CHORDS[Math.floor(s / 16)], when = this.nextT - c.currentTime;
      const dst = this.musicFilter;
      if (s % 4 === 0) this.tone(55 + (s % 8 === 0 ? 0 : 0), 0.18, 'sine', 0.5, 40, when, dst);                       // bumbo
      if (s % 8 === 4) this.noise(0.12, 0.18, 'highpass', 1500, when, null, dst);                                      // caixa
      if (s % 2 === 1) this.noise(0.03, 0.06, 'highpass', 7000, when, null, dst);                                      // chimbal
      if (s % 2 === 0) this.tone(this.midi(chord[0] - 24 + (s % 4 === 2 ? 12 : 0)), 0.16, 'sawtooth', 0.09, null, when, dst); // baixo
      const arp = [0, 1, 2, 1, 2, 0, 1, 2][s % 8];
      if (this.intensity > 0 || s % 2 === 0) this.tone(this.midi(chord[arp] + 12), 0.12, 'square', 0.035, null, when, dst);
      this.nextT += spb; this.step++;
    }
  }
};
