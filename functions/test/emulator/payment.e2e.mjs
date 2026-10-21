// Server-side payment event (issue #67): recordPayment + onOrderPaid. Emulator only.
import { patch, get, rtdb, token, call, waitFor, sleep, check, done } from './helpers.mjs';

const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}/v1/projects/demo-ros-test/databases/(default)/documents`;
const auditLogs = async (orderId) => {
  const r = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'audit_log' }], where: { fieldFilter: { field: { fieldPath: 'orderId' }, op: 'EQUAL', value: { stringValue: orderId } } } } }),
  });
  return (await r.json()).filter((x) => x.document).length;
};

await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/wB', { orgId: 'B', role: 'waiter' });
await patch('users/opK', { orgId: 'A', role: 'operator', stationId: 'K' });
await patch('stations/K', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });
await patch('branches/b1', { orgId: 'A', name: 'B1', taxPercent: 0.07 });
await patch('products/P-food', { orgId: 'A', price: 4, isActive: true });

// 1. Waiter order already in the kitchen, paid in cash at the counter.
await patch('orders/o1', { id: 'o1', orgId: 'A', branchId: 'b1', source: 'waiter', status: 'confirmed', total: 21.4, tableNumber: 'Ana', payment: { method: null, status: 'pending' } });
check('anonymous caller is refused', (await call('recordPayment', 'anon-1', { orderId: 'o1', method: 'cash' })).error === 'PERMISSION_DENIED');
check('waiter of another org is refused', (await call('recordPayment', 'wB', { orderId: 'o1', method: 'cash' })).error === 'NOT_FOUND');
check('operator (KDS) cannot collect', (await call('recordPayment', 'opK', { orderId: 'o1', method: 'cash' })).error === 'PERMISSION_DENIED');
check('bad method is refused', (await call('recordPayment', 'wA', { orderId: 'o1', method: 'bitcoin' })).error === 'INVALID_ARGUMENT');
const r1 = await call('recordPayment', 'wA', { orderId: 'o1', method: 'cash' });
check('waiter collects cash → paid', r1?.status === 'paid', JSON.stringify(r1));
let o1 = await get('orders/o1');
check('order payment paid/cash/recordedBy', o1.payment.status === 'paid' && o1.payment.method === 'cash' && o1.payment.recordedBy === 'wA');
check('kitchen status untouched', o1.status === 'confirmed');
const paidAt = JSON.stringify(o1.payment.paidAt);
const r2 = await call('recordPayment', 'wA', { orderId: 'o1', method: 'card' });
check('second tap → already_paid', r2?.status === 'already_paid', JSON.stringify(r2));
o1 = await get('orders/o1');
check('second tap changes nothing', JSON.stringify(o1.payment.paidAt) === paidAt && o1.payment.method === 'cash');
await waitFor('audit log for o1', async () => (await auditLogs('o1')) === 1);
await sleep(1500);
check('exactly one audit entry', (await auditLogs('o1')) === 1);

// 2. Link order waiting for its payment, collected in cash → released to the KDS by the trigger.
const cust = token('anon-2', { firebase: { sign_in_provider: 'anonymous' } });
await patch('order_items/o2_0', { id: 'o2_0', orgId: 'A', branchId: 'b1', orderId: 'o2', createdByUid: 'anon-2', stationId: '', productId: 'P-food', categoryId: 'food', productName: 'Huevos', quantity: 2, status: 'queued', specialInstructions: '' }, cust);
await patch('orders/o2', { id: 'o2', orgId: 'A', branchId: 'b1', source: 'qr', createdByUid: 'anon-2', status: 'pending_payment', tableNumber: 'P-ABCD', pickupCode: 'P-ABCD', customerName: 'Luis', tableId: '', total: 8.03, payment: { method: null, status: 'pending' } }, cust);
await waitFor('o2 pre-routed', async () => (await get('order_items/o2_0')).stationId === 'K');
check('awaiting payment: nothing on the KDS yet', !(await rtdb('order_items/K'))?.o2_o2_0);
check('client total 8.03 replaced by 2×4 + 7 % = 8.56', (await get('orders/o2')).total === 8.56, String((await get('orders/o2')).total));
check('online card cannot be forced by staff', (await call('recordPayment', 'wA', { orderId: 'o2', method: 'card' })).error === 'FAILED_PRECONDITION');
check('cash at the counter is accepted', (await call('recordPayment', 'wA', { orderId: 'o2', method: 'cash' }))?.status === 'paid');
check('order becomes confirmed', (await get('orders/o2')).status === 'confirmed');
await waitFor('o2 ticket on the KDS', async () => !!(await rtdb('order_items/K'))?.o2_o2_0);
const t = await rtdb('order_items/K/o2_o2_0');
check('ticket carries the order data', t.productName === 'Huevos' && t.quantity === 2 && t.tableNumber === 'P-ABCD');

// 3. Invoice request with RUC travels with the payment.
await patch('orders/o3', { id: 'o3', orgId: 'A', branchId: 'b1', source: 'waiter', status: 'ready', total: 10, tableNumber: 'Eva', payment: { method: null, status: 'pending' } });
check('RUC invoice needs taxId and name', (await call('recordPayment', 'wA', { orderId: 'o3', method: 'card', invoiceRequest: { receiverType: '01', taxId: '' } })).error === 'INVALID_ARGUMENT');
await call('recordPayment', 'wA', { orderId: 'o3', method: 'card', invoiceRequest: { receiverType: '01', taxId: '155704849-2-2021', dv: '32', name: 'Digifact', email: 'x@y.z' } });
const o3 = await get('orders/o3');
check('invoiceRequest stored', o3.invoiceRequest?.taxId === '155704849-2-2021' && o3.invoiceRequest?.dv === '32' && o3.invoiceRequest?.receiverType === '01');

// 4. Electronic invoice hook: only orgs with fiscal.enabled get a fiscal block.
check('org without fiscal config → no fiscal block', (await get('orders/o1')).fiscal === undefined);
await patch('organizations/F', { name: 'Fiscal org', fiscal: { enabled: true, env: 'test' } });
await patch('users/wF', { orgId: 'F', role: 'waiter' });
await patch('orders/o5', { id: 'o5', orgId: 'F', branchId: 'bf', source: 'waiter', status: 'ready', total: 10, tableNumber: 'Zoe', payment: { method: null, status: 'pending' } });
check('fiscal org: collect', (await call('recordPayment', 'wF', { orderId: 'o5', method: 'cash' }))?.status === 'paid');
await waitFor('fiscal.status pending (BFF not configured in the emulator)', async () => (await get('orders/o5')).fiscal?.status === 'pending');
check('fiscal block requested', true);

// 5. Closed / cancelled orders cannot be collected.
await patch('orders/o4', { id: 'o4', orgId: 'A', branchId: 'b1', status: 'cancelled', total: 5, payment: { method: null, status: 'pending' } });
check('cancelled order is refused', (await call('recordPayment', 'wA', { orderId: 'o4', method: 'cash' })).error === 'FAILED_PRECONDITION');
done();
