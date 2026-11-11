import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coachLadder } from '../src/kid-adventure/coach';
import { HINT_FRIEND, HINT_LOOK, HINT_WHY } from '../src/kid-adventure/learning';
import {
  SIX_AGAIN_ID,
  SIX_DEMO_ID,
  SIX_LESSONS,
  SIX_LINE_ID,
  SIX_PRACTICE_ID,
  SIX_REVIEW_IDS,
  childNextLine,
  demoIdFor,
  nextLessonStep,
  sixEntry,
  sixGateLines,
  sixReady,
  sixSegmentReady,
} from '../src/kid-adventure/lessons';
import { isIndependent, recordAttempt, type LearningRecord } from '../src/kid-adventure/learning';
import { clearedText, createLessonPlay, hintKidPlay, placeKidNumber } from '../src/kid-adventure/play';
import { chooseOpening } from '../src/kid-adventure/opening';
import { isKidGridComplete } from '../src/kid-adventure/rules';
import { SIX_SESSION_VERSION, parseKidSession, saveKidSession } from '../src/kid-adventure/session';
import { countSixCompletions, sixHousesValid, solveSixByTaughtMethods } from './independent-six-solver';

const mastered = (): LearningRecord => {
  let record: LearningRecord | null = null;
  record = recordAttempt(record, 'seat-demo', { hints: 3, mistakes: 0, done: true });
  record = recordAttempt(record, 'seat-practice', { hints: 0, mistakes: 4, done: true });
  record = recordAttempt(record, 'review-row', { hints: 2, mistakes: 1, done: true });
  record = recordAttempt(record, 'review-col', { hints: 0, mistakes: 3, done: true });
  record = recordAttempt(record, 'review-seat', { hints: 0, mistakes: 0, done: true });
  record = recordAttempt(record, 'review-mix', { hints: 1, mistakes: 2, done: true });
  return record!;
};

describe('6x6 transition', () => {
  it('keeps the solver file from calling this project', () => {
    const source = readFileSync(new URL('./independent-six-solver.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('kid-adventure');
    expect(source).not.toContain('countKidSolutions');
    expect(source).not.toContain('../src');
  });

  it('orders six puzzles by method and steps, and each one has a single taught completion', () => {
    const profiles = [
      { id: SIX_DEMO_ID, old: true, seat: 0, last: 4, first: 'last-empty', house: 'box' },
      { id: SIX_LINE_ID, old: true, seat: 0, last: 4, first: 'last-empty', house: 'row' },
      { id: SIX_PRACTICE_ID, old: false, seat: 1, last: 5, first: 'only-seat', house: 'row' },
      { id: SIX_AGAIN_ID, old: false, seat: 2, last: 4, first: 'only-seat', house: 'row' },
      { id: SIX_REVIEW_IDS[0], old: true, seat: 0, last: 4, first: 'last-empty', house: 'column' },
      { id: SIX_REVIEW_IDS[1], old: false, seat: 1, last: 3, first: 'only-seat', house: 'row' },
      { id: SIX_REVIEW_IDS[2], old: false, seat: 1, last: 5, first: 'last-empty', house: 'box' },
    ];
    const seen = new Set<string>();
    const holes = new Map<string, number>();
    for (const profile of profiles) {
      const lesson = SIX_LESSONS.find((item) => item.id === profile.id)!;
      const signature = lesson.solution.flat().join('');
      expect(seen.has(signature)).toBe(false);
      seen.add(signature);
      expect(sixHousesValid(lesson.solution)).toBe(true);
      expect(countSixCompletions(lesson.puzzle, 2)).toBe(1);
      expect(countSixCompletions(lesson.solution, 2)).toBe(1);
      lesson.puzzle.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          if (value !== 0) expect(value).toBe(lesson.solution[rowIndex][colIndex]);
        });
      });
      holes.set(profile.id, lesson.puzzle.flat().filter((value) => value === 0).length);
      const oldOnly = solveSixByTaughtMethods(lesson.puzzle, false);
      const both = solveSixByTaughtMethods(lesson.puzzle, true);
      expect(oldOnly.done).toBe(profile.old);
      expect(both.done).toBe(true);
      expect(both.onlySeatSteps).toBe(profile.seat);
      expect(both.lastEmptySteps).toBe(profile.last);
      expect(both.trace[0]).toMatchObject({ kind: profile.first, house: profile.house });
      expect(both.board).toEqual(lesson.solution);
    }
    expect(SIX_LESSONS.map((lesson) => lesson.id)).toEqual(profiles.map((profile) => profile.id));
    // 看行和小宫空格一样多，难度差在第一步是行还是宫。复习座位和看行空格也一样多，但旧方法做不完。
    expect(holes.get(SIX_DEMO_ID)).toBe(holes.get(SIX_LINE_ID));
    expect(holes.get(SIX_REVIEW_IDS[1])).toBe(holes.get(SIX_LINE_ID));
    // 自己练和两个座位空格一样多，后者要多一次新方法，而且中间会回到旧方法。
    expect(holes.get(SIX_PRACTICE_ID)).toBe(holes.get(SIX_AGAIN_ID));
    const again = solveSixByTaughtMethods(SIX_LESSONS.find((lesson) => lesson.id === SIX_AGAIN_ID)!.puzzle, true);
    expect(again.trace[1].kind).toBe('last-empty');
    expect(again.trace[2].kind).toBe('only-seat');
  });

  it('does not call a full row-and-column grid complete when a 2x3 box repeats', () => {
    const broken = SIX_LESSONS[0].solution.map((row) => row.slice());
    for (const row of broken) {
      const swap = row[2];
      row[2] = row[3];
      row[3] = swap;
    }
    const rowsOk = broken.every((row) => new Set(row).size === 6);
    const colsOk = [0, 1, 2, 3, 4, 5].every((col) => new Set(broken.map((row) => row[col])).size === 6);
    expect(rowsOk).toBe(true);
    expect(colsOk).toBe(true);
    expect(sixHousesValid(broken)).toBe(false);
    expect(isKidGridComplete(broken)).toBe(false);
    expect(isKidGridComplete(SIX_LESSONS[0].solution)).toBe(true);
  });

  it('checks a duplicate, then names the friend, the blocking box, and only then the seat', () => {
    const coach = readFileSync(new URL('../src/kid-adventure/coach.ts', import.meta.url), 'utf8');
    expect(coach).not.toContain('solution');
    const practice = SIX_LESSONS.find((lesson) => lesson.id === SIX_PRACTICE_ID)!.puzzle.map((row) => row.slice());
    practice[0][0] = 2;
    const duplicate = coachLadder(practice);
    expect(duplicate[0].kind).toBe('duplicate');
    expect(duplicate.some((step) => step.stage === 'friend')).toBe(false);
    expect(duplicate[1].text).toContain('两个');

    const ladder = coachLadder(SIX_LESSONS.find((lesson) => lesson.id === SIX_PRACTICE_ID)!.puzzle);
    expect(ladder.map((step) => step.stage)).toEqual(['look', 'why', 'friend']);
    expect(ladder[0].text).toBe('先看这一行里的 4。');
    expect(ladder[0].value).toBe(4);
    expect(ladder[1].text).toBe('这一小宫已经有 4，挡住了。');
    expect(ladder[1].value).toBeNull();
    expect(ladder[1].cells.some((cell) => cell.row === 0 && cell.col === 3)).toBe(false);
    expect(ladder[2].text).toBe('4 坐这里。');
    expect(ladder[2].focus).toEqual({ row: 0, col: 3 });

    const demo = coachLadder(SIX_LESSONS.find((lesson) => lesson.id === SIX_DEMO_ID)!.puzzle);
    expect(demo[0].text).toBe('先看这一小宫。');
    expect(demo[0].cells).toHaveLength(6);
    expect(demo[2].text).toBe('空位是 1。');
    expect(demo[2].value).toBe(1);
  });

  it('does not fill a cell while the six ladder is read', () => {
    let play = createLessonPlay(SIX_DEMO_ID);
    expect(play?.feedback.text).toBe('六个朋友住在这个粗框里。');
    expect(play?.focus).toHaveLength(6);
    expect(play?.hintsUsed).toBe(0);
    const before = play!.board.map((row) => row.slice());
    for (let step = 0; step < 3; step += 1) play = hintKidPlay(play!);
    expect(play!.board).toEqual(before);
    expect(play!.hintDepth).toBe(HINT_FRIEND);
    expect(play!.hintsUsed).toBe(3);
    expect(play!.feedback.text).toBe('空位是 1。');
    play = placeKidNumber({ ...play!, selected: play!.focus[0] ? { row: play!.focus[0].row, col: play!.focus[0].col } : play!.selected }, 2);
    expect(play.completed).toBe(false);
    expect(play.feedback.text).toContain('已经有');
  });

  it('opens six only after an independent old method and an independent new method', () => {
    const ready = mastered();
    expect(sixReady(ready)).toBe(true);
    expect(sixGateLines(ready)).toEqual(['六个朋友的小宫可以玩了。放重不挡路。']);
    expect(sixEntry(ready)?.id).toBe(SIX_DEMO_ID);
    expect(ready.activities['seat-practice'].mistakes).toBe(4);

    const hintedPractice = recordAttempt(ready, 'seat-practice', { hints: 1, mistakes: 0, done: true });
    expect(isIndependent(hintedPractice.activities['seat-practice'])).toBe(false);
    expect(sixReady(hintedPractice)).toBe(false);
    expect(sixGateLines(hintedPractice).some((line) => line.includes('没记下是哪一层'))).toBe(true);

    const looked = recordAttempt(ready, 'seat-practice', { hints: 1, mistakes: 4, done: true, depth: HINT_LOOK });
    expect(sixReady(looked)).toBe(true);
    const heard = recordAttempt(ready, 'seat-practice', { hints: 2, mistakes: 0, done: true, depth: HINT_WHY });
    expect(sixReady(heard)).toBe(false);
    expect(sixGateLines(heard).some((line) => line.includes('听了原因'))).toBe(true);
    const told = recordAttempt(ready, 'seat-practice', { hints: 3, mistakes: 0, done: true, depth: HINT_FRIEND });
    expect(sixReady(told)).toBe(false);
    expect(sixGateLines(told).some((line) => line.includes('说出了座位'))).toBe(true);

    const noOld = recordAttempt(recordAttempt(ready, 'review-row', { hints: 1, mistakes: 0, done: true }), 'review-col', {
      hints: 2,
      mistakes: 9,
      done: true,
    });
    expect(sixReady(noOld)).toBe(false);
    expect(sixGateLines(noOld).join('')).toContain('行和列');

    const noNew = recordAttempt(recordAttempt(ready, 'review-seat', { hints: 1, mistakes: 0, done: true }), 'review-mix', {
      hints: 1,
      mistakes: 0,
      done: true,
    });
    expect(sixReady(noNew)).toBe(false);

    expect(sixReady(recordAttempt(null, 'seat-practice', { hints: 0, mistakes: 0, done: true }))).toBe(false);
    expect(
      chooseOpening({
        totalStars: 18,
        levelStars: [3, 3, 3, 3, 3, 3],
        saved: null,
        learning: ready,
      })
    ).toEqual({ kind: 'lesson', id: SIX_DEMO_ID, restore: false });
  });

  it('stores a six board as version 2 and leaves a four board at version 1', () => {
    const storage = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
    };
    storage.setItem('numberblocks.kid-progress.v1', JSON.stringify({ stars: 18, levelStars: [3, 3, 3, 3, 3, 3] }));
    const started = createLessonPlay(SIX_PRACTICE_ID)!;
    const placed = placeKidNumber({ ...started, selected: { row: 0, col: 3 } }, 4);
    saveKidSession(storage, placed);
    const raw = storage.getItem('numberblocks.kid-board.v1')!;
    expect(raw).toContain(`"v":${SIX_SESSION_VERSION}`);
    const session = parseKidSession(raw);
    expect(session?.lessonId).toBe(SIX_PRACTICE_ID);
    expect(session?.board[0][3]).toBe(4);
    expect(parseKidSession(raw.replace('"v":2', '"v":1'))).toBeNull();
    expect(storage.getItem('numberblocks.kid-progress.v1')).toContain('"stars":18');
    expect(clearedText(6)).toBe('六行、六列、六个小宫都齐了。');
    expect(clearedText(4)).toBe('四行、四列、四个小宫都齐了。');

    const legacySix = parseKidSession(
      JSON.stringify({
        v: SIX_SESSION_VERSION,
        levelId: 0,
        lessonId: SIX_PRACTICE_ID,
        board: started.board,
        past: [],
        future: [],
        selected: null,
        hintsUsed: 1,
        mistakes: 0,
      })
    );
    expect(legacySix?.v).toBe(SIX_SESSION_VERSION);
    expect(legacySix?.hintUnrated).toBe(true);
    expect(legacySix?.hintsUsed).toBe(1);
    expect(storage.getItem('numberblocks.kid-progress.v1')).toContain('"stars":18');
  });

  it('restores a hint that has not changed the board, and a versioned six board', () => {
    const hintedOnly = {
      v: 1,
      levelId: 0,
      lessonId: 'review-row',
      board: [
        [0, 0, 0, 4],
        [0, 3, 1, 2],
        [3, 4, 2, 1],
        [2, 1, 4, 3],
      ],
      past: [],
      future: [],
      selected: null,
      hintsUsed: 2,
      mistakes: 0,
    };
    expect(
      chooseOpening({
        totalStars: 18,
        levelStars: [3, 3, 3, 3, 3, 3],
        saved: hintedOnly,
        learning: mastered(),
      })
    ).toEqual({ kind: 'lesson', id: 'review-row', restore: true });

    const started = createLessonPlay(SIX_DEMO_ID)!;
    const placed = placeKidNumber({ ...started, selected: { row: 0, col: 0 } }, 1);
    const storage = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
    };
    saveKidSession(storage, placed);
    const saved = parseKidSession(storage.getItem('numberblocks.kid-board.v1'));
    expect(saved?.v).toBe(2);
    expect(saved?.hintDepth).toBe(0);
    expect(saved?.hintUnrated).toBe(false);
    expect(
      chooseOpening({
        totalStars: 18,
        levelStars: [3, 3, 3, 3, 3, 3],
        saved,
        learning: mastered(),
      })
    ).toEqual({ kind: 'lesson', id: SIX_DEMO_ID, restore: true });
  });

  it('cycles the reviews and lets the child choose the demo again', () => {
    expect(nextLessonStep(SIX_DEMO_ID)).toEqual({ id: SIX_LINE_ID, label: '看这一行' });
    expect(nextLessonStep(SIX_LINE_ID).id).toBe(SIX_PRACTICE_ID);
    expect(nextLessonStep(SIX_PRACTICE_ID).id).toBe(SIX_AGAIN_ID);
    expect(nextLessonStep(SIX_AGAIN_ID).id).toBe(SIX_REVIEW_IDS[0]);
    expect(nextLessonStep(SIX_REVIEW_IDS[0]).id).toBe(SIX_REVIEW_IDS[1]);
    expect(nextLessonStep(SIX_REVIEW_IDS[2]).id).toBe(SIX_REVIEW_IDS[0]);
    expect(demoIdFor(SIX_AGAIN_ID)).toBe(SIX_DEMO_ID);
    expect(demoIdFor('seat-practice')).toBe('seat-demo');

    let learning: LearningRecord | null = mastered();
    for (const id of [SIX_DEMO_ID, SIX_LINE_ID, SIX_PRACTICE_ID]) {
      learning = recordAttempt(learning, id, { hints: 0, mistakes: 1, done: true, depth: 0 });
    }
    expect(sixEntry(learning)?.id).toBe(SIX_AGAIN_ID);
    learning = recordAttempt(learning, SIX_AGAIN_ID, { hints: 3, mistakes: 2, done: true, depth: HINT_FRIEND });
    expect(sixEntry(learning)?.id).toBe(SIX_REVIEW_IDS[0]);
    expect(sixSegmentReady(learning)).toBe(true);
    for (const id of SIX_REVIEW_IDS) {
      learning = recordAttempt(learning, id, { hints: 1, mistakes: 0, done: true, depth: HINT_LOOK });
    }
    expect(sixEntry(learning)).toEqual({ id: SIX_REVIEW_IDS[0], label: '再练一题' });
    expect(sixEntry(learning)?.id).not.toBe(SIX_DEMO_ID);
    expect(childNextLine(true, learning)).toContain('先不进 9×9');
    expect(childNextLine(true, mastered())).toContain('看六个朋友');
  });

  it('remembers the deepest hint on a version 2 board and does not fill from the ladder', () => {
    let play = createLessonPlay(SIX_LINE_ID)!;
    const before = play.board.map((row) => row.slice());
    play = hintKidPlay(play);
    expect(play.hintDepth).toBe(HINT_LOOK);
    expect(play.feedback.text).toBe('先看这一行。');
    expect(play.board).toEqual(before);
    const storage = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
    };
    saveKidSession(storage, play);
    const saved = parseKidSession(storage.getItem('numberblocks.kid-board.v1'));
    expect(saved?.v).toBe(SIX_SESSION_VERSION);
    expect(saved?.hintDepth).toBe(HINT_LOOK);
    expect(saved?.hintUnrated).toBe(false);
    expect(saved?.hintsUsed).toBe(1);

    const coach = readFileSync(new URL('../src/kid-adventure/coach.ts', import.meta.url), 'utf8');
    expect(coach).not.toContain('solution');
    for (const lesson of SIX_LESSONS) {
      let current = createLessonPlay(lesson.id);
      expect(current).not.toBeNull();
      for (let guard = 0; guard < 16 && current && !current.completed; guard += 1) {
        let hinted = current;
        let ready = false;
        for (let step = 0; step < 4 && !ready; step += 1) {
          hinted = hintKidPlay(hinted);
          expect(hinted.board).toEqual(current.board);
          ready = hinted.feedback.text.includes('坐这里') || hinted.feedback.text.includes('空位是');
        }
        expect(ready).toBe(true);
        current = placeKidNumber(hinted, hinted.feedback.value ?? 0);
      }
      expect(current!.completed).toBe(true);
      expect(current!.board).toEqual(lesson.solution);
      expect(current!.hintDepth).toBe(HINT_FRIEND);
    }
  });
});
