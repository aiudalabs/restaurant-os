/**
 * Fixture data for the demo mode (`npm run demo`). Pick & Eat sample orders built
 * relative to "now", so the page looks alive at any hour. Nothing here is real.
 * This folder is only reachable through the aliases in vite.config.ts (dev server,
 * `--mode demo`); a production build never imports it.
 */
import { Timestamp } from 'firebase/firestore';
import type { Branch } from '@/types/branch';
import type { Order, OrderStatus, PaymentMethod } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import type { Organization } from '@/types/organization';
import type { Station } from '@/types/station';
import type { AppUser } from '@/types/user';
import type { OrderReportRow } from '@/services/report.service';
import { DEFAULT_TIMEZONE, clock, wallClock } from '@/lib/time';

export const ORG_ID = 'demo-org';
export const BRANCH_ID = 'demo-branch';
const TAX = 0.07;
const MIN = 60_000;

const ts = (ms: number) => Timestamp.fromMillis(ms);

export const demoUser: AppUser = {
  id: 'demo-user',
  orgId: ORG_ID,
  branchIds: [BRANCH_ID],
  email: 'marisol@pickandeat.example',
  displayName: 'Marisol Quintero',
  role: 'admin',
  isActive: true,
  createdAt: ts(Date.now()),
};

export const demoOrganization: Organization = {
  id: ORG_ID,
  name: 'Pick & Eat',
  slug: 'pick-and-eat',
  plan: 'growth',
  defaultCurrency: 'USD',
  defaultTaxPercent: 7,
  defaultTipOptions: [0, 10, 15],
  timezone: DEFAULT_TIMEZONE,
  isActive: true,
  createdAt: ts(Date.now()),
  ownerId: 'demo-user',
};

const open = { open: '11:00', close: '22:00' };
export const demoBranches: Branch[] = [
  {
    id: BRANCH_ID,
    orgId: ORG_ID,
    name: 'Pick & Eat',
    address: 'Panamá',
    menuId: 'demo-menu',
    taxPercent: 7,
    isActive: true,
    businessHours: { monday: open, tuesday: open, wednesday: open, thursday: open, friday: open, saturday: open, sunday: open },
    createdAt: ts(Date.now()),
  },
];

export const demoStations: Station[] = [
  { id: 'st-cocina', orgId: ORG_ID, branchId: BRANCH_ID, name: 'Cocina', categoryIds: ['pizzas'], fcmTokens: [], color: '#101a33', isActive: true },
  { id: 'st-bar', orgId: ORG_ID, branchId: BRANCH_ID, name: 'Bar', categoryIds: ['jugos'], fcmTokens: [], color: '#ffb000', isActive: true },
];

interface Product {
  id: string;
  name: string;
  price: number;
  station: 'st-cocina' | 'st-bar';
  category: string;
}

const PRODUCTS: Product[] = [
  { id: 'p-margarita', name: 'Pizza Margarita', price: 8.5, station: 'st-cocina', category: 'pizzas' },
  { id: 'p-pepperoni', name: 'Pizza Pepperoni', price: 9.5, station: 'st-cocina', category: 'pizzas' },
  { id: 'p-naranja', name: 'Jugo de naranja', price: 3, station: 'st-bar', category: 'jugos' },
  { id: 'p-pina', name: 'Jugo de piña', price: 3, station: 'st-bar', category: 'jugos' },
  { id: 'p-maracuya', name: 'Jugo de maracuyá', price: 3.25, station: 'st-bar', category: 'jugos' },
];

const NAMES = ['Ana', 'Luis', 'Carla', 'Diego', 'Mónica', 'Rafael', 'Sofía', 'Andrés', 'Valeria', 'Javier', 'Lucía', 'Mateo', 'Paola', 'Omar', 'Daniela', 'Hugo'];
const CODE_ALPHABET = 'ACDEFGHJKMNPQRSTUVWXYZ2345679';

/** Small deterministic generator so the screenshots do not change between runs. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Draft {
  ageMin: number;
  status: OrderStatus;
  method: PaymentMethod | null;
  paid: boolean;
  fiscal?: 'issued' | 'error';
}

interface Seed {
  orders: Order[];
  items: OrderItem[];
}

function build(now: number): Seed {
  const rand = rng(7);
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];
  const minutesNow = wallClock(now, DEFAULT_TIMEZONE).minutes;
  const openMin = 11 * 60;

  // Sales so far today, shaped like a lunch rush; older ones are done and paid.
  const drafts: Draft[] = [];
  const shape = [1, 2, 2, 3, 5, 6, 7, 5, 4, 3, 3, 2];
  const elapsedSlots = Math.max(0, Math.floor((minutesNow - openMin) / 15));
  for (let s = 0; s < elapsedSlots; s++) {
    const n = shape[Math.min(s, shape.length - 1)];
    for (let k = 0; k < n; k++) {
      const ageMin = (elapsedSlots - s) * 15 - Math.floor(rand() * 14) - 1;
      if (ageMin < 26) continue; // the last minutes are written by hand below
      const method = pick<PaymentMethod>(['cash', 'card', 'card', 'yappy']);
      drafts.push({ ageMin, status: rand() < 0.8 ? 'closed' : 'delivered', method, paid: true, fiscal: 'issued' });
    }
  }
  // One invoice that Digifact rejected, an hour or so ago.
  const rejected = drafts.find((d) => d.ageMin > 60 && d.method === 'card');
  if (rejected) rejected.fiscal = 'error';
  // One cancelled.
  const cancelled = drafts.find((d) => d.ageMin > 90 && d.method === 'cash');
  if (cancelled) {
    cancelled.status = 'cancelled';
    cancelled.paid = false;
    cancelled.fiscal = undefined;
  }

  // The last half hour, by hand: what is happening right now.
  drafts.push(
    { ageMin: 25, status: 'delivered', method: 'card', paid: true, fiscal: 'issued' },
    { ageMin: 22, status: 'ready', method: 'cash', paid: true },
    { ageMin: 16, status: 'in_preparation', method: 'card', paid: true },
    { ageMin: 14, status: 'in_preparation', method: 'yappy', paid: true },
    { ageMin: 11, status: 'ready', method: 'card', paid: true },
    { ageMin: 9, status: 'confirmed', method: 'cash', paid: true },
    { ageMin: 7, status: 'in_preparation', method: 'card', paid: true },
    { ageMin: 5, status: 'confirmed', method: 'yappy', paid: true },
    { ageMin: 3, status: 'pending', method: 'cash', paid: false },
    { ageMin: 2, status: 'pending_payment', method: 'yappy', paid: false },
    { ageMin: 1, status: 'confirmed', method: 'card', paid: true },
  );

  const orders: Order[] = [];
  const items: OrderItem[] = [];
  const used = new Set<string>();

  drafts
    .sort((a, b) => b.ageMin - a.ageMin)
    .forEach((d, idx) => {
      const id = `ord-${String(idx + 1).padStart(3, '0')}`;
      let code = '';
      do {
        code = `P-${Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join('')}`;
      } while (used.has(code));
      used.add(code);

      const lineCount = 1 + Math.floor(rand() * 3);
      const lines = Array.from({ length: lineCount }, () => ({ product: pick(PRODUCTS), qty: 1 + Math.floor(rand() * 2) }));
      const createdMs = now - d.ageMin * MIN;
      let subtotal = 0;
      let count = 0;
      lines.forEach((l, li) => {
        subtotal += l.product.price * l.qty;
        count += l.qty;
        const done = ['ready', 'delivered', 'closed'].includes(d.status);
        items.push({
          id: `${id}-i${li}`,
          orgId: ORG_ID,
          branchId: BRANCH_ID,
          orderId: id,
          stationId: l.product.station,
          tableNumber: code,
          productId: l.product.id,
          productName: l.product.name,
          categoryId: l.product.category,
          quantity: l.qty,
          unitPrice: l.product.price,
          totalPrice: l.product.price * l.qty,
          modifiers: [],
          status: d.status === 'cancelled' ? 'cancelled' : done ? 'done' : d.status === 'in_preparation' ? 'in_progress' : 'queued',
          sentToStationAt: ts(createdMs),
        });
      });
      const taxAmount = Math.round(subtotal * TAX * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;
      const name = pick(NAMES);
      orders.push({
        id,
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        tableId: '',
        tableNumber: code,
        customerName: name,
        pickupCode: code,
        source: 'qr',
        status: d.status,
        subtotal,
        taxAmount,
        taxPercent: TAX,
        tipAmount: 0,
        total,
        payment: {
          method: d.method,
          status: d.paid ? 'paid' : 'pending',
          ...(d.paid ? { paidAt: ts(createdMs + 20_000) } : {}),
          ...(d.method === 'yappy' && !d.paid ? { payTo: '@pickandeat' } : {}),
        },
        itemCount: count,
        createdAt: ts(createdMs),
        updatedAt: ts(createdMs + 40_000),
        ...(d.fiscal === 'issued'
          ? { fiscal: { status: 'issued' as const, numeroDF: String(1200 + idx), attempts: 1, cufe: `FE01200000000000-${idx}-DEMO-CUFE-0000000000` } }
          : d.fiscal === 'error'
            ? {
                fiscal: { status: 'error' as const, attempts: 2, lastError: 'El RUC del receptor no es válido para la DGI. Corrige el RUC y reintenta.' },
                invoiceRequest: { receiverType: '01' as const, taxId: '8-123-456', dv: '00', name: 'Inversiones Costa Verde' },
              }
            : {}),
      });
    });

  return { orders: orders.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()), items };
}

/** Same weekday last week: two meal peaks, a little busier at dinner than today. */
export function buildLastWeekRows(startIso: string): OrderReportRow[] {
  const rand = rng(21);
  const ymd = wallClock(new Date(startIso).getTime() + MIN, DEFAULT_TIMEZONE).ymd;
  const rows: OrderReportRow[] = [];
  const shape = [1, 2, 3, 4, 6, 7, 6, 5, 3, 2, 2, 3, 4, 5, 4, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  shape.forEach((n, s) => {
    for (let k = 0; k < n; k++) {
      const minutes = 11 * 60 + s * 15 + Math.floor(rand() * 15);
      if (minutes >= 22 * 60) continue;
      const total = Math.round((8 + rand() * 14) * 100) / 100;
      rows.push({
        id: `lw-${s}-${k}`,
        date: ymd,
        time: clock(minutes),
        label: `P-${Math.floor(rand() * 9000 + 1000)}`,
        source: 'qr',
        status: 'closed',
        items: '1 Pizza Margarita',
        subtotal: total,
        tax: 0,
        tip: 0,
        total,
        paymentMethod: 'card',
        paymentStatus: 'paid',
      });
    }
  });
  return rows;
}

// ─── Mutable in-memory store (so the demo's actions work) ───

let seed: Seed | null = null;
const listeners = new Set<() => void>();

/** `?setup=empty` shows a brand-new restaurant: no menu, no waiter, no orders (first-use panel). */
export const isEmptySetup = (): boolean => new URLSearchParams(window.location.search).get('setup') === 'empty';

export function store(): Seed {
  if (!seed) seed = isEmptySetup() ? { orders: [], items: [] } : build(Date.now());
  return seed;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function patchOrder(id: string, patch: (o: Order) => Order): void {
  const s = store();
  s.orders = s.orders.map((o) => (o.id === id ? patch(o) : o));
  listeners.forEach((fn) => fn());
}
