import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { watchOrder } from '../lib/api';
import { money } from '../lib/format';
import { clearActiveOrder } from '../lib/session';
import { useSession } from '../store/session';
import { Spinner } from '../components/Spinner';
import type { OrderDoc, OrderItemDoc, OrderStatus } from '../types';

const STEPS: { key: string; label: string; icon: string; statuses: OrderStatus[] }[] = [
  { key: 'received', label: 'Recibido', icon: '📝', statuses: ['pending', 'confirmed'] },
  { key: 'preparing', label: 'En preparación', icon: '👨‍🍳', statuses: ['in_preparation'] },
  { key: 'ready', label: 'Listo para retirar', icon: '🔔', statuses: ['ready'] },
  { key: 'done', label: 'Entregado', icon: '✅', statuses: ['delivered', 'closed'] },
];

function stepIndex(status: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

export function TrackingScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { clear: clearSession } = useSession();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [items, setItems] = useState<OrderItemDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const unsub = watchOrder(orderId, (o, its) => {
      setOrder(o);
      setItems(its);
      setLoaded(true);
      if (o && (o.status === 'delivered' || o.status === 'closed' || o.status === 'cancelled')) {
        clearActiveOrder();
      }
    });
    return unsub;
  }, [orderId]);

  if (!loaded) return <Spinner label="Buscando tu pedido…" />;

  if (!order) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">🔍</div>
        <p className="text-sm text-hint">No encontramos este pedido.</p>
        <button
          onClick={() => navigate('/recover')}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Buscar con mi número
        </button>
      </div>
    );
  }

  const active = stepIndex(order.status);
  const cancelled = order.status === 'cancelled';
  const isReady = order.status === 'ready';

  const startNewOrder = () => {
    clearActiveOrder();
    clearSession();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col px-5 pb-10 safe-top">
      <header className="py-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-hint">Tu número de pedido</p>
      </header>

      {/* The number the customer must keep to pick up the order */}
      <div
        className={`rounded-3xl p-7 text-center text-white shadow-xl ${
          isReady ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-brand shadow-brand/25'
        }`}
      >
        <div className="font-display text-6xl font-bold tracking-tight">{order.pickupCode}</div>
        <p className="mt-2 text-sm text-white/80">
          {order.customerName && order.customerName !== 'Cliente'
            ? `A nombre de ${order.customerName}`
            : 'Guarda este número para retirar'}
        </p>
      </div>

      {isReady && (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          🔔 ¡Tu pedido está listo! Acércate al mostrador con tu número.
        </div>
      )}
      {cancelled && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
          Este pedido fue cancelado. Consulta con el personal.
        </div>
      )}

      {/* Status stepper */}
      {!cancelled && (
        <div className="mt-7">
          {STEPS.map((step, i) => {
            const state = i < active ? 'done' : i === active ? 'current' : 'todo';
            return (
              <div key={step.key} className="flex items-center gap-3.5 py-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition ${
                    state === 'todo'
                      ? 'bg-black/5 grayscale'
                      : state === 'current'
                        ? 'bg-brand/10 ring-2 ring-brand'
                        : 'bg-emerald-50'
                  }`}
                >
                  {state === 'done' ? '✓' : step.icon}
                </div>
                <span
                  className={`text-sm ${
                    state === 'todo' ? 'text-hint' : 'font-semibold text-ink'
                  }`}
                >
                  {step.label}
                </span>
                {state === 'current' && (
                  <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-brand" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-hint">Tu pedido</p>
        {items.length === 0 ? (
          <p className="text-sm text-hint">Cargando artículos…</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold">{it.quantity}×</span> {it.productName}
                </span>
                <ItemBadge status={it.status} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-black/5 pt-3 font-semibold">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </div>
      </div>

      <button
        onClick={startNewOrder}
        className="mt-6 w-full rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-ink"
      >
        Hacer otro pedido
      </button>
    </div>
  );
}

function ItemBadge({ status }: { status: OrderItemDoc['status'] }) {
  const map: Record<OrderItemDoc['status'], { label: string; cls: string }> = {
    queued: { label: 'En cola', cls: 'bg-black/5 text-hint' },
    in_progress: { label: 'Preparando', cls: 'bg-amber-100 text-amber-700' },
    done: { label: 'Listo', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-600' },
  };
  const { label, cls } = map[status] ?? map.queued;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
