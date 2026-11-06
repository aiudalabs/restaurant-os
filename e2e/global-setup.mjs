// Prepara DEV para la batería, solo con REST y la cuenta admin de gcloud:
//   - admin y mesero temporales (Auth + users/{uid}, marcados e2eTemp)
//   - claims vía el trigger syncStaffClaims (se espera con sondeo, sin sleeps fijos)
//   - PIN del mesero y de la estación vía las callables setWaiterPin / setStationPin
//   - un descuento configurado si la organización no tiene ninguno activo
// Contraseñas y PINs se generan al azar, viven solo en process.env de esta
// corrida y nunca se imprimen ni se escriben a disco.
import { randomBytes, randomInt } from 'node:crypto';
import {
  authClaims, authCreateUser, callable, fsGet, fsPatchFields, fsQuery, fsSet, signInWithPassword,
} from './lib/gcp.mjs';
import { ORG, BRANCH, STATION, TAG, assertDevOnly } from './lib/env.mjs';
import { runCleanup } from './lib/cleanup.mjs';
import { newManifest, saveManifest } from './lib/manifest.mjs';

const secret = () => randomBytes(18).toString('base64url');
const pin = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

async function poll(what, fn, { timeoutMs = 90_000, everyMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Tiempo agotado esperando: ${what}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

async function createStaff(m, { uid, email, password, displayName, role }) {
  m.authUids.push(uid);
  m.userDocs.push(uid);
  saveManifest(m); // se anota ANTES de crear: si algo falla, la limpieza lo encuentra
  await authCreateUser({ uid, email, password, displayName });
  await fsSet(`users/${uid}`, {
    id: uid,
    orgId: ORG,
    branchIds: [BRANCH],
    email,
    displayName,
    role,
    isActive: true,
    createdAt: new Date(),
    e2eTemp: true,
    tag: TAG,
  });
  // syncStaffClaims reacciona a la escritura de users/{uid}; sin claims RTDB/Storage no funcionan.
  await poll(`claims de ${role}`, async () => (await authClaims(uid)).role === role);
}

async function provision() {
  const runId = randomBytes(3).toString('hex');
  const m = newManifest(runId);

  // Respaldo crudo de lo existente que la corrida va a pisar (ANTES de tocarlo).
  const pinDoc = await fsGet(`kds_pins/${STATION}`);
  m.kdsPin = { stationId: STATION, existed: !!pinDoc, fields: pinDoc?.fields ?? null };
  const org = await fsGet(`organizations/${ORG}`);
  if (!org) throw new Error(`No existe organizations/${ORG} en dev`);
  m.discounts = { touched: false, present: 'discounts' in org.fields, value: org.fields.discounts ?? null };
  saveManifest(m);

  // setStationPin reutiliza el operador de la estación; si no existiera crearía uno que no rastreamos.
  const operators = await fsQuery('users', [{ field: 'stationId', op: 'EQUAL', value: STATION }]);
  if (operators.length === 0) throw new Error(`La estación ${STATION} no tiene operador; el supuesto de la batería no se cumple.`);

  const adminPw = secret();
  const adminEmail = `e2e-admin-${runId}@e2e.restaurantos.local`;
  const adminUid = `e2e${runId}admin`;
  const waiterUid = `e2e${runId}waiter`;
  const waiterName = `E2E Mesero ${runId}`;
  const waiterPin = pin();
  const stationPin = pin();

  await createStaff(m, { uid: adminUid, email: adminEmail, password: adminPw, displayName: `E2E Admin ${runId}`, role: 'admin' });
  await createStaff(m, {
    uid: waiterUid,
    email: `e2e-waiter-${runId}@e2e.restaurantos.local`,
    password: secret(), // el mesero entra por PIN; la contraseña no se usa
    displayName: waiterName,
    role: 'waiter',
  });

  const { idToken } = await signInWithPassword(adminEmail, adminPw);
  m.staffPins.push(waiterUid);
  saveManifest(m);
  await callable('setWaiterPin', { userId: waiterUid, pin: waiterPin }, idToken);
  await callable('setStationPin', { stationId: STATION, pin: stationPin }, idToken);

  // Descuento: usa uno activo sin cédula si la org ya lo tiene; si no, crea el de la prueba.
  const existing = Array.isArray(org.data.discounts) ? org.data.discounts : [];
  let discount = existing.find((d) => d.active !== false && d.requiresId !== true && d.percent > 0 && d.percent <= 100);
  if (!discount) {
    discount = { id: `e2e-temp-${runId}`, name: `E2E Desc ${runId}`, percent: 10, active: true, requiresId: false };
    m.discounts.touched = true;
    saveManifest(m);
    await fsPatchFields(`organizations/${ORG}`, ['discounts'], {
      discounts: { arrayValue: { values: [...(org.fields.discounts?.arrayValue?.values ?? []), toDiscountValue(discount)] } },
    });
  }

  Object.assign(process.env, {
    E2E_RUN_ID: runId,
    E2E_ADMIN_EMAIL: adminEmail,
    E2E_ADMIN_PW: adminPw,
    E2E_WAITER_UID: waiterUid,
    E2E_WAITER_NAME: waiterName,
    E2E_WAITER_PIN: waiterPin,
    E2E_STATION_PIN: stationPin,
    E2E_DISCOUNT: JSON.stringify(discount),
  });
  console.log(`[e2e] corrida ${runId} lista (usuarios temporales, PINs y descuento configurados)`);
}

function toDiscountValue(d) {
  return {
    mapValue: {
      fields: {
        id: { stringValue: d.id },
        name: { stringValue: d.name },
        percent: { integerValue: String(d.percent) },
        active: { booleanValue: d.active },
        requiresId: { booleanValue: d.requiresId },
      },
    },
  };
}

export default async function globalSetup() {
  assertDevOnly();
  console.log('[e2e] limpiando restos de corridas anteriores…');
  await runCleanup({ log: () => undefined });
  try {
    await provision();
  } catch (e) {
    console.error(`[e2e] el setup falló (${e.message}); deshaciendo lo creado…`);
    await runCleanup();
    throw e;
  }
}
