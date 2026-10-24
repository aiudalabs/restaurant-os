import { useState } from 'react';
import { money } from '../lib/format';
import type { DiscountOption, InvoiceRequest, PaymentMethod } from '../types';

const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: 'Efectivo', icon: '💵' },
  { id: 'card', label: 'Tarjeta', icon: '💳' },
  { id: 'yappy', label: 'Yappy', icon: '📱' },
];

interface Props {
  customerName: string;
  total: number;
  discounts: DiscountOption[];
  applied: { name: string; percent: number; amount: number } | null;
  /** null removes the discount; the server recomputes the total. */
  onDiscount: (id: string | null, idNumber?: string) => void;
  busy: boolean;
  onPick: (method: PaymentMethod, invoiceRequest?: InvoiceRequest) => void;
  onClose: () => void;
}

export function PaymentSheet({ customerName, total, discounts, applied, onDiscount, busy, onPick, onClose }: Props) {
  const [withData, setWithData] = useState(false);
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [choice, setChoice] = useState<DiscountOption | null>(null);
  const [idNumber, setIdNumber] = useState('');

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
        <p className="text-center text-3xl font-extrabold tabular-nums">{money(total)}</p>
        {applied && (
          <p className="mb-1 text-center text-sm text-emerald-700">
            {applied.name} ({applied.percent}%) −{money(applied.amount)}
          </p>
        )}

        {(discounts.length > 0 || applied) && (
          <div className="mb-4 mt-3">
            {applied ? (
              <button type="button" onClick={() => onDiscount(null)} disabled={busy} className="btn btn-text w-full">
                Quitar descuento
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {discounts.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => (d.requiresId ? setChoice(choice?.id === d.id ? null : d) : onDiscount(d.id))}
                      disabled={busy}
                      className={`btn ${choice?.id === d.id ? 'btn-filled' : 'btn-outlined'} min-h-[44px]`}
                    >
                      {d.name} {d.percent}%
                    </button>
                  ))}
                </div>
                {choice && (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Cédula o carné del beneficiario"
                      aria-label="Cédula o carné del beneficiario"
                      autoComplete="off"
                      className="field"
                    />
                    <button
                      type="button"
                      onClick={() => onDiscount(choice.id, idNumber)}
                      disabled={busy || idNumber.trim().length < 3}
                      className="btn btn-filled"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
