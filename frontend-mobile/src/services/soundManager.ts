// ========================================================
// SIX CARDS MOBILE - LUXURY CASINO AUDIO & LO-FI LOUNGE ENGINE
// High-fidelity Web Audio synthesis: zero latency, zero asset downloads,
// velvet-smooth ambient lounge jazz & tactile haptic card SFX.
// ========================================================

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isBgmActive: boolean = false;
  private isSfxMuted: boolean = false;
  private bgmTimer: number | null = null;
  private isWarmedUp: boolean = false;

  constructor() {
    try {
      this.isBgmActive = localStorage.getItem('six_cards_music') !== 'false';
      this.isSfxMuted = localStorage.getItem('six_cards_sfx') === 'false';
    } catch {
      this.isBgmActive = true;
      this.isSfxMuted = false;
    }

    if (typeof window !== 'undefined') {
      const warmUp = () => {
        this.warmUpAudio();
        window.removeEventListener('touchstart', warmUp);
        window.removeEventListener('pointerdown', warmUp);
        window.removeEventListener('click', warmUp);
      };
      window.addEventListener('touchstart', warmUp, { passive: true, once: true });
      window.addEventListener('pointerdown', warmUp, { passive: true, once: true });
      window.addEventListener('click', warmUp, { passive: true, once: true });
    }
  }

  public warmUpAudio(): void {
    if (this.isWarmedUp && this.ctx && this.ctx.state === 'running') return;
    const ctx = this.initCtx();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isWarmedUp = true;
          if (this.isBgmActive) this.startAmbientMusicLoop();
        }).catch(() => {});
      } else {
        this.isWarmedUp = true;
        if (this.isBgmActive) this.startAmbientMusicLoop();
      }
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass({ latencyHint: 'interactive' });

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.isSfxMuted ? 0 : 0.6;
        this.sfxGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.isBgmActive ? 0.16 : 0;
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    return this.ctx;
  }

  // ========================================================
  // 1. TACTILE HAPTIC UI CLICK
  // Soft, satisfying acoustic tap (no harsh sine beeps)
  // ========================================================
  public playClick(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    try {
      const now = ctx.currentTime;

      // Resonant mid-body snap
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.024);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.026);

      // Soft sub-haptic pop
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.02);

      subGain.gain.setValueAtTime(0.25, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(now);
      subOsc.stop(now + 0.022);
    } catch {}
  }

  // ========================================================
  // 2. REALISTIC CARD DRAW / SLIDE
  // Crisp felt friction and card body snap
  // ========================================================
  public playCardDraw(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    try {
      const now = ctx.currentTime;

      // Card friction noise sweep
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(3200, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.055);
      noiseFilter.Q.setValueAtTime(1.8, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);

      // Card body snap tone
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'sine';
      snap.frequency.setValueAtTime(480, now + 0.012);
      snap.frequency.exponentialRampToValueAtTime(160, now + 0.048);

      snapGain.gain.setValueAtTime(0.22, now + 0.012);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

      snap.connect(snapGain);
      snapGain.connect(this.sfxGain);

      snap.start(now + 0.012);
      snap.stop(now + 0.05);
    } catch {}
  }

  // ========================================================
  // 3. CARD FLIP (FELT THUD)
  // Double-flutter transient of card snapping face-up
  // ========================================================
  public playCardFlip(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    try {
      const now = ctx.currentTime;
      [0, 0.022].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 520 : 380, now + offset);
        osc.frequency.exponentialRampToValueAtTime(120, now + offset + 0.032);

        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.032);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + offset);
        osc.stop(now + offset + 0.034);
      });
    } catch {}
  }

  // ========================================================
  // 4. SPARKLING CASINO ELIMINATION CHIME
  // Warm pentatonic bell chime cascade
  // ========================================================
  public playEliminate(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    try {
      const now = ctx.currentTime;
      // High-register sparkling chord: E6 (1318Hz), G#6 (1661Hz), B6 (1975Hz), E7 (2637Hz)
      const freqs = [1046.5, 1318.5, 1568.0, 2093.0];
      freqs.forEach((freq, idx) => {
        const t = now + idx * 0.045;

        // Carrier
        const carrier = ctx.createOscillator();
        const carrierGain = ctx.createGain();

        // Modulator for glass/bell harmonics
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();

        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(freq, t);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(freq * 2.01, t);

        modGain.gain.setValueAtTime(freq * 0.6, t);
        modGain.gain.exponentialRampToValueAtTime(1, t + 0.28);

        mod.connect(carrier.frequency);

        carrierGain.gain.setValueAtTime(0.24, t);
        carrierGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        carrier.connect(carrierGain);
        carrierGain.connect(this.sfxGain!);

        carrier.start(t);
        mod.start(t);
        carrier.stop(t + 0.29);
        mod.stop(t + 0.29);
      });
    } catch {}
  }

  // ========================================================
  // 5. CELEBRATORY VICTORY FANFARE
  // Warm, triumphant orchestral chime flourish
  // ========================================================
  public playVictory(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    try {
      const now = ctx.currentTime;
      // C Major 9 victory arpeggio: C5, E5, G5, B5, C6, E6
      const melody = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      melody.forEach((freq, idx) => {
        const t = now + idx * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t);
        osc.stop(t + 0.66);
      });
    } catch {}
  }

  // ========================================================
  // 6. LO-FI CASINO JAZZ LOUNGE (AMBIENT BGM)
  // Warm Rhodes Electric Piano + Deep Upright Bass
  // Classy, relaxing, timeless 4-bar progression:
  // Dm9 -> G13 -> Cmaj9 -> Am9
  // ========================================================
  public toggleMusic(enable?: boolean): boolean {
    this.isBgmActive = enable !== undefined ? enable : !this.isBgmActive;
    try {
      localStorage.setItem('six_cards_music', String(this.isBgmActive));
    } catch {}

    const ctx = this.initCtx();
    if (this.bgmGain && ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      this.bgmGain.gain.setTargetAtTime(this.isBgmActive ? 0.16 : 0, ctx.currentTime, 0.15);
    }

    if (this.isBgmActive) {
      this.startAmbientMusicLoop();
    } else {
      this.stopAmbientMusicLoop();
    }

    return this.isBgmActive;
  }

  public toggleSound(enable?: boolean): boolean {
    const active = enable !== undefined ? enable : this.isSfxMuted;
    this.isSfxMuted = !active;
    try {
      localStorage.setItem('six_cards_sfx', String(!this.isSfxMuted));
    } catch {}

    const ctx = this.initCtx();
    if (this.sfxGain && ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.6, ctx.currentTime);
    }

    return !this.isSfxMuted;
  }

  public getMusicStatus(): boolean {
    return this.isBgmActive;
  }

  public getSoundStatus(): boolean {
    return !this.isSfxMuted;
  }

  private startAmbientMusicLoop(): void {
    if (this.bgmTimer) return;

    // 4-Bar Classic Casino Jazz Progression
    // Chords with warm electric piano voicing & root upright bass
    const jazzLoungeBars = [
      {
        rootBass: 73.42, // D2
        epNotes: [220.0, 261.63, 329.63, 349.23], // Dm9: A3, C4, E4, F4
      },
      {
        rootBass: 98.0, // G2
        epNotes: [174.61, 246.94, 329.63, 440.0], // G13: F3, B3, E4, A4
      },
      {
        rootBass: 65.41, // C2
        epNotes: [196.0, 246.94, 293.66, 329.63], // Cmaj9: G3, B3, D4, E4
      },
      {
        rootBass: 110.0, // A2
        epNotes: [164.81, 196.0, 246.94, 261.63], // Am9: E3, G3, B3, C4
      },
    ];

    let currentBar = 0;

    const playBar = () => {
      if (!this.isBgmActive) return;
      const ctx = this.initCtx();
      if (!ctx || !this.bgmGain) return;
      if (ctx.state === 'suspended') return;

      const bar = jazzLoungeBars[currentBar % jazzLoungeBars.length];
      currentBar++;
      const now = ctx.currentTime;

      // 1. Warm Upright Acoustic Bass Pluck
      try {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const bassFilter = ctx.createBiquadFilter();

        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bar.rootBass, now);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(260, now);

        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.32, now + 0.03);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(now);
        bassOsc.stop(now + 2.5);
      } catch {}

      // 2. Mellow Rhodes Electric Piano Strum (Lush arpeggiated voicing)
      bar.epNotes.forEach((freq, idx) => {
        try {
          const strumDelay = idx * 0.045; // Gentle strum spread
          const t = now + strumDelay;

          const carrier = ctx.createOscillator();
          const mod = ctx.createOscillator();
          const modGain = ctx.createGain();
          const epGain = ctx.createGain();
          const epFilter = ctx.createBiquadFilter();

          carrier.type = 'sine';
          carrier.frequency.setValueAtTime(freq, t);

          // Subtle FM bell overtone (Rhodes tine)
          mod.type = 'sine';
          mod.frequency.setValueAtTime(freq * 2.0, t);

          modGain.gain.setValueAtTime(freq * 0.45, t);
          modGain.gain.exponentialRampToValueAtTime(1, t + 0.4);
          mod.connect(carrier.frequency);

          epFilter.type = 'lowpass';
          epFilter.frequency.setValueAtTime(1400, t);
          epFilter.frequency.exponentialRampToValueAtTime(600, t + 2.2);

          epGain.gain.setValueAtTime(0.001, t);
          epGain.gain.linearRampToValueAtTime(0.18, t + 0.025);
          epGain.gain.exponentialRampToValueAtTime(0.001, t + 2.3);

          carrier.connect(epFilter);
          epFilter.connect(epGain);
          epGain.connect(this.bgmGain!);

          carrier.start(t);
          mod.start(t);
          carrier.stop(t + 2.4);
          mod.stop(t + 2.4);
        } catch {}
      });
    };

    playBar();
    // Smooth 2.8 second bar tempo for a relaxed, atmospheric groove
    this.bgmTimer = window.setInterval(playBar, 2800);
  }

  private stopAmbientMusicLoop(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
