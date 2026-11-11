import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { layoutPlayfield, viewportBudget } from './layout';
import { presentPlayfield, subscribePlayAction, subscribeSeats, type PlayfieldModel } from './playfield';
import { StageHost } from './StageHost';

type PlayfieldProps = {
  model: Omit<PlayfieldModel, 'rev'>;
  onCell: (row: number, col: number) => void;
  onPlace: (row: number, col: number, value: number) => void;
  onMode?: (mode: 'live' | 'fallback') => void;
};

export function Playfield({ model, onCell, onPlace, onMode }: PlayfieldProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const keys = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(320);
  const [mode, setMode] = useState<'boot' | 'live' | 'fallback'>('boot');
  const cellRef = useRef(onCell);
  const placeRef = useRef(onPlace);
  cellRef.current = onCell;
  placeRef.current = onPlace;

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const apply = () => {
      const width = el.clientWidth;
      if (width < 64) return;
      const top = el.getBoundingClientRect().top;
      const next = layoutPlayfield(width, model, {
        maxHeight: viewportBudget(top, window.innerHeight),
      }).height;
      setHeight((prev) => (prev === next ? prev : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [model.kind, model.size, model.boxRows, model.boxCols, model.digits]);

  useEffect(() => {
    if (mode !== 'live') return;
    presentPlayfield(model);
  }, [model, mode]);

  useEffect(() => {
    return subscribePlayAction((action) => {
      if (action.type === 'cell') cellRef.current(action.row, action.col);
      else placeRef.current(action.row, action.col, action.value);
    });
  }, []);

  useEffect(() => {
    return subscribeSeats((marks) => {
      const root = keys.current;
      if (!root) return;
      for (const mark of marks) {
        const button = root.querySelector(`[data-key="${mark.key}"]`);
        if (!(button instanceof HTMLElement)) continue;
        button.style.width = `${mark.w}px`;
        button.style.height = `${mark.h}px`;
        button.style.transform = `translate(${mark.x}px, ${mark.y}px)`;
      }
    });
  }, []);

  return (
    <div ref={wrap} className="play-wrap" hidden={mode === 'fallback'}>
      <StageHost
        height={height}
        onMode={(next) => {
          setMode(next);
          onMode?.(next);
        }}
      />
      <div className="play-keys">
        <div ref={keys}>
          {model.cells.map((cell) => (
            <button
              key={`${cell.row}-${cell.col}`}
              type="button"
              data-key={`${cell.row}-${cell.col}`}
              aria-label={
                model.kind === 'grid'
                  ? `第${cell.row + 1}行第${cell.col + 1}列${cell.value ? `数字${cell.value}` : '空格'}${cell.selected ? '，选中' : ''}`
                  : cell.value
                    ? `朋友 ${cell.value}`
                    : `空位 ${cell.col + 1}`
              }
              onClick={() => onCell(cell.row, cell.col)}
            />
          ))}
          {model.digits.map((value) => (
            <button
              key={`n-${value}`}
              type="button"
              data-key={`n-${value}`}
              aria-label={`放入数字积木 ${value}`}
              onClick={() => {
                const selected = model.cells.find((cell) => cell.selected);
                onPlace(selected?.row ?? -1, selected?.col ?? -1, value);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
