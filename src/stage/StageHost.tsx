import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';

export function StageHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: Phaser.Game | null = null;
    let cancelled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    void import('./boot')
      .then(({ createFriendGame }) => {
        if (cancelled || !host.isConnected) return;
        game = createFriendGame(host, reducedMotion);
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    const onVisibility = () => {
      if (!game) return;
      if (document.hidden) game.loop.sleep();
      else game.loop.wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new ResizeObserver(() => {
      if (!game || !host) return;
      game.scale.resize(Math.max(64, host.clientWidth), 112);
    });
    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      game?.destroy(true);
      game = null;
    };
  }, []);

  return (
    <div ref={hostRef} className="friend-stage" data-stage="friends" data-stage-cue="idle" aria-hidden="true">
      {fallback ? <img className="friend-fallback" src="/character_01_1x.png" alt="" /> : null}
    </div>
  );
}
