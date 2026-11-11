import { useEffect, useMemo, useRef, useState } from 'react';
import { cheers } from '../audio/celebration';
import { buildGridModel } from '../stage/model';
import { Playfield } from '../stage/Playfield';
import { showFriend, type ShowFriendInput } from '../stage/present';
import { useStageCue } from '../stage/useStageCue';
import { cueForMove } from '../kid-adventure/celebrate';
import { ReplaceDialog, focusSameControl } from './ReplaceDialog';
import { HandButton, HearButton, QuietLink, ToolIcon } from './ToolIcon';
import { KID_LEVELS, computeUnlockedLevels, selectResumeLevel } from '../kid-adventure/engine';
import { kidSoloLine, type LearningActivity, type LearningRecord } from '../kid-adventure/learning';
import { continuation, demoIdFor, lessonById, nextLessonStep, pathIsClear, SIX_DEMO_ID, sixEntry } from '../kid-adventure/lessons';
import { chooseOpening } from '../kid-adventure/opening';
import {
  KID_CLEAR_STARS,
  clearedText,
  clearKidCell,
  createKidPlay,
  createLessonPlay,
  greetLikeWarmup,
  hintKidPlay,
  emptyFocusTarget,
  kidBoardInProgress,
  placeKidNumber,
  redoKidPlay,
  selectKidCell,
  undoKidPlay,
  warmupWouldDropBoard,
  type KidPlay,
} from '../kid-adventure/play';
import { geometryOf } from '../kid-adventure/rules';
import { buildLevelStory } from '../kid-adventure/progression';
import { loadKidSession, restoreKidPlay, saveKidSession } from '../kid-adventure/session';
import { conflictCells } from '../kid-adventure/rules';
import { NumberBlock } from './NumberBlock';

const canTake = (play: KidPlay) => {
  if (play.completed || !play.selected) return false;
  const { row, col } = play.selected;
  return !play.givens[row][col] && play.board[row][col] !== 0;
};

type KidAdventureBoardProps = {
  totalStars: number;
  levelStars: number[];
  learning: LearningRecord | null;
  greet: boolean;
  onEarnStars: (levelId: number, stars: number) => void;
  onLessonAttempt: (id: string, activity: LearningActivity) => void;
  onReplayWarmup: () => void;
};

export function KidAdventureBoard({
  totalStars,
  levelStars,
  learning,
  greet,
  onEarnStars,
  onLessonAttempt,
  onReplayWarmup,
}: KidAdventureBoardProps) {
  const [play, setPlay] = useState<KidPlay>(() => {
    const saved = typeof window === 'undefined' ? null : loadKidSession(window.localStorage);
    const opening = chooseOpening({ totalStars, levelStars, saved, learning });
    if (opening.kind === 'lesson') {
      const started = createLessonPlay(opening.id) ?? createKidPlay(1);
      if (opening.restore && saved) return restoreKidPlay(started, saved);
      return started;
    }
    const started = createKidPlay(opening.levelId);
    if (opening.restore && saved && saved.levelId === started.levelId) return restoreKidPlay(started, saved);
    const resume = selectResumeLevel(totalStars, levelStars);
    return greet && opening.levelId === resume ? greetLikeWarmup(started) : started;
  });
  const [moreTools, setMoreTools] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<(() => void) | null>(null);
  const replaceOpener = useRef<HTMLElement | null>(null);
  const [pulse, setPulse] = useState<{ key: string; kind: 'place' | 'miss' } | null>(null);
  const [guideEmpties, setGuideEmpties] = useState(false);
  const playRef = useRef(play);
  const pulseTimer = useRef(0);
  const guideTimer = useRef(0);
  const queueCue = useStageCue();
  const [field, setField] = useState<'boot' | 'live' | 'fallback'>('boot');
  const model = useMemo(() => buildGridModel(play), [play]);
  const unlockedLevels = computeUnlockedLevels(totalStars);
  const story = buildLevelStory(play.levelId);
  const lesson = play.lessonId ? lessonById(play.lessonId) : null;
  const task = lesson?.voiceText ?? story.voiceText;
  const sixReady =
    pathIsClear(levelStars) ||
    (play.completed && !play.lessonId && play.levelId === 6 && levelStars.slice(0, 5).every((stars) => stars > 0));
  const forward = sixReady ? continuation(learning) : null;
  const lessonNext = play.lessonId ? nextLessonStep(play.lessonId) : null;
  const geometry = geometryOf(play.board);
  const stacks = geometry.size / geometry.boxCols;
  const sixOffer = play.lessonId && play.board.length === 4 ? sixEntry(learning) : null;
  const soloLine =
    play.lessonId && play.completed ? kidSoloLine(play.hintUnrated ? null : play.hintDepth, play.hintsUsed) : null;
  const replayDemo = Boolean(play.lessonId && play.board.length === 6 && play.lessonId !== SIX_DEMO_ID);
  const conflicts = conflictCells(play.board);
  const nextLevelId = play.levelId < KID_LEVELS.length ? play.levelId + 1 : null;
  const focusKeys = new Set(play.focus.map((cell) => `${cell.row}-${cell.col}`));

  const commit = (next: KidPlay) => {
    playRef.current = next;
    setPlay(next);
  };

  const queueBoard = (next: KidPlay, sound: boolean) => {
    const kind: ShowFriendInput['kind'] = next.completed
      ? 'board'
      : next.feedback.tone === 'conflict'
        ? 'miss'
        : next.feedback.tone === 'hint'
          ? 'hint'
          : next.feedback.tone === 'placed'
            ? 'place'
            : 'idle';
    const cells =
      kind === 'place' && next.selected ? [next.selected] : kind === 'board' || kind === 'idle' ? [] : next.focus;
    queueCue({
      kind,
      value: next.feedback.value,
      count: next.board.length,
      cells,
      focus: kind === 'miss' ? (next.focus[next.focus.length - 1] ?? next.selected) : next.selected,
      board: next.board,
      sound,
    });
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

  const placeFromPicker = (value: number, cell?: { row: number; col: number }) => {
    const current = cell ? selectKidCell(playRef.current, cell) : playRef.current;
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
    queueBoard(next, Boolean(cue));
    if (next.selected && cue === 'place') markPulse(`${next.selected.row}-${next.selected.col}`, 'place');
    if (cue === 'miss' && next.focus[0]) markPulse(`${next.focus[0].row}-${next.focus[0].col}`, 'miss');
  };

  const startFresh = (next: KidPlay) => {
    window.speechSynthesis?.cancel();
    cheers.stop();
    queueBoard(next, false);
    window.clearTimeout(pulseTimer.current);
    window.clearTimeout(guideTimer.current);
    setPulse(null);
    setGuideEmpties(false);
    playRef.current = next;
    setPlay(next);
  };

  const startLevel = (levelId: number, force = false) => {
    if (!force && levelId > unlockedLevels) return;
    startFresh(createKidPlay(levelId));
  };

  const requestReplace = (run: () => void) => {
    if (!kidBoardInProgress(playRef.current)) {
      run();
      return;
    }
    replaceOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingReplace(() => run);
  };

  const keepBoard = () => {
    const back = replaceOpener.current;
    replaceOpener.current = null;
    setPendingReplace(null);
    window.setTimeout(() => focusSameControl(back), 0);
  };

  const replaceBoard = () => {
    const run = pendingReplace;
    setPendingReplace(null);
    replaceOpener.current = null;
    run?.();
  };

  const startLesson = (lessonId: string) => {
    const next = createLessonPlay(lessonId);
    if (!next) return;
    startFresh(next);
  };

  useEffect(() => {
    showFriend({
      kind: play.completed ? 'board' : play.feedback.tone === 'hint' ? 'hint' : 'idle',
      value: play.feedback.value,
      count: play.board.length,
      cells: play.focus,
      focus: play.selected,
      board: play.board,
      sound: false,
    });
  }, []);

  useEffect(() => {
    if (!play.completed) return;
    document.querySelector('[data-cheer="1"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [play.completed, play.levelId, play.lessonId]);

  useEffect(() => {
    if (!play.completed || play.lessonId) return;
    onEarnStars(play.levelId, KID_CLEAR_STARS);
  }, [play.completed, play.levelId, play.lessonId]);

  useEffect(() => {
    if (!play.completed || !play.lessonId) return;
    onLessonAttempt(play.lessonId, {
      hints: play.hintsUsed,
      mistakes: play.tried,
      done: true,
      ...(play.hintUnrated ? {} : { depth: play.hintDepth }),
    });
  }, [play.completed, play.lessonId, play.hintsUsed, play.tried, play.hintDepth, play.hintUnrated, onLessonAttempt]);

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
      <h2 className="kid-task">{task}</h2>
      <Playfield
        model={model}
        onMode={setField}
        onCell={(row, col) => commit(selectKidCell(playRef.current, { row, col }))}
        onPlace={(row, col, value) => placeFromPicker(value, row < 0 ? undefined : { row, col })}
      />

                <div
                  hidden={field !== 'fallback'}
                  className={['kid-grid', geometry.size === 6 ? 'kid-grid-six' : '', play.completed ? 'board-clear' : ''].join(' ')}
                  data-board={geometry.size === 6 ? 'six' : 'four'}
                  aria-label={geometry.size === 6 ? '六宫数独' : '四宫数独'}
                >
        {Array.from({ length: (geometry.size / geometry.boxRows) * stacks }, (_, box) => {
          const startRow = Math.floor(box / stacks) * geometry.boxRows;
          const startCol = (box % stacks) * geometry.boxCols;
          return (
            <div key={box} className={geometry.size === 6 ? 'kid-box kid-box-six' : 'kid-box'} aria-label={`小宫 ${box + 1}`}>
              {Array.from({ length: geometry.boxRows * geometry.boxCols }, (_, offset) => {
                const row = startRow + Math.floor(offset / geometry.boxCols);
                const col = startCol + (offset % geometry.boxCols);
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
                    data-cell={`${row}-${col}`}
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
          <HearButton text={play.feedback.text} />
        </div>
      )}

      {play.completed && (
        <div className="grid gap-3 text-center">
          <div hidden={field !== 'fallback'} className={geometry.size === 6 ? 'cheer-friends cheer-friends-six' : 'cheer-friends'} aria-hidden="true">
            {geometry.digits.map((value) => (
              <div key={value} className="cheer-friend" data-cheer={value}>
                <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
              </div>
            ))}
          </div>
          <div className="kid-clear-line">
            <p className="text-lg font-black text-emerald-950" data-clear-copy>
              {clearedText(geometry.size)}
            </p>
            <HearButton text={clearedText(geometry.size)} />
          </div>
          {soloLine ? <p className="text-sm font-bold text-emerald-800">{soloLine}</p> : null}
          {sixOffer ? (
            <button type="button" className="kid-go" onClick={() => startLesson(sixOffer.id)}>
              {sixOffer.label}
            </button>
          ) : null}
          {lessonNext ? (
            <button type="button" className={sixOffer ? 'kid-again' : 'kid-go'} onClick={() => startLesson(lessonNext.id)}>
              {lessonNext.label}
            </button>
          ) : nextLevelId ? (
            <button type="button" className="kid-go" onClick={() => startLevel(nextLevelId, true)}>
              下一关
            </button>
          ) : forward ? (
            <>
              <p className="text-sm font-bold text-emerald-800">六关都齐了。</p>
              <button type="button" className="kid-go" onClick={() => startLesson(forward.id)}>
                {forward.label}
              </button>
            </>
          ) : (
            <p className="text-sm font-bold text-emerald-800">六关都齐了。</p>
          )}
          <button
            type="button"
            className="kid-again"
            onClick={() => (play.lessonId ? startLesson(play.lessonId) : startLevel(play.levelId, true))}
          >
            再玩一次
          </button>
          {replayDemo ? (
            <button type="button" className="kid-again" onClick={() => startLesson(SIX_DEMO_ID)}>
              再看示范
            </button>
          ) : null}
        </div>
      )}

      {!play.completed && (
        <div hidden={field !== 'fallback'} className={geometry.size === 6 ? 'kid-pad kid-pad-six' : 'kid-pad'}>
          {geometry.digits.map((value) => {
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
        <button
          type="button"
          className="kid-step"
          onClick={() => {
            const next = hintKidPlay(playRef.current);
            commit(next);
            queueBoard(next, false);
          }}
        >
          看一步
        </button>
      )}

      <div className="kid-hand" role="group" aria-label="刚才的格子">
        <HandButton
          icon="undo"
          label="撤销"
          disabled={play.past.length === 0}
          onClick={() => {
            const prev = playRef.current;
            const next = undoKidPlay(prev);
            if (prev.completed && !next.completed) cheers.stop();
            commit(next);
            queueBoard(next, false);
          }}
        />
        <HandButton
          icon="redo"
          label="重做"
          disabled={play.future.length === 0}
          onClick={() => {
            const next = redoKidPlay(playRef.current);
            commit(next);
            queueBoard(next, false);
          }}
        />
        <HandButton
          icon="erase"
          label="拿走"
          disabled={!canTake(play)}
          onClick={() => {
            const next = clearKidCell(playRef.current);
            commit(next);
            queueBoard(next, false);
          }}
        />
      </div>

      {!play.completed && !play.lessonId && forward ? (
        <QuietLink label={forward.label} onClick={() => requestReplace(() => startLesson(forward.id))} />
      ) : null}

      <QuietLink
        expanded={moreTools}
        label={moreTools ? '收起帮助' : '再帮帮我'}
        onClick={() => setMoreTools((open) => !open)}
      />
      {moreTools && (
        <div className="kid-extra">
          {play.lessonId ? (
            <QuietLink icon="demo" label="再看示范" onClick={() => requestReplace(() => startLesson(demoIdFor(play.lessonId!)))} />
          ) : null}
          <QuietLink
            icon="friends"
            label="再找一次朋友"
            onClick={() => {
              if (warmupWouldDropBoard(playRef.current)) requestReplace(onReplayWarmup);
              else onReplayWarmup();
            }}
          />
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
              data-done={stars > 0 ? '1' : undefined}
              aria-current={current && !play.lessonId ? 'step' : undefined}
              aria-label={`${level.name}${locked ? ' 还没打开' : stars > 0 ? ' 已完成' : ' 可以玩'}${current ? ' 现在' : ''}`}
              onClick={() => requestReplace(() => startLevel(level.id))}
            >
              <span>{level.id}</span>
              {stars > 0 ? <ToolIcon name="check" /> : null}
            </button>
          );
        })}
      </div>
      {pendingReplace ? <ReplaceDialog onKeep={keepBoard} onReplace={replaceBoard} /> : null}
    </section>
  );
}
