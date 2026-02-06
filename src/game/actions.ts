export const GAME_ACTIONS = {
  NEW_GAME: 'new-game',
  HINT: 'hint',
  UNDO: 'undo',
  REDO: 'redo',
  TOGGLE_NOTES: 'toggle-notes',
  AUTO_NOTES: 'auto-notes',
  LEARN_HINT: 'learn-hint',
  CLEAR: 'clear',
  TOGGLE_KID_MODE: 'toggle-kid-mode',
  TOGGLE_KID_ADVENTURE: 'toggle-kid-adventure',
  KID_STEP_HINT: 'kid-step-hint',
  TOGGLE_VOICE_GUIDE: 'toggle-voice-guide',
} as const;

export type GameAction = (typeof GAME_ACTIONS)[keyof typeof GAME_ACTIONS];
