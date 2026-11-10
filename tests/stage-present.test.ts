import { afterEach, describe, expect, it, vi } from 'vitest';
import { CelebrationSounds, type CelebrationAudio } from '../src/audio/celebration';
import { sfx } from '../src/audio/sfx';
import { cueForMove } from '../src/kid-adventure/celebrate';
import { createKidPlay, nextLevelStars, placeKidNumber } from '../src/kid-adventure/play';
import { cheers } from '../src/audio/celebration';
import { explainBand } from '../src/stage/spots';
import { friendListenerCount, lastFriendCue, showFriend, subscribeFriend } from '../src/stage/present';

const fakeAudio = (): CelebrationAudio => ({
  volume: 1,
  preload: '',
  play: vi.fn(async () => undefined),
  pause: vi.fn(),
  currentTime: 0,
});

describe('friend stage cues', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cheers.stop();
  });

  it('notifies every place, then drops listeners after unsubscribe', () => {
    const seen: string[] = [];
    const stop = subscribeFriend((cue) => seen.push(`${cue.kind}:${cue.value}`));
    const play = vi.spyOn(cheers, 'play').mockImplementation(() => undefined);
    showFriend({ kind: 'place', value: 4, count: 4, cells: [{ row: 0, col: 3 }], focus: { row: 0, col: 3 } });
    showFriend({ kind: 'place', value: 2, count: 4, cells: [{ row: 1, col: 2 }], focus: { row: 1, col: 2 } });
    expect(play).toHaveBeenCalledTimes(2);
    expect(seen).toEqual(['place:4', 'place:2']);
    expect(lastFriendCue()).toMatchObject({ focus: { row: 1, col: 2 }, cells: [{ row: 1, col: 2 }] });
    stop();
    stop();
    showFriend({ kind: 'miss', value: 1, sound: false });
    expect(seen).toEqual(['place:4', 'place:2']);
    expect(friendListenerCount()).toBe(0);
  });

  it('keeps updating the picture when the same sound is already playing', () => {
    const seen: string[] = [];
    const stop = subscribeFriend((cue) => seen.push(cue.kind));
    vi.spyOn(cheers, 'playing').mockReturnValue('place');
    const play = vi.spyOn(cheers, 'play').mockImplementation(() => undefined);
    showFriend({ kind: 'place', value: 4, cells: [{ row: 0, col: 3 }], focus: { row: 0, col: 3 } });
    expect(play).not.toHaveBeenCalled();
    expect(seen).toEqual(['place']);
    showFriend({ kind: 'miss', value: 1, cells: [{ row: 0, col: 0 }, { row: 0, col: 3 }], focus: { row: 0, col: 3 } });
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('miss');
    stop();
  });

  it('does not play a sound for a hint or a restored board', () => {
    const play = vi.spyOn(cheers, 'play').mockImplementation(() => undefined);
    showFriend({ kind: 'hint', value: 3, cells: [{ row: 2, col: 1 }], focus: { row: 2, col: 1 }, sound: false });
    showFriend({ kind: 'board', value: null, count: 6, sound: false });
    expect(play).not.toHaveBeenCalled();
    expect(lastFriendCue()).toMatchObject({ kind: 'board', count: 6, cells: [] });
  });

  it('draws a conflict as the whole row, and a single seat as that cell', () => {
    const play = createKidPlay(1);
    const clash = placeKidNumber({ ...play, selected: { row: 0, col: 3 } }, 1);
    showFriend({
      kind: 'miss',
      value: 1,
      cells: clash.focus,
      focus: clash.selected,
      board: clash.board,
      sound: false,
    });
    expect(lastFriendCue()).toMatchObject({
      from: { row: 0, col: 0 },
      focus: { row: 0, col: 3 },
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ],
    });

    showFriend({
      kind: 'hint',
      value: 4,
      cells: [{ row: 1, col: 2 }],
      focus: { row: 1, col: 2 },
      board: play.board,
      sound: false,
    });
    expect(lastFriendCue()?.cells).toEqual([{ row: 1, col: 2 }]);
  });

  it('groups a 6x6 pair into its 2x3 box, and prefers a row over a box', () => {
    const six = Array.from({ length: 6 }, () => Array(6).fill(0));
    expect(explainBand(six, [{ row: 0, col: 0 }, { row: 1, col: 2 }])).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
    const four = Array.from({ length: 4 }, () => Array(4).fill(0));
    expect(explainBand(four, [{ row: 0, col: 0 }, { row: 0, col: 1 }]).every((cell) => cell.row === 0)).toBe(true);
    expect(explainBand(four, [{ row: 0, col: 3 }, { row: 2, col: 3 }]).every((cell) => cell.col === 3)).toBe(true);
  });

  it('does not score or celebrate again after the board is already finished', () => {
    const play = createKidPlay(1);
    const finished = { ...play, completed: true, tried: 2 };
    expect(placeKidNumber(finished, 1)).toBe(finished);
    expect(cueForMove({ beforeComplete: true, afterComplete: true, tone: 'done' })).toBeNull();
    const once = nextLevelStars([0, 0, 0, 0, 0, 0], 0, 1, 3);
    const twice = nextLevelStars(once.levelStars, once.total, 1, 3);
    expect(once.total).toBe(3);
    expect(twice.total).toBe(3);
    expect(twice.levelStars).toBe(once.levelStars);
  });
});

describe('celebration playback', () => {
  it('does not restart or stack the same cue, and does replace a different one', () => {
    const made: CelebrationAudio[] = [];
    const sounds = new CelebrationSounds(() => {
      const audio = fakeAudio();
      made.push(audio);
      return audio;
    });
    sfx.setFeedbackEnabled(true);
    sfx.setMasterVolume(1);
    sounds.play('place');
    sounds.play('place');
    expect(made).toHaveLength(1);
    expect(made[0].pause).not.toHaveBeenCalled();
    expect(sounds.playing()).toBe('place');
    sounds.play('miss');
    expect(made).toHaveLength(2);
    expect(made[0].pause).toHaveBeenCalledTimes(1);
    expect(sounds.playing()).toBe('miss');
    sounds.stop();
    expect(sounds.playing()).toBeNull();
  });
});
