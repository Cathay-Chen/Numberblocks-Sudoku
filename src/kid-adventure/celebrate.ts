export const shouldCelebrate = (before: boolean, after: boolean): boolean => !before && after;

export type MoveCue = 'place' | 'miss' | 'board';

// 放进去只表示这一步没有撞规则，不是证明它就是最终答案。
export const cueForMove = (input: {
  beforeComplete: boolean;
  afterComplete: boolean;
  tone: string;
}): MoveCue | null => {
  if (!input.beforeComplete && input.afterComplete) return 'board';
  if (input.beforeComplete) return null;
  if (input.tone === 'conflict') return 'miss';
  if (input.tone === 'placed' || input.tone === 'found' || input.tone === 'done') return 'place';
  return null;
};

// 准备活动凑齐一行或一个小宫，仍用放好的轻确认，不用整盘通关。
export const cueForWarmup = (input: {
  beforeComplete: boolean;
  afterComplete: boolean;
  tone: string;
}): MoveCue | null => {
  const cue = cueForMove(input);
  return cue === 'board' ? 'place' : cue;
};
