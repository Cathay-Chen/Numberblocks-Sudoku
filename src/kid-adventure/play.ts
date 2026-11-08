import { coachLadder } from './coach';
import { createKidLevelState } from './engine';
import {
  cloneKidBoard,
  conflictForPlacement,
  describeConflict,
  isKidGridComplete,
  type KidCell,
} from './rules';

export const KID_HISTORY_LIMIT = 80;
export const KID_CLEAR_STARS = 3;
const KID_PLACEMENT_SCORE = 10;

export type KidFeedbackTone = 'idle' | 'placed' | 'conflict' | 'hint' | 'stuck' | 'done';

export type KidFeedback = {
  tone: KidFeedbackTone;
  text: string;
  value: number | null;
};

export type KidPlay = {
  levelId: number;
  board: number[][];
  givens: boolean[][];
  selected: KidCell | null;
  past: number[][][];
  future: number[][][];
  tried: number;
  completed: boolean;
  feedback: KidFeedback;
  focus: KidCell[];
  coachKey: string;
  coachStep: number;
};

const idle = (text: string): KidFeedback => ({ tone: 'idle', text, value: null });

const remember = (play: KidPlay): Pick<KidPlay, 'past' | 'future'> => {
  const past = [...play.past, cloneKidBoard(play.board)];
  if (past.length > KID_HISTORY_LIMIT) past.shift();
  return { past, future: [] };
};

export const kidPlacedScore = (play: KidPlay): number => {
  let placed = 0;
  for (let row = 0; row < play.board.length; row += 1) {
    for (let col = 0; col < play.board[row].length; col += 1) {
      if (play.givens[row][col]) continue;
      if (play.board[row][col] !== 0) placed += 1;
    }
  }
  return placed * KID_PLACEMENT_SCORE;
};

const KID_DIGITS = [1, 2, 3, 4];

// 第一行若只剩一个空位，把那一行亮出来。缺的数字从这一行数出来，不读答案。
export const greetLikeWarmup = (play: KidPlay): KidPlay => {
  const row = play.board[0];
  if (!row || row.filter((value) => value === 0).length !== 1) return play;
  const missing = KID_DIGITS.find((digit) => !row.includes(digit));
  if (!missing) return play;
  return {
    ...play,
    focus: row.map((_, col) => ({ row: 0, col })),
    feedback: { tone: 'hint', text: '第一行只剩一个空位。', value: null },
  };
};

export const createKidPlay = (levelId: number): KidPlay => {
  const level = createKidLevelState(levelId);
  return {
    levelId: level.levelId,
    board: level.board,
    givens: level.givens,
    selected: null,
    past: [],
    future: [],
    tried: 0,
    completed: false,
    feedback: idle('点一个空格，再点积木。'),
    focus: [],
    coachKey: '',
    coachStep: 0,
  };
};

export const selectKidCell = (play: KidPlay, cell: KidCell): KidPlay => ({
  ...play,
  selected: cell,
});

// 提示已经圈出一组、且里面只剩一个空位时，点数字就可以放进去。
export const emptyFocusTarget = (play: KidPlay): KidCell | null => {
  const empties = play.focus.filter(
    (cell) => play.board[cell.row]?.[cell.col] === 0 && !play.givens[cell.row]?.[cell.col]
  );
  return empties.length === 1 ? empties[0] : null;
};

export const placeKidNumber = (play: KidPlay, value: number): KidPlay => {
  if (play.completed) return play;
  if (!play.selected) {
    return { ...play, feedback: idle('先点一个空格。'), focus: [] };
  }

  const { row, col } = play.selected;
  if (play.givens[row][col]) {
    return { ...play, feedback: idle('这个朋友已经在家里了。'), focus: [] };
  }

  const conflict = conflictForPlacement(play.board, row, col, value);
  const board = cloneKidBoard(play.board);
  board[row][col] = value;
  const next: KidPlay = {
    ...play,
    board,
    ...remember(play),
    selected: { row, col },
    focus: [],
  };

  // 非法落子留在盘上，孩子才能看见两个一样的朋友。
  if (conflict) {
    return {
      ...next,
      tried: play.tried + 1,
      completed: false,
      feedback: {
        tone: 'conflict',
        text: describeConflict(conflict.house, value),
        value,
      },
      focus: [conflict.other, { row, col }],
    };
  }

  if (isKidGridComplete(board)) {
    return {
      ...next,
      completed: true,
      feedback: {
        tone: 'done',
        text: '四行、四列、四个小宫都齐了。',
        value: null,
      },
    };
  }

  return {
    ...next,
    completed: false,
    feedback: {
      tone: 'placed',
      text: '放好了。再找只剩一个空位的地方。',
      value,
    },
  };
};

export const undoKidPlay = (play: KidPlay): KidPlay => {
  if (play.past.length === 0) return play;
  const past = play.past.slice();
  const board = past.pop() ?? play.board;
  return {
    ...play,
    board: cloneKidBoard(board),
    past,
    future: [cloneKidBoard(play.board), ...play.future],
    completed: isKidGridComplete(board),
    feedback: idle('回到上一步了。'),
    focus: [],
  };
};

export const redoKidPlay = (play: KidPlay): KidPlay => {
  const board = play.future[0];
  if (!board) return play;
  return {
    ...play,
    board: cloneKidBoard(board),
    past: [...play.past, cloneKidBoard(play.board)],
    future: play.future.slice(1),
    completed: isKidGridComplete(board),
    feedback: idle('回到刚才那一步了。'),
    focus: [],
  };
};

export const clearKidCell = (play: KidPlay): KidPlay => {
  if (play.completed || !play.selected) return play;
  const { row, col } = play.selected;
  if (play.givens[row][col] || play.board[row][col] === 0) return play;
  const board = cloneKidBoard(play.board);
  board[row][col] = 0;
  return {
    ...play,
    board,
    ...remember(play),
    completed: false,
    feedback: idle('拿走了。这个空格可以重放。'),
    focus: [],
  };
};

// 提示只看当前盘：先重复，再走不通的空格，再找只剩一个空位的一组。
const boardKey = (board: number[][]) => board.map((row) => row.join('')).join('|');

export const hintKidPlay = (play: KidPlay): KidPlay => {
  if (play.completed) return play;
  const ladder = coachLadder(play.board, play.givens);
  const key = boardKey(play.board);
  const index = play.coachKey === key ? Math.min(play.coachStep, ladder.length - 1) : 0;
  const step = ladder[index];
  return {
    ...play,
    coachKey: key,
    coachStep: index + 1 < ladder.length ? index + 1 : index,
    selected: step.focus ?? play.selected,
    focus: step.cells,
    feedback: {
      tone: step.kind === 'duplicate' || step.kind === 'stuck' ? 'conflict' : 'hint',
      text: step.text,
      value: step.value,
    },
  };
};
