// @vitest-environment happy-dom
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StageHost } from '../src/stage/StageHost';
import { friendListenerCount } from '../src/stage/present';

vi.mock('../src/stage/load', () => ({
  loadStage: async () => {
    throw new Error('no webgl');
  },
}));

describe('stage host fallback', () => {
  let root: Root | null = null;
  let mount: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    mount?.remove();
    root = null;
    mount = null;
  });

  it('stays mounted without a canvas when the stage cannot start', async () => {
    mount = document.createElement('div');
    document.body.append(mount);
    root = createRoot(mount);
    await act(async () => {
      root?.render(
        <StrictMode>
          <div className="kid-play">
            <StageHost />
          </div>
        </StrictMode>
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const stage = mount.querySelector('.friend-stage');
    expect(stage?.getAttribute('data-stage')).toBe('fallback');
    expect(stage?.getAttribute('data-stage-boot')).toBe('error');
    expect(mount.querySelectorAll('canvas')).toHaveLength(0);
    expect(friendListenerCount()).toBe(0);
    expect(mount.querySelector('.kid-play')).not.toBeNull();
  });
});