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

// 六关答案各不相同，避免孩子记住同一张图。空位都要能靠「一组只剩一个空位」填完。
export const KID_LEVELS: KidLevel[] = [
  {
    id: 1,
    name: '小草地',
    puzzle: [
      [1, 2, 3, 0],
      [3, 4, 0, 2],
      [2, 0, 4, 3],
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
      [0, 0, 2, 4],
      [2, 4, 0, 0],
      [3, 1, 4, 2],
      [4, 2, 3, 1],
    ],
    solution: [
      [1, 3, 2, 4],
      [2, 4, 1, 3],
      [3, 1, 4, 2],
      [4, 2, 3, 1],
    ],
  },
  {
    id: 3,
    name: '彩虹桥',
    puzzle: [
      [0, 2, 4, 0],
      [3, 4, 2, 1],
      [2, 1, 3, 4],
      [0, 3, 1, 0],
    ],
    solution: [
      [1, 2, 4, 3],
      [3, 4, 2, 1],
      [2, 1, 3, 4],
      [4, 3, 1, 2],
    ],
  },
  {
    id: 4,
    name: '云朵山',
    puzzle: [
      [0, 0, 0, 4],
      [3, 4, 1, 2],
      [0, 3, 0, 1],
      [4, 0, 2, 3],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 3, 4, 1],
      [4, 1, 2, 3],
    ],
  },
  {
    id: 5,
    name: '星光谷',
    puzzle: [
      [0, 0, 0, 4],
      [3, 4, 1, 2],
      [0, 1, 0, 3],
      [2, 0, 4, 0],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [4, 1, 2, 3],
      [2, 3, 4, 1],
    ],
  },
  {
    id: 6,
    name: '终点城堡',
    puzzle: [
      [0, 0, 0, 4],
      [0, 4, 1, 0],
      [4, 0, 0, 1],
      [2, 1, 4, 0],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [4, 3, 2, 1],
      [2, 1, 4, 3],
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

export const computeUnlockedLevels = (stars: number): number =>
  Math.min(KID_LEVELS.length, 2 + Math.floor(stars / 2));

export const selectResumeLevel = (totalStars: number, levelStars: number[]): number => {
  const unlocked = computeUnlockedLevels(totalStars);
  for (let id = 1; id <= unlocked && id <= KID_LEVELS.length; id += 1) {
    if ((levelStars[id - 1] ?? 0) <= 0) return id;
  }
  return 1;
};
