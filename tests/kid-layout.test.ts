import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('kid adventure layout', () => {
  it('uses square kid cells', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.kid-cell\s*{[\s\S]*aspect-ratio:\s*1\s*\/\s*1/);
  });

  it('centers and constrains the 4x4 kid grid size', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.kid-grid\s*{[\s\S]*width:\s*min\(100%,\s*18\.5rem\)/);
    expect(css).toMatch(/\.kid-grid\s*{[\s\S]*margin-inline:\s*auto/);
  });

  it('mounts level map under stats panel in App', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    expect(app).toContain('levelMapHostId="kid-level-map-slot"');
    expect(app).toContain('<div id="kid-level-map-slot"></div>');
  });

  it('does not clamp kid cell block image to a fixed 44x44 box', () => {
    const component = readFileSync(
      new URL('../src/components/KidAdventureBoard.tsx', import.meta.url),
      'utf8'
    );
    expect(component).not.toContain('className="h-11 w-11"');
  });
});
