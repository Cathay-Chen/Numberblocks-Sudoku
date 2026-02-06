import { createPuzzle } from '../sudoku/engine';
import { findConflicts } from '../sudoku/logic';
import type { Difficulty, GameState } from './types';

export const MAX_MISTAKES = 3;

export const cloneBoard = (board: number[][]) => board.map((row) => row.slice());

export const createNotes = () =>
  Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => Array(10).fill(false))
  );

export const cloneNotes = (notes: boolean[][][]) =>
  notes.map((row) => row.map((cell) => cell.slice()));

export const isComplete = (board: number[][], solution: number[][]): boolean => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === 0 || board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
};

export const imageFor = (value: number) =>
  `/character_${String(value).padStart(2, '0')}_1x.png`;

export const formatTime = (seconds: number): string => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export const getDifficultyLabel = (difficulty: Difficulty): string => {
  if (difficulty === 'easy') return '简单';
  if (difficulty === 'hard') return '困难';
  return '中等';
};

export const createInitialState = (difficulty: Difficulty): GameState => {
  const { puzzle, solution } = createPuzzle(difficulty);
  const givens = puzzle.map((row) => row.map((v) => v !== 0));

  return {
    puzzle,
    solution,
    board: cloneBoard(puzzle),
    notes: createNotes(),
    givens,
    conflicts: findConflicts(puzzle),
    difficulty,
    completed: false,
    selectedCell: null,
    selectedValue: null,
    notesMode: false,
    score: 0,
    mistakes: 0,
    maxMistakes: MAX_MISTAKES,
    failed: false,
    experienceMode: 'classic',
    kidMode: false,
    kidAdventureMode: false,
    stars: 0,
    correctStreak: 0,
    kidLevelStars: Array(6).fill(0),
    voiceGuideEnabled: true,
    hintText: '',
    elapsedSeconds: 0,
  };
};

export const getCandidates = (board: number[][], row: number, col: number): number[] => {
  if (board[row][col] !== 0) return [];
  const result: number[] = [];

  for (let v = 1; v <= 9; v += 1) {
    board[row][col] = v;
    const conflict = findConflicts(board).has(`${row}-${col}`);
    if (!conflict) result.push(v);
  }

  board[row][col] = 0;
  return result;
};
