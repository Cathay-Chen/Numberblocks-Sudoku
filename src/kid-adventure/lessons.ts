import { KID_LEVELS } from './engine';
import { parentLearningLines, type LearningRecord } from './learning';

export type SeatLessonKind = 'demo' | 'practice' | 'review';

export type SeatLesson = {
  id: string;
  kind: SeatLessonKind;
  voiceText: string;
  parentLabel: string;
  puzzle: number[][];
  solution: number[][];
};

export const DEMO_ID = 'seat-demo';
export const PRACTICE_ID = 'seat-practice';
export const REVIEW_IDS = ['review-row', 'review-col', 'review-seat', 'review-mix'] as const;
export const SIX_DEMO_ID = 'six-demo';
export const SIX_PRACTICE_ID = 'six-practice';
const OLD_METHOD_REVIEWS = ['review-row', 'review-col'] as const;
const NEW_METHOD_REVIEWS = ['review-seat', 'review-mix'] as const;

// 终盘都避开了前六关。步数见 learning-roadmap，不按空格数排序。
export const SEAT_LESSONS: SeatLesson[] = [
  {
    id: DEMO_ID,
    kind: 'demo',
    voiceText: '有个朋友只剩一个座位。',
    parentLabel: '新方法示范',
    puzzle: [
      [0, 0, 3, 4],
      [0, 0, 2, 1],
      [2, 1, 4, 3],
      [3, 4, 1, 2],
    ],
    solution: [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [2, 1, 4, 3],
      [3, 4, 1, 2],
    ],
  },
  {
    id: PRACTICE_ID,
    kind: 'practice',
    voiceText: '自己找只剩一个座位的朋友。',
    parentLabel: '自己练',
    puzzle: [
      [0, 0, 3, 4],
      [4, 3, 2, 1],
      [0, 0, 1, 3],
      [0, 0, 4, 2],
    ],
    solution: [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [2, 4, 1, 3],
      [3, 1, 4, 2],
    ],
  },
  {
    id: 'review-row',
    kind: 'review',
    voiceText: '先找只剩一个空位的一行。',
    parentLabel: '复习：行',
    puzzle: [
      [0, 0, 0, 4],
      [0, 3, 1, 2],
      [3, 4, 2, 1],
      [2, 1, 4, 3],
    ],
    solution: [
      [1, 2, 3, 4],
      [4, 3, 1, 2],
      [3, 4, 2, 1],
      [2, 1, 4, 3],
    ],
  },
  {
    id: 'review-col',
    kind: 'review',
    voiceText: '这一次先看列。',
    parentLabel: '复习：列',
    puzzle: [
      [0, 0, 0, 0],
      [3, 4, 2, 1],
      [4, 3, 1, 2],
      [2, 1, 4, 3],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 2, 1],
      [4, 3, 1, 2],
      [2, 1, 4, 3],
    ],
  },
  {
    id: 'review-seat',
    kind: 'review',
    voiceText: '再找只剩一个座位的朋友。',
    parentLabel: '复习：座位',
    puzzle: [
      [1, 2, 3, 4],
      [0, 0, 2, 1],
      [0, 0, 4, 3],
      [4, 3, 1, 2],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 2, 1],
      [2, 1, 4, 3],
      [4, 3, 1, 2],
    ],
  },
  {
    id: 'review-mix',
    kind: 'review',
    voiceText: '两种方法都可以用。',
    parentLabel: '复习：两种方法',
    puzzle: [
      [0, 0, 0, 4],
      [0, 0, 1, 2],
      [2, 1, 4, 3],
      [3, 4, 2, 1],
    ],
    solution: [
      [1, 2, 3, 4],
      [4, 3, 1, 2],
      [2, 1, 4, 3],
      [3, 4, 2, 1],
    ],
  },
];

// 步数按方法，不按空格。示范 4 步全是旧方法，第一步必须落在 2×3 宫。自己练先用新方法，挡住的是宫。
export const SIX_LESSONS: SeatLesson[] = [
  {
    id: SIX_DEMO_ID,
    kind: 'demo',
    voiceText: '这一小宫是两行、三列。',
    parentLabel: '6×6 小宫',
    puzzle: [
      [0, 2, 3, 0, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [0, 3, 1, 0, 6, 4],
      [5, 6, 4, 2, 3, 1],
      [3, 1, 2, 6, 4, 5],
      [6, 4, 5, 3, 1, 2],
    ],
    solution: [
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [2, 3, 1, 5, 6, 4],
      [5, 6, 4, 2, 3, 1],
      [3, 1, 2, 6, 4, 5],
      [6, 4, 5, 3, 1, 2],
    ],
  },
  {
    id: SIX_PRACTICE_ID,
    kind: 'practice',
    voiceText: '两种方法都可以用。',
    parentLabel: '6×6 自己练',
    puzzle: [
      [0, 2, 3, 0, 5, 6],
      [5, 0, 4, 0, 2, 3],
      [2, 3, 1, 6, 4, 5],
      [6, 4, 5, 2, 3, 1],
      [3, 1, 2, 5, 6, 4],
      [0, 0, 6, 3, 1, 2],
    ],
    solution: [
      [1, 2, 3, 4, 5, 6],
      [5, 6, 4, 1, 2, 3],
      [2, 3, 1, 6, 4, 5],
      [6, 4, 5, 2, 3, 1],
      [3, 1, 2, 5, 6, 4],
      [4, 5, 6, 3, 1, 2],
    ],
  },
];

const ALL_LESSONS = [...SEAT_LESSONS, ...SIX_LESSONS];

export const lessonById = (id: string): SeatLesson | null =>
  ALL_LESSONS.find((lesson) => lesson.id === id) ?? null;

const markOf = (learning: LearningRecord | null, id: string) => learning?.activities[id];

// 独立完成看最近一次：done 且看一步是 0。放重只给家长看，不挡进入。
export const sixReady = (learning: LearningRecord | null): boolean => {
  if (!markOf(learning, DEMO_ID)?.done) return false;
  const practice = markOf(learning, PRACTICE_ID);
  if (!practice?.done || practice.hints !== 0) return false;
  if (!REVIEW_IDS.every((id) => markOf(learning, id)?.done)) return false;
  const oldMethod = OLD_METHOD_REVIEWS.some((id) => markOf(learning, id)?.hints === 0);
  const newMethod = NEW_METHOD_REVIEWS.some((id) => markOf(learning, id)?.hints === 0);
  return oldMethod && newMethod;
};

export const sixGateVisible = (learning: LearningRecord | null): boolean =>
  Boolean(markOf(learning, PRACTICE_ID)?.done) ||
  REVIEW_IDS.some((id) => markOf(learning, id)) ||
  Boolean(markOf(learning, SIX_DEMO_ID) || markOf(learning, SIX_PRACTICE_ID));

export const sixGateLines = (learning: LearningRecord | null): string[] => {
  if (!sixGateVisible(learning)) return [];
  if (sixReady(learning)) return ['六个朋友的小宫可以玩了。放重不挡路。'];
  const lines: string[] = [];
  if (!markOf(learning, DEMO_ID)?.done) lines.push('新方法示范还没做完。');
  const practice = markOf(learning, PRACTICE_ID);
  if (!practice?.done) lines.push('自己练还没做完。');
  else if (practice.hints > 0) lines.push('自己练这回看了提示。不看提示再做完，才算独立。');
  if (!markOf(learning, 'review-row')?.done) lines.push('复习：行还没做完。');
  if (!markOf(learning, 'review-col')?.done) lines.push('复习：列还没做完。');
  if (!markOf(learning, 'review-seat')?.done) lines.push('复习：座位还没做完。');
  if (!markOf(learning, 'review-mix')?.done) lines.push('复习：两种方法还没做完。');
  const reviewsDone = REVIEW_IDS.every((id) => markOf(learning, id)?.done);
  if (reviewsDone && !OLD_METHOD_REVIEWS.some((id) => markOf(learning, id)?.hints === 0)) {
    lines.push('行和列的复习都看了提示。有一题不看提示做完，才算会旧方法。');
  }
  if (reviewsDone && !NEW_METHOD_REVIEWS.some((id) => markOf(learning, id)?.hints === 0)) {
    lines.push('座位和两种方法的复习都看了提示。有一题不看提示做完，才算会新方法。');
  }
  lines.push('放重几次都不挡路。不看年龄，也不看快慢。');
  return lines;
};

export const sixEntry = (learning: LearningRecord | null): { id: string; label: string } | null => {
  if (!sixReady(learning)) return null;
  if (!markOf(learning, SIX_DEMO_ID)?.done) return { id: SIX_DEMO_ID, label: '看六个朋友' };
  if (!markOf(learning, SIX_PRACTICE_ID)?.done) return { id: SIX_PRACTICE_ID, label: '自己练六个' };
  return { id: SIX_DEMO_ID, label: '再看六个朋友' };
};

export const demoIdFor = (lessonId: string): string =>
  lessonId === SIX_DEMO_ID || lessonId === SIX_PRACTICE_ID ? SIX_DEMO_ID : DEMO_ID;

export const pathIsClear = (levelStars: number[]): boolean =>
  KID_LEVELS.every((_, index) => (levelStars[index] ?? 0) > 0);

export const continuation = (learning: LearningRecord | null): { id: string; label: string } => {
  if (!learning?.activities[DEMO_ID]?.done) return { id: DEMO_ID, label: '学新方法' };
  if (!learning?.activities[PRACTICE_ID]?.done) return { id: PRACTICE_ID, label: '自己练' };
  if (sixReady(learning)) {
    if (!learning?.activities[SIX_DEMO_ID]?.done) return { id: SIX_DEMO_ID, label: '看六个朋友' };
    if (!learning?.activities[SIX_PRACTICE_ID]?.done) return { id: SIX_PRACTICE_ID, label: '自己练六个' };
  }
  const next = REVIEW_IDS.find((id) => !learning.activities[id]?.done) ?? REVIEW_IDS[0];
  return { id: next, label: '再练一题' };
};

export const nextLessonStep = (id: string): { id: string; label: string } => {
  if (id === DEMO_ID) return { id: PRACTICE_ID, label: '自己练' };
  if (id === PRACTICE_ID) return { id: REVIEW_IDS[0], label: '再练一题' };
  if (id === SIX_DEMO_ID) return { id: SIX_PRACTICE_ID, label: '自己练' };
  if (id === SIX_PRACTICE_ID) return { id: SIX_DEMO_ID, label: '再看这一宫' };
  const index = REVIEW_IDS.indexOf(id as (typeof REVIEW_IDS)[number]);
  const next = REVIEW_IDS[(index + 1 + REVIEW_IDS.length) % REVIEW_IDS.length];
  return { id: next, label: '再练一题' };
};

export const lessonParentLines = (record: LearningRecord | null): string[] => {
  const lessons = sixReady(record) || markOf(record, SIX_DEMO_ID) || markOf(record, SIX_PRACTICE_ID)
    ? ALL_LESSONS
    : SEAT_LESSONS;
  return parentLearningLines(
    record,
    lessons.map((lesson) => ({ id: lesson.id, label: lesson.parentLabel }))
  );
};
