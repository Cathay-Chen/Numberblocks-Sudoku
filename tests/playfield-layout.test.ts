import { describe, expect, it } from 'vitest';
import { layoutPlayfield } from '../src/stage/layout';
import { buildGridModel, buildWarmupModel } from '../src/stage/model';
import { createKidPlay, placeKidNumber } from '../src/kid-adventure/play';

describe('playfield layout', () => {
  it('keeps seats above the tray on a narrow 4x4 and a 6x6', () => {
    for (const spec of [
      { width: 340, kind: 'grid' as const, size: 4, boxRows: 2, boxCols: 2, digits: [1, 2, 3, 4], max: 450 },
      { width: 320, kind: 'grid' as const, size: 6, boxRows: 2, boxCols: 3, digits: [1, 2, 3, 4, 5, 6], max: 560 },
      { width: 390, kind: 'warmup-row' as const, size: 4, boxRows: 1, boxCols: 4, digits: [1, 2, 3, 4], max: 230 },
    ]) {
      const layout = layoutPlayfield(spec.width, spec);
      expect(layout.seats.length).toBe(spec.kind === 'grid' ? spec.size * spec.size : 4);
      expect(layout.height).toBeLessThanOrEqual(spec.max);
      expect(layout.tray[0].h).toBeGreaterThan(layout.tray[0].w);
      for (const seat of layout.seats) {
        expect(seat.y + seat.h).toBeLessThanOrEqual(layout.trayTop);
        expect(seat.x).toBeGreaterThanOrEqual(0);
        expect(seat.x + seat.w).toBeLessThanOrEqual(spec.width + 1);
      }
      for (const item of layout.tray) {
        expect(item.y).toBeGreaterThanOrEqual(layout.trayTop - 1);
        expect(item.y + item.h).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('marks only the duplicate cells and tints the rest of the line', () => {
    const play = createKidPlay(1);
    const next = placeKidNumber({ ...play, selected: { row: 0, col: 3 } }, 1);
    const model = buildGridModel(next);
    const clash = model.cells.filter((cell) => cell.conflict).map((cell) => `${cell.row}-${cell.col}`);
    expect(clash.sort()).toEqual(['0-0', '0-3', '3-3']);
    const row = model.cells.filter((cell) => cell.row === 0);
    expect(row.filter((cell) => cell.band).map((cell) => cell.col)).toEqual([0, 1, 2, 3]);
    expect(row.find((cell) => cell.col === 1)?.conflict).toBe(false);
    expect(row.find((cell) => cell.col === 2)?.conflict).toBe(false);
    expect(model.cells.find((cell) => cell.row === 0 && cell.col === 3)?.value).toBe(1);
    const warmup = buildWarmupModel({
      cells: [1, 2, 3, 0],
      highlight: [3],
      house: 'row',
      feedback: { tone: 'done', value: 4 },
      cleared: true,
    });
    expect(warmup.kind).toBe('warmup-row');
    expect(warmup.closed).toBe(true);
    expect(warmup.cells).toHaveLength(4);
  });

  it('keeps every 6x6 tray digit fully inside a short phone and at least 44px', () => {
    const spec = { kind: 'grid' as const, size: 6, boxRows: 2, boxCols: 3, digits: [1, 2, 3, 4, 5, 6] };
    for (const [width, maxHeight] of [
      [272, 420],
      [312, 460],
      [342, 520],
    ] as const) {
      const layout = layoutPlayfield(width, spec, { maxHeight });
      expect(layout.height).toBeLessThanOrEqual(maxHeight);
      expect(layout.tray).toHaveLength(6);
      for (const item of layout.tray) {
        expect(item.w).toBeGreaterThanOrEqual(44);
        expect(item.h).toBeGreaterThanOrEqual(44);
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x + item.w).toBeLessThanOrEqual(width + 1);
        expect(item.y + item.h).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('puts six digits on one row when they fit, and beside the board when the stage is wide', () => {
    const spec = { kind: 'grid' as const, size: 6, boxRows: 2, boxCols: 3, digits: [1, 2, 3, 4, 5, 6] };
    const phone = layoutPlayfield(300, spec, { maxHeight: 460 });
    expect(new Set(phone.tray.map((item) => item.y)).size).toBe(1);
    expect(phone.tray[0].w).toBeGreaterThanOrEqual(44);
    expect(phone.tray[0].w).toBeLessThanOrEqual(52);
    const cell = Math.min(...phone.seats.map((seat) => seat.w));
    expect(cell).toBeGreaterThanOrEqual(36);
    const row = layoutPlayfield(342, spec);
    expect(new Set(row.tray.map((item) => item.y)).size).toBe(1);
    const wide = layoutPlayfield(680, spec);
    expect(wide.beside).toBe(true);
    const boardRight = Math.max(...wide.seats.map((seat) => seat.x + seat.w));
    const trayLeft = Math.min(...wide.tray.map((item) => item.x));
    expect(trayLeft).toBeGreaterThan(boardRight);
    const boardTop = Math.min(...wide.seats.map((seat) => seat.y));
    const boardBottom = Math.max(...wide.seats.map((seat) => seat.y + seat.h));
    const trayTop = Math.min(...wide.tray.map((item) => item.y));
    const trayBottom = Math.max(...wide.tray.map((item) => item.y + item.h));
    const boardMid = (boardTop + boardBottom) / 2;
    const trayMid = (trayTop + trayBottom) / 2;
    expect(Math.abs(boardMid - trayMid)).toBeLessThan(20);
    expect(trayBottom - trayTop).toBeGreaterThan((boardBottom - boardTop) * 0.7);
  });
});