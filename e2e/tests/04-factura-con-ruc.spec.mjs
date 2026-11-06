// Flujo 4: el cliente pide factura con RUC al ordenar -> el mesero cobra -> se pide
// la factura electrónica (BFF + Digifact en ambiente de pruebas). Dev tiene
// credenciales Digifact (organizations/{org}/private/digifact), así que se espera
// fiscal.status "issued" con enlace al PDF. Si el BFF o Digifact fallan, la prueba
// falla mostrando fiscal.lastError: es un hallazgo de la implementación.
import { test, expect } from '@playwright/test';
import { PRODUCT, TEST_RUC } from '../lib/env.mjs';
import { fsGet } from '../lib/gcp.mjs';
import {
  customerAdd, customerOpenCart, customerStart, loginWaiter, newPage, orderName, runId, waiterCard, waitForOrder,
} from '../lib/ui.mjs';

test('factura con RUC: pedido del cliente, cobro del mesero y factura emitida con PDF', async ({ browser }) => {
  test.setTimeout(360_000);
  const name = orderName('factura');
  const customer = await newPage(browser, 'customer');
  const waiter = await newPage(browser, 'waiter');
  const cp = customer.page;
  const invoiceName = `E2E Factura ${runId()}`;

  await test.step('el cliente pide el pedido con datos de factura (RUC de empresa)', async () => {
    await customerStart(cp, name);
    await customerAdd(cp, PRODUCT.margarita.name);
    await customerOpenCart(cp);
    await cp.getByRole('button', { name: /Datos para tu factura/ }).click();
    await cp.getByLabel('Nombre para la factura').fill(invoiceName);
    await cp.getByLabel(/RUC de empresa/).fill(TEST_RUC);
    await cp.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(cp).toHaveURL(/\/order\//);
  });

  const order = await waitForOrder(name, (o) => o.status === 'confirmed' && !!o.invoiceRequest, {
    message: 'el pedido debe guardar la invoiceRequest del cliente',
  });
  await test.step('la solicitud de factura quedó en el pedido', async () => {
    expect(order.data.invoiceRequest).toMatchObject({ receiverType: '01', taxId: TEST_RUC, name: invoiceName });
    expect(order.data.fiscal).toBeUndefined(); // aún no se paga: nada se factura
  });

  await test.step('el mesero cobra en efectivo sin reescribir los datos de factura', async () => {
    await loginWaiter(waiter.page);
    const card = waiterCard(waiter.page, name);
    await card.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await waiter.page.getByRole('button', { name: /Efectivo/ }).click();
    await expect(card.getByText(/^Cobrado · Efectivo$/)).toBeVisible();
  });

  await test.step('onOrderPaid pide la factura: el bloque fiscal aparece en el pedido', async () => {
    const paid = await waitForOrder(name, (o) => o.payment?.status === 'paid' && !!o.fiscal, { timeout: 60_000, message: 'debe aparecer orders.fiscal tras el cobro' });
    expect(['pending', 'issuing', 'issued', 'error']).toContain(paid.data.fiscal.status);
    expect(paid.data.invoiceRequest).toMatchObject({ taxId: TEST_RUC }); // el cobro conserva la solicitud del cliente
  });

  let fiscal;
  await test.step('la factura se emite (Digifact sandbox) con PDF', async () => {
    await expect
      .poll(async () => (fiscal = (await fsGet(`orders/${order.id}`)).data.fiscal).status, {
        timeout: 180_000,
        intervals: [3000],
        message: 'fiscal.status debe salir de pending/issuing',
      })
      .toMatch(/^(issued|error|skipped)$/);
    expect(fiscal.status, `fiscal.status=${fiscal.status} lastError=${fiscal.lastError ?? '(vacío)'}`).toBe('issued');
    expect(fiscal.numeroDF).toMatch(/^\d{10}$/);
    expect(fiscal.cufe).toBeTruthy();
    expect(fiscal.pdfUrl, 'el BFF debe escribir fiscal.pdfUrl').toMatch(/^https:\/\//);
    const pdf = await fetch(fiscal.pdfUrl);
    expect(pdf.status, 'el enlace del PDF debe abrir').toBe(200);
    expect(pdf.headers.get('content-type')).toContain('pdf');
  });

  await test.step('mesero y cliente ven la factura emitida con su enlace al PDF', async () => {
    const card = waiterCard(waiter.page, name);
    await expect(card.getByText(`Factura N.º ${fiscal.numeroDF}`)).toBeVisible();
    await expect(card.getByRole('link', { name: 'Ver PDF' })).toHaveAttribute('href', fiscal.pdfUrl);
    await expect(cp.getByText('Factura electrónica')).toBeVisible();
    await expect(cp.getByText(`N.º ${fiscal.numeroDF}`)).toBeVisible();
    await expect(cp.getByRole('link', { name: 'Ver PDF' })).toHaveAttribute('href', fiscal.pdfUrl);
  });

  await customer.context.close();
  await waiter.context.close();
});
