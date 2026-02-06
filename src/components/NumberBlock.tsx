import type { DragEvent } from 'react';
import { imageFor } from '../game/utils';

type NumberBlockProps = {
  value: number;
  size: 'picker' | 'cell';
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  given?: boolean;
  showScreenReaderLabel?: boolean;
  imageAlt?: string;
};

export function NumberBlock({
  value,
  size,
  draggable = false,
  onDragStart,
  given = false,
  showScreenReaderLabel = true,
  imageAlt,
}: NumberBlockProps) {
  return (
    <div
      className={[
        'number-block',
        size === 'picker'
          ? 'nb-picker aspect-square w-full rounded-lg'
          : 'nb-cell h-full w-full rounded-md',
        given ? 'ring-1 ring-sky-300/70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-value={value}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <img src={imageFor(value)} alt={imageAlt ?? `数字积木 ${value}`} loading="lazy" />
      {showScreenReaderLabel && <span className="num">{value}</span>}
    </div>
  );
}
