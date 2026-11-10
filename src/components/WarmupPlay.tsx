import { useEffect, useState } from 'react';
import { cheers } from '../audio/celebration';
import { cueForWarmup } from '../kid-adventure/celebrate';
import { showFriend } from '../stage/present';
import { useStageCue } from '../stage/useStageCue';
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
  const queueCue = useStageCue();
  const station = WARMUP_STATIONS[play.stationIndex] ?? WARMUP_STATIONS[0];
  const highlights = new Set(play.highlight);

  useEffect(() => {
    showFriend({ kind: 'idle', value: null, count: 4, sound: false });
    return () => {
      window.speechSynthesis?.cancel();
      cheers.stop();
    };
  }, []);

  const cells = station.house === 'box' ? (
    <div className="kid-box warmup-box" data-board="warmup" aria-label="小宫">
      {play.cells.map((value, index) => (
        <CellButton
          key={`${play.stationIndex}-${index}`}
          index={index}
          value={value}
          highlighted={highlights.has(index)}
          acked={placedHere(play, index, value)}
          wrong={play.feedback.tone === 'conflict' && highlights.has(index)}
          onClick={() => {
            const prev = play;
            const next = tapWarmupCell(prev, index);
            setPlay(next);
            playWarmupCue(prev, next, queueCue);
          }}
        />
      ))}
    </div>
  ) : (
    <div className="warmup-row" data-board="warmup" aria-label="一行朋友">
      {play.cells.map((value, index) => (
        <CellButton
          key={`${play.stationIndex}-${index}`}
          index={index}
          value={value}
          highlighted={highlights.has(index)}
          acked={placedHere(play, index, value)}
          wrong={play.feedback.tone === 'conflict' && highlights.has(index)}
          onClick={() => {
            const prev = play;
            const next = tapWarmupCell(prev, index);
            setPlay(next);
            playWarmupCue(prev, next, queueCue);
          }}
        />
      ))}
    </div>
  );

  return (
    <section className="kid-card">
      <div className="flex items-center justify-center gap-2" aria-label="三步准备">
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
      <p className="kid-task">{station.prompt}</p>
      {cells}
      <div className="kid-note" aria-live="polite">
        {play.feedback.value ? (
          <div className={['h-12 w-12 shrink-0', play.cleared ? 'warmup-pop' : ''].join(' ')}>
            <NumberBlock value={play.feedback.value} size="picker" imageAlt="" />
          </div>
        ) : null}
        <p>{play.feedback.text}</p>
      </div>
      <div className="kid-pad">
        {[1, 2, 3, 4].map((value) => {
          const mark =
            play.feedback.value === value
              ? play.feedback.tone === 'conflict'
                ? '重复'
                : play.feedback.tone === 'found' || play.feedback.tone === 'done'
                  ? '刚放'
                  : ''
              : '';
          return (
            <button
              key={value}
              type="button"
              aria-label={`放入数字积木 ${value}${mark ? `，${mark}` : ''}`}
              onClick={() => {
                const prev = play;
                const next = placeWarmupFriend(prev, value);
                setPlay(next);
                playWarmupCue(prev, next, queueCue);
              }}
            >
              <span className="mx-auto block h-10 w-10">
                <NumberBlock value={value} size="picker" imageAlt="" showScreenReaderLabel={false} />
              </span>
              {mark ? <span className="kid-pad-mark">{mark}</span> : <span className="kid-pad-mark">{value}</span>}
            </button>
          );
        })}
      </div>
      {play.cleared && !play.finished && (
        <button
          type="button"
          className="kid-go"
          onClick={() => {
            cheers.stop();
            const next = advanceWarmup(play);
            if (next.finished) onDone();
            else {
              queueCue({ kind: 'idle', value: null, count: 4, cells: [], focus: null, sound: false });
              setPlay(next);
            }
          }}
        >
          {play.stationIndex === WARMUP_STATIONS.length - 1 ? '去小草地' : '下一个'}
        </button>
      )}
      <div className="kid-tools">
        <button
          type="button"
          className="kid-quiet"
          onClick={() => speakCoach(play.feedback.tone === 'idle' ? station.prompt : play.feedback.text)}
        >
          听一听
        </button>
        <button
          type="button"
          className="kid-quiet"
          disabled={play.past.length === 0}
          onClick={() => {
            const next = undoWarmup(play);
            if (play.cleared && !next.cleared) cheers.stop();
            queueCue({
              kind: 'idle',
              value: next.feedback.value,
              count: 4,
              cells: [],
              focus: null,
              sound: false,
            });
            setPlay(next);
          }}
        >
          撤销
        </button>
      </div>
    </section>
  );
}

const placedHere = (
  play: WarmupState,
  index: number,
  value: number
) => (play.feedback.tone === 'found' || play.feedback.tone === 'done') && play.highlight.includes(index) && value !== 0;

const playWarmupCue = (
  prev: WarmupState,
  next: WarmupState,
  queueCue: (cue: Parameters<typeof showFriend>[0]) => void
) => {
  const cue = cueForWarmup({
    beforeComplete: prev.cleared,
    afterComplete: next.cleared,
    tone: next.feedback.tone,
  });
  const cells = next.highlight.map((index) => ({ row: 0, col: index }));
  const focus = cells[cells.length - 1] ?? null;
  if (!cue) {
    queueCue({ kind: 'idle', value: next.feedback.value, count: 4, cells, focus, sound: false });
    return;
  }
  queueCue({
    kind: cue,
    value: next.feedback.value,
    count: 4,
    cells,
    focus,
    sound: true,
  });
};

function CellButton({
  index,
  value,
  highlighted,
  acked,
  wrong,
  onClick,
}: {
  index: number;
  value: number;
  highlighted: boolean;
  acked: boolean;
  wrong: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'warmup-cell',
        acked ? 'warmup-ack' : '',
        wrong ? 'warmup-wrong warmup-bump' : '',
        !acked && !wrong && highlighted ? 'warmup-cell-hot' : '',
        value === 0 ? 'warmup-cell-empty' : '',
      ].join(' ')}
      data-cell={`0-${index}`}
      aria-label={value === 0 ? `空位 ${index + 1}` : `朋友 ${value}`}
      onClick={onClick}
    >
      {value !== 0 && <NumberBlock value={value} size="cell" imageAlt={`数字积木 ${value}`} />}
    </button>
  );
}
