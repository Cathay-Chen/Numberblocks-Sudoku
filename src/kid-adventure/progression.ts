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
    title: '小草地任务',
    voiceText: '欢迎来到小草地，找到空格里最合适的数字吧。',
  },
  2: {
    title: '泡泡河任务',
    voiceText: '我们到泡泡河啦，慢慢填，别着急。',
  },
  3: {
    title: '彩虹桥任务',
    voiceText: '跨过彩虹桥前，再检查每一行是不是一到四。',
  },
  4: {
    title: '云朵山任务',
    voiceText: '云朵山有点难，先找最明显的空格。',
  },
  5: {
    title: '星光谷任务',
    voiceText: '星光谷在发光，连对几步就能拿到星星。',
  },
  6: {
    title: '终点城堡任务',
    voiceText: '最后一关，勇敢一点，我们要到城堡啦。',
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
