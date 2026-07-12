import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Reusable confirm dialog for destructive actions (delete, etc.). */
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="m3-card w-full max-w-sm rounded-[1.75rem] p-6">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {destructive && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
            )}
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-500" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={run} disabled={busy}>
            {busy ? 'Un momento…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
