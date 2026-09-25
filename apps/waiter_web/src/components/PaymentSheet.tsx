import { money } from '../lib/format';
import type { PaymentMethod } from '../types';

const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: 'Efectivo', icon: '💵' },
  { id: 'card', label: 'Tarjeta', icon: '💳' },
  { id: 'yappy', label: 'Yappy', icon: '📱' },
];

interface Props {
  customerName: string;
  total: number;
  busy: boolean;
  onPick: (method: PaymentMethod) => void;
  onClose: () => void;
}

export function PaymentSheet({ customerName, total, busy, onPick, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="sheet w-full max-w-md px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[28px] sm:pb-6 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle sm:hidden" aria-hidden="true" />
        <p className="text-center text-sm text-muted">Cobrar a {customerName}</p>
        <p className="mb-6 text-center text-3xl font-extrabold tabular-nums">{money(total)}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              disabled={busy}
              className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-line font-bold active:bg-bg disabled:opacity-40"
            >
              <span className="text-2xl">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="btn btn-text mt-4 w-full">
          Cancelar
        </button>
      </div>
    </div>
  );
}
