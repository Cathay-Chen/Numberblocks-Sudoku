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

  it('lets the four celebration friends shrink inside a 320px card', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.cheer-friends\s*{[^}]*min-width:\s*0/);
    expect(css).toMatch(/\.cheer-friend\s*{[^}]*min\(5\.25rem,\s*calc\(\(100% - 1\.5rem\) \/ 4\)\)/);
  });

  it('wraps the level dots so a 320px screen is not forced wider', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.kid-levels\s*{[^}]*flex-wrap:\s*wrap/);
    expect(css).not.toMatch(/\.kid-shell\s*{[^}]*overflow:\s*hidden/);
  });

  it('keeps the parent control readable on the meadow', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.kid-parent\s*{[^}]*color:\s*#1e3a2f/);
    expect(css).not.toMatch(/\.kid-parent\s*{[^}]*color:\s*#64748b/);
  });

  it('opens on the warmup instead of a mode menu', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toContain('<WarmupPlay');
    expect(app).not.toContain('开始冒险');
    expect(app).toContain('家长');
  });

  it('keeps the learning step separate from the compact tools', () => {
    const board = readFileSync(new URL('../src/components/KidAdventureBoard.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(board).toContain('className="kid-step"');
    expect(board).toContain('再帮帮我');
    expect(board).toContain('className="kid-hand"');
    expect(board).not.toContain('kid-tools');
    expect(css).toMatch(/\.kid-hand-btn\s*{[^}]*min-height:\s*48px/);
    expect(css).toMatch(/\.kid-step\s*{[^}]*background:\s*#0f766e/);
    expect(css).toMatch(/\.kid-more\s*{[^}]*text-decoration:\s*underline/);
  });

  it('does not clamp kid cell block image to a fixed 44x44 box', () => {
    const component = readFileSync(
      new URL('../src/components/KidAdventureBoard.tsx', import.meta.url),
      'utf8'
    );
    expect(component).not.toContain('className="h-11 w-11"');
  });
});
