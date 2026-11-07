export const KID_SIZE = 4;
export const KID_BOX = 2;
export const KID_DIGITS = [1, 2, 3, 4] as const;

export type HouseKind = 'row' | 'column' | 'box';

export type KidCell = {
  row: number;
  col: number;
};

export type KidHouse = {
  kind: HouseKind;
  index: number;
  cells: KidCell[];
};

export type PlacementConflict = {
  house: HouseKind;
  value: number;
  at: KidCell;
  other: KidCell;
};

export type LastInHouse = {
  row: number;
  col: number;
  value: number;
  house: HouseKind;
  seen: number[];
  cells: KidCell[];
};

const cellKey = (cell: KidCell) => `${cell.row}-${cell.col}`;

export const cloneKidBoard = (board: number[][]): number[][] => board.map((row) => row.slice());

const rowHouse = (index: number): KidHouse => ({
  kind: 'row',
  index,
  cells: [0, 1, 2, 3].map((col) => ({ row: index, col })),
});

const columnHouse = (index: number): KidHouse => ({
  kind: 'column',
  index,
  cells: [0, 1, 2, 3].map((row) => ({ row, col: index })),
});

const boxHouse = (index: number): KidHouse => {
  const startRow = Math.floor(index / 2) * KID_BOX;
  const startCol = (index % 2) * KID_BOX;
  const cells: KidCell[] = [];
  for (let row = startRow; row < startRow + KID_BOX; row += 1) {
    for (let col = startCol; col < startCol + KID_BOX; col += 1) {
      cells.push({ row, col });
    }
  }
  return { kind: 'box', index, cells };
};

export const allKidHouses = (): KidHouse[] => [
  ...[0, 1, 2, 3].map(rowHouse),
  ...[0, 1, 2, 3].map(columnHouse),
  ...[0, 1, 2, 3].map(boxHouse),
];

export const housesTouching = (row: number, col: number): KidHouse[] => [
  rowHouse(row),
  columnHouse(col),
  boxHouse(Math.floor(row / KID_BOX) * 2 + Math.floor(col / KID_BOX)),
];

export const houseLabel = (house: HouseKind): string => {
  if (house === 'row') return '这一行';
  if (house === 'column') return '这一列';
  return '这一小宫';
};

export const kidCandidates = (board: number[][], row: number, col: number): number[] => {
  if (board[row][col] !== 0) return [];
  const used = new Set<number>();
  for (const house of housesTouching(row, col)) {
    for (const cell of house.cells) {
      const value = board[cell.row][cell.col];
      if (value !== 0) used.add(value);
    }
  }
  return KID_DIGITS.filter((digit) => !used.has(digit));
};

export const conflictForPlacement = (
  board: number[][],
  row: number,
  col: number,
  value: number
): PlacementConflict | null => {
  for (const house of housesTouching(row, col)) {
    for (const cell of house.cells) {
      if (cell.row === row && cell.col === col) continue;
      if (board[cell.row][cell.col] !== value) continue;
      return {
        house: house.kind,
        value,
        at: { row, col },
        other: cell,
      };
    }
  }
  return null;
};

export const conflictCells = (board: number[][]): Set<string> => {
  const keys = new Set<string>();
  for (const house of allKidHouses()) {
    const seen = new Map<number, KidCell[]>();
    for (const cell of house.cells) {
      const value = board[cell.row][cell.col];
      if (value === 0) continue;
      const list = seen.get(value) ?? [];
      list.push(cell);
      seen.set(value, list);
    }
    for (const cells of seen.values()) {
      if (cells.length < 2) continue;
      for (const cell of cells) keys.add(cellKey(cell));
    }
  }
  return keys;
};

export const findDuplicate = (
  board: number[][],
  givens?: boolean[][]
): (PlacementConflict & { cells: KidCell[] }) | null => {
  for (const house of allKidHouses()) {
    const seen = new Map<number, KidCell[]>();
    for (const cell of house.cells) {
      const value = board[cell.row][cell.col];
      if (value === 0) continue;
      const list = seen.get(value) ?? [];
      list.push(cell);
      seen.set(value, list);
    }
    for (const [value, cells] of seen) {
      if (cells.length < 2) continue;
      const playerCell =
        cells.find((cell) => (givens ? !givens[cell.row][cell.col] : true)) ?? cells[0];
      const other = cells.find((cell) => cell !== playerCell) ?? cells[1];
      return {
        house: house.kind,
        value,
        at: playerCell,
        other,
        cells,
      };
    }
  }
  return null;
};

export const findLastInHouse = (board: number[][]): LastInHouse | null => {
  for (const house of allKidHouses()) {
    const empties: KidCell[] = [];
    const seen: number[] = [];
    for (const cell of house.cells) {
      const value = board[cell.row][cell.col];
      if (value === 0) empties.push(cell);
      else seen.push(value);
    }
    if (empties.length !== 1 || new Set(seen).size !== KID_SIZE - 1) continue;
    const value = KID_DIGITS.find((digit) => !seen.includes(digit));
    if (!value) continue;
    return {
      row: empties[0].row,
      col: empties[0].col,
      value,
      house: house.kind,
      seen,
      cells: house.cells,
    };
  }
  return null;
};

export const findUnfillableCell = (board: number[][]): KidCell | null => {
  for (let row = 0; row < KID_SIZE; row += 1) {
    for (let col = 0; col < KID_SIZE; col += 1) {
      if (board[row][col] !== 0) continue;
      if (kidCandidates(board, row, col).length === 0) return { row, col };
    }
  }
  return null;
};

// 完成看每一组是不是正好 1–4，不拿隐藏答案对照。
export const isKidGridComplete = (board: number[][]): boolean => {
  if (board.length !== KID_SIZE) return false;
  for (const house of allKidHouses()) {
    const values = house.cells.map((cell) => board[cell.row]?.[cell.col] ?? 0);
    if (values.length !== KID_SIZE) return false;
    if (new Set(values).size !== KID_SIZE) return false;
    if (KID_DIGITS.some((digit) => !values.includes(digit))) return false;
  }
  return true;
};

export const countKidSolutions = (board: number[][], limit = 2): number => {
  let count = 0;
  const working = cloneKidBoard(board);

  const search = (): void => {
    if (count >= limit) return;
    let best: KidCell | null = null;
    let bestCandidates: number[] | null = null;
    for (let row = 0; row < KID_SIZE; row += 1) {
      for (let col = 0; col < KID_SIZE; col += 1) {
        if (working[row][col] !== 0) continue;
        const candidates = kidCandidates(working, row, col);
        if (candidates.length === 0) return;
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          best = { row, col };
          bestCandidates = candidates;
        }
      }
    }
    if (!best || !bestCandidates) {
      count += 1;
      return;
    }
    for (const value of bestCandidates) {
      working[best.row][best.col] = value;
      search();
      working[best.row][best.col] = 0;
      if (count >= limit) return;
    }
  };

  search();
  return count;
};

export const describeConflict = (house: HouseKind, value: number): string =>
  `${houseLabel(house)}已经有 ${value}`;

export const describeLastInHouse = (step: LastInHouse): string => {
  const seen = [...step.seen].sort((left, right) => left - right).join('、');
  return `${houseLabel(step.house)}已经有 ${seen}，这里是 ${step.value}`;
};

export const solveByLastInHouse = (board: number[][]): { done: boolean; steps: number } => {
  const working = cloneKidBoard(board);
  let steps = 0;
  while (steps <= KID_SIZE * KID_SIZE) {
    const next = findLastInHouse(working);
    if (!next) break;
    working[next.row][next.col] = next.value;
    steps += 1;
  }
  return { done: isKidGridComplete(working), steps };
};
