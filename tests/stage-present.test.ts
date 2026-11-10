import { afterEach, describe, expect, it, vi } from 'vitest';
import { cheers } from '../src/audio/celebration';
import { lastFriendCue, showFriend, subscribeFriend } from '../src/stage/present';

describe('friend stage cues', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('plays one sound for a place and stops notifying after unsubscribe', () => {
    const seen: string[] = [];
    const stop = subscribeFriend((cue) => seen.push(`${cue.kind}:${cue.value}`));
    const play = vi.spyOn(cheers, 'play').mockImplementation(() => undefined);
    showFriend({ kind: 'place', value: 4, count: 4 });
    showFriend({ kind: 'place', value: 2, count: 4 });
    expect(play).toHaveBeenCalledTimes(2);
    expect(play).toHaveBeenNthCalledWith(1, 'place');
    expect(seen).toEqual(['place:4', 'place:2']);
    expect(lastFriendCue()?.id).toBeGreaterThan(0);
    stop();
    stop();
    showFriend({ kind: 'miss', value: 1, sound: false });
    expect(seen).toEqual(['place:4', 'place:2']);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('does not play a sound for a hint or a restored board', () => {
    const play = vi.spyOn(cheers, 'play').mockImplementation(() => undefined);
    showFriend({ kind: 'hint', value: 3, sound: false });
    showFriend({ kind: 'board', value: null, count: 6, sound: false });
    expect(play).not.toHaveBeenCalled();
    expect(lastFriendCue()).toMatchObject({ kind: 'board', count: 6 });
  });
});
