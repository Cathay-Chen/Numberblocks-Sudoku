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
};

export type LayoutSpec = {
  kind: 'warmup-row' | 'warmup-box' | 'grid';
  size: number;
  boxRows: number;
  boxCols: number;
  digits: number[];
};

const placeRow = (boxes: { w: number; h: number }[], width: number, y: number, gap: number) => {
  const total = boxes.reduce((sum, box) => sum + box.w, 0) + gap * (boxes.length - 1);
  let x = Math.max(8, (width - total) / 2);
  return boxes.map((box) => {
    const at = { x, y, w: box.w, h: box.h };
    x += box.w + gap;
    return at;
  });
};

export const layoutPlayfield = (width: number, height: number, spec: LayoutSpec): PlayLayout => {
  const digits = spec.digits.length > 0 ? spec.digits : [1, 2, 3, 4];
  const trayCols = digits.length > 4 ? 3 : digits.length;
  const trayRows = Math.ceil(digits.length / trayCols);
  const trayGap = 8;
  const trayItem = Math.max(44, Math.min(72, Math.floor((width - 24 - trayGap * (trayCols - 1)) / trayCols)));
  const trayH = trayRows * trayItem + trayGap * (trayRows - 1);
  const trayTop = Math.max(80, height - 12 - trayH);
  const tray: TrayBox[] = [];
  digits.forEach((value, index) => {
    const col = index % trayCols;
    const row = Math.floor(index / trayCols);
    const rowCount = Math.min(trayCols, digits.length - row * trayCols);
    const rowW = rowCount * trayItem + trayGap * (rowCount - 1);
    const x = (width - rowW) / 2 + col * (trayItem + trayGap);
    tray.push({ value, x, y: trayTop + row * (trayItem + trayGap), w: trayItem, h: trayItem });
  });

  const boardTop = 8;
  const boardH = Math.max(48, trayTop - boardTop - 10);
  const seats: SeatBox[] = [];

  if (spec.kind === 'warmup-row') {
    const count = Math.max(1, spec.size);
    const gap = 8;
    const size = Math.max(36, Math.min(96, Math.floor((width - 24 - gap * (count - 1)) / count), boardH - 8));
    const y = boardTop + Math.max(0, (boardH - size) / 2);
    const row = placeRow(Array.from({ length: count }, () => ({ w: size, h: size })), width, y, gap);
    row.forEach((box, col) => seats.push({ row: 0, col, ...box }));
    return { seats, tray, trayTop };
  }

  if (spec.kind === 'warmup-box') {
    const gap = 8;
    const size = Math.max(36, Math.min(92, Math.floor((Math.min(width - 48, boardH) - gap) / 2)));
    const originX = (width - (size * 2 + gap)) / 2;
    const originY = boardTop + Math.max(0, (boardH - (size * 2 + gap)) / 2);
    for (let index = 0; index < 4; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      seats.push({
        row: 0,
        col: index,
        x: originX + col * (size + gap),
        y: originY + row * (size + gap),
        w: size,
        h: size,
      });
    }
    return { seats, tray, trayTop };
  }

  const stacks = Math.max(1, spec.size / spec.boxCols);
  const bands = Math.max(1, spec.size / spec.boxRows);
  const boxGap = 6;
  const inner = 3;
  const frame = 4;
  const cellW = (width - 16 - boxGap * (stacks - 1)) / stacks;
  const cellH = boardH / bands;
  const fromW = (cellW - frame * 2 - inner * (spec.boxCols - 1)) / spec.boxCols;
  const fromH = (cellH - frame * 2 - inner * (spec.boxRows - 1) - boxGap) / spec.boxRows;
  const cell = Math.max(16, Math.floor(Math.min(fromW, fromH)));
  const boxW = frame * 2 + spec.boxCols * cell + inner * (spec.boxCols - 1);
  const boxH = frame * 2 + spec.boxRows * cell + inner * (spec.boxRows - 1);
  const gridW = stacks * boxW + boxGap * (stacks - 1);
  const gridH = bands * boxH + boxGap * (bands - 1);
  const originX = (width - gridW) / 2;
  const originY = boardTop + Math.max(0, (boardH - gridH) / 2);
  for (let row = 0; row < spec.size; row += 1) {
    for (let col = 0; col < spec.size; col += 1) {
      const boxCol = Math.floor(col / spec.boxCols);
      const boxRow = Math.floor(row / spec.boxRows);
      const x = originX + boxCol * (boxW + boxGap) + frame + (col % spec.boxCols) * (cell + inner);
      const y = originY + boxRow * (boxH + boxGap) + frame + (row % spec.boxRows) * (cell + inner);
      seats.push({ row, col, x, y, w: cell, h: cell });
    }
  }
  return { seats, tray, trayTop };
};
