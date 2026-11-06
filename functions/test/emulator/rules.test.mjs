// Firestore rules: counter mode (issue #45) + field validation on orders (issue #67). Emulator only.
import { put, update, patch, anon, token, report } from './helpers.mjs';

/** Rules check: true if the caller may CREATE `path` with `data`. */
const create = (auth, path, data) => patch(path, data, auth).then(() => true, () => false);
const asAnon = anon('cust1');

await put('users/wA', { orgId: 'A', role: 'waiter' });
await put('users/wB', { orgId: 'B', role: 'waiter' });
await put('users/mA', { orgId: 'A', role: 'manager' });
await put('users/opS1', { orgId: 'A', role: 'operator', stationId: 'S1' });
await put('order_items/unrouted', { orgId: 'A', orderId: 'o1', stationId: '', status: 'queued', productName: 'Limonada', quantity: 1 });
await put('order_items/nofield', { orgId: 'A', orderId: 'o1', status: 'queued', productName: 'Batido', quantity: 1 });
await put('order_items/routed', { orgId: 'A', orderId: 'o1', stationId: 'S1', status: 'queued', productName: 'Huevos', quantity: 1 });
await put('order_items/otherorg', { orgId: 'B', orderId: 'o2', stationId: '', status: 'queued', productName: 'Limonada', quantity: 1 });
await put('orders/paid', { orgId: 'A', branchId: 'b1', status: 'ready', total: 10, payment: { method: 'cash', status: 'paid' } });
await put('users/adA', { orgId: 'A', role: 'admin' });
await put('users/adB', { orgId: 'B', role: 'admin' });
await put('branches/brA', { orgId: 'A', name: 'Sede', isActive: true, yappyHandle: '@x' });
await put('organizations/A', { name: 'A' });
await put('organizations/A/private/odoo', { odooPassword: 'secret' });

const bucketUrl = (org, file = 'logo.png') => `https://firebasestorage.googleapis.com/v0/b/demo.firebasestorage.app/o/orgs%2F${org}%2Fbrand%2F${file}?alt=media`;
const branding = (over = {}) => ({ displayName: 'Pick & Eat', primary: '#3F6B2A', accent: '#c9a24a', fontPreset: 'classic', logoUrl: bucketUrl('A'), iconUrl: bucketUrl('A', 'icon-512.png'), ...over });
const setBranding = (uid, b) => update(uid, 'branches/brA', { branding: b });
const newBranch = (uid, data) => create(token(uid), `branches/nb${++n}`, data);

const done = { status: 'done', completedAt: '2026-09-28', updatedAt: '2026-09-28' };
const order = (over = {}) => ({ orgId: 'A', branchId: 'b1', createdByUid: 'cust1', source: 'qr', status: 'pending', total: 5, payment: { method: null, status: null }, ...over });
const item = (over = {}) => ({ orgId: 'A', orderId: 'n1', createdByUid: 'cust1', productId: 'p1', stationId: '', status: 'queued', quantity: 1, ...over });
let n = 0;
const fresh = () => `orders/new${++n}`;
const freshItem = () => `order_items/new${++n}`;

await report([
  // counter mode (unchanged)
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

  // orders: create (anonymous customer)
  ['customer creates a pending order', () => create(asAnon, fresh(), order()), true],
  ['customer creates a pending_payment order (Yappy)', () => create(asAnon, fresh(), order({ status: 'pending_payment', payment: { method: 'yappy', status: 'pending', payTo: '@x' } })), true],
  ['customer cannot create it already paid', () => create(asAnon, fresh(), order({ payment: { method: 'cash', status: 'paid' } })), false],
  ['customer cannot create it confirmed (skip the gate)', () => create(asAnon, fresh(), order({ status: 'confirmed' })), false],
  ['customer cannot claim another uid', () => create(asAnon, fresh(), order({ createdByUid: 'someone' })), false],
  ['customer cannot forge a source', () => create(asAnon, fresh(), order({ source: 'zaveli' })), false],
  ['customer cannot pre-write a fiscal block', () => create(asAnon, fresh(), order({ fiscal: { status: 'issued' } })), false],
  ['customer may ask for a RUC invoice', () => create(asAnon, fresh(), order({ invoiceRequest: { receiverType: '01', taxId: '1-2-3', name: 'X' } })), true],
  ['RUC invoice needs a taxId', () => create(asAnon, fresh(), order({ invoiceRequest: { receiverType: '01', taxId: '', name: 'X' } })), false],
  ['waiter creates an order in its org', () => create(token('wA'), fresh(), order({ createdByUid: 'wA', source: 'waiter', payment: { method: null, status: 'pending' } })), true],
  ['waiter cannot create an order in another org', () => create(token('wA'), fresh(), order({ orgId: 'B', createdByUid: 'wA', source: 'waiter' })), false],

  // order_items / orders: money and loyalty fields are server-only at creation
  ['client cannot create an item with discountAmount', () => create(asAnon, freshItem(), item({ discountAmount: 5 })), false],
  ['client cannot create an order with loyaltyUid', () => create(asAnon, fresh(), order({ loyaltyUid: 'wA' })), false],
  // order_items: create
  ['customer creates a queued unrouted item', () => create(asAnon, freshItem(), item()), true],
  ['item needs a productId', () => create(asAnon, freshItem(), item({ productId: '' })), false],
  ['item cannot be pre-routed', () => create(asAnon, freshItem(), item({ stationId: 'S1' })), false],
  ['item cannot start done', () => create(asAnon, freshItem(), item({ status: 'done' })), false],

  // orders: update (staff)
  ['waiter closes an order', () => update('wA', 'orders/paid', { status: 'closed', completedAt: 'x', updatedAt: 'x' }), true],
  ['waiter cannot write payment fields', () => update('wA', 'orders/paid', { payment: { method: 'cash', status: 'pending' }, updatedAt: 'x' }), false],
  ['waiter cannot change the total', () => update('wA', 'orders/paid', { total: 1, updatedAt: 'x' }), false],
  ['waiter cannot write fiscal', () => update('wA', 'orders/paid', { fiscal: { status: 'issued' } }), false],
  ['waiter cannot move the order to another org', () => update('wA', 'orders/paid', { orgId: 'B' }), false],
  ['manager cancels', () => update('mA', 'orders/paid', { status: 'cancelled', completedAt: 'x', updatedAt: 'x' }), true],
  ['manager cannot set payment_failed by hand', () => update('mA', 'orders/paid', { status: 'payment_failed', updatedAt: 'x' }), false],
  ['operator cannot update orders', () => update('opS1', 'orders/paid', { status: 'closed' }), false],
  ['customer cannot update an order', () => patch('orders/paid', { status: 'closed' }, asAnon).then(() => true, () => false), false],

  // branches: existing writes keep working, branding is validated (issue #108)
  ['admin still edits regular branch fields', () => update('adA', 'branches/brA', { yappyHandle: '@y', allowPayAtPickup: true, fiscal: { nextNumber: 5 } }), true],
  ['admin of another org cannot edit the branch', () => update('adB', 'branches/brA', { yappyHandle: '@z' }), false],
  ['manager cannot edit the branch', () => update('mA', 'branches/brA', { yappyHandle: '@z' }), false],
  ['admin creates a branch without branding', () => newBranch('adA', { orgId: 'A', name: 'N', isActive: true }), true],
  ['admin creates a branch with valid branding', () => newBranch('adA', { orgId: 'A', name: 'N', branding: branding() }), true],
  ['admin creates a branch with invalid branding', () => newBranch('adA', { orgId: 'A', name: 'N', branding: branding({ primary: 'red' }) }), false],
  ['admin sets valid branding', () => setBranding('adA', branding()), true],
  ['branding accepts a tagline up to 80', () => setBranding('adA', branding({ tagline: 'x'.repeat(80) })), true],
  ['branding rejects a tagline over 80', () => setBranding('adA', branding({ tagline: 'x'.repeat(81) })), false],
  ['branding rejects displayName over 40', () => setBranding('adA', branding({ displayName: 'x'.repeat(41) })), false],
  ['branding rejects empty displayName', () => setBranding('adA', branding({ displayName: '' })), false],
  ['branding rejects short hex', () => setBranding('adA', branding({ primary: '#fff' })), false],
  ['branding rejects non-hex accent', () => setBranding('adA', branding({ accent: '#GGGGGG' })), false],
  ['branding rejects css in a color', () => setBranding('adA', branding({ primary: '#3F6B2A;background:url(x)' })), false],
  ['branding rejects unknown fontPreset', () => setBranding('adA', branding({ fontPreset: 'comic' })), false],
  ['branding rejects an extra key', () => setBranding('adA', branding({ css: 'body{}' })), false],
  ['branding rejects a missing required key', () => setBranding('adA', (({ iconUrl, ...r }) => r)(branding())), false],
  ['branding rejects an external logoUrl', () => setBranding('adA', branding({ logoUrl: 'https://evil.example/logo.png' })), false],
  ['branding rejects javascript: url', () => setBranding('adA', branding({ iconUrl: 'javascript:alert(1)' })), false],
  ['branding rejects another org bucket path', () => setBranding('adA', branding({ logoUrl: bucketUrl('B') })), false],
  ['branding rejects a products/ path', () => setBranding('adA', branding({ logoUrl: bucketUrl('A').replace('brand', 'products') })), false],
  ['branding rejects a non-map value', () => setBranding('adA', 'x'), false],
  ['branding cannot be written by another org admin', () => update('adB', 'branches/brA', { branding: branding() }), false],
  ['anonymous customer can read branches', () => fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}/v1/projects/demo-ros-test/databases/(default)/documents/branches/brA`, { headers: { Authorization: `Bearer ${asAnon}` } }).then((r) => r.ok), true],
  ['anonymous customer cannot write branding', () => patch('branches/brA', { branding: branding() }, asAnon).then(() => true, () => false), false],

  // private subcollection
  ['manager cannot read org private secrets', async () => {
    const r = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}/v1/projects/demo-ros-test/databases/(default)/documents/organizations/A/private/odoo`, { headers: { Authorization: `Bearer ${token('mA')}` } });
    return r.ok;
  }, false],
]);
