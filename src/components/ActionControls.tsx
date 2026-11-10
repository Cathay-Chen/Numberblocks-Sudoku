import { GAME_ACTIONS, type GameAction } from '../game/actions';
import { HandButton } from './ToolIcon';

type ActionControlsProps = {
  actionLabel: string;
  notesOn: boolean;
  onAction: (action: GameAction) => void;
};

export function ActionControls({ actionLabel, notesOn, onAction }: ActionControlsProps) {
  return (
    <div className="classic-hand" role="group" aria-label="这一局">
      <HandButton icon="hint" label="提示" onClick={() => onAction(GAME_ACTIONS.HINT)} />
      <HandButton icon="undo" label="撤销" onClick={() => onAction(GAME_ACTIONS.UNDO)} />
      <HandButton icon="redo" label="重做" onClick={() => onAction(GAME_ACTIONS.REDO)} />
      <HandButton icon="erase" label="清除" onClick={() => onAction(GAME_ACTIONS.CLEAR)} />
      <HandButton
        icon="notes"
        label={notesOn ? '备注开' : '备注'}
        pressed={notesOn}
        name={actionLabel}
        onClick={() => onAction(GAME_ACTIONS.TOGGLE_NOTES)}
      />
      <HandButton icon="notes" label="自动备注" onClick={() => onAction(GAME_ACTIONS.AUTO_NOTES)} />
    </div>
  );
}
