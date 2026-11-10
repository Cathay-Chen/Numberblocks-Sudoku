import Phaser from 'phaser';
import { lastFriendCue, subscribeFriend, type FriendCue } from './present';

const friendKey = (value: number) => `friend-${value}`;

export class FriendScene extends Phaser.Scene {
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private last: FriendCue | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super('friends');
  }

  preload() {
    for (let value = 1; value <= 6; value += 1) {
      const file = `/character_${String(value).padStart(2, '0')}_1x.png`;
      this.load.image(friendKey(value), file);
    }
  }

  create() {
    for (let value = 1; value <= 6; value += 1) {
      if (!this.textures.exists(friendKey(value))) continue;
      const sprite = this.add.image(0, 0, friendKey(value)).setVisible(false);
      this.sprites.set(value, sprite);
    }
    this.scale.on('resize', this.relayout, this);
    this.unsubscribe = subscribeFriend((cue) => {
      this.last = cue;
      this.apply(cue, true);
    });
    const pending = lastFriendCue();
    if (pending) {
      this.last = pending;
      this.apply(pending, false);
    }
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.scale.off('resize', this.relayout, this);
    });
    this.relayout();
  }

  private relayout = () => {
    if (!this.last) {
      this.apply({ id: 0, kind: 'idle', value: 1, count: 4 }, false);
      return;
    }
    this.apply(this.last, false);
  };

  private reduced() {
    return this.registry.get('reducedMotion') === true || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private mark(kind: string) {
    const host = this.registry.get('stageHost');
    if (host instanceof HTMLElement) host.dataset.stageCue = kind;
  }

  private apply(cue: FriendCue, animate: boolean) {
    this.tweens.killAll();
    this.sprites.forEach((sprite) => {
      sprite.setVisible(false).setAlpha(1).setAngle(0).setScale(1);
    });
    this.mark(cue.kind);
    const motion = animate && !this.reduced();
    if (cue.kind === 'board') {
      this.showRow(Math.min(6, Math.max(4, cue.count)), motion);
      return;
    }
    const value = cue.value && cue.value >= 1 && cue.value <= 6 ? cue.value : 1;
    this.showOne(value, cue.kind, motion);
  }

  private placeSprite(sprite: Phaser.GameObjects.Image, x: number, y: number, size: number) {
    sprite.setVisible(true).setPosition(x, y).setDisplaySize(size, size);
  }

  private showOne(value: number, kind: FriendCue['kind'], motion: boolean) {
    const sprite = this.sprites.get(value);
    if (!sprite) return;
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;
    const size = Math.min(88, this.scale.height - 8);
    this.placeSprite(sprite, x, y, size);
    if (!motion) return;
    if (kind === 'place') {
      sprite.setY(y + 18);
      this.tweens.add({ targets: sprite, y: y - 16, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    if (kind === 'miss') {
      this.tweens.add({
        targets: sprite,
        angle: { from: -10, to: 10 },
        duration: 90,
        yoyo: true,
        repeat: 2,
        onComplete: () => sprite.setAngle(0),
      });
      return;
    }
    if (kind === 'hint') {
      sprite.setX(x - 10);
      this.tweens.add({ targets: sprite, x, duration: 220, ease: 'Sine.easeOut' });
    }
  }

  private showRow(count: number, motion: boolean) {
    const gap = 8;
    const size = Math.min(72, Math.floor((this.scale.width - gap * (count + 1)) / count));
    const total = count * size + (count - 1) * gap;
    let x = (this.scale.width - total) / 2 + size / 2;
    const y = this.scale.height / 2;
    for (let value = 1; value <= count; value += 1) {
      const sprite = this.sprites.get(value);
      if (!sprite) continue;
      this.placeSprite(sprite, x, y, size);
      if (motion) {
        sprite.setY(y + 20);
        this.tweens.add({
          targets: sprite,
          y: y - 12,
          duration: 200,
          delay: (value - 1) * 70,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => sprite.setY(y),
        });
      }
      x += size + gap;
    }
  }
}
