// Firestore rules — counter mode (issue #45). Emulator only (project demo-ros-test).
import { put, update, report } from './helpers.mjs';

await put('users/wA', { orgId: 'A', role: 'waiter' });
await put('users/wB', { orgId: 'B', role: 'waiter' });
await put('users/opS1', { orgId: 'A', role: 'operator', stationId: 'S1' });
await put('order_items/unrouted', { orgId: 'A', orderId: 'o1', stationId: '', status: 'queued', productName: 'Limonada', quantity: 1 });
await put('order_items/nofield', { orgId: 'A', orderId: 'o1', status: 'queued', productName: 'Batido', quantity: 1 });
await put('order_items/routed', { orgId: 'A', orderId: 'o1', stationId: 'S1', status: 'queued', productName: 'Huevos', quantity: 1 });
await put('order_items/otherorg', { orgId: 'B', orderId: 'o2', stationId: '', status: 'queued', productName: 'Limonada', quantity: 1 });

const done = { status: 'done', completedAt: '2026-09-28', updatedAt: '2026-09-28' };
await report([
  ['waiter marks unrouted item done', () => update('wA', 'order_items/unrouted', done), true],
  ['waiter marks item without stationId field done', () => update('wA', 'order_items/nofield', done), true],
  ['waiter starts unrouted item (in_progress)', () => update('wA', 'order_items/nofield', { status: 'in_progress', startedAt: 'x', updatedAt: 'x' }), true],
  ['waiter cannot touch a routed (KDS) item', () => update('wA', 'order_items/routed', done), false],
  ['waiter cannot change other fields', () => update('wA', 'order_items/unrouted', { productName: 'Gratis' }), false],
  ['waiter cannot sneak extra fields with status', () => update('wA', 'order_items/unrouted', { ...done, quantity: 9 }), false],
  ['waiter cannot cancel', () => update('wA', 'order_items/unrouted', { status: 'cancelled', updatedAt: 'x' }), false],
  ['waiter cannot set stationId (reroute)', () => update('wA', 'order_items/unrouted', { stationId: 'S1', updatedAt: 'x' }), false],
  ['waiter of another org is denied', () => update('wB', 'order_items/unrouted', done), false],
  ['waiter cannot touch another org item', () => update('wA', 'order_items/otherorg', done), false],
  ['station operator still updates its item (regression)', () => update('opS1', 'order_items/routed', done), true],
]);
