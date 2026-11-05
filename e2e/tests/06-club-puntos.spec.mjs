// Flujo 6: Club. Un pedido del cliente ya cobrado le suma puntos: el seguimiento
// avisa "+N puntos ganados" y la página Mi Club los muestra junto con el sello y el nivel.
// El pedido y la visita al Club usan el MISMO contexto de navegador (misma sesión anónima).
// Fuera de alcance (no automatizable): QR de socio con cámara y Google Wallet.
import { test, expect } from '@playwright/test';
import { PRODUCT } from '../lib/env.mjs';
import { fsGet } from '../lib/gcp.mjs';
import {
  customerAdd, customerOpenCart, customerStart, loginWaiter, newPage, orderName, waiterCard, waitForOrder,
} from '../lib/ui.mjs';

test('Club: tras un pedido cobrado, Mi Club muestra los puntos, el sello y el nivel', async ({ browser }) => {
  const name = orderName('club');
  const customer = await newPage(browser, 'customer');
  const waiter = await newPage(browser, 'waiter');
  const cp = customer.page;

  await test.step('el cliente hace un pedido al retirar', async () => {
    await customerStart(cp, name);
    await customerAdd(cp, PRODUCT.margarita.name);
    await customerOpenCart(cp);
    await cp.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(cp).toHaveURL(/\/order\//);
  });
  const order = await waitForOrder(name, (o) => o.status === 'confirmed');

  await test.step('antes de pagar no hay ficha del Club ni puntos', async () => {
    expect(await fsGet(`loyalty_events/earn_${order.id}`)).toBeNull();
    await expect(cp.getByText(/puntos ganados/)).toHaveCount(0);
  });

  await test.step('el mesero cobra el pedido', async () => {
    await loginWaiter(waiter.page);
    const card = waiterCard(waiter.page, name);
    await card.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await waiter.page.getByRole('button', { name: /Efectivo/ }).click();
    await expect(card.getByText(/^Cobrado · Efectivo$/)).toBeVisible();
  });

  let earned = 0;
  await test.step('el servidor registra el evento de puntos (1 punto por balboa, nivel bronce)', async () => {
    let event = null;
    await expect.poll(async () => (event = await fsGet(`loyalty_events/earn_${order.id}`)) !== null, { timeout: 60_000, message: 'loyalty_events/earn_{orderId}' }).toBe(true);
    const paid = (await fsGet(`orders/${order.id}`)).data;
    earned = event.data.points + event.data.bonusPoints;
    expect(event.data.points).toBe(Math.floor(paid.total));
    expect(event.data).toMatchObject({ type: 'earn', orderId: order.id, stampsAfter: 1, tierAfter: 'bronce' });
  });

  await test.step('el seguimiento anuncia los puntos y Mi Club los muestra', async () => {
    await expect(cp.getByText(`+${earned} puntos ganados`)).toBeVisible();
    await cp.getByRole('button', { name: /Ir a Mi Club/ }).click();
    await expect(cp).toHaveURL(/\/club$/);
    await expect(cp.getByText('Pick & Eat Club')).toBeVisible();
    await expect(cp.locator('p').filter({ hasText: new RegExp(`^${earned}\\s*puntos$`) })).toBeVisible();
    await expect(cp.getByText(name, { exact: true })).toBeVisible();
    await expect(cp.getByText('Nivel Bronce')).toBeVisible();
    await expect(cp.getByText('1 de 8')).toBeVisible();
    await expect(cp.getByText('Tarjeta de sellos')).toBeVisible();
  });

  await customer.context.close();
  await waiter.context.close();
});
