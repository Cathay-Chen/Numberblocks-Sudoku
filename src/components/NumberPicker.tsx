import { NumberBlock } from './NumberBlock';

type NumberPickerProps = {
  selectedValue: number | null;
  onPick: (value: number) => void;
};

export function NumberPicker({ selectedValue, onPick }: NumberPickerProps) {
  return (
    <section className="panel p-5">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
        选择数字积木
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, index) => {
          const value = index + 1;

          return (
            <button
              key={`picker-${value}`}
              type="button"
              aria-label={`选择数字 ${value}`}
              className={[
                'grid gap-1 rounded-xl border p-2 transition-all',
                selectedValue === value
                  ? 'border-sky-400 bg-sky-50 shadow'
                  : 'border-slate-200 bg-slate-50 hover:border-sky-300',
              ].join(' ')}
              onClick={() => onPick(value)}
            >
              <NumberBlock
                value={value}
                size="picker"
                draggable
                imageAlt=""
                showScreenReaderLabel={false}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', String(value));
                }}
              />
              <span className="text-sm font-extrabold text-slate-700">{value}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
