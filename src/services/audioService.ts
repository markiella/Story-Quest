/**
 * AudioService — Centralized audio singleton for Story Quest.
 *
 * Subsystems:
 *   1. UI Sounds   — Playful, bouncy Web Audio synthesized marimba & chime tones
 *   2. Music       — Upbeat, melodic, playful Web Audio arpeggio loops per screen
 *   3. Narration   — SpeechSynthesis API (with pre-generated MP3 fallback path)
 *
 * All audio flows through this singleton via useAudio().
 * Settings are persisted in localStorage under storyquest_audio_settings.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioSettings {
  masterVolume:    number;   // 0–1
  musicVolume:     number;   // 0–1
  effectsVolume:   number;   // 0–1
  narrationVolume: number;   // 0–1
  narrationRate:   number;   // 0.75 | 1.0 | 1.25 | 1.5
  muted:           boolean;
}

export type NarrationState = 'idle' | 'playing' | 'paused';
export type ScreenMusic    = 'intro' | 'category' | 'story' | 'sequencer' | 'reward' | 'teacher' | 'none';

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'storyquest_audio_settings';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume:    0.7,
  musicVolume:     0.35,
  effectsVolume:   0.8,
  narrationVolume: 0.9,
  narrationRate:   1.0,
  muted:           false,
};

// ─── Note Frequencies (Hz) ─────────────────────────────────────────────────────

const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.26, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77;
const C6 = 1046.50, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;

// ─── Playful Music Configurations ─────────────────────────────────────────────

interface PlayfulTrack {
  bpm:       number;
  melody:    number[];   // 16-step melody loop
  bass:      number[];   // 4-step bouncy bass loop
  wave:      OscillatorType;
}

const PLAYFUL_TRACKS: Record<ScreenMusic, PlayfulTrack | null> = {
  // Intro: Bright, happy C-Major bouncy tune
  intro: {
    bpm: 124,
    wave: 'triangle',
    melody: [C4, E4, G4, C5, A4, G4, E4, G4, C4, E4, G4, C5, D5, C5, A4, G4],
    bass:   [C3, G3, C3, G3],
  },
  // Category: Energetic, playful G-Major exploration melody
  category: {
    bpm: 128,
    wave: 'triangle',
    melody: [G4, B4, D5, G5, E5, D5, B4, D5, G4, B4, D5, E5, D5, B4, A4, G4],
    bass:   [G3, D3, G3, D3],
  },
  // Story: Cozy, sweet, whimsical F-Major story reading tune
  story: {
    bpm: 108,
    wave: 'sine',
    melody: [F4, A4, C5, F5, D5, C5, A4, C5, F4, A4, C5, D5, C5, A4, G4, F4],
    bass:   [F3, C3, F3, C3],
  },
  // Sequencer: Upbeat, rhythmic puzzle beat in C-Major Pentatonic
  sequencer: {
    bpm: 132,
    wave: 'triangle',
    melody: [E4, G4, A4, C5, D5, C5, A4, G4, E4, G4, A4, C5, E5, D5, C5, A4],
    bass:   [C3, A3, F3, G3],
  },
  // Reward: Joyful victory celebration theme with happy bouncy arpeggio
  reward: {
    bpm: 136,
    wave: 'triangle',
    melody: [C5, E5, G5, C6, G5, E5, C5, E5, G5, C6, E6, D6, C6, G5, E5, C5],
    bass:   [C3, E3, G3, C4],
  },
  // Teacher: Friendly warm theme
  teacher: {
    bpm: 116,
    wave: 'sine',
    melody: [F4, A4, C5, E5, D5, C5, A4, C5, F4, A4, C5, D5, C5, A4, G4, F4],
    bass:   [F3, C3, F3, C3],
  },
  none: null,
};

// ─── AudioService class ───────────────────────────────────────────────────────

class AudioService {

  // ── AudioContext graph ───────────────────────────────────────────────────
  private ctx:         AudioContext | null = null;
  private masterGain:  GainNode     | null = null;
  private musicBus:    GainNode     | null = null;
  private effectsBus:  GainNode     | null = null;

  // ── Music state ──────────────────────────────────────────────────────────
  private currentMusic:    ScreenMusic | null = null;
  private musicTimer:      ReturnType<typeof setInterval> | null = null;
  private stepIndex:       number = 0;

  // ── Narration state ──────────────────────────────────────────────────────
  private _narrationState: NarrationState = 'idle';
  private utterance:       SpeechSynthesisUtterance | null = null;
  private narrationAudio:  HTMLAudioElement          | null = null;
  private _onBoundary:     ((charIndex: number) => void) | null = null;
  private _onEnd:          (() => void)              | null = null;

  // ── Settings ─────────────────────────────────────────────────────────────
  private settings: AudioSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  // ── Private: AudioContext ─────────────────────────────────────────────────

  private getCtx(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    try {
      const CtxClass = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!CtxClass) return null;

      this.ctx = new CtxClass();

      // Master gain — controls overall volume + mute
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      // Music sub-bus
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.settings.muted ? 0 : this.settings.musicVolume;
      this.musicBus.connect(this.masterGain);

      // Effects sub-bus
      this.effectsBus = this.ctx.createGain();
      this.effectsBus.gain.value = this.settings.muted ? 0 : this.settings.effectsVolume;
      this.effectsBus.connect(this.masterGain);

      return this.ctx;
    } catch {
      return null;
    }
  }

  private resume(): boolean {
    const ctx = this.getCtx();
    if (!ctx) return false;
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  }

  // ── Private: Playful Tone synthesis ───────────────────────────────────────

  private playTone(
    freq:     number,
    duration: number,
    peakGain: number        = 0.25,
    type:     OscillatorType = 'sine',
    delay:    number        = 0,
    slideFreq?: number,
  ): void {
    if (this.settings.muted) return;
    if (!this.resume()) return;
    const ctx        = this.ctx!;
    const effectsBus = this.effectsBus!;

    const now  = ctx.currentTime + delay;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(effectsBus);
    osc.start(now);
    osc.stop(now + duration + 0.05);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch { /* ok */ } };
  }

  private playSequence(
    notes: Array<{ freq: number; delay: number; dur: number; gain?: number; type?: OscillatorType; slide?: number }>,
  ): void {
    notes.forEach(n => this.playTone(n.freq, n.dur, n.gain ?? 0.25, n.type ?? 'sine', n.delay, n.slide));
  }

  // ── Public: Playful UI Sound Effects ──────────────────────────────────────

  /** Bouncy marimba pop on button click */
  playClick(): void {
    this.playTone(520, 0.08, 0.25, 'triangle', 0, 780);
  }

  /** Gentle wooden chime hover tick */
  playHover(): void {
    this.playTone(880, 0.04, 0.08, 'sine');
  }

  /** Bouncy ascending marimba pop when picking up cards */
  playCardPickup(): void {
    this.playSequence([
      { freq: E5, delay: 0,    dur: 0.08, gain: 0.25, type: 'triangle' },
      { freq: B5, delay: 0.05, dur: 0.10, gain: 0.30, type: 'triangle' },
    ]);
  }

  /** Bouncy descending marimba drop when placing cards */
  playCardDrop(): void {
    this.playSequence([
      { freq: B5, delay: 0,    dur: 0.06, gain: 0.25, type: 'triangle' },
      { freq: E5, delay: 0.04, dur: 0.10, gain: 0.30, type: 'triangle' },
    ]);
  }

  /** Cheerful major chord chime */
  playSuccess(): void {
    this.playSequence([
      { freq: C5, delay: 0,    dur: 0.12, gain: 0.25, type: 'triangle' },
      { freq: E5, delay: 0.08, dur: 0.12, gain: 0.25, type: 'triangle' },
      { freq: G5, delay: 0.16, dur: 0.14, gain: 0.30, type: 'triangle' },
      { freq: C6, delay: 0.26, dur: 0.25, gain: 0.35, type: 'triangle' },
    ]);
  }

  /** Playful boing/wobble effect on error */
  playError(): void {
    this.playTone(280, 0.25, 0.3, 'sawtooth', 0, 140);
  }

  /** Descending playful slide on reset */
  playReset(): void {
    this.playSequence([
      { freq: G5, delay: 0,    dur: 0.08, gain: 0.2, type: 'triangle' },
      { freq: E5, delay: 0.07, dur: 0.08, gain: 0.2, type: 'triangle' },
      { freq: C5, delay: 0.14, dur: 0.12, gain: 0.2, type: 'triangle' },
    ]);
  }

  /** Upbeat 5-note victory fanfare */
  playReward(): void {
    const freqs = [C5, E5, G5, C6, E6];
    this.playSequence(freqs.map((freq, i) => ({
      freq,
      delay: i * 0.08,
      dur: 0.16,
      gain: 0.32,
      type: 'triangle',
    })));
  }

  /** Sparkling high marimba burst */
  playConfetti(): void {
    const freqs = [C6, D6, E6, G6, C6 * 2];
    this.playSequence(freqs.map((freq, i) => ({
      freq,
      delay: i * 0.04,
      dur: 0.07,
      gain: 0.18,
      type: 'sine',
    })));
  }

  playStudentJoin(): void {
    this.playTone(660, 0.18, 0.22, 'triangle');
  }

  playSubmit(): void {
    this.playSequence([
      { freq: G4, delay: 0,    dur: 0.10, gain: 0.25, type: 'triangle' },
      { freq: C5, delay: 0.08, dur: 0.15, gain: 0.30, type: 'triangle' },
    ]);
  }

  playSessionCreated(): void {
    this.playSequence([
      { freq: G4, delay: 0,    dur: 0.10, gain: 0.25, type: 'triangle' },
      { freq: C5, delay: 0.08, dur: 0.10, gain: 0.25, type: 'triangle' },
      { freq: E5, delay: 0.16, dur: 0.18, gain: 0.30, type: 'triangle' },
    ]);
  }

  playSessionEnd(): void {
    this.playSequence([
      { freq: E5, delay: 0,    dur: 0.10, gain: 0.25, type: 'triangle' },
      { freq: C5, delay: 0.08, dur: 0.10, gain: 0.25, type: 'triangle' },
      { freq: G4, delay: 0.16, dur: 0.20, gain: 0.25, type: 'triangle' },
    ]);
  }

  /** Cheerful, age-appropriate opening fanfare for starting adventure */
  playAppEntry(): void {
    this.playSequence([
      { freq: C5, delay: 0,    dur: 0.10, gain: 0.28, type: 'triangle' },
      { freq: E5, delay: 0.08, dur: 0.10, gain: 0.28, type: 'triangle' },
      { freq: G5, delay: 0.16, dur: 0.12, gain: 0.30, type: 'triangle' },
      { freq: C6, delay: 0.24, dur: 0.22, gain: 0.35, type: 'triangle' },
    ]);
  }

  // ── Public: Upbeat Playful Background Music ─────────────────────────────────

  playMusic(screen: ScreenMusic): void {
    if (screen === this.currentMusic) return;
    this.stopMusic();
    this.currentMusic = screen;

    const track = PLAYFUL_TRACKS[screen];
    if (!track) return;

    this.stepIndex = 0;
    const stepMs = (60 / track.bpm / 2) * 1000; // 8th note interval

    this.musicTimer = setInterval(() => {
      if (this.settings.muted) return;
      if (!this.resume()) return;
      const ctx      = this.ctx!;
      const musicBus = this.musicBus!;
      if (!ctx || !musicBus) return;

      const now = ctx.currentTime;
      const step = this.stepIndex;
      this.stepIndex = (this.stepIndex + 1) % track.melody.length;

      // 1. Playful Melody note (marimba/toy-piano style)
      const melFreq = track.melody[step];
      if (melFreq) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = track.wave;
        osc.frequency.value = melFreq;

        const baseGain = 0.14 * this.settings.musicVolume;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(baseGain, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(musicBus);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      // 2. Bouncy Bass note on beat 1 & 3 of measure (every 4 steps)
      if (step % 4 === 0 && track.bass.length > 0) {
        const bassIdx  = Math.floor(step / 4) % track.bass.length;
        const bassFreq = track.bass[bassIdx];
        if (bassFreq) {
          const bassOsc  = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.value = bassFreq;

          const baseVolume = 0.18 * this.settings.musicVolume;
          bassGain.gain.setValueAtTime(0, now);
          bassGain.gain.linearRampToValueAtTime(baseVolume, now + 0.01);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

          bassOsc.connect(bassGain);
          bassGain.connect(musicBus);
          bassOsc.start(now);
          bassOsc.stop(now + 0.35);
        }
      }

      // 3. Gentle woodblock pulse on offbeats
      if (step % 2 === 1) {
        const tickOsc  = ctx.createOscillator();
        const tickGain = ctx.createGain();
        tickOsc.type = 'triangle';
        tickOsc.frequency.setValueAtTime(1200, now);
        tickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

        const tickVolume = 0.03 * this.settings.musicVolume;
        tickGain.gain.setValueAtTime(tickVolume, now);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        tickOsc.connect(tickGain);
        tickGain.connect(musicBus);
        tickOsc.start(now);
        tickOsc.stop(now + 0.03);
      }

    }, stepMs);
  }

  stopMusic(): void {
    this.currentMusic = null;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ── Public: Narration ─────────────────────────────────────────────────────

  getNarrationState(): NarrationState { return this._narrationState; }

  async startNarration(
    storyId:     string,
    text:        string,
    onBoundary?: (charIndex: number) => void,
    onEnd?:      () => void,
  ): Promise<void> {
    this.stopNarration();
    if (this.settings.muted) return;

    this._onBoundary = onBoundary ?? null;
    this._onEnd      = onEnd ?? null;
    this._narrationState = 'playing';

    const audioUrl = `/audio/stories/${storyId}.mp3`;
    const hasFile  = await this.probeFile(audioUrl);
    if (this._narrationState !== 'playing') return;

    if (hasFile) {
      this.startFileNarration(audioUrl, text);
    } else {
      this.startSpeechNarration(text);
    }
  }

  private async probeFile(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (type.includes('text/html') || type.includes('application/xhtml')) {
        return false;
      }
      return res.ok && (type.includes('audio') || type.includes('octet-stream'));
    } catch {
      return false;
    }
  }

  private startFileNarration(url: string, fallbackText: string): void {
    const audio = new Audio(url);
    audio.volume      = Math.min(1, this.settings.narrationVolume * this.settings.masterVolume);
    audio.playbackRate = this.settings.narrationRate;
    audio.onended = () => {
      this._narrationState = 'idle';
      const cb = this._onEnd;
      this._onEnd = null;
      cb?.();
    };
    audio.onerror = () => {
      this.narrationAudio = null;
      this.startSpeechNarration(fallbackText);
    };
    this.narrationAudio = audio;
    audio.play().catch(() => {
      this.narrationAudio = null;
      this.startSpeechNarration(fallbackText);
    });
  }

  private startSpeechNarration(text: string): void {
    if (!('speechSynthesis' in window)) {
      this._narrationState = 'idle';
      return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance   = new SpeechSynthesisUtterance(text);
    utterance.lang    = 'en-US';
    utterance.rate    = this.settings.narrationRate;
    utterance.volume  = Math.min(1, this.settings.narrationVolume * this.settings.masterVolume);

    const assignVoice = () => {
      const voices   = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      const preferred = ['Microsoft David', 'Microsoft Aria', 'Google US English', 'Samantha', 'Alex', 'Victoria'];
      let voice: SpeechSynthesisVoice | undefined;
      for (const name of preferred) {
        voice = voices.find(v => v.name.includes(name));
        if (voice) break;
      }
      if (!voice) voice = voices.find(v => v.lang.startsWith('en'));
      if (voice)  utterance.voice = voice;
    };

    assignVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        assignVoice();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }

    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === 'word' || e.name === 'sentence' || e.charIndex !== undefined) {
        this._onBoundary?.(e.charIndex);
      }
    };

    utterance.onend = () => {
      this._narrationState = 'idle';
      const cb = this._onEnd;
      this._onEnd = null;
      cb?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        this._narrationState = 'idle';
      }
    };

    this.utterance = utterance;

    setTimeout(() => {
      if (this._narrationState === 'playing') {
        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 50);
  }

  pauseNarration(): void {
    if (this._narrationState !== 'playing') return;
    if (this.narrationAudio) {
      this.narrationAudio.pause();
    } else if ('speechSynthesis' in window) {
      speechSynthesis.pause();
    }
    this._narrationState = 'paused';
  }

  resumeNarration(): void {
    if (this._narrationState !== 'paused') return;
    if (this.narrationAudio) {
      void this.narrationAudio.play();
    } else if ('speechSynthesis' in window) {
      speechSynthesis.resume();
    }
    this._narrationState = 'playing';
  }

  stopNarration(): void {
    this._onEnd      = null;
    this._onBoundary = null;
    if (this.narrationAudio) {
      this.narrationAudio.pause();
      this.narrationAudio.src = '';
      this.narrationAudio = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    this.utterance       = null;
    this._narrationState = 'idle';
  }

  // ── Public: Settings ──────────────────────────────────────────────────────

  getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  setMasterVolume(v: number): void {
    this.settings.masterVolume = clamp(v);
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    }
    this.saveSettings();
  }

  setMusicVolume(v: number): void {
    this.settings.musicVolume = clamp(v);
    if (this.musicBus) {
      this.musicBus.gain.value = this.settings.muted ? 0 : this.settings.musicVolume;
    }
    this.saveSettings();
  }

  setEffectsVolume(v: number): void {
    this.settings.effectsVolume = clamp(v);
    if (this.effectsBus) {
      this.effectsBus.gain.value = this.settings.muted ? 0 : this.settings.effectsVolume;
    }
    this.saveSettings();
  }

  setNarrationVolume(v: number): void {
    this.settings.narrationVolume = clamp(v);
    if (this.narrationAudio) {
      this.narrationAudio.volume = this.settings.narrationVolume;
    }
    this.saveSettings();
  }

  setNarrationRate(r: number): void {
    this.settings.narrationRate = r;
    if (this.narrationAudio) {
      this.narrationAudio.playbackRate = r;
    }
    this.saveSettings();
  }

  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.applyMute();
    this.saveSettings();
  }

  setMuted(muted: boolean): void {
    if (this.settings.muted === muted) return;
    this.settings.muted = muted;
    this.applyMute();
    this.saveSettings();
  }

  private applyMute(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    }
    if (this.musicBus) {
      this.musicBus.gain.value = this.settings.muted ? 0 : this.settings.musicVolume;
    }
    if (this.effectsBus) {
      this.effectsBus.gain.value = this.settings.muted ? 0 : this.settings.effectsVolume;
    }
    if (this.narrationAudio) {
      this.narrationAudio.volume = this.settings.muted ? 0 : this.settings.narrationVolume;
    }
    if (this.settings.muted && this._narrationState === 'playing') {
      this.pauseNarration();
    }
  }

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AudioSettings>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch { /* Storage unavailable in private-browsing mode */ }
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export const audioService = new AudioService();
