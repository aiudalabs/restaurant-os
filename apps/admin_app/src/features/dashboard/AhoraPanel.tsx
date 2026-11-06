import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { money } from '@/lib/time';
import type { Order, PaymentMethod } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import type { Station } from '@/types/station';
import { orderCode } from './jornada';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yappy: 'Yappy',
  transfer: 'Transferencia',
};
// Four steps of the same ink: the legend names each one, so colour never carries meaning alone.
const METHOD_OPACITY: Record<PaymentMethod, number> = { cash: 1, card: 0.7, yappy: 0.45, transfer: 0.25 };

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h3 id={id} className="t-title-medium text-[var(--ink)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface Props {
  /** Orders waiting for a manual Yappy confirmation. */
  unpaid: Order[];
  lateCount: number;
  fiscalErrors: Order[];
  stations: Station[];
  stationsLoading: boolean;
  /** Items of the orders in the kitchen's flow. */
  items: OrderItem[];
  /** Paid orders of today, for the payment mix. */
  paidToday: Order[];
  busyId: string | null;
  confirmError: string;
  onConfirm: (orderId: string) => void;
}

/** «Ahora»: what needs attention, how loaded each station is and how people are paying. */
export function AhoraPanel({
  unpaid,
  lateCount,
  fiscalErrors,
  stations,
  stationsLoading,
  items,
  paidToday,
  busyId,
  confirmError,
  onConfirm,
}: Props) {
  const nothing = unpaid.length === 0 && lateCount === 0 && fiscalErrors.length === 0;

  // Pending dishes per station.
  const load = new Map<string, number>();
  items.forEach((it) => {
    if (it.status === 'done' || it.status === 'cancelled') return;
    load.set(it.stationId, (load.get(it.stationId) ?? 0) + it.quantity);
  });
  const rows = stations
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: s.name, qty: load.get(s.id) ?? 0 }));
  const maxQty = Math.max(1, ...rows.map((r) => r.qty));

  // Payment mix over collected money.
  const byMethod = new Map<PaymentMethod, number>();
  paidToday.forEach((o) => {
    const m = o.payment?.method;
    if (m) byMethod.set(m, (byMethod.get(m) ?? 0) + o.total);
  });
  const mix = (Object.keys(METHOD_LABEL) as PaymentMethod[])
    .map((m) => ({ method: m, amount: byMethod.get(m) ?? 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const mixTotal = mix.reduce((sum, r) => sum + r.amount, 0);

  return (
    <aside aria-label="Ahora" className="space-y-8">
      <Block id="atencion" title="Requiere atención">
        {nothing ? (
          <p className="t-body-medium flex items-start gap-2 text-[var(--ink-soft)]">
            <Icon name="check_circle" size={20} className="mt-px text-[var(--good-ink)]" />
            Todo en orden. Si un pedido se atrasa, un pago espera o una factura falla, lo verás aquí.
          </p>
        ) : (
          <ul className="space-y-2">
            {unpaid.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <span className="t-body-medium min-w-0">
                  <strong className="t-title-small">{orderCode(o)}</strong> espera su pago por Yappy
                </span>
                <Button size="sm" variant="primary" disabled={busyId === o.id} onClick={() => onConfirm(o.id)}>
                  {busyId === o.id ? 'Confirmando…' : `Confirmar ${money(o.total)}`}
                </Button>
              </li>
            ))}
            {lateCount > 0 && (
              <li>
                <Link
                  to="/orders"
                  className="m3-state flex min-h-11 items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]"
                >
                  <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full bg-[var(--late)]" />
                  <span className="t-body-medium">
                    {lateCount} {lateCount === 1 ? 'pedido lleva' : 'pedidos llevan'} más de 12 min en cocina
                  </span>
                </Link>
              </li>
            )}
            {fiscalErrors.length > 0 && (
              <li>
                <Link
                  to="/orders"
                  search={{ order: fiscalErrors[0].id }}
                  className="m3-state flex min-h-11 items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]"
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 12 12" className="shrink-0">
                    <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="var(--accent)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  <span className="t-body-medium">
                    {fiscalErrors.length} {fiscalErrors.length === 1 ? 'factura falló' : 'facturas fallaron'}; ábrela para reintentar
                  </span>
                </Link>
              </li>
            )}
          </ul>
        )}
        {confirmError && (
          <p role="alert" className="t-body-medium rounded-[10px] bg-[var(--late-wash)] px-3 py-2 text-[var(--late-ink)]">
            {confirmError}
          </p>
        )}
      </Block>

      <Block id="estaciones" title="Carga por estación">
        {stationsLoading ? (
          <p role="status" className="t-body-medium text-[var(--ink-soft)]">
            Cargando estaciones…
          </p>
        ) : rows.length === 0 ? (
          <p className="t-body-medium text-[var(--ink-soft)]">
            Esta sucursal no tiene estaciones activas.{' '}
            <Link to="/stations" className="text-[var(--ink)] underline underline-offset-4">
              Crea una estación
            </Link>{' '}
            para ver cuánto tiene cada una.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <div className="t-body-medium mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[var(--ink)]">{r.name}</span>
                  <span className="tnum text-[var(--ink-soft)]">
                    {r.qty === 0 ? 'libre' : `${r.qty} ${r.qty === 1 ? 'plato' : 'platos'}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--tint)]">
                  <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${(r.qty / maxQty) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="pagos" title="Cómo pagan hoy">
        {mix.length === 0 ? (
          <p className="t-body-medium text-[var(--ink-soft)]">Aún no hay cobros hoy. Cuando entren, verás cuánto va en cada método.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-[var(--tint)]" role="img" aria-label={mix.map((r) => `${METHOD_LABEL[r.method]} ${money(r.amount)}`).join(', ')}>
              {mix.map((r) => (
                <span
                  key={r.method}
                  className="h-full bg-[var(--ink)]"
                  style={{ width: `${(r.amount / mixTotal) * 100}%`, opacity: METHOD_OPACITY[r.method] }}
                />
              ))}
            </div>
            <ul className="space-y-1.5">
              {mix.map((r) => (
                <li key={r.method} className="t-body-medium flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[var(--ink)]" style={{ opacity: METHOD_OPACITY[r.method] }} />
                  <span className="flex-1 text-[var(--ink)]">{METHOD_LABEL[r.method]}</span>
                  <span className="tnum text-[var(--ink-soft)]">{Math.round((r.amount / mixTotal) * 100)} %</span>
                  <span className="tnum w-20 text-right text-[var(--ink)]">{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Block>
    </aside>
  );
}
