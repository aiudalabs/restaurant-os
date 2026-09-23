import type { FormEventHandler, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Full-screen sheet on phones (scrollable body, pinned header/footer);
// centered M3 card from `sm` up.
export function Dialog({ title, onClose, footer, onSubmit, className, children }: DialogProps) {
  const content = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">{children}</div>
      {footer && (
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--color-outline-variant)] px-6 py-4 max-sm:*:flex-1 sm:border-t-0 sm:pb-6">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'm3-card flex h-dvh w-full flex-col rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[1.75rem]',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-6 pb-4 pt-4 sm:pt-6">
          <h2 className="min-w-0 text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="m3-state shrink-0 rounded-full p-2.5 text-gray-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
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
