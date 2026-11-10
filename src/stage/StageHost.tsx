import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { loadStage } from './load';

export function StageHost({
  height = 420,
  onMode,
}: {
  height?: number;
  onMode?: (mode: 'live' | 'fallback') => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const home = host.parentElement;
    host.dataset.stageBoot = 'start';
    let game: Phaser.Game | null = null;
    let cancelled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fit = () => {
      if (!game || !host) return;
      game.scale.resize(Math.max(64, host.clientWidth), Math.max(64, host.clientHeight));
    };

    void loadStage()
      .then(({ createFriendGame }) => {
        if (cancelled || !host.isConnected) return;
        game = createFriendGame(host, reducedMotion);
        host.dataset.stageBoot = 'live';
        home?.setAttribute('data-stage-live', '1');
        onMode?.('live');
        fit();
      })
      .catch(() => {
        if (cancelled) return;
        host.dataset.stageBoot = 'error';
        setFallback(true);
        onMode?.('fallback');
      });

    const onVisibility = () => {
      if (!game) return;
      if (document.hidden) game.loop.sleep();
      else game.loop.wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new ResizeObserver(() => {
      fit();
    });
    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      home?.removeAttribute('data-stage-live');
      try {
        game?.destroy(true);
      } catch {
        // 切换场景时游戏可能已经拆到一半。
      }
      game = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="friend-stage play-stage"
      style={{ height }}
      data-stage={fallback ? 'fallback' : 'friends'}
      data-playfield="boot"
      aria-hidden="true"
    />
  );
}
