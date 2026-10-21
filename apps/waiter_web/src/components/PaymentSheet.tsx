import { useState } from 'react';
import { money } from '../lib/format';
import type { InvoiceRequest, PaymentMethod } from '../types';

const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: 'Efectivo', icon: '💵' },
  { id: 'card', label: 'Tarjeta', icon: '💳' },
  { id: 'yappy', label: 'Yappy', icon: '📱' },
];

interface Props {
  customerName: string;
  total: number;
  busy: boolean;
  onPick: (method: PaymentMethod, invoiceRequest?: InvoiceRequest) => void;
  onClose: () => void;
}

export function PaymentSheet({ customerName, total, busy, onPick, onClose }: Props) {
  const [withData, setWithData] = useState(false);
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');

  // Every invoice field is optional (DV is resolved server-side). With no data
  // the invoice goes to consumidor final, so no invoiceRequest is sent.
  const pick = (method: PaymentMethod) => {
    const n = name.trim();
    const t = taxId.trim();
    if (!withData || (!n && !t)) {
      onPick(method);
      return;
    }
    onPick(method, { receiverType: t ? '01' : '02', taxId: t || 'CF', name: n || 'Consumidor Final' });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="sheet w-full max-w-md px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[28px] sm:pb-6 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle sm:hidden" aria-hidden="true" />
        <p className="text-center text-sm text-muted">Cobrar a {customerName}</p>
        <p className="mb-4 text-center text-3xl font-extrabold tabular-nums">{money(total)}</p>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setWithData((v) => !v)}
            aria-expanded={withData}
            className={`btn ${withData ? 'btn-filled' : 'btn-outlined'} min-h-[44px]`}
          >
            {withData ? '✓ ' : ''}Datos para la factura (opcional)
          </button>
          {withData && (
            <div className="mt-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre para la factura"
                aria-label="Nombre para la factura"
                autoComplete="off"
                className="field"
              />
              <label className="block">
                <span className="mb-1 block text-xs text-muted">RUC de empresa (opcional)</span>
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="155704849-2-2021"
                  autoComplete="off"
                  className="field"
                />
              </label>
              <p className="text-xs text-muted">Sin datos, la factura sale a consumidor final.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
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
