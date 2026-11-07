import type { Difficulty } from '../game/types';
import { formatTime, getDifficultyLabel } from '../game/utils';

type StatsPanelProps = {
  elapsedSeconds: number;
  difficulty: Difficulty;
  mistakes: number;
  maxMistakes: number;
  score: number;
  stars: number;
  kidMode: boolean;
  hintText: string;
  onAction: (action: 'easy' | 'medium' | 'hard') => void;
};

export function StatsPanel({
  elapsedSeconds,
  difficulty,
  mistakes,
  maxMistakes,
  score,
  stars,
  kidMode,
  hintText,
  onAction,
}: StatsPanelProps) {
  return (
    <section className="panel p-5">
      {!kidMode && (
        <h2 className="mb-3 flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-sky-500"></span>
          <strong className="font-display text-4xl leading-none">{formatTime(elapsedSeconds)}</strong>
        </h2>
      )}

      <dl className="grid gap-2 text-sm font-bold text-slate-700">
        {!kidMode && (
          <div className="flex items-center justify-between">
            <dt>难度</dt>
            <dd className="text-emerald-600">{getDifficultyLabel(difficulty)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt>{kidMode ? '试过' : '错误'}</dt>
          <dd className={kidMode ? 'text-slate-700' : 'text-rose-600'}>
            {kidMode ? `${mistakes} 次` : `${mistakes} / ${maxMistakes}`}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>{kidMode ? '放好' : '分数'}</dt>
          <dd>{score.toLocaleString('zh-CN')}</dd>
        </div>
        {kidMode && (
          <div className="flex items-center justify-between">
            <dt>星星</dt>
            <dd className="text-amber-500">{stars > 0 ? `⭐ x ${stars}` : '暂无'}</dd>
          </div>
        )}
      </dl>

      {!kidMode && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            className={`btn btn-sm ${difficulty === 'easy' ? 'btn-info text-white' : 'btn-outline'}`}
            onClick={() => onAction('easy')}
          >
            简单
          </button>
          <button
            type="button"
            className={`btn btn-sm ${difficulty === 'medium' ? 'btn-info text-white' : 'btn-outline'}`}
            onClick={() => onAction('medium')}
          >
            中等
          </button>
          <button
            type="button"
            className={`btn btn-sm ${difficulty === 'hard' ? 'btn-info text-white' : 'btn-outline'}`}
            onClick={() => onAction('hard')}
          >
            困难
          </button>
        </div>
      )}

      {hintText ? <p className="mt-3 min-h-6 text-sm text-slate-500">{hintText}</p> : null}
    </section>
  );
}
