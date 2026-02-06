import { describe, expect, it } from 'vitest';
import {
  KID_PROGRESS_KEY,
  buildLevelStory,
  loadKidProgress,
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
});
