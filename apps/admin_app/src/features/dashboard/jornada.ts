import type { Branch } from '@/types/branch';
import type { Order } from '@/types/order';
import type { OrderReportRow } from '@/services/report.service';
import { clock, money, parseClock, wallClock, type WeekdayKey } from '@/lib/time';

/** Width of one bar of the day curve. */
export const SLOT_MINUTES = 15;
/** A kitchen order waiting longer than this is late (same threshold the old pass used). */
export const LATE_MINUTES = 12;

export type WindowSource = 'branch' | 'default' | 'closed-day';

export interface DayWindow {
  openMin: number;
  closeMin: number;
  source: WindowSource;
}

const DEFAULT_OPEN = 8 * 60;
const DEFAULT_CLOSE = 22 * 60;

/**
 * Opening window of the branch for a weekday. When the branch has no hours
 * configured (or none for that weekday) we fall back to 08:00-22:00 and say so;
 * a window that closes after midnight is cut at 24:00 because the day curve is
 * built from same-calendar-day orders.
 */
export function dayWindow(branch: Branch | null, weekday: WeekdayKey): DayWindow {
  const hours = branch?.businessHours ?? {};
  const configured = Object.values(hours).some(Boolean);
  const entry = hours[weekday];
  if (!configured) return { openMin: DEFAULT_OPEN, closeMin: DEFAULT_CLOSE, source: 'default' };
  if (!entry) return { openMin: DEFAULT_OPEN, closeMin: DEFAULT_CLOSE, source: 'closed-day' };
  const open = parseClock(entry.open);
  const close = parseClock(entry.close);
  if (open === null || close === null) return { openMin: DEFAULT_OPEN, closeMin: DEFAULT_CLOSE, source: 'default' };
  return { openMin: open, closeMin: close <= open ? 24 * 60 : close, source: 'branch' };
}

/** Widens the window so no order falls outside of it (never hide data). */
export function fitWindow(win: DayWindow, minutes: number[]): DayWindow {
  if (minutes.length === 0) return win;
  const lo = Math.floor(Math.min(...minutes) / 60) * 60;
  const hi = Math.ceil((Math.max(...minutes) + 1) / 60) * 60;
  return { ...win, openMin: Math.min(win.openMin, lo), closeMin: Math.max(win.closeMin, hi) };
}

export function slotCount(win: DayWindow): number {
  return Math.max(1, Math.ceil((win.closeMin - win.openMin) / SLOT_MINUTES));
}

export function slotOf(minutes: number, win: DayWindow): number {
  return Math.floor((minutes - win.openMin) / SLOT_MINUTES);
}

/** One order reduced to what the day curve needs. */
export interface Sale {
  /** Minutes since local midnight, org timezone. */
  minutes: number;
  total: number;
}

/** Cancelled and rejected orders are not sales; unpaid ones are (they are on their way). */
const NOT_A_SALE = new Set(['cancelled', 'payment_failed']);

export function salesFromOrders(orders: Order[], tz: string): Sale[] {
  const out: Sale[] = [];
  orders.forEach((o) => {
    const ms = o.createdAt?.toMillis?.();
    if (!ms || NOT_A_SALE.has(o.status)) return;
    out.push({ minutes: wallClock(ms, tz).minutes, total: o.total });
  });
  return out;
}

export function salesFromReport(rows: OrderReportRow[], ymd: string): Sale[] {
  const out: Sale[] = [];
  rows.forEach((r) => {
    if (r.date !== ymd || NOT_A_SALE.has(r.status)) return;
    const minutes = parseClock(r.time);
    if (minutes !== null) out.push({ minutes, total: r.total });
  });
  return out;
}

export interface Series {
  count: number[];
  revenue: number[];
}

export function buildSeries(sales: Sale[], win: DayWindow): Series {
  const n = slotCount(win);
  const count = new Array<number>(n).fill(0);
  const revenue = new Array<number>(n).fill(0);
  sales.forEach((s) => {
    const i = slotOf(s.minutes, win);
    if (i < 0 || i >= n) return;
    count[i] += 1;
    revenue[i] += s.total;
  });
  return { count, revenue };
}

/** Totals up to and including a slot (the comparison "at this hour last week"). */
export function cumulative(series: Series, upToSlot: number): { count: number; revenue: number } {
  let count = 0;
  let revenue = 0;
  for (let i = 0; i <= Math.min(upToSlot, series.count.length - 1); i++) {
    count += series.count[i];
    revenue += series.revenue[i];
  }
  return { count, revenue };
}

// ─── Events on the curve ───

export type MarkerKind = 'late' | 'fiscal';

export interface Marker {
  kind: MarkerKind;
  slot: number;
  orderId: string;
  /** Short human text for tooltips and screen readers. */
  label: string;
}

export function orderCode(o: Order): string {
  return o.pickupCode || o.tableNumber || o.id.slice(0, 6);
}

/** In the kitchen's hands (or waiting for it) and older than the threshold. */
export function isKitchenLate(o: Order, now: number): boolean {
  if (!['pending', 'confirmed', 'in_preparation'].includes(o.status)) return false;
  const created = o.createdAt?.toMillis?.();
  return !!created && now - created >= LATE_MINUTES * 60_000;
}

export function minutesWaiting(o: Order, now: number): number {
  const created = o.createdAt?.toMillis?.();
  return created ? Math.max(0, Math.floor((now - created) / 60_000)) : 0;
}

/**
 * Notices placed where they happened. A late order sits at the moment it crossed
 * the threshold; a fiscal error at the moment it was paid (or created, if unpaid).
 */
export function buildMarkers(today: Order[], active: Order[], win: DayWindow, tz: string, now: number): Marker[] {
  const out: Marker[] = [];
  const n = slotCount(win);
  const place = (ms: number) => Math.min(n - 1, Math.max(0, slotOf(wallClock(ms, tz).minutes, win)));

  active.forEach((o) => {
    if (!isKitchenLate(o, now)) return;
    const created = o.createdAt.toMillis();
    out.push({
      kind: 'late',
      slot: place(created + LATE_MINUTES * 60_000),
      orderId: o.id,
      label: `Pedido ${orderCode(o)} retrasado: lleva ${minutesWaiting(o, now)} min`,
    });
  });
  today.forEach((o) => {
    if (o.fiscal?.status !== 'error') return;
    const at = o.payment?.paidAt?.toMillis?.() ?? o.createdAt?.toMillis?.();
    if (!at) return;
    out.push({
      kind: 'fiscal',
      slot: place(at),
      orderId: o.id,
      label: `Factura del pedido ${orderCode(o)} con error`,
    });
  });
  return out.sort((a, b) => a.slot - b.slot);
}

// ─── The sentence that titles the page ───

export type Phase = 'before' | 'open' | 'after';

export function phaseOf(nowMin: number, win: DayWindow): Phase {
  if (nowMin < win.openMin) return 'before';
  return nowMin >= win.closeMin ? 'after' : 'open';
}

/** Service period named from the clock; it is a label, not data from the branch. */
export function periodName(nowMin: number): string {
  if (nowMin < 11 * 60) return 'Mañana';
  if (nowMin < 15 * 60) return 'Almuerzo';
  if (nowMin < 18 * 60) return 'Tarde';
  return 'Cena';
}

export interface SentenceInput {
  phase: Phase;
  nowMin: number;
  win: DayWindow;
  /** Orders in the kitchen's flow or ready for pickup (not the ones still waiting for payment). */
  active: Order[];
  now: number;
  soldCount: number;
  soldRevenue: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** After closing: how the day went against the same weekday last week. Null when there is nothing honest to compare. */
export function closingNote(i: { soldRevenue: number; lastWeekRevenue: number | null; weekday: string }): string | null {
  if (i.lastWeekRevenue === null || i.lastWeekRevenue <= 0 || i.soldRevenue <= 0) return null;
  const pct = Math.round((i.soldRevenue / i.lastWeekRevenue - 1) * 100);
  const ref = `el ${i.weekday} pasado (${money(i.lastWeekRevenue)})`;
  if (pct === 0) return `Igual que ${ref}.`;
  return `${Math.abs(pct)} % ${pct > 0 ? 'más' : 'menos'} que ${ref}.`;
}

export function jornadaSentence(i: SentenceInput): string {
  if (i.phase === 'before') return `Aún cerrado. Hoy abre a las ${clock(i.win.openMin)}.`;
  if (i.phase === 'after') {
    return i.soldCount === 0
      ? 'Jornada cerrada. Hoy no hubo pedidos.'
      : `Jornada cerrada. Hoy fueron ${plural(i.soldCount, 'pedido', 'pedidos')} por ${money(i.soldRevenue)}.`;
  }
  const lead = `${periodName(i.nowMin)} en marcha.`;
  if (i.active.length === 0) {
    return i.soldCount === 0
      ? `${lead} Todavía no entra ningún pedido.`
      : `${lead} Sala despejada; van ${plural(i.soldCount, 'pedido', 'pedidos')} hoy.`;
  }
  const oldest = Math.max(...i.active.map((o) => minutesWaiting(o, i.now)));
  return i.active.length === 1
    ? `${lead} 1 pedido activo; lleva ${oldest} min.`
    : `${lead} ${i.active.length} pedidos activos; el más antiguo lleva ${oldest} min.`;
}
