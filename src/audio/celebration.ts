import { sfx } from './sfx';

const PLACE_SRC = '/sfx/correct.wav';
const MISS_SRC = '/sfx/chinaz-wrong.wav';
const BOARD_SRC = '/sfx/chinaz-win.wav';
const PLACE_LIMIT_MS = 520;
const MISS_LIMIT_MS = 500;
const BOARD_LIMIT_MS = 1600;
const BOARD_GAIN = 2.8;

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

export class CelebrationSounds {
  private current: CelebrationAudio | null = null;
  private timer = 0;
  private generation = 0;
  private createAudio: (src: string) => CelebrationAudio;

  constructor(createAudio: (src: string) => CelebrationAudio = browserAudio) {
    this.createAudio = createAudio;
  }

  play(kind: CelebrationKind) {
    this.stop();
    if (!sfx.feedbackAudible()) return;
    const generation = ++this.generation;
    const src = kind === 'board' ? BOARD_SRC : kind === 'miss' ? MISS_SRC : PLACE_SRC;
    const base = kind === 'board' ? 1 : kind === 'miss' ? 0.55 : 0.62;
    let audio: CelebrationAudio;
    try {
      audio = this.createAudio(src);
    } catch {
      return;
    }
    audio.volume = sfx.scaledVolume(base);
    if (kind === 'board') boostBoard(audio);
    this.current = audio;
    const limit = kind === 'board' ? BOARD_LIMIT_MS : kind === 'miss' ? MISS_LIMIT_MS : PLACE_LIMIT_MS;
    this.timer = globalThis.setTimeout(() => {
      if (generation !== this.generation) return;
      this.stop();
    }, limit);
    void audio.play().catch(() => {
      if (generation === this.generation) this.stop();
    });
  }

  stop() {
    this.generation += 1;
    if (this.timer) {
      globalThis.clearTimeout(this.timer);
      this.timer = 0;
    }
    if (!this.current) return;
    this.current.pause();
    this.current.currentTime = 0;
    this.current = null;
  }
}

export const cheers = new CelebrationSounds();
