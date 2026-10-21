import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { kdsTicket, kdsTicketKey } from "./kds-ticket";
import { computeTotals, UnknownProduct, type ProductPrice, type Totals } from "./totals";

const db = admin.firestore;
const rtdb = admin.database;

interface OrderData {
  orgId: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  tipAmount: number;
  total: number;
  notes?: string;
  itemCount: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  source?: string;
}

interface OrderItemData {
  id: string;
  orgId: string;
  branchId: string;
  orderId: string;
  stationId: string;
  tableNumber: string;
  productId: string;
  productName: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: { name: string; value: string; extraPrice: number }[];
  specialInstructions?: string;
  status: string;
  sentToStationAt: admin.firestore.Timestamp;
}

interface StationData {
  id: string;
  orgId: string;
  branchId: string;
  name: string;
  categoryIds: string[];
  fcmTokens: string[];
  isActive: boolean;
}

/**
 * onOrderCreated — Triggered when a new order document is created.
 *
 * Responsibilities:
 * 1. Recompute the totals from the products collection (clients are not trusted)
 * 2. Confirm the order (status → "confirmed")
 * 3. Route each order_item to the correct station based on categoryId
 * 4. Mirror item status to Realtime Database for KDS live updates
 * 5. Send FCM push notifications to station tablets
 */

/** products/{id}.price for the given ids (chunked `in` queries). */
async function loadPrices(firestore: FirebaseFirestore.Firestore, ids: string[]): Promise<Map<string, ProductPrice>> {
  const out = new Map<string, ProductPrice>();
  const unique = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snap = await firestore
      .collection("products")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();
    for (const d of snap.docs) {
      const price = d.data().price;
      if (typeof price === "number") out.set(d.id, { price });
    }
  }
  return out;
}

/** Tax rate of the branch (fraction), falling back to the org default, then 0. */
async function loadTaxPercent(firestore: FirebaseFirestore.Firestore, order: OrderData): Promise<number> {
  const branch = (await firestore.collection("branches").doc(order.branchId).get()).data();
  if (typeof branch?.taxPercent === "number") return branch.taxPercent;
  const org = (await firestore.collection("organizations").doc(order.orgId).get()).data();
  if (typeof org?.defaultTaxPercent === "number") return org.defaultTaxPercent;
  functions.logger.warn(`No tax rate for branch ${order.branchId} / org ${order.orgId}; using 0`);
  return 0;
}
export const onOrderCreated = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const orderId = context.params.orderId;
    const order = snap.data() as OrderData;
    const firestore = db();
    const now = admin.firestore.Timestamp.now();

    functions.logger.info(`Order created: ${orderId}`, {
      orgId: order.orgId,
      branchId: order.branchId,
      tableNumber: order.tableNumber,
    });

    // 1. Load stations for this branch
    const stationsSnap = await firestore
      .collection("stations")
      .where("branchId", "==", order.branchId)
      .where("isActive", "==", true)
      .get();

    const stations = stationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StationData[];

    // Build categoryId → station lookup
    const categoryToStation = new Map<string, StationData>();
    for (const station of stations) {
      for (const catId of station.categoryIds) {
        categoryToStation.set(catId, station);
      }
    }

    // 2. Load order_items for this order
    const itemsSnap = await firestore
      .collection("order_items")
      .where("orderId", "==", orderId)
      .get();

    if (itemsSnap.empty) {
      functions.logger.warn(`Order ${orderId} has no items, skipping routing`);
      return;
    }

    // Which orders go to the KDS immediately (mirror to RTDB now) vs. wait for
    // payment confirmation: an order in 'pending_payment' (prepaid link order:
    // manual Yappy or online card) is pre-routed here and mirrored to RTDB by
    // onOrderPaid once the payment is confirmed. Everything else (waiter, link
    // orders paid at pickup, Zaveli, …) goes straight to the kitchen.
    const awaitingPayment = order.status === "pending_payment";
    const goesToKdsNow = !awaitingPayment;

    // 3. Totals from the products collection — never from the client.
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrderItemData);
    const batch = firestore.batch();
    let totals: Totals;
    try {
      const prices = await loadPrices(firestore, items.map((it) => it.productId));
      const taxPercent = await loadTaxPercent(firestore, order);
      totals = computeTotals(items, prices, taxPercent);
      batch.update(snap.ref, {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        taxPercent,
        total: totals.total,
        itemCount: totals.itemCount,
      });
      items.forEach((it, i) => {
        batch.update(itemsSnap.docs[i].ref, { unitPrice: totals.lines[i].unitPrice, totalPrice: totals.lines[i].totalPrice });
      });
      if (Math.abs(totals.total - Number(order.total ?? 0)) >= 0.01) {
        functions.logger.warn(`Order ${orderId}: client total ${order.total} replaced by ${totals.total}`);
      }
    } catch (e) {
      if (e instanceof UnknownProduct) {
        functions.logger.error(`Order ${orderId} cancelled: unknown product ${e.productId}`);
        await snap.ref.update({
          status: "cancelled",
          notes: `[producto desconocido ${e.productId}] ${order.notes ?? ""}`.trim(),
          updatedAt: now,
        });
        return;
      }
      throw e;
    }

    // 4. Route items to stations and build batch updates
    const rtdbUpdates: Record<string, unknown> = {};
    const stationFcmTokens = new Map<string, Set<string>>();
    const stationItemCounts = new Map<string, number>();

    for (const itemDoc of itemsSnap.docs) {
      const item = { id: itemDoc.id, ...itemDoc.data() } as OrderItemData;
      const station = categoryToStation.get(item.categoryId);
      // Totals are written above; here only routing fields.

      if (!station) {
        functions.logger.error(
          `No station found for categoryId ${item.categoryId} ` +
          `in branch ${order.branchId}. Item ${item.id} unrouted.`
        );
        continue;
      }

      // Update order_item with stationId and timestamp
      batch.update(itemDoc.ref, {
        stationId: station.id,
        status: "queued",
        sentToStationAt: now,
      });

      // Only mirror to RTDB immediately for orders that go to the KDS now.
      // Deferred (card-paid) orders are pushed to RTDB by the BFF after payment.
      if (!goesToKdsNow) continue;

      rtdbUpdates[kdsTicketKey(station.id, orderId, item.id)] = kdsTicket(orderId, order.tableNumber, item);

      // Collect FCM tokens per station
      if (station.fcmTokens.length > 0) {
        if (!stationFcmTokens.has(station.id)) {
          stationFcmTokens.set(station.id, new Set());
        }
        const tokenSet = stationFcmTokens.get(station.id)!;
        for (const token of station.fcmTokens) {
          tokenSet.add(token);
        }
      }

      // Count items per station for notification body
      stationItemCounts.set(
        station.id,
        (stationItemCounts.get(station.id) ?? 0) + item.quantity
      );
    }

    // 5. Update order status to "confirmed" — but NOT for prepaid orders still
    // awaiting payment: those stay 'pending_payment' until the payment is
    // confirmed (onOrderPaid then mirrors the pre-routed items to the KDS).
    batch.update(
      snap.ref,
      awaitingPayment
        ? { updatedAt: now }
        : { status: "confirmed", updatedAt: now },
    );

    // 6. Update table status (set currentOrderId so table shows "Ocupada")
    if (order.tableId) {
      const tableRef = firestore.collection("tables").doc(order.tableId);
      batch.update(tableRef, {
        currentOrderId: orderId,
      });
      functions.logger.info(
        `Table ${order.tableId} marked occupied with order ${orderId}`
      );
    }

    // 7. Commit Firestore batch + RTDB multi-path update
    await Promise.all([
      batch.commit(),
      Object.keys(rtdbUpdates).length > 0
        ? rtdb().ref().update(rtdbUpdates)
        : Promise.resolve(),
    ]);

    functions.logger.info(
      `Order ${orderId} confirmed. ` +
      `${itemsSnap.size} items routed to ${stationFcmTokens.size} stations.`
    );

    // 8. Send FCM notifications to station tablets
    const fcmPromises: Promise<unknown>[] = [];

    for (const [stationId, tokens] of stationFcmTokens.entries()) {
      const station = stations.find((s) => s.id === stationId);
      const itemCount = stationItemCounts.get(stationId) ?? 0;

      const message: admin.messaging.MulticastMessage = {
        tokens: Array.from(tokens),
        notification: {
          title: `Mesa ${order.tableNumber} - Nuevo pedido`,
          body: `${itemCount} item${itemCount > 1 ? "s" : ""} para ${station?.name ?? "estacion"}`,
        },
        data: {
          orderId: orderId,
          stationId: stationId,
          tableNumber: order.tableNumber,
          type: "new_order",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "orders",
          },
        },
      };

      fcmPromises.push(
        admin.messaging().sendEachForMulticast(message).then((response) => {
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                functions.logger.warn(
                  `FCM failed for token ${Array.from(tokens)[idx]}: ` +
                  `${resp.error?.message}`
                );
              }
            });
          }
        })
      );
    }

    if (fcmPromises.length > 0) {
      await Promise.all(fcmPromises);
      functions.logger.info(
        `FCM notifications sent for order ${orderId}`
      );
    }
  });
