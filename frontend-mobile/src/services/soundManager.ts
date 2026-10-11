// ========================================================
// SIX CARDS MOBILE - ZERO-LATENCY SOUND & MUSIC SYNTHESIZER
// Pre-warmed audio context for instant mobile tactile feedback
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
    // Read persisted sound settings
    try {
      this.isBgmActive = localStorage.getItem('six_cards_music') !== 'false';
      this.isSfxMuted = localStorage.getItem('six_cards_sfx') === 'false';
    } catch {
      this.isBgmActive = true;
      this.isSfxMuted = false;
    }

    // Auto-warmup on first user touch/tap anywhere
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
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isWarmedUp = true;
        if (this.isBgmActive) {
          this.startAmbientMusicLoop();
        }
      }).catch(() => {});
    } else {
      this.isWarmedUp = true;
      if (this.isBgmActive) {
        this.startAmbientMusicLoop();
      }
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass({ latencyHint: 'interactive' });
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.isSfxMuted ? 0 : 0.5;
        this.sfxGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.isBgmActive ? 0.22 : 0;
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    return this.ctx;
  }

  // ZERO-LATENCY GAME CLICKS & SFX
  public playClick(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.038);

      // Instant attack
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.038);
    } catch {}
  }

  public playCardDraw(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playCardFlip(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  public playEliminate(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const notes = [440, 587, 740];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);

        gain.gain.setValueAtTime(0.32, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.1);
      });
    } catch {}
  }

  public playVictory(): void {
    if (this.isSfxMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const melody = [523.25, 659.25, 783.99, 1046.5];
      melody.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.35, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } catch {}
  }

  // AMBIENT BACKGROUND MUSIC
  public toggleMusic(enable?: boolean): boolean {
    this.isBgmActive = enable !== undefined ? enable : !this.isBgmActive;
    try {
      localStorage.setItem('six_cards_music', String(this.isBgmActive));
    } catch {}

    const ctx = this.initCtx();
    if (this.bgmGain && ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      this.bgmGain.gain.setTargetAtTime(this.isBgmActive ? 0.22 : 0, ctx.currentTime, 0.1);
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
      this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.5, ctx.currentTime);
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
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 392.0],  // G7
    ];
    let chordIndex = 0;

    const playChordStep = () => {
      if (!this.isBgmActive) return;
      const ctx = this.initCtx();
      if (!ctx || !this.bgmGain) return;
      if (ctx.state === 'suspended') return;

      const currentChord = chords[chordIndex % chords.length];
      chordIndex++;

      currentChord.forEach((freq, noteIdx) => {
        try {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(700, ctx.currentTime);

          const startTime = ctx.currentTime + noteIdx * 0.16;
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.045, startTime + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.bgmGain!);

          osc.start(startTime);
          osc.stop(startTime + 2.0);
        } catch {}
      });
    };

    playChordStep();
    this.bgmTimer = window.setInterval(playChordStep, 2400);
  }

  private stopAmbientMusicLoop(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
