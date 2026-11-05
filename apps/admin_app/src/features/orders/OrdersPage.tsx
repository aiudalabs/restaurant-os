import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Button, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, EmptyState, FilterChip, SideSheet, StatusChip, type StatusTone } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useAllOrders, useOrderItems, useUpdateOrderStatus } from '@/hooks/use-orders';
import { retryInvoice } from '@/services/fiscal.service';
import { printPdf } from '@/lib/print';
import type { FiscalStatus, Order, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Esperando pago',
  payment_failed: 'Pago rechazado',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparacion',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  closed: 'Cerrado',
};

// Tones follow the spec: listo → success, en cocina → info, por cobrar/alerta → error.
const STATUS_TONES: Record<OrderStatus, StatusTone> = {
  pending_payment: 'error',
  payment_failed: 'error',
  pending: 'error',
  confirmed: 'info',
  in_preparation: 'info',
  ready: 'success',
  delivered: 'outline',
  cancelled: 'outline',
  closed: 'outline',
};

// Never render a blank chip if an unknown status ever appears.
const statusLabel = (s: OrderStatus): string => STATUS_LABELS[s] ?? s;
const statusTone = (s: OrderStatus): StatusTone => STATUS_TONES[s] ?? 'outline';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yappy: 'Yappy',
  transfer: 'Transferencia',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
};

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'in_preparation',
  'ready',
  'delivered',
  'cancelled',
  'closed',
];

const money = (n: number): string => `$${n.toFixed(2)}`;
const formatDate = (order: Order): string => order.createdAt?.toDate().toLocaleString('es-PA') ?? '-';

function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="animate-spin rounded-full border-4 border-[var(--md-sys-color-primary)] border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

// ─── Electronic invoice ───

const FISCAL_LABELS: Record<FiscalStatus, string> = {
  pending: 'Generando',
  issuing: 'Generando',
  issued: 'Emitida',
  error: 'Error',
  skipped: 'Sin facturación',
};

const FISCAL_TONES: Record<FiscalStatus, StatusTone> = {
  pending: 'info',
  issuing: 'info',
  issued: 'success',
  error: 'error',
  skipped: 'neutral',
};

/** A `pending` invoice older than this is presumed stuck and can be retried by hand. */
const STUCK_PENDING_MS = 2 * 60 * 1000;

/** Ticks every 15 s so time-based UI (stuck invoices) updates without a reload. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const RECEIVER_LABELS: Record<'01' | '02', string> = {
  '01': 'Contribuyente',
  '02': 'Consumidor final',
};

function InvoiceSection({ order }: { order: Order }) {
  const now = useNow();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const fiscal = order.fiscal;
  const request = order.invoiceRequest;
  if (!fiscal && !request) return null;

  const updatedMs = order.updatedAt?.toDate?.().getTime() ?? 0;
  const stuck = fiscal?.status === 'pending' && updatedMs > 0 && now - updatedMs > STUCK_PENDING_MS;
  const canRetry = fiscal?.status === 'error' || stuck;

  const retry = async () => {
    setRetrying(true);
    setRetryError('');
    try {
      // The live order doc carries the final state; the response only tells us about a new error.
      const result = await retryInvoice(order.id);
      if (result.status === 'error') setRetryError(result.lastError || 'Digifact rechazó la factura.');
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : 'No se pudo reintentar la factura.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section className="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="t-title-medium text-[var(--md-sys-color-on-surface)]">Factura electrónica</h3>
        {fiscal && (
          <StatusChip tone={FISCAL_TONES[fiscal.status] ?? 'outline'} icon="receipt">
            {FISCAL_LABELS[fiscal.status] ?? fiscal.status}
          </StatusChip>
        )}
      </div>
      <dl className="space-y-1">
        {request && (
          <>
            <DetailRow label="Cliente">{request.name}</DetailRow>
            <DetailRow label={request.receiverType === '01' ? 'RUC' : 'Cédula / RUC'}>
              {request.taxId ? `${request.taxId}${request.dv ? ` DV ${request.dv}` : ''}` : '-'}
            </DetailRow>
            <DetailRow label="Tipo">{RECEIVER_LABELS[request.receiverType] ?? request.receiverType}</DetailRow>
          </>
        )}
        {fiscal?.numeroDF && <DetailRow label="Número">{fiscal.numeroDF}</DetailRow>}
        {fiscal?.cufe && (
          <DetailRow label="CUFE">
            <span title={fiscal.cufe} className="break-all">
              {fiscal.cufe.length > 24 ? `${fiscal.cufe.slice(0, 24)}…` : fiscal.cufe}
            </span>
          </DetailRow>
        )}
      </dl>

      {fiscal?.status === 'error' && fiscal.lastError && (
        <p className="t-body-medium mt-3 rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
          {fiscal.lastError}
        </p>
      )}

      {fiscal?.status === 'issued' && (fiscal.pdfUrl || fiscal.qrUrl) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fiscal.pdfUrl && (
            <a
              href={fiscal.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="m3-state t-label-large inline-flex h-10 items-center gap-2 rounded-full bg-[var(--md-sys-color-secondary-container)] px-4 text-[var(--md-sys-color-on-secondary-container)]"
            >
              <Icon name="picture_as_pdf" size={18} /> Ver PDF
            </a>
          )}
          {fiscal.pdfUrl && (
            <Button
              type="button"
              variant="tonal"
              disabled={printing}
              onClick={async () => {
                setPrintError('');
                setPrinting(true);
                try {
                  await printPdf(fiscal.pdfUrl as string);
                } catch (e) {
                  setPrintError(e instanceof Error ? e.message : 'No se pudo imprimir');
                } finally {
                  setPrinting(false);
                }
              }}
            >
              <Icon name="print" size={18} /> {printing ? 'Imprimiendo…' : 'Imprimir'}
            </Button>
          )}
          {fiscal.qrUrl && (
            <a
              href={fiscal.qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="m3-state t-label-large inline-flex h-10 items-center gap-2 rounded-full px-3 text-[var(--md-sys-color-primary)]"
            >
              <Icon name="open_in_new" size={18} /> Consultar en la DGI
            </a>
          )}
          {printError && <p className="t-body-small w-full text-[var(--md-sys-color-error)]">{printError}</p>}
        </div>
      )}

      {retryError && (
        <p role="alert" className="t-body-medium mt-3 rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
          {retryError}
        </p>
      )}

      {canRetry && (
        <Button variant="tonal" icon={retrying ? undefined : 'refresh'} className="mt-3" disabled={retrying} onClick={retry}>
          {retrying && <Icon name="progress_activity" size={18} className="animate-spin" />}
          {retrying ? 'Reintentando…' : 'Reintentar factura'}
        </Button>
      )}
    </section>
  );
}

// ─── Order Detail Sheet ───

interface OrderDetailSheetProps {
  order: Order;
  items: OrderItem[];
  itemsLoading: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updating: boolean;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">{label}</dt>
      <dd className="t-body-medium text-right tabular-nums text-[var(--md-sys-color-on-surface)]">{children}</dd>
    </div>
  );
}

function OrderDetailSheet({ order, items, itemsLoading, onClose, onUpdateStatus, updating }: OrderDetailSheetProps) {
  const [actionError, setActionError] = useState('');

  const canConfirm = order.status === 'pending';
  const canDeliver = order.status === 'ready';
  const canClose = order.status === 'delivered';
  const canCancel = !['cancelled', 'closed'].includes(order.status);

  const run = async (status: OrderStatus) => {
    setActionError('');
    try {
      await onUpdateStatus(order.id, status);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo actualizar el pedido.');
    }
  };

  // Status actions live in the pinned footer so they stay reachable on phones.
  const actions =
    canConfirm || canDeliver || canClose || canCancel ? (
      <>
        {canCancel && (
          <Button variant="ghost" icon="cancel" className="text-[var(--md-sys-color-error)]" disabled={updating} onClick={() => run('cancelled')}>
            Cancelar
          </Button>
        )}
        {canClose && (
          <Button variant="tonal" icon="lock" disabled={updating} onClick={() => run('closed')}>
            Cerrar
          </Button>
        )}
        {canDeliver && (
          <Button icon="local_shipping" disabled={updating} onClick={() => run('delivered')}>
            Marcar entregado
          </Button>
        )}
        {canConfirm && (
          <Button icon="check_circle" disabled={updating} onClick={() => run('confirmed')}>
            Confirmar
          </Button>
        )}
      </>
    ) : undefined;

  return (
    <SideSheet title={`Pedido · ${order.tableNumber}`} onClose={onClose} footer={actions}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusChip>
          <span className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">{formatDate(order)}</span>
        </div>

        {actionError && (
          <p role="alert" className="t-body-medium rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
            {actionError}
          </p>
        )}

        {order.notes && (
          <div className="flex gap-3 rounded-xl bg-[var(--md-sys-color-secondary-container)] p-4 text-[var(--md-sys-color-on-secondary-container)]">
            <Icon name="sticky_note_2" size={20} />
            <p className="t-body-medium">
              <span className="t-label-large">Notas: </span>
              {order.notes}
            </p>
          </div>
        )}

        <section>
          <h3 className="t-title-medium mb-2 text-[var(--md-sys-color-on-surface)]">Items del pedido</h3>
          {itemsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size={20} />
            </div>
          ) : items.length === 0 ? (
            <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">No se encontraron items.</p>
          ) : (
            <ul className="divide-y divide-[var(--md-sys-color-outline-variant)]">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="t-body-large text-[var(--md-sys-color-on-surface)]">
                      <span className="tabular-nums">{item.quantity}×</span> {item.productName}
                    </p>
                    {(item.modifiers?.length ?? 0) > 0 && (
                      <p className="t-body-small text-[var(--md-sys-color-on-surface-variant)]">
                        {item.modifiers?.map((m) => m.value).join(', ')}
                      </p>
                    )}
                    {item.specialInstructions && (
                      <p className="t-body-small italic text-[var(--md-sys-color-tertiary)]">{item.specialInstructions}</p>
                    )}
                  </div>
                  <span className="t-body-medium shrink-0 tabular-nums text-[var(--md-sys-color-on-surface)]">
                    {money(item.totalPrice)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <h3 className="t-title-medium mb-2 text-[var(--md-sys-color-on-surface)]">Totales</h3>
          <dl className="space-y-1">
            <DetailRow label="Subtotal">{money(order.subtotal)}</DetailRow>
            <DetailRow label={`Impuesto (${(order.taxPercent * 100).toFixed(0)}%)`}>{money(order.taxAmount)}</DetailRow>
            <DetailRow label="Propina">{money(order.tipAmount)}</DetailRow>
            <div className="flex items-baseline justify-between gap-4 pt-2">
              <dt className="t-title-medium text-[var(--md-sys-color-on-surface)]">Total</dt>
              <dd className="t-title-large text-[var(--md-sys-color-primary)]">
                <span className="tabular-nums">{money(order.total)}</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <h3 className="t-title-medium mb-2 text-[var(--md-sys-color-on-surface)]">Pago</h3>
          <dl className="space-y-1">
            <DetailRow label="Metodo">
              {order.payment.method ? PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method : 'No definido'}
            </DetailRow>
            <DetailRow label="Estado">
              {order.payment.status ? PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status : 'Pendiente'}
            </DetailRow>
            {order.payment.confirmationNumber && (
              <DetailRow label="Confirmacion">{order.payment.confirmationNumber}</DetailRow>
            )}
          </dl>
        </section>

        <InvoiceSection order={order} />

        <p className="t-body-small break-all text-[var(--md-sys-color-on-surface-variant)]">ID {order.id}</p>
      </div>
    </SideSheet>
  );
}

// ─── Orders Page ───

export default function OrdersPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();

  const { orders, loading } = useAllOrders(orgId, branchId);
  const { items, loading: itemsLoading, fetchItems } = useOrderItems();
  const { updateStatus, updating } = useUpdateOrderStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          order.tableNumber.toLowerCase().includes(q) ||
          order.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<OrderStatus, number>> = {};
    for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, [orders]);

  // Follow the live doc so fiscal updates (Cloud Function / BFF) show up in the open sheet.
  const liveSelected = selectedOrder ? (orders.find((o) => o.id === selectedOrder.id) ?? selectedOrder) : null;

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    fetchItems(order.id, order.orgId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full sm:max-w-md">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]"
          />
          <input
            type="search"
            aria-label="Buscar pedidos"
            placeholder="Buscar por cliente, mesa o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="t-body-large h-14 w-full rounded-full bg-[var(--md-sys-color-surface-container-high)] pl-14 pr-14 text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)] [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <IconButton
              icon="close"
              label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            />
          )}
        </div>
        <div role="group" aria-label="Filtrar por estado" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <FilterChip selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            Todos <span className="tabular-nums opacity-80">{orders.length}</span>
          </FilterChip>
          {ALL_STATUSES.map((s) => (
            <FilterChip key={s} selected={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {STATUS_LABELS[s]} <span className="tabular-nums opacity-80">{statusCounts[s] ?? 0}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt_long"
            title="No se encontraron pedidos."
            body={statusFilter !== 'all' || searchQuery ? 'Prueba con otro estado o búsqueda.' : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="t-label-medium flex items-center gap-4 border-b border-[var(--md-sys-color-outline-variant)] px-4 py-3 text-[var(--md-sys-color-on-surface-variant)]">
            <span className="flex-1">Cliente / Mesa</span>
            <span>Estado · Total</span>
          </div>
          <ul className="divide-y divide-[var(--md-sys-color-outline-variant)]">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => handleViewOrder(order)}
                  className="m3-state flex w-full items-center gap-4 px-4 py-3 text-left text-[var(--md-sys-color-on-surface)]"
                >
                  <span
                    aria-hidden="true"
                    className="t-title-medium grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
                  >
                    {order.tableNumber.trim().charAt(0).toUpperCase() || '#'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-title-medium block truncate">{order.tableNumber}</span>
                    <span className="t-body-medium block truncate text-[var(--md-sys-color-on-surface-variant)]">
                      {order.itemCount} ítems · {formatDate(order)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <span className="flex items-center gap-1">
                      {order.fiscal?.status === 'issued' && (
                        <span title="Factura emitida" aria-label="Factura emitida" className="text-[var(--md-sys-color-primary)]">
                          <Icon name="receipt" size={18} />
                        </span>
                      )}
                      <StatusChip tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusChip>
                    </span>
                    <span className="t-title-medium min-w-[4.5rem] text-right">
                      <span className="tabular-nums">{money(order.total)}</span>
                    </span>
                  </span>
                  <Icon name="chevron_right" className="max-sm:hidden text-[var(--md-sys-color-on-surface-variant)]" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {liveSelected && (
        <OrderDetailSheet
          order={liveSelected}
          items={items}
          itemsLoading={itemsLoading}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (orderId, status) => {
            await updateStatus(orderId, status);
            setSelectedOrder((prev) => prev ? { ...prev, status } : null);
          }}
          updating={updating}
        />
      )}
    </div>
  );
}
