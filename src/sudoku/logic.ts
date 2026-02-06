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
