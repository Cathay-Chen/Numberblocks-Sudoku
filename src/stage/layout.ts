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
  beside: boolean;
};

export type LayoutSpec = {
  kind: 'warmup-row' | 'warmup-box' | 'grid';
  size: number;
  boxRows: number;
  boxCols: number;
  digits: number[];
};

export type LayoutOptions = {
  // 舞台从视口顶往下还能用的高度。托盘必须整块落在这里面，不能被裁掉。
  maxHeight?: number;
};

const LABEL_H = 22;
const TAP = 44;
const PAD = 8;

const placeRow = (boxes: { w: number; h: number }[], width: number, y: number, gap: number) => {
  const total = boxes.reduce((sum, box) => sum + box.w, 0) + gap * (boxes.length - 1);
  let x = Math.max(PAD, (width - total) / 2);
  return boxes.map((box) => {
    const at = { x, y, w: box.w, h: box.h };
    x += box.w + gap;
    return at;
  });
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// 窄屏六个朋友排成一行，每格大约 46px。放不下 44px 才回到两行三列。
const tightSixRow = (width: number, count: number): { gap: number; face: number } | null => {
  const inner = width - 8;
  for (const gap of [4, 3, 2]) {
    const raw = Math.floor((inner - gap * (count - 1)) / count);
    if (raw >= TAP) return { gap, face: Math.min(raw, 52) };
  }
  return null;
};

const trayGapFor = (width: number, count: number, cols: number) => {
  if (cols !== count || count <= 1) return 8;
  const inner = width - PAD * 2;
  const leftover = inner - count * TAP;
  const gap = Math.floor(leftover / (count - 1));
  return clamp(gap, 4, 8);
};

type TrayMetrics = {
  cols: number;
  rows: number;
  gap: number;
  itemW: number;
  itemH: number;
  blockW: number;
  blockH: number;
};

const trayMetrics = (count: number, cols: number, gap: number, face: number): TrayMetrics => {
  const rows = Math.max(1, Math.ceil(count / cols));
  const itemW = Math.max(1, face);
  const itemH = Math.max(TAP, face + LABEL_H);
  return {
    cols,
    rows,
    gap,
    itemW,
    itemH,
    blockW: cols * itemW + gap * (cols - 1),
    blockH: rows * itemH + gap * (rows - 1),
  };
};

const faceFor = (span: number, cols: number, gap: number) => {
  const raw = Math.floor((span - gap * Math.max(0, cols - 1)) / Math.max(1, cols));
  return clamp(raw, TAP, 72);
};

const seatsForGrid = (
  spec: LayoutSpec,
  originX: number,
  boardWidth: number,
  boardTop: number,
  cell: number
): { seats: SeatBox[]; boardHeight: number } => {
  const stacks = Math.max(1, spec.size / spec.boxCols);
  const bands = Math.max(1, spec.size / spec.boxRows);
  const boxGap = 6;
  const inner = 3;
  const frame = 4;
  const boxW = frame * 2 + spec.boxCols * cell + inner * (spec.boxCols - 1);
  const boxH = frame * 2 + spec.boxRows * cell + inner * (spec.boxRows - 1);
  const gridW = stacks * boxW + boxGap * (stacks - 1);
  const x0 = originX + Math.max(0, (boardWidth - gridW) / 2);
  const seats: SeatBox[] = [];
  for (let row = 0; row < spec.size; row += 1) {
    for (let col = 0; col < spec.size; col += 1) {
      const boxCol = Math.floor(col / spec.boxCols);
      const boxRow = Math.floor(row / spec.boxRows);
      seats.push({
        row,
        col,
        x: x0 + boxCol * (boxW + boxGap) + frame + (col % spec.boxCols) * (cell + inner),
        y: boardTop + boxRow * (boxH + boxGap) + frame + (row % spec.boxRows) * (cell + inner),
        w: cell,
        h: cell,
      });
    }
  }
  return { seats, boardHeight: bands * boxH + boxGap * (bands - 1) };
};

const preferredCell = (boardWidth: number, spec: LayoutSpec) => {
  const stacks = Math.max(1, spec.size / spec.boxCols);
  const boxGap = 6;
  const inner = 3;
  const frame = 4;
  const slot = (boardWidth - boxGap * (stacks - 1)) / stacks;
  return Math.max(16, Math.floor((slot - frame * 2 - inner * (spec.boxCols - 1)) / spec.boxCols));
};

const placeTray = (digits: number[], metrics: TrayMetrics, originX: number, originY: number): TrayBox[] => {
  const tray: TrayBox[] = [];
  digits.forEach((value, index) => {
    const col = index % metrics.cols;
    const row = Math.floor(index / metrics.cols);
    const rowCount = Math.min(metrics.cols, digits.length - row * metrics.cols);
    const rowW = rowCount * metrics.itemW + metrics.gap * (rowCount - 1);
    const x = originX + (metrics.blockW - rowW) / 2 + col * (metrics.itemW + metrics.gap);
    tray.push({
      value,
      x,
      y: originY + row * (metrics.itemH + metrics.gap),
      w: metrics.itemW,
      h: metrics.itemH,
    });
  });
  return tray;
};

const wantsBeside = (width: number, spec: LayoutSpec, maxHeight?: number) => {
  if (spec.kind !== 'grid' || spec.digits.length < 4) return false;
  if (width >= 560) return true;
  return maxHeight != null && maxHeight < 430 && width >= 400 && spec.digits.length > 4;
};

// 从顶上往下排。高度只包住棋盘和托盘。宽屏把托盘放到棋盘旁边，窄屏在装得下时改成一行。
export const layoutPlayfield = (width: number, spec: LayoutSpec, options: LayoutOptions = {}): PlayLayout => {
  const digits = spec.digits.length > 0 ? spec.digits : [1, 2, 3, 4];
  const boardTop = 6;
  const beside = wantsBeside(width, spec, options.maxHeight);

  if (spec.kind !== 'grid') {
    const seats: SeatBox[] = [];
    let boardBottom = boardTop;
    if (spec.kind === 'warmup-row') {
      const count = Math.max(1, spec.size);
      const gap = 8;
      const size = Math.max(48, Math.min(84, Math.floor((width - 24 - gap * (count - 1)) / count)));
      const row = placeRow(
        Array.from({ length: count }, () => ({ w: size, h: size })),
        width,
        boardTop,
        gap
      );
      row.forEach((box, col) => seats.push({ row: 0, col, ...box }));
      boardBottom = boardTop + size;
    } else {
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
    }
    const cols = digits.length;
    const gap = 8;
    const face = faceFor(width - PAD * 2, cols, gap);
    const metrics = trayMetrics(digits.length, cols, gap, face);
    const trayTop = boardBottom + 8;
    const tray = placeTray(digits, metrics, (width - metrics.blockW) / 2, trayTop);
    const height = Math.ceil(trayTop + metrics.blockH + PAD);
    return { seats, tray, trayTop, height, beside: false };
  }

  const sixBeside = beside && digits.length >= 6;
  const tight = !beside ? tightSixRow(width, digits.length) : null;
  const cols = sixBeside ? 1 : beside ? (digits.length > 4 ? 2 : digits.length) : tight ? digits.length : digits.length > 4 ? 3 : digits.length;
  const gap = tight ? tight.gap : trayGapFor(beside ? 220 : width, digits.length, cols);
  const build = (cell: number, face: number) => {
    if (sixBeside) {
      const trayW = 76;
      const boardWidth = Math.max(120, width - PAD * 2 - trayW - 12);
      const fitted = Math.min(cell, clamp(preferredCell(boardWidth, spec), 16, 84));
      const { seats, boardHeight } = seatsForGrid(spec, PAD, boardWidth, boardTop, fitted);
      const rows = digits.length;
      let sized = clamp(Math.floor((boardHeight - gap * (rows - 1)) / rows) - LABEL_H, TAP, 72);
      let metrics = trayMetrics(digits.length, 1, gap, sized);
      while (metrics.blockH > boardHeight + 2 && sized > TAP) {
        sized -= 1;
        metrics = trayMetrics(digits.length, 1, gap, sized);
      }
      const trayY = boardTop + Math.max(0, (boardHeight - metrics.blockH) / 2);
      const tray = placeTray(digits, metrics, PAD + boardWidth + 12, trayY);
      const height = Math.ceil(boardTop + Math.max(boardHeight, metrics.blockH) + PAD);
      return { seats, tray, trayTop: trayY, height, beside: true, face: sized, cell: fitted };
    }
    const metrics = trayMetrics(digits.length, cols, gap, face);
    if (beside) {
      const trayW = metrics.blockW;
      const boardWidth = Math.max(80, width - PAD * 2 - trayW - 12);
      const fitted = Math.min(cell, preferredCell(boardWidth, spec));
      const { seats, boardHeight } = seatsForGrid(spec, PAD, boardWidth, boardTop, fitted);
      const blockH = Math.max(boardHeight, metrics.blockH);
      const trayY = boardTop + Math.max(0, (boardHeight - metrics.blockH) / 2);
      const tray = placeTray(digits, metrics, PAD + boardWidth + 12, trayY);
      const height = Math.ceil(boardTop + blockH + PAD);
      return { seats, tray, trayTop: trayY, height, beside: true, face, cell: fitted };
    }
    const { seats, boardHeight } = seatsForGrid(spec, PAD, width - PAD * 2, boardTop, cell);
    const trayTop = boardTop + boardHeight + 8;
    const tray = placeTray(digits, metrics, (width - metrics.blockW) / 2, trayTop);
    const height = Math.ceil(trayTop + metrics.blockH + PAD);
    return { seats, tray, trayTop, height, beside: false, face, cell };
  };

  const traySpan = beside ? cols * 64 + gap * Math.max(0, cols - 1) : width - (tight ? 8 : PAD * 2);
  let face = tight ? tight.face : faceFor(traySpan, cols, gap);
  const boardWidth = beside
    ? Math.max(80, width - PAD * 2 - (sixBeside ? 76 : cols * face + gap * Math.max(0, cols - 1)) - 12)
    : width - 16;
  let cell = clamp(preferredCell(boardWidth, spec), 16, 84);
  let layout = build(cell, face);
  const limit = options.maxHeight;
  while (limit != null && layout.height > limit && (cell > 18 || face > TAP)) {
    if (cell > 18) cell -= 1;
    else face -= 1;
    layout = build(cell, face);
  }
  return {
    seats: layout.seats,
    tray: layout.tray,
    trayTop: layout.trayTop,
    height: layout.height,
    beside: layout.beside,
  };
};

// 舞台顶已经在视口里时，托盘和下面那句反馈都要留在这一屏里。
export const viewportBudget = (top: number, viewport: number) => {
  if (top < 0 || top >= viewport) return undefined;
  return Math.max(280, Math.floor(viewport - top - 56));
};
