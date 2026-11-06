import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order';
import { clock, wallClock } from '@/lib/time';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Esperando pago',
  payment_failed: 'Pago rechazado',
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  in_preparation: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  closed: 'Cerrado',
};

export type Tone = 'good' | 'late' | 'attention' | 'quiet';

/** Visual weight of a status: what needs a person (late), what is done well (good), the rest is quiet. */
export const STATUS_TONES: Record<OrderStatus, Tone> = {
  pending_payment: 'attention',
  payment_failed: 'late',
  pending: 'attention',
  confirmed: 'quiet',
  in_preparation: 'quiet',
  ready: 'good',
  delivered: 'quiet',
  cancelled: 'quiet',
  closed: 'quiet',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yappy: 'Yappy',
  transfer: 'Transferencia',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
};

export const statusLabel = (s: OrderStatus): string => STATUS_LABELS[s] ?? s;
export const statusTone = (s: OrderStatus): Tone => STATUS_TONES[s] ?? 'quiet';

const MONTH = new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' });

/** "13:21" for today, "4 nov, 13:21" otherwise (org timezone). */
export function whenLabel(order: Order, tz: string, now: number): string {
  const ms = order.createdAt?.toMillis?.();
  if (!ms) return '-';
  const at = wallClock(ms, tz);
  const time = clock(at.minutes);
  return at.ymd === wallClock(now, tz).ymd ? time : `${MONTH.format(new Date(ms))}, ${time}`;
}
