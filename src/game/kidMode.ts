import { getCandidates } from './utils';

type CoachEvent = 'correct' | 'wrong' | 'step-hint' | 'star';

export type StepHint = {
  row: number;
  col: number;
  value: number;
};

export const getRewardDelta = (streak: number): number => {
  if (streak <= 0) return 0;
  return streak % 3 === 0 ? 1 : 0;
};

export const findSingleCandidateHint = (
  board: number[][],
  givens: boolean[][]
): StepHint | null => {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (givens[row][col]) continue;
      if (board[row][col] !== 0) continue;

      const candidates = getCandidates(board.map((line) => line.slice()), row, col);
      if (candidates.length !== 1) continue;

      return { row, col, value: candidates[0] };
    }
  }

  return null;
};

export const buildCoachMessage = (event: CoachEvent, value?: number): string => {
  if (event === 'correct') return '太棒了，继续保持!';
  if (event === 'wrong') return '没关系，我们再试一次。';
  if (event === 'star') return '获得一颗星星奖励!';
  return `试试数字 ${value ?? ''}`.trim();
};
