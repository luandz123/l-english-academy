// Procedural Sound FX using Web Audio API + Text-To-Speech Pronunciation

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmInterval: ReturnType<typeof setInterval> | null = null;
  private isBgmPlaying: boolean = false;
  private bgmStep: number = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isBgmPlaying) {
      this.stopBGM();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- PROCEDURAL CYBER BGM SYNTHESIZER ---
  public toggleBGM(): boolean {
    if (this.isBgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  public isBGMActive(): boolean {
    return this.isBgmPlaying;
  }

  public startBGM() {
    if (this.isMuted || this.isBgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // Bass notes progression: Am - F - C - G
    const bassline = [
      110.0, 110.0, 164.81, 110.0, 130.81, 130.81, 196.0, 130.81,
      174.61, 174.61, 220.0, 174.61, 196.0, 196.0, 246.94, 196.0,
    ];

    this.bgmInterval = setInterval(() => {
      if (!this.isBgmPlaying || this.isMuted) return;
      try {
        const audioCtx = this.getContext();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        const currentNote = bassline[this.bgmStep % bassline.length];

        // 1. Synth Bass Note
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(currentNote, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.14);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.14);

        // 2. Soft Rhythm Beat (Kick on beats 0, 4, 8, 12; Hi-hat on odd steps)
        if (this.bgmStep % 4 === 0) {
          // Sub Kick
          const kickOsc = audioCtx.createOscillator();
          const kickGain = audioCtx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(120, now);
          kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

          kickGain.gain.setValueAtTime(0.06, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          kickOsc.connect(kickGain);
          kickGain.connect(audioCtx.destination);

          kickOsc.start(now);
          kickOsc.stop(now + 0.08);
        } else if (this.bgmStep % 2 === 1) {
          // Cyber Hi-hat tick
          const hatOsc = audioCtx.createOscillator();
          const hatGain = audioCtx.createGain();
          hatOsc.type = 'triangle';
          hatOsc.frequency.setValueAtTime(4500, now);

          hatGain.gain.setValueAtTime(0.015, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

          hatOsc.connect(hatGain);
          hatGain.connect(audioCtx.destination);

          hatOsc.start(now);
          hatOsc.stop(now + 0.03);
        }

        this.bgmStep++;
      } catch {}
    }, 160);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  // Laser beam shot
  public playLaserSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.11);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  // Single correct keystroke
  public playHitLetterSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // Mistyped keystroke
  public playMissLetterSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Switch / cancel target click
  public playRetargetSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  // Word exploded / Destroyed
  public playExplosionSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Bass punch
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);

      // Noise sizzle
      const bufferSize = ctx.sampleRate * 0.22;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch {}
  }

  // +1 Life Heart Collected
  public playHeartSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {}
  }

  // Shield Power-up Acquired
  public playShieldSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A chord chime

      notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.35);
      });
    } catch {}
  }

  // Shield Break / Absorbed Hit
  public playShieldBreakSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Electrical crackle
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  // Freeze Power-up
  public playFreezeSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freqs = [1800, 2200, 2600, 3100];

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.05);

        gain.gain.setValueAtTime(0.15, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.4);
      });
    } catch {}
  }

  // Slow-Mo Power-up (Time Dilation)
  public playSlowMoSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.6);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  // Mega Bomb Area Blast
  public playBombSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.7);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {}
  }

  // Combo Streak (Dynamic Pitch)
  public playComboSound(combo: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const baseFreq = 440;
      const scaleSteps = [0, 2, 4, 7, 9, 12, 14, 16];
      const step = scaleSteps[Math.min(combo - 1, scaleSteps.length - 1)];
      const freq = baseFreq * Math.pow(2, step / 12);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.2);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  // Wave Clear celebration fanfare
  public playWaveClearSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      melody.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);

        gain.gain.setValueAtTime(0.16, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } catch {}
  }

  // Boss Word Incoming Alert
  public playBossSpawnSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [130, 98, 87].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + i * 0.15);

        gain.gain.setValueAtTime(0.2, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.45);
      });
    } catch {}
  }

  // Attack sent to opponent
  public playAttackSentSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.3);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // Incoming Attack Alarm
  public playIncomingAlertSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [0, 0.15].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now + offset);
        osc.frequency.setValueAtTime(600, now + offset + 0.06);

        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } catch {}
  }

  // Game over sound
  public playGameOverSound() {
    if (this.isMuted) return;
    this.stopBGM();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const chords = [392, 349.23, 329.63, 261.63];

      chords.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + idx * 0.15);

        gain.gain.setValueAtTime(0.15, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.3);
      });
    } catch {}
  }

  // Victory fanfare
  public playVictorySound() {
    if (this.isMuted) return;
    this.stopBGM();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      const durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.6];

      let elapsed = 0;
      melody.forEach((f, i) => {
        const dur = durations[i];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + elapsed);

        gain.gain.setValueAtTime(0.2, now + elapsed);
        gain.gain.exponentialRampToValueAtTime(0.001, now + elapsed + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + elapsed);
        osc.stop(now + elapsed + dur);
        elapsed += dur;
      });
    } catch {}
  }

  // High quality Text-to-Speech English Pronunciation
  public speakWord(word: string, audioUrl?: string | null) {
    if (this.isMuted) return;

    if (audioUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(audioUrl);
        audio.volume = 0.9;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.speakViaTTS(word);
          });
          return;
        }
      } catch {
        // Fallback
      }
    }

    this.speakViaTTS(word);
  }

  private speakViaTTS(word: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word.trim());
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 0.95;

      const voices = this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')) &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Premium'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS speech error:', e);
    }
  }

  // --- PVP-SPECIFIC SOUNDS ---

  // Ready confirmation chime (both players ready)
  public playReadySound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Rising two-tone confirmation
      [659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.18, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.2);
      });
    } catch {}
  }

  // Countdown beep (3-2-1) with escalating pitch
  public playCountdownBeep(count: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Higher pitch as countdown decreases
      const freqMap: Record<number, number> = { 3: 440, 2: 554.37, 1: 659.25 };
      const freq = freqMap[count] || 440;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = count === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const duration = count === 1 ? 0.4 : 0.15;
      gain.gain.setValueAtTime(count === 1 ? 0.25 : 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);

      // Extra harmonic on final beep
      if (count === 1) {
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);
        g2.gain.setValueAtTime(0.1, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.3);
      }
    } catch {}
  }

  // Match start fanfare (after countdown reaches 0)
  public playMatchStartSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Triumphant ascending chord burst
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.06);
        gain.gain.setValueAtTime(0.16, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.35);
      });

      // Cymbal-like noise hit
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now + 0.18);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 4000;
      noise.connect(hpf);
      hpf.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now + 0.18);
      noise.stop(now + 0.4);
    } catch {}
  }

  // Subtle notification when opponent scores a hit
  public playOpponentHitSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // Meteor launch whoosh (attacking opponent)
  public playMeteorLaunchSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Rising sweep + noise burst
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
      filter.Q.value = 2;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

      // Noise burst
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.07, now + 0.05);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now + 0.05);
      noise.stop(now + 0.25);
    } catch {}
  }
}

export const gameSound = new SoundManager();

