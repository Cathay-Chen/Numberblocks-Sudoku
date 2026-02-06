import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  KID_LEVELS,
  computeUnlockedLevels,
  createKidLevelState,
  isKidLevelSolved,
} from '../kid-adventure/engine';
import { buildLevelStory } from '../kid-adventure/progression';
import { sfx } from '../audio/sfx';
import { NumberBlock } from './NumberBlock';

type KidAdventureBoardProps = {
  totalStars: number;
  levelStars: number[];
  onEarnStars: (levelId: number, stars: number) => void;
  levelMapHostId?: string;
  onProgressChange?: (progress: { mistakes: number; score: number; stars: number }) => void;
};

type Session = ReturnType<typeof createKidLevelState> & {
  selectedCell: { row: number; col: number } | null;
  mistakes: number;
  score: number;
  completed: boolean;
  hintText: string;
};

type LevelCompleteDialog = {
  open: boolean;
  levelId: number;
  earned: number;
  nextLevelId: number | null;
};

const createSession = (levelId: number): Session => ({
  ...createKidLevelState(levelId),
  selectedCell: null,
  mistakes: 0,
  score: 0,
  completed: false,
  hintText: '选一个格子，再点 1-4 试试吧。',
});

const calculateLevelStars = (mistakes: number): number => {
  if (mistakes === 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
};

export function KidAdventureBoard({
  totalStars,
  levelStars,
  onEarnStars,
  levelMapHostId,
  onProgressChange,
}: KidAdventureBoardProps) {
  const [session, setSession] = useState<Session>(() => createSession(1));
  const [rewardBurst, setRewardBurst] = useState(0);
  const [levelDialog, setLevelDialog] = useState<LevelCompleteDialog>({
    open: false,
    levelId: 1,
    earned: 0,
    nextLevelId: 2,
  });
  const unlockedLevels = useMemo(() => computeUnlockedLevels(totalStars), [totalStars]);
  const story = useMemo(() => buildLevelStory(session.levelId), [session.levelId]);
  const levelMapHost =
    typeof document !== 'undefined' && levelMapHostId ? document.getElementById(levelMapHostId) : null;
  const levelMap = (
    <div className="kid-map grid grid-cols-3 gap-2">
      {KID_LEVELS.map((level) => {
        const locked = level.id > unlockedLevels;
        const stars = levelStars[level.id - 1] ?? 0;
        return (
          <button
            key={level.id}
            type="button"
            disabled={locked}
            className={[
              'kid-map-level rounded-xl border p-2 text-left transition-all',
              session.levelId === level.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white',
              locked ? 'cursor-not-allowed opacity-45' : 'hover:-translate-y-0.5 hover:shadow-md',
            ].join(' ')}
            onClick={() => startLevel(level.id)}
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              关卡 {level.id}
            </p>
            <p className="font-display text-lg text-slate-900">{level.name}</p>
            <p className="text-xs text-amber-600">{stars > 0 ? `⭐ x ${stars}` : '未通关'}</p>
          </button>
        );
      })}
    </div>
  );

  const startLevel = (levelId: number, force = false) => {
    if (!force && levelId > unlockedLevels) return;
    setLevelDialog((prev) => ({ ...prev, open: false }));
    setSession(createSession(levelId));
  };

  useEffect(() => {
    onProgressChange?.({
      mistakes: session.mistakes,
      score: session.score,
      stars: totalStars,
    });
  }, [onProgressChange, session.mistakes, session.score, totalStars]);

  const pickNumber = (value: number) => {
    const current = session;
    if (!current.selectedCell || current.completed) return;

    const { row, col } = current.selectedCell;
    if (current.givens[row][col]) return;

    const nextBoard = current.board.map((line) => line.slice());
    nextBoard[row][col] = value;

    const isCorrect = value === current.solution[row][col];
    const completed = isKidLevelSolved(nextBoard, current.solution);

    if (completed) {
      sfx.playWinCue();
    } else if (isCorrect) {
      sfx.playSuccessCue();
    } else {
      sfx.playFailCue();
    }

    setSession((prev) => {
      if (!prev.selectedCell || prev.completed) return prev;
      const { row, col } = prev.selectedCell;
      if (prev.givens[row][col]) return prev;

      const nextBoard = prev.board.map((line) => line.slice());
      nextBoard[row][col] = value;

      const isCorrect = value === prev.solution[row][col];
      const mistakes = isCorrect ? prev.mistakes : prev.mistakes + 1;
      const completed = isKidLevelSolved(nextBoard, prev.solution);

      let hintText = isCorrect ? '答对啦，继续前进!' : '再想想，这里不是这个数字。';

      if (completed) {
        const earned = calculateLevelStars(mistakes);
        const nextLevelId = prev.levelId < KID_LEVELS.length ? prev.levelId + 1 : null;
        onEarnStars(prev.levelId, earned);
        setRewardBurst(earned);
        setTimeout(() => setRewardBurst(0), 1200);
        setLevelDialog({
          open: true,
          levelId: prev.levelId,
          earned,
          nextLevelId,
        });
        hintText = `闯关成功，获得 ${earned} 颗星!`;
      }

      return {
        ...prev,
        board: nextBoard,
        mistakes,
        score: isCorrect ? prev.score + 10 : Math.max(0, prev.score - 5),
        completed,
        hintText,
      };
    });
  };

  return (
    <>
      {levelMapHost ? createPortal(levelMap, levelMapHost) : null}
      <section className="panel kid-adventure-panel grid gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-slate-900">4x4 幼儿闯关地图</h2>
        <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
          总星星: ⭐ {totalStars}
        </p>
      </div>
      <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800">
        {story.title}: {story.voiceText}
      </p>

      <div className="kid-grid-wrap grid gap-3">
        <div className="kid-grid">
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 4 }).map((__, col) => {
              const value = session.board[row][col];
              const selected =
                session.selectedCell?.row === row && session.selectedCell?.col === col;
              const given = session.givens[row][col];
              const wrong = value !== 0 && value !== session.solution[row][col];
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={[
                    'kid-cell',
                    selected ? 'kid-cell-selected' : '',
                    given ? 'kid-cell-given' : '',
                    wrong ? 'kid-cell-wrong' : '',
                  ].join(' ')}
                  onClick={() =>
                    setSession((prev) => ({
                      ...prev,
                      selectedCell: { row, col },
                    }))
                  }
                >
                  {value !== 0 && (
                    <NumberBlock value={value} size="cell" given={given} imageAlt={`数字积木 ${value}`} />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((value) => (
            <button
              key={`kid-picker-${value}`}
              type="button"
              className="btn h-16 border border-slate-200 bg-white px-2 hover:bg-sky-50"
              onClick={() => pickNumber(value)}
              aria-label={`选择数字积木 ${value}`}
            >
              <div className="flex items-center gap-2">
                <div className="h-10 w-10">
                  <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
                </div>
                <span className="text-lg font-extrabold text-slate-800">{value}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {levelMapHost ? null : levelMap}

      <p className="rounded-xl bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
        {session.hintText}
      </p>
      {rewardBurst > 0 && (
        <div className="kid-reward-burst" aria-live="polite">
          {Array.from({ length: rewardBurst * 4 }).map((_, index) => (
            <span
              key={`burst-${index}`}
              className="kid-reward-star"
              style={{ ['--i' as string]: index } as CSSProperties}
            >
              ⭐
            </span>
          ))}
        </div>
      )}

      {levelDialog.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="kid-fireworks-layer" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, index) => (
              <span
                key={`kid-firework-${index}`}
                className="kid-firework-particle"
                style={
                  {
                    ['--x' as string]: `${(index * 37) % 100}%`,
                    ['--y' as string]: `${(index * 53) % 100}%`,
                    ['--h' as string]: `${(index * 29) % 360}`,
                    ['--d' as string]: `${(index % 7) * 110}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="card relative w-full max-w-sm border border-slate-200 bg-white shadow-2xl">
            <div className="card-body items-center text-center">
              <h3 className="font-display text-3xl text-slate-900">闯关成功!</h3>
              <p className="text-slate-700">
                第 {levelDialog.levelId} 关完成，获得 ⭐ x {levelDialog.earned}
              </p>
              {levelDialog.nextLevelId ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (levelDialog.nextLevelId === null) return;
                    startLevel(levelDialog.nextLevelId, true);
                  }}
                >
                  进入下一关
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setLevelDialog((prev) => ({ ...prev, open: false }))}
                >
                  已通关全部关卡
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </section>
    </>
  );
}
