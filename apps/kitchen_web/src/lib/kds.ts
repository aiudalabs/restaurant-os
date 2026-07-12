import { onValue, ref, update, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from './firebase';
import type { ItemStatus, KdsTicket } from '../types';

interface RawItem {
  status?: string;
  productName?: string;
  quantity?: number;
  tableNumber?: string;
  orderId?: string;
  updatedAt?: number;
  sentToStationAt?: number;
  specialInstructions?: string;
}

/**
 * Live tickets for a station, read from the RTDB mirror `order_items/{stationId}`.
 * Entries are keyed `{orderId}_{firestoreItemId}`. Active board shows queued +
 * in_progress; done/cancelled items drop off (a fully-done ticket disappears).
 */
export function watchTickets(stationId: string, cb: (tickets: KdsTicket[]) => void): () => void {
  const node = ref(rtdb, `order_items/${stationId}`);
  return onValue(
    node,
    (snap) => {
      const val = (snap.val() ?? {}) as Record<string, RawItem>;
      const byOrder = new Map<string, { orderId: string; items: RawItem[]; keys: string[] }>();

      for (const [key, data] of Object.entries(val)) {
        if (data.status === 'done' || data.status === 'cancelled') continue;
        const orderId = key.split('_')[0];
        const group = byOrder.get(orderId) ?? { orderId, items: [], keys: [] };
        group.items.push(data);
        group.keys.push(key);
        byOrder.set(orderId, group);
      }

      const tickets: KdsTicket[] = [...byOrder.values()].map((g) => {
        const first = g.items[0];
        const receivedAt = first.sentToStationAt ?? first.updatedAt ?? Date.now();
        return {
          orderId: g.orderId,
          tableNumber: first.tableNumber ?? '?',
          displayNumber: `#${g.orderId.slice(0, 4).toUpperCase()}`,
          receivedAt,
          items: g.keys.map((key, i) => ({
            rtdbKey: key,
            productName: g.items[i].productName ?? '',
            quantity: g.items[i].quantity ?? 1,
            status: (g.items[i].status as ItemStatus) ?? 'queued',
            specialInstructions: g.items[i].specialInstructions,
          })),
        };
      });

      tickets.sort((a, b) => a.receivedAt - b.receivedAt);
      cb(tickets);
    },
    () => cb([]),
  );
}

/**
 * Advances an item's status. Writes RTDB first (KDS speed) then Firestore
 * (source of truth; the on-order-item-updated function rolls up the order).
 */
export async function updateItemStatus(
  stationId: string,
  rtdbKey: string,
  newStatus: ItemStatus,
): Promise<void> {
  await update(ref(rtdb, `order_items/${stationId}/${rtdbKey}`), {
    status: newStatus,
    updatedAt: rtdbServerTimestamp(),
  });

  const firestoreItemId = rtdbKey.slice(rtdbKey.indexOf('_') + 1);
  await updateDoc(doc(db, 'order_items', firestoreItemId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
    ...(newStatus === 'in_progress' ? { startedAt: serverTimestamp() } : {}),
    ...(newStatus === 'done' ? { completedAt: serverTimestamp() } : {}),
  });
}

/** queued → in_progress → done (tap to advance). */
export function nextStatus(s: ItemStatus): ItemStatus {
  if (s === 'queued') return 'in_progress';
  if (s === 'in_progress') return 'done';
  return 'done';
}
