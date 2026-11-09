import { KID_LEVELS } from './engine';
import { lessonById } from './lessons';
import type { KidPlay } from './play';
import { isKidGridComplete } from './rules';

export const KID_SESSION_KEY = 'numberblocks.kid-board.v1';
export const SESSION_VERSION = 1;
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
};

type ReadStorage = { getItem: (key: string) => string | null };
type WriteStorage = { setItem: (key: string, value: string) => void };

const isBoard = (value: unknown): value is number[][] =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 4 &&
      row.every((cell) => typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell <= 4)
  );

const countOrZero = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

const isCell = (value: unknown): value is { row: number; col: number } | null => {
  if (value == null) return true;
  if (typeof value !== 'object') return false;
  const cell = value as { row?: unknown; col?: unknown };
  return (
    typeof cell.row === 'number' &&
    typeof cell.col === 'number' &&
    cell.row >= 0 &&
    cell.row < 4 &&
    cell.col >= 0 &&
    cell.col < 4
  );
};

export const parseKidSession = (raw: string | null): KidSession | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KidSession>;
    if (typeof parsed.lessonId === 'string') {
      if (parsed.v !== SESSION_VERSION) return null;
      const lesson = lessonById(parsed.lessonId);
      if (!lesson || !isBoard(parsed.board)) return null;
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          if (lesson.puzzle[row][col] !== 0 && parsed.board[row][col] !== lesson.puzzle[row][col]) return null;
        }
      }
      const past = Array.isArray(parsed.past) ? parsed.past.filter(isBoard).slice(-MAX_HISTORY) : [];
      const future = Array.isArray(parsed.future) ? parsed.future.filter(isBoard).slice(0, MAX_HISTORY) : [];
      if (!isCell(parsed.selected ?? null)) return null;
      const selected = parsed.selected ?? null;
      return {
        v: SESSION_VERSION,
        levelId: 0,
        lessonId: lesson.id,
        board: parsed.board.map((row) => row.slice()),
        past: past.map((board) => board.map((row) => row.slice())),
        future: future.map((board) => board.map((row) => row.slice())),
        selected: selected ? { row: selected.row, col: selected.col } : null,
        hintsUsed: countOrZero(parsed.hintsUsed),
        mistakes: countOrZero(parsed.mistakes),
      };
    }
    if (typeof parsed.levelId !== 'number') return null;
    const level = KID_LEVELS.find((item) => item.id === parsed.levelId);
    if (!level || !isBoard(parsed.board)) return null;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (level.puzzle[row][col] !== 0 && parsed.board[row][col] !== level.puzzle[row][col]) return null;
      }
    }
    const past = Array.isArray(parsed.past) ? parsed.past.filter(isBoard).slice(-MAX_HISTORY) : [];
    const future = Array.isArray(parsed.future) ? parsed.future.filter(isBoard).slice(0, MAX_HISTORY) : [];
    if (!isCell(parsed.selected ?? null)) return null;
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
    v: SESSION_VERSION,
    levelId: play.levelId,
    board: play.board.map((row) => row.slice()),
    past: play.past.slice(-MAX_HISTORY).map((board) => board.map((row) => row.slice())),
    future: play.future.slice(0, MAX_HISTORY).map((board) => board.map((row) => row.slice())),
    selected: play.selected ? { row: play.selected.row, col: play.selected.col } : null,
    hintsUsed: play.hintsUsed,
    mistakes: play.tried,
  };
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
  completed: isKidGridComplete(session.board),
  feedback: { tone: 'idle', text: '接着上次的格子。', value: null },
  focus: [],
});
