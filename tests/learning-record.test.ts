import { describe, expect, it } from 'vitest';
import { kidSoloLine, readLearning, recordAttempt } from '../src/kid-adventure/learning';
import { continuation, lessonParentLines, nextLessonStep, pathIsClear } from '../src/kid-adventure/lessons';
import { chooseOpening } from '../src/kid-adventure/opening';
import {
  KID_PROGRESS_BACKUP_KEY,
  KID_PROGRESS_KEY,
  loadKidProgress,
  progressCanBeReplaced,
  saveKidProgress,
} from '../src/kid-adventure/progression';

const memory = (seed?: Record<string, string>) => {
  const data = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

describe('learning record', () => {
  it('keeps old stars and adds a versioned record without inventing speed', () => {
    const storage = memory();
    saveKidProgress(storage, {
      stars: 18,
      levelStars: [3, 3, 3, 3, 3, 3],
      warmupDone: true,
    });
    const withLesson = recordAttempt(null, 'seat-demo', { hints: 2, mistakes: 1, done: true });
    saveKidProgress(storage, {
      stars: 18,
      levelStars: [3, 3, 3, 3, 3, 3],
      warmupDone: true,
      learning: withLesson,
    });
    const loaded = loadKidProgress(storage);
    expect(loaded?.stars).toBe(18);
    expect(loaded?.levelStars).toEqual([3, 3, 3, 3, 3, 3]);
    expect(loaded?.learning?.v).toBe(1);
    expect(loaded?.learning?.activities['seat-demo']).toEqual({ hints: 2, mistakes: 1, done: true });
    expect(JSON.stringify(loaded)).not.toContain('秒');
    expect(JSON.stringify(loaded)).not.toContain('年龄');
  });

  it('reads a star file that has no learning field', () => {
    const storage = memory({
      [KID_PROGRESS_KEY]: JSON.stringify({ stars: 7, levelStars: [3, 2, 1, 1, 0, 0] }),
    });
    const loaded = loadKidProgress(storage);
    expect(loaded?.stars).toBe(7);
    expect(loaded?.learning).toBeUndefined();
  });

  it('ignores an unknown learning version and still returns the stars', () => {
    const storage = memory({
      [KID_PROGRESS_KEY]: JSON.stringify({
        stars: 9,
        levelStars: [3, 3, 3, 0, 0, 0],
        learning: { v: 9, activities: { mystery: true } },
      }),
    });
    const loaded = loadKidProgress(storage);
    expect(loaded?.stars).toBe(9);
    expect(loaded?.learning).toBeUndefined();
    saveKidProgress(storage, { stars: loaded!.stars, levelStars: loaded!.levelStars, warmupDone: true });
    expect(storage.getItem(KID_PROGRESS_KEY)).toContain('"v":9');
    expect(storage.getItem(KID_PROGRESS_KEY)).toContain('"stars":9');
  });

  it('backs up an unreadable file and refuses to replace it', () => {
    const storage = memory({ [KID_PROGRESS_KEY]: '{stars' });
    expect(loadKidProgress(storage)).toBeNull();
    expect(storage.getItem(KID_PROGRESS_BACKUP_KEY)).toBe('{stars');
    expect(progressCanBeReplaced(storage)).toBe(false);
    expect(storage.getItem(KID_PROGRESS_KEY)).toBe('{stars');
  });

  it('tells the child only when this attempt used no hints', () => {
    expect(kidSoloLine(0)).toBe('你自己找齐了。');
    expect(kidSoloLine(1)).toBeNull();
    const lines = lessonParentLines(recordAttempt(null, 'seat-practice', { hints: 3, mistakes: 2, done: true }));
    expect(lines.some((line) => line.includes('自己练') && line.includes('看一步 3') && line.includes('放重 2'))).toBe(true);
    expect(lines.some((line) => line.includes('新方法示范：还没做完'))).toBe(true);
  });

  it('opens the new method only after the six path levels have stars', () => {
    expect(pathIsClear([3, 3, 3, 3, 3, 0])).toBe(false);
    expect(pathIsClear([3, 3, 3, 3, 3, 3])).toBe(true);
    expect(chooseOpening({ totalStars: 15, levelStars: [3, 3, 3, 3, 3, 0], saved: null, learning: null })).toEqual({
      kind: 'path',
      levelId: 6,
      restore: false,
    });
    expect(chooseOpening({ totalStars: 18, levelStars: [3, 3, 3, 3, 3, 3], saved: null, learning: null })).toEqual({
      kind: 'lesson',
      id: 'seat-demo',
      restore: false,
    });
    const learning = recordAttempt(null, 'seat-demo', { hints: 0, mistakes: 0, done: true });
    expect(continuation(learning)).toEqual({ id: 'seat-practice', label: '自己练' });
    expect(nextLessonStep('seat-practice').id).toBe('review-row');
    expect(nextLessonStep('review-mix').id).toBe('review-row');
    expect(readLearning({ v: 2 })).toBeUndefined();
  });
});
