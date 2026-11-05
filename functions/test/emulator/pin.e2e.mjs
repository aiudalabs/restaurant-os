// PIN logins: setWaiterPin / waiterRoster / waiterLogin and setStationPin / kdsLogin, with the escalating lockout
// (functions/src/kds/pin-lock.ts). Emulator only.
import { patch, get, call, callFull, readAs, signInCustom, claimsOf, jwtPayload, rtdbAs, query, check, done, note } from './helpers.mjs';

const num = (v) => Number(v);
const MIN = 60 * 1000;

await patch('users/admA', { orgId: 'A', role: 'admin' });
await patch('users/mgrA', { orgId: 'A', role: 'manager' });
await patch('users/wA', { orgId: 'A', role: 'waiter' });
await patch('users/opK', { orgId: 'A', role: 'operator', stationId: 'K' });
await patch('users/admB', { orgId: 'B', role: 'admin' });
await patch('branches/b1', { orgId: 'A', name: 'Sucursal Uno' });
await patch('branches/b2', { orgId: 'A', name: 'Sucursal Dos' });
await patch('branches/bB', { orgId: 'B', name: 'Sucursal B' });
const waiter = (uid, name, extra = {}) => patch(`users/${uid}`, { orgId: 'A', role: 'waiter', displayName: name, isActive: true, branchIds: ['b1'], ...extra });
await waiter('wZoe', 'Zoe');
await waiter('wAna', 'Ana');
await waiter('wBea', 'Bea'); // no PIN
await waiter('wOld', 'Old', { isActive: false });
await waiter('wOtra', 'Otra', { branchIds: ['b2'] });
await patch('users/wBB', { orgId: 'B', role: 'waiter', displayName: 'Bruno', isActive: true, branchIds: ['b1'] }); // org B member listing b1: must never appear

// ── 1. setWaiterPin ──────────────────────────────────────────────────────────
const set = (caller, userId, pin) => call('setWaiterPin', caller, { userId, pin });
check('anonymous caller refused', (await set('anon-1', 'wZoe', '123456')).error === 'PERMISSION_DENIED');
check('waiter cannot set PINs', (await set('wA', 'wZoe', '123456')).error === 'PERMISSION_DENIED');
check('KDS operator cannot set PINs', (await set('opK', 'wZoe', '123456')).error === 'PERMISSION_DENIED');
check('5-digit PIN refused', (await set('admA', 'wZoe', '12345')).error === 'INVALID_ARGUMENT');
check('7-digit PIN refused', (await set('admA', 'wZoe', '1234567')).error === 'INVALID_ARGUMENT');
check('non-numeric PIN refused', (await set('admA', 'wZoe', '12345a')).error === 'INVALID_ARGUMENT');
check('missing userId refused', (await set('admA', undefined, '123456')).error === 'INVALID_ARGUMENT');
check('admin of another org cannot set it', (await set('admB', 'wZoe', '123456')).error === 'PERMISSION_DENIED');
check('unknown user → PERMISSION_DENIED (no existence oracle)', (await set('admA', 'ghost', '123456')).error === 'PERMISSION_DENIED');
check('only waiters use PINs (target = manager) → FAILED_PRECONDITION', (await set('admA', 'mgrA', '123456')).error === 'FAILED_PRECONDITION');
check('refusals created no staff_pins doc', (await get('staff_pins/wZoe')).pinHash === undefined);
check('manager sets Zoe', (await set('mgrA', 'wZoe', '111111'))?.success === true);
check('admin sets Ana, Old (inactive), Otra', (await set('admA', 'wAna', '222222'))?.success === true && (await set('admA', 'wOld', '333333'))?.success === true && (await set('admA', 'wOtra', '444444'))?.success === true);
const sp = await get('staff_pins/wZoe');
check('PIN stored hashed (salt + pbkdf2 hash), never in clear', typeof sp.salt === 'string' && sp.pinHash?.length === 64 && !JSON.stringify(sp).includes('111111') && sp.orgId === 'A' && sp.userId === 'wZoe');
check('fresh record: failedAttempts 0, lockLevel 0, lockedUntil 0', num(sp.failedAttempts) === 0 && num(sp.lockLevel) === 0 && num(sp.lockedUntil) === 0);
await set('admA', 'wZoe', '111111');
check('same PIN set twice gets a new salt', (await get('staff_pins/wZoe')).salt !== sp.salt);
check('rules: not even an admin can read staff_pins', !(await readAs('admA', 'staff_pins/wZoe')) && !(await readAs('wZoe', 'staff_pins/wZoe')));
check('rules: nobody can read kds_pins', !(await readAs('admA', 'kds_pins/anything')));

// ── 2. waiterRoster ──────────────────────────────────────────────────────────
const ro = await call('waiterRoster', 'anon-1', { branchId: 'b1' });
check('roster is public and lists active waiters WITH a PIN of that branch, sorted: Ana, Zoe',
  JSON.stringify(ro?.waiters?.map((w) => w.displayName)) === JSON.stringify(['Ana', 'Zoe']), JSON.stringify(ro));
check('roster hides: no-PIN (Bea), inactive (Old), other branch (Otra), other org (Bruno), non-waiters', !JSON.stringify(ro).match(/Bea|Old|Otra|Bruno|admA|mgrA/));
check('roster entries are only { uid, displayName } + branchName (no hash, no org)', ro?.branchName === 'Sucursal Uno' && ro.waiters.every((w) => Object.keys(w).sort().join() === 'displayName,uid') && !JSON.stringify(ro).match(/pinHash|salt|orgId/));
const ro2 = await call('waiterRoster', 'anon-1', { branchId: 'b2' });
check('branch b2 roster has only Otra', JSON.stringify(ro2?.waiters?.map((w) => w.displayName)) === JSON.stringify(['Otra']));
check('roster without branchId → INVALID_ARGUMENT', (await call('waiterRoster', 'anon-1', {})).error === 'INVALID_ARGUMENT');
check('roster of unknown branch → NOT_FOUND', (await call('waiterRoster', 'anon-1', { branchId: 'nope' })).error === 'NOT_FOUND');
await set('admA', 'wBea', '555555');
await set('admB', 'wBB', '888888');
check('after Bea gets a PIN the roster adds her', JSON.stringify((await call('waiterRoster', 'anon-1', { branchId: 'b1' }))?.waiters?.map((w) => w.displayName)) === JSON.stringify(['Ana', 'Bea', 'Zoe']));

// ── 3. waiterLogin ───────────────────────────────────────────────────────────
const login = (userId, pin, branchId = 'b1') => callFull('waiterLogin', null, { branchId, userId, pin });
check('invalid PIN format → INVALID_ARGUMENT', (await login('wZoe', '12')).error === 'INVALID_ARGUMENT' && (await login('wZoe', 'abcdef')).error === 'INVALID_ARGUMENT');
check('missing userId → INVALID_ARGUMENT', (await login(undefined, '111111')).error === 'INVALID_ARGUMENT');
check('waiter of another branch cannot log in here → PERMISSION_DENIED', (await login('wOtra', '444444')).error === 'PERMISSION_DENIED');
check('inactive waiter cannot log in even with the right PIN', (await login('wOld', '333333')).error === 'PERMISSION_DENIED');
check('manager id cannot use the waiter login', (await login('mgrA', '111111')).error === 'PERMISSION_DENIED');
await patch('users/wNoPin', { orgId: 'A', role: 'waiter', isActive: true, branchIds: ['b1'], displayName: 'SinPin' });
check('waiter without PIN → NOT_FOUND', (await login('wNoPin', '111111')).error === 'NOT_FOUND');

const w1 = await login('wZoe', '000000');
check('wrong PIN → PERMISSION_DENIED "PIN incorrecto."', w1.error === 'PERMISSION_DENIED' && w1.message === 'PIN incorrecto.', JSON.stringify(w1));
check('failedAttempts = 1', num((await get('staff_pins/wZoe')).failedAttempts) === 1);
await login('wZoe', '000000');
check('failedAttempts = 2', num((await get('staff_pins/wZoe')).failedAttempts) === 2);
const ok = await login('wZoe', '111111');
check('correct PIN → { token }', typeof ok?.token === 'string' && ok.token.split('.').length === 3, JSON.stringify(ok).slice(0, 80));
check('correct PIN resets failedAttempts to 0', num((await get('staff_pins/wZoe')).failedAttempts) === 0);
const cp = jwtPayload(ok.token);
check('custom token is for that waiter with claims { orgId, role }', cp.uid === 'wZoe' && cp.claims?.orgId === 'A' && cp.claims?.role === 'waiter' && !('stationId' in (cp.claims ?? {})), JSON.stringify(cp.claims));
const idTok = await signInCustom(ok.token);
const idp = jwtPayload(idTok);
check('exchanged for a real ID token, the claims are orgId A / role waiter', idp.user_id === 'wZoe' && idp.orgId === 'A' && idp.role === 'waiter', JSON.stringify([idp.user_id, idp.orgId, idp.role]));
check('the waiter ID token has no KDS access (RTDB order_items/K denied)', !(await rtdbAs(idTok, 'GET', 'order_items/K')).ok);

// Escalating lockout on Ana: 5 wrong → 5 min → 30 min → 24 h (capped).
const expire = (path) => patch(path, { lockedUntil: 1 });
async function burn(userId) {
  let last;
  for (let i = 0; i < 5; i++) last = await login(userId, '999999');
  return last;
}
for (let i = 0; i < 4; i++) await login('wAna', '999999');
let a = await get('staff_pins/wAna');
check('4 wrong PINs: still counting, not locked', num(a.failedAttempts) === 4 && num(a.lockedUntil) === 0 && num(a.lockLevel) === 0);
const l1 = await login('wAna', '999999');
a = await get('staff_pins/wAna');
check('5th wrong PIN → locked 5 min (message), counter reset, level 1', l1.error === 'PERMISSION_DENIED' && /Bloqueado 5 min/.test(l1.message) && num(a.failedAttempts) === 0 && num(a.lockLevel) === 1, JSON.stringify([l1, a.lockLevel]));
const until1 = num(a.lockedUntil) - Date.now();
check('lockedUntil ≈ now + 5 min', until1 > 4.5 * MIN && until1 <= 5 * MIN, String(until1));
const lk = await login('wAna', '222222');
check('while locked even the CORRECT PIN is refused → RESOURCE_EXHAUSTED', lk.error === 'RESOURCE_EXHAUSTED' && /Demasiados intentos/.test(lk.message), JSON.stringify(lk));
await login('wAna', '999999');
a = await get('staff_pins/wAna');
check('wrong PIN while locked does not count and does not extend the lock', num(a.failedAttempts) === 0 && num(a.lockLevel) === 1 && Math.abs(num(a.lockedUntil) - Date.now() - until1) < 10000);
await expire('staff_pins/wAna');
const l2 = await burn('wAna');
a = await get('staff_pins/wAna');
check('after the lock expires, 5 more wrong → 30 min, level 2', /Bloqueado 30 min/.test(l2.message) && num(a.lockLevel) === 2 && num(a.lockedUntil) - Date.now() > 29 * MIN && num(a.lockedUntil) - Date.now() <= 30 * MIN, l2.message);
await expire('staff_pins/wAna');
const l3 = await burn('wAna');
a = await get('staff_pins/wAna');
check('next round → 24 h, level 3', /Bloqueado 24 h/.test(l3.message) && num(a.lockLevel) === 3 && num(a.lockedUntil) - Date.now() > 23.9 * 60 * MIN, l3.message);
await expire('staff_pins/wAna');
const l4 = await burn('wAna');
a = await get('staff_pins/wAna');
check('the lock level is capped at 24 h (level stays 3)', /Bloqueado 24 h/.test(l4.message) && num(a.lockLevel) === 3);
await expire('staff_pins/wAna');
check('after the lock expires the right PIN logs in', typeof (await login('wAna', '222222'))?.token === 'string');
a = await get('staff_pins/wAna');
check('a successful login clears everything (level 0, attempts 0, lockedUntil 0)', num(a.lockLevel) === 0 && num(a.failedAttempts) === 0 && num(a.lockedUntil) === 0);
check('locks are per waiter: Zoe was never affected', typeof (await login('wZoe', '111111'))?.token === 'string');
// Admin resets a locked waiter by setting a new PIN.
await burn('wBea');
check('Bea is locked', (await login('wBea', '555555')).error === 'RESOURCE_EXHAUSTED');
await set('admA', 'wBea', '666666');
check('setting a new PIN lifts the lock; the old PIN stops working', (await login('wBea', '555555')).error === 'PERMISSION_DENIED' && typeof (await login('wBea', '666666'))?.token === 'string');

// ── 4. setStationPin / kdsLogin ──────────────────────────────────────────────
await patch('stations/S1', { orgId: 'A', branchId: 'b1', name: 'Cocina', isActive: true, categoryIds: ['food'], fcmTokens: [] });
await patch('stations/S2', { orgId: 'A', branchId: 'b1', name: 'Bar', isActive: true, categoryIds: ['drinks'], fcmTokens: [] });
await patch('stations/SB', { orgId: 'B', branchId: 'bB', name: 'Cocina B', isActive: true, categoryIds: ['food'], fcmTokens: [] });
const sset = (caller, stationId, pin) => call('setStationPin', caller, { stationId, pin });
check('anonymous caller cannot set a station PIN', (await sset('anon-1', 'S1', '123456')).error === 'PERMISSION_DENIED');
check('waiter cannot set a station PIN', (await sset('wA', 'S1', '123456')).error === 'PERMISSION_DENIED');
check('KDS operator cannot set a station PIN', (await sset('opK', 'S1', '123456')).error === 'PERMISSION_DENIED');
check('4-digit / 7-digit / letters → INVALID_ARGUMENT (6 digits only)', (await sset('admA', 'S1', '1234')).error === 'INVALID_ARGUMENT' && (await sset('admA', 'S1', '1234567')).error === 'INVALID_ARGUMENT' && (await sset('admA', 'S1', 'abcdef')).error === 'INVALID_ARGUMENT');
check('admin of org A cannot set the PIN of org B station', (await sset('admA', 'SB', '123456')).error === 'PERMISSION_DENIED');
check('unknown station → NOT_FOUND', (await sset('admA', 'nope', '123456')).error === 'NOT_FOUND');
check('refusals left no kds_pins doc', (await get('kds_pins/S1')).pinHash === undefined && (await get('kds_pins/SB')).pinHash === undefined);
// Manager: the task brief says admin/manager, the code (and its doc comment) say admin only.
const mgrSet = await sset('mgrA', 'S1', '123456');
check('manager is refused (setStationPin is admin-only in the code)', mgrSet.error === 'PERMISSION_DENIED');
note('setStationPin is admin-only (functions/src/kds/set-station-pin.ts) whereas setWaiterPin accepts admin or manager: confirm that is intended');

const ss = await sset('admA', 'S1', '123456');
check('admin sets the station PIN → { success, stationName }', ss?.success === true && ss?.stationName === 'Cocina', JSON.stringify(ss));
const kp = await get('kds_pins/S1');
check('kds_pins stores org, branch, station, operator and a hash, never the PIN', kp.orgId === 'A' && kp.branchId === 'b1' && kp.stationId === 'S1' && !!kp.operatorUid && kp.pinHash?.length === 64 && !JSON.stringify(kp).includes('123456'));
const op = await get(`users/${kp.operatorUid}`);
check('a device operator user was created: role operator, stationId S1, org A, branch b1', op.role === 'operator' && op.stationId === 'S1' && op.orgId === 'A' && op.isActive === true);
const opClaims = await claimsOf(kp.operatorUid);
check('operator claims set in Auth right away: { orgId A, role operator, stationId S1 }', opClaims.orgId === 'A' && opClaims.role === 'operator' && opClaims.stationId === 'S1', JSON.stringify(opClaims));

const klogin = (stationId, pin) => callFull('kdsLogin', null, { stationId, pin });
check('kdsLogin: missing station → INVALID_ARGUMENT', (await klogin(undefined, '123456')).error === 'INVALID_ARGUMENT');
check('kdsLogin: non-digit PIN → INVALID_ARGUMENT', (await klogin('S1', 'abcdef')).error === 'INVALID_ARGUMENT' && (await klogin('S1', '12')).error === 'INVALID_ARGUMENT');
check('kdsLogin: station without PIN → NOT_FOUND', (await klogin('S2', '123456')).error === 'NOT_FOUND');
const k1 = await klogin('S1', '000000');
check('kdsLogin: wrong PIN → PERMISSION_DENIED, failedAttempts 1', k1.error === 'PERMISSION_DENIED' && num((await get('kds_pins/S1')).failedAttempts) === 1, JSON.stringify(k1));
const kok = await klogin('S1', '123456');
check('kdsLogin: right PIN → { token, stationName }, attempts reset', typeof kok?.token === 'string' && kok?.stationName === 'Cocina' && num((await get('kds_pins/S1')).failedAttempts) === 0, JSON.stringify(kok).slice(0, 80));
const kc = jwtPayload(kok.token);
check('kds token: uid = the station operator, claims { orgId A, stationId S1, role operator }', kc.uid === kp.operatorUid && kc.claims?.orgId === 'A' && kc.claims?.stationId === 'S1' && kc.claims?.role === 'operator', JSON.stringify(kc.claims));
const kid = await signInCustom(kok.token);
const kip = jwtPayload(kid);
check('exchanged ID token carries stationId S1', kip.stationId === 'S1' && kip.orgId === 'A' && kip.role === 'operator');
await rtdbAs('owner', 'PUT', 'order_items/S1/t1', { productName: 'Huevos', status: 'queued' });
await rtdbAs('owner', 'PUT', 'order_items/S2/t1', { productName: 'Cerveza', status: 'queued' });
check('end to end: the KDS token reads its own station tickets in RTDB', (await rtdbAs(kid, 'GET', 'order_items/S1')).body?.t1?.productName === 'Huevos');
check('end to end: and cannot read another station', !(await rtdbAs(kid, 'GET', 'order_items/S2')).ok && !(await rtdbAs(kid, 'GET', 'order_items')).ok);

// Lockout on a station.
for (let i = 0; i < 4; i++) await klogin('S1', '000000');
const kl = await klogin('S1', '000000');
let kr = await get('kds_pins/S1');
check('kds: 5th wrong PIN → locked 5 min, level 1', /Bloqueado 5 min/.test(kl.message) && num(kr.lockLevel) === 1 && num(kr.lockedUntil) - Date.now() > 4.5 * MIN);
check('kds: while locked the right PIN → RESOURCE_EXHAUSTED', (await klogin('S1', '123456')).error === 'RESOURCE_EXHAUSTED');
await expire('kds_pins/S1');
const kl2 = await (async () => { let r; for (let i = 0; i < 5; i++) r = await klogin('S1', '000000'); return r; })();
check('kds: second lock → 30 min, level 2', /Bloqueado 30 min/.test(kl2.message) && num((await get('kds_pins/S1')).lockLevel) === 2);
// Re-running setStationPin clears the lock, replaces the PIN, keeps the same operator.
const ss2 = await sset('admA', 'S1', '654321');
kr = await get('kds_pins/S1');
check('setStationPin again: lock cleared, same operator reused', ss2?.success === true && num(kr.lockedUntil) === 0 && num(kr.lockLevel) === 0 && kr.operatorUid === kp.operatorUid);
check('old PIN no longer works, the new one does', (await klogin('S1', '123456')).error === 'PERMISSION_DENIED' && typeof (await klogin('S1', '654321'))?.token === 'string');
check('still exactly one operator user for the station', (await query('users', 'stationId', 'S1')).length === 1);
// Another station of the same org: independent PIN, independent operator.
await sset('admA', 'S2', '777777');
const kp2 = await get('kds_pins/S2');
check('station S2 gets its own operator and its own lock state', kp2.operatorUid && kp2.operatorUid !== kp.operatorUid && (await claimsOf(kp2.operatorUid)).stationId === 'S2' && typeof (await klogin('S2', '777777'))?.token === 'string');
check('a PIN of S2 does not open S1', (await klogin('S1', '777777')).error === 'PERMISSION_DENIED');

const info = await call('kdsStationInfo', 'anon-1', { stationId: 'S1' });
check('kdsStationInfo shows display names only', info?.stationName === 'Cocina' && info?.branchName === 'Sucursal Uno' && Object.keys(info).length === 2);
check('kdsStationInfo: unknown station → NOT_FOUND', (await call('kdsStationInfo', 'anon-1', { stationId: 'nope' })).error === 'NOT_FOUND');
done();
