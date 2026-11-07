const DIGITS = [1, 2, 3, 4];

export type WarmupHouse = 'row' | 'box';
export type WarmupStep = 'spot' | 'fill';

export type WarmupStation = {
  id: string;
  house: WarmupHouse;
  prompt: string;
  cells: number[];
  spot: boolean;
};

export const WARMUP_STATIONS: WarmupStation[] = [
  {
    id: 'missing-row',
    house: 'row',
    prompt: '这一行少了谁？',
    cells: [1, 2, 3, 0],
    spot: false,
  },
  {
    id: 'same-row',
    house: 'row',
    prompt: '点一点两个一样的朋友。',
    cells: [1, 2, 2, 4],
    spot: true,
  },
  {
    id: 'missing-box',
    house: 'box',
    prompt: '小宫里少了谁？',
    cells: [1, 2, 3, 0],
    spot: false,
  },
];

export type WarmupFeedback = {
  tone: 'idle' | 'conflict' | 'found' | 'done';
  text: string;
  value: number | null;
};

type Snapshot = {
  step: WarmupStep;
  cells: number[];
  cleared: boolean;
};

export type WarmupPlay = {
  stationIndex: number;
  step: WarmupStep;
  cells: number[];
  highlight: number[];
  past: Snapshot[];
  feedback: WarmupFeedback;
  cleared: boolean;
  finished: boolean;
};

const houseName = (house: WarmupHouse) => (house === 'row' ? '这一行' : '这一小宫');

const isFullSet = (cells: number[]) =>
  DIGITS.every((digit) => cells.filter((value) => value === digit).length === 1);

const idle = (text: string): WarmupFeedback => ({ tone: 'idle', text, value: null });

export const createWarmupPlay = (): WarmupPlay => {
  const station = WARMUP_STATIONS[0];
  return {
    stationIndex: 0,
    step: station.spot ? 'spot' : 'fill',
    cells: station.cells.slice(),
    highlight: [],
    past: [],
    feedback: idle('点下面的积木。'),
    cleared: false,
    finished: false,
  };
};

const remember = (play: WarmupPlay): Snapshot[] => [
  ...play.past,
  { step: play.step, cells: play.cells.slice(), cleared: play.cleared },
];

export const tapWarmupCell = (play: WarmupPlay, index: number): WarmupPlay => {
  if (play.finished || play.cleared || play.step !== 'spot') return play;
  const value = play.cells[index];
  if (!value) return play;
  const matches = play.cells.flatMap((cell, cellIndex) => (cell === value ? [cellIndex] : []));
  if (matches.length < 2) {
    return {
      ...play,
      highlight: [index],
      feedback: { tone: 'conflict', text: '再找两个一样的。', value },
    };
  }

  const cells = play.cells.slice();
  cells[index] = 0;
  return {
    ...play,
    past: remember(play),
    step: 'fill',
    cells,
    highlight: matches.filter((cellIndex) => cellIndex !== index),
    feedback: { tone: 'found', text: `两个 ${value}。空位是谁？`, value },
  };
};

export const placeWarmupFriend = (play: WarmupPlay, value: number): WarmupPlay => {
  if (play.finished || play.cleared) return play;
  const station = WARMUP_STATIONS[play.stationIndex];
  if (play.step === 'spot') return { ...play, feedback: idle(station.prompt) };

  const hole = play.cells.indexOf(0);
  if (hole < 0) return play;
  const existing = play.cells.indexOf(value);
  if (existing >= 0) {
    return {
      ...play,
      highlight: [existing],
      feedback: {
        tone: 'conflict',
        text: `${houseName(station.house)}已经有 ${value}`,
        value,
      },
    };
  }

  const cells = play.cells.slice();
  cells[hole] = value;
  if (!isFullSet(cells)) {
    return {
      ...play,
      past: remember(play),
      cells,
      highlight: [hole],
      feedback: { tone: 'found', text: '再看看还缺谁。', value },
    };
  }
  return {
    ...play,
    past: remember(play),
    cells,
    highlight: cells.map((_, cellIndex) => cellIndex),
    cleared: true,
    feedback: {
      tone: 'done',
      text:
        play.stationIndex === WARMUP_STATIONS.length - 1
          ? '小草地的第一行，也是这样。'
          : '四个朋友都在。',
      value,
    },
  };
};

export const undoWarmup = (play: WarmupPlay): WarmupPlay => {
  const past = play.past.slice();
  const previous = past.pop();
  if (!previous) return play;
  return {
    ...play,
    step: previous.step,
    cells: previous.cells.slice(),
    cleared: previous.cleared,
    past,
    highlight: [],
    finished: false,
    feedback: idle('回到上一步了。'),
  };
};

export const advanceWarmup = (play: WarmupPlay): WarmupPlay => {
  if (!play.cleared || play.finished) return play;
  const stationIndex = play.stationIndex + 1;
  const station = WARMUP_STATIONS[stationIndex];
  if (!station) return { ...play, finished: true };
  return {
    stationIndex,
    step: station.spot ? 'spot' : 'fill',
    cells: station.cells.slice(),
    highlight: [],
    past: [],
    feedback: idle('点下面的积木。'),
    cleared: false,
    finished: false,
  };
};

export const isWarmupGroupComplete = isFullSet;
