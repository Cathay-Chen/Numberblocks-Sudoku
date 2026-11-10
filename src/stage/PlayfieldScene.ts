import Phaser from 'phaser';
import { layoutPlayfield, type SeatBox, type TrayBox } from './layout';
import {
  emitPlayAction,
  lastPlayfield,
  publishSeats,
  subscribePlayfield,
  type PlayCell,
  type PlayfieldModel,
} from './playfield';

const friendKey = (value: number) => `friend-${value}`;

type Drag = {
  value: number;
  moved: boolean;
  originX: number;
  originY: number;
};

export class PlayfieldScene extends Phaser.Scene {
  private frames: Phaser.GameObjects.Graphics | null = null;
  private marks: Phaser.GameObjects.Graphics | null = null;
  private seatImages = new Map<string, Phaser.GameObjects.Image>();
  private trayImages = new Map<number, Phaser.GameObjects.Image>();
  private trayLabels = new Map<number, Phaser.GameObjects.Text>();
  private ghost: Phaser.GameObjects.Image | null = null;
  private guide: Phaser.GameObjects.Image | null = null;
  private preview: Phaser.GameObjects.Graphics | null = null;
  private model: PlayfieldModel | null = null;
  private seatBoxes: SeatBox[] = [];
  private trayBoxes: TrayBox[] = [];
  private drag: Drag | null = null;
  private pressed: SeatBox | null = null;
  private armed: number | null = null;
  private stopModel: (() => void) | null = null;
  private restCall: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('playfield');
  }

  preload() {
    for (let value = 1; value <= 6; value += 1) {
      this.load.image(friendKey(value), `/character_${String(value).padStart(2, '0')}_1x.png`);
    }
  }

  create() {
    this.frames = this.add.graphics().setDepth(0);
    this.marks = this.add.graphics().setDepth(3);
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const image = this.add.image(0, 0, friendKey(1)).setVisible(false).setDepth(2);
        this.seatImages.set(`${row}-${col}`, image);
      }
    }
    for (let value = 1; value <= 6; value += 1) {
      const image = this.add.image(0, 0, friendKey(value)).setVisible(false).setDepth(4);
      this.trayImages.set(value, image);
      const label = this.add
        .text(0, 0, String(value), {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '20px',
          color: '#0f172a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 1)
        .setDepth(5)
        .setVisible(false);
      this.trayLabels.set(value, label);
    }
    this.smoothFaces();
    this.ghost = this.add.image(0, 0, friendKey(1)).setVisible(false).setDepth(8);
    this.guide = this.add.image(0, 0, friendKey(1)).setVisible(false).setDepth(5);
    this.preview = this.add.graphics().setDepth(6);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.scale.on('resize', this.relayout, this);
    this.stopModel = subscribePlayfield((model) => {
      if (!this.sys?.isActive()) {
        this.stopModel?.();
        this.stopModel = null;
        return;
      }
      this.model = model;
      this.draw(true);
    });
    const pending = lastPlayfield();
    if (pending) {
      this.model = pending;
      this.draw(false);
    }
    this.events.once('shutdown', () => {
      this.stopModel?.();
      this.stopModel = null;
      this.restCall?.remove(false);
      this.restCall = null;
      try {
        this.input?.off('pointerdown', this.onDown, this);
        this.input?.off('pointermove', this.onMove, this);
        this.input?.off('pointerup', this.onUp, this);
        this.input?.off('pointerupoutside', this.onUp, this);
        this.scale?.off('resize', this.relayout, this);
        this.tweens?.killAll();
      } catch {
        // 拆掉游戏时系统可能已经没了。
      }
    });
  }

  private smoothFaces() {
    for (let value = 1; value <= 6; value += 1) {
      const key = friendKey(value);
      if (!this.textures.exists(key)) continue;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }

  private relayout = () => {
    if (this.drag || this.tweens.getTweens().some((tween) => tween.isPlaying())) return;
    this.draw(false);
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

  private wake() {
    const loop = this.game?.loop;
    if (!loop?.raf || loop.running) return;
    loop.wake();
  }

  private rest() {
    if (!this.game?.loop?.raf || this.drag) return;
    this.restCall?.remove(false);
    this.restCall = this.time.delayedCall(this.reduced() ? 40 : 700, () => {
      if (this.drag) return;
      if (this.tweens.getTweens().some((tween) => tween.isPlaying())) return;
      this.game.loop.sleep();
    });
  }

  private syncScale() {
    const host = this.host();
    if (!host) return false;
    const width = Math.max(64, host.clientWidth);
    const height = Math.max(64, host.clientHeight);
    if (Math.abs(this.scale.width - width) < 2 && Math.abs(this.scale.height - height) < 2) return false;
    this.scale.resize(width, height);
    return true;
  }

  private draw(animate: boolean) {
    const model = this.model;
    if (!model || !this.frames || !this.marks) return;
    if (this.syncScale()) return;
    if (this.reduced()) this.tweens.killAll();
    this.wake();
    const layout = layoutPlayfield(this.scale.width, model);
    this.seatBoxes = layout.seats;
    this.trayBoxes = layout.tray;
    this.frames.clear();
    this.marks.clear();
    this.frames.fillStyle(0xd7f0a8, 1);
    this.frames.fillRoundedRect(0, 0, this.scale.width, this.scale.height, 0);
    this.drawFrames(model, layout.seats);
    this.drawSeats(model, layout.seats, animate);
    this.drawTray(model, layout.tray);
    this.drawGuide(model, layout.seats);
    publishSeats([
      ...layout.seats.map((seat) => ({ key: `${seat.row}-${seat.col}`, x: seat.x, y: seat.y, w: seat.w, h: seat.h })),
      ...layout.tray.map((item) => ({ key: `n-${item.value}`, x: item.x, y: item.y, w: item.w, h: item.h })),
    ]);
    const host = this.host();
    if (host) {
      const cue = model.closed
        ? 'board'
        : model.cells.some((cell) => cell.conflict)
          ? 'miss'
          : model.cells.some((cell) => cell.hint)
            ? 'hint'
            : model.cells.some((cell) => cell.placed)
              ? 'place'
              : 'idle';
      host.dataset.stageCue = cue;
      host.dataset.playfield = model.kind;
      const playing = this.tweens.getTweens().filter((tween) => tween.isPlaying()).length;
      host.dataset.stageMotion = this.reduced() || playing === 0 ? 'still' : 'move';
      host.dataset.tweens = String(this.reduced() ? 0 : playing);
    }
    this.rest();
  }

  private drawFrames(model: PlayfieldModel, seats: SeatBox[]) {
    const graphics = this.frames;
    if (!graphics) return;
    const groups = new Map<string, SeatBox[]>();
    for (const seat of seats) {
      const key =
        model.kind === 'grid'
          ? `${Math.floor(seat.row / model.boxRows)}-${Math.floor(seat.col / model.boxCols)}`
          : 'all';
      const list = groups.get(key) ?? [];
      list.push(seat);
      groups.set(key, list);
    }
    graphics.lineStyle(model.kind === 'grid' ? 4 : 0, 0x0f172a, 1);
    for (const group of groups.values()) {
      const left = Math.min(...group.map((seat) => seat.x)) - 4;
      const top = Math.min(...group.map((seat) => seat.y)) - 4;
      const right = Math.max(...group.map((seat) => seat.x + seat.w)) + 4;
      const bottom = Math.max(...group.map((seat) => seat.y + seat.h)) + 4;
      const cells = group.map((seat) => this.cellAt(model, seat));
      const conflict = cells.length > 0 && cells.every((cell) => cell?.conflict);
      const hint = !conflict && cells.length > 0 && cells.every((cell) => cell?.hint);
      graphics.fillStyle(model.kind === 'grid' && (Math.floor(group[0].row / model.boxRows) + Math.floor(group[0].col / model.boxCols)) % 2 === 1 ? 0xfff6e8 : 0xf8fafc, 1);
      graphics.fillRoundedRect(left, top, right - left, bottom - top, 12);
      if (model.kind === 'grid') graphics.strokeRoundedRect(left, top, right - left, bottom - top, 12);
      if (hint || conflict) {
        this.marks?.lineStyle(6, conflict ? 0xe11d48 : 0xf59e0b, 1);
        this.marks?.strokeRoundedRect(left - 2, top - 2, right - left + 4, bottom - top + 4, 14);
      }
    }
    for (const seat of seats) {
      const cell = this.cellAt(model, seat);
      const selected = cell?.selected;
      graphics.fillStyle(cell?.conflict ? 0xffe4e6 : cell?.hint ? 0xfde68a : cell && cell.value !== 0 ? 0xffffff : 0xfffef8, 1);
      graphics.fillRoundedRect(seat.x, seat.y, seat.w, seat.h, 10);
      graphics.lineStyle(selected ? 4 : cell?.conflict ? 4 : cell?.hint ? 4 : 2, selected ? 0x0369a1 : cell?.conflict ? 0xe11d48 : cell?.hint ? 0xf59e0b : 0xcbd5e1, 1);
      graphics.strokeRoundedRect(seat.x, seat.y, seat.w, seat.h, 10);
    }
  }

  private cellAt(model: PlayfieldModel, seat: SeatBox): PlayCell | undefined {
    return model.cells.find((cell) => cell.row === seat.row && cell.col === seat.col);
  }

  private drawSeats(model: PlayfieldModel, seats: SeatBox[], animate: boolean) {
    this.seatImages.forEach((image) => image.setVisible(false));
    for (const seat of seats) {
      const cell = this.cellAt(model, seat);
      const image = this.seatImages.get(`${seat.row}-${seat.col}`);
      if (!image?.scene || !cell || cell.value < 1 || cell.value > 6) continue;
      if (!this.textures.exists(friendKey(cell.value))) continue;
      image.setTexture(friendKey(cell.value)).setVisible(true);
      image.setDisplaySize(seat.w * 0.88, seat.h * 0.88);
      image.setPosition(seat.x + seat.w / 2, seat.y + seat.h / 2);
      if (animate && !this.reduced() && (cell.placed || (cell.conflict && cell.selected))) {
        if (cell.conflict) {
          this.tweens.add({
            targets: image,
            angle: { from: -10, to: 10 },
            duration: 70,
            yoyo: true,
            repeat: 2,
            onComplete: () => image.setAngle(0),
          });
        } else {
          const restY = image.y;
          image.setY(restY + 8);
          this.tweens.add({
            targets: image,
            y: restY,
            duration: 140,
            ease: 'Quad.easeOut',
            onComplete: () => image.setY(restY),
          });
        }
      }
    }
  }

  private drawTray(model: PlayfieldModel, tray: TrayBox[]) {
    this.trayImages.forEach((image) => image.setVisible(false));
    this.trayLabels.forEach((label) => label.setVisible(false));
    const graphics = this.frames;
    for (const item of tray) {
      graphics?.fillStyle(0xffffff, 1);
      graphics?.fillRoundedRect(item.x, item.y, item.w, item.h, 14);
      graphics?.lineStyle(3, this.armed === item.value ? 0x0369a1 : 0x0f172a, 1);
      graphics?.strokeRoundedRect(item.x, item.y, item.w, item.h, 14);
      const image = this.trayImages.get(item.value);
      const label = this.trayLabels.get(item.value);
      if (!image?.scene || !this.textures.exists(friendKey(item.value))) continue;
      const face = Math.min(item.w - 8, item.h - 26);
      image.setTexture(friendKey(item.value)).setVisible(true).setAlpha(model.closed ? 0.55 : 1);
      image.setDisplaySize(face, face);
      image.setPosition(item.x + item.w / 2, item.y + 4 + face / 2);
      label?.setVisible(true).setText(String(item.value)).setPosition(item.x + item.w / 2, item.y + item.h - 3);
    }
  }

  private drawGuide(model: PlayfieldModel, seats: SeatBox[]) {
    const guide = this.guide;
    if (!guide) return;
    const seat = seats.find((item) => item.row === model.guideAt?.row && item.col === model.guideAt?.col);
    const cell = seat ? this.cellAt(model, seat) : undefined;
    if (!model.guideValue || !seat || !cell || cell.value !== 0 || model.guideValue < 1 || model.guideValue > 6) {
      guide.setVisible(false);
      return;
    }
    guide.setTexture(friendKey(model.guideValue)).setVisible(true);
    guide.setDisplaySize(seat.w * 0.78, seat.h * 0.78);
    guide.setPosition(seat.x + seat.w / 2, seat.y + seat.h / 2);
    guide.setAlpha(0.95);
  }

  private pointSeat(x: number, y: number) {
    return this.seatBoxes.find((seat) => x >= seat.x && x <= seat.x + seat.w && y >= seat.y && y <= seat.y + seat.h) ?? null;
  }

  private pointTray(x: number, y: number) {
    return this.trayBoxes.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) ?? null;
  }

  private onDown(pointer: Phaser.Input.Pointer) {
    if (!this.model || this.model.closed || this.drag) return;
    this.wake();
    const tray = this.pointTray(pointer.x, pointer.y);
    if (tray) {
      this.pressed = null;
      this.drag = {
        value: tray.value,
        moved: false,
        originX: tray.x + tray.w / 2,
        originY: tray.y + tray.h / 2,
      };
      this.ghost?.setTexture(friendKey(tray.value)).setVisible(true).setPosition(pointer.x, pointer.y);
      this.ghost?.setDisplaySize(tray.w * 0.9, tray.h * 0.9);
      this.trayImages.get(tray.value)?.setAlpha(0.35);
      return;
    }
    this.pressed = this.pointSeat(pointer.x, pointer.y);
  }

  private onMove(pointer: Phaser.Input.Pointer) {
    if (!this.drag || !pointer.isDown) return;
    if (Math.abs(pointer.x - this.drag.originX) > 6 || Math.abs(pointer.y - this.drag.originY) > 6) this.drag.moved = true;
    this.ghost?.setPosition(pointer.x, pointer.y);
    this.previewSeat(this.pointSeat(pointer.x, pointer.y));
  }

  private previewSeat(seat: SeatBox | null) {
    this.preview?.clear();
    if (!seat) return;
    this.preview?.lineStyle(4, 0x0284c7, 1);
    this.preview?.strokeRoundedRect(seat.x - 3, seat.y - 3, seat.w + 6, seat.h + 6, 12);
  }

  private onUp(pointer: Phaser.Input.Pointer) {
    if (!this.model) return;
    const model = this.model;
    const drag = this.drag;
    const pressed = this.pressed;
    this.drag = null;
    this.pressed = null;
    this.preview?.clear();
    if (drag) {
      const seat = this.pointSeat(pointer.x, pointer.y);
      const cell = seat ? this.cellAt(model, seat) : undefined;
      const finish = () => {
        this.ghost?.setVisible(false);
        this.trayImages.get(drag.value)?.setAlpha(model.closed ? 0.55 : 1);
        this.draw(false);
      };
      if (!drag.moved) {
        const selected = model.cells.find((item) => item.selected && !item.given);
        this.ghost?.setVisible(false);
        this.trayImages.get(drag.value)?.setAlpha(1);
        if (selected) emitPlayAction({ type: 'place', row: selected.row, col: selected.col, value: drag.value });
        else {
          this.armed = this.armed === drag.value ? null : drag.value;
          this.draw(false);
        }
        return;
      }
      if (seat && cell && model.kind !== 'grid' && cell.value !== 0) {
        emitPlayAction({ type: 'cell', row: seat.row, col: seat.col });
        this.returnGhost(drag, finish);
        return;
      }
      if (seat && cell && !cell.given && (model.kind === 'grid' || cell.value === 0)) {
        this.ghost?.setVisible(false);
        this.trayImages.get(drag.value)?.setAlpha(1);
        this.armed = null;
        emitPlayAction({ type: 'place', row: seat.row, col: seat.col, value: drag.value });
        return;
      }
      this.returnGhost(drag, finish);
      return;
    }
    if (!pressed) return;
    emitPlayAction({ type: 'cell', row: pressed.row, col: pressed.col });
    const cell = this.cellAt(model, pressed);
    if (this.armed != null && cell && !cell.given && (model.kind === 'grid' || cell.value === 0)) {
      const value = this.armed;
      this.armed = null;
      emitPlayAction({ type: 'place', row: pressed.row, col: pressed.col, value });
    }
  }

  private returnGhost(drag: Drag, done: () => void) {
    if (!this.ghost || this.reduced()) {
      done();
      return;
    }
    this.tweens.add({
      targets: this.ghost,
      x: drag.originX,
      y: drag.originY,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: done,
    });
  }

}
