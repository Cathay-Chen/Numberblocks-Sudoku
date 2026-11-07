import { useEffect, useMemo, useRef, useState } from 'react';
import { GAME_ACTIONS, type GameAction } from '../game/actions';
import {
  buildCoachMessage,
  findSingleCandidateHint,
  getRewardDelta,
} from '../game/kidMode';
import { applyHint, findConflicts } from '../sudoku/logic';
import type { Difficulty, GameState } from '../game/types';
import { sfx } from '../audio/sfx';
import {
  cloneBoard,
  cloneNotes,
  createInitialState,
  getCandidates,
  isComplete,
} from '../game/utils';
import { loadKidProgress, resolveWarmupDone, saveKidProgress } from '../kid-adventure/progression';

type Snapshot = {
  board: number[][];
  notes: boolean[][][];
};

const toSnapshot = (state: GameState): Snapshot => ({
  board: cloneBoard(state.board),
  notes: cloneNotes(state.notes),
});

const HISTORY_LIMIT = 200;
const KID_LEVEL_COUNT = 6;

type UserAction = Difficulty | GameAction;

const normalizeKidLevelStars = (input: number[]): number[] =>
  input.slice(0, KID_LEVEL_COUNT).concat(Array(KID_LEVEL_COUNT).fill(0)).slice(0, KID_LEVEL_COUNT);

const createBootState = (): GameState => {
  const base = createInitialState('easy');
  const kidBase: GameState = {
    ...base,
    experienceMode: 'kid',
    kidMode: true,
    kidAdventureMode: true,
  };
  if (typeof window === 'undefined') return kidBase;
  const progress = loadKidProgress(window.localStorage);
  if (!progress) return kidBase;
  return {
    ...kidBase,
    stars: progress.stars,
    kidLevelStars: normalizeKidLevelStars(progress.levelStars),
    warmupDone: resolveWarmupDone(progress),
  };
};

const carryKidRecord = (prev: GameState, next: GameState): GameState => ({
  ...next,
  stars: prev.stars,
  kidLevelStars: prev.kidLevelStars.slice(),
  warmupDone: prev.warmupDone,
  voiceGuideEnabled: prev.voiceGuideEnabled,
});

const restoreSnapshot = (state: GameState, snapshot: Snapshot): GameState => {
  const next = {
    ...state,
    board: cloneBoard(snapshot.board),
    notes: cloneNotes(snapshot.notes),
  };

  next.conflicts = findConflicts(next.board);
  next.completed = isComplete(next.board, next.solution);
  return next;
};

export function useSudokuGame() {
  const [state, setState] = useState<GameState>(() => createBootState());
  const historyRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const progressReadyRef = useRef(false);

  useEffect(() => {
    if (state.experienceMode === 'kid' || state.completed || state.failed) return;

    const id = setInterval(() => {
      setState((prev) => {
        if (prev.experienceMode === 'kid' || prev.completed || prev.failed) return prev;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);

    return () => clearInterval(id);
  }, [state.completed, state.failed, state.experienceMode]);

  useEffect(() => {
    progressReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!progressReadyRef.current) return;
    saveKidProgress(window.localStorage, {
      stars: state.stars,
      levelStars: state.kidLevelStars,
      warmupDone: state.warmupDone,
    });
  }, [state.stars, state.kidLevelStars, state.warmupDone]);

  const actionLabel = useMemo(
    () => (state.notesMode ? '备注模式: 开' : '备注模式: 关'),
    [state.notesMode]
  );

  const pushHistory = (current: GameState) => {
    historyRef.current.push(toSnapshot(current));
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
  };

  const newGame = (difficulty: Difficulty = state.difficulty) => {
    historyRef.current = [];
    futureRef.current = [];
    setState((prev) => {
      const nextDifficulty = prev.kidMode ? 'easy' : difficulty;
      const next = createInitialState(nextDifficulty);
      return {
        ...carryKidRecord(prev, next),
        experienceMode: prev.experienceMode,
        kidMode: prev.kidMode,
        kidAdventureMode: prev.kidAdventureMode,
        hintText: prev.kidMode ? '幼儿模式进行中：先找只缺一个数字的一行。' : '',
      };
    });
  };

  const undo = () => {
    setState((prev) => {
      const snapshot = historyRef.current.pop();
      if (!snapshot) return prev;
      futureRef.current.push(toSnapshot(prev));
      return restoreSnapshot(prev, snapshot);
    });
  };

  const redo = () => {
    setState((prev) => {
      const snapshot = futureRef.current.pop();
      if (!snapshot) return prev;
      historyRef.current.push(toSnapshot(prev));
      return restoreSnapshot(prev, snapshot);
    });
  };

  const clearCell = (row: number, col: number) => {
    setState((prev) => {
      if (prev.givens[row][col]) return prev;
      if (prev.board[row][col] === 0 && !prev.notes[row][col].some(Boolean)) return prev;

      pushHistory(prev);
      const board = cloneBoard(prev.board);
      const notes = cloneNotes(prev.notes);
      board[row][col] = 0;
      notes[row][col].fill(false);

      return {
        ...prev,
        board,
        notes,
        conflicts: findConflicts(board),
        completed: isComplete(board, prev.solution),
      };
    });
  };

  const toggleNote = (row: number, col: number, value: number) => {
    setState((prev) => {
      if (prev.givens[row][col]) return prev;
      if (prev.board[row][col] !== 0) return prev;

      pushHistory(prev);
      const notes = cloneNotes(prev.notes);
      notes[row][col][value] = !notes[row][col][value];
      return { ...prev, notes };
    });
  };

  const placeNumber = (row: number, col: number, value: number) => {
    if (state.completed || state.failed) return;
    if (state.givens[row][col]) return;

    const previewBoard = cloneBoard(state.board);
    previewBoard[row][col] = value;
    const correctPreview = value === state.solution[row][col];
    const completedPreview = isComplete(previewBoard, state.solution);

    if (completedPreview && correctPreview) {
      sfx.playWinCue();
    } else if (correctPreview) {
      sfx.playSuccessCue();
    } else {
      sfx.playFailCue();
    }

    setState((prev) => {
      if (prev.completed || prev.failed) return prev;
      if (prev.givens[row][col]) return prev;

      pushHistory(prev);
      const board = cloneBoard(prev.board);
      const notes = cloneNotes(prev.notes);
      board[row][col] = value;
      notes[row][col].fill(false);

      for (let i = 0; i < 9; i += 1) {
        notes[row][i][value] = false;
        notes[i][col][value] = false;
      }

      const br = Math.floor(row / 3) * 3;
      const bc = Math.floor(col / 3) * 3;
      for (let r = br; r < br + 3; r += 1) {
        for (let c = bc; c < bc + 3; c += 1) {
          notes[r][c][value] = false;
        }
      }

      const correct = value === prev.solution[row][col];
      const mistakes = correct ? prev.mistakes : prev.mistakes + 1;
      const failed = mistakes >= prev.maxMistakes;
      const nextStreak = correct ? prev.correctStreak + 1 : 0;
      const rewardDelta = prev.kidMode && correct ? getRewardDelta(nextStreak) : 0;
      const nextStars = prev.stars + rewardDelta;
      const kidCoachText = correct
        ? rewardDelta
          ? buildCoachMessage('star')
          : buildCoachMessage('correct')
        : buildCoachMessage('wrong');

      return {
        ...prev,
        board,
        notes,
        conflicts: findConflicts(board),
        completed: isComplete(board, prev.solution),
        failed,
        score: correct ? prev.score + 10 : Math.max(0, prev.score - 5),
        mistakes,
        stars: nextStars,
        correctStreak: nextStreak,
        hintText: failed
          ? `达到错误上限 (${prev.maxMistakes})，点击“新游戏”重新开始`
          : prev.kidMode
            ? kidCoachText
            : prev.hintText,
      };
    });
  };

  const autoNotesCell = (row: number, col: number) => {
    setState((prev) => {
      if (prev.givens[row][col] || prev.board[row][col] !== 0) return prev;

      pushHistory(prev);
      const board = cloneBoard(prev.board);
      const notes = cloneNotes(prev.notes);
      notes[row][col].fill(false);

      for (let v = 1; v <= 9; v += 1) {
        board[row][col] = v;
        const conflict = findConflicts(board).has(`${row}-${col}`);
        if (!conflict) notes[row][col][v] = true;
      }
      board[row][col] = 0;

      return { ...prev, notes, hintText: '已为当前格自动生成备注' };
    });
  };

  const handleNumberPick = (value: number) => {
    if (state.completed || state.failed) return;

    if (state.selectedCell) {
      if (state.notesMode) {
        toggleNote(state.selectedCell.row, state.selectedCell.col, value);
      } else {
        placeNumber(state.selectedCell.row, state.selectedCell.col, value);
      }
    }

    setState((prev) => ({ ...prev, selectedValue: value }));
  };

  const selectCell = (row: number, col: number) => {
    const value = state.board[row][col];
    setState((prev) => ({
      ...prev,
      selectedCell: { row, col },
      selectedValue: value !== 0 ? value : null,
      hintText: '',
    }));
  };

  const clearSelection = () => {
    setState((prev) => ({
      ...prev,
      selectedCell: null,
      selectedValue: null,
      hintText: '',
    }));
  };

  const placeNumberFromDrag = (row: number, col: number, value: number) => {
    if (state.completed || state.failed) return;
    placeNumber(row, col, value);
    setState((prev) => ({
      ...prev,
      selectedCell: { row, col },
      selectedValue: value,
    }));
  };

  const handleAction = (action: UserAction) => {
    if (action === 'easy' || action === 'medium' || action === 'hard') {
      newGame(action);
      return;
    }

    if (
      (state.completed || state.failed) &&
      action !== GAME_ACTIONS.NEW_GAME &&
      action !== GAME_ACTIONS.UNDO &&
      action !== GAME_ACTIONS.TOGGLE_KID_MODE &&
      action !== GAME_ACTIONS.TOGGLE_KID_ADVENTURE &&
      action !== GAME_ACTIONS.TOGGLE_VOICE_GUIDE
    ) {
      return;
    }

    switch (action) {
      case GAME_ACTIONS.NEW_GAME:
        newGame();
        break;
      case GAME_ACTIONS.HINT:
        setState((prev) => {
          const board = cloneBoard(prev.board);
          pushHistory(prev);
          const result = applyHint(board, prev.solution, prev.givens);

          if (!result) {
            historyRef.current.pop();
            return prev;
          }

          return {
            ...prev,
            board,
            conflicts: findConflicts(board),
            completed: isComplete(board, prev.solution),
            selectedCell: { row: result.row, col: result.col },
            selectedValue: result.value,
          };
        });
        break;
      case GAME_ACTIONS.UNDO:
        undo();
        break;
      case GAME_ACTIONS.REDO:
        redo();
        break;
      case GAME_ACTIONS.TOGGLE_NOTES:
        setState((prev) => ({ ...prev, notesMode: !prev.notesMode }));
        break;
      case GAME_ACTIONS.AUTO_NOTES:
        if (!state.selectedCell) {
          setState((prev) => ({ ...prev, hintText: '请先选择一个空格' }));
          return;
        }
        autoNotesCell(state.selectedCell.row, state.selectedCell.col);
        break;
      case GAME_ACTIONS.LEARN_HINT:
        if (!state.selectedCell) {
          setState((prev) => ({ ...prev, hintText: '请选择一个空格获取候选提示' }));
          return;
        }

        {
          const { row, col } = state.selectedCell;
          if (state.board[row][col] !== 0) {
            setState((prev) => ({ ...prev, hintText: '该格已有数字，请选择空格' }));
            return;
          }

          setState((prev) => {
            const board = cloneBoard(prev.board);
            const notes = cloneNotes(prev.notes);
            const candidates = getCandidates(board, row, col);
            notes[row][col].fill(false);
            candidates.forEach((v) => {
              notes[row][col][v] = true;
            });

            return {
              ...prev,
              notes,
              hintText: candidates.length
                ? `可填数字: ${candidates.join(' ')}`
                : '当前无可用数字，请检查冲突',
            };
          });
        }
        break;
      case GAME_ACTIONS.CLEAR:
        if (!state.selectedCell) {
          setState((prev) => ({ ...prev, hintText: '请先选中要清除的格子' }));
          return;
        }
        clearCell(state.selectedCell.row, state.selectedCell.col);
        break;
      case GAME_ACTIONS.TOGGLE_KID_MODE:
        historyRef.current = [];
        futureRef.current = [];
        setState((prev) => {
          const nextKidMode = !prev.kidMode;
          const next = createInitialState(nextKidMode ? 'easy' : 'medium');
          return {
            ...carryKidRecord(prev, next),
            kidMode: nextKidMode,
            kidAdventureMode: false,
            hintText: nextKidMode
              ? '幼儿模式已开启：点“小步提示”，我会带你做下一步。'
              : '已退出幼儿模式，回到标准玩法。',
          };
        });
        break;
      case GAME_ACTIONS.TOGGLE_KID_ADVENTURE:
        if (!state.kidMode) {
          setState((prev) => ({ ...prev, hintText: '请先开启幼儿模式。' }));
          return;
        }
        setState((prev) => ({
          ...prev,
          kidAdventureMode: !prev.kidAdventureMode,
          hintText: !prev.kidAdventureMode
            ? '进入 4x4 闯关地图，开始收集星星。'
            : '返回经典数独模式。',
        }));
        break;
      case GAME_ACTIONS.KID_STEP_HINT:
        if (state.kidAdventureMode) {
          setState((prev) => ({ ...prev, hintText: '4x4 闯关里请使用闯关面板提示。' }));
          return;
        }
        if (!state.kidMode) {
          setState((prev) => ({ ...prev, hintText: '请先开启幼儿模式再使用小步提示。' }));
          return;
        }
        setState((prev) => {
          const hint = findSingleCandidateHint(prev.board, prev.givens);
          if (!hint) {
            return { ...prev, hintText: '暂时没有一步可解的空格，试试先填其它格。' };
          }

          const notes = cloneNotes(prev.notes);
          notes[hint.row][hint.col].fill(false);
          notes[hint.row][hint.col][hint.value] = true;

          return {
            ...prev,
            notes,
            selectedCell: { row: hint.row, col: hint.col },
            selectedValue: hint.value,
            hintText: buildCoachMessage('step-hint', hint.value),
          };
        });
        break;
      case GAME_ACTIONS.TOGGLE_VOICE_GUIDE:
        setState((prev) => ({
          ...prev,
          voiceGuideEnabled: !prev.voiceGuideEnabled,
          hintText: !prev.voiceGuideEnabled ? '语音引导已开启。' : '语音引导已关闭。',
        }));
        break;
      default:
        break;
    }
  };

  const enterKidExperience = () => {
    historyRef.current = [];
    futureRef.current = [];
    setState((prev) => {
      const next = createInitialState('easy');
      return {
        ...carryKidRecord(prev, next),
        experienceMode: 'kid',
        kidMode: true,
        kidAdventureMode: true,
        hintText: '欢迎来到幼儿冒险，先从第1关开始。',
      };
    });
  };

  const enterClassicExperience = () => {
    historyRef.current = [];
    futureRef.current = [];
    setState((prev) => {
      const next = createInitialState('easy');
      return {
        ...carryKidRecord(prev, next),
        experienceMode: 'classic',
        kidMode: false,
        kidAdventureMode: false,
      };
    });
  };

  const markWarmupDone = () => {
    setState((prev) => (prev.warmupDone ? prev : { ...prev, warmupDone: true }));
  };

  const updateKidLevelStars = (levelId: number, starsEarned: number) => {
    setState((prev) => {
      const index = levelId - 1;
      if (index < 0 || index >= prev.kidLevelStars.length) return prev;
      if (prev.kidLevelStars[index] >= starsEarned) return prev;

      const nextLevelStars = prev.kidLevelStars.slice();
      const delta = starsEarned - nextLevelStars[index];
      nextLevelStars[index] = starsEarned;

      return {
        ...prev,
        kidLevelStars: nextLevelStars,
        stars: prev.stars + delta,
        hintText: `关卡 ${levelId} 星星更新为 ${starsEarned} 颗!`,
      };
    });
  };

  return {
    state,
    actionLabel,
    handleAction,
    handleNumberPick,
    selectCell,
    clearSelection,
    placeNumberFromDrag,
    newGame,
    updateKidLevelStars,
    markWarmupDone,
    enterKidExperience,
    enterClassicExperience,
  };
}
