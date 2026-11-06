// applyDiscount (issue #81): server-side totals, locked states, tenant isolation, id document, rules. Emulator only.
import { patch, get, token, call, callFull, query, update, waitFor, sleep, check, done, note } from './helpers.mjs';

await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/mgrA', { orgId: 'A', role: 'manager' });
await patch('users/wOff', { orgId: 'A', role: 'waiter', isActive: false });
await patch('users/wB', { orgId: 'B', role: 'waiter' });
await patch('users/opK', { orgId: 'A', role: 'operator', stationId: 'K' });
await patch('stations/K', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });
await patch('branches/b1', { orgId: 'A', name: 'B1', taxPercent: 0.07 });
await patch('products/P20', { orgId: 'A', price: 20, isActive: true });
await patch('products/P10', { orgId: 'A', price: 10, isActive: true });
await patch('organizations/A', {
  name: 'Org A',
  discounts: [
    { id: 'jub', name: 'Jubilado', percent: 25, requiresId: true },
    { id: 'prom', name: 'Promo', percent: 10 },
    { id: 'off', name: 'Apagado', percent: 50, active: false },
    { id: 'bad', name: 'Roto', percent: 150 },
  ],
});

/** items: [[productId, quantity]]. Creates items first, then the order; waits for onOrderCreated to price it. */
async function mkOrder(id, items, extra = {}) {
  for (const [i, [pid, qty]] of items.entries()) {
    await patch(`order_items/${id}_${i}`, { id: `${id}_${i}`, orgId: 'A', branchId: 'b1', orderId: id, createdByUid: 'wA', stationId: '', productId: pid, categoryId: 'food', productName: pid, quantity: qty, status: 'queued', specialInstructions: '' });
  }
  await patch(`orders/${id}`, { id, orgId: 'A', branchId: 'b1', source: 'waiter', createdByUid: 'wA', status: 'pending', tableNumber: 'T', tableId: '', total: 0.01, payment: { method: null, status: 'pending' }, ...extra });
  await waitFor(`${id} priced`, async () => Number((await get(`orders/${id}`)).itemCount) > 0);
}
const n = async (path, f) => Number((await get(path))[f]);

// ── 1. Totals recomputed server-side, per line, ITBMS on the discounted base ──
// P20×1 + P10×3 = 50.00; ITBMS 7 % per line = 1.40 + 2.10 = 3.50 → 53.50 without discount.
await mkOrder('d1', [['P20', 1], ['P10', 3]]);
check('baseline: no discount → total 53.5 (trigger)', (await n('orders/d1', 'total')) === 53.5, String((await get('orders/d1')).total));

check('anonymous customer cannot discount', (await call('applyDiscount', 'anon-1', { orderId: 'd1', discountId: 'prom' })).error === 'PERMISSION_DENIED');
check('KDS operator cannot discount', (await call('applyDiscount', 'opK', { orderId: 'd1', discountId: 'prom' })).error === 'PERMISSION_DENIED');
check('inactive waiter cannot discount', (await call('applyDiscount', 'wOff', { orderId: 'd1', discountId: 'prom' })).error === 'PERMISSION_DENIED');
check('waiter of another org: order not found (no tenant leak)', (await call('applyDiscount', 'wB', { orderId: 'd1', discountId: 'prom' })).error === 'NOT_FOUND');
check('missing orderId → INVALID_ARGUMENT', (await call('applyDiscount', 'wA', { discountId: 'prom' })).error === 'INVALID_ARGUMENT');
check('unknown order → NOT_FOUND', (await call('applyDiscount', 'wA', { orderId: 'nope', discountId: 'prom' })).error === 'NOT_FOUND');
check('unknown discount id → FAILED_PRECONDITION', (await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'ghost' })).error === 'FAILED_PRECONDITION');
check('inactive discount → FAILED_PRECONDITION', (await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'off' })).error === 'FAILED_PRECONDITION');
check('discount with percent > 100 → FAILED_PRECONDITION', (await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'bad' })).error === 'FAILED_PRECONDITION');
check('refusals left the totals untouched', (await n('orders/d1', 'total')) === 53.5 && (await get('orders/d1')).discount === undefined);

const r1 = await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'prom' });
// 10 %: P20 line 2.00 (base 18 → tax 1.26); P10×3 line 3.00 (base 27 → tax 1.89) → 5 off, tax 3.15.
check('apply 10 % → result {total 48.15, discountAmount 5}', r1?.total === 48.15 && r1?.discountAmount === 5, JSON.stringify(r1));
let d1 = await get('orders/d1');
check('order totals: subtotal 50 (gross), discount 5, tax 3.15 (on discounted base), total 48.15',
  Number(d1.subtotal) === 50 && Number(d1.discountAmount) === 5 && Number(d1.taxAmount) === 3.15 && Number(d1.total) === 48.15, JSON.stringify([d1.subtotal, d1.discountAmount, d1.taxAmount, d1.total]));
check('order.discount records id, name, percent, amount, appliedBy',
  d1.discount?.id === 'prom' && d1.discount?.name === 'Promo' && Number(d1.discount?.percent) === 10 && Number(d1.discount?.amount) === 5 && d1.discount?.appliedBy === 'wA');
check('no id document stored when the discount does not ask for one', d1.discount?.idNumber === undefined);
check('discount applied per line (items carry discountAmount 2 and 3)', (await n('order_items/d1_0', 'discountAmount')) === 2 && (await n('order_items/d1_1', 'discountAmount')) === 3);
check('item prices untouched (gross)', (await n('order_items/d1_0', 'totalPrice')) === 20 && (await n('order_items/d1_1', 'totalPrice')) === 30);
await waitFor('audit discount_applied', async () => (await query('audit_log', 'orderId', 'd1')).some((a) => a.type === 'discount_applied'));
const a1 = (await query('audit_log', 'orderId', 'd1')).find((a) => a.type === 'discount_applied');
check('audit entry written (discount_applied, by wA, discountId prom, amount 5)', a1?.by === 'wA' && a1?.discountId === 'prom' && Number(a1?.amount) === 5 && a1?.orgId === 'A');

// ── 2. Id document ────────────────────────────────────────────────────────────
check('jubilado without cédula → INVALID_ARGUMENT', (await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'jub' })).error === 'INVALID_ARGUMENT');
check('jubilado with a too-short id → INVALID_ARGUMENT', (await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'jub', idNumber: ' 8 ' })).error === 'INVALID_ARGUMENT');
check('refused jubilado left the previous discount in place', (await get('orders/d1')).discount?.id === 'prom' && (await n('orders/d1', 'total')) === 48.15);
const long = '8-123-456' + 'x'.repeat(40);
const r2 = await call('applyDiscount', 'wA', { orderId: 'd1', discountId: 'jub', idNumber: `  ${long}  ` });
check('jubilado with cédula → applied', typeof r2?.total === 'number', JSON.stringify(r2));
d1 = await get('orders/d1');
check('one discount per order: jub REPLACES prom (25 % of 50 = 12.5, not stacked)', d1.discount?.id === 'jub' && Number(d1.discountAmount) === 12.5 && Number(d1.discount?.percent) === 25, JSON.stringify([d1.discount?.id, d1.discountAmount]));
check('invariant total = subtotal − discount + tax', Math.abs(Number(d1.total) - (Number(d1.subtotal) - Number(d1.discountAmount) + Number(d1.taxAmount))) < 0.005);
check('id document stored trimmed and capped at 30 chars', d1.discount?.idNumber === long.slice(0, 30), String(d1.discount?.idNumber));
check('items now carry the 25 % per line (5 and 7.5)', (await n('order_items/d1_0', 'discountAmount')) === 5 && (await n('order_items/d1_1', 'discountAmount')) === 7.5);

// Manager of the same org may discount too; ITBMS-on-discounted-base on a single clean line.
await mkOrder('d2', [['P20', 1]]);
const r3 = await call('applyDiscount', 'mgrA', { orderId: 'd2', discountId: 'jub', idNumber: 'E-8-99999' });
check('manager applies 25 % on a 20.00 line → total 16.05 (15.00 + 1.05 ITBMS)', r3?.total === 16.05 && r3?.discountAmount === 5, JSON.stringify(r3));

// ── 3. Removing a discount restores the totals ───────────────────────────────
const r4 = await call('applyDiscount', 'wA', { orderId: 'd1', discountId: null });
check('remove → total back to 53.5, discountAmount 0', r4?.total === 53.5 && r4?.discountAmount === 0, JSON.stringify(r4));
d1 = await get('orders/d1');
check('removed: order.discount field is gone, subtotal/tax restored', d1.discount === undefined && Number(d1.discountAmount) === 0 && Number(d1.subtotal) === 50 && Number(d1.taxAmount) === 3.5 && Number(d1.total) === 53.5);
check('removed: items back to discountAmount 0', (await n('order_items/d1_0', 'discountAmount')) === 0 && (await n('order_items/d1_1', 'discountAmount')) === 0);
await waitFor('audit discount_removed', async () => (await query('audit_log', 'orderId', 'd1')).some((a) => a.type === 'discount_removed'));
check('audit entry discount_removed written', true);
check('removing again is harmless (still 53.5)', (await call('applyDiscount', 'wA', { orderId: 'd1' }))?.total === 53.5);

// ── 4. Locked states ──────────────────────────────────────────────────────────
await mkOrder('d3', [['P10', 2]]);
check('collect cash', (await call('recordPayment', 'wA', { orderId: 'd3', method: 'cash' }))?.status === 'paid');
const before3 = await n('orders/d3', 'total');
const p = await callFull('applyDiscount', 'wA', { orderId: 'd3', discountId: 'prom' });
check('paid order → FAILED_PRECONDITION', p.error === 'FAILED_PRECONDITION' && /pagado/.test(p.message), JSON.stringify(p));
check('paid order: total unchanged and no discount', (await n('orders/d3', 'total')) === before3 && (await get('orders/d3')).discount === undefined);
check('paid order: removing a discount is refused too', (await call('applyDiscount', 'wA', { orderId: 'd3', discountId: null })).error === 'FAILED_PRECONDITION');

// pending_payment: a customer link order whose online amount is already fixed.
const cust = token('anon-2', { firebase: { sign_in_provider: 'anonymous' } });
await patch('order_items/d4_0', { id: 'd4_0', orgId: 'A', branchId: 'b1', orderId: 'd4', createdByUid: 'anon-2', stationId: '', productId: 'P10', categoryId: 'food', productName: 'P10', quantity: 1, status: 'queued', specialInstructions: '' }, cust);
await patch('orders/d4', { id: 'd4', orgId: 'A', branchId: 'b1', source: 'qr', createdByUid: 'anon-2', status: 'pending_payment', tableNumber: 'P-DISC', pickupCode: 'P-DISC', tableId: '', total: 0.01, payment: { method: null, status: 'pending' } }, cust);
await waitFor('d4 priced', async () => Number((await get('orders/d4')).itemCount) > 0);
const pp = await callFull('applyDiscount', 'wA', { orderId: 'd4', discountId: 'prom' });
check('pending_payment order → FAILED_PRECONDITION', pp.error === 'FAILED_PRECONDITION' && /pending_payment/.test(pp.message), JSON.stringify(pp));
check('pending_payment: total unchanged (10.7)', (await n('orders/d4', 'total')) === 10.7);

await mkOrder('d5', [['P10', 1]], { status: 'cancelled' });
await patch('orders/d5', { status: 'cancelled' });
check('cancelled order → FAILED_PRECONDITION', (await call('applyDiscount', 'wA', { orderId: 'd5', discountId: 'prom' })).error === 'FAILED_PRECONDITION');

// ── 5. Rules: clients cannot write discount / money fields ───────────────────
await mkOrder('d6', [['P10', 1]]);
check('control: waiter may update a label on the order (helper works)', await update('wA', 'orders/d6', { notes: 'sin sal' }));
check('waiter cannot write order.total', !(await update('wA', 'orders/d6', { total: 1 })));
check('waiter cannot write order.discount', !(await update('wA', 'orders/d6', { discount: { id: 'jub', percent: 100 } })));
check('waiter cannot write order.discountAmount', !(await update('wA', 'orders/d6', { discountAmount: 10.7 })));
check('manager cannot write order.discount / total / taxAmount either',
  !(await update('mgrA', 'orders/d6', { discount: { id: 'jub', percent: 100 } })) && !(await update('mgrA', 'orders/d6', { total: 0 })) && !(await update('mgrA', 'orders/d6', { taxAmount: 0 })));
check('waiter of another org cannot write the order', !(await update('wB', 'orders/d6', { notes: 'x' })));
check('customer who created it cannot discount it', !(await update('anon-2', 'orders/d4', { discountAmount: 5, total: 5 })));
check('waiter cannot write item.discountAmount / unitPrice', !(await update('wA', 'order_items/d6_0', { discountAmount: 5 })) && !(await update('wA', 'order_items/d6_0', { unitPrice: 0.01 })));
check('organizations.discounts: waiter cannot edit the catalog of discounts', !(await update('wA', 'organizations/A', { discounts: [{ id: 'x', percent: 100 }] })));
// Probe: the item rule lets a manager write any item field (no applyDiscount, no audit). Documented, not asserted.
const mgrItem = await update('mgrA', 'order_items/d6_0', { discountAmount: 9 });
note(`manager client can write order_items.discountAmount directly: ${mgrItem} (rules: order_items update = isManager(), no field restriction)`);
await sleep(100);
done();
