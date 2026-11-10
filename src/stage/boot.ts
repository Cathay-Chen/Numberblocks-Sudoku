import Phaser from 'phaser';
import { PlayfieldScene } from './PlayfieldScene';

export const createFriendGame = (parent: HTMLElement, reducedMotion: boolean): Phaser.Game => {
  const width = Math.max(64, parent.clientWidth || 280);
  const height = Math.max(64, parent.clientHeight || 480);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    // Phaser 3 的 RESIZE 把画布缓冲设成父元素的 CSS 像素，不乘 devicePixelRatio。
    fps: { target: 30, min: 12 },
    // 角色图是平滑插画。最近邻缩小会把脸上的细节抽成彩点，所以用线性过滤，并且不走像素风。
    render: {
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'default',
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width,
      height,
    },
    scene: [PlayfieldScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('stageHost', parent);
        game.registry.set('reducedMotion', reducedMotion);
      },
    },
  });
};
