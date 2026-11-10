import { describe, expect, it } from 'vitest';
import { layoutPlayfield } from '../src/stage/layout';
import { buildGridModel, buildWarmupModel } from '../src/stage/model';
import { createKidPlay, placeKidNumber } from '../src/kid-adventure/play';

describe('playfield layout', () => {
  it('keeps seats above the tray on a narrow 4x4 and a 6x6', () => {
    for (const spec of [
      { width: 320, height: 460, kind: 'grid' as const, size: 4, boxRows: 2, boxCols: 2, digits: [1, 2, 3, 4] },
      { width: 320, height: 540, kind: 'grid' as const, size: 6, boxRows: 2, boxCols: 3, digits: [1, 2, 3, 4, 5, 6] },
      { width: 390, height: 280, kind: 'warmup-row' as const, size: 4, boxRows: 1, boxCols: 4, digits: [1, 2, 3, 4] },
    ]) {
      const layout = layoutPlayfield(spec.width, spec.height, spec);
      expect(layout.seats.length).toBe(spec.kind === 'grid' ? spec.size * spec.size : 4);
      for (const seat of layout.seats) {
        expect(seat.y + seat.h).toBeLessThanOrEqual(layout.trayTop);
        expect(seat.x).toBeGreaterThanOrEqual(0);
        expect(seat.x + seat.w).toBeLessThanOrEqual(spec.width + 1);
      }
      for (const item of layout.tray) {
        expect(item.y).toBeGreaterThanOrEqual(layout.trayTop - 1);
        expect(item.y + item.h).toBeLessThanOrEqual(spec.height + 1);
      }
    }
  });

  it('marks the conflicting row and does not invent a second board value', () => {
    const play = createKidPlay(1);
    const next = placeKidNumber({ ...play, selected: { row: 0, col: 3 } }, 1);
    const model = buildGridModel(next);
    const clash = model.cells.filter((cell) => cell.conflict).map((cell) => `${cell.row}-${cell.col}`);
    expect(clash).toEqual(expect.arrayContaining(['0-0', '0-1', '0-2', '0-3', '3-3']));
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
});