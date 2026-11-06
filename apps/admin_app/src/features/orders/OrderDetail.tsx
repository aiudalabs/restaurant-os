import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import { orderCode } from '@/features/dashboard/jornada';
import { money } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import { DetailRow } from './detail-row';
import { InvoiceSection } from './InvoiceSection';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, statusLabel, statusTone, type Tone } from './order-labels';

const TONE_DOT: Record<Tone, string> = {
  good: 'bg-[var(--good)]',
  late: 'bg-[var(--late)]',
  attention: 'bg-[var(--accent)] ring-1 ring-[var(--ink)]',
  info: 'bg-[var(--brand)]',
  quiet: 'bg-[var(--ink-soft)]',
};

export function StatusDot({ status }: { status: OrderStatus }) {
  return <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TONE_DOT[statusTone(status)])} />;
}

interface Props {
  order: Order;
  items: OrderItem[];
  itemsLoading: boolean;
  when: string;
  title: ReactNode;
  /** Close button (shown when the detail is a sheet and not the sticky pane). */
  closeButton?: ReactNode;
  updating: boolean;
  confirmingPayment: boolean;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onConfirmPayment: (orderId: string, received: boolean) => Promise<void>;
}

type Pending = { kind: 'cancel' } | { kind: 'not-received' } | null;

/** Header, lines, totals, payment, invoice and the actions the order allows in its current state. */
export function OrderDetail({
  order,
  items,
  itemsLoading,
  when,
  title,
  closeButton,
  updating,
  confirmingPayment,
  onUpdateStatus,
  onConfirmPayment,
}: Props) {
  const [actionError, setActionError] = useState('');
  const [confirming, setConfirming] = useState<Pending>(null);

  const waitingYappy = order.status === 'pending_payment' && order.payment?.method === 'yappy';
  const canConfirm = order.status === 'pending';
  const canDeliver = order.status === 'ready';
  const canClose = order.status === 'delivered';
  const canCancel = !['cancelled', 'closed'].includes(order.status);
  const busy = updating || confirmingPayment;

  const run = async (action: () => Promise<void>) => {
    setActionError('');
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0 flex-1">
          {title}
          <p className="t-body-medium mt-1 flex flex-wrap items-center gap-x-2 text-[var(--ink-soft)]">
            <StatusDot status={order.status} />
            <span className="text-[var(--ink)]">{statusLabel(order.status)}</span>
            <span aria-hidden="true">·</span>
            <span className="tnum">{when}</span>
            {order.customerName && order.customerName !== orderCode(order) && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{order.customerName}</span>
              </>
            )}
          </p>
        </div>
        {closeButton}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-5">
        {actionError && (
          <p role="alert" className="t-body-medium rounded-[10px] bg-[var(--late-wash)] px-3 py-2 text-[var(--late-ink)]">
            {actionError}
          </p>
        )}

        {waitingYappy && (
          <p className="t-body-medium rounded-[10px] bg-[var(--accent-wash)] px-3 py-2 text-[var(--accent-ink)]">
            El cliente dice que pagó por Yappy
            {order.payment.payTo ? ` a ${order.payment.payTo}` : ''}. Confirma solo cuando veas el dinero en tu cuenta.
          </p>
        )}

        {order.notes && (
          <div className="t-body-medium flex gap-3 rounded-[10px] bg-[var(--tint)] p-3 text-[var(--ink)]">
            <Icon name="sticky_note_2" size={20} />
            <p>
              <span className="t-label-large">Notas: </span>
              {order.notes}
            </p>
          </div>
        )}

        <section>
          <h3 className="t-title-medium mb-1 text-[var(--ink)]">Artículos</h3>
          {itemsLoading ? (
            <p role="status" className="t-body-medium py-3 text-[var(--ink-soft)]">
              Cargando artículos…
            </p>
          ) : items.length === 0 ? (
            <p className="t-body-medium text-[var(--ink-soft)]">No encontré los artículos de este pedido. Vuelve a abrirlo en unos segundos.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="t-body-large text-[var(--ink)]">
                      <span className="tnum">{item.quantity}×</span> {item.productName}
                    </p>
                    {(item.modifiers?.length ?? 0) > 0 && (
                      <p className="t-body-small text-[var(--ink-soft)]">{item.modifiers?.map((m) => m.value).join(', ')}</p>
                    )}
                    {item.specialInstructions && (
                      <p className="t-body-small italic text-[var(--accent-ink)]">{item.specialInstructions}</p>
                    )}
                  </div>
                  <span className="t-body-medium tnum shrink-0 text-[var(--ink)]">{money(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-[var(--line)] pt-4">
          <h3 className="t-title-medium mb-2 text-[var(--ink)]">Totales</h3>
          <dl className="space-y-1">
            <DetailRow label="Subtotal">{money(order.subtotal)}</DetailRow>
            <DetailRow label={`Impuesto (${(order.taxPercent * 100).toFixed(0)}%)`}>{money(order.taxAmount)}</DetailRow>
            <DetailRow label="Propina">{money(order.tipAmount)}</DetailRow>
            <div className="flex items-baseline justify-between gap-4 pt-2">
              <dt className="t-title-medium text-[var(--ink)]">Total</dt>
              <dd className="t-number tnum text-[28px] font-bold leading-none text-[var(--ink)]">{money(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-[var(--line)] pt-4">
          <h3 className="t-title-medium mb-2 text-[var(--ink)]">Pago</h3>
          <dl className="space-y-1">
            <DetailRow label="Método">
              {order.payment.method ? (PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method) : 'Sin definir'}
            </DetailRow>
            <DetailRow label="Estado">
              {order.payment.status ? (PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status) : 'Pendiente'}
            </DetailRow>
            {order.payment.confirmationNumber && <DetailRow label="Confirmación">{order.payment.confirmationNumber}</DetailRow>}
          </dl>
        </section>

        <InvoiceSection order={order} />

        <p className="t-body-small break-all text-[var(--ink-soft)]">ID {order.id}</p>
      </div>

      {(waitingYappy || canConfirm || canDeliver || canClose || canCancel) && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          {canCancel && !waitingYappy && (
            <Button variant="ghost" className="mr-auto text-[var(--late-ink)]" disabled={busy} onClick={() => setConfirming({ kind: 'cancel' })}>
              Cancelar pedido
            </Button>
          )}
          {waitingYappy && (
            <Button variant="ghost" className="mr-auto text-[var(--late-ink)]" disabled={busy} onClick={() => setConfirming({ kind: 'not-received' })}>
              No llegó el pago
            </Button>
          )}
          {waitingYappy && (
            <Button disabled={busy} onClick={() => run(() => onConfirmPayment(order.id, true))}>
              {confirmingPayment ? 'Confirmando…' : 'Confirmar pago'}
            </Button>
          )}
          {canConfirm && (
            <Button disabled={busy} onClick={() => run(() => onUpdateStatus(order.id, 'confirmed'))}>
              Confirmar pedido
            </Button>
          )}
          {canDeliver && (
            <Button disabled={busy} onClick={() => run(() => onUpdateStatus(order.id, 'delivered'))}>
              Marcar entregado
            </Button>
          )}
          {canClose && (
            <Button variant="tonal" disabled={busy} onClick={() => run(() => onUpdateStatus(order.id, 'closed'))}>
              Cerrar pedido
            </Button>
          )}
        </div>
      )}

      {confirming?.kind === 'cancel' && (
        <ConfirmDialog
          title="¿Cancelar este pedido?"
          message="El pedido sale de la cocina y queda como cancelado. Si el cliente ya pagó, el reembolso se hace por fuera del sistema."
          confirmLabel="Cancelar pedido"
          onClose={() => setConfirming(null)}
          onConfirm={() => onUpdateStatus(order.id, 'cancelled')}
        />
      )}
      {confirming?.kind === 'not-received' && (
        <ConfirmDialog
          title="¿El pago no llegó?"
          message="El pedido se cancela y no pasa a la cocina. Hazlo solo si revisaste tu cuenta de Yappy."
          confirmLabel="No llegó, cancelar"
          onClose={() => setConfirming(null)}
          onConfirm={() => onConfirmPayment(order.id, false)}
        />
      )}
    </div>
  );
}
