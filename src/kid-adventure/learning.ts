export const LEARNING_VERSION = 1;

export type LearningActivity = {
  hints: number;
  mistakes: number;
  done: boolean;
};

export type LearningRecord = {
  v: typeof LEARNING_VERSION;
  activities: Record<string, LearningActivity>;
};

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
    activities[id] = {
      hints: Math.max(0, Math.floor(activity.hints)),
      mistakes: Math.max(0, Math.floor(activity.mistakes)),
      done: activity.done,
    };
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
    [id]: {
      hints: Math.max(0, Math.floor(activity.hints)),
      mistakes: Math.max(0, Math.floor(activity.mistakes)),
      done: activity.done,
    },
  },
});

// 孩子只在没有看提示时多一句。次数留给家长。
export const kidSoloLine = (hints: number): string | null => (hints === 0 ? '你自己找齐了。' : null);

export const parentLearningLines = (
  record: LearningRecord | null,
  lessons: { id: string; label: string }[]
): string[] =>
  lessons.map((lesson) => {
    const mark = record?.activities[lesson.id];
    if (!mark?.done) return `${lesson.label}：还没做完。`;
    const hintNote = mark.hints === 0 ? '这次没有用提示。' : '这次用了提示。';
    return `${lesson.label}：做完了。看一步 ${mark.hints} 次，放重 ${mark.mistakes} 次。${hintNote}`;
  });
