// Flujo 3: el mesero crea un pedido por nombre de cliente, aplica un descuento
// configurado de la organización, cobra en efectivo y los totales cuadran con un
// cálculo independiente (por línea, redondeo a centavos).
import { test, expect } from '@playwright/test';
import { PRODUCT, STATION } from '../lib/env.mjs';
import { fsGet, fsQuery, rtdbGet } from '../lib/gcp.mjs';
import {
  branchTax, discount, expectedTotals, kitchenTicket, loadProducts, loginKitchen, loginWaiter, money, newPage, orderName,
  waiterCard, waitForOrder,
} from '../lib/ui.mjs';

test('mesero: pedido por nombre, descuento configurado, cobro en efectivo y totales exactos', async ({ browser }) => {
  const name = orderName('mesero');
  const disc = discount();
  const products = await loadProducts();
  const tax = await branchTax();
  const rate = (p) => (p.taxCode === '00' ? 0 : tax);
  const lines = [
    { price: products.margarita.price, qty: 2, taxRate: rate(products.margarita) },
    { price: products.pepperoni.price, qty: 1, taxRate: rate(products.pepperoni) },
  ];
  const plain = expectedTotals(lines);
  const withDiscount = expectedTotals(lines, disc.percent);
  expect(withDiscount.total).toBeLessThan(plain.total); // el descuento tiene efecto

  const waiter = await newPage(browser, 'waiter');
  const kitchen = await newPage(browser, 'kitchen');
  const wp = waiter.page;

  await test.step('el mesero crea el pedido por nombre de cliente', async () => {
    await loginWaiter(wp);
    await wp.getByRole('button', { name: '+ Nuevo pedido' }).click();
    await wp.locator('#cart-customer').fill(name);
    await wp.getByRole('button', { name: 'Pizzas', exact: true }).click();
    const menu = wp.locator('main');
    await menu.getByRole('button', { name: `Agregar ${PRODUCT.margarita.name}` }).click();
    await menu.getByRole('button', { name: `Agregar ${PRODUCT.margarita.name}` }).click();
    await menu.getByRole('button', { name: `Agregar ${PRODUCT.pepperoni.name}` }).click();
    await wp.getByRole('button', { name: 'Enviar a cocina' }).click();
    await expect(wp.getByText('Pedidos activos')).toBeVisible();
  });

  await test.step('el servidor recalcula los totales (sin descuento) y enruta a cocina', async () => {
    const order = await waitForOrder(name, (o) => o.status === 'confirmed' && o.total === plain.total, {
      message: `total sin descuento esperado ${plain.total}`,
    });
    expect(order.data).toMatchObject({ source: 'waiter', subtotal: plain.subtotal, taxAmount: plain.taxAmount, itemCount: 3 });
    const items = await fsQuery('order_items', [{ field: 'orderId', op: 'EQUAL', value: order.id }]);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.data.stationId === STATION)).toBe(true);
    await expect
      .poll(async () => Object.keys((await rtdbGet(`order_items/${STATION}`)) ?? {}).filter((k) => k.startsWith(`${order.id}_`)).length)
      .toBe(2);
    await loginKitchen(kitchen.page);
    await expect(kitchenTicket(kitchen.page, name)).toBeVisible();
  });

  const card = waiterCard(wp, name);
  let paidOrderId = '';
  await test.step('cobrar: aplica el descuento y la hoja muestra los montos esperados', async () => {
    await expect(card.getByText(money(plain.total), { exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Cobrar', exact: true }).click();
    const sheet = wp.locator('div.sheet');
    await expect(sheet.getByText(`Cobrar a ${name}`)).toBeVisible();
    await expect(sheet.getByText(money(plain.total), { exact: true })).toBeVisible();
    await sheet.getByRole('button', { name: `${disc.name} ${disc.percent}%` }).click();
    await expect(sheet.getByText(`${disc.name} (${disc.percent}%) −${money(withDiscount.discountAmount)}`)).toBeVisible();
    await expect(sheet.getByText(money(withDiscount.total), { exact: true })).toBeVisible();

    const order = await waitForOrder(name, (o) => o.discount?.id === disc.id && o.total === withDiscount.total);
    expect(order.data).toMatchObject({
      subtotal: plain.subtotal,
      discountAmount: withDiscount.discountAmount,
      taxAmount: withDiscount.taxAmount,
      total: withDiscount.total,
    });
    expect(order.data.discount).toMatchObject({ percent: disc.percent, amount: withDiscount.discountAmount });
  });

  await test.step('cobrar en efectivo: pagado, con el total con descuento', async () => {
    await wp.getByRole('button', { name: /Efectivo/ }).click();
    await expect(card.getByText(/^Cobrado · Efectivo$/)).toBeVisible();
    await expect(card.getByText(money(withDiscount.total), { exact: true })).toBeVisible();
    const order = await waitForOrder(name, (o) => o.payment?.status === 'paid');
    expect(order.data.payment).toMatchObject({ method: 'cash', recordedBy: process.env.E2E_WAITER_UID });
    expect(order.data.total).toBe(withDiscount.total);

    paidOrderId = order.id;
    const audit = await fsQuery('audit_log', [{ field: 'orderId', op: 'EQUAL', value: order.id }]);
    const paid = audit.find((a) => a.data.type === 'order_paid');
    expect(paid?.data.amount).toBe(withDiscount.total);
    expect(audit.some((a) => a.data.type === 'discount_applied' && a.data.discountId === disc.id)).toBe(true);
  });

  await test.step('factura de un pedido con descuento: hoy el BFF la rechaza a propósito (issue #81 pendiente)', async () => {
    // Caracterización, no deseo: apps/fastapi_bff/app/fiscal/nuc.py lanza FiscalConfigError mientras la
    // estructura NUC `Discounts` no exista. Cuando #81 se implemente, esperar fiscal.status "issued".
    let fiscal;
    await expect
      .poll(async () => (fiscal = (await fsGet(`orders/${paidOrderId}`)).data.fiscal)?.status, { timeout: 120_000, intervals: [3000] })
      .toMatch(/^(issued|error)$/);
    test.info().annotations.push({ type: 'hallazgo', description: `fiscal.status=${fiscal.status} lastError=${fiscal.lastError ?? ''}` });
    expect(fiscal.status).toBe('error');
    expect(fiscal.lastError).toContain('Discounts');
  });

  await waiter.context.close();
  await kitchen.context.close();
});
