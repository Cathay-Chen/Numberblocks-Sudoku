import { KID_LEVELS } from './engine';
import {
  HINT_FRIEND,
  HINT_WHY,
  isIndependent,
  parentLearningLines,
  type LearningActivity,
  type LearningRecord,
} from './learning';

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
export const SIX_LINE_ID = 'six-line';
export const SIX_PRACTICE_ID = 'six-practice';
export const SIX_AGAIN_ID = 'six-again';
export const SIX_REVIEW_IDS = ['six-review-old', 'six-review-seat', 'six-review-mix'] as const;
const SIX_TEACHING = [SIX_DEMO_ID, SIX_LINE_ID, SIX_PRACTICE_ID, SIX_AGAIN_ID] as const;

export const sixTrack = (): { id: string; group: 'teach' | 'review' }[] => [
  ...SIX_TEACHING.map((id) => ({ id, group: 'teach' as const })),
  ...SIX_REVIEW_IDS.map((id) => ({ id, group: 'review' as const })),
];
const OLD_SIX = [SIX_DEMO_ID, SIX_LINE_ID, SIX_REVIEW_IDS[0]] as const;
const NEW_SIX = [SIX_PRACTICE_ID, SIX_AGAIN_ID, SIX_REVIEW_IDS[1], SIX_REVIEW_IDS[2]] as const;
const OLD_METHOD_REVIEWS = ['review-row', 'review-col'] as const;
const NEW_METHOD_REVIEWS = ['review-seat', 'review-mix'] as const;
const SIX_STEP_LABEL: Record<(typeof SIX_TEACHING)[number], string> = {
  [SIX_DEMO_ID]: '看六个朋友',
  [SIX_LINE_ID]: '看这一行',
  [SIX_PRACTICE_ID]: '自己练',
  [SIX_AGAIN_ID]: '再找座位',
};

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

// 步数按方法，不按空格。前两题都是 4 步旧方法，差别是第一步落在宫还是行。自己练用一次新方法。两个座位用两次，中间回到旧方法。
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
    id: SIX_LINE_ID,
    kind: 'practice',
    voiceText: '先找只剩一个空位的一行。',
    parentLabel: '6×6 看行',
    puzzle: [
      [1, 6, 5, 4, 2, 0],
      [2, 3, 4, 0, 5, 1],
      [3, 4, 1, 2, 6, 5],
      [5, 2, 0, 1, 3, 0],
      [4, 5, 2, 3, 1, 6],
      [6, 1, 3, 5, 4, 2],
    ],
    solution: [
      [1, 6, 5, 4, 2, 3],
      [2, 3, 4, 6, 5, 1],
      [3, 4, 1, 2, 6, 5],
      [5, 2, 6, 1, 3, 4],
      [4, 5, 2, 3, 1, 6],
      [6, 1, 3, 5, 4, 2],
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
  {
    id: SIX_AGAIN_ID,
    kind: 'practice',
    voiceText: '这一题要找两次只剩一个座位。',
    parentLabel: '6×6 两个座位',
    puzzle: [
      [0, 0, 6, 5, 0, 4],
      [0, 0, 4, 1, 0, 2],
      [6, 2, 1, 3, 4, 5],
      [4, 3, 5, 6, 2, 1],
      [5, 6, 2, 4, 1, 3],
      [1, 4, 3, 2, 5, 6],
    ],
    solution: [
      [2, 1, 6, 5, 3, 4],
      [3, 5, 4, 1, 6, 2],
      [6, 2, 1, 3, 4, 5],
      [4, 3, 5, 6, 2, 1],
      [5, 6, 2, 4, 1, 3],
      [1, 4, 3, 2, 5, 6],
    ],
  },
  {
    id: SIX_REVIEW_IDS[0],
    kind: 'review',
    voiceText: '再找只剩一个空位的一组。',
    parentLabel: '6×6 复习空位',
    puzzle: [
      [4, 1, 6, 5, 2, 3],
      [2, 3, 5, 6, 1, 4],
      [5, 2, 3, 0, 4, 0],
      [1, 6, 4, 2, 3, 5],
      [3, 5, 1, 4, 6, 2],
      [0, 4, 0, 3, 5, 1],
    ],
    solution: [
      [4, 1, 6, 5, 2, 3],
      [2, 3, 5, 6, 1, 4],
      [5, 2, 3, 1, 4, 6],
      [1, 6, 4, 2, 3, 5],
      [3, 5, 1, 4, 6, 2],
      [6, 4, 2, 3, 5, 1],
    ],
  },
  {
    id: SIX_REVIEW_IDS[1],
    kind: 'review',
    voiceText: '再找只剩一个座位的朋友。',
    parentLabel: '6×6 复习座位',
    puzzle: [
      [0, 0, 6, 2, 5, 3],
      [0, 0, 5, 6, 1, 4],
      [1, 2, 3, 4, 6, 5],
      [5, 6, 4, 3, 2, 1],
      [3, 5, 2, 1, 4, 6],
      [6, 4, 1, 5, 3, 2],
    ],
    solution: [
      [4, 1, 6, 2, 5, 3],
      [2, 3, 5, 6, 1, 4],
      [1, 2, 3, 4, 6, 5],
      [5, 6, 4, 3, 2, 1],
      [3, 5, 2, 1, 4, 6],
      [6, 4, 1, 5, 3, 2],
    ],
  },
  {
    id: SIX_REVIEW_IDS[2],
    kind: 'review',
    voiceText: '先补空位，再找座位。',
    parentLabel: '6×6 复习两种',
    puzzle: [
      [0, 3, 2, 6, 5, 0],
      [0, 5, 6, 1, 2, 0],
      [0, 4, 3, 5, 1, 0],
      [5, 2, 1, 4, 3, 6],
      [3, 1, 4, 2, 6, 5],
      [2, 6, 5, 3, 4, 1],
    ],
    solution: [
      [1, 3, 2, 6, 5, 4],
      [4, 5, 6, 1, 2, 3],
      [6, 4, 3, 5, 1, 2],
      [5, 2, 1, 4, 3, 6],
      [3, 1, 4, 2, 6, 5],
      [2, 6, 5, 3, 4, 1],
    ],
  },
];

const ALL_LESSONS = [...SEAT_LESSONS, ...SIX_LESSONS];

export const lessonById = (id: string): SeatLesson | null =>
  ALL_LESSONS.find((lesson) => lesson.id === id) ?? null;

const markOf = (learning: LearningRecord | null, id: string) => learning?.activities[id];

const methodOpen = (learning: LearningRecord | null, ids: readonly string[]) =>
  ids.some((id) => isIndependent(markOf(learning, id)));

// 独立完成看最近一次有没有自己放出座位。放重只给家长看，不挡进入。旧档没有层数时，仍按「次数是 0」算。
export const sixReady = (learning: LearningRecord | null): boolean => {
  if (!markOf(learning, DEMO_ID)?.done) return false;
  if (!isIndependent(markOf(learning, PRACTICE_ID))) return false;
  if (!REVIEW_IDS.every((id) => markOf(learning, id)?.done)) return false;
  return methodOpen(learning, OLD_METHOD_REVIEWS) && methodOpen(learning, NEW_METHOD_REVIEWS);
};

export const sixSegmentReady = (learning: LearningRecord | null): boolean =>
  SIX_TEACHING.every((id) => markOf(learning, id)?.done) &&
  methodOpen(learning, OLD_SIX) &&
  methodOpen(learning, NEW_SIX);

export const sixGateVisible = (learning: LearningRecord | null): boolean =>
  Boolean(markOf(learning, PRACTICE_ID)?.done) ||
  REVIEW_IDS.some((id) => markOf(learning, id)) ||
  SIX_LESSONS.some((lesson) => markOf(learning, lesson.id));

const reliedLine = (label: string, activity: LearningActivity): string => {
  if (activity.depth === HINT_WHY) return `${label}这回听了原因。再做一次，只看那一组或不看提示，才算独立。`;
  if (activity.depth === HINT_FRIEND) return `${label}这回被说出了座位。再做一次，座位要自己放。`;
  return `${label}这回看过提示，当时没记下是哪一层。再做一次，只看那一组或不看提示，才算独立。`;
};

export const sixGateLines = (learning: LearningRecord | null): string[] => {
  if (!sixGateVisible(learning)) return [];
  if (sixReady(learning)) {
    const reviewsDone = SIX_REVIEW_IDS.every((id) => markOf(learning, id)?.done);
    if (sixSegmentReady(learning) && reviewsDone) {
      return ['六个朋友这一段，空位和座位都有一次是自己放完的。放重不挡路。'];
    }
    if (!SIX_LESSONS.some((lesson) => markOf(learning, lesson.id))) {
      return ['六个朋友的小宫可以玩了。放重不挡路。'];
    }
    return [];
  }
  const lines: string[] = [];
  if (!markOf(learning, DEMO_ID)?.done) lines.push('新方法示范还没做完。');
  const practice = markOf(learning, PRACTICE_ID);
  if (!practice?.done) lines.push('自己练还没做完。');
  else if (!isIndependent(practice)) lines.push(reliedLine('自己练', practice));
  if (!markOf(learning, 'review-row')?.done) lines.push('复习：行还没做完。');
  if (!markOf(learning, 'review-col')?.done) lines.push('复习：列还没做完。');
  if (!markOf(learning, 'review-seat')?.done) lines.push('复习：座位还没做完。');
  if (!markOf(learning, 'review-mix')?.done) lines.push('复习：两种方法还没做完。');
  const reviewsDone = REVIEW_IDS.every((id) => markOf(learning, id)?.done);
  if (reviewsDone && !methodOpen(learning, OLD_METHOD_REVIEWS)) {
    lines.push('行和列的复习都还没有一次自己放上。只看那一组，或不看提示，才算会旧方法。');
  }
  if (reviewsDone && !methodOpen(learning, NEW_METHOD_REVIEWS)) {
    lines.push('座位和两种方法的复习都还没有一次自己放上。听了原因或被说出座位，都不算会新方法。');
  }
  lines.push('放重几次都不挡路。不看年龄，也不看快慢。');
  return lines;
};

const SIX_BLURB: Record<string, string> = {
  [SIX_DEMO_ID]: '先看两行三列的小宫，这一题只用空位。',
  [SIX_LINE_ID]: '这一题只找只剩一个空位的一行。',
  [SIX_PRACTICE_ID]: '这一题先找只剩一个座位的朋友。',
  [SIX_AGAIN_ID]: '这一题要找两次座位，中间会回到空位。',
  [SIX_REVIEW_IDS[0]]: '复习先看列，只用空位。',
  [SIX_REVIEW_IDS[1]]: '复习要找只剩一个座位的朋友。',
  [SIX_REVIEW_IDS[2]]: '复习先补空位，中途要找座位。',
};

export const sixCourse = (learning: LearningRecord | null): { id: string; label: string } | null => {
  if (!sixReady(learning)) return null;
  const teaching = SIX_TEACHING.find((id) => !markOf(learning, id)?.done);
  if (teaching === SIX_DEMO_ID) return { id: teaching, label: '看六个朋友' };
  if (teaching === SIX_PRACTICE_ID) return { id: teaching, label: '自己练六个' };
  if (teaching) return { id: teaching, label: SIX_STEP_LABEL[teaching] };
  const review = SIX_REVIEW_IDS.find((id) => !markOf(learning, id)?.done) ?? SIX_REVIEW_IDS[0];
  return { id: review, label: '再练一题' };
};

export const sixEntry = (learning: LearningRecord | null): { id: string; label: string } | null => sixCourse(learning);

export const demoIdFor = (lessonId: string): string =>
  SIX_LESSONS.some((lesson) => lesson.id === lessonId) ? SIX_DEMO_ID : DEMO_ID;

export const pathIsClear = (levelStars: number[]): boolean =>
  KID_LEVELS.every((_, index) => (levelStars[index] ?? 0) > 0);

export const continuation = (learning: LearningRecord | null): { id: string; label: string } => {
  if (!learning?.activities[DEMO_ID]?.done) return { id: DEMO_ID, label: '学新方法' };
  if (!learning?.activities[PRACTICE_ID]?.done) return { id: PRACTICE_ID, label: '自己练' };
  const course = sixCourse(learning);
  if (course) return course;
  const next = REVIEW_IDS.find((id) => !learning.activities[id]?.done) ?? REVIEW_IDS[0];
  return { id: next, label: '再练一题' };
};

const sixNextNote = (learning: LearningRecord | null): string => {
  if (!sixReady(learning)) return '';
  const pending = [...SIX_TEACHING, ...SIX_REVIEW_IDS].find((id) => !markOf(learning, id)?.done);
  if (pending) return SIX_BLURB[pending] ?? '';
  if (!sixSegmentReady(learning)) return '再练时试着不听原因，也不看座位。想再看小宫，点「再看示范」。';
  return '空位和座位都有一次是自己放完的。可以再练，也可以再看小宫。先不进 9×9。';
};

export const childNextLine = (pathClear: boolean, learning: LearningRecord | null): string => {
  if (!pathClear) return '孩子下一步：接着做小草地。';
  const step = continuation(learning);
  const note = sixNextNote(learning);
  return note ? `孩子下一步：${step.label}。${note}` : `孩子下一步：${step.label}。`;
};

export const nextLessonStep = (id: string): { id: string; label: string } => {
  if (id === DEMO_ID) return { id: PRACTICE_ID, label: '自己练' };
  if (id === PRACTICE_ID) return { id: REVIEW_IDS[0], label: '再练一题' };
  const sixIndex = [...SIX_TEACHING, ...SIX_REVIEW_IDS].indexOf(id as (typeof SIX_TEACHING)[number]);
  if (sixIndex >= 0 && sixIndex < SIX_TEACHING.length - 1) {
    const next = SIX_TEACHING[sixIndex + 1];
    return { id: next, label: SIX_STEP_LABEL[next] };
  }
  if (id === SIX_AGAIN_ID) return { id: SIX_REVIEW_IDS[0], label: '再练一题' };
  const reviewIndex = SIX_REVIEW_IDS.indexOf(id as (typeof SIX_REVIEW_IDS)[number]);
  if (reviewIndex >= 0) {
    const next = SIX_REVIEW_IDS[(reviewIndex + 1) % SIX_REVIEW_IDS.length];
    return { id: next, label: '再练一题' };
  }
  const index = REVIEW_IDS.indexOf(id as (typeof REVIEW_IDS)[number]);
  const next = REVIEW_IDS[(index + 1 + REVIEW_IDS.length) % REVIEW_IDS.length];
  return { id: next, label: '再练一题' };
};

export type ParentChip = {
  id: string;
  label: string;
  status: 'own' | 'hint' | 'todo';
  mistakes: number;
};

const PARENT_SHORT: Record<string, string> = {
  新方法示范: '示范',
  自己练: '自己练',
  '复习：行': '行',
  '复习：列': '列',
  '复习：座位': '座位',
  '复习：两种方法': '两种',
  '6×6 小宫': '小宫',
  '6×6 看行': '看行',
  '6×6 自己练': '自己练',
  '6×6 两个座位': '两个座位',
  '6×6 复习空位': '空位',
  '6×6 复习座位': '座位',
  '6×6 复习两种': '两种',
};

const parentChip = (lesson: SeatLesson, record: LearningRecord | null): ParentChip => {
  const mark = markOf(record, lesson.id);
  const label = PARENT_SHORT[lesson.parentLabel] ?? lesson.parentLabel;
  if (!mark?.done) return { id: lesson.id, label, status: 'todo', mistakes: mark?.mistakes ?? 0 };
  return {
    id: lesson.id,
    label,
    status: isIndependent(mark) ? 'own' : 'hint',
    mistakes: mark.mistakes,
  };
};

export const parentBoards = (record: LearningRecord | null): { title: string; items: ParentChip[] }[] => {
  const showSix = sixReady(record) || SIX_LESSONS.some((lesson) => markOf(record, lesson.id));
  const boards = [{ title: '4×4', items: SEAT_LESSONS.map((lesson) => parentChip(lesson, record)) }];
  if (showSix) boards.push({ title: '6×6', items: SIX_LESSONS.map((lesson) => parentChip(lesson, record)) });
  return boards;
};

export const lessonParentLines = (record: LearningRecord | null): string[] => {
  const showSix = sixReady(record) || SIX_LESSONS.some((lesson) => markOf(record, lesson.id));
  const lessons = showSix ? ALL_LESSONS : SEAT_LESSONS;
  return parentLearningLines(
    record,
    lessons.map((lesson) => ({ id: lesson.id, label: lesson.parentLabel }))
  );
};
