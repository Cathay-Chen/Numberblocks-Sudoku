// 这份求解器故意不引用 src。它自己穷举，并按「先一组只剩一个空位，再一个朋友只剩一个座位」往下填。

const DIGITS = [1, 2, 3, 4];

type Cell = [number, number];
type House = { kind: 'row' | 'column' | 'box'; cells: Cell[] };

const row = (index: number): House => ({
  kind: 'row',
  cells: [0, 1, 2, 3].map((col) => [index, col]),
});

const column = (index: number): House => ({
  kind: 'column',
  cells: [0, 1, 2, 3].map((r) => [r, index]),
});

const box = (index: number): House => {
  const startRow = Math.floor(index / 2) * 2;
  const startCol = (index % 2) * 2;
  const cells: Cell[] = [];
  for (let r = startRow; r < startRow + 2; r += 1) {
    for (let c = startCol; c < startCol + 2; c += 1) {
      cells.push([r, c]);
    }
  }
  return { kind: 'box', cells };
};

const HOUSES: House[] = [...[0, 1, 2, 3].map(row), ...[0, 1, 2, 3].map(column), ...[0, 1, 2, 3].map(box)];

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

export const countCompletions = (board: number[][], limit = 2): number => {
  const working = clone(board);
  let count = 0;
  const search = () => {
    if (count >= limit) return;
    let best: Cell | null = null;
    let bestCandidates: number[] | null = null;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
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

const housesOk = (board: number[][]) =>
  HOUSES.every((house) => {
    const values = house.cells.map(([r, c]) => board[r][c]);
    return new Set(values).size === 4 && DIGITS.every((digit) => values.includes(digit));
  });

export type MethodTrace = {
  kind: 'last-empty' | 'only-seat';
  house: House['kind'];
  value: number;
  at: Cell;
};

const lastEmpty = (board: number[][]): MethodTrace | null => {
  for (const house of HOUSES) {
    const empties: Cell[] = [];
    const seen: number[] = [];
    for (const [r, c] of house.cells) {
      const value = board[r][c];
      if (value === 0) empties.push([r, c]);
      else seen.push(value);
    }
    if (empties.length !== 1 || new Set(seen).size !== 3) continue;
    const value = DIGITS.find((digit) => !seen.includes(digit));
    if (!value) continue;
    return { kind: 'last-empty', house: house.kind, value, at: empties[0] };
  }
  return null;
};

const onlySeat = (board: number[][]): MethodTrace | null => {
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

export const solveByTaughtMethods = (board: number[][], allowOnlySeat: boolean) => {
  const working = clone(board);
  const trace: MethodTrace[] = [];
  for (let guard = 0; guard < 20; guard += 1) {
    const naked = lastEmpty(working);
    const step = naked ?? (allowOnlySeat ? onlySeat(working) : null);
    if (!step) break;
    working[step.at[0]][step.at[1]] = step.value;
    trace.push(step);
  }
  return {
    done: housesOk(working),
    trace,
    lastEmptySteps: trace.filter((step) => step.kind === 'last-empty').length,
    onlySeatSteps: trace.filter((step) => step.kind === 'only-seat').length,
  };
};
