import { describe, expect, it } from 'vitest';
import { greetLikeWarmup, createKidPlay } from '../src/kid-adventure/play';
import {
  advanceWarmup,
  createWarmupPlay,
  placeWarmupFriend,
  tapWarmupCell,
  undoWarmup,
} from '../src/kid-adventure/warmup';

describe('warmup before the 4x4', () => {
  it('rejects a friend already standing in the row and keeps the hole', () => {
    const next = placeWarmupFriend(createWarmupPlay(), 1);
    expect(next.cells).toEqual([1, 2, 3, 0]);
    expect(next.feedback.text).toContain('这一行已经有 1');
    expect(next.cleared).toBe(false);
  });

  it('fills the missing friend, then spots a duplicate, then completes the box', () => {
    let play = placeWarmupFriend(createWarmupPlay(), 4);
    expect(play.cells).toEqual([1, 2, 3, 4]);
    expect(play.cleared).toBe(true);
    play = advanceWarmup(play);
    expect(play.step).toBe('spot');
    expect(play.cells).toEqual([1, 2, 2, 4]);
    const missed = tapWarmupCell(play, 0);
    expect(missed.step).toBe('spot');
    expect(missed.feedback.text).toContain('再找两个一样');
    play = tapWarmupCell(play, 1);
    expect(play.step).toBe('fill');
    expect(play.cells.filter((value) => value === 0)).toHaveLength(1);
    play = placeWarmupFriend(play, 3);
    expect(play.cleared).toBe(true);
    expect(play.cells.slice().sort()).toEqual([1, 2, 3, 4]);
    play = advanceWarmup(play);
    expect(play.stationIndex).toBe(2);
    expect(play.cells).toEqual([1, 2, 3, 0]);
    play = placeWarmupFriend(play, 4);
    expect(play.feedback.text).toContain('小草地的第一行');
    play = advanceWarmup(play);
    expect(play.finished).toBe(true);
  });

  it('undoes a wrong-feeling duplicate tap back to the full row', () => {
    const spotted = tapWarmupCell(advanceWarmup(placeWarmupFriend(createWarmupPlay(), 4)), 2);
    expect(spotted.cells).toContain(0);
    expect(undoWarmup(spotted).cells).toEqual([1, 2, 2, 4]);
  });

  it('greets level 1 from the visible first row, not a stored solution', () => {
    const greeted = greetLikeWarmup(createKidPlay(1));
    expect(greeted.focus).toHaveLength(4);
    expect(greeted.feedback.value).toBe(4);
    expect(greeted.feedback.text).toContain('第一行');
    expect(greetLikeWarmup(createKidPlay(2)).feedback.tone).toBe('idle');
  });
});
