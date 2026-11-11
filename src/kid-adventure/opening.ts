import { computeUnlockedLevels, selectResumeLevel } from './engine';
import { continuation, lessonById, pathIsClear } from './lessons';
import type { LearningRecord } from './learning';
import type { KidSession } from './session';

export type Opening =
  | { kind: 'path'; levelId: number; restore: boolean }
  | { kind: 'lesson'; id: string; restore: boolean };

const boardMoved = (saved: KidSession, puzzle: number[][]): boolean =>
  saved.past.length > 0 ||
  saved.future.length > 0 ||
  saved.board.some((row, rowIndex) => row.some((cell, colIndex) => cell !== puzzle[rowIndex][colIndex]));

// 只点了看一步时格子还是开局，但提示次数必须留下，否则刷新后会被记成独立完成。
const lessonShouldRestore = (saved: KidSession, puzzle: number[][]): boolean => {
  const expectedVersion = puzzle.length === 6 ? 2 : 1;
  if (saved.v !== expectedVersion) return false;
  return (
    boardMoved(saved, puzzle) ||
    (saved.hintsUsed ?? 0) > 0 ||
    (saved.hintDepth ?? 0) > 0 ||
    saved.hintUnrated === true ||
    (saved.mistakes ?? 0) > 0
  );
};

export const chooseOpening = (input: {
  totalStars: number;
  levelStars: number[];
  saved: KidSession | null;
  learning: LearningRecord | null;
}): Opening => {
  const saved = input.saved;
  if (saved?.lessonId && pathIsClear(input.levelStars)) {
    const lesson = lessonById(saved.lessonId);
    if (lesson && lessonShouldRestore(saved, lesson.puzzle)) {
      return { kind: 'lesson', id: lesson.id, restore: true };
    }
  }
  if (saved && !saved.lessonId && saved.past.length > 0 && saved.levelId <= computeUnlockedLevels(input.totalStars)) {
    return { kind: 'path', levelId: saved.levelId, restore: true };
  }
  if (pathIsClear(input.levelStars)) {
    return { kind: 'lesson', id: continuation(input.learning).id, restore: false };
  }
  return {
    kind: 'path',
    levelId: selectResumeLevel(input.totalStars, input.levelStars),
    restore: false,
  };
};
