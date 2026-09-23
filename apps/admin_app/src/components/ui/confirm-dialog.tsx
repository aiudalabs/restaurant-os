import { useState } from 'react';
import { Button } from './button';
import { Icon } from './icon';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** M3 basic dialog with hero icon, for confirmations (delete, etc.). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  destructive = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" style={{ animation: 'm3-fade-in 150ms linear' }}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-[28px] bg-[var(--md-sys-color-surface-container-high)] p-6"
        style={{ animation: 'm3-dialog-in 250ms var(--md-ease-emphasized-decelerate)' }}
      >
        <div className="flex flex-col items-center text-center">
          <Icon
            name={destructive ? 'delete' : 'help'}
            className={destructive ? 'text-[var(--md-sys-color-error)]' : 'text-[var(--md-sys-color-secondary)]'}
          />
          <h2 id="confirm-title" className="t-headline-small mt-4 text-[var(--md-sys-color-on-surface)]">
            {title}
          </h2>
        </div>
        <p className="t-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">{message}</p>
        {error && (
          <p className="t-body-medium mt-3 rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="ghost"
            onClick={run}
            disabled={busy}
            className={destructive ? 'text-[var(--md-sys-color-error)]' : undefined}
          >
            {busy ? 'Un momento…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
