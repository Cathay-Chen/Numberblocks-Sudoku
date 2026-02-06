import { useState } from 'react';
import type { GameState } from '../game/types';
import { NumberBlock } from './NumberBlock';

type SudokuBoardProps = {
  state: GameState;
  onSelectCell: (row: number, col: number) => void;
  onClearSelection: () => void;
  onDropNumber: (row: number, col: number, value: number) => void;
};

export function SudokuBoard({
  state,
  onSelectCell,
  onClearSelection,
  onDropNumber,
}: SudokuBoardProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const fallbackValue =
    state.selectedCell && state.board[state.selectedCell.row][state.selectedCell.col]
      ? state.board[state.selectedCell.row][state.selectedCell.col]
      : null;
  const highlightValue = state.selectedValue ?? fallbackValue;

  return (
    <div className="panel grid place-items-center p-4 md:p-6">
      <div className="sudoku-frame">
        <div
          className="sudoku-grid"
          id="board"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClearSelection();
          }}
        >
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 9 }).map((__, col) => {
              const key = `${row}-${col}`;
              const value = state.board[row][col];
              const isSelected =
                state.selectedCell?.row === row && state.selectedCell.col === col;
              const sameRow = state.selectedCell?.row === row;
              const sameCol = state.selectedCell?.col === col;
              const sameBox =
                state.selectedCell &&
                Math.floor(state.selectedCell.row / 3) === Math.floor(row / 3) &&
                Math.floor(state.selectedCell.col / 3) === Math.floor(col / 3);

              const className = [
                'sudoku-cell',
                state.givens[row][col] ? 'given' : '',
                state.conflicts.has(key) ? 'conflict' : '',
                isSelected ? 'selected' : '',
                sameRow || sameCol ? 'peer' : '',
                sameBox ? 'peer-box' : '',
              highlightValue && value === highlightValue ? 'same-value' : '',
              dragOverCell === key ? 'drag-over' : '',
            ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={key}
                  type="button"
                  className={className}
                  aria-label={`第${row + 1}行第${col + 1}列${value === 0 ? '空格' : `数字${value}`}`}
                  onClick={() => onSelectCell(row, col)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverCell(key);
                  }}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOverCell(null);
                    if (state.givens[row][col]) return;

                    const valueFromDrag = Number(event.dataTransfer.getData('text/plain'));
                    if (!valueFromDrag) return;
                    onDropNumber(row, col, valueFromDrag);
                  }}
                >
                  {value !== 0 ? (
                    <NumberBlock value={value} size="cell" given={state.givens[row][col]} />
                  ) : (
                    state.notes[row][col].some(Boolean) && (
                      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[2px] p-1">
                        {Array.from({ length: 9 }).map((___, index) => {
                          const noteValue = index + 1;
                          return (
                            <span
                              key={`${key}-note-${noteValue}`}
                              className="grid place-items-center text-[10px] font-bold text-slate-500"
                            >
                              {state.notes[row][col][noteValue] ? noteValue : ''}
                            </span>
                          );
                        })}
                      </div>
                    )
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
