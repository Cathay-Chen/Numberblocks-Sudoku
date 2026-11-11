export const LEARNING_VERSION = 1;

// 看一步的层。0 是没看。1 只指出那一组。2 讲了原因。3 才说出座位。
export const HINT_NONE = 0;
export const HINT_LOOK = 1;
export const HINT_WHY = 2;
export const HINT_FRIEND = 3;

export type HintDepth = typeof HINT_NONE | typeof HINT_LOOK | typeof HINT_WHY | typeof HINT_FRIEND;

export type LearningActivity = {
  hints: number;
  mistakes: number;
  done: boolean;
  // 旧档没有这一层。缺了就不能从次数猜，否则一次「先看」会被写成已经说出座位。
  depth?: HintDepth;
};

export type LearningRecord = {
  v: typeof LEARNING_VERSION;
  activities: Record<string, LearningActivity>;
};

export const isHintDepth = (value: unknown): value is HintDepth =>
  value === HINT_NONE || value === HINT_LOOK || value === HINT_WHY || value === HINT_FRIEND;

const isActivity = (value: unknown): value is LearningActivity => {
  if (!value || typeof value !== 'object') return false;
  const activity = value as Partial<LearningActivity>;
  return (
    typeof activity.hints === 'number' &&
    Number.isFinite(activity.hints) &&
    typeof activity.mistakes === 'number' &&
    Number.isFinite(activity.mistakes) &&
    typeof activity.done === 'boolean'
  );
};

const storedActivity = (activity: LearningActivity): LearningActivity => {
  const stored: LearningActivity = {
    hints: Math.max(0, Math.floor(activity.hints)),
    mistakes: Math.max(0, Math.floor(activity.mistakes)),
    done: activity.done,
  };
  if (isHintDepth(activity.depth)) stored.depth = activity.depth;
  return stored;
};

// 版本对不上就当没有这份记录，调用方仍保留星星。
export const readLearning = (value: unknown): LearningRecord | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { v?: unknown; activities?: unknown };
  if (record.v !== LEARNING_VERSION) return undefined;
  if (!record.activities || typeof record.activities !== 'object' || Array.isArray(record.activities)) {
    return { v: LEARNING_VERSION, activities: {} };
  }
  const activities: Record<string, LearningActivity> = {};
  for (const [id, activity] of Object.entries(record.activities)) {
    if (!isActivity(activity)) continue;
    activities[id] = storedActivity(activity);
  }
  return { v: LEARNING_VERSION, activities };
};

export const recordAttempt = (
  record: LearningRecord | null,
  id: string,
  activity: LearningActivity
): LearningRecord => ({
  v: LEARNING_VERSION,
  activities: {
    ...(record?.activities ?? {}),
    [id]: storedActivity(activity),
  },
});

export const depthAfterStage = (current: HintDepth, stage: 'look' | 'why' | 'friend'): HintDepth => {
  const rank = stage === 'friend' ? HINT_FRIEND : stage === 'why' ? HINT_WHY : HINT_LOOK;
  return current > rank ? current : rank;
};

// 只看那一组时，座位仍是孩子放的。听了原因或说出座位，推理已经由提示做完。
export const isIndependent = (activity: LearningActivity | undefined): boolean => {
  if (!activity?.done) return false;
  if (!isHintDepth(activity.depth)) return activity.hints === HINT_NONE;
  return activity.depth <= HINT_LOOK;
};

export const hintLayerSentence = (activity: LearningActivity): string => {
  if (activity.depth === HINT_NONE) return '没有看提示。';
  if (activity.depth === HINT_LOOK) return '只看了那一组，座位是自己放的。';
  if (activity.depth === HINT_WHY) return '听了原因。';
  if (activity.depth === HINT_FRIEND) return '提示说出了座位。';
  if (activity.hints === HINT_NONE) return '没有看提示。';
  return '看过提示，当时没记下看到第几层。';
};

// 孩子只在自己放出座位时多一句。次数和层数留给家长。
export const kidSoloLine = (depth: HintDepth | null, legacyHints = 0): string | null => {
  if (depth === HINT_NONE || (depth == null && legacyHints === HINT_NONE)) return '你自己找齐了。';
  if (depth === HINT_LOOK) return '座位是你自己放的。';
  return null;
};

export const parentLearningLines = (
  record: LearningRecord | null,
  lessons: { id: string; label: string }[]
): string[] =>
  lessons.map((lesson) => {
    const mark = record?.activities[lesson.id];
    if (!mark?.done) return `${lesson.label}：还没做完。`;
    const own = isIndependent(mark) ? '自己做完。' : '做完了。';
    return `${lesson.label}：${own}${hintLayerSentence(mark)}放重 ${mark.mistakes} 次。`;
  });
