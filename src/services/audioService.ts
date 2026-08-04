/**
 * AudioService — Centralized audio singleton for Story Quest.
 *
 * Three independent subsystems:
 *   1. UI Sounds   — Web Audio API synthesized tones (no files required)
 *   2. Music       — Web Audio API ambient oscillator pads per screen
 *   3. Narration   — SpeechSynthesis API (with pre-generated MP3 fallback path)
 *
 * Components MUST NOT instantiate Audio objects directly.
 * All audio flows through this singleton via useAudio().
 *
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

const FADE_MS = 600; // music crossfade duration in milliseconds

/**
 * Chord frequencies (Hz) for each screen's ambient background music.
 * null = silence (no music for that screen).
 */
const MUSIC_CONFIGS: Record<ScreenMusic, { freqs: number[]; wave: OscillatorType } | null> = {
  intro:     { freqs: [261.63, 329.63, 392.00],        wave: 'sine'     }, // C major
  category:  { freqs: [293.66, 369.99, 440.00],        wave: 'sine'     }, // D major
  story:     { freqs: [196.00, 246.94, 293.66],        wave: 'sine'     }, // G major (lower)
  sequencer: { freqs: [220.00, 261.63, 329.63],        wave: 'triangle' }, // A minor
  reward:    { freqs: [523.25, 659.26, 783.99],        wave: 'sine'     }, // C major upper
  teacher:   { freqs: [174.61, 220.00, 261.63],        wave: 'sine'     }, // F major
  none:      null,
};

// ─── AudioService class ───────────────────────────────────────────────────────

class AudioService {

  // ── AudioContext graph ───────────────────────────────────────────────────
  private ctx:         AudioContext | null = null;
  private masterGain:  GainNode     | null = null;
  private musicBus:    GainNode     | null = null;
  private effectsBus:  GainNode     | null = null;

  // ── Music state ──────────────────────────────────────────────────────────
  private currentMusic:   ScreenMusic | null = null;
  private musicNodes:     OscillatorNode[]   = [];
  private musicLFOs:      OscillatorNode[]   = [];
  private musicTrackGain: GainNode   | null  = null;
  private musicFadeTimer: ReturnType<typeof setTimeout> | null = null;

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

  /**
   * Lazily creates the AudioContext. Returns null if Web Audio is unavailable.
   * The context is created once and reused — never recreated.
   */
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
      this.musicBus.gain.value = this.settings.musicVolume;
      this.musicBus.connect(this.masterGain);

      // Effects sub-bus
      this.effectsBus = this.ctx.createGain();
      this.effectsBus.gain.value = this.settings.effectsVolume;
      this.effectsBus.connect(this.masterGain);

      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Resumes the AudioContext (required after user gesture in modern browsers).
   * Returns false if Web Audio is unavailable.
   */
  private resume(): boolean {
    const ctx = this.getCtx();
    if (!ctx) return false;
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  }

  // ── Private: Tone synthesis ───────────────────────────────────────────────

  private playTone(
    freq:     number,
    duration: number,
    peakGain: number        = 0.25,
    type:     OscillatorType = 'sine',
    delay:    number        = 0,
  ): void {
    if (this.settings.muted) return;
    if (!this.resume()) return;
    const ctx       = this.ctx!;
    const effectsBus = this.effectsBus!;

    const now = ctx.currentTime + delay;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(effectsBus);
    osc.start(now);
    osc.stop(now + duration + 0.05);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch { /* already disconnected */ } };
  }

  private playSequence(
    notes: Array<{ freq: number; delay: number; dur: number; gain?: number }>,
    type:  OscillatorType = 'sine',
  ): void {
    notes.forEach(n => this.playTone(n.freq, n.dur, n.gain ?? 0.25, type, n.delay));
  }

  // ── Public: UI Sounds ─────────────────────────────────────────────────────

  playClick():          void { this.playTone(440, 0.06, 0.2, 'sine'); }
  playHover():          void { this.playTone(880, 0.03, 0.05, 'sine'); }

  playCardPickup(): void {
    this.playSequence([
      { freq: 330, delay: 0,    dur: 0.07 },
      { freq: 550, delay: 0.05, dur: 0.08 },
    ]);
  }

  playCardDrop(): void {
    this.playSequence([
      { freq: 550, delay: 0,    dur: 0.06 },
      { freq: 330, delay: 0.04, dur: 0.10 },
    ]);
  }

  /** C–E–G ascending arpeggio */
  playSuccess(): void {
    this.playSequence([
      { freq: 523.25, delay: 0,    dur: 0.12 },
      { freq: 659.26, delay: 0.12, dur: 0.12 },
      { freq: 783.99, delay: 0.24, dur: 0.22 },
    ]);
  }

  playError(): void { this.playTone(180, 0.3, 0.25, 'sawtooth'); }

  playReset(): void {
    this.playSequence([
      { freq: 660, delay: 0,    dur: 0.08 },
      { freq: 440, delay: 0.08, dur: 0.08 },
      { freq: 220, delay: 0.16, dur: 0.12 },
    ]);
  }

  /** 5-note ascending fanfare */
  playReward(): void {
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.26];
    this.playSequence(freqs.map((freq, i) => ({ freq, delay: i * 0.10, dur: 0.15, gain: 0.3 })));
  }

  /** Rapid high sparkle burst */
  playConfetti(): void {
    const freqs = [1047, 1175, 1319, 1397, 1568];
    this.playSequence(freqs.map((freq, i) => ({ freq, delay: i * 0.04, dur: 0.06, gain: 0.15 })));
  }

  playStudentJoin():    void { this.playTone(660, 0.18, 0.2, 'sine'); }

  playSubmit(): void {
    this.playSequence([
      { freq: 440, delay: 0,   dur: 0.10 },
      { freq: 550, delay: 0.1, dur: 0.15 },
    ]);
  }

  playSessionCreated(): void {
    this.playSequence([
      { freq: 392, delay: 0,   dur: 0.10 },
      { freq: 523, delay: 0.1, dur: 0.10 },
      { freq: 659, delay: 0.2, dur: 0.18 },
    ]);
  }

  playSessionEnd(): void {
    this.playSequence([
      { freq: 523, delay: 0,   dur: 0.10 },
      { freq: 392, delay: 0.1, dur: 0.10 },
      { freq: 261, delay: 0.2, dur: 0.20 },
    ]);
  }

  // ── Public: Background Music ──────────────────────────────────────────────

  /**
   * Transition to a new background music track.
   * Guard: same screen → no-op (prevents restarts on every render).
   * Fade: current track fades out over FADE_MS, new track fades in.
   */
  playMusic(screen: ScreenMusic): void {
    if (screen === this.currentMusic) return;
    this.currentMusic = screen;

    // Cancel any in-progress fade
    if (this.musicFadeTimer !== null) {
      clearTimeout(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }

    // Fade out existing track
    if (this.musicTrackGain && this.ctx) {
      const g = this.musicTrackGain;
      const now = this.ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
    }

    // Capture old nodes for deferred cleanup
    const oldNodes     = [...this.musicNodes];
    const oldLFOs      = [...this.musicLFOs];
    const oldTrackGain = this.musicTrackGain;
    this.musicNodes     = [];
    this.musicLFOs      = [];
    this.musicTrackGain = null;

    const targetScreen = screen; // capture for closure
    this.musicFadeTimer = setTimeout(() => {
      // Cleanup old oscillators
      oldNodes.forEach(n => { try { n.stop(); n.disconnect(); } catch { /* already stopped */ } });
      oldLFOs.forEach(n  => { try { n.stop(); n.disconnect(); } catch { /* already stopped */ } });
      oldTrackGain?.disconnect();

      // Only start new track if screen hasn't changed during the fade
      if (this.currentMusic === targetScreen) {
        this.startMusicTrack(targetScreen);
      }
      this.musicFadeTimer = null;
    }, FADE_MS + 50);
  }

  private startMusicTrack(screen: ScreenMusic): void {
    const config = MUSIC_CONFIGS[screen];
    if (!config) return;
    if (this.settings.muted) return;
    if (!this.resume()) return;

    const ctx      = this.ctx!;
    const musicBus = this.musicBus!;

    // Track gain — fades in
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_MS / 1000);
    trackGain.connect(musicBus);

    const oscillators: OscillatorNode[] = [];
    const lfos:        OscillatorNode[] = [];

    config.freqs.forEach((freq, i) => {
      const osc     = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = config.wave;
      osc.frequency.value = freq;
      // Keep each voice very subtle; divide by voice count so total level is consistent
      oscGain.gain.value = 0.12 / config.freqs.length;

      // Slow LFO for gentle tremolo
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15 + i * 0.03; // slightly different per voice
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      osc.connect(oscGain);
      oscGain.connect(trackGain);

      lfo.start();
      osc.start();
      oscillators.push(osc);
      lfos.push(lfo);
    });

    this.musicNodes     = oscillators;
    this.musicLFOs      = lfos;
    this.musicTrackGain = trackGain;
  }

  /** Immediately stop all music (no fade). */
  stopMusic(): void {
    this.currentMusic = null;
    if (this.musicFadeTimer !== null) {
      clearTimeout(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }
    const nodes = [...this.musicNodes];
    const lfos  = [...this.musicLFOs];
    const gain  = this.musicTrackGain;
    this.musicNodes     = [];
    this.musicLFOs      = [];
    this.musicTrackGain = null;
    nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch { /* ok */ } });
    lfos.forEach(n  => { try { n.stop(); n.disconnect(); } catch { /* ok */ } });
    gain?.disconnect();
  }

  // ── Public: Narration ─────────────────────────────────────────────────────

  getNarrationState(): NarrationState { return this._narrationState; }

  /**
   * Start narrating a story.
   * Tries pre-generated audio file first; falls back to SpeechSynthesis.
   * @param storyId   — used to construct /audio/stories/{id}.mp3 path
   * @param text      — full story text for SpeechSynthesis fallback
   * @param onBoundary — called with charIndex on each word/sentence boundary
   * @param onEnd      — called when narration finishes naturally
   */
  async startNarration(
    storyId:     string,
    text:        string,
    onBoundary?: (charIndex: number) => void,
    onEnd?:      () => void,
  ): Promise<void> {
    this.stopNarration(); // cancel any existing narration cleanly
    if (this.settings.muted) return;

    this._onBoundary = onBoundary ?? null;
    this._onEnd      = onEnd ?? null;
    this._narrationState = 'playing'; // optimistic — corrected on error

    // Try pre-generated file first
    const audioUrl = `/audio/stories/${storyId}.mp3`;
    const hasFile  = await this.probeFile(audioUrl);
    if (this._narrationState !== 'playing') return; // stopNarration() called during probe

    if (hasFile) {
      this.startFileNarration(audioUrl);
    } else {
      this.startSpeechNarration(text);
    }
  }

  private async probeFile(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private startFileNarration(url: string): void {
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
      this._narrationState = 'idle';
      this.narrationAudio = null;
    };
    this.narrationAudio = audio;
    audio.play().catch(() => { this._narrationState = 'idle'; });
  }

  private startSpeechNarration(text: string): void {
    if (!('speechSynthesis' in window)) {
      this._narrationState = 'idle';
      return;
    }

    const utterance   = new SpeechSynthesisUtterance(text);
    utterance.lang    = 'en-US';
    utterance.rate    = this.settings.narrationRate;
    utterance.volume  = this.settings.narrationVolume;

    // Voice selection — deferred to allow Chrome's async voice list
    const assignVoice = () => {
      const voices   = speechSynthesis.getVoices();
      const preferred = ['Microsoft David', 'Microsoft Aria', 'Google US English'];
      let voice: SpeechSynthesisVoice | undefined;
      for (const name of preferred) {
        voice = voices.find(v => v.name.includes(name));
        if (voice) break;
      }
      if (!voice) voice = voices.find(v => v.lang.startsWith('en'));
      if (voice)  utterance.voice = voice;
    };

    if (speechSynthesis.getVoices().length > 0) {
      assignVoice();
    } else {
      // Chrome: voices load asynchronously
      speechSynthesis.onvoiceschanged = () => {
        assignVoice();
        speechSynthesis.onvoiceschanged = null;
      };
    }

    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === 'word' || e.name === 'sentence') {
        this._onBoundary?.(e.charIndex);
      }
    };

    utterance.onend = () => {
      this._narrationState = 'idle';
      const cb = this._onEnd;
      this._onEnd = null;
      cb?.();
    };

    utterance.onerror = () => { this._narrationState = 'idle'; };

    this.utterance = utterance;
    speechSynthesis.speak(utterance);
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

  /** Cancel narration immediately. Safe to call at any time or in cleanup. */
  stopNarration(): void {
    this._onEnd      = null; // prevent stale callback after unmount
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
    // SpeechSynthesis volume cannot be changed mid-utterance — takes effect on next play
    this.saveSettings();
  }

  setNarrationRate(r: number): void {
    this.settings.narrationRate = r;
    if (this.narrationAudio) {
      this.narrationAudio.playbackRate = r;
    }
    // SpeechSynthesis rate cannot be changed mid-utterance — takes effect on next play
    this.saveSettings();
  }

  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.applyMute();
    this.saveSettings();
  }

  /** Set muted state explicitly (e.g. on session restore). */
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
    if (this.narrationAudio) {
      this.narrationAudio.volume = this.settings.muted ? 0 : this.settings.narrationVolume;
    }
    if (this.settings.muted && this._narrationState === 'playing') {
      this.pauseNarration();
    }
  }

  // ── Private: Settings persistence ────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/**
 * Application-wide singleton. Import and use via useAudio() in components.
 * Do NOT call `new AudioService()` anywhere else.
 */
export const audioService = new AudioService();
