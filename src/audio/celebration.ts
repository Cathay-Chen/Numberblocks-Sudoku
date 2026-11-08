import { sfx } from './sfx';

const PLACE_SRC = '/sfx/chinaz-correct.wav';
const MISS_SRC = '/sfx/chinaz-wrong.wav';
const BOARD_SRC = '/sfx/chinaz-win.wav';
const PLACE_SKIP_SEC = 0.46;
const BOARD_GAIN = 2.2;

// chinaz-correct.wav 前 0.46 秒几乎没声音，响的一段在后面。从那里开始播，不再提前掐断。
export const playbackPlan = (kind: CelebrationKind, durationSec: number) => {
  const safeDuration = Math.max(0, durationSec);
  if (kind === 'place' && safeDuration > PLACE_SKIP_SEC + 0.2) {
    return {
      startSec: PLACE_SKIP_SEC,
      playMs: Math.round((safeDuration - PLACE_SKIP_SEC) * 1000),
    };
  }
  return { startSec: 0, playMs: Math.round(safeDuration * 1000) };
};

let sharedContext: AudioContext | null = null;

const boostBoard = (audio: CelebrationAudio) => {
  if (typeof HTMLAudioElement === 'undefined' || !(audio instanceof HTMLAudioElement)) return;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!sharedContext || sharedContext.state === 'closed') sharedContext = new Ctx();
    void sharedContext.resume();
    const source = sharedContext.createMediaElementSource(audio);
    const gain = sharedContext.createGain();
    gain.gain.value = BOARD_GAIN;
    source.connect(gain);
    gain.connect(sharedContext.destination);
  } catch {
    // 接不上增益时，元素仍走自己的输出。
  }
};

export type CelebrationKind = 'place' | 'miss' | 'board';

export type CelebrationAudio = {
  volume: number;
  preload: string;
  play: () => Promise<void>;
  pause: () => void;
  currentTime: number;
};

const browserAudio = (src: string): CelebrationAudio => {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
};

const sourceFor = (kind: CelebrationKind) =>
  kind === 'board' ? BOARD_SRC : kind === 'miss' ? MISS_SRC : PLACE_SRC;

const volumeFor = (kind: CelebrationKind) => (kind === 'board' ? 1 : kind === 'miss' ? 0.5 : 0.55);

export class CelebrationSounds {
  private current: CelebrationAudio | null = null;
  private node: AudioBufferSourceNode | null = null;
  private timer = 0;
  private generation = 0;
  private feedbackAt = 0;
  private createAudio: (src: string) => CelebrationAudio;
  private buffers = new Map<string, AudioBuffer>();

  constructor(createAudio: (src: string) => CelebrationAudio = browserAudio) {
    this.createAudio = createAudio;
  }

  feedbackJustPlayed() {
    return Date.now() - this.feedbackAt < 40;
  }

  play(kind: CelebrationKind) {
    this.stop();
    if (!sfx.feedbackAudible()) return;
    this.feedbackAt = Date.now();
    const generation = ++this.generation;
    if (this.createAudio !== browserAudio || typeof AudioContext === 'undefined') {
      this.playElement(kind, generation);
      return;
    }
    void this.playBuffer(kind, generation);
  }

  private playElement(kind: CelebrationKind, generation: number) {
    const src = sourceFor(kind);
    let audio: CelebrationAudio;
    try {
      audio = this.createAudio(src);
    } catch {
      return;
    }
    audio.volume = sfx.scaledVolume(volumeFor(kind));
    if (kind === 'board') boostBoard(audio);
    this.current = audio;
    const plan = playbackPlan(kind, 1.2);
    this.timer = globalThis.setTimeout(() => {
      if (generation !== this.generation) return;
      this.stop();
    }, plan.playMs);
    void audio.play().catch(() => {
      if (generation === this.generation) this.stop();
    });
  }

  private async playBuffer(kind: CelebrationKind, generation: number) {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      this.playElement(kind, generation);
      return;
    }
    try {
      if (!sharedContext || sharedContext.state === 'closed') sharedContext = new Ctx();
      await sharedContext.resume();
      const src = sourceFor(kind);
      let buffer = this.buffers.get(src);
      if (!buffer) {
        const response = await fetch(src);
        const data = await response.arrayBuffer();
        buffer = await sharedContext.decodeAudioData(data.slice(0));
        this.buffers.set(src, buffer);
      }
      if (generation !== this.generation || !sharedContext) return;
      const plan = playbackPlan(kind, buffer.duration);
      const node = sharedContext.createBufferSource();
      node.buffer = buffer;
      const gain = sharedContext.createGain();
      gain.gain.value = sfx.scaledVolume(volumeFor(kind)) * (kind === 'board' ? BOARD_GAIN : 1);
      node.connect(gain);
      gain.connect(sharedContext.destination);
      const offset = Math.min(plan.startSec, Math.max(0, buffer.duration - 0.05));
      node.start(0, offset);
      this.node = node;
      this.timer = globalThis.setTimeout(() => {
        if (generation !== this.generation) return;
        this.stop();
      }, plan.playMs + 40);
    } catch {
      if (generation === this.generation) this.playElement(kind, generation);
    }
  }

  stop() {
    this.generation += 1;
    if (this.timer) {
      globalThis.clearTimeout(this.timer);
      this.timer = 0;
    }
    if (this.node) {
      try {
        this.node.stop();
      } catch {
        // 已经停过。
      }
      this.node = null;
    }
    if (!this.current) return;
    this.current.pause();
    this.current.currentTime = 0;
    this.current = null;
  }
}

export const cheers = new CelebrationSounds();
