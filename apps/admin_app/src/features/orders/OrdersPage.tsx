import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { orderCode } from '@/features/dashboard/jornada';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNow } from '@/hooks/use-now';
import { useOrganization } from '@/hooks/use-organization';
import { useAllOrders, useConfirmManualPayment, useOrderItems, useUpdateOrderStatus } from '@/hooks/use-orders';
import { DEFAULT_TIMEZONE, money } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/order';
import { OrderDetail, StatusDot } from './OrderDetail';
import { squash } from '@/layouts/nav-items';
import { statusLabel, whenLabel } from './order-labels';

interface Filter {
  id: string;
  label: string;
  test: (o: Order) => boolean;
}

const inStatus = (...s: OrderStatus[]) => (o: Order) => s.includes(o.status);

const FILTERS: Filter[] = [
  { id: 'all', label: 'Todos', test: () => true },
  { id: 'unpaid', label: 'Esperando pago', test: inStatus('pending_payment', 'payment_failed') },
  { id: 'new', label: 'Nuevos', test: inStatus('pending') },
  { id: 'kitchen', label: 'En cocina', test: inStatus('confirmed', 'in_preparation') },
  { id: 'ready', label: 'Listos', test: inStatus('ready') },
  { id: 'delivered', label: 'Entregados', test: inStatus('delivered') },
  { id: 'closed', label: 'Cerrados', test: inStatus('closed') },
  { id: 'cancelled', label: 'Cancelados', test: inStatus('cancelled') },
  { id: 'fiscal', label: 'Factura con error', test: (o) => o.fiscal?.status === 'error' },
];

const PAGE = 100;

function matchesText(o: Order, q: string): boolean {
  const needle = q.toLowerCase();
  const flat = squash(q);
  return [o.tableNumber, o.pickupCode, o.customerName, o.id].some(
    (f) => f && (f.toLowerCase().includes(needle) || (flat !== '' && squash(f).includes(flat))),
  );
}

/** Pedidos: state filters, the list, and the open order pinned on the right (a sheet on phones). */
export default function OrdersPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();
  const { organization } = useOrganization(orgId);
  const tz = organization?.timezone || DEFAULT_TIMEZONE;
  const now = useNow(60_000);
  const navigate = useNavigate();
  const { order: openId, q: initialQuery } = useSearch({ from: '/admin/orders' });
  const wide = useMediaQuery('(min-width: 1024px)');

  const { orders, loading } = useAllOrders(orgId, branchId);
  const { items, loading: itemsLoading, fetchItems } = useOrderItems();
  const { updateStatus, updating } = useUpdateOrderStatus();
  const { confirm, busyId } = useConfirmManualPayment();

  const [query, setQuery] = useState(initialQuery ?? '');
  const [filterId, setFilterId] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const out = new Map<string, number>();
    FILTERS.forEach((f) => out.set(f.id, orders.filter(f.test).length));
    return out;
  }, [orders]);

  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const shown = useMemo(
    () => orders.filter((o) => filter.test(o) && (!query || matchesText(o, query))),
    [orders, filter, query],
  );

  // The URL is the source of truth for which order is open (deep links from Inicio and the command bar).
  const selected = openId ? (orders.find((o) => o.id === openId) ?? null) : null;
  const selectedId = selected?.id;
  const selectedOrgId = selected?.orgId;

  useEffect(() => {
    if (selectedId && selectedOrgId) void fetchItems(selectedId, selectedOrgId);
  }, [selectedId, selectedOrgId, fetchItems]);

  const open = (id: string | undefined) =>
    void navigate({ to: '/orders', search: (prev) => ({ ...prev, order: id }), replace: true });

  const detail = selected ? (
    <OrderDetail
      order={selected}
      items={items.filter((i) => i.orderId === selected.id)}
      itemsLoading={itemsLoading}
      when={whenLabel(selected, tz, now)}
      title={
        wide ? (
          <h2 className="t-headline-small text-[var(--ink)]">Pedido · {orderCode(selected)}</h2>
        ) : (
          <Dialog.Title className="t-headline-small text-[var(--ink)]">Pedido · {orderCode(selected)}</Dialog.Title>
        )
      }
      closeButton={
        wide ? undefined : (
          <Dialog.Close aria-label="Cerrar" className="m3-state grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--ink)]">
            <Icon name="close" />
          </Dialog.Close>
        )
      }
      updating={updating}
      confirmingPayment={busyId === selected.id}
      onUpdateStatus={updateStatus}
      onConfirmPayment={confirm}
    />
  ) : null;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-2">
        <h1 className="t-headline-medium text-[var(--ink)]">Pedidos</h1>
        <div className="relative w-full sm:w-96">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
          <input
            type="search"
            aria-label="Buscar pedidos"
            placeholder="Código, nombre o mesa"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            className="t-body-medium h-11 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] pl-10 pr-3 text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
          />
        </div>
      </div>

      <div className="grid items-start gap-x-8 gap-y-4 xl:grid-cols-[11rem_minmax(0,1fr)_28rem] lg:grid-cols-[minmax(0,1fr)_26rem]">
        {/* Filters: a column on wide screens, a scrolling row below */}
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:col-span-2 xl:sticky xl:top-0 xl:col-span-1 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0"
        >
          {FILTERS.map((f) => {
            const n = counts.get(f.id) ?? 0;
            const on = f.id === filterId;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFilterId(f.id);
                  setLimit(PAGE);
                }}
                className={cn(
                  'm3-state t-label-large flex min-h-11 shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 text-left',
                  on ? 'bg-[var(--action)] text-[var(--on-action)]' : 'text-[var(--ink)]',
                  !on && n === 0 && 'text-[var(--ink-soft)]',
                )}
              >
                {f.label}
                <span className="tnum opacity-80">{n}</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <section aria-label="Lista de pedidos" className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {loading ? (
            <p role="status" className="t-body-medium p-8 text-center text-[var(--ink-soft)]">
              Cargando pedidos…
            </p>
          ) : shown.length === 0 ? (
            <div className="mx-auto max-w-sm px-6 py-14 text-center">
              <p className="t-title-medium text-[var(--ink)]">
                {orders.length === 0 ? 'Esta sucursal aún no tiene pedidos' : 'Ningún pedido coincide'}
              </p>
              <p className="t-body-medium mt-2 text-[var(--ink-soft)]">
                {orders.length === 0
                  ? 'Cuando un cliente pida por el link o un mesero tome una orden, aparece aquí.'
                  : 'Cambia el estado o borra la búsqueda para ver más pedidos.'}
              </p>
              {orders.length > 0 && (filterId !== 'all' || query) && (
                <Button
                  variant="tonal"
                  className="mt-4"
                  onClick={() => {
                    setFilterId('all');
                    setQuery('');
                  }}
                >
                  Ver todos los pedidos
                </Button>
              )}
            </div>
          ) : (
            <>
              <ul className="divide-y divide-[var(--line)]">
                {shown.slice(0, limit).map((o) => {
                  const on = o.id === selectedId;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        aria-current={on ? 'true' : undefined}
                        onClick={() => open(o.id)}
                        className={cn(
                          'm3-state flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left text-[var(--ink)]',
                          on && 'bg-[var(--tint)] shadow-[inset_3px_0_0_var(--ink)]',
                        )}
                      >
                        <span className="t-number w-[4.75rem] shrink-0 whitespace-nowrap text-xl font-bold leading-none">{orderCode(o)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="t-title-small block truncate">
                            {o.customerName && o.customerName !== orderCode(o) ? o.customerName : `${o.itemCount} ${o.itemCount === 1 ? 'artículo' : 'artículos'}`}
                          </span>
                          <span className="t-body-small tnum block truncate text-[var(--ink-soft)]">
                            {whenLabel(o, tz, now)} · {o.itemCount} {o.itemCount === 1 ? 'artículo' : 'artículos'}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="t-title-small tnum">{money(o.total)}</span>
                          <span className="t-body-small flex items-center gap-1.5 text-[var(--ink-soft)]">
                            <StatusDot status={o.status} />
                            {statusLabel(o.status)}
                            {o.fiscal?.status === 'error' && <Icon name="receipt" size={14} label="Factura con error" className="text-[var(--late-ink)]" />}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {shown.length > limit && (
                <div className="border-t border-[var(--line)] p-3 text-center">
                  <Button variant="tonal" onClick={() => setLimit((l) => l + PAGE)}>
                    Mostrar {Math.min(PAGE, shown.length - limit)} más
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Detail pinned on wide screens */}
        {wide && (
          <aside
            aria-label="Detalle del pedido"
            className="sticky top-0 flex max-h-[calc(100dvh-9rem)] min-h-64 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
          >
            {detail ?? (
              <div className="m-auto max-w-xs p-8 text-center">
                <p className="t-title-medium text-[var(--ink)]">
                  {openId && !loading ? 'No encontré ese pedido' : 'Elige un pedido'}
                </p>
                <p className="t-body-medium mt-2 text-[var(--ink-soft)]">
                  {openId && !loading
                    ? 'Puede ser de otra sucursal. Cambia de sucursal arriba o busca por su código.'
                    : 'Aquí verás los artículos, el pago y la factura, con las acciones que el pedido permite.'}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Detail as a sheet below 1024px: full screen on phones, side sheet on tablets */}
      {!wide && (
        <Dialog.Root open={!!selected} onOpenChange={(o) => !o && open(undefined)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 [animation:m3-fade-in_120ms_linear]" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-50 bg-[var(--surface)] text-[var(--ink)] [animation:m3-sheet-up_240ms_var(--ease-out)] md:inset-y-0 md:left-auto md:w-[28rem] md:border-l md:border-[var(--line)] md:[animation:m3-sheet-in_240ms_var(--ease-out)]"
            >
              {detail}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
