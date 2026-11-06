// syncStaffClaims (users/{uid} → custom claims) and the RTDB rule order_items/$stationId. Emulator only.
import { patch, createAuthUser, signInPassword, claimsOf, setClaimsRaw, jwtPayload, rtdbAs, waitFor, sleep, check, done, validSinceOf } from './helpers.mjs';

const claimsEq = async (uid, want) => JSON.stringify(Object.entries(await claimsOf(uid)).sort()) === JSON.stringify(Object.entries(want).sort());

await rtdbAs('owner', 'PUT', 'order_items/S1/t1', { productName: 'Huevos', status: 'queued' });
await rtdbAs('owner', 'PUT', 'order_items/S2/t1', { productName: 'Cerveza', status: 'queued' });

// The Auth user must exist before users/{uid} is written: the trigger fires once.
const uid = await createAuthUser('kds1@test.io');
check('new Auth user has no claims yet', Object.keys(await claimsOf(uid)).length === 0);

// ── 1. Creating the users doc emits the claims ───────────────────────────────
await patch(`users/${uid}`, { orgId: 'A', role: 'operator', stationId: 'S1', isActive: true, displayName: 'KDS 1' });
await waitFor('claims for S1', () => claimsEq(uid, { orgId: 'A', role: 'operator', stationId: 'S1' }));
check('users doc created → claims { orgId A, role operator, stationId S1 } in Auth', true);
let tok = await signInPassword('kds1@test.io');
const p1 = jwtPayload(tok);
check('a fresh ID token carries the claims', p1.orgId === 'A' && p1.role === 'operator' && p1.stationId === 'S1', JSON.stringify([p1.orgId, p1.role, p1.stationId]));

// ── 2. RTDB: order_items/$stationId readable only with the matching claim ────
const own = await rtdbAs(tok, 'GET', 'order_items/S1');
check('station S1 token reads order_items/S1', own.ok && own.body?.t1?.productName === 'Huevos', JSON.stringify(own));
check('station S1 token cannot read order_items/S2', !(await rtdbAs(tok, 'GET', 'order_items/S2')).ok);
check('station S1 token cannot read the whole order_items tree', !(await rtdbAs(tok, 'GET', 'order_items')).ok);
check('station S1 token cannot read the RTDB root', !(await rtdbAs(tok, 'GET', '')).ok);
check('unauthenticated cannot read order_items/S1', !(await rtdbAs(null, 'GET', 'order_items/S1')).ok);
check('station S1 token may update its own ticket status', (await rtdbAs(tok, 'PATCH', 'order_items/S1/t1', { status: 'in_progress' })).ok);
check('station S1 token cannot write into S2', !(await rtdbAs(tok, 'PATCH', 'order_items/S2/t1', { status: 'done' })).ok);
check('S2 ticket untouched', (await rtdbAs('owner', 'GET', 'order_items/S2/t1')).body?.status === 'queued');
check('S1 write landed', (await rtdbAs('owner', 'GET', 'order_items/S1/t1')).body?.status === 'in_progress');
check('claim without stationId (a waiter-like user) reads no station', await (async () => {
  const wuid = await createAuthUser('w1@test.io');
  await patch(`users/${wuid}`, { orgId: 'A', role: 'waiter' });
  await waitFor('waiter claims', () => claimsEq(wuid, { orgId: 'A', role: 'waiter' }));
  const wt = await signInPassword('w1@test.io');
  return !(await rtdbAs(wt, 'GET', 'order_items/S1')).ok;
})());

// ── 3. Changing the station re-emits; the old token keeps the old claim ──────
await patch(`users/${uid}`, { stationId: 'S2' });
await waitFor('claims for S2', () => claimsEq(uid, { orgId: 'A', role: 'operator', stationId: 'S2' }));
check('stationId S1 → S2 re-issues the claims', true);
check('the old token keeps working until it refreshes (expected, ≤1 h)', (await rtdbAs(tok, 'GET', 'order_items/S1')).ok);
tok = await signInPassword('kds1@test.io');
check('after a token refresh: reads S2, no longer S1', (await rtdbAs(tok, 'GET', 'order_items/S2')).ok && !(await rtdbAs(tok, 'GET', 'order_items/S1')).ok);

// ── 4. Other edits do not touch the claims ───────────────────────────────────
await setClaimsRaw(uid, { orgId: 'A', role: 'operator', stationId: 'S2', marker: 'keep' });
await patch(`users/${uid}`, { displayName: 'Cocina 2', isActive: true });
await sleep(3000);
check('editing displayName / isActive does not re-emit (marker survives)', (await claimsOf(uid)).marker === 'keep');
await patch(`users/${uid}`, { role: 'manager' });
await waitFor('claims role manager', () => claimsEq(uid, { orgId: 'A', role: 'manager', stationId: 'S2' }));
check('role change re-emits (and replaces the whole claim set, marker gone)', true);
await patch(`users/${uid}`, { orgId: 'B' });
await waitFor('claims org B', () => claimsEq(uid, { orgId: 'B', role: 'manager', stationId: 'S2' }));
check('org change re-emits', true);

// ── 5. Removing the station drops the claim ──────────────────────────────────
await patch(`users/${uid}`, { stationId: '', role: 'operator', orgId: 'A' });
await waitFor('claims without station', () => claimsEq(uid, { orgId: 'A', role: 'operator' }));
check('empty stationId → claim removed (not an empty string)', !('stationId' in (await claimsOf(uid))));
tok = await signInPassword('kds1@test.io');
check('after refresh the user reads no station at all', !(await rtdbAs(tok, 'GET', 'order_items/S1')).ok && !(await rtdbAs(tok, 'GET', 'order_items/S2')).ok);

// ── 6. A users doc for a missing Auth user does not crash the trigger ────────
await patch('users/no-auth-user', { orgId: 'A', role: 'operator', stationId: 'S1' });
check('ghost user did not break the next user (trigger keeps running)', await (async () => {
  const gu = await createAuthUser('late@test.io');
  await patch(`users/${gu}`, { orgId: 'A', role: 'waiter' });
  await waitFor('late claims', () => claimsEq(gu, { orgId: 'A', role: 'waiter' }));
  return true;
})());

// ── 7. Deactivated operator (finding #99) ───────────────────────────────────
await patch(`users/${uid}`, { stationId: 'S1', role: 'operator' });
await waitFor('claims S1 again', () => claimsEq(uid, { orgId: 'A', role: 'operator', stationId: 'S1' }));
const oldTok = await signInPassword('kds1@test.io');
check('control: active operator reads S1', (await rtdbAs(oldTok, 'GET', 'order_items/S1')).ok);
await patch(`users/${uid}`, { isActive: false });
await waitFor('claims removed on deactivation', async () => Object.keys(await claimsOf(uid)).length === 0);
check('isActive=false → custom claims removed', true);
tok = await signInPassword('kds1@test.io');
check('deactivated: a fresh token carries no stationId and reads no station', jwtPayload(tok).stationId === undefined && !(await rtdbAs(tok, 'GET', 'order_items/S1')).ok);
const vs = await validSinceOf(uid);
check('deactivated: refresh tokens revoked (validSince set)', Number(vs) > 0, String(vs));
await patch(`users/${uid}`, { displayName: 'Cocina baja' });
await sleep(2000);
check('editing a deactivated user does not re-emit claims', Object.keys(await claimsOf(uid)).length === 0);
await patch(`users/${uid}`, { isActive: true });
await waitFor('claims re-emitted on reactivation', () => claimsEq(uid, { orgId: 'A', role: 'operator', stationId: 'S1' }));
check('isActive=true again → claims re-emitted', true);
tok = await signInPassword('kds1@test.io');
check('reactivated: reads S1 again', (await rtdbAs(tok, 'GET', 'order_items/S1')).ok);
done();
