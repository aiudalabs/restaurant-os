// Counter mode end to end (issue #45): real onOrderCreated / onOrderItemUpdated.
import { patch, get, rtdb, token, sleep, waitFor, check, done } from './helpers.mjs';

await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/opK', { orgId: 'A', role: 'operator', stationId: 'K' });
await patch('stations/K', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });
await patch('stations/BAR', { orgId: 'A', branchId: 'b1', name: 'Bar', isActive: false, categoryIds: ['drinks'], fcmTokens: [] });

async function newOrder(id, cats) {
  for (const [i, c] of cats.entries()) {
    await patch(`order_items/${id}_${i}`, { id: `${id}_${i}`, orgId: 'A', branchId: 'b1', orderId: id, stationId: '', categoryId: c, productName: c, quantity: 1, status: 'queued', specialInstructions: '' }, token('wA'));
  }
  await patch(`orders/${id}`, { id, orgId: 'A', branchId: 'b1', source: 'waiter', status: 'pending', tableNumber: 'Pedro', customerName: 'Pedro', tableId: '' }, token('wA'));
  await waitFor(`${id} routed`, async () => (await get(`orders/${id}`)).status === 'confirmed');
}

// Mixed order: food → Cocina, drink → counter (Bar inactive).
await newOrder('mixed', ['food', 'drinks']);
check('food item routed to Cocina', (await get('order_items/mixed_0')).stationId === 'K');
check('drink item left unrouted (counter)', (await get('order_items/mixed_1')).stationId === '');
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

// A closed order is not reopened by a late item update.
await patch('orders/bar', { status: 'closed' }, token('wA'));
await patch('order_items/bar_0', { status: 'in_progress', updatedAt: 'y' }, token('wA'));
await patch('order_items/bar_0', { status: 'done', updatedAt: 'z' }, token('wA'));
await sleep(4000);
check('late item tap keeps a closed order closed', (await get('orders/bar')).status === 'closed');
done();
