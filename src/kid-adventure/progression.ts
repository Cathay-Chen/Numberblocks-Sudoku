import { readLearning, type LearningRecord } from './learning';

export const KID_PROGRESS_KEY = 'numberblocks.kid-progress.v1';
export const KID_PROGRESS_BACKUP_KEY = 'numberblocks.kid-progress.v1.bak';

export type KidProgress = {
  stars: number;
  levelStars: number[];
  warmupDone?: boolean;
  learning?: LearningRecord;
};

type ReadonlyStorage = {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
};

type WritableStorage = ReadonlyStorage & {
  setItem: (key: string, value: string) => void;
};

const backupUnreadable = (storage: ReadonlyStorage, raw: string) => {
  if (!storage.setItem || storage.getItem(KID_PROGRESS_BACKUP_KEY)) return;
  storage.setItem(KID_PROGRESS_BACKUP_KEY, raw);
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
    let parsed: Partial<KidProgress> & { learning?: unknown };
    try {
      parsed = JSON.parse(raw) as Partial<KidProgress>;
    } catch {
      backupUnreadable(storage, raw);
      return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      backupUnreadable(storage, raw);
      return null;
    }
    if (!Array.isArray(parsed.levelStars) || !parsed.levelStars.every((item) => typeof item === 'number' && Number.isFinite(item))) {
      backupUnreadable(storage, raw);
      return null;
    }
    if (typeof parsed.stars !== 'number' || !Number.isFinite(parsed.stars)) {
      backupUnreadable(storage, raw);
      return null;
    }
    const progress: KidProgress = {
      stars: parsed.stars,
      levelStars: parsed.levelStars,
    };
    if (parsed.warmupDone === true || parsed.warmupDone === false) {
      progress.warmupDone = parsed.warmupDone;
    }
    const learning = readLearning(parsed.learning);
    if (learning) progress.learning = learning;
    return progress;
  } catch {
    return null;
  }
};

// 读得出的档可以覆盖。空键也可以新建。读不出时留下原文，避免写成 0 星。
export const progressCanBeReplaced = (storage: ReadonlyStorage): boolean => {
  const raw = storage.getItem(KID_PROGRESS_KEY);
  if (!raw) return true;
  return loadKidProgress(storage) !== null;
};

export const saveKidProgress = (storage: WritableStorage, progress: KidProgress) => {
  let carried: unknown;
  try {
    const existingRaw = storage.getItem(KID_PROGRESS_KEY);
    if (existingRaw && !progress.learning) {
      const existing = JSON.parse(existingRaw) as { learning?: { v?: unknown } };
      if (existing?.learning && typeof existing.learning === 'object' && existing.learning.v !== 1) {
        carried = existing.learning;
      }
    }
  } catch {
    carried = undefined;
  }
  const stored: Record<string, unknown> = {
    stars: progress.stars,
    levelStars: progress.levelStars,
  };
  if (typeof progress.warmupDone === 'boolean') stored.warmupDone = progress.warmupDone;
  if (progress.learning) stored.learning = progress.learning;
  else if (carried !== undefined) stored.learning = carried;
  storage.setItem(KID_PROGRESS_KEY, JSON.stringify(stored));
};

// 旧存档没有这个字段。有星星说明已经玩过棋盘，不再强制重看准备；星星本身不改。
export const resolveWarmupDone = (progress: KidProgress): boolean => {
  if (progress.warmupDone === true) return true;
  if (progress.warmupDone === false) return false;
  if (progress.stars > 0) return true;
  return progress.levelStars.some((stars) => stars > 0);
};
