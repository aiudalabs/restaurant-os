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
  const [withRuc, setWithRuc] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [dv, setDv] = useState('');
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);

  const pick = (method: PaymentMethod) => {
    if (!withRuc) {
      onPick(method);
      return;
    }
    const req: InvoiceRequest = { receiverType: '01', taxId: taxId.trim(), dv: dv.trim(), name: name.trim() };
    if (!req.taxId || !req.dv || !req.name) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onPick(method, req);
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
            onClick={() => {
              setWithRuc((v) => !v);
              setInvalid(false);
            }}
            aria-expanded={withRuc}
            className={`btn ${withRuc ? 'btn-filled' : 'btn-outlined'} min-h-[44px]`}
          >
            {withRuc ? '✓ ' : ''}Factura con RUC
          </button>
          {withRuc && (
            <div className="mt-3 space-y-2">
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="155704849-2-2021"
                aria-label="RUC"
                autoComplete="off"
                className="field"
              />
              <input
                value={dv}
                onChange={(e) => setDv(e.target.value)}
                placeholder="32"
                aria-label="DV"
                maxLength={2}
                inputMode="numeric"
                autoComplete="off"
                className="field"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre o razón social"
                aria-label="Nombre o razón social"
                autoComplete="off"
                className="field"
              />
              {invalid && <p className="text-sm text-brand">Completa RUC, DV y nombre para emitir la factura.</p>}
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
