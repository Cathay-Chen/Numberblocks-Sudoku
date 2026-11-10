type GameHeaderProps = {
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
};

export function GameHeader({ onOpenGuide, onOpenSettings, onGoHome }: GameHeaderProps) {
  return (
    <header className="navbar z-10 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur md:px-8">
      <div className="flex-1">
        <button
          type="button"
          className="font-display flex items-center gap-3 text-2xl font-extrabold tracking-wide text-slate-900 transition-colors hover:text-sky-600"
          onClick={onGoHome}
          aria-label="返回首页"
        >
          <div className="relative h-9 w-9">
            <span className="absolute left-2.5 top-0 h-9 w-4 bg-sky-500" />
            <span className="absolute left-0 top-2.5 h-4 w-9 bg-sky-500" />
          </div>
          <span>Numberblocks Sudoku</span>
        </button>
      </div>
      <nav className="flex items-center gap-3 text-sm font-semibold text-slate-700 md:gap-8 md:text-base">
        <button
          type="button"
          className="min-h-12 px-2 transition-colors hover:text-sky-600"
          onClick={onOpenGuide}
        >
          玩法说明
        </button>
        <button
          type="button"
          className="min-h-12 px-2 transition-colors hover:text-sky-600"
          onClick={onOpenSettings}
        >
          设置
        </button>
      </nav>
    </header>
  );
}
