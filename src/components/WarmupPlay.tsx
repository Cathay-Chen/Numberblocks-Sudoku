import { useEffect, useMemo, useState } from 'react';
import { cheers } from '../audio/celebration';
import { cueForWarmup } from '../kid-adventure/celebrate';
import { buildWarmupModel } from '../stage/model';
import { Playfield } from '../stage/Playfield';
import { showFriend } from '../stage/present';
import { useStageCue } from '../stage/useStageCue';
import { HandButton, HearButton, ToolIcon } from './ToolIcon';
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
  const [field, setField] = useState<'boot' | 'live' | 'fallback'>('boot');
  const queueCue = useStageCue();
  const station = WARMUP_STATIONS[play.stationIndex] ?? WARMUP_STATIONS[0];
  const model = useMemo(
    () => buildWarmupModel({ ...play, house: station.house }),
    [play, station.house]
  );
  const highlights = new Set(play.highlight);

  useEffect(() => {
    showFriend({ kind: 'idle', value: null, count: 4, sound: false });
    return () => {
      window.speechSynthesis?.cancel();
      cheers.stop();
    };
  }, []);

  const domCells = station.house === 'box' ? (
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
      <ol className="warmup-steps" aria-label="三步准备">
        {WARMUP_STATIONS.map((item, index) => {
          const done = index < play.stationIndex;
          const now = index === play.stationIndex;
          return (
            <li key={item.id} aria-current={now ? 'step' : undefined} data-step={done ? 'done' : now ? 'now' : 'later'}>
              {done ? <ToolIcon name="check" /> : <span>{index + 1}</span>}
              <span className="sr-only">{item.prompt}</span>
            </li>
          );
        })}
      </ol>
      <p className="kid-task">{station.prompt}</p>
      <Playfield
        model={model}
        onMode={setField}
        onCell={(_row, col) => {
          const prev = play;
          const next = tapWarmupCell(prev, col);
          setPlay(next);
          playWarmupCue(prev, next, queueCue);
        }}
        onPlace={(_row, _col, value) => {
          const prev = play;
          const next = placeWarmupFriend(prev, value);
          setPlay(next);
          playWarmupCue(prev, next, queueCue);
        }}
      />
      <div hidden={field !== 'fallback'}>{domCells}</div>
      <div className="kid-note" aria-live="polite">
        {play.feedback.value ? (
          <div className={['h-12 w-12 shrink-0', play.cleared ? 'warmup-pop' : ''].join(' ')}>
            <NumberBlock value={play.feedback.value} size="picker" imageAlt="" />
          </div>
        ) : null}
        <p>{play.feedback.text}</p>
        <HearButton text={play.feedback.text} />
      </div>
      <div hidden={field !== 'fallback'} className="kid-pad">
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
      <div className="kid-hand" role="group" aria-label="刚才的格子">
        <HandButton
          icon="undo"
          label="撤销"
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
        />
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
