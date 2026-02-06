export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExperienceMode = 'classic' | 'kid';

export type CellPos = {
  row: number;
  col: number;
};

export type GameState = {
  puzzle: number[][];
  solution: number[][];
  board: number[][];
  notes: boolean[][][];
  givens: boolean[][];
  conflicts: Set<string>;
  difficulty: Difficulty;
  completed: boolean;
  selectedCell: CellPos | null;
  selectedValue: number | null;
  notesMode: boolean;
  score: number;
  mistakes: number;
  maxMistakes: number;
  failed: boolean;
  experienceMode: ExperienceMode;
  kidMode: boolean;
  kidAdventureMode: boolean;
  stars: number;
  correctStreak: number;
  kidLevelStars: number[];
  voiceGuideEnabled: boolean;
  hintText: string;
  elapsedSeconds: number;
};
