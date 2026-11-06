// Flujo 5: login del admin -> la pantalla Pedidos lista los pedidos de la sucursal,
// se pueden buscar y su detalle muestra ítems y total.
import { test, expect } from '@playwright/test';
import { PRODUCT } from '../lib/env.mjs';
import { adminSelectBranch, loadProducts, branchTax, expectedTotals, loginAdmin, money, newPage, orderName, seedCustomerOrder, waitForOrder } from '../lib/ui.mjs';

test('admin: login y Pedidos muestra un pedido de la sucursal con su detalle', async ({ browser }) => {
  const name = orderName('admin');
  const { pickupCode } = await seedCustomerOrder({ name, payment: 'pickup', lines: [{ product: 'pepperoni', qty: 2 }] });
  const products = await loadProducts();
  const tax = await branchTax();
  const exp = expectedTotals([{ price: products.pepperoni.price, qty: 2, taxRate: tax }]);
  await waitForOrder(name, (o) => o.status === 'confirmed' && o.total === exp.total, { message: `el servidor debe fijar el total ${exp.total}` });

  const admin = await newPage(browser, 'admin');
  const ap = admin.page;

  await test.step('login con el admin temporal', async () => {
    await loginAdmin(ap);
  });

  await test.step('Pedidos lista el pedido (se busca por código de retiro)', async () => {
    await ap.getByRole('link', { name: 'Pedidos' }).first().click();
    await expect(ap).toHaveURL(/\/orders$/);
    await adminSelectBranch(ap);
    await ap.getByRole('searchbox', { name: 'Buscar pedidos' }).fill(pickupCode);
    const row = ap.getByRole('button', { name: new RegExp(pickupCode) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(money(exp.total));
    await row.click();
  });

  await test.step('el detalle muestra los ítems y los totales del servidor', async () => {
    await expect(ap.getByText(`Pedido · ${pickupCode}`)).toBeVisible();
    await expect(ap.getByText(`2× ${PRODUCT.pepperoni.name}`)).toBeVisible();
    await expect(ap.getByText(money(exp.total), { exact: true }).last()).toBeVisible();
  });

  await admin.context.close();
});
