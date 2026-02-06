import { describe, expect, it } from 'vitest';
import {
  KID_LEVELS,
  computeUnlockedLevels,
  createKidLevelState,
  isKidLevelSolved,
} from '../src/kid-adventure/engine';

describe('kid adventure engine', () => {
  it('creates a playable 4x4 level state', () => {
    const state = createKidLevelState(1);
    expect(state.board.length).toBe(4);
    expect(state.board[0].length).toBe(4);
    expect(state.solution.length).toBe(4);
    expect(state.levelId).toBe(1);
  });

  it('detects solved board correctly', () => {
    const level = KID_LEVELS[0];
    expect(isKidLevelSolved(level.solution, level.solution)).toBe(true);
    const broken = level.solution.map((row) => row.slice());
    broken[0][0] = 0;
    expect(isKidLevelSolved(broken, level.solution)).toBe(false);
  });

  it('unlocks more levels after collecting stars', () => {
    expect(computeUnlockedLevels(0)).toBe(2);
    expect(computeUnlockedLevels(2)).toBe(3);
    expect(computeUnlockedLevels(6)).toBe(5);
  });
});
