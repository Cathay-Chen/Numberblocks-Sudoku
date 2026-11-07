import { useEffect, useState } from 'react';
import { speakCoach } from '../audio/speak';
import { KID_LEVELS, computeUnlockedLevels, selectResumeLevel } from '../kid-adventure/engine';
import {
  KID_CLEAR_STARS,
  clearKidCell,
  createKidPlay,
  greetLikeWarmup,
  hintKidPlay,
  placeKidNumber,
  redoKidPlay,
  selectKidCell,
  undoKidPlay,
  type KidPlay,
} from '../kid-adventure/play';
import { buildLevelStory } from '../kid-adventure/progression';
import { conflictCells } from '../kid-adventure/rules';
import { NumberBlock } from './NumberBlock';

type KidAdventureBoardProps = {
  totalStars: number;
  levelStars: number[];
  greet: boolean;
  onEarnStars: (levelId: number, stars: number) => void;
  onReplayWarmup: () => void;
};

export function KidAdventureBoard({
  totalStars,
  levelStars,
  greet,
  onEarnStars,
  onReplayWarmup,
}: KidAdventureBoardProps) {
  const [play, setPlay] = useState<KidPlay>(() => {
    const started = createKidPlay(selectResumeLevel(totalStars, levelStars));
    return greet ? greetLikeWarmup(started) : started;
  });
  const [moreTools, setMoreTools] = useState(false);
  const unlockedLevels = computeUnlockedLevels(totalStars);
  const story = buildLevelStory(play.levelId);
  const conflicts = conflictCells(play.board);
  const nextLevelId = play.levelId < KID_LEVELS.length ? play.levelId + 1 : null;
  const focusKeys = new Set(play.focus.map((cell) => `${cell.row}-${cell.col}`));

  const startLevel = (levelId: number, force = false) => {
    if (!force && levelId > unlockedLevels) return;
    window.speechSynthesis?.cancel();
    setPlay(createKidPlay(levelId));
  };

  useEffect(() => {
    if (!play.completed) return;
    onEarnStars(play.levelId, KID_CLEAR_STARS);
  }, [play.completed, play.levelId]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return (
    <section className="grid gap-4">
      <h2 className="font-display text-3xl text-slate-900">{story.title}</h2>
      <p className="rounded-xl bg-indigo-50 px-3 py-2 text-base font-bold leading-6 text-indigo-950">
        {story.voiceText}
      </p>

      <div className="kid-grid" aria-label="四宫数独">
        {[0, 1, 2, 3].map((box) => {
          const startRow = Math.floor(box / 2) * 2;
          const startCol = (box % 2) * 2;
          return (
            <div key={box} className="kid-box" aria-label={`小宫 ${box + 1}`}>
              {[0, 1, 2, 3].map((offset) => {
                const row = startRow + Math.floor(offset / 2);
                const col = startCol + (offset % 2);
                const value = play.board[row][col];
                const key = `${row}-${col}`;
                const selected = play.selected?.row === row && play.selected?.col === col;
                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'kid-cell',
                      selected ? 'kid-cell-selected' : '',
                      play.givens[row][col] ? 'kid-cell-given' : '',
                      conflicts.has(key) ? 'kid-cell-wrong' : '',
                      focusKeys.has(key) ? 'kid-cell-hint' : '',
                    ].join(' ')}
                    aria-label={`第${row + 1}行第${col + 1}列${value === 0 ? '空格' : `数字${value}`}`}
                    onClick={() => setPlay((prev) => selectKidCell(prev, { row, col }))}
                  >
                    {value !== 0 && (
                      <NumberBlock value={value} size="cell" given={play.givens[row][col]} imageAlt={`数字积木 ${value}`} />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((value) => (
          <button
            key={`kid-picker-${value}`}
            type="button"
            className="btn h-16 min-h-16 border border-slate-200 bg-white px-1"
            onClick={() => setPlay((prev) => placeKidNumber(prev, value))}
            aria-label={`放入数字积木 ${value}`}
          >
            <span className="flex items-center justify-center gap-1">
              <span className="block h-10 w-10">
                <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
              </span>
              <span className="text-lg font-extrabold text-slate-800">{value}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="btn min-h-12 border border-amber-300 bg-amber-50 font-black text-amber-950"
          onClick={() => setPlay((prev) => hintKidPlay(prev))}
          disabled={play.completed}
        >
          看一步
        </button>
        <button type="button" className="btn min-h-12 border border-slate-200 bg-white font-black" onClick={() => speakCoach(play.feedback.text)}>
          听一听
        </button>
        <button
          type="button"
          className="btn min-h-12 border border-slate-200 bg-white font-black"
          onClick={() => setPlay((prev) => undoKidPlay(prev))}
          disabled={play.past.length === 0}
        >
          撤销
        </button>
      </div>
      <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => setMoreTools((open) => !open)}>
        {moreTools ? '收起' : '更多'}
      </button>
      {moreTools && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn min-h-12 border border-slate-200 bg-white font-black"
            onClick={() => setPlay((prev) => redoKidPlay(prev))}
            disabled={play.future.length === 0}
          >
            重做
          </button>
          <button
            type="button"
            className="btn min-h-12 border border-slate-200 bg-white font-black"
            onClick={() => setPlay((prev) => clearKidCell(prev))}
            disabled={play.completed}
          >
            拿走
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl bg-cyan-50 px-3 py-3" aria-live="polite">
        {play.feedback.value ? (
          <div className="h-12 w-12 shrink-0">
            <NumberBlock value={play.feedback.value} size="picker" imageAlt="" />
          </div>
        ) : null}
        <p className="text-base font-bold leading-6 text-cyan-950">{play.feedback.text}</p>
      </div>

      {play.completed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
          <p className="text-base font-black text-emerald-900">这一关补齐了</p>
          {nextLevelId ? (
            <button type="button" className="btn btn-primary mt-3 min-h-12" onClick={() => startLevel(nextLevelId, true)}>
              下一关
            </button>
          ) : (
            <p className="mt-2 text-sm font-bold text-emerald-800">六关都玩过啦，可以再挑一关。</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {KID_LEVELS.map((level) => {
          const locked = level.id > unlockedLevels;
          const stars = levelStars[level.id - 1] ?? 0;
          return (
            <button
              key={level.id}
              type="button"
              disabled={locked}
              className={[
                'kid-map-level min-h-16 rounded-xl border p-2 text-left',
                play.levelId === level.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white',
                locked ? 'cursor-not-allowed opacity-45' : '',
              ].join(' ')}
              onClick={() => startLevel(level.id)}
            >
              <p className="font-display text-lg text-slate-900">{level.name}</p>
              <p className="text-xs text-amber-700">{locked ? '还没打开' : stars > 0 ? `⭐ ${stars}` : '可以玩'}</p>
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={onReplayWarmup}>
        再找一次朋友
      </button>
    </section>
  );
}
