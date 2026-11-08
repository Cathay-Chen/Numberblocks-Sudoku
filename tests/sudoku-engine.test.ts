import { describe, it, expect } from 'vitest';
import { createPuzzle, countSolutions, generateSolvedBoard } from '../src/sudoku/engine';
import { createInitialState, getCandidates } from '../src/game/utils';
import { classicHintLadder, findConflicts } from '../src/sudoku/logic';

describe('sudoku engine', () => {
  it('generates a solved 9x9 board', () => {
    const board = generateSolvedBoard();
    expect(board.length).toBe(9);
    expect(board[0].length).toBe(9);
  });

  it('solved board has rows with 1-9', () => {
    const board = generateSolvedBoard();
    const row = board[0].slice().sort((a, b) => a - b);
    expect(row).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('puzzle has a unique solution', () => {
    const { puzzle } = createPuzzle('medium');
    const solutions = countSolutions(puzzle);
    expect(solutions).toBe(1);
  });

  it('difficulty sets given count ranges', () => {
    const easy = createPuzzle('easy');
    const hard = createPuzzle('hard');
    const count = (b: number[][]) => b.flat().filter((v) => v !== 0).length;
    expect(count(easy.puzzle)).toBeGreaterThan(count(hard.puzzle));
  });

  it('detects row/col/box conflicts', () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[0][0] = 5;
    board[0][3] = 5;
    const conflicts = findConflicts(board);
    expect(conflicts.size).toBeGreaterThan(0);
  });

  it('hint explains the current board and does not fill a cell', () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[0][0] = 5;
    board[0][3] = 5;
    const before = board.map((row) => row.slice());
    const steps = classicHintLadder(board);
    expect(steps[0]).toContain('先看');
    expect(steps[1]).toContain('两个 5');
    expect(board).toEqual(before);

    const almost = Array.from({ length: 9 }, () => Array(9).fill(0));
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((value, index) => {
      almost[1][index] = value;
    });
    const ladder = classicHintLadder(almost);
    expect(ladder[ladder.length - 1]).toBe('空位是 9。');
    expect(almost[1][8]).toBe(0);
  });

  it('initial game state starts with mistake guard defaults', () => {
    const state = createInitialState('medium');
    expect(state.maxMistakes).toBe(3);
    expect(state.failed).toBe(false);
    expect(state.mistakes).toBe(0);
    expect(state.kidMode).toBe(false);
    expect(state.kidAdventureMode).toBe(false);
    expect(state.experienceMode).toBe('classic');
    expect(state.stars).toBe(0);
    expect(state.voiceGuideEnabled).toBe(true);
    expect(state.kidLevelStars).toHaveLength(6);
  });

  it('candidate generation does not mutate source board', () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[0][1] = 1;
    board[1][0] = 2;
    board[1][1] = 3;
    const before = board[0][0];
    const candidates = getCandidates(board, 0, 0);
    expect(board[0][0]).toBe(before);
    expect(candidates).not.toContain(1);
    expect(candidates).not.toContain(2);
    expect(candidates).not.toContain(3);
  });
});
