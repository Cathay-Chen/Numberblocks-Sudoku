import { speakCoach } from '../audio/speak';

type ToolName = 'hear' | 'mute' | 'undo' | 'redo' | 'erase' | 'friends' | 'demo' | 'check' | 'hint' | 'notes' | 'clear' | 'arrow' | 'close';

const paths: Record<ToolName, string> = {
  hear: 'M4 10h4l5-4v12l-5-4H4v-4zm11 1a4 4 0 0 1 0 6M16 7a7 7 0 0 1 0 10',
  mute: 'M4 10h4l5-4v12l-5-4H4v-4zm12 2 5 5m0-5-5 5',
  undo: 'M8 8H4v4M4.5 8A7 7 0 1 1 6 16.5',
  redo: 'M16 8h4v4M19.5 8A7 7 0 1 0 18 16.5',
  erase: 'M4 16.5 13 5.5a2 2 0 0 1 3 0l2.5 2.5a2 2 0 0 1 0 3L10 20H4v-3.5zM9 15l4 4',
  friends: 'M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 19c.5-2.5 2.4-4 5-4s4.5 1.5 5 4M13 15.2c1.2-.8 2.6-1.2 4-1.2 2 0 3.6 1.1 4.2 3',
  demo: 'M5 6.5h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM10 9v6l5-3-5-3z',
  check: 'M5 12.5 9.2 17 19 7',
  hint: 'M12 4a5 5 0 0 0-2 9.6V16h4v-2.4A5 5 0 0 0 12 4zM10 19h4',
  notes: 'M7 4h8l4 4v12H7V4zM15 4v4h4M9 12h6M9 16h4',
  clear: 'M5 8h14M9 8V5h6v3M8 8l1 12h6l1-12',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
};

export function ToolIcon({ name }: { name: ToolName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tool-icon">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HearButton({ text }: { text: string }) {
  return (
    <button type="button" className="kid-hear" aria-label={`听这句话：${text}`} onClick={() => speakCoach(text)}>
      <ToolIcon name="hear" />
      <span>听</span>
    </button>
  );
}

export function HandButton({
  icon,
  label,
  disabled,
  pressed,
  name,
  onClick,
}: {
  icon: ToolName;
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  name?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="kid-hand-btn"
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={name}
      onClick={onClick}
    >
      <ToolIcon name={icon} />
      <span>{label}</span>
    </button>
  );
}

export function QuietLink({
  icon,
  label,
  expanded,
  onClick,
}: {
  icon?: ToolName;
  label: string;
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="kid-more"
      aria-expanded={expanded}
      onClick={onClick}
    >
      {icon ? <ToolIcon name={icon} /> : null}
      <span>{label}</span>
    </button>
  );
}
