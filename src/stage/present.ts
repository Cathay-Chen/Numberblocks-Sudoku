import { cheers } from '../audio/celebration';

export type FriendKind = 'idle' | 'place' | 'miss' | 'board' | 'hint';

export type FriendCue = {
  id: number;
  kind: FriendKind;
  value: number | null;
  count: number;
};

type Listener = (cue: FriendCue) => void;

let sequence = 0;
let latest: FriendCue | null = null;
const listeners = new Set<Listener>();

export const lastFriendCue = (): FriendCue | null => latest;

export const subscribeFriend = (listener: Listener): (() => void) => {
  listeners.add(listener);
  const stop = () => {
    listeners.delete(listener);
  };
  return stop;
};

export const showFriend = (input: {
  kind: FriendKind;
  value: number | null;
  count?: number;
  sound?: boolean;
}) => {
  const kind = input.kind;
  if (input.sound !== false && (kind === 'place' || kind === 'miss' || kind === 'board')) {
    cheers.play(kind);
  }
  const cue: FriendCue = {
    id: (sequence += 1),
    kind,
    value: input.value,
    count: input.count ?? 4,
  };
  latest = cue;
  for (const listener of listeners) listener(cue);
};
