// @vitest-environment happy-dom
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StageHost } from '../src/stage/StageHost';
import { friendListenerCount, subscribeFriend } from '../src/stage/present';

vi.mock('../src/stage/load', () => ({
  loadStage: async () => ({
    createFriendGame: (parent: HTMLElement) => {
      const unsubscribe = subscribeFriend(() => undefined);
      const canvas = document.createElement('canvas');
      parent.append(canvas);
      const game = {
        loop: { sleep() {}, wake() {} },
        scale: { resize() {} },
        destroy() {
          unsubscribe();
          canvas.remove();
        },
      };
      return game;
    },
  }),
}));

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('stage host lifecycle', () => {
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

  it('keeps a single canvas and listener through StrictMode remounts', async () => {
    mount = document.createElement('div');
    document.body.append(mount);
    root = createRoot(mount);

    const Shell = () => {
      const [open, setOpen] = useState(true);
      return (
        <div className="kid-play">
          <button type="button" onClick={() => setOpen((value) => !value)}>
            切换
          </button>
          {open ? <StageHost /> : null}
        </div>
      );
    };

    await act(async () => {
      root?.render(
        <StrictMode>
          <Shell />
        </StrictMode>
      );
    });
    await flush();

    expect(mount.querySelectorAll('canvas')).toHaveLength(1);
    expect(friendListenerCount()).toBe(1);
    expect(mount.querySelector('.kid-play')?.getAttribute('data-stage-live')).toBe('1');
    expect(mount.querySelector('.friend-stage')?.getAttribute('data-stage-boot')).toBe('live');

    const button = mount.querySelector('button');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
    expect(mount.querySelectorAll('canvas')).toHaveLength(0);
    expect(friendListenerCount()).toBe(0);
    expect(mount.querySelector('.kid-play')?.hasAttribute('data-stage-live')).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
    expect(mount.querySelectorAll('canvas')).toHaveLength(1);
    expect(friendListenerCount()).toBe(1);

    await act(async () => {
      root?.unmount();
    });
    root = null;
    expect(friendListenerCount()).toBe(0);
    expect(mount.querySelectorAll('canvas')).toHaveLength(0);
  });
});
