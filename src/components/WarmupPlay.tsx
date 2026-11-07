import { useEffect, useState } from 'react';
import { speakCoach } from '../audio/speak';
import {
  WARMUP_STATIONS,
  advanceWarmup,
  createWarmupPlay,
  placeWarmupFriend,
  tapWarmupCell,
  undoWarmup,
  type WarmupPlay as WarmupState,
} from '../kid-adventure/warmup';
import { NumberBlock } from './NumberBlock';

type WarmupPlayProps = {
  onDone: () => void;
};

export function WarmupPlay({ onDone }: WarmupPlayProps) {
  const [play, setPlay] = useState<WarmupState>(() => createWarmupPlay());
  const station = WARMUP_STATIONS[play.stationIndex] ?? WARMUP_STATIONS[0];
  const highlights = new Set(play.highlight);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const cells = station.house === 'box' ? (
    <div className="kid-box warmup-box" aria-label="小宫">
      {play.cells.map((value, index) => (
        <CellButton
          key={`${play.stationIndex}-${index}`}
          index={index}
          value={value}
          highlighted={highlights.has(index)}
          onClick={() => setPlay((prev) => tapWarmupCell(prev, index))}
        />
      ))}
    </div>
  ) : (
    <div className="warmup-row" aria-label="一行朋友">
      {play.cells.map((value, index) => (
        <CellButton
          key={`${play.stationIndex}-${index}`}
          index={index}
          value={value}
          highlighted={highlights.has(index)}
          onClick={() => setPlay((prev) => tapWarmupCell(prev, index))}
        />
      ))}
    </div>
  );

  return (
    <section className="warmup-sheet">
      <div className="mb-4 flex items-center justify-center gap-2" aria-label="三步准备">
        {WARMUP_STATIONS.map((item, index) => (
          <span
            key={item.id}
            className={[
              'h-3 w-3 rounded-full',
              index === play.stationIndex ? 'bg-sky-500' : index < play.stationIndex ? 'bg-emerald-400' : 'bg-slate-300',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="mb-4 text-center font-display text-3xl leading-tight text-slate-900">{station.prompt}</p>
      {cells}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((value) => (
          <button
            key={value}
            type="button"
            className="btn min-h-20 border border-slate-200 bg-white px-1"
            aria-label={`放入数字积木 ${value}`}
            onClick={() => setPlay((prev) => placeWarmupFriend(prev, value))}
          >
            <span className="mx-auto block h-12 w-12">
              <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn min-h-12 border border-slate-200 bg-white font-black"
          onClick={() => speakCoach(play.feedback.tone === 'idle' ? station.prompt : play.feedback.text)}
        >
          听一听
        </button>
        <button
          type="button"
          className="btn min-h-12 border border-slate-200 bg-white font-black"
          disabled={play.past.length === 0}
          onClick={() => setPlay((prev) => undoWarmup(prev))}
        >
          撤销
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-cyan-50 px-3 py-3" aria-live="polite">
        {play.feedback.value ? (
          <div className="h-12 w-12 shrink-0">
            <NumberBlock value={play.feedback.value} size="picker" imageAlt="" />
          </div>
        ) : null}
        <p className="text-base font-bold leading-6 text-cyan-950">{play.feedback.text}</p>
      </div>
      {play.cleared && !play.finished && (
        <button
          type="button"
          className="btn btn-primary mt-3 min-h-14 w-full text-lg"
          onClick={() => {
            const next = advanceWarmup(play);
            if (next.finished) onDone();
            else setPlay(next);
          }}
        >
          {play.stationIndex === WARMUP_STATIONS.length - 1 ? '去小草地' : '下一个'}
        </button>
      )}
    </section>
  );
}

function CellButton({
  index,
  value,
  highlighted,
  onClick,
}: {
  index: number;
  value: number;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={['warmup-cell', highlighted ? 'warmup-cell-hot' : '', value === 0 ? 'warmup-cell-empty' : ''].join(' ')}
      aria-label={value === 0 ? `空位 ${index + 1}` : `朋友 ${value}`}
      onClick={onClick}
    >
      {value !== 0 && <NumberBlock value={value} size="cell" imageAlt={`数字积木 ${value}`} />}
    </button>
  );
}
