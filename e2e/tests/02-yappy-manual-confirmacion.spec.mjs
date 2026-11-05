// Flujo 2: pedido del cliente pagado por Yappy manual -> queda en "Esperando pago"
// -> el mesero confirma "Pago recibido" -> el pedido pasa a cocina.
//
// HALLAZGO: la sucursal de Pick & Eat en dev tiene yappyHandle "" y
// VITE_PAYMENTS_ENABLED=false, así que la UI del cliente solo ofrece "Al retirar".
// El pedido se siembra por REST con la sesión anónima de un cliente y las reglas de
// Firestore aplicadas, con la misma forma que escribe customer_web (createOrder).
// Todo lo demás (seguimiento del cliente, mesero, KDS) va por la UI real.
import { test, expect } from '@playwright/test';
import { PRODUCT, STATION, URLS } from '../lib/env.mjs';
import { fsGet, fsQuery, rtdbGet } from '../lib/gcp.mjs';
import {
  kitchenTicket, loginKitchen, loginWaiter, newPage, orderName, seedCustomerOrder, statusPill, waiterCard, waitForOrder,
} from '../lib/ui.mjs';

test('Yappy manual: Esperando pago -> mesero confirma -> cocina', async ({ browser }) => {
  const name = orderName('yappy');
  const { orderId, pickupCode } = await seedCustomerOrder({ name, payment: 'yappy', lines: [{ product: 'margarita', qty: 1 }] });

  await test.step('el pedido espera el pago y NO está en el KDS', async () => {
    const order = await waitForOrder(name, (o) => o.status === 'pending_payment');
    expect(order.data.payment).toMatchObject({ method: 'yappy', status: 'pending' });
    // onOrderCreated pre-asigna la estación a cada ítem aunque aún no espeje al KDS.
    await expect
      .poll(async () => (await fsQuery('order_items', [{ field: 'orderId', op: 'EQUAL', value: orderId }])).map((i) => i.data.stationId), {
        message: 'onOrderCreated debe asignar stationId a los ítems del pedido en pending_payment',
      })
      .toEqual([STATION]);
    const tickets = Object.keys((await rtdbGet(`order_items/${STATION}`)) ?? {});
    expect(tickets.some((k) => k.startsWith(`${orderId}_`))).toBe(false);
  });

  const customer = await newPage(browser, 'customer');
  const waiter = await newPage(browser, 'waiter');
  const kitchen = await newPage(browser, 'kitchen');
  const cp = customer.page;

  await test.step('el cliente recupera su pedido con el número y ve "Esperando pago"', async () => {
    await cp.goto(`${URLS.customerBase}/recover`);
    await cp.getByPlaceholder('P-XXXX').fill(pickupCode);
    await cp.getByRole('button', { name: 'Buscar mi pedido' }).click();
    await expect(statusPill(cp)).toHaveText('Esperando pago');
    await expect(cp.getByText('Paga con Yappy para que lo preparemos')).toBeVisible();
    await expect(cp.getByText('Reservado — lo preparamos al confirmar tu Yappy')).toBeVisible();
  });

  await test.step('el mesero ve "Esperando pago / Yappy por confirmar" y confirma "Pago recibido"', async () => {
    await loginWaiter(waiter.page);
    const card = waiterCard(waiter.page, name);
    await expect(card).toBeVisible();
    await expect(card.getByText('Esperando pago', { exact: true })).toBeVisible();
    await expect(card.getByText('Yappy por confirmar', { exact: true })).toBeVisible();
    await expect(card.getByText(pickupCode, { exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Pago recibido' }).click();
    await expect(card.getByText(/^Cobrado · Yappy$/)).toBeVisible();
  });

  await test.step('el servidor registra el pago y libera el pedido', async () => {
    const order = await waitForOrder(name, (o) => o.payment?.status === 'paid' && o.status === 'confirmed', {
      message: 'confirmManualPayment debe dejar el pedido pagado y confirmado',
    });
    expect(order.data.payment.method).toBe('yappy');
    expect(order.data.payment.reviewedBy).toBe(process.env.E2E_WAITER_UID);
    expect((await fsGet(`orders/${order.id}`)).data.payment.status).toBe('paid');
  });

  await test.step('los ítems quedan enrutados a la estación y espejados a RTDB (onOrderPaid -> releaseToKds)', async () => {
    const items = await fsQuery('order_items', [{ field: 'orderId', op: 'EQUAL', value: orderId }]);
    expect(items.map((i) => i.data.stationId), 'stationId de los ítems tras onOrderCreated').toEqual([STATION]);
    await expect
      .poll(async () => Object.keys((await rtdbGet(`order_items/${STATION}`)) ?? {}).some((k) => k.startsWith(`${orderId}_`)), {
        message: 'ticket espejado a RTDB tras confirmar el pago',
      })
      .toBe(true);
  });

  await test.step('el cliente ve "Recibido" y el ticket llega a la pantalla de cocina', async () => {
    await expect(statusPill(cp)).toHaveText('Recibido');
    await loginKitchen(kitchen.page);
    const ticket = kitchenTicket(kitchen.page, pickupCode);
    await expect(ticket).toBeVisible();
    await expect(ticket.getByText(PRODUCT.margarita.name)).toBeVisible();
  });

  await customer.context.close();
  await waiter.context.close();
  await kitchen.context.close();
});
