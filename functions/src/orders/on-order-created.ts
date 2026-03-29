import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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
 * 1. Confirm the order (status → "confirmed")
 * 2. Route each order_item to the correct station based on categoryId
 * 3. Mirror item status to Realtime Database for KDS live updates
 * 4. Send FCM push notifications to station tablets
 */
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

    // 3. Route items to stations and build batch updates
    const batch = firestore.batch();
    const rtdbUpdates: Record<string, unknown> = {};
    const stationFcmTokens = new Map<string, Set<string>>();
    const stationItemCounts = new Map<string, number>();

    for (const itemDoc of itemsSnap.docs) {
      const item = { id: itemDoc.id, ...itemDoc.data() } as OrderItemData;
      const station = categoryToStation.get(item.categoryId);

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

      // Mirror to RTDB: /order_items/{stationId}/{orderId}_{itemId}
      const rtdbKey = `order_items/${station.id}/${orderId}_${item.id}`;
      rtdbUpdates[rtdbKey] = {
        status: "queued",
        updatedAt: admin.database.ServerValue.TIMESTAMP,
        tableNumber: order.tableNumber,
        productName: item.productName,
        quantity: item.quantity,
        orderId: orderId,
      };

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

    // 4. Update order status to "confirmed"
    batch.update(snap.ref, {
      status: "confirmed",
      updatedAt: now,
    });

    // 5. Commit Firestore batch + RTDB multi-path update
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

    // 6. Send FCM notifications to station tablets
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
