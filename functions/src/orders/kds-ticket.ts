import * as admin from "firebase-admin";

/**
 * RTDB ticket an item shows as on its station's KDS (order_items/{stationId}/{orderId}_{itemId}).
 * Shared by onOrderCreated (orders that go to the kitchen right away) and
 * confirmManualPayment (orders released once their payment is confirmed).
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
