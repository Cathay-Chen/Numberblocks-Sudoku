export type KidBoard = number[][];

export type KidLevel = {
  id: number;
  name: string;
  puzzle: KidBoard;
  solution: KidBoard;
};

export type KidLevelState = {
  levelId: number;
  board: KidBoard;
  solution: KidBoard;
  givens: boolean[][];
};

const cloneKidBoard = (board: KidBoard): KidBoard => board.map((row) => row.slice());

export const KID_LEVELS: KidLevel[] = [
  {
    id: 1,
    name: '小草地',
    puzzle: [
      [1, 0, 3, 4],
      [0, 4, 1, 0],
      [2, 0, 0, 3],
      [0, 3, 2, 1],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
  },
  {
    id: 2,
    name: '泡泡河',
    puzzle: [
      [0, 2, 3, 0],
      [3, 0, 0, 2],
      [0, 1, 4, 0],
      [4, 0, 0, 1],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
  },
  {
    id: 3,
    name: '彩虹桥',
    puzzle: [
      [1, 0, 0, 4],
      [0, 4, 1, 0],
      [0, 1, 4, 0],
      [4, 0, 0, 1],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
  },
  {
    id: 4,
    name: '云朵山',
    puzzle: [
      [0, 2, 0, 4],
      [3, 0, 1, 0],
      [0, 1, 0, 3],
      [4, 0, 2, 0],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
  },
  {
    id: 5,
    name: '星光谷',
    puzzle: [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
  },
  {
    id: 6,
    name: '终点城堡',
    puzzle: [
      [0, 0, 3, 0],
      [0, 4, 0, 2],
      [2, 0, 4, 0],
      [0, 3, 0, 0],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
  },
];

export const createKidLevelState = (levelId: number): KidLevelState => {
  const level = KID_LEVELS.find((item) => item.id === levelId) ?? KID_LEVELS[0];
  const board = cloneKidBoard(level.puzzle);
  const solution = cloneKidBoard(level.solution);
  return {
    levelId: level.id,
    board,
    solution,
    givens: board.map((row) => row.map((value) => value !== 0)),
  };
};

export const isKidLevelSolved = (board: KidBoard, solution: KidBoard): boolean => {
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (board[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
};

export const computeUnlockedLevels = (stars: number): number =>
  Math.min(KID_LEVELS.length, 2 + Math.floor(stars / 2));
