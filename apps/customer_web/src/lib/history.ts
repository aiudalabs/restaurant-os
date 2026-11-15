import type { OrderDoc, OrderStatus } from '../types';

/** How many past orders the list shows. */
export const HISTORY_LIMIT = 30;

/** Newest first, capped. Sorting happens here so the query needs no composite index. */
export function sortHistory(orders: OrderDoc[], limit = HISTORY_LIMIT): OrderDoc[] {
  return [...orders].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, limit);
}

export type StatusTone = 'active' | 'done' | 'problem';

const STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: 'Esperando pago', tone: 'problem' },
  payment_failed: { label: 'Pago rechazado', tone: 'problem' },
  pending: { label: 'Recibido', tone: 'active' },
  confirmed: { label: 'Recibido', tone: 'active' },
  in_preparation: { label: 'En cocina', tone: 'active' },
  ready: { label: 'Listo para retirar', tone: 'active' },
  delivered: { label: 'Entregado', tone: 'done' },
  closed: { label: 'Entregado', tone: 'done' },
  cancelled: { label: 'Cancelado', tone: 'problem' },
};

export function statusInfo(status: OrderStatus): { label: string; tone: StatusTone } {
  return STATUS[status] ?? STATUS.pending;
}

/** "6 nov 2026, 2:22 a. m." in the device's own locale/timezone. */
export function historyDate(ms: number): string {
  return new Date(ms).toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });
}
