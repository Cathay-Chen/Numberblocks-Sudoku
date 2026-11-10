import { allKidHouses, geometryOf } from '../kid-adventure/rules';

export type StageCell = {
  row: number;
  col: number;
};

export type StageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// 过关朋友停在自己的格子里，底边停在完成句上方，避免跳一下就盖住字。
export const cheerPlacement = (
  slot: StageBox,
  limitTop: number | null
): { x: number; y: number; size: number } => {
  const gap = 8;
  const ceiling = limitTop == null ? slot.y + slot.h : limitTop - gap;
  const available = Math.max(0, ceiling - slot.y);
  const size = Math.min(slot.w, slot.h, available);
  const y = Math.min(slot.y + slot.h / 2, ceiling - size / 2);
  return { x: slot.x + slot.w / 2, y, size };
};

const same = (left: StageCell, right: StageCell) => left.row === right.row && left.col === right.col;

const copy = (cell: StageCell): StageCell => ({ row: cell.row, col: cell.col });

// 两个冲突格扩成它们共同的那一组。行先于列，列先于宫，和落子时的判定顺序一样。
// 单个格子不扩，避免「坐这里」被画成整行。没有棋盘时保持调用方给的格子。
export const explainBand = (board: number[][] | null, cells: StageCell[]): StageCell[] => {
  const listed = cells.map(copy);
  if (listed.length <= 1 || !board) return listed;
  for (const house of allKidHouses(geometryOf(board))) {
    const covers = listed.every((cell) => house.cells.some((item) => same(item, cell)));
    if (covers) return house.cells.map(copy);
  }
  return listed;
};
