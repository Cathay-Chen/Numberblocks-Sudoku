export type PlayCell = {
  row: number;
  col: number;
  value: number;
  given: boolean;
  selected: boolean;
  hint: boolean;
  conflict: boolean;
  band: boolean;
  placed: boolean;
};

export type PlayfieldModel = {
  rev: number;
  kind: 'warmup-row' | 'warmup-box' | 'grid';
  size: number;
  boxRows: number;
  boxCols: number;
  digits: number[];
  cells: PlayCell[];
  guideValue: number | null;
  guideAt: { row: number; col: number } | null;
  closed: boolean;
};

export type PlayAction =
  | { type: 'cell'; row: number; col: number }
  | { type: 'place'; row: number; col: number; value: number };

export type SeatMark = { key: string; x: number; y: number; w: number; h: number };

type ModelListener = (model: PlayfieldModel) => void;
type ActionListener = (action: PlayAction) => void;
type SeatListener = (marks: SeatMark[]) => void;

let revision = 0;
let latest: PlayfieldModel | null = null;
const models = new Set<ModelListener>();
const actions = new Set<ActionListener>();
const seats = new Set<SeatListener>();

export const lastPlayfield = (): PlayfieldModel | null => latest;

export const presentPlayfield = (model: Omit<PlayfieldModel, 'rev'>) => {
  const next: PlayfieldModel = { ...model, cells: model.cells.map((cell) => ({ ...cell })), rev: (revision += 1) };
  latest = next;
  for (const listener of [...models]) {
    try {
      listener(next);
    } catch {
      models.delete(listener);
    }
  }
};

export const subscribePlayfield = (listener: ModelListener): (() => void) => {
  models.add(listener);
  return () => {
    models.delete(listener);
  };
};

export const emitPlayAction = (action: PlayAction) => {
  for (const listener of actions) listener(action);
};

export const subscribePlayAction = (listener: ActionListener): (() => void) => {
  actions.add(listener);
  return () => {
    actions.delete(listener);
  };
};

export const publishSeats = (marks: SeatMark[]) => {
  for (const listener of seats) listener(marks);
};

export const subscribeSeats = (listener: SeatListener): (() => void) => {
  seats.add(listener);
  return () => {
    seats.delete(listener);
  };
};
