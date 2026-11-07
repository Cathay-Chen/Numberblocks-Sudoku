import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  KID_LEVELS,
  computeUnlockedLevels,
  createKidLevelState,
  selectResumeLevel,
} from '../src/kid-adventure/engine';
import { createKidPlay, hintKidPlay, placeKidNumber, undoKidPlay } from '../src/kid-adventure/play';
import {
  countKidSolutions,
  findLastInHouse,
  isKidGridComplete,
  solveByLastInHouse,
} from '../src/kid-adventure/rules';

describe('kid adventure engine', () => {
  it('creates a playable 4x4 level state', () => {
    const state = createKidLevelState(1);
    expect(state.board.length).toBe(4);
    expect(state.board[0].length).toBe(4);
    expect(state.solution.length).toBe(4);
    expect(state.levelId).toBe(1);
  });

  it('unlocks more levels after collecting stars', () => {
    expect(computeUnlockedLevels(0)).toBe(2);
    expect(computeUnlockedLevels(2)).toBe(3);
    expect(computeUnlockedLevels(6)).toBe(5);
  });

  it('resumes the first unlocked level that has no stars', () => {
    expect(selectResumeLevel(0, [0, 0, 0, 0, 0, 0])).toBe(1);
    expect(selectResumeLevel(3, [3, 0, 0, 0, 0, 0])).toBe(2);
    expect(selectResumeLevel(6, [3, 3, 0, 0, 0, 0])).toBe(3);
  });

  it('keeps six different solutions that rules can finish', () => {
    const keys = KID_LEVELS.map((level) => level.solution.flat().join(''));
    expect(new Set(keys).size).toBe(KID_LEVELS.length);

    for (const level of KID_LEVELS) {
      expect(isKidGridComplete(level.solution)).toBe(true);
      expect(countKidSolutions(level.puzzle, 3)).toBe(1);
      level.puzzle.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          if (value !== 0) expect(value).toBe(level.solution[rowIndex][colIndex]);
        });
      });
      expect(solveByLastInHouse(level.puzzle).done).toBe(true);
    }
  });

  it('teaches row, then column, then box before longer chains', () => {
    expect(findLastInHouse(KID_LEVELS[0].puzzle)?.house).toBe('row');
    expect(findLastInHouse(KID_LEVELS[1].puzzle)?.house).toBe('column');
    expect(findLastInHouse(KID_LEVELS[2].puzzle)?.house).toBe('box');
    expect(KID_LEVELS[3].puzzle.flat().filter((value) => value === 0).length).toBeGreaterThan(4);
  });

  it('does not judge the kid board against a hidden solution', () => {
    const board = readFileSync(new URL('../src/components/KidAdventureBoard.tsx', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../src/kid-adventure/play.ts', import.meta.url), 'utf8');
    const rules = readFileSync(new URL('../src/kid-adventure/rules.ts', import.meta.url), 'utf8');
    expect(board).not.toContain('solution');
    expect(play).not.toContain('solution');
    expect(rules).not.toContain('solution');
  });

  it('keeps a currently legal placement that is not the stored answer', () => {
    const play = placeKidNumber(
      { ...createKidPlay(4), selected: { row: 0, col: 0 } },
      2
    );
    expect(play.board[0][0]).toBe(2);
    expect(play.feedback.tone).toBe('placed');
    expect(play.feedback.text).not.toContain('不是这个数字');
    expect(isKidGridComplete(play.board)).toBe(false);
  });

  it('explains a duplicate from the current row and can undo it', () => {
    const placed = placeKidNumber(
      { ...createKidPlay(1), selected: { row: 0, col: 3 } },
      1
    );
    expect(placed.board[0][3]).toBe(1);
    expect(placed.feedback.tone).toBe('conflict');
    expect(placed.feedback.text).toContain('这一行已经有 1');
    expect(undoKidPlay(placed).board[0][3]).toBe(0);
  });

  it('finishes every level by following last-in-house hints', () => {
    for (const level of KID_LEVELS) {
      let play = createKidPlay(level.id);
      for (let guard = 0; guard < 16 && !play.completed; guard += 1) {
        const hinted = hintKidPlay(play);
        expect(hinted.board).toEqual(play.board);
        expect(hinted.feedback.tone).toBe('hint');
        expect(hinted.feedback.value).toBeTruthy();
        play = placeKidNumber(hinted, hinted.feedback.value ?? 0);
      }
      expect(play.completed).toBe(true);
      expect(isKidGridComplete(play.board)).toBe(true);
    }
  });
});
