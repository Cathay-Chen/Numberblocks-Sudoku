import type { Board } from './engine';

const SIZE = 9;
const BOX = 3;

const keyOf = (row: number, col: number) => `${row}-${col}`;

export const findConflicts = (board: Board): Set<string> => {
  const conflicts = new Set<string>();

  for (let r = 0; r < SIZE; r += 1) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < SIZE; c += 1) {
      const val = board[r][c];
      if (val === 0) continue;
      const list = seen.get(val) ?? [];
      list.push(c);
      seen.set(val, list);
    }
    for (const [_, cols] of seen) {
      if (cols.length <= 1) continue;
      for (const c of cols) conflicts.add(keyOf(r, c));
    }
  }

  for (let c = 0; c < SIZE; c += 1) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < SIZE; r += 1) {
      const val = board[r][c];
      if (val === 0) continue;
      const list = seen.get(val) ?? [];
      list.push(r);
      seen.set(val, list);
    }
    for (const [_, rows] of seen) {
      if (rows.length <= 1) continue;
      for (const r of rows) conflicts.add(keyOf(r, c));
    }
  }

  for (let br = 0; br < SIZE; br += BOX) {
    for (let bc = 0; bc < SIZE; bc += BOX) {
      const seen = new Map<number, Array<[number, number]>>();
      for (let r = br; r < br + BOX; r += 1) {
        for (let c = bc; c < bc + BOX; c += 1) {
          const val = board[r][c];
          if (val === 0) continue;
          const list = seen.get(val) ?? [];
          list.push([r, c]);
          seen.set(val, list);
        }
      }
      for (const [_, cells] of seen) {
        if (cells.length <= 1) continue;
        for (const [r, c] of cells) conflicts.add(keyOf(r, c));
      }
    }
  }

  return conflicts;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const candidatesAt = (board: Board, row: number, col: number): number[] => {
  if (board[row][col] !== 0) return [];
  const used = new Set<number>();
  for (let index = 0; index < SIZE; index += 1) {
    if (board[row][index] !== 0) used.add(board[row][index]);
    if (board[index][col] !== 0) used.add(board[index][col]);
  }
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  for (let rowIndex = boxRow; rowIndex < boxRow + BOX; rowIndex += 1) {
    for (let colIndex = boxCol; colIndex < boxCol + BOX; colIndex += 1) {
      if (board[rowIndex][colIndex] !== 0) used.add(board[rowIndex][colIndex]);
    }
  }
  return DIGITS.filter((digit) => !used.has(digit));
};

const houseName = (kind: 'row' | 'column' | 'box', index: number) => {
  if (kind === 'row') return `第${index + 1}行`;
  if (kind === 'column') return `第${index + 1}列`;
  return `第${index + 1}宫`;
};

// 只看当前盘。不读预存答案，也不改格子。
export const classicHintLadder = (board: Board): string[] => {
  for (let row = 0; row < SIZE; row += 1) {
    const seen = new Map<number, number>();
    for (let col = 0; col < SIZE; col += 1) {
      const value = board[row][col];
      if (value === 0) continue;
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    for (const [value, count] of seen) {
      if (count < 2) continue;
      const where = houseName('row', row);
      return [`先看${where}。`, `${where}有两个 ${value}。`];
    }
  }
  for (let col = 0; col < SIZE; col += 1) {
    const seen = new Map<number, number>();
    for (let row = 0; row < SIZE; row += 1) {
      const value = board[row][col];
      if (value === 0) continue;
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    for (const [value, count] of seen) {
      if (count < 2) continue;
      const where = houseName('column', col);
      return [`先看${where}。`, `${where}有两个 ${value}。`];
    }
  }

  for (let row = 0; row < SIZE; row += 1) {
    const empties: number[] = [];
    const seen: number[] = [];
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] === 0) empties.push(col);
      else seen.push(board[row][col]);
    }
    if (empties.length !== 1) continue;
    const value = DIGITS.find((digit) => !seen.includes(digit));
    if (!value || candidatesAt(board, row, empties[0]).length !== 1) continue;
    const where = houseName('row', row);
    return [`先看${where}。`, `${where}已经有 ${seen.sort((a, b) => a - b).join('、')}。`, `空位是 ${value}。`];
  }

  for (let row = 0; row < SIZE; row += 1) {
    for (const digit of DIGITS) {
      const seats: number[] = [];
      for (let col = 0; col < SIZE; col += 1) {
        if (candidatesAt(board, row, col).includes(digit)) seats.push(col);
      }
      if (seats.length !== 1) continue;
      const where = houseName('row', row);
      return [`先看${where}里的 ${digit}。`, `${where}里只有一个格子能放 ${digit}。`];
    }
  }

  return ['这一步我还看不出来。先找只剩一个空位的一行、一列或一宫。'];
};

export const applyHint = (
  board: Board,
  solution: Board,
  givens: boolean[][]
): { row: number; col: number; value: number } | null => {
  const candidates: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (givens[r][c]) continue;
      if (board[r][c] !== 0) continue;
      candidates.push({ row: r, col: c });
    }
  }

  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const value = solution[pick.row][pick.col];
  board[pick.row][pick.col] = value;
  return { row: pick.row, col: pick.col, value };
};
