// Manual Yappy end to end (issue #47): real onOrderCreated + confirmManualPayment.
import { patch, get, rtdb, anon, call, waitFor, check, done } from './helpers.mjs';

await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/wB', { orgId: 'B', role: 'waiter' });
await patch('stations/K', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });

async function yappyOrder(id) {
  const cust = anon(`anon-${id}`);
  await patch(`order_items/${id}_0`, { id: `${id}_0`, orgId: 'A', branchId: 'b1', orderId: id, createdByUid: `anon-${id}`, stationId: '', categoryId: 'food', productName: 'Huevos', quantity: 2, status: 'queued', specialInstructions: '' }, cust);
  await patch(`order_items/${id}_1`, { id: `${id}_1`, orgId: 'A', branchId: 'b1', orderId: id, createdByUid: `anon-${id}`, stationId: '', categoryId: 'drinks', productName: 'Limonada', quantity: 1, status: 'queued', specialInstructions: '' }, cust);
  await patch(`orders/${id}`, { id, orgId: 'A', branchId: 'b1', source: 'qr', createdByUid: `anon-${id}`, status: 'pending_payment', tableNumber: '4821', pickupCode: '4821', customerName: 'Ana', tableId: '', total: 8.03, payment: { method: 'yappy', status: 'pending', payTo: '@PickAndEat' } }, cust);
  await waitFor(`${id} pre-routed`, async () => (await get(`order_items/${id}_0`)).stationId === 'K');
}

await yappyOrder('y1');
check('awaiting Yappy: order stays pending_payment', (await get('orders/y1')).status === 'pending_payment');
check('awaiting Yappy: nothing on the KDS yet', (await rtdb('order_items/K')) === null);
check('customer cannot mark it paid', await patch('orders/y1', { status: 'confirmed' }, anon('anon-y1')).then(() => false, () => true));
check('waiter of another org is refused', (await call('confirmManualPayment', 'wB', { orderId: 'y1', received: true })).error === 'NOT_FOUND');
check('anonymous caller is refused', (await call('confirmManualPayment', 'anon-y1', { orderId: 'y1', received: true })).error === 'PERMISSION_DENIED');
const r1 = await call('confirmManualPayment', 'wA', { orderId: 'y1', received: true });
check('waiter confirms → confirmed', r1?.status === 'confirmed', JSON.stringify(r1));
const o1 = await get('orders/y1');
check('order paid + confirmed', o1.status === 'confirmed' && o1.payment.status === 'paid' && o1.payment.reviewedBy === 'wA');
const kds = await rtdb('order_items/K');
const ticket = kds?.['y1_y1_0'];
check('food ticket now on the Cocina KDS', !!ticket && ticket.productName === 'Huevos' && ticket.quantity === 2 && ticket.tableNumber === '4821');
check('drink (no station) not on any KDS — counter handles it', Object.keys(kds ?? {}).length === 1 && (await get('order_items/y1_1')).stationId === '');
check('retry is idempotent (re-mirror, still confirmed)', (await call('confirmManualPayment', 'wA', { orderId: 'y1', received: true }))?.status === 'confirmed');
check('cannot reject an already paid order', (await call('confirmManualPayment', 'wA', { orderId: 'y1', received: false })).error === 'FAILED_PRECONDITION');

await yappyOrder('y2');
check('"No llegó" → cancelled', (await call('confirmManualPayment', 'wA', { orderId: 'y2', received: false }))?.status === 'cancelled' && (await get('orders/y2')).status === 'cancelled');
check('cancelled order never reaches the KDS', !(await rtdb('order_items/K'))?.['y2_y2_0']);

await patch('orders/cash', { id: 'cash', orgId: 'A', branchId: 'b1', source: 'waiter', status: 'confirmed', payment: { method: null, status: 'pending' } });
check('non-Yappy order is refused', (await call('confirmManualPayment', 'wA', { orderId: 'cash', received: true })).error === 'FAILED_PRECONDITION');
done();
