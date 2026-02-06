import { describe, expect, it } from 'vitest';
import {
  buildCoachMessage,
  findSingleCandidateHint,
  getRewardDelta,
} from '../src/game/kidMode';

describe('kid mode helpers', () => {
  it('gives one star for every 3-correct streak', () => {
    expect(getRewardDelta(1)).toBe(0);
    expect(getRewardDelta(2)).toBe(0);
    expect(getRewardDelta(3)).toBe(1);
    expect(getRewardDelta(6)).toBe(1);
  });

  it('finds a single-candidate cell as step hint', () => {
    const board = [
      [1, 2, 3, 0, 0, 0, 0, 0, 0],
      [4, 5, 6, 0, 0, 0, 0, 0, 0],
      [7, 8, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const givens = board.map((row) => row.map((value) => value !== 0));
    const hint = findSingleCandidateHint(board, givens);
    expect(hint).not.toBeNull();
    if (hint) {
      expect(hint.row).toBe(2);
      expect(hint.col).toBe(2);
      expect(hint.value).toBe(9);
    }
  });

  it('builds child-friendly coach messages', () => {
    expect(buildCoachMessage('correct')).toContain('太棒了');
    expect(buildCoachMessage('wrong')).toContain('没关系');
    expect(buildCoachMessage('step-hint', 4)).toContain('4');
  });
});
