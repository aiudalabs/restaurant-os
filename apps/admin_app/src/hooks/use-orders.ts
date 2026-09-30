import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import {
  watchActiveOrders,
  watchOrders,
  fetchOrderItems as fetchOrderItemsService,
  fetchItemsForOrders,
  fetchProductImages,
  confirmManualPayment as confirmManualPaymentService,
  fetchTodayOrders as fetchTodayOrdersService,
  updateOrderStatus as updateOrderStatusService,
} from '@/services/order.service';

export function useActiveOrders(orgId: string, branchId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !branchId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchActiveOrders(orgId, branchId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [orgId, branchId]);

  return { orders, loading };
}

export function useAllOrders(orgId: string, branchId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !branchId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchOrders(orgId, branchId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [orgId, branchId]);

  return { orders, loading };
}

export function useTodayOrders(orgId: string, branchId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !branchId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchTodayOrdersService(orgId, branchId)
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [orgId, branchId]);

  return { orders, loading };
}

export function useOrderItems() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (orderId: string, orgId: string) => {
    setLoading(true);
    try {
      const data = await fetchOrderItemsService(orderId, orgId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, fetchItems };
}

export function useUpdateOrderStatus() {
  const [updating, setUpdating] = useState(false);

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatusService(orderId, status);
    } finally {
      setUpdating(false);
    }
  }, []);

  return { updateStatus, updating };
}

/**
 * Items of the given orders, refetched when the set of orders changes (e.g. a
 * new order lands on the pass). Keyed by the sorted ids so re-renders don't refetch.
 */
export function useItemsForOrders(orgId: string, orderIds: string[]) {
  const key = useMemo(() => [...orderIds].sort().join(','), [orderIds]);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    let alive = true;
    const ids = key ? key.split(',') : [];
    fetchItemsForOrders(orgId, ids)
      .then((data) => alive && setItems(data))
      .catch((e) => console.error('[admin] order items load failed', e));
    return () => {
      alive = false;
    };
  }, [orgId, key]);

  return items;
}

/** productId → imageUrl for the given products. */
export function useProductImages(productIds: string[]) {
  const key = useMemo(() => [...new Set(productIds)].sort().join(','), [productIds]);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    fetchProductImages(key ? key.split(',') : [])
      .then((data) => alive && setImages(data))
      .catch((e) => console.error('[admin] product images load failed', e));
    return () => {
      alive = false;
    };
  }, [key]);

  return images;
}

export function useConfirmManualPayment() {
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirm = useCallback(async (orderId: string, received: boolean) => {
    setBusyId(orderId);
    try {
      await confirmManualPaymentService(orderId, received);
    } finally {
      setBusyId(null);
    }
  }, []);

  return { confirm, busyId };
}
