/*
 * Som de motor 4 cilindros sintetizado com Web Audio.
 * Frequência de explosões = rpm / 60 * 2 (quatro tempos, quatro cilindros).
 */
export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 2.5;
    this.filter.frequency.value = 600;

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 3.2); }
    shaper.curve = curve;
    shaper.connect(this.filter).connect(master);

    const mix = ctx.createGain();
    mix.gain.value = 0.5;
    mix.connect(shaper);

    this.o1 = ctx.createOscillator();
    this.o1.type = "sawtooth";
    this.o2 = ctx.createOscillator();
    this.o2.type = "square";
    this.o3 = ctx.createOscillator();
    this.o3.type = "triangle";
    const g1 = ctx.createGain(); g1.gain.value = 0.55;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    const g3 = ctx.createGain(); g3.gain.value = 0.35;
    this.o1.connect(g1).connect(mix);
    this.o2.connect(g2).connect(mix);
    this.o3.connect(g3).connect(mix);

    // irregularidade de combustão
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lfoGain = (this.lfoGain = ctx.createGain());
    lfoGain.gain.value = 4;
    lfo.connect(lfoGain);
    lfoGain.connect(this.o1.frequency);
    lfoGain.connect(this.o2.frequency);

    // ruído de admissão
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.Q.value = 0.8;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.02;
    noise.connect(this.noiseFilter).connect(this.noiseGain).connect(master);

    const t = ctx.currentTime;
    [this.o1, this.o2, this.o3, lfo, noise].forEach((n) => n.start(t));
    this.set(1500, 0, true);
    master.gain.setTargetAtTime(this.muted ? 0 : 0.28, t, 0.15);
  }
  set(rpm, throttle, cut = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = (rpm / 60) * 2;
    this.o1.frequency.setTargetAtTime(f, t, 0.02);
    this.o2.frequency.setTargetAtTime(f / 2, t, 0.02);
    this.o3.frequency.setTargetAtTime(f * 2, t, 0.02);
    this.lfoGain.gain.setTargetAtTime(rpm < 3000 ? 6 : 1.5, t, 0.1);
    this.filter.frequency.setTargetAtTime(350 + rpm * 0.22 + throttle * 1400, t, 0.03);
    this.noiseFilter.frequency.setTargetAtTime(500 + rpm * 0.3, t, 0.05);
    this.noiseGain.gain.setTargetAtTime(0.015 + throttle * 0.06, t, 0.05);
    const vol = this.muted ? 0 : cut ? 0.08 : 0.2 + throttle * 0.18;
    this.master.gain.setTargetAtTime(vol, t, cut ? 0.005 : 0.05);
  }
  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.25, this.ctx.currentTime, 0.05);
  }
  stop() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    this.ctx = null;
    setTimeout(() => ctx.close(), 800);
  }
}
