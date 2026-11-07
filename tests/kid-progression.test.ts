import { describe, expect, it } from 'vitest';
import {
  KID_PROGRESS_KEY,
  buildLevelStory,
  loadKidProgress,
  resolveWarmupDone,
  saveKidProgress,
  type KidProgress,
} from '../src/kid-adventure/progression';

describe('kid progression', () => {
  it('builds story messages per level', () => {
    const story = buildLevelStory(2);
    expect(story.title).toContain('泡泡河');
    expect(story.voiceText.length).toBeGreaterThan(6);
  });

  it('reads and writes progress with storage adapter', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    };

    const payload: KidProgress = {
      stars: 7,
      levelStars: [3, 2, 1, 1, 0, 0],
    };

    saveKidProgress(storage, payload);
    expect(memory.has(KID_PROGRESS_KEY)).toBe(true);

    const loaded = loadKidProgress(storage);
    expect(loaded).toEqual(payload);
  });

  it('keeps old star records and does not force the warmup again', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    };
    memory.set(
      KID_PROGRESS_KEY,
      JSON.stringify({ stars: 7, levelStars: [3, 2, 1, 1, 0, 0] })
    );

    const loaded = loadKidProgress(storage);
    expect(loaded?.stars).toBe(7);
    expect(loaded?.levelStars).toEqual([3, 2, 1, 1, 0, 0]);
    expect(loaded?.warmupDone).toBeUndefined();
    expect(resolveWarmupDone(loaded!)).toBe(true);
  });

  it('can remember an explicit replay request without erasing stars', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    };
    const payload: KidProgress = {
      stars: 3,
      levelStars: [3, 0, 0, 0, 0, 0],
      warmupDone: false,
    };
    saveKidProgress(storage, payload);
    const loaded = loadKidProgress(storage);
    expect(loaded).toEqual(payload);
    expect(resolveWarmupDone(loaded!)).toBe(false);
  });
});
