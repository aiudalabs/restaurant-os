import * as admin from "firebase-admin";

/**
 * RTDB ticket an item shows as on its station's KDS (order_items/{stationId}/{orderId}_{itemId}).
 * Shared by onOrderCreated (orders that go to the kitchen right away) and
 * onOrderPaid (orders released once their payment is confirmed).
 *
 * sentToStationAt never changes after this: the KDS orders tickets FIFO by it
 * (updatedAt moves on every status tap). specialInstructions carries the
 * waiter's notes ("sin cebolla") to the kitchen.
 */
export function kdsTicket(
  orderId: string,
  tableNumber: string,
  item: { productName: string; quantity: number; specialInstructions?: string },
): Record<string, unknown> {
  return {
    status: "queued",
    updatedAt: admin.database.ServerValue.TIMESTAMP,
    sentToStationAt: admin.database.ServerValue.TIMESTAMP,
    tableNumber,
    productName: item.productName,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions ?? "",
    orderId,
  };
}

export const kdsTicketKey = (stationId: string, orderId: string, itemId: string) =>
  `order_items/${stationId}/${orderId}_${itemId}`;

/**
 * Mirrors every routed item of an order to its station's KDS. Items without a
 * stationId (counter mode) stay with the waiter. Idempotent: same keys, so a
 * retry after a failed mirror is safe. Returns the number of tickets written.
 */
export async function releaseToKds(
  db: FirebaseFirestore.Firestore,
  orderId: string,
  order: FirebaseFirestore.DocumentData,
): Promise<number> {
  const items = await db.collection("order_items").where("orderId", "==", orderId).get();
  const updates: Record<string, unknown> = {};
  for (const d of items.docs) {
    const item = d.data();
    if (!item.stationId) continue;
    updates[kdsTicketKey(item.stationId, orderId, d.id)] = kdsTicket(orderId, order.tableNumber ?? "", {
      productName: item.productName,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
    });
  }
  const n = Object.keys(updates).length;
  if (n > 0) await admin.database().ref().update(updates);
  return n;
}
