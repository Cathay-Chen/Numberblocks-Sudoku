import { describe, expect, it } from 'vitest';
import {
  conflictForPlacement,
  countKidSolutions,
  describeLastInHouse,
  findLastInHouse,
  isKidGridComplete,
} from '../src/kid-adventure/rules';

describe('4x4 visible rules', () => {
  it('does not treat a latin square with a broken box as complete', () => {
    const latinButNotSudoku = [
      [1, 2, 3, 4],
      [2, 1, 4, 3],
      [3, 4, 1, 2],
      [4, 3, 2, 1],
    ];
    expect(isKidGridComplete(latinButNotSudoku)).toBe(false);
  });

  it('accepts a full grid that satisfies row, column, and box', () => {
    const solved = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];
    expect(isKidGridComplete(solved)).toBe(true);
    expect(countKidSolutions(solved)).toBe(1);
  });

  it('counts an empty row duplicate without needing an answer key', () => {
    const board = [
      [1, 2, 3, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(conflictForPlacement(board, 0, 3, 1)?.house).toBe('row');
    expect(conflictForPlacement(board, 0, 3, 4)).toBeNull();
  });

  it('describes a last-in-house step from the numbers already seen', () => {
    const board = [
      [1, 2, 3, 0],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];
    const step = findLastInHouse(board);
    expect(step).toMatchObject({ row: 0, col: 3, value: 4, house: 'row' });
    expect(describeLastInHouse(step!)).toBe('这一行已经有 1、2、3，这里是 4');
  });

  it('rejects a partial board even when filled cells do not repeat', () => {
    const partial = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 0],
    ];
    expect(isKidGridComplete(partial)).toBe(false);
  });
});
