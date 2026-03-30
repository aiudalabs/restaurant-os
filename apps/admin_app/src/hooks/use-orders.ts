import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import {
  watchActiveOrders,
  watchOrders,
  fetchOrderItems as fetchOrderItemsService,
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

  const fetchItems = useCallback(async (orderId: string) => {
    setLoading(true);
    try {
      const data = await fetchOrderItemsService(orderId);
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
