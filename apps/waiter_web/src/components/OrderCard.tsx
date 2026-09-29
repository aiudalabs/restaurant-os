import { useEffect, useState } from 'react';
import { closeOrder, markItemsReady, recordPayment, watchOrderItems } from '../lib/api';
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
  // Counter mode: items no active station prepares stay unrouted ('') once
  // onOrderCreated has run (order leaves 'pending'); the waiter marks them ready.
  const routingDone = order.status !== 'pending';
  const isCounter = (it: OrderItem) => routingDone && it.stationId === '';
  const counterPending = items.filter((it) => isCounter(it) && it.status !== 'done' && it.status !== 'cancelled');
  const hasCounter = items.some(isCounter);
  const onlyCounter = items.length > 0 && items.every(isCounter);
  const kitchen =
    order.status === 'confirmed' && onlyCounter
      ? { text: 'Por preparar', cls: 'bg-amber-50 text-amber-700' }
      : (KITCHEN_LABEL[order.status] ?? KITCHEN_LABEL.pending);
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

  const markReady = (ids: string[]) => run(() => markItemsReady(ids));

  const pay = (method: PaymentMethod) =>
    run(async () => {
      await recordPayment(order.id, method);
      setPaying(false);
    });

  return (
    <article className={`card ${ready ? 'border-emerald-300' : ''}`}>
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
          <li key={it.id} className="flex items-center gap-2">
            {hasCounter && <CounterSlot item={it} counter={isCounter(it)} busy={busy} onReady={() => markReady([it.id])} />}
            <span className="font-bold tabular-nums">{it.quantity}×</span>
            <span className={`flex-1 ${it.status === 'done' ? 'text-muted line-through' : ''}`}>
              {it.productName}
              {it.specialInstructions && <span className="block text-xs text-muted">↳ {it.specialInstructions}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <p className="text-lg font-extrabold tabular-nums">{money(order.total)}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
        {counterPending.length > 1 && (
          <button onClick={() => markReady(counterPending.map((it) => it.id))} disabled={busy} className="btn btn-outlined">
            Todo listo
          </button>
        )}
        {!paid && (
          <button
            onClick={() => setPaying(true)}
            disabled={busy}
            className="btn btn-filled"
          >
            Cobrar
          </button>
        )}
        {paid && ready && (
          <button
            onClick={() => run(() => closeOrder(order.id))}
            disabled={busy}
            className="btn bg-emerald-600 text-white active:bg-emerald-700"
          >
            Entregado ✓
          </button>
        )}
        {paid && !ready && counterPending.length === 0 && <p className="text-sm text-muted">Esperando cocina…</p>}
        </div>
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

/** Leading slot of an item row: tap-to-ready circle for counter items, check when done. */
function CounterSlot({ item, counter, busy, onReady }: { item: OrderItem; counter: boolean; busy: boolean; onReady: () => void }) {
  if (!counter) return <span className="w-10 shrink-0" aria-hidden="true" />;
  if (item.status === 'done') {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center text-emerald-600" aria-label="Listo">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </span>
    );
  }
  return (
    <button onClick={onReady} disabled={busy} className="icon-btn active:bg-bg" aria-label={`Marcar ${item.productName} como listo`}>
      <span className="h-5 w-5 rounded-full border-2 border-muted" />
    </button>
  );
}
