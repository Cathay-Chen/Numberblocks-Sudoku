import { describe, expect, it } from 'vitest';
import { coachLadder } from '../src/kid-adventure/coach';
import { KID_LEVELS } from '../src/kid-adventure/engine';
import { createKidPlay, hintKidPlay } from '../src/kid-adventure/play';

describe('staged coach', () => {
  it('looks at a row before naming the missing friend', () => {
    const play = createKidPlay(1);
    const first = hintKidPlay(play);
    expect(first.feedback.value).toBeNull();
    expect(first.feedback.text).toBe('先看这一行。');
    expect(first.board).toEqual(play.board);

    const second = hintKidPlay(first);
    expect(second.feedback.value).toBeNull();
    expect(second.feedback.text).toContain('已经有');

    const third = hintKidPlay(second);
    expect(third.feedback.value).toBe(4);
    expect(third.feedback.text).toContain('空位是 4');
    expect(third.board).toEqual(KID_LEVELS[0].puzzle);
  });

  it('stops at the duplicate and does not offer a replacement digit', () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const ladder = coachLadder(board);
    expect(ladder.every((step) => step.value == null)).toBe(true);
    expect(ladder.map((step) => step.stage)).toEqual(['look', 'why']);
    expect(ladder[1].text).toContain('有两个 2');
  });

  it('explains the only seat from a real blocker, not a stored answer', () => {
    const board = [
      [1, 0, 0, 4],
      [0, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const ladder = coachLadder(board);
    expect(ladder[0].kind).toBe('only-seat');
    expect(ladder[0].text).toContain('2');
    expect(ladder[1].value).toBeNull();
    expect(ladder[1].text).toContain('已经有 2');
    expect(ladder[2].value).toBe(2);
    expect(ladder[2].focus).toEqual({ row: 0, col: 2 });
  });
});
