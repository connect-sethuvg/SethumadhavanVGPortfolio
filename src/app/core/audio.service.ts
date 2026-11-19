import { Injectable, signal } from '@angular/core';
import { readStore, writeStore } from './storage';

const KEY = 'portfolio.muted.v1';

/**
 * All sounds are synthesised with the Web Audio API, so there are no audio files
 * to download or license. The context is created on the first user gesture.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly muted = signal<boolean>(readStore(KEY, false));

  private ctx?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private ambient?: { stop(): void };

  /** Must be called from a user gesture (click/tap/key). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted() ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.ambient) this.ambient = this.startAmbient();
  }

  toggleMute(): void {
    this.muted.update((m) => !m);
    writeStore(KEY, this.muted());
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.muted() ? 0 : 0.6, this.ctx.currentTime, 0.05);
    }
  }

  footstep(): void {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise || this.muted()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380 + Math.random() * 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    src.connect(filter).connect(g).connect(master);
    src.start(t, Math.random() * 0.5, 0.15);
  }

  hover(): void {
    this.tone(880, 0.05, 0.04, 'sine');
  }

  click(): void {
    this.tone(520, 0.08, 0.12, 'triangle');
    this.tone(780, 0.08, 0.08, 'triangle', 0.05);
  }

  close(): void {
    this.tone(600, 0.08, 0.08, 'triangle');
    this.tone(400, 0.1, 0.08, 'triangle', 0.05);
  }

  pickup(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.18, 0.12, 'sine', i * 0.07));
  }

  achievement(): void {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, 0.35, 0.1, 'triangle', i * 0.09));
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType, delay = 0): void {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Soft evolving pad: detuned sines through a slowly moving low-pass filter. */
  private startAmbient(): { stop(): void } | undefined {
    const { ctx, master } = this;
    if (!ctx || !master) return undefined;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(filter.frequency);
    filter.connect(out).connect(master);
    const oscs = [130.81, 196.0, 261.63, 329.63].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = (i % 2 ? 1 : -1) * 6;
      o.connect(filter);
      o.start();
      return o;
    });
    lfo.start();
    return { stop: () => [...oscs, lfo].forEach((o) => o.stop()) };
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
