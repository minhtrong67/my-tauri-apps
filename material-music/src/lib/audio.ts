import { convertFileSrc } from '@tauri-apps/api/core';
import { tr } from './i18n';

export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_LABELS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  rock: [5, 3, -1, -3, -1, 2, 4, 5, 5, 5],
  pop: [-1, 2, 4, 5, 3, 0, -1, -1, -1, -2],
  jazz: [3, 2, 0, 2, -2, -2, 0, 2, 3, 4],
  classical: [4, 3, 3, 2, -1, -1, 0, 2, 3, 4],
  edm: [6, 5, 3, 0, 0, -2, -1, 0, 3, 4],
};

interface Deck {
  audio: HTMLAudioElement;
  node: MediaElementAudioSourceNode | null;
  rg: GainNode | null;
  path: string | null;
  /** Crossfade factor 0..1 */
  fade: number;
  /** ReplayGain as a linear factor */
  rgLin: number;
  fallbackTried: boolean;
}

interface Fade {
  out: Deck;
  inn: Deck;
  start: number;
  /** ms; 0 = gapless hand-over (the old song just plays its last moments) */
  dur: number;
}

const GAPLESS_LEAD = 0.06;

/**
 * Playback engine: two HTMLAudioElement "decks" (the next song is preloaded on the idle one so songs can be
 * gapless / crossfaded) + an optional Web Audio chain (ReplayGain, EQ, visualizer).
 * If the asset protocol does not allow CORS the engine plays directly, without Web Audio (ReplayGain then only attenuates).
 */
class Engine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  eqEnabled = false;
  eqGains: number[] = Array(10).fill(0);
  preampDb = 0;
  corsFailed = false;

  private decks: [Deck, Deck];
  private cur = 0;
  private preamp: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private corsOk = false;
  private pendingStart = 0;
  private wantPlay = false;
  private freq = new Uint8Array(0);
  private vol = 0.8;
  private muted = false;
  private rate = 1;
  private crossfadeSec = 0;
  private fading: Fade | null = null;
  private nextPath: string | null = null;
  private nextRg = 0;
  private preloaded: string | null = null;
  private justAdvanced: string | null = null;
  private justTimer: number | undefined;

  onEnded: () => void = () => {};
  onError: (msg: string) => void = () => {};
  onTime: (t: number) => void = () => {};
  onDuration: (d: number) => void = () => {};
  onPlayState: (p: boolean) => void = () => {};
  onPlaying: () => void = () => {};
  /** The next song has already started on the other deck (gapless / crossfade): the app should move its queue forward */
  onAutoAdvance: () => void = () => {};

  constructor() {
    const mk = (): Deck => {
      const a = new Audio();
      a.preload = 'auto';
      a.crossOrigin = 'anonymous';
      return { audio: a, node: null, rg: null, path: null, fade: 1, rgLin: 1, fallbackTried: false };
    };
    this.decks = [mk(), mk()];
    for (const d of this.decks) {
      const a = d.audio;
      a.addEventListener('timeupdate', () => d === this.active && this.onTime(a.currentTime));
      a.addEventListener('durationchange', () => {
        if (d === this.active && isFinite(a.duration)) this.onDuration(a.duration);
      });
      a.addEventListener('ended', () => this.handleEnded(d));
      a.addEventListener('play', () => d === this.active && this.onPlayState(true));
      a.addEventListener('pause', () => d === this.active && this.onPlayState(false));
      a.addEventListener('playing', () => d === this.active && this.onPlaying());
      a.addEventListener('loadedmetadata', () => this.handleLoaded(d));
      a.addEventListener('error', () => this.handleError(d));
    }
    window.setInterval(() => this.tick(), 40);
  }

  private get active() {
    return this.decks[this.cur];
  }
  private get idle() {
    return this.decks[1 - this.cur];
  }

  /** Element of the deck that is currently the "main" one */
  get audio(): HTMLAudioElement {
    return this.active.audio;
  }
  get path(): string | null {
    return this.active.path;
  }
  get fxAvailable() {
    return !this.corsFailed;
  }

  // ---------- loading ----------

  private prepare(d: Deck, path: string) {
    d.path = path;
    d.fallbackTried = false;
    if (this.corsFailed) d.audio.removeAttribute('crossorigin');
    else d.audio.crossOrigin = 'anonymous';
    d.audio.src = convertFileSrc(path);
    d.audio.load();
  }

  load(path: string, play: boolean, startAt = 0, rgDb = 0) {
    // the next song was already started by a gapless / crossfade hand-over: nothing to load
    if (this.justAdvanced === path && this.active.path === path) {
      this.justAdvanced = null;
      this.setReplayGain(rgDb);
      return;
    }
    this.finishFade();
    const idle = this.idle;
    idle.audio.pause();
    this.preloaded = null;
    const d = this.active;
    d.fade = 1;
    d.rgLin = Math.pow(10, rgDb / 20);
    this.pendingStart = startAt;
    this.wantPlay = play;
    this.prepare(d, path);
    this.applyVolumes();
    if (play) void this.play();
  }

  /** Tell the engine which song comes next (null = none): it is preloaded on the idle deck */
  setNext(path: string | null, rgDb = 0) {
    this.nextPath = path;
    this.nextRg = rgDb;
    if (this.fading) return; // applied when the hand-over is over
    this.applyNext();
  }

  private applyNext() {
    const idle = this.idle;
    const path = this.nextPath;
    if (!path) {
      if (this.preloaded) {
        idle.audio.pause();
        idle.audio.removeAttribute('src');
        idle.path = null;
        this.preloaded = null;
      }
      return;
    }
    idle.rgLin = Math.pow(10, this.nextRg / 20);
    if (this.preloaded !== path) {
      idle.audio.pause();
      idle.fade = 1;
      this.prepare(idle, path);
      this.preloaded = path;
    }
    this.applyVolumes();
  }

  setCrossfade(sec: number) {
    this.crossfadeSec = Math.max(0, Math.min(12, sec));
  }

  private handleLoaded(d: Deck) {
    const a = d.audio;
    if (d === this.active && this.pendingStart > 0) {
      try {
        a.currentTime = this.pendingStart;
      } catch {
        /* ignore */
      }
      this.pendingStart = 0;
    }
    if (a.crossOrigin !== null) {
      this.corsOk = true;
      if (d === this.active && !a.paused) this.ensureGraph();
    } else if (d.fallbackTried) {
      this.corsFailed = true;
    }
  }

  private handleError(d: Deck) {
    const a = d.audio;
    if (!d.fallbackTried && !this.corsOk && a.crossOrigin !== null && d.path && !this.ctx) {
      d.fallbackTried = true;
      a.removeAttribute('crossorigin');
      a.src = convertFileSrc(d.path);
      a.load();
      if (d === this.active && this.wantPlay) void this.play();
      return;
    }
    if (d !== this.active) {
      // the preloaded song cannot be read: forget it, the normal "ended" path will report the problem
      if (this.preloaded === d.path) this.preloaded = null;
      return;
    }
    this.onError(a.error?.message || tr('cannotPlayFile'));
  }

  private handleEnded(d: Deck) {
    if (this.fading && d === this.fading.out) {
      this.finishFade();
      return;
    }
    if (d !== this.active) return;
    // safety net when the timer missed the end of the song
    if (this.preloaded && this.nextPath === this.preloaded) {
      this.startTransition(0);
      return;
    }
    this.onEnded();
  }

  // ---------- gapless / crossfade ----------

  private tick() {
    const f = this.fading;
    if (f) {
      if (f.dur > 0) {
        const t = Math.min(1, (performance.now() - f.start) / f.dur);
        f.inn.fade = Math.sin((t * Math.PI) / 2);
        f.out.fade = Math.cos((t * Math.PI) / 2);
        this.applyVolumes();
        if (t >= 1) this.finishFade();
      } else if (f.out.audio.paused || f.out.audio.ended) {
        this.finishFade();
      }
      return;
    }
    const a = this.active.audio;
    if (!this.preloaded || a.paused || !isFinite(a.duration) || a.duration <= 0) return;
    const remaining = (a.duration - a.currentTime) / (a.playbackRate || 1);
    const cf = this.crossfadeSec > 0 ? Math.min(this.crossfadeSec, a.duration / 3) : 0;
    const lead = cf > 0 ? cf : GAPLESS_LEAD;
    if (remaining <= lead) this.startTransition(cf);
  }

  private startTransition(fadeSec: number) {
    const inn = this.idle;
    const out = this.active;
    if (!this.preloaded || inn.path !== this.preloaded) return;
    this.fading = { out, inn, start: performance.now(), dur: fadeSec * 1000 };
    this.cur = 1 - this.cur;
    inn.fade = fadeSec > 0 ? 0 : 1;
    out.fade = 1;
    this.preloaded = null;
    this.justAdvanced = inn.path;
    window.clearTimeout(this.justTimer);
    this.justTimer = window.setTimeout(() => (this.justAdvanced = null), 2500);
    this.wantPlay = true;
    try {
      inn.audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    this.applyVolumes();
    if (this.corsOk) this.ensureGraph();
    void inn.audio.play().catch(() => undefined);
    this.onAutoAdvance(); // the app moves its queue first, so the duration below is attributed to the right song
    if (isFinite(inn.audio.duration)) this.onDuration(inn.audio.duration);
    this.onPlayState(true);
  }

  private finishFade() {
    const f = this.fading;
    if (!f) return;
    this.fading = null;
    f.out.audio.pause();
    f.out.fade = 1;
    f.inn.fade = 1;
    this.applyVolumes();
    this.applyNext();
  }

  // ---------- Web Audio ----------

  private ensureGraph() {
    if (this.ctx || !this.corsOk || this.corsFailed) return;
    try {
      const ctx = new AudioContext();
      const preamp = ctx.createGain();
      const filters = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking';
        f.frequency.value = EQ_FREQS[i];
        f.Q.value = 1;
        f.gain.value = 0;
        return f;
      });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      for (const d of this.decks) {
        const node = ctx.createMediaElementSource(d.audio);
        const rg = ctx.createGain();
        node.connect(rg);
        rg.connect(preamp);
        d.node = node;
        d.rg = rg;
      }
      let node: AudioNode = preamp;
      for (const f of filters) {
        node.connect(f);
        node = f;
      }
      node.connect(analyser);
      analyser.connect(ctx.destination);
      this.ctx = ctx;
      this.preamp = preamp;
      this.filters = filters;
      this.analyser = analyser;
      this.freq = new Uint8Array(analyser.frequencyBinCount);
      this.applyEq();
      this.applyVolumes();
    } catch {
      this.corsFailed = true;
    }
  }

  private applyVolumes() {
    for (const d of this.decks) {
      // with Web Audio the ReplayGain lives in a GainNode (can boost); without it only attenuation is possible
      const viaNode = !!d.rg;
      if (d.rg) d.rg.gain.value = d.rgLin;
      d.audio.volume = Math.min(1, Math.max(0, this.vol * d.fade * (viaNode ? 1 : Math.min(1, d.rgLin))));
      d.audio.muted = this.muted;
    }
  }

  /** ReplayGain (dB) of the song that is playing */
  setReplayGain(db: number) {
    this.active.rgLin = Math.pow(10, db / 20);
    this.applyVolumes();
  }

  // ---------- transport ----------

  play() {
    this.wantPlay = true;
    if (this.corsOk) this.ensureGraph();
    void this.ctx?.resume();
    return this.active.audio.play().catch(() => undefined);
  }

  pause() {
    this.wantPlay = false;
    this.finishFade();
    this.active.audio.pause();
  }

  toggle() {
    if (this.active.audio.paused) void this.play();
    else this.pause();
  }

  seek(t: number) {
    const a = this.active.audio;
    if (a.readyState < 1) this.pendingStart = t;
    else a.currentTime = t;
  }

  setVolume(v: number, muted: boolean) {
    this.vol = Math.min(1, Math.max(0, v));
    this.muted = muted;
    this.applyVolumes();
  }

  setRate(r: number) {
    this.rate = r;
    for (const d of this.decks) {
      d.audio.defaultPlaybackRate = r;
      d.audio.playbackRate = r;
    }
  }

  setEq(enabled: boolean, gains: number[], preampDb: number) {
    this.eqEnabled = enabled;
    this.eqGains = gains;
    this.preampDb = preampDb;
    this.applyEq();
  }

  private applyEq() {
    if (!this.ctx || !this.preamp) return;
    this.preamp.gain.value = this.eqEnabled ? Math.pow(10, this.preampDb / 20) : 1;
    this.filters.forEach((f, i) => (f.gain.value = this.eqEnabled ? this.eqGains[i] ?? 0 : 0));
  }

  getSpectrum(): Uint8Array | null {
    if (!this.analyser || this.active.audio.paused) return null;
    this.analyser.getByteFrequencyData(this.freq);
    return this.freq;
  }
}

export const engine = new Engine();
