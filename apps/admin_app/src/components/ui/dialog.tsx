import type { FormEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconButton } from './button';

interface DialogProps {
  title: ReactNode;
  onClose: () => void;
  /** Action buttons. Pinned to the bottom so they stay reachable on phones. */
  footer?: ReactNode;
  /** When set, body + footer are wrapped in a <form> (submit buttons go in `footer`). */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  /** Desktop width override, e.g. `sm:max-w-lg`. Default `sm:max-w-md`. */
  className?: string;
  children: ReactNode;
}

// M3 dialog: full-screen on phones (scrollable body, pinned header/footer);
// basic dialog from `sm` up — surface-container-high, extra-large (28dp) corners.
export function Dialog({ title, onClose, footer, onSubmit, className, children }: DialogProps) {
  const content = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-2">{children}</div>
      {footer && (
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--md-sys-color-outline-variant)] px-6 py-4 max-sm:*:flex-1 sm:border-t-0 sm:pb-6">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 sm:p-4"
      style={{ animation: 'm3-fade-in 150ms linear' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'flex h-dvh w-full flex-col bg-[var(--md-sys-color-surface-container-high)] [--field-bg:var(--md-sys-color-surface-container-high)]',
          'sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[28px]',
          className,
        )}
        style={{ animation: 'm3-dialog-in 250ms var(--md-ease-emphasized-decelerate)' }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 py-3 pl-6 pr-3 sm:pb-2 sm:pt-5">
          <h2 className="t-headline-small min-w-0 text-[var(--md-sys-color-on-surface)]">{title}</h2>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </div>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
