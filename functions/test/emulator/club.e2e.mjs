// Club Pick & Eat (issue #75): awardLoyalty via onOrderPaid, redeemReward, useVoucher, attachMember, loyalty_* rules. Emulator only.
import { patch, get, token, call, callFull, query, readAs, update, waitFor, sleep, check, done, createAuthUserWithUid } from './helpers.mjs';

await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/wA2', { orgId: 'A', role: 'waiter' });
await patch('users/wOff', { orgId: 'A', role: 'waiter', isActive: false });
await patch('users/mgrA', { orgId: 'A', role: 'manager' });
await patch('users/opK', { orgId: 'A', role: 'operator', stationId: 'K' });
await patch('users/wB', { orgId: 'B', role: 'waiter' });
await patch('stations/K', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });
await patch('branches/b1', { orgId: 'A', name: 'B1', taxPercent: 0.07 });
await patch('products/P20', { orgId: 'A', price: 20, isActive: true });
await patch('products/P10', { orgId: 'A', price: 10, isActive: true });
await patch('organizations/A', { name: 'Org A', discounts: [{ id: 'jub', name: 'Jubilado', percent: 25, requiresId: true }] });

const anonTok = (uid) => token(uid, { firebase: { sign_in_provider: 'anonymous' } });
const num = (v) => Number(v);
const earn = (orderId) => get(`loyalty_events/earn_${orderId}`);
const member = (org, uid) => get(`loyalty_members/${org}_${uid}`);
const seedMember = (uid, m) => patch(`loyalty_members/A_${uid}`, { orgId: 'A', uid, points: 0, stamps: 0, lifetimeSpend: 0, visits: 0, tier: 'bronce', ...m });

/** Customer (anonymous QR) order: items then order, with the customer's own token. items: [[productId, qty]]. */
async function custOrder(id, uid, items = [['P10', 2]]) {
  for (const [i, [pid, qty]] of items.entries()) {
    await patch(`order_items/${id}_${i}`, { id: `${id}_${i}`, orgId: 'A', branchId: 'b1', orderId: id, createdByUid: uid, stationId: '', productId: pid, categoryId: 'food', productName: pid, quantity: qty, status: 'queued', specialInstructions: '' }, anonTok(uid));
  }
  await patch(`orders/${id}`, { id, orgId: 'A', branchId: 'b1', source: 'qr', createdByUid: uid, status: 'pending', tableNumber: `P-${id}`, pickupCode: `P-${id}`, customerName: 'Cliente', tableId: '', total: 0.01, payment: { method: null, status: 'pending' } }, anonTok(uid));
  await waitFor(`${id} priced`, async () => num((await get(`orders/${id}`)).itemCount) > 0);
}
/** Order taken by a waiter (createdByUid = a staff uid). */
async function staffOrder(id, items = [['P10', 2]]) {
  for (const [i, [pid, qty]] of items.entries()) {
    await patch(`order_items/${id}_${i}`, { id: `${id}_${i}`, orgId: 'A', branchId: 'b1', orderId: id, createdByUid: 'wA', stationId: '', productId: pid, categoryId: 'food', productName: pid, quantity: qty, status: 'queued', specialInstructions: '' });
  }
  await patch(`orders/${id}`, { id, orgId: 'A', branchId: 'b1', source: 'waiter', createdByUid: 'wA', status: 'pending', tableNumber: 'Pedro', customerName: 'Pedro', tableId: '', total: 0.01, payment: { method: null, status: 'pending' } });
  await waitFor(`${id} priced`, async () => num((await get(`orders/${id}`)).itemCount) > 0);
}
const pay = async (id) => (await call('recordPayment', 'wA', { orderId: id, method: 'cash' }))?.status === 'paid';
const waitEarn = (id) => waitFor(`earn_${id}`, async () => (await earn(id)).orgId === 'A');
const auditCount = async (id, type) => (await query('audit_log', 'orderId', id)).filter((a) => a.type === type).length;

// ── 1. Points by tier, stamp, tier upgrade ───────────────────────────────────
await custOrder('c1', 'cust1');
check('customer order priced 21.4 (2×10 + 7 %)', num((await get('orders/c1')).total) === 21.4);
check('paying does not need the member to exist beforehand', (await member('A', 'cust1')).orgId === undefined && await pay('c1'));
await waitEarn('c1');
let m = await member('A', 'cust1');
let e = await earn('c1');
check('bronce: floor(21.4 × 1) = 21 points, no bonus', num(m.points) === 21 && num(e.points) === 21 && num(e.bonusPoints) === 0, JSON.stringify([m.points, e.points]));
check('first visit: 1 stamp, 1 visit, lifetimeSpend 21.4, tier bronce', num(m.stamps) === 1 && num(m.visits) === 1 && num(m.lifetimeSpend) === 21.4 && m.tier === 'bronce');
check('member doc is keyed {orgId}_{uid} with orgId and uid', m.orgId === 'A' && m.uid === 'cust1');
check('earn event carries order, total, member, tier', e.orderId === 'c1' && num(e.total) === 21.4 && e.memberId === 'A_cust1' && e.type === 'earn' && e.uid === 'cust1' && e.stampCompleted === false && e.tierAfter === 'bronce');
check('points are per organization (no member in org B)', (await member('B', 'cust1')).orgId === undefined);

// Idempotent per order: flip pending → paid again (the trigger fires again).
await patch('orders/c1', { payment: { method: 'cash', status: 'pending' } });
await sleep(1000);
await patch('orders/c1', { payment: { method: 'cash', status: 'paid' } });
await waitFor('onOrderPaid ran twice', async () => (await auditCount('c1', 'order_paid')) === 2);
await sleep(2500);
m = await member('A', 'cust1');
check('re-paying the same order does not award again (points 21, visits 1, stamps 1)', num(m.points) === 21 && num(m.visits) === 1 && num(m.stamps) === 1);
check('exactly one earn event for the order', (await query('loyalty_events', 'orderId', 'c1')).filter((x) => x.type === 'earn').length === 1);

await seedMember('cust2', { lifetimeSpend: 60, visits: 5, tier: 'plata' });
await custOrder('c2', 'cust2');
await pay('c2');
await waitEarn('c2');
check('plata: floor(21.4 × 1.25) = 26 points', num((await earn('c2')).points) === 26 && num((await member('A', 'cust2')).points) === 26, String((await earn('c2')).points));

await seedMember('cust3', { lifetimeSpend: 150, visits: 9, tier: 'oro' });
await custOrder('c3', 'cust3');
await pay('c3');
await waitEarn('c3');
check('oro: floor(21.4 × 1.5) = 32 points', num((await earn('c3')).points) === 32 && num((await member('A', 'cust3')).points) === 32, String((await earn('c3')).points));

await seedMember('cust4', { lifetimeSpend: 40, visits: 3, tier: 'bronce' });
await custOrder('c4', 'cust4');
await pay('c4');
await waitEarn('c4');
m = await member('A', 'cust4');
check('crossing 50 B/. upgrades to plata, but THIS order still earned at the bronce rate (21)', m.tier === 'plata' && num(m.lifetimeSpend) === 61.4 && num((await earn('c4')).points) === 21, JSON.stringify([m.tier, m.lifetimeSpend]));

await seedMember('cust5', { stamps: 7 });
await custOrder('c5', 'cust5');
await pay('c5');
await waitEarn('c5');
m = await member('A', 'cust5');
const v5 = await query('loyalty_vouchers', 'uid', 'cust5');
check('8th stamp completes the card: stamps reset to 0, event.stampCompleted', num(m.stamps) === 0 && (await earn('c5')).stampCompleted === true);
check('stamp card issues one active voucher "bowl-sellos" (source stamps)', v5.length === 1 && v5[0].rewardId === 'bowl-sellos' && v5[0].status === 'active' && v5[0].source === 'stamps' && v5[0].orgId === 'A' && v5[0].id === `A_${v5[0].code}`, JSON.stringify(v5));

// Points on the DISCOUNTED total (what the customer actually paid).
await custOrder('c6', 'cust6', [['P20', 1]]);
check('applyDiscount 25 % on the customer order → total 16.05', (await call('applyDiscount', 'wA', { orderId: 'c6', discountId: 'jub', idNumber: '8-100-200' }))?.total === 16.05);
await pay('c6');
await waitEarn('c6');
e = await earn('c6');
check('points on the discounted total: floor(16.05) = 16, not floor(21.4) = 21', num(e.points) === 16 && num(e.total) === 16.05, JSON.stringify([e.points, e.total]));
check('lifetimeSpend counts what was paid (16.05)', num((await member('A', 'cust6')).lifetimeSpend) === 16.05);

// Staff-created orders earn nothing for the waiter.
await staffOrder('s1');
await pay('s1');
await waitFor('s1 order_paid audit', async () => (await auditCount('s1', 'order_paid')) === 1);
await sleep(2500);
check('staff order earns nothing: no earn event, no member for the waiter', (await query('loyalty_events', 'orderId', 's1')).length === 0 && (await member('A', 'wA')).orgId === undefined);

// ── 2. redeemReward ──────────────────────────────────────────────────────────
await seedMember('cust7', { points: 99 });
check('bad rewardId → INVALID_ARGUMENT', (await call('redeemReward', 'cust7', { orgId: 'A', rewardId: 'ferrari' })).error === 'INVALID_ARGUMENT');
check('missing orgId → INVALID_ARGUMENT', (await call('redeemReward', 'cust7', { rewardId: 'postre' })).error === 'INVALID_ARGUMENT');
check('99 points < 100 → FAILED_PRECONDITION', (await call('redeemReward', 'cust7', { orgId: 'A', rewardId: 'postre' })).error === 'FAILED_PRECONDITION');
check('refused redeem: points still 99, no voucher', num((await member('A', 'cust7')).points) === 99 && (await query('loyalty_vouchers', 'uid', 'cust7')).length === 0);
check('a customer with no member doc cannot redeem', (await call('redeemReward', 'nobody', { orgId: 'A', rewardId: 'postre' })).error === 'FAILED_PRECONDITION');
check('points do not travel to another org (member B_cust7 does not exist)', (await call('redeemReward', 'cust7', { orgId: 'B', rewardId: 'postre' })).error === 'FAILED_PRECONDITION');

await patch('loyalty_members/A_cust7', { points: 250 });
const rd = await call('redeemReward', 'cust7', { orgId: 'A', rewardId: 'postre' });
check('redeem postre (100) → { code (6 chars), rewardName }', /^[A-Z0-9]{6}$/.test(rd?.code ?? '') && rd?.rewardName === 'Postre del día gratis', JSON.stringify(rd));
const vd = await get(`loyalty_vouchers/A_${rd.code}`);
check('voucher stored: active, source points, cost 100, owner cust7, org A', vd.status === 'active' && vd.source === 'points' && num(vd.cost) === 100 && vd.uid === 'cust7' && vd.orgId === 'A' && vd.rewardId === 'postre' && vd.code === rd.code);
check('points debited: 250 → 150', num((await member('A', 'cust7')).points) === 150);
const rdEv = (await query('loyalty_events', 'uid', 'cust7')).filter((x) => x.type === 'redeem');
check('redeem event in the ledger (−100, voucherCode)', rdEv.length === 1 && num(rdEv[0].points) === -100 && rdEv[0].voucherCode === rd.code);

// Double redeem: two simultaneous taps with exactly 100 points → exactly one voucher.
await patch('loyalty_members/A_cust7', { points: 100 });
const race = await Promise.all([call('redeemReward', 'cust7', { orgId: 'A', rewardId: 'postre' }), call('redeemReward', 'cust7', { orgId: 'A', rewardId: 'postre' })]);
check('double tap with 100 points: exactly one succeeds', race.filter((r) => r?.code).length === 1 && race.filter((r) => r?.error === 'FAILED_PRECONDITION').length === 1, JSON.stringify(race));
check('points never go negative (0) and 2 postre vouchers exist in total', num((await member('A', 'cust7')).points) === 0 && (await query('loyalty_vouchers', 'uid', 'cust7')).length === 2);

// ── 3. useVoucher ────────────────────────────────────────────────────────────
const code = rd.code;
check('customer cannot use a voucher', (await call('useVoucher', 'cust7', { code, commit: true })).error === 'PERMISSION_DENIED');
check('KDS operator cannot use a voucher', (await call('useVoucher', 'opK', { code, commit: true })).error === 'PERMISSION_DENIED');
check('inactive waiter cannot use a voucher', (await call('useVoucher', 'wOff', { code, commit: true })).error === 'PERMISSION_DENIED');
check('waiter of another org: code not found (vouchers are per org)', (await call('useVoucher', 'wB', { code, commit: true })).error === 'NOT_FOUND');
check('malformed code → INVALID_ARGUMENT', (await call('useVoucher', 'wA', { code: 'ab' })).error === 'INVALID_ARGUMENT');
check('unknown code → NOT_FOUND', (await call('useVoucher', 'wA', { code: 'ZZZZZZ' })).error === 'NOT_FOUND');
const look = await call('useVoucher', 'wA', { code: code.toLowerCase() });
check('lookup (commit absent) shows the reward, used:false, lowercase accepted', look?.rewardName === 'Postre del día gratis' && look?.used === false && look?.code === code, JSON.stringify(look));
check('lookup does not consume the voucher', (await get(`loyalty_vouchers/A_${code}`)).status === 'active');
const use = await call('useVoucher', 'mgrA', { code, commit: true });
check('manager commits → used:true', use?.used === true, JSON.stringify(use));
const vu = await get(`loyalty_vouchers/A_${code}`);
check('voucher marked used by the manager, with usedAt', vu.status === 'used' && vu.usedBy === 'mgrA' && !!vu.usedAt);
check('second use (commit) → FAILED_PRECONDITION', (await call('useVoucher', 'wA', { code, commit: true })).error === 'FAILED_PRECONDITION');
check('second lookup of a used voucher → FAILED_PRECONDITION too', (await call('useVoucher', 'wA', { code })).error === 'FAILED_PRECONDITION');
check('used voucher keeps its first usedBy', (await get(`loyalty_vouchers/A_${code}`)).usedBy === 'mgrA');
const stampCode = v5[0].code;
check('a stamp-card voucher is redeemable by the waiter too', (await call('useVoucher', 'wA', { code: stampCode, commit: true }))?.used === true);

// ── 4. attachMember ──────────────────────────────────────────────────────────
await staffOrder('a1');
for (const u of ['cust8', 'cust9', 'cust11', 'cust12']) await createAuthUserWithUid(u); // attachMember needs an existing Auth user (no member doc yet)
check('customer cannot attach', (await call('attachMember', 'cust8', { orderId: 'a1', memberId: 'A_cust8' })).error === 'PERMISSION_DENIED');
check('KDS operator cannot attach', (await call('attachMember', 'opK', { orderId: 'a1', memberId: 'A_cust8' })).error === 'PERMISSION_DENIED');
check('missing args → INVALID_ARGUMENT', (await call('attachMember', 'wA', { orderId: 'a1' })).error === 'INVALID_ARGUMENT');
check('member of another org (B_…) → INVALID_ARGUMENT', (await call('attachMember', 'wA', { orderId: 'a1', memberId: 'B_cust8' })).error === 'INVALID_ARGUMENT');
check('bare prefix "A_" → INVALID_ARGUMENT', (await call('attachMember', 'wA', { orderId: 'a1', memberId: 'A_' })).error === 'INVALID_ARGUMENT');
check('waiter of org B cannot reach an org A order', (await call('attachMember', 'wB', { orderId: 'a1', memberId: 'B_cust8' })).error === 'NOT_FOUND');
check('unknown order → NOT_FOUND', (await call('attachMember', 'wA', { orderId: 'nope', memberId: 'A_cust8' })).error === 'NOT_FOUND');
check('refusals attached nobody', (await get('orders/a1')).loyaltyUid === undefined);

const at1 = await call('attachMember', 'wA', { orderId: 'a1', memberId: 'A_cust8' });
check('unpaid order: a never-paid Auth user (no member doc) is attached, awarded:false', at1?.awarded === false && (await get('orders/a1')).loyaltyUid === 'cust8', JSON.stringify(at1));
check('attaching the same member again is idempotent', (await call('attachMember', 'wA2', { orderId: 'a1', memberId: 'A_cust8' }))?.awarded === false);
check('one member per order: a different member → FAILED_PRECONDITION', (await call('attachMember', 'wA', { orderId: 'a1', memberId: 'A_cust9' })).error === 'FAILED_PRECONDITION' && (await get('orders/a1')).loyaltyUid === 'cust8');
check('nothing awarded before payment', (await earn('a1')).orgId === undefined && (await member('A', 'cust8')).orgId === undefined);
await pay('a1');
await waitEarn('a1');
m = await member('A', 'cust8');
check('on pay the attached member earns (21 points) and it is NOT the waiter', num(m.points) === 21 && (await earn('a1')).uid === 'cust8' && (await member('A', 'wA')).orgId === undefined, JSON.stringify(m.points));

// Customer orders already earn for their own customer.
await custOrder('a2', 'cust10');
const atC = await callFull('attachMember', 'wA', { orderId: 'a2', memberId: 'A_cust11' });
check('customer order cannot be re-assigned → FAILED_PRECONDITION', atC.error === 'FAILED_PRECONDITION', JSON.stringify(atC));
check('customer order still unattached', (await get('orders/a2')).loyaltyUid === undefined);

// Already paid when attached → awarded right away, once.
await staffOrder('a3');
await pay('a3');
await waitFor('a3 audit', async () => (await auditCount('a3', 'order_paid')) === 1);
await sleep(1500);
check('paid staff order earned nothing at payment', (await earn('a3')).orgId === undefined);
const at3 = await call('attachMember', 'wA', { orderId: 'a3', memberId: 'A_cust12' });
check('paid order: awarded:true and the points come back (21)', at3?.awarded === true && at3?.points === 21, JSON.stringify(at3));
check('member created with 21 points, earn event for the order', num((await member('A', 'cust12')).points) === 21 && (await earn('a3')).uid === 'cust12');
const at3b = await call('attachMember', 'wA', { orderId: 'a3', memberId: 'A_cust12' });
check('attaching again does not double award', at3b?.awarded === true && at3b?.points === 21 && num((await member('A', 'cust12')).points) === 21 && (await query('loyalty_events', 'orderId', 'a3')).length === 1, JSON.stringify(at3b));

// ── 5. Rules: a customer reads only their own loyalty data; nobody writes ────
const voucher5 = `loyalty_vouchers/${v5[0].id}`;
check('control: cust1 reads own member', await readAs('cust1', 'loyalty_members/A_cust1'));
check('another customer cannot read the member', !(await readAs('cust2', 'loyalty_members/A_cust1')));
check('staff (waiter) cannot read a customer member doc', !(await readAs('wA', 'loyalty_members/A_cust1')));
check('manager cannot read it either', !(await readAs('mgrA', 'loyalty_members/A_cust1')));
check('control: cust1 reads own earn event', await readAs('cust1', 'loyalty_events/earn_c1'));
check('another customer cannot read the event', !(await readAs('cust2', 'loyalty_events/earn_c1')) && !(await readAs('wA', 'loyalty_events/earn_c1')));
check('control: cust5 reads own voucher', await readAs('cust5', voucher5));
check('another customer / waiter cannot read the voucher', !(await readAs('cust1', voucher5)) && !(await readAs('wA', voucher5)));
check('owner of the member cannot write it (points)', !(await update('cust1', 'loyalty_members/A_cust1', { points: 99999 })));
check('owner of the voucher cannot mark it used / edit it', !(await update('cust5', voucher5, { status: 'used' })) && !(await update('cust5', voucher5, { rewardId: 'almuerzo-dos' })));
check('manager cannot write a member either', !(await update('mgrA', 'loyalty_members/A_cust1', { points: 99999 })));
check('points unchanged after the rules probes', num((await member('A', 'cust1')).points) === 21);

// Findings #98: staff and ghost members are refused.
await createAuthUserWithUid('wA'); await createAuthUserWithUid('wA2');
await staffOrder('p1');
const self = await callFull('attachMember', 'wA', { orderId: 'p1', memberId: 'A_wA' });
check('attachMember refuses the waiter\'s own member id', self.error === 'INVALID_ARGUMENT' && (await get('orders/p1')).loyaltyUid === undefined, JSON.stringify(self));
await seedMember('wA', {});
const self2 = await callFull('attachMember', 'wA', { orderId: 'p1', memberId: 'A_wA' });
check('...even if a member doc exists for the staff uid', self2.error === 'INVALID_ARGUMENT' && (await get('orders/p1')).loyaltyUid === undefined, JSON.stringify(self2));
const other = await callFull('attachMember', 'wA', { orderId: 'p1', memberId: 'A_wA2' });
check('attachMember refuses another staff uid too', other.error === 'INVALID_ARGUMENT', JSON.stringify(other));
await staffOrder('p2');
const ghost = await callFull('attachMember', 'wA', { orderId: 'p2', memberId: 'A_neverseen' });
check('attachMember refuses a made-up uid that is not in Auth', ghost.error === 'NOT_FOUND' && (await get('orders/p2')).loyaltyUid === undefined, JSON.stringify(ghost));
await patch('loyalty_members/A_wrongorg', { orgId: 'B', uid: 'wrongorg', points: 0 });
await createAuthUserWithUid('wrongorg');
check('attachMember refuses a member doc of another org', (await call('attachMember', 'wA', { orderId: 'p2', memberId: 'A_wrongorg' })).error === 'NOT_FOUND');
// awardLoyalty defense in depth: an order with loyaltyUid = the staff uid (written by admin) earns nothing.
await staffOrder('p3');
await patch('orders/p3', { loyaltyUid: 'wA' });
await pay('p3');
await waitFor('p3 audit', async () => (await auditCount('p3', 'order_paid')) === 1);
await sleep(1500);
check('awardLoyalty never awards a staff uid (loyaltyUid = creator)', (await earn('p3')).orgId === undefined && num((await member('A', 'wA')).points) === 0);
done();
