// Flujo 1: el cliente pide desde el menú y elige pagar al retirar -> ve su número
// -> el pedido aparece en el KDS -> cocina lo marca listo -> el seguimiento del
// cliente muestra "Listo para retirar".
import { test, expect } from '@playwright/test';
import { PRODUCT, STATION } from '../lib/env.mjs';
import { rtdbGet } from '../lib/gcp.mjs';
import {
  customerAdd, customerOpenCart, customerStart, kitchenTicket, loginKitchen, newPage, orderName, statusPill, waitForOrder,
} from '../lib/ui.mjs';

test('cliente pide al retirar, cocina lo prepara y el seguimiento lo muestra listo', async ({ browser }) => {
  const name = orderName('retirar');
  const customer = await newPage(browser, 'customer');
  const kitchen = await newPage(browser, 'kitchen');
  const cp = customer.page;
  const kp = kitchen.page;

  await test.step('cliente arma el pedido y confirma (pagar al retirar)', async () => {
    await customerStart(cp, name);
    await customerAdd(cp, PRODUCT.margarita.name);
    await customerOpenCart(cp);
    // La sucursal no tiene Yappy ni tarjeta: "Al retirar" es el único método y no hay selector.
    await cp.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(cp).toHaveURL(/\/order\//);
  });

  const order = await waitForOrder(name, (o) => ['confirmed', 'in_preparation'].includes(o.status), {
    message: 'onOrderCreated debe confirmar el pedido',
  });
  const code = order.data.pickupCode;

  await test.step('el cliente ve su número de retiro y "Recibido"', async () => {
    expect(code).toMatch(/^P-[A-Z0-9]{4}$/);
    await expect(cp.getByText(code, { exact: true })).toBeVisible();
    await expect(statusPill(cp)).toHaveText('Recibido');
    await expect(cp.getByText(`A nombre de ${name}`)).toBeVisible();
  });

  await test.step('el pedido está en el tablero de la estación (RTDB) y en la pantalla del KDS', async () => {
    await expect
      .poll(async () => Object.keys((await rtdbGet(`order_items/${STATION}`)) ?? {}).some((k) => k.startsWith(`${order.id}_`)), {
        message: 'ticket espejado a RTDB',
      })
      .toBe(true);
    await loginKitchen(kp);
    const ticket = kitchenTicket(kp, code);
    await expect(ticket).toBeVisible();
    await expect(ticket.getByText(PRODUCT.margarita.name)).toBeVisible();
  });

  await test.step('cocina empieza a preparar: el cliente ve "En cocina"', async () => {
    const ticket = kitchenTicket(kp, code);
    await ticket.getByRole('button', { name: new RegExp(PRODUCT.margarita.name) }).click();
    await expect(statusPill(cp)).toHaveText('En cocina');
  });

  await test.step('cocina marca listo: el cliente ve "Listo para retirar"', async () => {
    await kitchenTicket(kp, code).getByRole('button', { name: /Marcar listo/ }).click();
    await expect(kitchenTicket(kp, code)).toHaveCount(0);
    await expect(statusPill(cp)).toHaveText('Listo para retirar');
    await expect(cp.getByText('Tu pedido está listo. Pasa a retirarlo en el mostrador.')).toBeVisible();
    await waitForOrder(name, (o) => o.status === 'ready', { message: 'el pedido debe quedar en "ready"' });
  });

  await customer.context.close();
  await kitchen.context.close();
});
