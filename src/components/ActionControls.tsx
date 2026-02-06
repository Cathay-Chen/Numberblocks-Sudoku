import { GAME_ACTIONS, type GameAction } from '../game/actions';

type ActionControlsProps = {
  actionLabel: string;
  onAction: (action: GameAction) => void;
};

export function ActionControls({ actionLabel, onAction }: ActionControlsProps) {
  return (
    <div className="grid justify-items-end gap-2 max-md:w-full max-md:justify-items-start">
      <div className="flex flex-wrap justify-end gap-2 max-md:justify-start">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onAction(GAME_ACTIONS.NEW_GAME)}
        >
          新游戏
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onAction(GAME_ACTIONS.HINT)}
        >
          提示
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onAction(GAME_ACTIONS.UNDO)}
        >
          撤销
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onAction(GAME_ACTIONS.CLEAR)}
        >
          清除
        </button>
      </div>
      <div className="flex flex-wrap justify-end gap-2 max-md:justify-start">
        <button
          type="button"
          className="btn btn-ghost btn-sm border border-slate-200"
          onClick={() => onAction(GAME_ACTIONS.REDO)}
        >
          重做
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm border border-slate-200"
          onClick={() => onAction(GAME_ACTIONS.TOGGLE_NOTES)}
        >
          {actionLabel}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm border border-slate-200"
          onClick={() => onAction(GAME_ACTIONS.AUTO_NOTES)}
        >
          自动备注
        </button>
      </div>
    </div>
  );
}
