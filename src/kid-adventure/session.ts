import { KID_LEVELS } from './engine';
import { HINT_NONE, isHintDepth, type HintDepth } from './learning';
import { lessonById } from './lessons';
import type { KidPlay } from './play';
import { isKidGridComplete } from './rules';

export const KID_SESSION_KEY = 'numberblocks.kid-board.v1';
export const SESSION_VERSION = 1;
export const SIX_SESSION_VERSION = 2;
const MAX_HISTORY = 80;

export type KidSession = {
  v?: number;
  levelId: number;
  lessonId?: string;
  board: number[][];
  past: number[][][];
  future: number[][][];
  selected: { row: number; col: number } | null;
  hintsUsed?: number;
  mistakes?: number;
  hintDepth?: HintDepth;
  hintUnrated?: boolean;
};

type ReadStorage = { getItem: (key: string) => string | null };
type WriteStorage = { setItem: (key: string, value: string) => void };

const isBoard = (value: unknown, size: number): value is number[][] =>
  Array.isArray(value) &&
  value.length === size &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === size &&
      row.every((cell) => typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell <= size)
  );

const countOrZero = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

// 6×6 半盘仍是 v:2，4×4 仍是 v:1。层数是后加的可选字段。只有次数、没有层数时不能猜。
const hintMark = (parsed: Partial<KidSession>): Pick<KidSession, 'hintDepth' | 'hintUnrated'> => {
  const hintsUsed = countOrZero(parsed.hintsUsed);
  if (parsed.hintUnrated === true || (!isHintDepth(parsed.hintDepth) && hintsUsed > 0)) {
    return { hintDepth: HINT_NONE, hintUnrated: true };
  }
  return { hintDepth: isHintDepth(parsed.hintDepth) ? parsed.hintDepth : HINT_NONE, hintUnrated: false };
};

const isCell = (value: unknown, size: number): value is { row: number; col: number } | null => {
  if (value == null) return true;
  if (typeof value !== 'object') return false;
  const cell = value as { row?: unknown; col?: unknown };
  return (
    typeof cell.row === 'number' &&
    typeof cell.col === 'number' &&
    cell.row >= 0 &&
    cell.row < size &&
    cell.col >= 0 &&
    cell.col < size
  );
};

export const parseKidSession = (raw: string | null): KidSession | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KidSession>;
    if (typeof parsed.lessonId === 'string') {
      const lesson = lessonById(parsed.lessonId);
      if (!lesson) return null;
      const size = lesson.puzzle.length;
      // 6×6 用 v:2。旧代码只认 v:1 的 4×4，对不上就丢掉这盘，不改星星。
      const expectedVersion = size === 6 ? SIX_SESSION_VERSION : SESSION_VERSION;
      if (parsed.v !== expectedVersion || !isBoard(parsed.board, size)) return null;
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          if (lesson.puzzle[row][col] !== 0 && parsed.board[row][col] !== lesson.puzzle[row][col]) return null;
        }
      }
      const past = Array.isArray(parsed.past) ? parsed.past.filter((board) => isBoard(board, size)).slice(-MAX_HISTORY) : [];
      const future = Array.isArray(parsed.future) ? parsed.future.filter((board) => isBoard(board, size)).slice(0, MAX_HISTORY) : [];
      if (!isCell(parsed.selected ?? null, size)) return null;
      const selected = parsed.selected ?? null;
      return {
        v: expectedVersion,
        levelId: 0,
        lessonId: lesson.id,
        board: parsed.board.map((row) => row.slice()),
        past: past.map((board) => board.map((row) => row.slice())),
        future: future.map((board) => board.map((row) => row.slice())),
        selected: selected ? { row: selected.row, col: selected.col } : null,
        hintsUsed: countOrZero(parsed.hintsUsed),
        mistakes: countOrZero(parsed.mistakes),
        ...hintMark(parsed),
      };
    }
    if (typeof parsed.levelId !== 'number') return null;
    const level = KID_LEVELS.find((item) => item.id === parsed.levelId);
    if (!level || !isBoard(parsed.board, 4)) return null;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (level.puzzle[row][col] !== 0 && parsed.board[row][col] !== level.puzzle[row][col]) return null;
      }
    }
    const past = Array.isArray(parsed.past) ? parsed.past.filter((board) => isBoard(board, 4)).slice(-MAX_HISTORY) : [];
    const future = Array.isArray(parsed.future) ? parsed.future.filter((board) => isBoard(board, 4)).slice(0, MAX_HISTORY) : [];
    if (!isCell(parsed.selected ?? null, 4)) return null;
    const selected = parsed.selected ?? null;
    return {
      v: parsed.v === SESSION_VERSION ? SESSION_VERSION : undefined,
      levelId: level.id,
      board: parsed.board.map((row) => row.slice()),
      past: past.map((board) => board.map((row) => row.slice())),
      future: future.map((board) => board.map((row) => row.slice())),
      selected: selected ? { row: selected.row, col: selected.col } : null,
      hintsUsed: countOrZero(parsed.hintsUsed),
      mistakes: countOrZero(parsed.mistakes),
      ...hintMark(parsed),
    };
  } catch {
    return null;
  }
};

export const loadKidSession = (storage: ReadStorage): KidSession | null => {
  try {
    return parseKidSession(storage.getItem(KID_SESSION_KEY));
  } catch {
    return null;
  }
};

export const saveKidSession = (storage: WriteStorage, play: KidPlay) => {
  const session: KidSession = {
    v: play.board.length === 6 ? SIX_SESSION_VERSION : SESSION_VERSION,
    levelId: play.levelId,
    board: play.board.map((row) => row.slice()),
    past: play.past.slice(-MAX_HISTORY).map((board) => board.map((row) => row.slice())),
    future: play.future.slice(0, MAX_HISTORY).map((board) => board.map((row) => row.slice())),
    selected: play.selected ? { row: play.selected.row, col: play.selected.col } : null,
    hintsUsed: play.hintsUsed,
    mistakes: play.tried,
  };
  if (play.hintUnrated) session.hintUnrated = true;
  else session.hintDepth = play.hintDepth;
  if (play.lessonId) session.lessonId = play.lessonId;
  storage.setItem(KID_SESSION_KEY, JSON.stringify(session));
};

export const boardIsUntouched = (play: KidPlay) => {
  const level = KID_LEVELS.find((item) => item.id === play.levelId);
  if (!level || play.past.length > 0 || play.future.length > 0) return false;
  return play.board.every((row, rowIndex) => row.every((cell, colIndex) => cell === level.puzzle[rowIndex][colIndex]));
};

export const restoreKidPlay = (play: KidPlay, session: KidSession): KidPlay => ({
  ...play,
  board: session.board.map((row) => row.slice()),
  past: session.past.map((board) => board.map((row) => row.slice())),
  future: session.future.map((board) => board.map((row) => row.slice())),
  selected: session.selected,
  tried: session.mistakes ?? play.tried,
  hintsUsed: session.hintsUsed ?? play.hintsUsed,
  hintDepth: session.hintUnrated ? HINT_NONE : (session.hintDepth ?? play.hintDepth),
  hintUnrated: Boolean(session.hintUnrated),
  completed: isKidGridComplete(session.board),
  feedback: { tone: 'idle', text: '接着上次的格子。', value: null },
  focus: [],
});
