import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('kid journey keeps records and drops the life panel', () => {
  it('saves warmup completion beside the existing star fields', () => {
    const hook = readFileSync(new URL('../src/hooks/useSudokuGame.ts', import.meta.url), 'utf8');
    expect(hook).toContain('warmupDone: state.warmupDone');
    expect(hook).toContain('resolveWarmupDone');
  });

  it('does not show the classic mistake limit on the child path', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toContain("place === 'learn'");
    expect(app).not.toContain('kidAdventureStats');
    expect(app).not.toContain('错误 /');
  });

  it('still explains a duplicate instead of saying the hidden answer is wrong', () => {
    const board = readFileSync(new URL('../src/components/KidAdventureBoard.tsx', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../src/kid-adventure/play.ts', import.meta.url), 'utf8');
    expect(board).not.toContain('不是这个数字');
    expect(play).not.toContain('prev.score - 5');
    expect(play).not.toContain('solution');
  });
});
