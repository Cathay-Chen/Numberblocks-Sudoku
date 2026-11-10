import { cheers } from '../audio/celebration';
import { explainBand, type StageCell } from './spots';

export type { StageCell } from './spots';

export type FriendKind = 'idle' | 'place' | 'miss' | 'board' | 'hint';

export type FriendCue = {
  id: number;
  kind: FriendKind;
  value: number | null;
  count: number;
  cells: StageCell[];
  focus: StageCell | null;
  from: StageCell | null;
};

export type ShowFriendInput = {
  kind: FriendKind;
  value: number | null;
  count?: number;
  cells?: StageCell[];
  focus?: StageCell | null;
  board?: number[][] | null;
  sound?: boolean;
};

type Listener = (cue: FriendCue) => void;

let sequence = 0;
let latest: FriendCue | null = null;
const listeners = new Set<Listener>();

export const lastFriendCue = (): FriendCue | null => latest;

export const friendListenerCount = (): number => listeners.size;

export const subscribeFriend = (listener: Listener): (() => void) => {
  listeners.add(listener);
  const stop = () => {
    listeners.delete(listener);
  };
  return stop;
};

const copyCell = (cell: StageCell | null | undefined): StageCell | null =>
  cell ? { row: cell.row, col: cell.col } : null;

export const showFriend = (input: ShowFriendInput) => {
  const kind = input.kind;
  const raw = (input.cells ?? []).map((cell) => ({ row: cell.row, col: cell.col }));
  const cells = kind === 'miss' || kind === 'hint' ? explainBand(input.board ?? null, raw) : raw;
  const focus =
    copyCell(input.focus) ??
    (kind === 'place' || kind === 'miss' ? copyCell(raw[raw.length - 1]) : null);
  const from = kind === 'miss' || kind === 'hint' ? copyCell(raw[0]) : null;
  if (input.sound !== false && (kind === 'place' || kind === 'miss' || kind === 'board')) {
    if (cheers.playing() !== kind) cheers.play(kind);
  }
  const cue: FriendCue = {
    id: (sequence += 1),
    kind,
    value: input.value,
    count: input.count ?? 4,
    cells,
    focus,
    from,
  };
  latest = cue;
  for (const listener of listeners) listener(cue);
};
