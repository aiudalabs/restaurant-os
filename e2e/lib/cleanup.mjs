// Limpieza de DEV: borra todo lo que la batería creó y restaura lo que tocó.
// Corre desde global-teardown, desde un setup fallido y a mano (`npm run cleanup`).
// Es idempotente y se guía por el manifest + un barrido por marcas (pedidos con
// customerName "E2E-…", usuarios con e2eTemp), así que sirve tras un crash.
import {
  authDeleteUser, authLookup, fsDelete, fsGet, fsPatchFields, fsQuery, fsSetRaw, findOrdersByPrefix,
  rtdbDelete, rtdbGet, storageDelete,
} from './gcp.mjs';
import { ORDER_PREFIX, ORG, STATION, assertDevOnly } from './env.mjs';
import { loadManifest, saveManifest } from './manifest.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FISCAL_BUSY = ['pending', 'issuing'];

async function waitFiscalSettled(order, log) {
  // Una factura en curso reescribe el pedido: borrarlo antes la resucitaría.
  const deadline = Date.now() + 150_000;
  let current = order;
  while (current.data.payment?.status === 'paid' && FISCAL_BUSY.includes(current.data.fiscal?.status) && Date.now() < deadline) {
    log(`  esperando factura de ${current.id} (${current.data.fiscal.status})…`);
    await sleep(4000);
    const fresh = await fsGet(`orders/${order.id}`);
    if (!fresh) return;
    current = { id: order.id, data: fresh.data };
  }
}

async function deleteWhere(collection, field, value) {
  const rows = await fsQuery(collection, [{ field, op: 'EQUAL', value }]);
  for (const r of rows) await fsDelete(`${collection}/${r.id}`);
  return rows.length;
}

async function deleteOrder(order, log) {
  const { id, data } = order;
  const items = await fsQuery('order_items', [{ field: 'orderId', op: 'EQUAL', value: id }]);
  for (const it of items) {
    if (it.data.stationId) await rtdbDelete(`order_items/${it.data.stationId}/${id}_${it.id}`);
    await fsDelete(`order_items/${it.id}`);
  }
  for (const p of [data.fiscal?.pdfPath, data.fiscal?.xmlPath]) if (typeof p === 'string' && p) await storageDelete(p);
  await deleteWhere('audit_log', 'orderId', id);
  await deleteWhere('loyalty_events', 'orderId', id);

  // Pedidos del cliente (QR): su sesión anónima y su ficha del Club nacieron con la corrida.
  const uid = data.createdByUid;
  if (data.source === 'qr' && typeof uid === 'string' && uid) {
    await fsDelete(`loyalty_members/${ORG}_${uid}`);
    await deleteWhere('loyalty_vouchers', 'uid', uid);
    await deleteWhere('loyalty_events', 'uid', uid);
    await authDeleteUser(uid);
  }
  await fsDelete(`orders/${id}`);
  log(`  pedido ${id} (${data.customerName}) borrado con ${items.length} ítems`);
  return id;
}

async function sweepOrders(log, deleted) {
  for (let pass = 1; pass <= 4; pass++) {
    const orders = (await findOrdersByPrefix(ORDER_PREFIX)).filter((o) => o.data.orgId === ORG);
    if (orders.length === 0 && (pass > 1 || deleted.length === 0)) return;
    for (const o of orders) await waitFiscalSettled(o, log);
    for (const o of orders) {
      const fresh = await fsGet(`orders/${o.id}`);
      if (fresh) deleted.push(await deleteOrder({ id: o.id, data: fresh.data }, log));
    }
    await sleep(6000); // por si un trigger tardío reescribe un pedido ya borrado
  }
}

async function sweepRtdb(log, orderIds) {
  const node = await rtdbGet(`order_items/${STATION}`);
  for (const [key, v] of Object.entries(node ?? {})) {
    const mine = orderIds.includes(key.split('_')[0]) || String(v?.tableNumber ?? '').startsWith(ORDER_PREFIX);
    if (!mine) continue;
    await rtdbDelete(`order_items/${STATION}/${key}`);
    log(`  ticket KDS ${key} borrado`);
  }
}

async function removeUser(uid, log) {
  await fsDelete(`staff_pins/${uid}`);
  await fsDelete(`users/${uid}`);
  await authDeleteUser(uid);
  log(`  usuario temporal ${uid} borrado`);
}

async function sweepUsers(m, log) {
  const tagged = await fsQuery('users', [{ field: 'e2eTemp', op: 'EQUAL', value: true }]);
  const uids = new Set([...tagged.map((u) => u.id), ...(m?.userDocs ?? []), ...(m?.authUids ?? [])]);
  for (const uid of uids) await removeUser(uid, log);
  for (const uid of m?.anonUids ?? []) await authDeleteUser(uid); // sesiones anónimas sembradas
}

async function restoreKdsPin(m, log) {
  if (!m?.kdsPin) return;
  const path = `kds_pins/${m.kdsPin.stationId}`;
  if (m.kdsPin.existed) await fsSetRaw(path, m.kdsPin.fields);
  else await fsDelete(path);
  log(`  ${path} ${m.kdsPin.existed ? 'restaurado desde el respaldo' : 'borrado (no existía)'}`);
  m.kdsPin = null;
  saveManifest(m);
}

async function restoreDiscounts(m, log) {
  if (!m?.discounts?.touched) return;
  const fields = m.discounts.present ? { discounts: m.discounts.value } : {};
  await fsPatchFields(`organizations/${ORG}`, ['discounts'], fields);
  log(`  organizations/${ORG}.discounts ${m.discounts.present ? 'restaurado' : 'quitado (no existía)'}`);
  m.discounts = null;
  saveManifest(m);
}

/** Cuenta lo que sigue vivo de la batería; 0 = DEV limpio. */
async function countLeftovers(m, deletedOrderIds) {
  const left = {};
  left.orders = (await findOrdersByPrefix(ORDER_PREFIX)).filter((o) => o.data.orgId === ORG).length;
  left.users = (await fsQuery('users', [{ field: 'e2eTemp', op: 'EQUAL', value: true }])).length;
  left.staffPins = 0;
  for (const uid of m?.userDocs ?? []) if (await fsGet(`staff_pins/${uid}`)) left.staffPins++;
  left.authUsers = 0;
  for (const uid of [...(m?.authUids ?? []), ...(m?.anonUids ?? [])]) if (await authLookup(uid)) left.authUsers++;
  left.orderItems = 0;
  left.auditLog = 0;
  left.loyaltyEvents = 0;
  for (const id of deletedOrderIds) {
    left.orderItems += (await fsQuery('order_items', [{ field: 'orderId', op: 'EQUAL', value: id }])).length;
    left.auditLog += (await fsQuery('audit_log', [{ field: 'orderId', op: 'EQUAL', value: id }])).length;
    left.loyaltyEvents += (await fsQuery('loyalty_events', [{ field: 'orderId', op: 'EQUAL', value: id }])).length;
  }
  const node = await rtdbGet(`order_items/${STATION}`);
  left.kdsTickets = Object.entries(node ?? {}).filter(
    ([k, v]) => deletedOrderIds.includes(k.split('_')[0]) || String(v?.tableNumber ?? '').startsWith(ORDER_PREFIX),
  ).length;
  return left;
}

/** Limpia todo y devuelve `{ leftovers, total }`. No lanza por restos: los reporta. */
export async function runCleanup({ log = console.log } = {}) {
  assertDevOnly();
  const m = loadManifest();
  log(`Limpieza de DEV${m ? ` (corrida ${m.runId})` : ' (sin manifest: solo barrido por marcas)'}`);
  const deletedOrderIds = [];
  await sweepOrders(log, deletedOrderIds);
  await sweepRtdb(log, deletedOrderIds);
  await sweepUsers(m, log);
  await restoreKdsPin(m, log);
  await restoreDiscounts(m, log);
  const leftovers = await countLeftovers(m, deletedOrderIds);
  const total = Object.values(leftovers).reduce((a, b) => a + b, 0);
  log(`Restos de la batería en DEV: ${total} ${JSON.stringify(leftovers)}`);
  if (m && total === 0) {
    m.cleanedAt = new Date().toISOString();
    saveManifest(m);
  }
  return { leftovers, total };
}
