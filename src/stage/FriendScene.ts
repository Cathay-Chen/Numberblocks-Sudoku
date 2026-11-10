import Phaser from 'phaser';
import { lastFriendCue, subscribeFriend, type FriendCue, type StageCell } from './present';

const friendKey = (value: number) => `friend-${value}`;

type Box = { x: number; y: number; w: number; h: number };

const BAND: Record<FriendCue['kind'], number> = {
  idle: 0x94a3b8,
  place: 0x15803d,
  miss: 0xe11d48,
  hint: 0xd97706,
  board: 0x15803d,
};

export class FriendScene extends Phaser.Scene {
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private band: Phaser.GameObjects.Graphics | null = null;
  private bead: Phaser.GameObjects.Arc | null = null;
  private last: FriendCue | null = null;
  private unsubscribe: (() => void) | null = null;
  private restCall: Phaser.Time.TimerEvent | null = null;
  private retryFor = 0;
  private gaveUp = 0;
  private retryTimer = 0;
  private steps: number[] = [];

  constructor() {
    super('friends');
  }

  preload() {
    for (let value = 1; value <= 6; value += 1) {
      this.load.image(friendKey(value), `/character_${String(value).padStart(2, '0')}_1x.png`);
    }
  }

  create() {
    this.band = this.add.graphics().setDepth(0);
    this.bead = this.add.circle(0, 0, 9, 0xd97706).setVisible(false).setDepth(1);
    for (let value = 1; value <= 6; value += 1) {
      if (!this.textures.exists(friendKey(value))) continue;
      const sprite = this.add.image(0, 0, friendKey(value)).setVisible(false).setDepth(2);
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
    } else {
      this.relayout();
    }
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.scale.off('resize', this.relayout, this);
      this.tweens.killAll();
      this.restCall?.remove(false);
      this.restCall = null;
      window.clearTimeout(this.retryTimer);
    });
  }

  update(_time: number, delta: number) {
    if (delta <= 0 || delta > 400) return;
    this.steps.push(Math.round(delta));
    if (this.steps.length > 20) this.steps.shift();
    const host = this.host();
    if (host) host.dataset.stageStep = this.steps.join(',');
  }

  private relayout = () => {
    if (this.tweens.getTweens().some((tween) => tween.isPlaying())) return;
    if (!this.last) {
      this.apply({ id: 0, kind: 'idle', value: null, count: 4, cells: [], focus: null, from: null }, false);
      return;
    }
    this.apply(this.last, false);
  };

  private reduced() {
    return (
      this.registry.get('reducedMotion') === true ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private host() {
    const host = this.registry.get('stageHost');
    return host instanceof HTMLElement ? host : null;
  }

  private root(): ParentNode | null {
    return this.host()?.parentElement ?? null;
  }

  private boxOf(element: Element): Box | null {
    const host = this.host();
    if (!host) return null;
    const outer = host.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    return {
      x: rect.left - outer.left,
      y: rect.top - outer.top,
      w: rect.width,
      h: rect.height,
    };
  }

  private cellBox(cell: StageCell): Box | null {
    const element = this.root()?.querySelector(`[data-cell="${cell.row}-${cell.col}"]`);
    if (!(element instanceof HTMLElement)) return null;
    return this.boxOf(element);
  }

  private mark(cue: FriendCue, drawn: number, motion: boolean) {
    const host = this.host();
    if (!host) return;
    host.dataset.stageCue = cue.kind;
    host.dataset.stageCells = cue.cells.map((cell) => `${cell.row}-${cell.col}`).join(',');
    host.dataset.stageFocus = cue.focus ? `${cue.focus.row}-${cue.focus.col}` : '';
    host.dataset.stageFrom = cue.from ? `${cue.from.row}-${cue.from.col}` : '';
    host.dataset.stageValue = cue.value == null ? '' : String(cue.value);
    host.dataset.stageDrawn = String(drawn);
    host.dataset.stageMotion = motion ? 'move' : 'still';
  }

  private wake() {
    const loop = this.game?.loop;
    if (!loop || loop.running || !loop.raf) return;
    loop.wake();
  }

  private rest(motion: boolean) {
    if (!this.game?.loop?.raf) return;
    this.restCall?.remove(false);
    this.restCall = this.time.delayedCall(motion ? 820 : 40, () => {
      const busy = this.tweens.getTweens().some((tween) => tween.isPlaying());
      if (!busy) this.game.loop.sleep();
    });
  }

  private apply(cue: FriendCue, animate: boolean) {
    if (!this.game?.loop?.raf) return;
    this.wake();
    this.tweens.killAll();
    this.band?.clear();
    this.bead?.setVisible(false);
    this.sprites.forEach((sprite) => {
      sprite.setVisible(false).setAlpha(1).setAngle(0);
    });
    const motion = animate && !this.reduced();
    const drawn = cue.kind === 'board' ? this.showBoard(cue, motion) : this.showCue(cue, motion);
    this.mark(cue, drawn, motion);
    if (drawn === 0 && cue.kind !== 'idle' && cue.id !== this.gaveUp) {
      if (this.retryFor === cue.id) this.gaveUp = cue.id;
      else {
        this.retryFor = cue.id;
        const keepMotion = animate;
        window.clearTimeout(this.retryTimer);
        this.retryTimer = window.setTimeout(() => {
          if (!this.game?.loop?.raf) return;
          if (this.last?.id === cue.id) this.apply(cue, keepMotion);
        }, 48);
      }
    }
    this.rest(motion && drawn > 0);
  }

  private paintBand(boxes: Box[], kind: FriendCue['kind']) {
    const graphics = this.band;
    if (!graphics || boxes.length === 0) return;
    const color = BAND[kind];
    const left = Math.min(...boxes.map((box) => box.x));
    const top = Math.min(...boxes.map((box) => box.y));
    const right = Math.max(...boxes.map((box) => box.x + box.w));
    const bottom = Math.max(...boxes.map((box) => box.y + box.h));
    graphics.fillStyle(color, kind === 'board' ? 0.1 : 0.18);
    graphics.fillRoundedRect(left - 7, top - 7, right - left + 14, bottom - top + 14, 18);
    graphics.lineStyle(7, color, 1);
    graphics.strokeRoundedRect(left - 7, top - 7, right - left + 14, bottom - top + 14, 18);
  }

  private anchor(box: Box) {
    const size = Math.max(44, Math.min(104, Math.min(box.w, box.h) * 0.94));
    return { x: box.x + box.w / 2, y: box.y + box.h / 2, size };
  }

  private placeActor(value: number, at: { x: number; y: number; size: number }) {
    const sprite = value >= 1 && value <= 6 ? this.sprites.get(value) : undefined;
    if (!sprite) return null;
    sprite.setVisible(true).setPosition(at.x, at.y).setDisplaySize(at.size, at.size).setAngle(0);
    this.bead?.setVisible(true).setFillStyle(0xffffff, 0.96).setPosition(at.x, at.y).setRadius(at.size * 0.58);
    return sprite;
  }

  private showCue(cue: FriendCue, motion: boolean) {
    if (cue.kind === 'idle') return 0;
    const boxes = cue.cells
      .map((cell) => this.cellBox(cell))
      .filter((box): box is Box => box !== null);
    this.paintBand(boxes, cue.kind);
    const focusBox = (cue.focus ? this.cellBox(cue.focus) : null) ?? boxes[boxes.length - 1] ?? null;
    const fromBox = (cue.from ? this.cellBox(cue.from) : null) ?? boxes[0] ?? focusBox;
    if (cue.value && focusBox) {
      const end = this.anchor(focusBox);
      const sprite = this.placeActor(cue.value, end);
      if (sprite && motion && fromBox) {
        const start = this.anchor(fromBox);
        sprite.setPosition(start.x, start.y);
        this.tweens.add({
          targets: sprite,
          x: end.x,
          y: cue.kind === 'place' ? end.y - Math.min(12, end.size * 0.2) : end.y,
          duration: cue.kind === 'miss' ? 180 : 280,
          ease: 'Sine.easeOut',
          yoyo: cue.kind === 'place',
          onComplete: () => {
            sprite.setPosition(end.x, end.y);
            if (cue.kind === 'miss') this.shake(sprite);
          },
        });
      } else if (sprite && cue.kind === 'miss' && motion) {
        this.shake(sprite);
      }
    } else if (focusBox || fromBox) {
      const start = fromBox ?? focusBox;
      const end = focusBox ?? fromBox;
      if (start && end && this.bead) {
        this.bead.setFillStyle(BAND[cue.kind], 1).setVisible(true).setRadius(18).setPosition(start.x + start.w / 2, start.y + start.h / 2);
        if (motion && (start !== end || boxes.length > 1)) {
          this.tweens.add({
            targets: this.bead,
            x: end.x + end.w / 2,
            y: end.y + end.h / 2,
            duration: 320,
            ease: 'Sine.easeInOut',
          });
        }
      }
    }
    return boxes.length;
  }

  private shake(sprite: Phaser.GameObjects.Image) {
    this.tweens.add({
      targets: sprite,
      angle: { from: -12, to: 12 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => sprite.setAngle(0),
    });
  }

  private showBoard(cue: FriendCue, motion: boolean) {
    const board = this.root()?.querySelector('[data-board]');
    if (board instanceof HTMLElement) {
      const box = this.boxOf(board);
      if (box) this.paintBand([box], 'board');
    }
    const count = Math.min(6, Math.max(1, cue.count));
    let drawn = 0;
    for (let value = 1; value <= count; value += 1) {
      const slot = this.root()?.querySelector(`[data-cheer="${value}"]`);
      if (!(slot instanceof HTMLElement)) continue;
      const box = this.boxOf(slot);
      if (!box) continue;
      const sprite = this.sprites.get(value);
      if (!sprite) continue;
      const size = Math.min(box.w, box.h);
      sprite.setVisible(true).setPosition(box.x + box.w / 2, box.y + box.h / 2).setDisplaySize(size, size);
      if (motion) {
        sprite.setY(box.y + box.h / 2 + 16);
        this.tweens.add({
          targets: sprite,
          y: box.y + box.h / 2,
          duration: 220,
          delay: (value - 1) * 60,
          ease: 'Quad.easeOut',
        });
      }
      drawn += 1;
    }
    return drawn;
  }
}
