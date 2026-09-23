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
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-sm text-muted">Cobrar a {customerName}</p>
        <p className="mb-5 text-center text-3xl font-extrabold tabular-nums">{money(total)}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              disabled={busy}
              className="flex flex-col items-center gap-1 rounded-2xl border border-line py-4 font-bold active:bg-bg disabled:opacity-50"
            >
              <span className="text-2xl">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-3 font-medium text-muted">
          Cancelar
        </button>
      </div>
    </div>
  );
}
