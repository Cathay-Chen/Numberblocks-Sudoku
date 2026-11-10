import { describe, expect, it } from 'vitest';
import { createKidPlay, createLessonPlay, placeKidNumber } from '../src/kid-adventure/play';
import { KID_SESSION_KEY, parseKidSession, restoreKidPlay, saveKidSession } from '../src/kid-adventure/session';

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

describe('kid board session', () => {
  it('restores a placed digit and its undo stack without touching stars', () => {
    const storage = memory();
    storage.setItem('numberblocks.kid-progress.v1', JSON.stringify({ stars: 3, levelStars: [3, 0, 0, 0, 0, 0] }));
    const placed = placeKidNumber({ ...createKidPlay(1), selected: { row: 0, col: 3 } }, 4);
    saveKidSession(storage, placed);
    const session = parseKidSession(storage.getItem(KID_SESSION_KEY));
    expect(session?.board[0][3]).toBe(4);
    expect(session?.past).toHaveLength(1);
    const restored = restoreKidPlay(createKidPlay(1), session!);
    expect(restored.board[0][3]).toBe(4);
    expect(restored.givens[0][0]).toBe(true);
    expect(storage.getItem('numberblocks.kid-progress.v1')).toContain('"stars":3');
  });

  it('drops a corrupt session and a session that overwrites a given', () => {
    expect(parseKidSession('not-json')).toBeNull();
    expect(parseKidSession(null)).toBeNull();
    const broken = parseKidSession(
      JSON.stringify({
        levelId: 1,
        board: [
          [2, 2, 3, 0],
          [3, 4, 0, 2],
          [2, 0, 4, 3],
          [0, 3, 2, 1],
        ],
        past: [],
        future: [],
        selected: null,
      })
    );
    expect(broken).toBeNull();
  });

  it('remembers the chosen level when that level is still empty', () => {
    const storage = memory();
    saveKidSession(storage, createKidPlay(4));
    expect(parseKidSession(storage.getItem(KID_SESSION_KEY))?.levelId).toBe(4);
  });

  it('restores a versioned lesson without touching the star file', () => {
    const storage = memory();
    storage.setItem('numberblocks.kid-progress.v1', JSON.stringify({ stars: 18, levelStars: [3, 3, 3, 3, 3, 3] }));
    const started = createLessonPlay('seat-demo');
    expect(started).not.toBeNull();
    const hinted = { ...started!, hintsUsed: 2, tried: 1, selected: { row: 0, col: 0 } };
    const placed = placeKidNumber(hinted, 1);
    saveKidSession(storage, placed);
    const session = parseKidSession(storage.getItem(KID_SESSION_KEY));
    expect(session?.v).toBe(1);
    expect(session?.lessonId).toBe('seat-demo');
    expect(session?.board[0][0]).toBe(1);
    expect(session?.hintsUsed).toBe(2);
    expect(session?.mistakes).toBe(1);
    const restored = restoreKidPlay(createLessonPlay('seat-demo')!, session!);
    expect(restored.board[0][0]).toBe(1);
    expect(restored.hintsUsed).toBe(2);
    expect(restored.tried).toBe(1);
    expect(storage.getItem('numberblocks.kid-progress.v1')).toContain('"stars":18');
  });

  it('drops an unversioned lesson id and a lesson that overwrites a given', () => {
    const demo = createLessonPlay('seat-demo')!;
    expect(
      parseKidSession(
        JSON.stringify({
          lessonId: 'seat-demo',
          board: demo.board,
          past: [],
          future: [],
          selected: null,
        })
      )
    ).toBeNull();
    const broken = demo.board.map((row) => row.slice());
    broken[2][0] = 1;
    expect(
      parseKidSession(
        JSON.stringify({
          v: 1,
          lessonId: 'seat-demo',
          board: broken,
          past: [],
          future: [],
          selected: null,
        })
      )
    ).toBeNull();
    expect(parseKidSession('{')).toBeNull();
  });
});
