// Clientes REST mínimos (sin dependencias) para preparar, leer y limpiar datos de
// DEV. Mismo patrón que tools/reset_user_password.py: token de gcloud + cabecera
// x-goog-user-project. Nada de esto imprime tokens, contraseñas ni PINs.
import { execFileSync } from 'node:child_process';
import { GCLOUD_ACCOUNT, PROJECT, URLS, assertDevOnly, webConfig } from './env.mjs';

let cached = null;
/** Token de acceso de gcloud para la cuenta admin (se renueva cada 20 min). */
export function token() {
  assertDevOnly();
  if (cached && Date.now() < cached.exp) return cached.value;
  const value = execFileSync('gcloud', ['auth', 'print-access-token', `--account=${GCLOUD_ACCOUNT}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (!value) throw new Error('gcloud no devolvió token. Ejecuta: gcloud auth login');
  cached = { value, exp: Date.now() + 20 * 60_000 };
  return value;
}

const adminHeaders = () => ({
  Authorization: `Bearer ${token()}`,
  'x-goog-user-project': PROJECT,
  'Content-Type': 'application/json',
});

/** fetch con error legible; el mensaje nunca incluye el cuerpo enviado. */
async function call(method, url, { headers, body, okStatuses = [] } = {}) {
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok && !okStatuses.includes(res.status)) {
    const msg = json?.error?.message ?? json?.error ?? text.slice(0, 200);
    const where = url.replace(/\?.*$/, '').replace(URLS.firestore, 'fs:').replace(URLS.identity, 'itk:');
    throw new Error(`${method} ${where} -> ${res.status} ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return { status: res.status, json };
}

// ─── Firestore ─────────────────────────────────────────────────────────────

export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v) } };
}
export const toFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));

export function fromValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields ?? {});
  return v;
}
export const fromFields = (fields) => Object.fromEntries(Object.entries(fields ?? {}).map(([k, v]) => [k, fromValue(v)]));

const docUrl = (path) => `${URLS.firestore}/${path}`;

/** Documento como `{ id, data, fields }` (fields = JSON crudo de la API) o null si no existe. */
export async function fsGet(path) {
  const { status, json } = await call('GET', docUrl(path), { headers: adminHeaders(), okStatuses: [404] });
  if (status === 404) return null;
  return { id: json.name.split('/').pop(), data: fromFields(json.fields), fields: json.fields ?? {} };
}

/** Crea o reemplaza el documento completo. */
export async function fsSet(path, data) {
  await call('PATCH', docUrl(path), { headers: adminHeaders(), body: { fields: toFields(data) } });
}

/** Reemplaza el documento con campos crudos (restauración exacta de un respaldo). */
export async function fsSetRaw(path, fields) {
  await call('PATCH', docUrl(path), { headers: adminHeaders(), body: { fields } });
}

/** Actualiza solo los campos de primer nivel de `mask`; los que no vienen en `fields` se borran. */
export async function fsPatchFields(path, mask, fields) {
  const q = mask.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
  await call('PATCH', `${docUrl(path)}?${q}`, { headers: adminHeaders(), body: { fields } });
}

export async function fsDelete(path) {
  await call('DELETE', docUrl(path), { headers: adminHeaders(), okStatuses: [404] });
}

/** Consulta de colección; `filters`: [{ field, op, value }]. Devuelve [{ id, data }]. */
export async function fsQuery(collection, filters, { limit = 500 } = {}) {
  const fieldFilters = filters.map((f) => ({
    fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: toValue(f.value) },
  }));
  const where = fieldFilters.length === 1 ? fieldFilters[0] : { compositeFilter: { op: 'AND', filters: fieldFilters } };
  const { json } = await call('POST', `${URLS.firestore}:runQuery`, {
    headers: adminHeaders(),
    body: { structuredQuery: { from: [{ collectionId: collection }], where, limit } },
  });
  return (json ?? [])
    .filter((r) => r.document)
    .map((r) => ({ id: r.document.name.split('/').pop(), data: fromFields(r.document.fields) }));
}

/** Pedidos de la batería: customerName con prefijo `prefix` (rango de un solo campo). */
export async function findOrdersByPrefix(prefix) {
  return fsQuery('orders', [
    { field: 'customerName', op: 'GREATER_THAN_OR_EQUAL', value: prefix },
    { field: 'customerName', op: 'LESS_THAN', value: `${prefix}￿` },
  ]);
}

/**
 * Escritura con un ID token de usuario final (las reglas SÍ se aplican).
 * `writes`: [{ path, data, serverTimestamps: ['createdAt', …] }]; solo creaciones.
 */
export async function fsCommitAsUser(idToken, writes) {
  const body = {
    writes: writes.map((w) => ({
      update: { name: `projects/${PROJECT}/databases/(default)/documents/${w.path}`, fields: toFields(w.data) },
      currentDocument: { exists: false },
      updateTransforms: (w.serverTimestamps ?? []).map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
    })),
  };
  await call('POST', `${URLS.firestore}:commit`, {
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body,
  });
}

// ─── Realtime Database ─────────────────────────────────────────────────────

export async function rtdbGet(path) {
  const { json } = await call('GET', `${URLS.rtdb}/${path}.json`, { headers: { Authorization: `Bearer ${token()}` } });
  return json;
}
export async function rtdbDelete(path) {
  await call('DELETE', `${URLS.rtdb}/${path}.json`, { headers: { Authorization: `Bearer ${token()}` } });
}

// ─── Identity Toolkit ──────────────────────────────────────────────────────

/** Crea un usuario de Auth (endpoint de administración). Devuelve su uid. */
export async function authCreateUser({ uid, email, password, displayName }) {
  const { json } = await call('POST', `${URLS.identity}/accounts`, {
    headers: adminHeaders(),
    body: { localId: uid, email, password, displayName, emailVerified: true },
  });
  return json.localId;
}
export async function authDeleteUser(uid) {
  await call('POST', `${URLS.identity}/accounts:delete`, { headers: adminHeaders(), body: { localId: uid }, okStatuses: [400] });
}
export async function authLookup(uid) {
  const { json } = await call('POST', `${URLS.identity}/accounts:lookup`, { headers: adminHeaders(), body: { localId: [uid] } });
  return json?.users?.[0] ?? null;
}
/** Claims actuales del usuario (customAttributes ya parseado). */
export async function authClaims(uid) {
  const u = await authLookup(uid);
  return u?.customAttributes ? JSON.parse(u.customAttributes) : {};
}

const publicHeaders = { 'Content-Type': 'application/json', Referer: 'https://restaurant-os-dev-49096.web.app/' };
const publicUrl = (op) => `https://identitytoolkit.googleapis.com/v1/accounts:${op}?key=${webConfig().apiKey}`;

export async function signInWithPassword(email, password) {
  const { json } = await call('POST', publicUrl('signInWithPassword'), {
    headers: publicHeaders,
    body: { email, password, returnSecureToken: true },
  });
  return { idToken: json.idToken, uid: json.localId };
}
export async function signInAnonymously() {
  const { json } = await call('POST', publicUrl('signUp'), { headers: publicHeaders, body: { returnSecureToken: true } });
  return { idToken: json.idToken, uid: json.localId };
}

// ─── Cloud Functions callables ─────────────────────────────────────────────

/** Llama a una callable (v1) con el ID token del usuario; devuelve `result`. */
export async function callable(name, data, idToken) {
  const { json } = await call('POST', `${URLS.functions}/${name}`, {
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: { data },
  });
  return json?.result;
}

// ─── Storage ───────────────────────────────────────────────────────────────

export async function storageDelete(objectPath) {
  const url = `https://storage.googleapis.com/storage/v1/b/${webConfig().bucket}/o/${encodeURIComponent(objectPath)}`;
  await call('DELETE', url, { headers: adminHeaders(), okStatuses: [404] });
}
