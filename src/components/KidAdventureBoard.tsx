import { useEffect, useRef, useState } from 'react';
import { cheers } from '../audio/celebration';
import { cueForMove } from '../kid-adventure/celebrate';
import { speakCoach } from '../audio/speak';
import { KID_LEVELS, computeUnlockedLevels, selectResumeLevel } from '../kid-adventure/engine';
import {
  KID_CLEAR_STARS,
  clearKidCell,
  createKidPlay,
  greetLikeWarmup,
  hintKidPlay,
  emptyFocusTarget,
  placeKidNumber,
  redoKidPlay,
  selectKidCell,
  undoKidPlay,
  type KidPlay,
} from '../kid-adventure/play';
import { buildLevelStory } from '../kid-adventure/progression';
import { loadKidSession, restoreKidPlay, saveKidSession } from '../kid-adventure/session';
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
    const saved = typeof window === 'undefined' ? null : loadKidSession(window.localStorage);
    const unlocked = computeUnlockedLevels(totalStars);
    const resume = selectResumeLevel(totalStars, levelStars);
    const levelId = saved && saved.levelId <= unlocked ? saved.levelId : resume;
    const started = createKidPlay(levelId);
    if (saved && saved.levelId === started.levelId && saved.past.length > 0) {
      return restoreKidPlay(started, saved);
    }
    return greet && levelId === resume ? greetLikeWarmup(started) : started;
  });
  const [moreTools, setMoreTools] = useState(false);
  const [pulse, setPulse] = useState<{ key: string; kind: 'place' | 'miss' } | null>(null);
  const [guideEmpties, setGuideEmpties] = useState(false);
  const playRef = useRef(play);
  const pulseTimer = useRef(0);
  const guideTimer = useRef(0);
  const unlockedLevels = computeUnlockedLevels(totalStars);
  const story = buildLevelStory(play.levelId);
  const conflicts = conflictCells(play.board);
  const nextLevelId = play.levelId < KID_LEVELS.length ? play.levelId + 1 : null;
  const focusKeys = new Set(play.focus.map((cell) => `${cell.row}-${cell.col}`));

  const commit = (next: KidPlay) => {
    playRef.current = next;
    setPlay(next);
  };

  const markPulse = (key: string, kind: 'place' | 'miss') => {
    window.clearTimeout(pulseTimer.current);
    setPulse({ key, kind });
    pulseTimer.current = window.setTimeout(() => setPulse(null), kind === 'miss' ? 900 : 800);
  };

  const markGuide = () => {
    window.clearTimeout(guideTimer.current);
    setGuideEmpties(true);
    guideTimer.current = window.setTimeout(() => setGuideEmpties(false), 800);
  };

  const placeFromPicker = (value: number) => {
    const current = playRef.current;
    const aimed = current.selected ? current : { ...current, selected: emptyFocusTarget(current) };
    if (!aimed.selected) {
      markGuide();
      commit({
        ...current,
        feedback: { tone: 'idle', text: '先点一个空格。', value: null },
      });
      return;
    }
    const prev = aimed;
    const next = placeKidNumber(prev, value);
    commit(next);
    if (prev.completed && !next.completed) cheers.stop();
    const cue = cueForMove({
      beforeComplete: prev.completed,
      afterComplete: next.completed,
      tone: next.feedback.tone,
    });
    if (cue) cheers.play(cue);
    if (next.selected && cue === 'place') markPulse(`${next.selected.row}-${next.selected.col}`, 'place');
    if (cue === 'miss' && next.focus[0]) markPulse(`${next.focus[0].row}-${next.focus[0].col}`, 'miss');
  };

  const startLevel = (levelId: number, force = false) => {
    if (!force && levelId > unlockedLevels) return;
    window.speechSynthesis?.cancel();
    cheers.stop();
    window.clearTimeout(pulseTimer.current);
    window.clearTimeout(guideTimer.current);
    setPulse(null);
    setGuideEmpties(false);
    const next = createKidPlay(levelId);
    playRef.current = next;
    setPlay(next);
  };

  useEffect(() => {
    if (!play.completed) return;
    onEarnStars(play.levelId, KID_CLEAR_STARS);
  }, [play.completed, play.levelId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveKidSession(window.localStorage, play);
  }, [play]);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      cheers.stop();
      window.clearTimeout(pulseTimer.current);
      window.clearTimeout(guideTimer.current);
    },
    []
  );

  return (
    <section className="kid-card">
      <h2 className="kid-task">{story.voiceText}</h2>

                <div className={['kid-grid', play.completed ? 'board-clear' : ''].join(' ')} aria-label="四宫数独">
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
                const wrong = conflicts.has(key) || (pulse?.kind === 'miss' && pulse.key === key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'kid-cell',
                      selected ? 'kid-cell-selected' : '',
                      play.givens[row][col] ? 'kid-cell-given' : '',
                      wrong ? 'kid-cell-wrong' : '',
                      pulse?.kind === 'miss' && (pulse.key === key || focusKeys.has(key)) ? 'kid-cell-bump' : '',
                      pulse?.kind === 'place' && pulse.key === key ? 'kid-cell-ack' : '',
                      guideEmpties && value === 0 ? 'kid-cell-need' : '',
                      focusKeys.has(key) && !wrong ? 'kid-cell-hint' : '',
                    ].join(' ')}
                    aria-label={`第${row + 1}行第${col + 1}列${value === 0 ? '空格' : `数字${value}`}${selected ? '，选中' : ''}`}
                    onClick={() => commit(selectKidCell(playRef.current, { row, col }))}
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

      {!play.completed && (
        <div className="kid-note" aria-live="polite">
          {play.feedback.value ? (
            <div className="h-12 w-12 shrink-0">
              <NumberBlock value={play.feedback.value} size="picker" imageAlt="" />
            </div>
          ) : null}
          <p>{play.feedback.text}</p>
        </div>
      )}

      {play.completed && (
        <div className="grid gap-3 text-center">
          <div className="cheer-friends" aria-hidden="true">
            {[1, 2, 3, 4].map((value) => (
              <div key={value} className="cheer-friend">
                <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
              </div>
            ))}
          </div>
          <p className="text-lg font-black text-emerald-950">四行、四列、四个小宫都齐了。</p>
          {nextLevelId ? (
            <button type="button" className="kid-go" onClick={() => startLevel(nextLevelId, true)}>
              下一关
            </button>
          ) : (
            <p className="text-sm font-bold text-emerald-800">六关都齐了。</p>
          )}
          <button type="button" className="kid-again" onClick={() => startLevel(play.levelId, true)}>
            再玩一次
          </button>
        </div>
      )}

      {!play.completed && (
        <div className="kid-pad">
          {[1, 2, 3, 4].map((value) => {
            const mark =
              play.feedback.value === value ? (play.feedback.tone === 'conflict' ? '重复' : play.feedback.tone === 'placed' ? '刚放' : '') : '';
            return (
              <button
                key={`kid-picker-${value}`}
                type="button"
                onClick={() => placeFromPicker(value)}
                aria-label={`放入数字积木 ${value}${mark ? `，${mark}` : ''}`}
              >
                <span className="mx-auto block h-10 w-10">
                  <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
                </span>
                <span className="kid-pad-mark">{mark || value}</span>
              </button>
            );
          })}
        </div>
      )}

      {!play.completed && (
        <button type="button" className="kid-quiet" onClick={() => commit(hintKidPlay(playRef.current))}>
          看一步
        </button>
      )}

      <button type="button" className="kid-quiet" aria-expanded={moreTools} onClick={() => setMoreTools((open) => !open)}>
        {moreTools ? '收起帮助' : '再帮帮我'}
      </button>
      {moreTools && (
        <div className="kid-tools">
          <button type="button" className="kid-quiet" onClick={() => speakCoach(play.feedback.text)}>
            听一听
          </button>
          <button
            type="button"
            className="kid-quiet"
            onClick={() => {
              const prev = playRef.current;
              const next = undoKidPlay(prev);
              commit(next);
              if (prev.completed && !next.completed) cheers.stop();
            }}
            disabled={play.past.length === 0}
          >
            撤销
          </button>
          <button type="button" className="kid-quiet" onClick={() => commit(redoKidPlay(playRef.current))} disabled={play.future.length === 0}>
            重做
          </button>
          <button type="button" className="kid-quiet" onClick={() => commit(clearKidCell(playRef.current))} disabled={play.completed}>
            拿走
          </button>
          <button type="button" className="kid-quiet kid-wide" onClick={onReplayWarmup}>
            再找一次朋友
          </button>
        </div>
      )}

      <div className="kid-levels" aria-label="进度">
        {KID_LEVELS.map((level) => {
          const locked = level.id > unlockedLevels;
          const stars = levelStars[level.id - 1] ?? 0;
          const current = play.levelId === level.id;
          return (
            <button
              key={level.id}
              type="button"
              disabled={locked}
              className="kid-level"
              aria-current={current ? 'step' : undefined}
              aria-label={`${level.name}${locked ? ' 还没打开' : stars > 0 ? ' 已完成' : ' 可以玩'}${current ? ' 现在' : ''}`}
              onClick={() => startLevel(level.id)}
            >
              {level.id}
            </button>
          );
        })}
      </div>
    </section>
  );
}
