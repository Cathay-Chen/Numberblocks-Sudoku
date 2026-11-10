import { useEffect, useRef } from 'react';

export const focusSameControl = (previous: HTMLElement | null) => {
  if (!previous) return;
  if (previous.isConnected) {
    previous.focus();
    return;
  }
  const label = previous.getAttribute('aria-label') || previous.textContent?.trim() || '';
  if (!label) return;
  const next = [...document.querySelectorAll('button')].find((button) => {
    const name = button.getAttribute('aria-label') || button.textContent?.trim() || '';
    return name === label;
  });
  next?.focus();
};

type ReplaceDialogProps = {
  onKeep: () => void;
  onReplace: () => void;
};

export function ReplaceDialog({ onKeep, onReplace }: ReplaceDialogProps) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onKeep();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...(dialogRef.current?.querySelectorAll('button') ?? [])];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKeep]);

  return (
    <div
      className="replace-shade"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onKeep();
      }}
    >
      <div ref={dialogRef} className="replace-dialog" role="dialog" aria-modal="true" aria-labelledby="replace-title">
        <h2 id="replace-title">这一局还没下完。</h2>
        <p>换掉会清掉现在的格子。</p>
        <div className="replace-actions">
          <button ref={keepRef} type="button" className="kid-step" onClick={onKeep}>
            留下
          </button>
          <button type="button" className="kid-more" onClick={onReplace}>
            换掉
          </button>
        </div>
      </div>
    </div>
  );
}
