export type SeatBox = {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TrayBox = {
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PlayLayout = {
  seats: SeatBox[];
  tray: TrayBox[];
  trayTop: number;
  height: number;
};

export type LayoutSpec = {
  kind: 'warmup-row' | 'warmup-box' | 'grid';
  size: number;
  boxRows: number;
  boxCols: number;
  digits: number[];
};

const LABEL_H = 22;

const placeRow = (boxes: { w: number; h: number }[], width: number, y: number, gap: number) => {
  const total = boxes.reduce((sum, box) => sum + box.w, 0) + gap * (boxes.length - 1);
  let x = Math.max(8, (width - total) / 2);
  return boxes.map((box) => {
    const at = { x, y, w: box.w, h: box.h };
    x += box.w + gap;
    return at;
  });
};

// 从顶上往下排。高度只包住棋盘和带数字的托盘，不在中间留空带。
export const layoutPlayfield = (width: number, spec: LayoutSpec): PlayLayout => {
  const digits = spec.digits.length > 0 ? spec.digits : [1, 2, 3, 4];
  const trayCols = digits.length > 4 ? 3 : digits.length;
  const trayRows = Math.ceil(digits.length / trayCols);
  const trayGap = 8;
  const face = Math.max(48, Math.min(68, Math.floor((width - 24 - trayGap * (trayCols - 1)) / trayCols)));
  const itemW = face;
  const itemH = face + LABEL_H;
  const boardTop = 6;
  const seats: SeatBox[] = [];
  let boardBottom = boardTop;

  if (spec.kind === 'warmup-row') {
    const count = Math.max(1, spec.size);
    const gap = 8;
    const size = Math.max(48, Math.min(84, Math.floor((width - 24 - gap * (count - 1)) / count)));
    const row = placeRow(Array.from({ length: count }, () => ({ w: size, h: size })), width, boardTop, gap);
    row.forEach((box, col) => seats.push({ row: 0, col, ...box }));
    boardBottom = boardTop + size;
  } else if (spec.kind === 'warmup-box') {
    const gap = 8;
    const size = Math.max(48, Math.min(84, Math.floor((Math.min(width - 48, width * 0.7) - gap) / 2)));
    const originX = (width - (size * 2 + gap)) / 2;
    for (let index = 0; index < 4; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      seats.push({
        row: 0,
        col: index,
        x: originX + col * (size + gap),
        y: boardTop + row * (size + gap),
        w: size,
        h: size,
      });
    }
    boardBottom = boardTop + size * 2 + gap;
  } else {
    const stacks = Math.max(1, spec.size / spec.boxCols);
    const bands = Math.max(1, spec.size / spec.boxRows);
    const boxGap = 6;
    const inner = 3;
    const frame = 4;
    const slot = (width - 16 - boxGap * (stacks - 1)) / stacks;
    const cell = Math.max(18, Math.floor((slot - frame * 2 - inner * (spec.boxCols - 1)) / spec.boxCols));
    const boxW = frame * 2 + spec.boxCols * cell + inner * (spec.boxCols - 1);
    const boxH = frame * 2 + spec.boxRows * cell + inner * (spec.boxRows - 1);
    const gridW = stacks * boxW + boxGap * (stacks - 1);
    const originX = (width - gridW) / 2;
    for (let row = 0; row < spec.size; row += 1) {
      for (let col = 0; col < spec.size; col += 1) {
        const boxCol = Math.floor(col / spec.boxCols);
        const boxRow = Math.floor(row / spec.boxRows);
        seats.push({
          row,
          col,
          x: originX + boxCol * (boxW + boxGap) + frame + (col % spec.boxCols) * (cell + inner),
          y: boardTop + boxRow * (boxH + boxGap) + frame + (row % spec.boxRows) * (cell + inner),
          w: cell,
          h: cell,
        });
      }
    }
    boardBottom = boardTop + bands * boxH + boxGap * (bands - 1);
  }

  const trayTop = boardBottom + 8;
  const tray: TrayBox[] = [];
  digits.forEach((value, index) => {
    const col = index % trayCols;
    const row = Math.floor(index / trayCols);
    const rowCount = Math.min(trayCols, digits.length - row * trayCols);
    const rowW = rowCount * itemW + trayGap * (rowCount - 1);
    const x = (width - rowW) / 2 + col * (itemW + trayGap);
    tray.push({ value, x, y: trayTop + row * (itemH + trayGap), w: itemW, h: itemH });
  });
  const height = Math.ceil(trayTop + trayRows * itemH + trayGap * (trayRows - 1) + 8);
  return { seats, tray, trayTop, height };
};
