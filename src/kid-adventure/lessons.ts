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

export const lessonById = (id: string): SeatLesson | null =>
  SEAT_LESSONS.find((lesson) => lesson.id === id) ?? null;

export const pathIsClear = (levelStars: number[]): boolean =>
  KID_LEVELS.every((_, index) => (levelStars[index] ?? 0) > 0);

export const continuation = (learning: LearningRecord | null): { id: string; label: string } => {
  if (!learning?.activities[DEMO_ID]?.done) return { id: DEMO_ID, label: '学新方法' };
  if (!learning?.activities[PRACTICE_ID]?.done) return { id: PRACTICE_ID, label: '自己练' };
  const next = REVIEW_IDS.find((id) => !learning.activities[id]?.done) ?? REVIEW_IDS[0];
  return { id: next, label: '再练一题' };
};

export const nextLessonStep = (id: string): { id: string; label: string } => {
  if (id === DEMO_ID) return { id: PRACTICE_ID, label: '自己练' };
  if (id === PRACTICE_ID) return { id: REVIEW_IDS[0], label: '再练一题' };
  const index = REVIEW_IDS.indexOf(id as (typeof REVIEW_IDS)[number]);
  const next = REVIEW_IDS[(index + 1 + REVIEW_IDS.length) % REVIEW_IDS.length];
  return { id: next, label: '再练一题' };
};

export const lessonParentLines = (record: LearningRecord | null): string[] =>
  parentLearningLines(
    record,
    SEAT_LESSONS.map((lesson) => ({ id: lesson.id, label: lesson.parentLabel }))
  );
