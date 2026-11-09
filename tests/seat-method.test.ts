import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coachLadder } from '../src/kid-adventure/coach';
import { KID_LEVELS } from '../src/kid-adventure/engine';
import { DEMO_ID, PRACTICE_ID, SEAT_LESSONS } from '../src/kid-adventure/lessons';
import { createLessonPlay, hintKidPlay, placeKidNumber } from '../src/kid-adventure/play';
import { countCompletions, solveByTaughtMethods } from './independent-seat-solver';

const lesson = (id: string) => SEAT_LESSONS.find((item) => item.id === id)!;

describe('seat lessons stay uniquely solvable by the two taught methods', () => {
  it('keeps one completion and does not reuse a path solution', () => {
    const pathSolutions = new Set(KID_LEVELS.map((level) => level.solution.flat().join('')));
    const seen = new Set<string>();
    for (const item of SEAT_LESSONS) {
      const signature = item.solution.flat().join('');
      expect(seen.has(signature)).toBe(false);
      expect(pathSolutions.has(signature)).toBe(false);
      seen.add(signature);
      item.puzzle.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          if (value !== 0) expect(value).toBe(item.solution[rowIndex][colIndex]);
        });
      });
      expect(countCompletions(item.puzzle, 2)).toBe(1);
      expect(countCompletions(item.solution, 2)).toBe(1);
    }
  });

  it('needs the new method exactly where the lesson says so', () => {
    const profiles = [
      { id: 'seat-demo', oldDone: false, onlySeat: 1, first: 'only-seat' },
      { id: 'seat-practice', oldDone: false, onlySeat: 2, first: 'only-seat' },
      { id: 'review-row', oldDone: true, onlySeat: 0, first: 'last-empty' },
      { id: 'review-col', oldDone: true, onlySeat: 0, first: 'last-empty' },
      { id: 'review-seat', oldDone: false, onlySeat: 1, first: 'only-seat' },
      { id: 'review-mix', oldDone: false, onlySeat: 1, first: 'last-empty' },
    ];
    for (const profile of profiles) {
      const puzzle = lesson(profile.id).puzzle;
      const oldOnly = solveByTaughtMethods(puzzle, false);
      const both = solveByTaughtMethods(puzzle, true);
      expect(oldOnly.done).toBe(profile.oldDone);
      expect(both.done).toBe(true);
      expect(both.onlySeatSteps).toBe(profile.onlySeat);
      expect(both.trace[0]?.kind).toBe(profile.first);
      if (profile.id === 'review-row') expect(both.trace[0]?.house).toBe('row');
      if (profile.id === 'review-col') expect(both.trace[0]?.house).toBe('column');
    }
  });
});

describe('only-seat hint ladder', () => {
  it('checks the duplicate before naming a seat', () => {
    const board = lesson(DEMO_ID).puzzle.map((row) => row.slice());
    board[0][0] = 3;
    const ladder = coachLadder(board);
    expect(ladder[0].kind).toBe('duplicate');
    expect(ladder.some((step) => step.stage === 'friend')).toBe(false);
    expect(ladder[1].text).toContain('两个');
  });

  it('points at the friend, then the blocking line, and only then the seat', () => {
    const ladder = coachLadder(lesson(DEMO_ID).puzzle);
    expect(ladder.map((step) => step.stage)).toEqual(['look', 'why', 'friend']);
    expect(ladder[0].kind).toBe('only-seat');
    expect(ladder[0].text).toBe('先看这一行里的 1。');
    expect(ladder[0].value).toBe(1);
    expect(ladder[1].value).toBeNull();
    expect(ladder[1].text).toBe('这一列已经有 1，挡住了。');
    expect(ladder[1].cells.some((cell) => cell.row === 0 && cell.col === 0)).toBe(false);
    expect(ladder[2].text).toBe('1 坐这里。');
    expect(ladder[2].value).toBe(1);
    expect(ladder[2].focus).toEqual({ row: 0, col: 0 });
  });

  it('does not change the board while the ladder is read', () => {
    let play = createLessonPlay(DEMO_ID);
    expect(play).not.toBeNull();
    const before = play!.board.map((row) => row.slice());
    for (let step = 0; step < 3; step += 1) play = hintKidPlay(play!);
    expect(play!.board).toEqual(before);
    expect(play!.hintsUsed).toBe(3);
    expect(play!.feedback.text).toContain('坐这里');
  });

  it('finishes every new lesson from the ladder without a stored answer in the coach', () => {
    const coach = readFileSync(new URL('../src/kid-adventure/coach.ts', import.meta.url), 'utf8');
    expect(coach).not.toContain('solution');
    for (const item of SEAT_LESSONS) {
      let play = createLessonPlay(item.id);
      expect(play).not.toBeNull();
      for (let guard = 0; guard < 12 && play && !play.completed; guard += 1) {
        let hinted = play;
        let ready = false;
        for (let step = 0; step < 4 && !ready; step += 1) {
          hinted = hintKidPlay(hinted);
          expect(hinted.board).toEqual(play.board);
          ready = hinted.feedback.text.includes('坐这里') || hinted.feedback.text.includes('空位是');
        }
        expect(ready).toBe(true);
        expect(hinted.feedback.value).toBeTruthy();
        play = placeKidNumber(hinted, hinted.feedback.value ?? 0);
      }
      expect(play!.completed).toBe(true);
      expect(play!.board).toEqual(item.solution);
    }
  });

  it('asks for the new method again on the second step of practice', () => {
    let play = createLessonPlay(PRACTICE_ID)!;
    const kinds: string[] = [];
    while (!play.completed && kinds.length < 8) {
      let hinted = play;
      for (let step = 0; step < 4; step += 1) {
        hinted = hintKidPlay(hinted);
        if (hinted.feedback.text.includes('坐这里') || hinted.feedback.text.includes('空位是')) break;
      }
      kinds.push(hinted.feedback.text.includes('坐这里') ? 'only-seat' : 'last-empty');
      play = placeKidNumber(hinted, hinted.feedback.value ?? 0);
    }
    expect(kinds.filter((kind) => kind === 'only-seat').length).toBe(2);
    expect(play.completed).toBe(true);
  });
});
