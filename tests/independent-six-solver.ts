// 6×6 穷举和方法求解。故意不引用 src，也不调用项目里的求解函数。

const DIGITS = [1, 2, 3, 4, 5, 6];
const SIZE = 6;
const BOX_ROWS = 2;
const BOX_COLS = 3;
const STACKS = SIZE / BOX_COLS;

type Cell = [number, number];
type House = { kind: 'row' | 'column' | 'box'; index: number; cells: Cell[] };

const row = (index: number): House => ({
  kind: 'row',
  index,
  cells: DIGITS.map((_, col) => [index, col]),
});

const column = (index: number): House => ({
  kind: 'column',
  index,
  cells: DIGITS.map((_, r) => [r, index]),
});

const box = (index: number): House => {
  const startRow = Math.floor(index / STACKS) * BOX_ROWS;
  const startCol = (index % STACKS) * BOX_COLS;
  const cells: Cell[] = [];
  for (let r = startRow; r < startRow + BOX_ROWS; r += 1) {
    for (let c = startCol; c < startCol + BOX_COLS; c += 1) cells.push([r, c]);
  }
  return { kind: 'box', index, cells };
};

const HOUSES: House[] = [
  ...DIGITS.map((_, index) => row(index)),
  ...DIGITS.map((_, index) => column(index)),
  ...DIGITS.map((_, index) => box(index)),
];

const clone = (board: number[][]) => board.map((line) => line.slice());

const usedBy = (board: number[][], r: number, c: number) => {
  const used = new Set<number>();
  for (const house of HOUSES) {
    if (!house.cells.some(([rr, cc]) => rr === r && cc === c)) continue;
    for (const [rr, cc] of house.cells) {
      if (board[rr][cc] !== 0) used.add(board[rr][cc]);
    }
  }
  return used;
};

const candidates = (board: number[][], r: number, c: number) =>
  board[r][c] === 0 ? DIGITS.filter((digit) => !usedBy(board, r, c).has(digit)) : [];

export const countSixCompletions = (board: number[][], limit = 2): number => {
  const working = clone(board);
  let count = 0;
  const search = () => {
    if (count >= limit) return;
    let best: Cell | null = null;
    let bestCandidates: number[] | null = null;
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (working[r][c] !== 0) continue;
        const options = candidates(working, r, c);
        if (options.length === 0) return;
        if (!bestCandidates || options.length < bestCandidates.length) {
          best = [r, c];
          bestCandidates = options;
        }
      }
    }
    if (!best || !bestCandidates) {
      count += 1;
      return;
    }
    for (const value of bestCandidates) {
      working[best[0]][best[1]] = value;
      search();
      working[best[0]][best[1]] = 0;
      if (count >= limit) return;
    }
  };
  search();
  return count;
};

export const sixHousesValid = (board: number[][]) =>
  HOUSES.every((house) => {
    const values = house.cells.map(([r, c]) => board[r][c]);
    return values.length === SIZE && new Set(values).size === SIZE && DIGITS.every((digit) => values.includes(digit));
  });

export type SixTrace = {
  kind: 'last-empty' | 'only-seat';
  house: House['kind'];
  value: number;
  at: Cell;
};

const lastEmpty = (board: number[][]): SixTrace | null => {
  for (const house of HOUSES) {
    const empties: Cell[] = [];
    const seen: number[] = [];
    for (const [r, c] of house.cells) {
      const value = board[r][c];
      if (value === 0) empties.push([r, c]);
      else seen.push(value);
    }
    if (empties.length !== 1 || new Set(seen).size !== SIZE - 1) continue;
    const value = DIGITS.find((digit) => !seen.includes(digit));
    if (!value) continue;
    return { kind: 'last-empty', house: house.kind, value, at: empties[0] };
  }
  return null;
};

const onlySeat = (board: number[][]): SixTrace | null => {
  for (const house of HOUSES) {
    const filled = new Set(house.cells.map(([r, c]) => board[r][c]).filter((value) => value !== 0));
    for (const digit of DIGITS) {
      if (filled.has(digit)) continue;
      const seats = house.cells.filter(([r, c]) => board[r][c] === 0 && candidates(board, r, c).includes(digit));
      if (seats.length !== 1) continue;
      const blocked = house.cells.filter(([r, c]) => board[r][c] === 0 && (r !== seats[0][0] || c !== seats[0][1]));
      if (blocked.length === 0) continue;
      return { kind: 'only-seat', house: house.kind, value: digit, at: seats[0] };
    }
  }
  return null;
};

export const solveSixByTaughtMethods = (board: number[][], allowOnlySeat: boolean) => {
  const working = clone(board);
  const trace: SixTrace[] = [];
  for (let guard = 0; guard < SIZE * SIZE; guard += 1) {
    const step = lastEmpty(working) ?? (allowOnlySeat ? onlySeat(working) : null);
    if (!step) break;
    working[step.at[0]][step.at[1]] = step.value;
    trace.push(step);
  }
  return {
    done: sixHousesValid(working),
    board: working,
    trace,
    lastEmptySteps: trace.filter((step) => step.kind === 'last-empty').length,
    onlySeatSteps: trace.filter((step) => step.kind === 'only-seat').length,
  };
};
