import {
  allKidHouses,
  findDuplicate,
  findLastInHouse,
  findUnfillableCell,
  houseLabel,
  housesTouching,
  kidCandidates,
  type HouseKind,
  type KidCell,
} from './rules';

const DIGITS = [1, 2, 3, 4];

export type CoachKind = 'duplicate' | 'stuck' | 'last-empty' | 'only-seat' | 'none';
export type CoachStage = 'look' | 'why' | 'friend';

export type CoachStep = {
  kind: CoachKind;
  stage: CoachStage;
  text: string;
  value: number | null;
  cells: KidCell[];
  focus: KidCell | null;
};

const sameCell = (left: KidCell, right: KidCell) => left.row === right.row && left.col === right.col;

const look = (kind: CoachKind, house: HouseKind, cells: KidCell[], focus: KidCell | null): CoachStep => ({
  kind,
  stage: 'look',
  text: `先看${houseLabel(house)}。`,
  value: null,
  cells,
  focus,
});

export const coachLadder = (board: number[][], givens?: boolean[][]): CoachStep[] => {
  const duplicate = findDuplicate(board, givens);
  if (duplicate) {
    return [
      look('duplicate', duplicate.house, duplicate.cells, duplicate.at),
      {
        kind: 'duplicate',
        stage: 'why',
        text: `${houseLabel(duplicate.house)}有两个 ${duplicate.value}。`,
        value: null,
        cells: duplicate.cells,
        focus: duplicate.at,
      },
    ];
  }

  const stuck = findUnfillableCell(board);
  if (stuck) {
    return [
      {
        kind: 'stuck',
        stage: 'look',
        text: '这个空格放不下了。',
        value: null,
        cells: [stuck],
        focus: stuck,
      },
      {
        kind: 'stuck',
        stage: 'why',
        text: '先撤销，换一个试试。',
        value: null,
        cells: [stuck],
        focus: stuck,
      },
    ];
  }

  const last = findLastInHouse(board);
  if (last) {
    const focus = { row: last.row, col: last.col };
    const seen = [...last.seen].sort((left, right) => left - right).join('、');
    return [
      look('last-empty', last.house, last.cells, focus),
      {
        kind: 'last-empty',
        stage: 'why',
        text: `${houseLabel(last.house)}已经有 ${seen}。`,
        value: null,
        cells: last.cells,
        focus,
      },
      {
        kind: 'last-empty',
        stage: 'friend',
        text: `空位是 ${last.value}。`,
        value: last.value,
        cells: [focus],
        focus,
      },
    ];
  }

  const seat = findOnlySeat(board);
  if (seat) return onlySeatLadder(board, seat);

  return [
    {
      kind: 'none',
      stage: 'look',
      text: '先找已经有三个朋友的一行、一列或一小宫。',
      value: null,
      cells: [],
      focus: null,
    },
  ];
};

type OnlySeat = {
  houseKind: HouseKind;
  houseIndex: number;
  digit: number;
  seat: KidCell;
  blocked: KidCell[];
  cells: KidCell[];
};

const findOnlySeat = (board: number[][]): OnlySeat | null => {
  for (const house of allKidHouses()) {
    const filled = new Set(
      house.cells.map((cell) => board[cell.row][cell.col]).filter((value) => value !== 0)
    );
    for (const digit of DIGITS) {
      if (filled.has(digit)) continue;
      const seats = house.cells.filter(
        (cell) => board[cell.row][cell.col] === 0 && kidCandidates(board, cell.row, cell.col).includes(digit)
      );
      if (seats.length !== 1) continue;
      const blocked = house.cells.filter(
        (cell) => board[cell.row][cell.col] === 0 && !sameCell(cell, seats[0])
      );
      if (blocked.length === 0) continue;
      return {
        houseKind: house.kind,
        houseIndex: house.index,
        digit,
        seat: seats[0],
        blocked,
        cells: house.cells,
      };
    }
  }
  return null;
};

const onlySeatLadder = (board: number[][], seat: OnlySeat): CoachStep[] => {
  const reason = blockingReason(board, seat);
  return [
    {
      kind: 'only-seat',
      stage: 'look',
      text: `先看${houseLabel(seat.houseKind)}里的 ${seat.digit}。`,
      value: seat.digit,
      cells: seat.cells,
      focus: null,
    },
    {
      kind: 'only-seat',
      stage: 'why',
      text: reason.text,
      value: null,
      cells: reason.cells,
      focus: null,
    },
    {
      kind: 'only-seat',
      stage: 'friend',
      text: `${seat.digit} 坐这里。`,
      value: seat.digit,
      cells: [seat.seat],
      focus: seat.seat,
    },
  ];
};

// 第二步圈住挡住的那一行或那一列，座位留到最后一句。
const blockingReason = (
  board: number[][],
  seat: OnlySeat
): { text: string; cells: KidCell[] } => {
  const groups = new Map<string, { label: string; cells: KidCell[]; hits: number }>();
  for (const cell of seat.blocked) {
    for (const house of housesTouching(cell.row, cell.col)) {
      if (house.kind === seat.houseKind && house.index === seat.houseIndex) continue;
      const holdsDigit = house.cells.some((item) => board[item.row][item.col] === seat.digit);
      if (!holdsDigit) continue;
      const key = `${house.kind}-${house.index}`;
      const group = groups.get(key) ?? { label: houseLabel(house.kind), cells: house.cells, hits: 0 };
      group.hits += 1;
      groups.set(key, group);
      break;
    }
  }
  const best = [...groups.values()].sort((left, right) => right.hits - left.hits)[0];
  if (!best) return { text: '其他空格都不能放。', cells: seat.blocked };
  return {
    text: `${best.label}已经有 ${seat.digit}，挡住了。`,
    cells: best.cells,
  };
};
