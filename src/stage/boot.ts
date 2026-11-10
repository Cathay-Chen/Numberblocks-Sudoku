import Phaser from 'phaser';
import { FriendScene } from './FriendScene';

export const createFriendGame = (parent: HTMLElement, reducedMotion: boolean): Phaser.Game => {
  const width = Math.max(64, parent.clientWidth || 280);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height: 112,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    fps: { target: 30, min: 12 },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width,
      height: 112,
    },
    scene: [FriendScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('stageHost', parent);
        game.registry.set('reducedMotion', reducedMotion);
      },
    },
  });
};
