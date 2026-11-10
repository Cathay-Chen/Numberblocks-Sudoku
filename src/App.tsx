import { useEffect, useState } from 'react';
import { cheers } from './audio/celebration';
import { sfx } from './audio/sfx';
import { ActionControls } from './components/ActionControls';
import { GameHeader } from './components/GameHeader';
import { KidAdventureBoard } from './components/KidAdventureBoard';
import { NumberPicker } from './components/NumberPicker';
import { StatsPanel } from './components/StatsPanel';
import { SudokuBoard } from './components/SudokuBoard';
import { TipBanner } from './components/TipBanner';
import { WarmupPlay } from './components/WarmupPlay';
import { WinOverlay } from './components/WinOverlay';
import { lessonParentLines, pathIsClear, sixGateLines, sixGateVisible } from './kid-adventure/lessons';
import { useSudokuGame } from './hooks/useSudokuGame';
import { GAME_ACTIONS } from './game/actions';
import { ToolIcon } from './components/ToolIcon';

type AudioSettings = {
  masterVolume: number;
  uiEnabled: boolean;
  feedbackEnabled: boolean;
};

type Place = 'learn' | 'classic';

export default function App() {
  const {
    state,
    actionLabel,
    handleAction,
    handleNumberPick,
    selectCell,
    clearSelection,
    placeNumberFromDrag,
    newGame,
    updateKidLevelStars,
    recordLesson,
    markWarmupDone,
    enterKidExperience,
    enterClassicExperience,
  } = useSudokuGame();

  const [place, setPlace] = useState<Place>('learn');
  const [replayWarmup, setReplayWarmup] = useState(false);
  const [greetBoard, setGreetBoard] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    masterVolume: 0.9,
    uiEnabled: true,
    feedbackEnabled: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('numberblocks-audio-settings');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      setAudioSettings((prev) => ({
        masterVolume:
          typeof parsed.masterVolume === 'number' ? parsed.masterVolume : prev.masterVolume,
        uiEnabled: typeof parsed.uiEnabled === 'boolean' ? parsed.uiEnabled : prev.uiEnabled,
        feedbackEnabled:
          typeof parsed.feedbackEnabled === 'boolean'
            ? parsed.feedbackEnabled
            : prev.feedbackEnabled,
      }));
    } catch {
      // Ignore corrupted settings and keep defaults.
    }
  }, []);

  useEffect(() => {
    sfx.setMasterVolume(audioSettings.masterVolume);
    sfx.setUiEnabled(audioSettings.uiEnabled);
    sfx.setFeedbackEnabled(audioSettings.feedbackEnabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('numberblocks-audio-settings', JSON.stringify(audioSettings));
    }
  }, [audioSettings]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.disabled) return;
      if (cheers.playing() || cheers.feedbackJustPlayed()) return;
      sfx.playUiTap();
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const classicDifficultyLabel =
    state.difficulty === 'easy' ? '简单' : state.difficulty === 'medium' ? '中等' : '困难';
  const showWarmup = place === 'learn' && (!state.warmupDone || replayWarmup);

  const openClassic = () => {
    setParentOpen(false);
    setPlace('classic');
    enterClassicExperience();
  };

  const backToChild = () => {
    setPlace('learn');
    enterKidExperience();
  };

  if (place === 'learn') {
    return (
      <div className="kid-shell">
        <header className="kid-top">
          <p className="kid-stars" aria-label={`星星 ${state.stars}`}>
            ★ {state.stars}
          </p>
          <div className="kid-top-actions">
            <button
              type="button"
              className="kid-sound"
              aria-pressed={audioSettings.feedbackEnabled}
              aria-label={audioSettings.feedbackEnabled ? '声音开，点一下静音' : '现在静音，点一下打开声音'}
              onClick={() => {
                cheers.stop();
                setAudioSettings((prev) => ({ ...prev, feedbackEnabled: !prev.feedbackEnabled }));
              }}
            >
              <ToolIcon name={audioSettings.feedbackEnabled ? 'hear' : 'mute'} />
              <span>{audioSettings.feedbackEnabled ? '声音' : '静音'}</span>
            </button>
            <button type="button" className="kid-parent" onClick={() => setParentOpen(true)}>
              家长
            </button>
          </div>
        </header>
        <main className="kid-main kid-play">
          {showWarmup ? (
            <WarmupPlay
              onDone={() => {
                const firstTime = !state.warmupDone;
                markWarmupDone();
                setReplayWarmup(false);
                setGreetBoard(firstTime);
              }}
            />
          ) : (
            <KidAdventureBoard
              key={greetBoard ? 'greet' : 'board'}
              totalStars={state.stars}
              levelStars={state.kidLevelStars}
              learning={state.learning}
              greet={greetBoard}
              onEarnStars={updateKidLevelStars}
              onLessonAttempt={recordLesson}
              onReplayWarmup={() => setReplayWarmup(true)}
            />
          )}
        </main>
        {parentOpen && (
          <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 sm:place-items-center">
            <div className="card max-h-[90vh] w-full max-w-sm overflow-y-auto border border-slate-200 bg-white shadow-2xl">
              <div className="card-body">
                <h2 className="font-display text-3xl text-slate-900">家长</h2>
                <div className="space-y-1 text-sm font-bold leading-6 text-slate-800">
                  <p>学习记录不记时间，也不按年龄。</p>
                  <p>原来的六关：{state.kidLevelStars.filter((stars) => stars > 0).length} 关有星星。</p>
                  {lessonParentLines(state.learning).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {pathIsClear(state.kidLevelStars) && sixGateVisible(state.learning)
                    ? sixGateLines(state.learning).map((line) => <p key={line}>{line}</p>)
                    : null}
                </div>
                <button type="button" className="parent-go" onClick={openClassic}>
                  经典数独
                  <span>9×9，给大人。孩子的格子留在这里。</span>
                </button>
                <button type="button" className="parent-row" onClick={() => { setParentOpen(false); setGuideOpen(true); }}>
                  玩法说明
                </button>
                <button type="button" className="parent-row" onClick={() => { setParentOpen(false); setSettingsOpen(true); }}>
                  声音
                </button>
                <button type="button" className="parent-dismiss" onClick={() => setParentOpen(false)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
        {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
        {settingsOpen && (
          <Settings
            audioSettings={audioSettings}
            onChange={setAudioSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="sudoku-shell flex flex-col">
        <GameHeader
          onOpenGuide={() => setGuideOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onGoHome={backToChild}
        />
        <main className="z-10 mx-auto grid w-[min(1240px,96vw)] gap-6 pb-10 pt-8">
          <section className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <h1 className="font-display text-[clamp(2rem,1.3rem+2.1vw,3rem)] leading-tight text-slate-900">
              {`经典数独：${classicDifficultyLabel}`}
            </h1>
            <ActionControls
              actionLabel={actionLabel}
              notesOn={state.notesMode}
              onAction={handleAction}
            />
          </section>
          <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SudokuBoard
              state={state}
              onSelectCell={selectCell}
              onClearSelection={clearSelection}
              onDropNumber={placeNumberFromDrag}
            />
            <aside className="grid gap-4">
              <StatsPanel
                elapsedSeconds={state.elapsedSeconds}
                difficulty={state.difficulty}
                mistakes={state.mistakes}
                maxMistakes={state.maxMistakes}
                score={state.score}
                stars={state.stars}
                kidMode={false}
                hintText={state.hintText}
                onAction={handleAction}
                onNewGame={() => handleAction(GAME_ACTIONS.NEW_GAME)}
              />
              <NumberPicker selectedValue={state.selectedValue} onPick={handleNumberPick} />
              <button type="button" className="btn btn-outline min-h-12" onClick={backToChild}>
                回到小朋友
              </button>
            </aside>
          </section>
          <TipBanner variant="classic" />
        </main>
        <footer className="mt-auto py-6 text-center text-sm font-bold text-slate-500">
          © 2024 Numberblocks Sudoku. Inspired by the educational series.
        </footer>
      </div>
      {(state.completed || state.failed) && (
        <WinOverlay mode={state.completed ? 'win' : 'lose'} onReplay={() => newGame(state.difficulty)} />
      )}
      {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
      {settingsOpen && (
        <Settings audioSettings={audioSettings} onChange={setAudioSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}

function Guide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-xl border border-slate-200 bg-white shadow-2xl">
        <div className="card-body">
          <h3 className="font-display text-3xl text-slate-900">玩法说明</h3>
          <div className="space-y-2 text-sm text-slate-700">
            <p>小朋友先找少了的朋友、两个一样的朋友，再进入 4×4 小草地。</p>
            <p>每一行、每一列、每一小宫都要有 1、2、3、4。放重复了会指出那一组，可以撤销再试。</p>
            <p>六关之后，学一个朋友只剩一个座位。看一步先指出朋友和那一组，再说谁挡住了。</p>
            <p>自己练没看提示做完，复习里的旧方法和新方法也各有一次没看提示做完，就可以看六个朋友。小宫是两行、三列。</p>
            <p>经典数独在「家长」里，仍是 9×9，错误达到上限会结束这一局。</p>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({
  audioSettings,
  onChange,
  onClose,
}: {
  audioSettings: AudioSettings;
  onChange: (next: AudioSettings) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md border border-slate-200 bg-white shadow-2xl">
        <div className="card-body">
          <h3 className="font-display text-3xl text-slate-900">声音</h3>
          <label className="form-control">
            <span className="label-text text-sm font-semibold text-slate-700">总音量</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audioSettings.masterVolume * 100)}
              onChange={(event) =>
                onChange({ ...audioSettings, masterVolume: Number(event.target.value) / 100 })
              }
              className="range range-info range-sm"
            />
          </label>
          <label className="label mt-1 cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-info checkbox-sm"
              checked={audioSettings.uiEnabled}
              onChange={(event) => onChange({ ...audioSettings, uiEnabled: event.target.checked })}
            />
            <span className="label-text text-slate-700">按钮点击音效</span>
          </label>
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-info checkbox-sm"
              checked={audioSettings.feedbackEnabled}
              onChange={(event) =>
                onChange({ ...audioSettings, feedbackEnabled: event.target.checked })
              }
            />
            <span className="label-text text-slate-700">成功和过关音效</span>
          </label>
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
