import type { CSSProperties } from 'react';

type WinOverlayProps = {
  onReplay: () => void;
  mode: 'win' | 'lose';
};

export function WinOverlay({ onReplay, mode }: WinOverlayProps) {
  const title = mode === 'win' ? '完成啦!' : '本局结束';
  const message =
    mode === 'win'
      ? '你已经完成了数字积木数独。'
      : '达到错误上限啦，休息一下再来一局吧。';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      {mode === 'win' && (
        <div className="fireworks-layer" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, index) => (
            <span
              key={`firework-${index}`}
              className="firework-particle"
              style={
                {
                  ['--i' as string]: index,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="card w-full max-w-sm border border-slate-200 bg-white shadow-2xl">
        <div className="card-body items-center text-center">
          <h2 className="font-display card-title text-3xl">{title}</h2>
          <p>{message}</p>
          <button type="button" className="btn btn-primary" onClick={onReplay}>
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
}
