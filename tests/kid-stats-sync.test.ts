import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('kid adventure stats sync', () => {
  it('exposes progress callback from kid board to app', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toContain('onProgressChange={(progress) => setKidAdventureStats(progress)}');
  });

  it('uses kid adventure stats for stats panel in kid mode', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toContain("mistakes={state.experienceMode === 'kid' ? kidAdventureStats.mistakes : state.mistakes}");
    expect(app).toContain("score={state.experienceMode === 'kid' ? kidAdventureStats.score : state.score}");
    expect(app).toContain("stars={state.experienceMode === 'kid' ? kidAdventureStats.stars : state.stars}");
  });

  it('reports tries and placed blocks without a penalty score', () => {
    const board = readFileSync(new URL('../src/components/KidAdventureBoard.tsx', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../src/kid-adventure/play.ts', import.meta.url), 'utf8');
    expect(board).toContain('onProgressChange?: (progress: { mistakes: number; score: number; stars: number }) => void;');
    expect(board).toContain('mistakes: play.tried');
    expect(board).toContain('score: kidPlacedScore(play)');
    expect(play).not.toContain('prev.score - 5');
    expect(board).not.toContain('不是这个数字');
  });
});
