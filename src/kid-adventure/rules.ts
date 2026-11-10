export const KID_SIZE = 4;
export const KID_BOX = 2;
export const KID_DIGITS = [1, 2, 3, 4] as const;
const SIX_DIGITS = [1, 2, 3, 4, 5, 6] as const;

export type HouseKind = 'row' | 'column' | 'box';

export type KidGeometry = {
  size: number;
  boxRows: number;
  boxCols: number;
  digits: readonly number[];
};

// 4×4 调用不传几何。只有 6 行的盘才是 2×3 宫，避免把别的长度误当成新格子。
export const GEOMETRY_4: KidGeometry = { size: 4, boxRows: 2, boxCols: 2, digits: KID_DIGITS };
export const GEOMETRY_6: KidGeometry = { size: 6, boxRows: 2, boxCols: 3, digits: SIX_DIGITS };

export const geometryOf = (board: number[][]): KidGeometry => (board.length === 6 ? GEOMETRY_6 : GEOMETRY_4);

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

const indexes = (count: number) => Array.from({ length: count }, (_, index) => index);

const rowHouse = (index: number, size: number): KidHouse => ({
  kind: 'row',
  index,
  cells: indexes(size).map((col) => ({ row: index, col })),
});

const columnHouse = (index: number, size: number): KidHouse => ({
  kind: 'column',
  index,
  cells: indexes(size).map((row) => ({ row, col: index })),
});

const boxHouse = (index: number, geometry: KidGeometry): KidHouse => {
  const stacks = geometry.size / geometry.boxCols;
  const startRow = Math.floor(index / stacks) * geometry.boxRows;
  const startCol = (index % stacks) * geometry.boxCols;
  const cells: KidCell[] = [];
  for (let row = startRow; row < startRow + geometry.boxRows; row += 1) {
    for (let col = startCol; col < startCol + geometry.boxCols; col += 1) {
      cells.push({ row, col });
    }
  }
  return { kind: 'box', index, cells };
};

export const allKidHouses = (geometry: KidGeometry = GEOMETRY_4): KidHouse[] => {
  const stacks = geometry.size / geometry.boxCols;
  const bands = geometry.size / geometry.boxRows;
  return [
    ...indexes(geometry.size).map((index) => rowHouse(index, geometry.size)),
    ...indexes(geometry.size).map((index) => columnHouse(index, geometry.size)),
    ...indexes(stacks * bands).map((index) => boxHouse(index, geometry)),
  ];
};

export const housesTouching = (row: number, col: number, geometry: KidGeometry = GEOMETRY_4): KidHouse[] => {
  const stacks = geometry.size / geometry.boxCols;
  const boxIndex = Math.floor(row / geometry.boxRows) * stacks + Math.floor(col / geometry.boxCols);
  return [rowHouse(row, geometry.size), columnHouse(col, geometry.size), boxHouse(boxIndex, geometry)];
};

export const boxWithOneEmpty = (board: number[][]): KidHouse | null => {
  for (const house of allKidHouses(geometryOf(board))) {
    if (house.kind !== 'box') continue;
    const empties = house.cells.filter((cell) => board[cell.row]?.[cell.col] === 0);
    if (empties.length === 1) return house;
  }
  return null;
};

export const houseLabel = (house: HouseKind): string => {
  if (house === 'row') return '这一行';
  if (house === 'column') return '这一列';
  return '这一小宫';
};

export const kidCandidates = (board: number[][], row: number, col: number): number[] => {
  if (board[row]?.[col] !== 0) return [];
  const geometry = geometryOf(board);
  const used = new Set<number>();
  for (const house of housesTouching(row, col, geometry)) {
    for (const cell of house.cells) {
      const value = board[cell.row][cell.col];
      if (value !== 0) used.add(value);
    }
  }
  return geometry.digits.filter((digit) => !used.has(digit));
};

export const conflictForPlacement = (
  board: number[][],
  row: number,
  col: number,
  value: number
): PlacementConflict | null => {
  const geometry = geometryOf(board);
  for (const house of housesTouching(row, col, geometry)) {
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
  for (const house of allKidHouses(geometryOf(board))) {
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
  for (const house of allKidHouses(geometryOf(board))) {
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
  const geometry = geometryOf(board);
  for (const house of allKidHouses(geometry)) {
    const empties: KidCell[] = [];
    const seen: number[] = [];
    for (const cell of house.cells) {
      const value = board[cell.row][cell.col];
      if (value === 0) empties.push(cell);
      else seen.push(value);
    }
    if (empties.length !== 1 || new Set(seen).size !== geometry.size - 1) continue;
    const value = geometry.digits.find((digit) => !seen.includes(digit));
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
  const geometry = geometryOf(board);
  for (let row = 0; row < geometry.size; row += 1) {
    for (let col = 0; col < geometry.size; col += 1) {
      if (board[row][col] !== 0) continue;
      if (kidCandidates(board, row, col).length === 0) return { row, col };
    }
  }
  return null;
};

// 完成看每一组是不是正好凑齐，不拿隐藏答案对照。4×4 是 1–4，6×6 是 1–6。
export const isKidGridComplete = (board: number[][]): boolean => {
  const geometry = geometryOf(board);
  if (board.length !== geometry.size) return false;
  for (const house of allKidHouses(geometry)) {
    const values = house.cells.map((cell) => board[cell.row]?.[cell.col] ?? 0);
    if (values.length !== geometry.size) return false;
    if (new Set(values).size !== geometry.size) return false;
    if (geometry.digits.some((digit) => !values.includes(digit))) return false;
  }
  return true;
};

export const countKidSolutions = (board: number[][], limit = 2): number => {
  let count = 0;
  const working = cloneKidBoard(board);
  const geometry = geometryOf(board);

  const search = (): void => {
    if (count >= limit) return;
    let best: KidCell | null = null;
    let bestCandidates: number[] | null = null;
    for (let row = 0; row < geometry.size; row += 1) {
      for (let col = 0; col < geometry.size; col += 1) {
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
  const limit = working.length * working.length;
  while (steps <= limit) {
    const next = findLastInHouse(working);
    if (!next) break;
    working[next.row][next.col] = next.value;
    steps += 1;
  }
  return { done: isKidGridComplete(working), steps };
};
