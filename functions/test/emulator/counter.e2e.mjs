// Counter mode end to end (issue #45): real onOrderCreated / onOrderItemUpdated.
import { patch, get, rtdb, token, call, sleep, waitFor, check, done } from './helpers.mjs';

await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/opK', { orgId: 'A', role: 'operator', stationId: 'K' });
await patch('stations/K', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });
await patch('stations/BAR', { orgId: 'A', branchId: 'b1', name: 'Bar', isActive: false, categoryIds: ['drinks'], fcmTokens: [] });
await patch('products/food', { orgId: 'A', price: 4, isActive: true });
await patch('products/drinks', { orgId: 'A', price: 2, isActive: true });

async function newOrder(id, cats) {
  for (const [i, c] of cats.entries()) {
    await patch(`order_items/${id}_${i}`, { id: `${id}_${i}`, orgId: 'A', branchId: 'b1', orderId: id, createdByUid: 'wA', stationId: '', productId: c, categoryId: c, productName: c, quantity: 1, status: 'queued', specialInstructions: '' }, token('wA'));
  }
  await patch(`orders/${id}`, { id, orgId: 'A', branchId: 'b1', source: 'waiter', createdByUid: 'wA', status: 'pending', tableNumber: 'Pedro', customerName: 'Pedro', tableId: '', total: 0.01, payment: { method: null, status: 'pending' } }, token('wA'));
  await waitFor(`${id} routed`, async () => (await get(`orders/${id}`)).status === 'confirmed');
}

// Mixed order: food → Cocina, drink → counter (Bar inactive).
await newOrder('mixed', ['food', 'drinks']);
check('food item routed to Cocina', (await get('order_items/mixed_0')).stationId === 'K');
check('tampered total replaced from products (4 + 2, no branch tax)', Number((await get('orders/mixed')).total) === 6, String((await get('orders/mixed')).total));
check('item price replaced from products', Number((await get('order_items/mixed_0')).unitPrice) === 4);
check('drink item left unrouted (counter)', (await get('order_items/mixed_1')).stationId === '');
await waitFor('mixed ticket mirrored', async () => !!(await rtdb('order_items/K/mixed_mixed_0')));
const t = await rtdb('order_items/K/mixed_mixed_0');
check('waiter order ticket mirrored to the Cocina KDS', t?.productName === 'food' && t?.status === 'queued' && typeof t?.sentToStationAt === 'number');
await patch('order_items/mixed_1', { status: 'done', completedAt: 'x', updatedAt: 'x' }, token('wA'));
await sleep(3000);
check('counter item done alone does not make order ready', (await get('orders/mixed')).status !== 'ready');
await patch('order_items/mixed_0', { status: 'done' }, token('opK'));
await waitFor('mixed ready', async () => (await get('orders/mixed')).status === 'ready');
check('kitchen + counter done → order ready', true);

// Counter-only order → ready by the waiter alone.
await newOrder('bar', ['drinks', 'drinks']);
await patch('order_items/bar_0', { status: 'done', completedAt: 'x', updatedAt: 'x' }, token('wA'));
await patch('order_items/bar_1', { status: 'done', completedAt: 'x', updatedAt: 'x' }, token('wA'));
await waitFor('bar ready', async () => (await get('orders/bar')).status === 'ready');
check('counter-only order → ready without kitchen', true);

// Orders from other sources (Zaveli, BFF) are mirrored too: the gate is the status, not the source.
await patch('order_items/zv_0', { id: 'zv_0', orgId: 'A', branchId: 'b1', orderId: 'zv', stationId: '', productId: 'food', categoryId: 'food', productName: 'food', quantity: 1, status: 'queued' });
await patch('orders/zv', { id: 'zv', orgId: 'A', branchId: 'b1', source: 'zaveli', status: 'pending', tableNumber: 'Z-1', tableId: '', payment: { method: null, status: null } });
await waitFor('zaveli order confirmed', async () => (await get('orders/zv')).status === 'confirmed');
await waitFor('zaveli ticket on the KDS', async () => !!(await rtdb('order_items/K/zv_zv_0')));
check('zaveli order reaches the KDS', true);
// Unknown product → cancelled, never cooked.
await patch('order_items/bad_0', { id: 'bad_0', orgId: 'A', branchId: 'b1', orderId: 'bad', createdByUid: 'wA', stationId: '', productId: 'ghost', categoryId: 'food', productName: 'x', quantity: 1, status: 'queued' }, token('wA'));
await patch('orders/bad', { id: 'bad', orgId: 'A', branchId: 'b1', source: 'waiter', createdByUid: 'wA', status: 'pending', tableNumber: 'x', tableId: '', payment: { method: null, status: 'pending' } }, token('wA'));
await waitFor('unknown product cancels the order', async () => (await get('orders/bad')).status === 'cancelled');
check('unknown product → cancelled, no ticket', !(await rtdb('order_items/K/bad_bad_0')));

// recoverOrder is rate limited (10 lookups per hour per caller).
await patch('orders/rc', { id: 'rc', orgId: 'A', branchId: 'b1', source: 'qr', createdByUid: 'anon-x', status: 'confirmed', pickupCode: 'P-RCVR', tableNumber: 'P-RCVR', tableId: '', payment: { method: null, status: null } });
let last;
for (let i = 0; i < 11; i++) last = await call('recoverOrder', 'anon-brute', { pickupCode: `P-NO${i}` });
check('11th recovery attempt is refused', last?.error === 'RESOURCE_EXHAUSTED', JSON.stringify(last));
check('a fresh caller still recovers by code', (await call('recoverOrder', 'anon-new', { pickupCode: 'P-RCVR' }))?.orderId === 'rc');

// A closed order is not reopened by a late item update.
await patch('orders/bar', { status: 'closed' }, token('wA'));
await patch('order_items/bar_0', { status: 'in_progress', updatedAt: 'y' }, token('wA'));
await patch('order_items/bar_0', { status: 'done', updatedAt: 'z' }, token('wA'));
await sleep(4000);
check('late item tap keeps a closed order closed', (await get('orders/bar')).status === 'closed');
done();
