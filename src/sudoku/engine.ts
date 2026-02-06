export type Board = number[][];

const SIZE = 9;
const BOX = 3;

const createEmptyBoard = (): Board =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const shuffle = (nums: number[]): number[] => {
  const arr = nums.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const isValid = (board: Board, row: number, col: number, val: number): boolean => {
  for (let i = 0; i < SIZE; i += 1) {
    if (board[row][i] === val) return false;
    if (board[i][col] === val) return false;
  }

  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;
  for (let r = startRow; r < startRow + BOX; r += 1) {
    for (let c = startCol; c < startCol + BOX; c += 1) {
      if (board[r][c] === val) return false;
    }
  }

  return true;
};

const findEmpty = (board: Board): [number, number] | null => {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
};

const solve = (board: Board): boolean => {
  const empty = findEmpty(board);
  if (!empty) return true;

  const [row, col] = empty;
  const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const val of candidates) {
    if (!isValid(board, row, col, val)) continue;
    board[row][col] = val;
    if (solve(board)) return true;
    board[row][col] = 0;
  }

  return false;
};

const cloneBoard = (board: Board): Board => board.map((row) => row.slice());

export const generateSolvedBoard = (): Board => {
  const board = createEmptyBoard();
  solve(board);
  return board;
};

export const countSolutions = (board: Board, limit = 2): number => {
  let count = 0;

  const search = (working: Board): void => {
    if (count >= limit) return;
    const empty = findEmpty(working);
    if (!empty) {
      count += 1;
      return;
    }

    const [row, col] = empty;
    for (let val = 1; val <= 9; val += 1) {
      if (!isValid(working, row, col, val)) continue;
      working[row][col] = val;
      search(working);
      working[row][col] = 0;
      if (count >= limit) return;
    }
  };

  search(cloneBoard(board));
  return count;
};

const getTargetGivens = (difficulty: 'easy' | 'medium' | 'hard'): number => {
  if (difficulty === 'easy') return 50;
  if (difficulty === 'hard') return 28;
  return 38;
};

export const createPuzzle = (difficulty: 'easy' | 'medium' | 'hard') => {
  const solution = generateSolvedBoard();
  const puzzle = cloneBoard(solution);
  const targetGivens = getTargetGivens(difficulty);

  const positions = shuffle(
    Array.from({ length: 81 }, (_, idx) => idx)
  );

  for (const pos of positions) {
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    if (puzzle[row][col] === 0) continue;
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const solutions = countSolutions(puzzle, 2);
    if (solutions !== 1) {
      puzzle[row][col] = backup;
    }

    const givens = puzzle.flat().filter((v) => v !== 0).length;
    if (givens <= targetGivens) break;
  }

  return { puzzle, solution };
};
