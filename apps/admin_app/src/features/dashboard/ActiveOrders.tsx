import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { money } from '@/lib/time';
import type { Order, OrderStatus } from '@/types/order';
import { LATE_MINUTES, isKitchenLate, minutesWaiting, orderCode } from './jornada';

const MAX_ROWS = 8;

const STATE: Partial<Record<OrderStatus, string>> = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  in_preparation: 'En cocina',
  ready: 'Listo para entregar',
};

interface Props {
  /** Orders in the kitchen's flow, oldest first. */
  orders: Order[];
  loading: boolean;
  now: number;
}

/** Compact list of the orders in play; each row opens that order in Pedidos. */
export function ActiveOrders({ orders, loading, now }: Props) {
  const shown = orders.slice(0, MAX_ROWS);
  const hidden = orders.length - shown.length;

  return (
    <section aria-labelledby="activos" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="activos" className="t-headline-small text-[var(--ink)]">
          Pedidos activos
        </h2>
        <Link to="/orders" className="t-label-large -my-3 inline-flex min-h-11 items-center rounded-md px-2 text-[var(--ink)] underline underline-offset-4">
          Ver todos los pedidos
        </Link>
      </div>

      {loading ? (
        <p role="status" className="t-body-medium py-6 text-[var(--ink-soft)]">
          Cargando pedidos…
        </p>
      ) : orders.length === 0 ? (
        <p className="t-body-medium max-w-md py-6 text-[var(--ink-soft)]">
          No hay pedidos en juego. Cuando alguien pida por el link o el mesero tome una orden, aparece aquí al instante.
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-[var(--line)]">
          {shown.map((o) => {
            const minutes = minutesWaiting(o, now);
            const late = isKitchenLate(o, now);
            const ready = o.status === 'ready';
            return (
              <li key={o.id}>
                <Link
                  to="/orders"
                  search={{ order: o.id }}
                  className="m3-state flex min-h-14 items-center gap-4 rounded-[10px] px-2 py-2.5 text-[var(--ink)]"
                >
                  <span className="t-number w-[4.75rem] shrink-0 whitespace-nowrap text-xl font-bold leading-none">{orderCode(o)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="t-title-small block truncate">
                      {o.customerName && o.customerName !== orderCode(o) ? o.customerName : `${o.itemCount} ${o.itemCount === 1 ? 'artículo' : 'artículos'}`}
                    </span>
                    <span className="t-body-small flex items-center gap-1.5 text-[var(--ink-soft)]">
                      <span
                        aria-hidden="true"
                        className={cn('h-2 w-2 rounded-full', ready ? 'bg-[var(--good)]' : late ? 'bg-[var(--late)]' : 'bg-[var(--ink-soft)]')}
                      />
                      {STATE[o.status] ?? o.status}
                      {late && <span className="sr-only">, retrasado más de {LATE_MINUTES} minutos</span>}
                    </span>
                  </span>
                  <span
                    className={cn(
                      't-label-large tnum shrink-0 rounded-md px-2 py-0.5',
                      late ? 'bg-[var(--late-wash)] text-[var(--late-ink)]' : 'text-[var(--ink-soft)]',
                    )}
                  >
                    {minutes} min
                  </span>
                  <span className="t-title-small tnum w-16 shrink-0 text-right">{money(o.total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hidden > 0 && (
        <p className="t-body-small mt-2 text-[var(--ink-soft)]">
          y {hidden} más en Pedidos
        </p>
      )}
    </section>
  );
}
