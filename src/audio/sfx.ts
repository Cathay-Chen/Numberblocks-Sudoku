type SfxName = 'uiClick' | 'correct' | 'wrong' | 'win';

const SFX_FILES: Record<SfxName, string> = {
  uiClick: '/sfx/ui-click.wav',
  correct: '/sfx/chinaz-success-210622059011.wav',
  wrong: '/sfx/chinaz-wrong.wav',
  win: '/sfx/chinaz-win.wav',
};

class SfxPlayer {
  private readonly cache = new Map<SfxName, HTMLAudioElement>();
  private masterVolume = 1;
  private uiEnabled = true;
  private feedbackEnabled = true;

  play(
    name: SfxName,
    options: {
      volume?: number;
      rate?: number;
      delayMs?: number;
    } = {}
  ) {
    if (typeof window === 'undefined') return;
    if (name === 'uiClick' && !this.uiEnabled) return;
    if (name !== 'uiClick' && !this.feedbackEnabled) return;
    const { volume = 0.6, rate = 1, delayMs = 0 } = options;

    let base = this.cache.get(name);
    if (!base) {
      base = new Audio(SFX_FILES[name]);
      base.preload = 'auto';
      this.cache.set(name, base);
    }

    const playNow = () => {
      const sound = base!.cloneNode(true) as HTMLAudioElement;
      sound.volume = Math.max(0, Math.min(1, volume * this.masterVolume));
      sound.playbackRate = Math.max(0.5, Math.min(2, rate));
      void sound.play().catch(() => {
        // Ignore autoplay/runtime errors to avoid breaking game interactions.
      });
    };

    if (delayMs > 0) {
      window.setTimeout(playNow, delayMs);
    } else {
      playNow();
    }
  }

  playSuccessCue() {
    // 使用用户指定素材，双击形成"当当"
    this.play('correct', { volume: 0.8, rate: 1 });
    this.play('correct', { volume: 0.72, rate: 1, delayMs: 110 });
  }

  playFailCue() {
    // "duangduang": 两次更低沉、间隔稍长
    this.play('wrong', { volume: 0.62, rate: 0.86 });
    this.play('wrong', { volume: 0.58, rate: 0.76, delayMs: 180 });
  }

  playWinCue() {
    this.play('win', { volume: 0.75, rate: 1 });
  }

  playUiTap() {
    this.play('uiClick', { volume: 0.28, rate: 1.06 });
  }

  setMasterVolume(value: number) {
    this.masterVolume = Math.max(0, Math.min(1, value));
  }

  setUiEnabled(enabled: boolean) {
    this.uiEnabled = enabled;
  }

  setFeedbackEnabled(enabled: boolean) {
    this.feedbackEnabled = enabled;
  }

  feedbackAudible() {
    return this.feedbackEnabled && this.masterVolume > 0;
  }

  scaledVolume(base: number) {
    return Math.max(0, Math.min(1, base * this.masterVolume));
  }
}

export const sfx = new SfxPlayer();
