// Shared helpers for the emulator suites (REST, no dependencies). Project: demo-ros-test.
export const P = 'demo-ros-test';
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}/v1/projects/${P}/databases/(default)/documents`;
const FN = `http://127.0.0.1:5001/${P}/us-central1`;
const DB = `http://127.0.0.1:9000`;
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
