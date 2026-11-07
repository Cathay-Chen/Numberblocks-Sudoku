import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('kid adventure layout', () => {
  it('uses square kid cells', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.kid-cell\s*{[\s\S]*aspect-ratio:\s*1\s*\/\s*1/);
  });

  it('centers the 4x4 grid and draws the four boxes', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.kid-grid\s*{[\s\S]*width:\s*min\(100%,\s*18\.5rem\)/);
    expect(css).toMatch(/\.kid-grid\s*{[\s\S]*margin-inline:\s*auto/);
    expect(css).toMatch(/\.kid-box\s*{[\s\S]*border:\s*3px solid #0f172a/);
  });

  it('opens on the warmup instead of a mode menu', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toContain('<WarmupPlay');
    expect(app).not.toContain('开始冒险');
    expect(app).toContain('家长');
  });

  it('does not clamp kid cell block image to a fixed 44x44 box', () => {
    const component = readFileSync(
      new URL('../src/components/KidAdventureBoard.tsx', import.meta.url),
      'utf8'
    );
    expect(component).not.toContain('className="h-11 w-11"');
  });
});
