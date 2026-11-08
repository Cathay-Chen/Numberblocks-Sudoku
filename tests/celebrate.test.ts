import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { CelebrationSounds, type CelebrationAudio } from '../src/audio/celebration';
import { sfx } from '../src/audio/sfx';
import { cueForMove, cueForWarmup, shouldCelebrate } from '../src/kid-adventure/celebrate';
import { createKidPlay, emptyFocusTarget, greetLikeWarmup, hintKidPlay, placeKidNumber, undoKidPlay } from '../src/kid-adventure/play';
import { isKidGridComplete } from '../src/kid-adventure/rules';

const fakeAudio = () => {
  const audio: CelebrationAudio = {
    volume: 1,
    preload: '',
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    currentTime: 0,
  };
  return audio;
};

describe('completion celebration', () => {
  it('uses a light cue for a legal place, a miss cue for a clash, and a stronger cue only when the board is finished', () => {
    expect(cueForMove({ beforeComplete: false, afterComplete: false, tone: 'placed' })).toBe('place');
    expect(cueForMove({ beforeComplete: false, afterComplete: false, tone: 'conflict' })).toBe('miss');
    expect(cueForMove({ beforeComplete: false, afterComplete: true, tone: 'done' })).toBe('board');
    expect(cueForMove({ beforeComplete: true, afterComplete: true, tone: 'done' })).toBeNull();
    expect(cueForMove({ beforeComplete: false, afterComplete: false, tone: 'idle' })).toBeNull();
    expect(cueForWarmup({ beforeComplete: false, afterComplete: true, tone: 'done' })).toBe('place');
    expect(cueForWarmup({ beforeComplete: false, afterComplete: false, tone: 'conflict' })).toBe('miss');
  });

  it('places into the single empty cell a hint is already showing', () => {
    const greeted = greetLikeWarmup(createKidPlay(1));
    expect(greeted.selected).toBeNull();
    expect(emptyFocusTarget(greeted)).toEqual({ row: 0, col: 3 });
    expect(emptyFocusTarget(createKidPlay(1))).toBeNull();
  });

  it('celebrates only the transition into a finished state', () => {
    expect(shouldCelebrate(false, false)).toBe(false);
    expect(shouldCelebrate(true, true)).toBe(false);
    expect(shouldCelebrate(false, true)).toBe(true);
    expect(shouldCelebrate(true, false)).toBe(false);
  });

  it('does not treat an unfinished or conflicting board as complete', () => {
    const play = createKidPlay(1);
    const partial = placeKidNumber({ ...play, selected: { row: 0, col: 3 } }, 1);
    expect(partial.completed).toBe(false);
    expect(isKidGridComplete(partial.board)).toBe(false);
    expect(shouldCelebrate(play.completed, partial.completed)).toBe(false);
  });

  it('celebrates the last legal cell once, then again after undo', () => {
    let play = createKidPlay(1);
    const solves: boolean[] = [];
    while (!play.completed) {
      let hinted = play;
      let value: number | null = null;
      for (let step = 0; step < 4 && value == null; step += 1) {
        hinted = hintKidPlay(hinted);
        value = hinted.feedback.value;
      }
      const next = placeKidNumber(hinted, value ?? 0);
      solves.push(shouldCelebrate(play.completed, next.completed));
      play = next;
      if (solves.length > 10) break;
    }
    expect(play.completed).toBe(true);
    expect(solves.filter(Boolean)).toEqual([true]);
    const undone = undoKidPlay(play);
    expect(undone.completed).toBe(false);
    const again = placeKidNumber(
      { ...undone, selected: { row: 0, col: 3 } },
      4
    );
    expect(shouldCelebrate(undone.completed, again.completed)).toBe(isKidGridComplete(again.board));
  });

  it('plays one short cue, stays quiet when muted, and survives a rejected play', async () => {
    const made: CelebrationAudio[] = [];
    const sounds = new CelebrationSounds((src) => {
      const audio = fakeAudio();
      made.push(audio);
      void src;
      return audio;
    });
    sfx.setFeedbackEnabled(true);
    sfx.setMasterVolume(0.9);
    sounds.play('board');
    expect(made).toHaveLength(1);
    expect(made[0].volume).toBeGreaterThan(0.5);
    sounds.play('place');
    expect(made[0].pause).toHaveBeenCalled();
    expect(made).toHaveLength(2);
    expect(made[1].volume).toBeLessThan(made[0].volume);

    sfx.setFeedbackEnabled(false);
    sounds.play('board');
    expect(made).toHaveLength(2);
    sfx.setFeedbackEnabled(true);

    const failing = new CelebrationSounds(() => {
      const audio = fakeAudio();
      audio.play = vi.fn(async () => {
        throw new Error('blocked');
      });
      return audio;
    });
    expect(() => failing.play('board')).not.toThrow();
    await Promise.resolve();
    failing.stop();
    sfx.setMasterVolume(0.9);
  });

  it('keeps a still celebration when motion is reduced', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toContain('animation: none');
  });
});
