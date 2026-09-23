import { useEffect, useState } from 'react';
import { closeOrder, recordPayment, watchOrderItems } from '../lib/api';
import { money } from '../lib/format';
import { PaymentSheet } from './PaymentSheet';
import type { Order, OrderItem, OrderStatus, PaymentMethod } from '../types';

const KITCHEN_LABEL: Record<OrderStatus, { text: string; cls: string }> = {
  pending: { text: 'Enviando…', cls: 'bg-gray-100 text-gray-600' },
  confirmed: { text: 'En cocina', cls: 'bg-blue-50 text-blue-700' },
  in_preparation: { text: 'Preparando', cls: 'bg-amber-50 text-amber-700' },
  ready: { text: 'Listo', cls: 'bg-emerald-100 text-emerald-800' },
  delivered: { text: 'Entregado', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { text: 'Cancelado', cls: 'bg-gray-100 text-gray-600' },
  closed: { text: 'Cerrado', cls: 'bg-gray-100 text-gray-600' },
};

const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Efectivo', card: 'Tarjeta', yappy: 'Yappy' };

interface Props {
  order: Order;
  orgId: string;
  now: number;
}

export function OrderCard({ order, orgId, now }: Props) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => watchOrderItems(orgId, order.id, setItems), [orgId, order.id]);

  const paid = order.paymentStatus === 'paid';
  const ready = order.status === 'ready';
  const kitchen = KITCHEN_LABEL[order.status] ?? KITCHEN_LABEL.pending;
  const minutes = Math.max(0, Math.floor((now - order.createdAtMs) / 60_000));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      console.error('[waiter] order update failed', e);
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const pay = (method: PaymentMethod) =>
    run(async () => {
      await recordPayment(order.id, method);
      setPaying(false);
    });

  return (
    <article className={`rounded-2xl border bg-panel p-4 shadow-sm ${ready ? 'border-emerald-300' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{order.customerName}</p>
          <p className="text-xs text-muted">hace {minutes} min</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${kitchen.cls}`}>{kitchen.text}</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              paid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-brand'
            }`}
          >
            {paid ? `Cobrado · ${order.paymentMethod ? METHOD_LABEL[order.paymentMethod] : ''}` : 'Por cobrar'}
          </span>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {items.map((it) => (
          <li key={it.id} className="flex gap-2">
            <span className="font-bold tabular-nums">{it.quantity}×</span>
            <span className={`flex-1 ${it.status === 'done' ? 'text-muted line-through' : ''}`}>
              {it.productName}
              {it.specialInstructions && <span className="block text-xs text-muted">↳ {it.specialInstructions}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <p className="text-lg font-extrabold tabular-nums">{money(order.total)}</p>
        {!paid && (
          <button
            onClick={() => setPaying(true)}
            disabled={busy}
            className="rounded-xl bg-brand px-5 py-2.5 font-bold text-white active:bg-brandDark disabled:opacity-50"
          >
            Cobrar
          </button>
        )}
        {paid && ready && (
          <button
            onClick={() => run(() => closeOrder(order.id))}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white active:bg-emerald-700 disabled:opacity-50"
          >
            Entregado ✓
          </button>
        )}
        {paid && !ready && <p className="text-sm text-muted">Esperando cocina…</p>}
      </div>
      {error && <p className="mt-2 text-sm text-brand">{error}</p>}

      {paying && (
        <PaymentSheet
          customerName={order.customerName}
          total={order.total}
          busy={busy}
          onPick={pay}
          onClose={() => setPaying(false)}
        />
      )}
    </article>
  );
}
