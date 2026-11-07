export const KID_PROGRESS_KEY = 'numberblocks.kid-progress.v1';

export type KidProgress = {
  stars: number;
  levelStars: number[];
};

type ReadonlyStorage = {
  getItem: (key: string) => string | null;
};

type WritableStorage = ReadonlyStorage & {
  setItem: (key: string, value: string) => void;
};

type Story = {
  title: string;
  voiceText: string;
};

const LEVEL_STORIES: Record<number, Story> = {
  1: {
    title: '小草地',
    voiceText: '每一行都要有 1、2、3、4。先找只剩一个空位的行。',
  },
  2: {
    title: '泡泡河',
    voiceText: '这一关的行都还有两个空位。先看只剩一个空位的列。',
  },
  3: {
    title: '彩虹桥',
    voiceText: '粗框里的小宫，也要有 1、2、3、4。',
  },
  4: {
    title: '云朵山',
    voiceText: '填好一个，再找下一个只剩一个空位的地方。',
  },
  5: {
    title: '星光谷',
    voiceText: '行、列、小宫轮流看，新的空位会自己露出来。',
  },
  6: {
    title: '终点城堡',
    voiceText: '自己把四行、四列、四个小宫都补齐。',
  },
};

export const buildLevelStory = (levelId: number): Story =>
  LEVEL_STORIES[levelId] ?? {
    title: '冒险任务',
    voiceText: '准备好开始新的数字冒险了吗？',
  };

export const loadKidProgress = (storage: ReadonlyStorage): KidProgress | null => {
  try {
    const raw = storage.getItem(KID_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KidProgress;
    if (!Array.isArray(parsed.levelStars)) return null;
    if (typeof parsed.stars !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveKidProgress = (storage: WritableStorage, progress: KidProgress) => {
  storage.setItem(KID_PROGRESS_KEY, JSON.stringify(progress));
};
