import { sfx } from './sfx';

const STEP_SRC = '/sfx/chinaz-correct.wav';
const BOARD_SRC = '/sfx/chinaz-win.wav';
const STEP_LIMIT_MS = 700;
const BOARD_LIMIT_MS = 1200;

export type CelebrationKind = 'step' | 'board';

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
    let audio: CelebrationAudio;
    try {
      audio = this.createAudio(kind === 'board' ? BOARD_SRC : STEP_SRC);
    } catch {
      return;
    }
    audio.volume = sfx.scaledVolume(kind === 'board' ? 0.42 : 0.3);
    this.current = audio;
    const limit = kind === 'board' ? BOARD_LIMIT_MS : STEP_LIMIT_MS;
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
