import { useEffect, useState } from 'react';
import { sfx } from './audio/sfx';
import { ActionControls } from './components/ActionControls';
import { GameHeader } from './components/GameHeader';
import { KidAdventureBoard } from './components/KidAdventureBoard';
import { NumberPicker } from './components/NumberPicker';
import { StatsPanel } from './components/StatsPanel';
import { SudokuBoard } from './components/SudokuBoard';
import { TipBanner } from './components/TipBanner';
import { WinOverlay } from './components/WinOverlay';
import { useSudokuGame } from './hooks/useSudokuGame';

type AudioSettings = {
  masterVolume: number;
  uiEnabled: boolean;
  feedbackEnabled: boolean;
};

type KidAdventureStats = {
  mistakes: number;
  score: number;
  stars: number;
};

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
    enterKidExperience,
    enterClassicExperience,
  } = useSudokuGame();

  const [started, setStarted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kidAdventureStats, setKidAdventureStats] = useState<KidAdventureStats>({
    mistakes: 0,
    score: 0,
    stars: state.stars,
  });
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
    if (state.experienceMode !== 'kid') return;
    setKidAdventureStats((prev) => ({ ...prev, stars: state.stars }));
  }, [state.experienceMode, state.stars]);

  const classicDifficultyLabel =
    state.difficulty === 'easy' ? '简单' : state.difficulty === 'medium' ? '中等' : '困难';

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.disabled) return;
      sfx.playUiTap();
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!started) {
    return (
      <div className="sudoku-shell grid min-h-screen place-items-center p-6">
        <section className="panel w-full max-w-3xl p-8">
          <h1 className="font-display text-4xl text-slate-900">Numberblocks 数字乐园</h1>
          <p className="mt-2 text-slate-600">选择一个入口开始。幼儿模式会进入 4x4 冒险地图。</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() => {
                enterKidExperience();
                setStarted(true);
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-600">3-6岁推荐</p>
              <h2 className="font-display mt-2 text-3xl text-slate-900">开始冒险</h2>
              <p className="mt-2 text-sm text-slate-700">4x4 闯关、图片积木、单步引导、星星奖励</p>
            </button>
            <button
              type="button"
              className="rounded-2xl border-2 border-slate-300 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() => {
                enterClassicExperience();
                setStarted(true);
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">家长/进阶</p>
              <h2 className="font-display mt-2 text-3xl text-slate-900">经典数独</h2>
              <p className="mt-2 text-sm text-slate-700">9x9 完整工具，包含撤销、备注和自动提示</p>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="sudoku-shell flex flex-col">
        <GameHeader
          onOpenGuide={() => setGuideOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onGoHome={() => setStarted(false)}
        />

        <main className="z-10 mx-auto grid w-[min(1240px,96vw)] gap-6 pb-10 pt-8">
          <section className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h1 className="font-display text-[clamp(2rem,1.3rem+2.1vw,3rem)] leading-tight text-slate-900">
                {state.experienceMode === 'kid' ? '幼儿冒险地图' : `经典数独：${classicDifficultyLabel}`}
              </h1>
            </div>
            {state.experienceMode === 'classic' ? (
              <ActionControls actionLabel={actionLabel} onAction={handleAction} />
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm border border-slate-200"
                  onClick={() => {
                    enterKidExperience();
                  }}
                >
                  重新开始冒险
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm border border-slate-200"
                  onClick={() => setStarted(false)}
                >
                  返回首页
                </button>
              </div>
            )}
          </section>

          <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            {state.experienceMode === 'kid' ? (
              <KidAdventureBoard
                totalStars={state.stars}
                levelStars={state.kidLevelStars}
                onEarnStars={updateKidLevelStars}
                levelMapHostId="kid-level-map-slot"
                onProgressChange={(progress) => setKidAdventureStats(progress)}
              />
            ) : (
              <SudokuBoard
                state={state}
                onSelectCell={selectCell}
                onClearSelection={clearSelection}
                onDropNumber={placeNumberFromDrag}
              />
            )}

            <aside className="grid gap-4">
              <StatsPanel
                elapsedSeconds={state.elapsedSeconds}
                difficulty={state.difficulty}
                mistakes={state.experienceMode === 'kid' ? kidAdventureStats.mistakes : state.mistakes}
                maxMistakes={state.maxMistakes}
                score={state.experienceMode === 'kid' ? kidAdventureStats.score : state.score}
                stars={state.experienceMode === 'kid' ? kidAdventureStats.stars : state.stars}
                kidMode={state.kidMode}
                hintText={state.hintText}
                onAction={handleAction}
              />
              {state.experienceMode === 'kid' && (
                <section className="panel p-4">
                  <h3 className="mb-3 text-sm font-black tracking-[0.08em] text-slate-600">关卡选择</h3>
                  <div id="kid-level-map-slot"></div>
                </section>
              )}
              {state.experienceMode === 'classic' && (
                <NumberPicker
                  selectedValue={state.selectedValue}
                  onPick={handleNumberPick}
                />
              )}
            </aside>
          </section>

          <TipBanner />
        </main>

        <footer className="mt-auto py-6 text-center text-sm font-bold text-slate-500">
          © 2024 Numberblocks Sudoku. Inspired by the educational series.
        </footer>
      </div>

      {(state.completed || state.failed) && (
        <WinOverlay
          mode={state.completed ? 'win' : 'lose'}
          onReplay={() => newGame(state.difficulty)}
        />
      )}

      {guideOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-xl border border-slate-200 bg-white shadow-2xl">
            <div className="card-body">
              <h3 className="font-display text-3xl text-slate-900">玩法说明</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p>经典模式：点击格子后，使用数字积木填入。错误会累计，达到上限本局结束。</p>
                <p>幼儿冒险：完成 4x4 关卡可得星星，并自动解锁下一关。</p>
                <p>拖拽支持：经典模式可以把数字积木拖到目标格子。</p>
                <p>提示工具：可使用提示、自动备注、撤销和重做辅助解题。</p>
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" className="btn btn-primary" onClick={() => setGuideOpen(false)}>
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md border border-slate-200 bg-white shadow-2xl">
            <div className="card-body">
              <h3 className="font-display text-3xl text-slate-900">设置</h3>
              <label className="form-control">
                <span className="label-text text-sm font-semibold text-slate-700">总音量</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(audioSettings.masterVolume * 100)}
                  onChange={(event) =>
                    setAudioSettings((prev) => ({
                      ...prev,
                      masterVolume: Number(event.target.value) / 100,
                    }))
                  }
                  className="range range-info range-sm"
                />
              </label>
              <label className="label mt-1 cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-info checkbox-sm"
                  checked={audioSettings.uiEnabled}
                  onChange={(event) =>
                    setAudioSettings((prev) => ({ ...prev, uiEnabled: event.target.checked }))
                  }
                />
                <span className="label-text text-slate-700">按钮点击音效</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-info checkbox-sm"
                  checked={audioSettings.feedbackEnabled}
                  onChange={(event) =>
                    setAudioSettings((prev) => ({
                      ...prev,
                      feedbackEnabled: event.target.checked,
                    }))
                  }
                />
                <span className="label-text text-slate-700">成功/失败/过关音效</span>
              </label>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSettingsOpen(false)}
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
