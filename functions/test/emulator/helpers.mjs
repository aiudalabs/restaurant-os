// Shared helpers for the emulator suites (REST, no dependencies). Project: demo-ros-test.
export const P = 'demo-ros-test';
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}/v1/projects/${P}/databases/(default)/documents`;
const OFF = Number(process.env.EMU_PORT_OFFSET || 0); // permite correr con puertos desplazados si 8080/5001/9000 están ocupados
const FN = `http://127.0.0.1:${5001 + OFF}/${P}/us-central1`;
const DB = `http://127.0.0.1:${9000 + OFF}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const token = (uid, extra = {}) =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, aud: P, iss: `https://securetoken.google.com/${P}`, iat: 0, exp: 9999999999, ...extra })}.`;
export const anon = (uid) => token(uid, { firebase: { sign_in_provider: 'anonymous' } });
const enc = (v) =>
  v === null ? { nullValue: null }
    : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
      : typeof v === 'boolean' ? { booleanValue: v }
        : typeof v === 'number' ? { doubleValue: v }
          : typeof v === 'object' ? { mapValue: { fields: fields(v) } }
            : { stringValue: v };
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)]));
const dec = (x) => {
  const [k, v] = Object.entries(x)[0];
  return k === 'mapValue' ? Object.fromEntries(Object.entries(v.fields ?? {}).map(([a, b]) => [a, dec(b)])) : v;
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Writes fields of a document (owner = bypasses rules; else a user token). Throws when denied. */
export async function patch(path, data, auth = 'owner') {
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${FS}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fields(data) }),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
}
export const put = (path, data) => patch(path, data, 'owner');
/** Rules check: true if `uid` may update the existing doc with `data`. */
export async function update(uid, path, data) {
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${FS}/${path}?${mask}&currentDocument.exists=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token(uid)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fields(data) }),
  });
  return r.ok;
}
export async function get(path) {
  const j = await (await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer owner' } })).json();
  return Object.fromEntries(Object.entries(j.fields ?? {}).map(([k, v]) => [k, dec(v)]));
}
export const rtdb = async (path) =>
  (await fetch(`${DB}/${path}.json?ns=${P}`, { headers: { Authorization: 'Bearer owner' } })).json();
/** Calls a callable as `uid`: returns its result, or { error: STATUS }. */
export async function call(name, uid, data) {
  const r = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token(uid)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const j = await r.json();
  return j.error ? { error: j.error.status } : j.result;
}
/** Like call(), but keeps the error message: { error: STATUS, message } or the result. */
export async function callFull(name, uid, data) {
  const r = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const j = await r.json();
  return j.error ? { error: j.error.status, message: j.error.message ?? '' } : j.result;
}
/** Runs all calls with the same status check: `refused(await call(...), 'NOT_FOUND')`. */
export const refused = (res, status) => res?.error === status;

/** Documents of `coll` whose `field` equals `value`, as [{ id, ...fields }] (owner = bypasses rules). */
export async function query(coll, field, value) {
  const r = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }),
  });
  return (await r.json()).filter((x) => x.document).map((x) => ({
    id: x.document.name.split('/').pop(),
    ...Object.fromEntries(Object.entries(x.document.fields ?? {}).map(([k, v]) => [k, dec(v)])),
  }));
}
/** Rules check: true if `uid` may read the doc (a real user token, rules enforced). */
export async function readAs(uid, path) {
  const r = await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${token(uid)}` } });
  return r.ok;
}

// ── Auth + RTDB emulators (real tokens, rules enforced) ───────────────────────
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || `127.0.0.1:${9099 + OFF}`}/identitytoolkit.googleapis.com/v1`;
const DBH = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST || `127.0.0.1:${9000 + OFF}`}`;
const authPost = async (path, body, bearer) => {
  const r = await fetch(`${AUTH}/${path}${path.includes('?') ? '&' : '?'}key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body),
  });
  return r.json();
};
/** Creates an email/password user in the Auth emulator and returns its uid. */
export const createAuthUser = async (email, password = 'pw-123456') => (await authPost('accounts:signUp', { email, password, returnSecureToken: true })).localId;
/** Creates an Auth emulator user with a fixed uid (admin call), e.g. an anonymous customer. */
export const createAuthUserWithUid = (uid) => authPost(`projects/${P}/accounts`, { localId: uid, email: `${uid}@test.io` }, 'owner');
/** Fresh ID token (carries the current custom claims) of an email/password user. */
export const signInPassword = async (email, password = 'pw-123456') => (await authPost('accounts:signInWithPassword', { email, password, returnSecureToken: true })).idToken;
/** Exchanges a custom token (kdsLogin / waiterLogin) for an ID token, like the client SDK does. */
export const signInCustom = async (customToken) => (await authPost('accounts:signInWithCustomToken', { token: customToken, returnSecureToken: true })).idToken;
/** Custom claims currently stored for a uid, read from the Auth emulator. */
export async function claimsOf(uid) {
  const j = await authPost(`projects/${P}/accounts:lookup`, { localId: [uid] }, 'owner');
  const raw = j.users?.[0]?.customAttributes;
  return raw ? JSON.parse(raw) : {};
}
/** validSince (epoch seconds, set by revokeRefreshTokens) of a uid, or undefined. */
export async function validSinceOf(uid) {
  const j = await authPost(`projects/${P}/accounts:lookup`, { localId: [uid] }, 'owner');
  return j.users?.[0]?.validSince;
}
/** Whether the Auth account is disabled. */
export async function disabledOf(uid) {
  const j = await authPost(`projects/${P}/accounts:lookup`, { localId: [uid] }, 'owner');
  return j.users?.[0]?.disabled === true;
}
/** Raw password sign-in result (idToken absent when refused). */
export const signInPasswordRaw = (email, password = 'pw-123456') => authPost('accounts:signInWithPassword', { email, password, returnSecureToken: true });
/** Overwrites the custom claims of a uid (admin, owner). */
export const setClaimsRaw = (uid, claims) => authPost(`projects/${P}/accounts:update`, { localId: uid, customAttributes: JSON.stringify(claims) }, 'owner');
export const jwtPayload = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
/** RTDB access with an ID token (rules enforced): 'owner' bypasses, null = unauthenticated. */
export async function rtdbAs(idToken, method, path, body) {
  const r = await fetch(`${DBH}/${path}.json?ns=${P}-default-rtdb${idToken && idToken !== 'owner' ? `&auth=${idToken}` : ''}`, {
    method,
    headers: idToken === 'owner' ? { Authorization: 'Bearer owner' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, body: r.ok ? await r.json() : null };
}
/** Prints a finding that is documented in the PR but not asserted (the behavior is not decided). */
export const note = (text) => console.log(`NOTE  ${text}`);

export async function waitFor(label, fn, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return;
    await sleep(500);
  }
  throw new Error(`timeout: ${label}`);
}

let failures = 0;
export function check(name, ok, extra = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
}
/** Runs [name, fn, expected] cases, prints a summary and sets the exit code. */
export async function report(cases) {
  for (const [name, fn, expected] of cases) {
    const got = await fn();
    check(name, got === expected, `(got ${got}, expected ${expected})`);
  }
  done();
}
export function done() {
  console.log(failures ? `\n${failures} failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
}
