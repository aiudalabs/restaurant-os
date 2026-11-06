// Ayudantes de UI y de datos compartidos por los specs. Los selectores usan roles
// y textos visibles; ningún sleep: todo es auto-espera de Playwright o expect.poll.
import { randomBytes } from 'node:crypto';
import { expect } from '@playwright/test';
import { BRANCH, ORG, ORDER_PREFIX, PRODUCT, STATION, URLS } from './env.mjs';
import { fsCommitAsUser, fsGet, findOrdersByPrefix, fsQuery, signInAnonymously } from './gcp.mjs';
import { appendToManifest } from './manifest.mjs';

export const runId = () => process.env.E2E_RUN_ID;
export const waiterName = () => process.env.E2E_WAITER_NAME;
/** Nombre de cliente de un pedido de la batería: lo que permite encontrarlo y borrarlo. */
export const orderName = (flow) => `${ORDER_PREFIX}${runId()}-${flow}`;
export const discount = () => JSON.parse(process.env.E2E_DISCOUNT);

export const money = (n) => `$${n.toFixed(2)}`;
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ─── Datos ─────────────────────────────────────────────────────────────────

/** Espera (con sondeo) al pedido de la batería con ese nombre y lo devuelve como { id, data }. */
export async function waitForOrder(name, predicate = () => true, { timeout = 30_000, message } = {}) {
  let found = null;
  await expect
    .poll(
      async () => {
        const list = await findOrdersByPrefix(name);
        found = list.find((o) => o.data.customerName === name && predicate(o.data)) ?? null;
        return found !== null;
      },
      { timeout, message: message ?? `pedido ${name} con el estado esperado` },
    )
    .toBe(true);
  return found;
}

/** Productos reales de dev (precio, categoría, impuesto) para calcular lo esperado. */
export async function loadProducts() {
  const out = {};
  for (const [key, p] of Object.entries(PRODUCT)) {
    const doc = await fsGet(`products/${p.id}`);
    if (!doc) throw new Error(`No existe products/${p.id} en dev`);
    out[key] = { ...p, price: doc.data.price, categoryId: doc.data.categoryId, taxCode: doc.data.fiscal?.taxCode };
  }
  return out;
}

export async function branchTax() {
  const b = await fsGet(`branches/${BRANCH}`);
  return b.data.taxPercent ?? 0;
}

/**
 * Totales esperados, calculados aquí de forma independiente (por línea, redondeo
 * a centavos) para contrastarlos con lo que muestran las apps y lo que guarda el servidor.
 * `lines`: [{ price, qty, taxRate }]
 */
export function expectedTotals(lines, discountPercent = 0) {
  let subtotal = 0;
  let disc = 0;
  let tax = 0;
  for (const l of lines) {
    const gross = round2(l.price * l.qty);
    const d = round2((gross * discountPercent) / 100);
    subtotal = round2(subtotal + gross);
    disc = round2(disc + d);
    tax = round2(tax + round2((gross - d) * l.taxRate));
  }
  return { subtotal, discountAmount: disc, taxAmount: tax, total: round2(subtotal - disc + tax) };
}

/**
 * Siembra un pedido de cliente exactamente como lo escribe customer_web
 * (lib/api.ts createOrder): sesión anónima + batch por REST con el ID token del
 * cliente, así que las reglas de Firestore SÍ se aplican. Sirve donde la UI del
 * cliente no ofrece ese camino (p. ej. Yappy, que la sucursal no tiene configurado).
 */
export async function seedCustomerOrder({ name, payment, lines }) {
  const { idToken, uid } = await signInAnonymously();
  appendToManifest('anonUids', uid);
  const products = await loadProducts();
  const tax = await branchTax();
  const taken = new Set((await fsQuery('orders', [{ field: 'branchId', op: 'EQUAL', value: BRANCH }])).map((o) => o.data.pickupCode));
  const alphabet = 'ACDEFGHJKMNPQRSTUVWXYZ2345679';
  let code;
  do {
    code = `P-${Array.from({ length: 4 }, () => alphabet[randomBytes(1)[0] % alphabet.length]).join('')}`;
  } while (taken.has(code));

  const orderId = `e2e${randomBytes(9).toString('hex')}`;
  const resolved = lines.map((l) => ({ ...products[l.product], qty: l.qty }));
  const totals = expectedTotals(
    resolved.map((p) => ({ price: p.price, qty: p.qty, taxRate: p.taxCode === '00' ? 0 : tax })),
  );
  const yappy = payment === 'yappy';
  const writes = [
    {
      path: `orders/${orderId}`,
      serverTimestamps: ['createdAt', 'updatedAt'],
      data: {
        id: orderId, orgId: ORG, branchId: BRANCH, tableId: '', tableNumber: code, source: 'qr', createdByUid: uid,
        customerName: name, pickupCode: code, status: yappy ? 'pending_payment' : 'pending',
        subtotal: totals.subtotal, taxAmount: totals.taxAmount, taxPercent: tax, tipAmount: 0, total: totals.total,
        notes: '', itemCount: resolved.reduce((s, p) => s + p.qty, 0),
        payment: yappy ? { method: 'yappy', status: 'pending', payTo: 'E2E-YAPPY-PRUEBA' } : { method: null, status: null },
      },
    },
    ...resolved.map((p) => {
      const itemId = `e2e${randomBytes(9).toString('hex')}`;
      return {
        path: `order_items/${itemId}`,
        serverTimestamps: ['sentToStationAt'],
        data: {
          id: itemId, orgId: ORG, branchId: BRANCH, orderId, createdByUid: uid, stationId: '', tableNumber: code,
          productId: p.id, productName: p.name, categoryId: p.categoryId, quantity: p.qty, unitPrice: p.price,
          totalPrice: round2(p.price * p.qty), modifiers: [], specialInstructions: '', status: 'queued',
        },
      };
    }),
  ];
  await fsCommitAsUser(idToken, writes);
  return { orderId, pickupCode: code, uid };
}

// ─── Páginas ───────────────────────────────────────────────────────────────

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

/** Contexto nuevo = sesión anónima nueva (así el cliente es un uid limpio). */
export async function newPage(browser, kind) {
  const context = await browser.newContext({ viewport: kind === 'customer' ? MOBILE : DESKTOP });
  const page = await context.newPage();
  return { context, page };
}

async function pressDigits(page, digits) {
  for (const d of digits) await page.getByRole('button', { name: d, exact: true }).click();
}

export async function loginWaiter(page, url = URLS.waiter) {
  await page.goto(url);
  await page.getByRole('button', { name: new RegExp(waiterName()) }).click();
  await pressDigits(page, process.env.E2E_WAITER_PIN); // al sexto dígito entra solo
  await expect(page.getByText('Pedidos activos')).toBeVisible();
}

export async function loginKitchen(page) {
  await page.goto(URLS.kitchen);
  await expect(page.getByRole('heading', { name: 'Ingresa tu PIN' })).toBeVisible();
  await pressDigits(page, process.env.E2E_STATION_PIN);
  await page.getByRole('button', { name: '✓', exact: true }).click();
  await expect(page.getByRole('heading', { name: new RegExp(STATION_LABEL) })).toBeVisible();
}
const STATION_LABEL = 'Cocina';

export async function loginAdmin(page) {
  await page.goto(`${URLS.admin}/login`);
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(process.env.E2E_ADMIN_PW);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('link', { name: 'Pedidos' }).first()).toBeVisible();
}

/** El admin (rol dueño) ve todas las sucursales de la org y arranca en la primera: elegir Pick & Eat. */
export async function adminSelectBranch(page, branchName = 'Pick & Eat') {
  const select = page.locator('select:visible').first();
  await select.selectOption({ label: branchName });
  await expect(select.locator('option:checked')).toHaveText(branchName);
}

/** Tarjeta del pedido en la app del mesero, por el nombre del cliente. */
export const waiterCard = (page, name) =>
  page.locator('article.card').filter({ has: page.getByText(name, { exact: true }) });

/** Ticket del pedido en el KDS, por su encabezado (código de retiro o nombre del cliente). */
export const kitchenTicket = (page, header) =>
  page.locator('main > div').filter({ has: page.getByText(header, { exact: true }) });

// ─── Cliente (customer_web) ────────────────────────────────────────────────

/** Entra por el link del QR, escribe el nombre y llega al menú. */
export async function customerStart(page, name) {
  await page.goto(URLS.customer);
  await page.getByPlaceholder('Tu nombre (opcional)').fill(name);
  await page.getByRole('button', { name: 'Ver el menú' }).click();
  await expect(page.getByRole('heading', { name: 'Menú' })).toBeVisible();
}

/** Agrega `qty` unidades del producto con el botón "Agregar" / "+" de su fila. */
export async function customerAdd(page, productName, qty = 1) {
  const row = page.locator('div.rounded-2xl').filter({ has: page.getByText(productName, { exact: true }) });
  await row.getByRole('button', { name: 'Agregar', exact: true }).click();
  for (let i = 1; i < qty; i++) await row.getByRole('button', { name: 'Agregar uno' }).click();
  await expect(row.getByText(String(qty), { exact: true })).toBeVisible();
}

/** Insignia grande de estado del seguimiento (no los rótulos fijos del stepper). */
export const statusPill = (page) =>
  page
    .locator('span.inline-flex.rounded-full')
    .filter({ hasText: /^(Recibido|En cocina|Listo para retirar|Esperando pago|Entregado|Cancelado)$/ });

export async function customerOpenCart(page) {
  await page.getByRole('button', { name: /Ver mi pedido/ }).click();
  await expect(page.getByRole('heading', { name: 'Mi pedido' })).toBeVisible();
}

export { BRANCH, ORG, STATION };
