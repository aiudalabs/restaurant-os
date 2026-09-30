import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import {
  useActiveOrders,
  useConfirmManualPayment,
  useItemsForOrders,
  useProductImages,
  useTodayOrders,
} from '@/hooks/use-orders';
import { cn } from '@/lib/utils';
import type { Order, PaymentMethod } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import { HourlyChart } from './HourlyChart';

// An order waiting longer than this on the pass turns red.
const LATE_MINUTES = 12;

const PAID_WITH: Record<PaymentMethod, string> = {
  cash: 'Cobrado en efectivo',
  card: 'Cobrado con tarjeta',
  yappy: 'Cobrado con Yappy',
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function isPaid(order: Order) {
  return order.payment?.status === 'paid';
}

function minutesSince(order: Order, now: number) {
  const created = order.createdAt?.toMillis?.();
  return created ? Math.max(0, Math.floor((now - created) / 60_000)) : 0;
}

/** Re-renders every 30 s so the minutes on the tickets keep moving. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

interface TicketLook {
  stripe: string;
  chip: string;
  chipClass: string;
  state: string;
}

/** Colour and wording of a ticket on the pass. */
function ticketLook(order: Order, minutes: number): TicketLook {
  if (order.status === 'ready') {
    return { stripe: 'bg-[var(--md-sys-color-primary)]', chip: 'Listo', chipClass: 'bg-[var(--md-sys-color-primary)] text-[#ffffff] dark:text-[var(--md-sys-color-on-primary)]', state: 'Listo para entregar' };
  }
  const late = minutes >= LATE_MINUTES;
  const chip = `${minutes} min`;
  if (late) {
    return {
      stripe: 'bg-[var(--md-sys-color-error)]',
      chip,
      chipClass: 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]',
      state: order.status === 'in_preparation' ? 'Preparando, se está demorando' : 'Por preparar, se está demorando',
    };
  }
  if (order.status === 'in_preparation') {
    return { stripe: 'bg-[var(--color-orange-300)]', chip, chipClass: 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]', state: 'Preparando' };
  }
  return { stripe: 'bg-[var(--ros-saffron)]', chip, chipClass: 'bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]', state: 'Por preparar' };
}

// ─── A ticket hanging on the pass ───

interface TicketProps {
  order: Order;
  items: OrderItem[];
  now: number;
  busy: boolean;
  onConfirmYappy: (orderId: string, received: boolean) => void;
}

function Ticket({ order, items, now, busy, onConfirmYappy }: TicketProps) {
  const minutes = minutesSince(order, now);
  const code = order.pickupCode || order.tableNumber;
  const name = order.customerName && order.customerName !== code ? order.customerName : '';
  const itemLines = items.length > 0
    ? items.map((it) => `${it.quantity} ${it.productName}`)
    : [`${order.itemCount} ${order.itemCount === 1 ? 'artículo' : 'artículos'}`];

  // Waiting for its payment: dashed ticket, not on the kitchen yet.
  if (order.status === 'pending_payment') {
    const yappy = order.payment?.method === 'yappy';
    return (
      <article className="flex w-[236px] shrink-0 snap-start flex-col gap-3 rounded-md border-2 border-dashed border-[var(--ros-saffron)] bg-[var(--md-sys-color-surface-container-low)] px-[18px] pb-[18px] pt-6">
        <div className="flex items-start justify-between gap-2">
          <span className="t-number text-[46px] font-extrabold leading-[0.9] text-[var(--md-sys-color-on-surface-variant)]">{code}</span>
          <span className="t-label-medium rounded-xl bg-[var(--md-sys-color-tertiary-container)] px-2.5 py-1 font-bold text-[var(--md-sys-color-on-tertiary-container)]">
            {yappy ? 'Yappy' : 'En línea'}
          </span>
        </div>
        <div>
          {name && <p className="t-title-medium font-bold text-[var(--md-sys-color-on-surface)]">{name}</p>}
          <p className="t-body-small text-[var(--md-sys-color-on-surface-variant)]">
            {yappy ? 'Esperando que confirmes el pago' : 'Pagando en línea'}
          </p>
        </div>
        <ul className="t-body-medium space-y-1.5 border-t border-dashed border-[var(--md-sys-color-outline-variant)] pt-3 text-[var(--md-sys-color-on-surface)]">
          {itemLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        {yappy ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirmYappy(order.id, true)}
            className="t-label-large mt-auto h-10 rounded-full bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] disabled:opacity-40"
          >
            {busy ? 'Confirmando…' : `Confirmar ${money(order.total)}`}
          </button>
        ) : (
          <p className="t-label-large mt-auto text-right text-[var(--md-sys-color-on-surface)]">{money(order.total)}</p>
        )}
      </article>
    );
  }

  const look = ticketLook(order, minutes);
  return (
    <article className="flex w-[236px] shrink-0 snap-start flex-col overflow-hidden rounded-md bg-[var(--ros-ticket)] shadow-[var(--ros-ticket-shadow)]">
      <div className={cn('h-2.5', look.stripe)} />
      <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-4">
        <div className="flex items-start justify-between gap-2">
          <span className="t-number text-[46px] font-extrabold leading-[0.9] text-[var(--md-sys-color-on-surface)]">{code}</span>
          <span className={cn('t-label-medium rounded-xl px-2.5 py-1 font-bold', look.chipClass)}>{look.chip}</span>
        </div>
        <div>
          {name && <p className="t-title-medium font-bold text-[var(--md-sys-color-on-surface)]">{name}</p>}
          <p className="t-body-small text-[var(--md-sys-color-on-surface-variant)]">{look.state}</p>
        </div>
        <ul className="t-body-medium flex-1 space-y-1.5 border-t border-dashed border-[var(--md-sys-color-outline-variant)] pt-3 text-[var(--md-sys-color-on-surface)]">
          {itemLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <div className="t-body-medium flex items-center justify-between gap-2">
          <span className="text-[var(--md-sys-color-on-surface-variant)]">
            {isPaid(order) ? (order.payment.method ? PAID_WITH[order.payment.method] : 'Cobrado') : 'Por cobrar'}
          </span>
          <strong className="text-[var(--md-sys-color-on-surface)]">{money(order.total)}</strong>
        </div>
      </div>
    </article>
  );
}

// ─── Dashboard ("Inicio") ───

export default function DashboardPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();
  const now = useNow();

  const { orders: activeOrders, loading: activeLoading } = useActiveOrders(orgId, branchId);
  const { orders: todayOrders, loading: todayLoading } = useTodayOrders(orgId, branchId);
  const { confirm, busyId } = useConfirmManualPayment();
  const [confirmError, setConfirmError] = useState('');

  // Oldest first, like the rail in the kitchen.
  const pass = useMemo(
    () => [...activeOrders].sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)),
    [activeOrders],
  );
  const passIds = useMemo(() => pass.map((o) => o.id), [pass]);
  const passItems = useItemsForOrders(orgId, passIds);
  const itemsByOrder = useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    passItems.forEach((it) => map.set(it.orderId, [...(map.get(it.orderId) ?? []), it]));
    return map;
  }, [passItems]);

  const sold = useMemo(() => todayOrders.filter((o) => o.status !== 'cancelled'), [todayOrders]);
  const stats = useMemo(() => {
    const revenue = sold.reduce((sum, o) => sum + o.total, 0);
    const unpaid = sold.filter((o) => !isPaid(o)).reduce((sum, o) => sum + o.total, 0);
    return { revenue, count: sold.length, avg: sold.length ? revenue / sold.length : 0, unpaid };
  }, [sold]);

  // What sells most today, from the items of today's orders.
  const soldIds = useMemo(() => sold.map((o) => o.id), [sold]);
  const todayItems = useItemsForOrders(orgId, soldIds);
  const top = useMemo(() => {
    const byProduct = new Map<string, { id: string; name: string; qty: number }>();
    todayItems
      .filter((it) => it.status !== 'cancelled')
      .forEach((it) => {
        const key = it.productId || it.productName;
        const row = byProduct.get(key) ?? { id: it.productId, name: it.productName, qty: 0 };
        row.qty += it.quantity;
        byProduct.set(key, row);
      });
    return [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [todayItems]);
  const images = useProductImages(useMemo(() => top.map((t) => t.id).filter(Boolean), [top]));

  const oldest = pass.length ? minutesSince(pass[0], now) : 0;
  const passSummary = activeLoading
    ? 'Cargando…'
    : pass.length === 0
      ? 'Nada en el pase por ahora.'
      : `${pass.length} ${pass.length === 1 ? 'pedido abierto' : 'pedidos abiertos'}, el más antiguo lleva ${oldest} min`;

  const confirmYappy = async (orderId: string, received: boolean) => {
    setConfirmError('');
    try {
      await confirm(orderId, received);
    } catch (e) {
      console.error('[admin] confirm manual payment failed', e);
      setConfirmError(e instanceof Error ? e.message : 'No se pudo confirmar el pago.');
    }
  };

  return (
    <div className="space-y-8">
      {/* El pase: open orders hanging on the rail */}
      <section aria-labelledby="pase" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="pase" className="t-headline-small text-[var(--md-sys-color-on-surface)]">
              En el pase ahora
            </h2>
            <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]" aria-live="polite">
              {passSummary}
            </p>
          </div>
          <Link to="/orders" className="t-label-large text-[var(--md-sys-color-primary)] hover:underline">
            Ver todos los pedidos
          </Link>
        </div>
        {confirmError && (
          <p className="t-body-medium rounded-xl bg-[var(--md-sys-color-error-container)] px-4 py-2 text-[var(--md-sys-color-on-error-container)]">
            {confirmError}
          </p>
        )}

        <div className="-mx-4 pt-3 sm:mx-0">
          <div className="mx-2 h-2 rounded-full bg-[var(--ros-rail)] sm:-mx-2" aria-hidden="true" />
          <div className="-mt-1 flex snap-x gap-5 overflow-x-auto px-6 pb-4 pt-0 sm:px-3">
            {pass.length === 0 && !activeLoading && (
              <div className="t-body-medium mt-4 w-full max-w-sm rounded-md border-2 border-dashed border-[var(--md-sys-color-outline-variant)] px-5 py-6 text-[var(--md-sys-color-on-surface-variant)]">
                Los pedidos nuevos aparecen aquí apenas se hacen, del más antiguo al más nuevo.
              </div>
            )}
            {pass.map((order) => (
              <Ticket
                key={order.id}
                order={order}
                items={itemsByOrder.get(order.id) ?? []}
                now={now}
                busy={busyId === order.id}
                onConfirmYappy={confirmYappy}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 min-[1000px]:grid-cols-[1.35fr_1fr]">
        {/* Caja de hoy */}
        <section aria-labelledby="caja" className="flex flex-col gap-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 id="caja" className="t-title-medium text-[var(--md-sys-color-on-surface-variant)]">
                Caja de hoy
              </h2>
              <p className="t-display-large mt-1 text-[var(--md-sys-color-on-surface)] max-sm:text-[56px]">
                {todayLoading ? '—' : money(stats.revenue)}
              </p>
            </div>
            <dl className="flex gap-8">
              <div>
                <dt className="t-body-small text-[var(--md-sys-color-on-surface-variant)]">Pedidos</dt>
                <dd className="t-number mt-1 text-[32px] font-bold leading-none text-[var(--md-sys-color-on-surface)]">
                  {todayLoading ? '—' : stats.count}
                </dd>
              </div>
              <div>
                <dt className="t-body-small text-[var(--md-sys-color-on-surface-variant)]">Por pedido</dt>
                <dd className="t-number mt-1 text-[32px] font-bold leading-none text-[var(--md-sys-color-on-surface)]">
                  {todayLoading ? '—' : money(stats.avg)}
                </dd>
              </div>
              <div>
                <dt className="t-body-small text-[var(--md-sys-color-on-surface-variant)]">Por cobrar</dt>
                <dd className="t-number mt-1 text-[32px] font-bold leading-none text-[var(--md-sys-color-tertiary)]">
                  {todayLoading ? '—' : money(stats.unpaid)}
                </dd>
              </div>
            </dl>
          </div>
          {todayLoading ? (
            <div role="status" className="flex justify-center py-8">
              <Icon name="progress_activity" size={28} className="animate-spin text-[var(--md-sys-color-primary)]" />
              <span className="sr-only">Cargando…</span>
            </div>
          ) : (
            <HourlyChart orders={todayOrders} />
          )}
        </section>

        {/* Lo que más sale hoy */}
        <section
          aria-labelledby="top"
          className="flex flex-col gap-5 rounded-3xl bg-[var(--ros-rail)] p-6 text-[#ffffff] sm:p-8"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="top" className="t-title-large">
              Lo que más sale hoy
            </h2>
            <Link to="/reports" className="t-label-large text-[var(--ros-saffron)] hover:underline">
              Reportes
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="t-body-medium text-[var(--ros-rail-fg)]">
              Cuando se vendan productos hoy, los más pedidos aparecen aquí.
            </p>
          ) : (
            <ol className="space-y-4">
              {top.map((row, i) => (
                <li key={row.id || row.name} className="flex items-center gap-4">
                  {images[row.id] ? (
                    <img src={images[row.id]} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <span className="t-title-large grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#ffffff]/10" aria-hidden="true">
                      {row.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="t-title-small truncate">{row.name}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-[#ffffff]/10">
                      <div
                        className={cn('h-full rounded-full', i === 0 ? 'bg-[var(--ros-saffron)]' : 'bg-[var(--color-orange-300)]')}
                        style={{ width: `${Math.round((row.qty / top[0].qty) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="t-number w-10 text-right text-[26px] font-bold leading-none">{row.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
