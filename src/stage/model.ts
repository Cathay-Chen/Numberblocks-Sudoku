import { conflictCells } from '../kid-adventure/rules';
import { explainBand } from './spots';
import type { PlayfieldModel } from './playfield';

type Cell = { row: number; col: number };

const same = (left: Cell, right: Cell) => left.row === right.row && left.col === right.col;

const has = (cells: Cell[], cell: Cell) => cells.some((item) => same(item, cell));

export const buildGridModel = (play: {
  board: number[][];
  givens: boolean[][];
  selected: Cell | null;
  focus: Cell[];
  feedback: { tone: string; value: number | null };
  completed: boolean;
}): Omit<PlayfieldModel, 'rev'> => {
  const size = play.board.length === 6 ? 6 : 4;
  const boxRows = size === 6 ? 2 : 2;
  const boxCols = size === 6 ? 3 : 2;
  const band =
    play.feedback.tone === 'hint' || play.feedback.tone === 'conflict'
      ? explainBand(play.board, play.focus)
      : [];
  const duplicates = conflictCells(play.board);
  const guideAt =
    play.feedback.tone === 'hint' || play.feedback.tone === 'conflict'
      ? (play.focus[play.focus.length - 1] ?? play.selected)
      : play.selected;
  return {
    kind: 'grid',
    size,
    boxRows,
    boxCols,
    digits: Array.from({ length: size }, (_, index) => index + 1),
    closed: play.completed,
    guideValue: play.feedback.value,
    guideAt,
    cells: play.board.flatMap((row, rowIndex) =>
      row.map((value, col) => {
        const cell = { row: rowIndex, col };
        const selected = play.selected ? same(play.selected, cell) : false;
        return {
          ...cell,
          value,
          given: Boolean(play.givens[rowIndex]?.[col]),
          selected,
          hint: play.feedback.tone === 'hint' && has(band, cell),
          // 红框只留给真正重复的格子。整行只用淡色，不把空格也画成错。
          conflict: play.feedback.tone === 'conflict' && duplicates.has(`${rowIndex}-${col}`),
          band: play.feedback.tone === 'conflict' && has(band, cell),
          placed: play.feedback.tone === 'placed' && selected,
        };
      })
    ),
  };
};

export const buildWarmupModel = (play: {
  cells: number[];
  highlight: number[];
  house: 'row' | 'box';
  feedback: { tone: string; value: number | null };
  cleared: boolean;
}): Omit<PlayfieldModel, 'rev'> => ({
  kind: play.house === 'box' ? 'warmup-box' : 'warmup-row',
  size: play.cells.length,
  boxRows: play.house === 'box' ? 2 : 1,
  boxCols: play.house === 'box' ? 2 : play.cells.length,
  digits: [1, 2, 3, 4],
  closed: play.cleared,
  guideValue: play.feedback.value,
  guideAt: play.highlight.length ? { row: 0, col: play.highlight[play.highlight.length - 1] } : null,
  cells: play.cells.map((value, col) => ({
    row: 0,
    col,
    value,
    given: false,
    selected: false,
    hint: play.feedback.tone !== 'conflict' && play.highlight.includes(col),
    conflict: play.feedback.tone === 'conflict' && play.highlight.includes(col) && value !== 0,
    band: play.feedback.tone === 'conflict' && play.highlight.includes(col),
    placed: (play.feedback.tone === 'found' || play.feedback.tone === 'done') && play.highlight.includes(col) && value !== 0,
  })),
});
