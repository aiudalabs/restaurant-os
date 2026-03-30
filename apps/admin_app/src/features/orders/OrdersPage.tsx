import { useState, useMemo } from 'react';
import { Search, X, Eye, CheckCircle, Truck, XCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useAllOrders, useOrderItems, useUpdateOrderStatus } from '@/hooks/use-orders';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparacion',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  closed: 'Cerrado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_preparation: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-500',
};

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'in_preparation',
  'ready',
  'delivered',
  'cancelled',
  'closed',
];

// ─── Order Detail Dialog ───

interface OrderDetailDialogProps {
  order: Order;
  items: OrderItem[];
  itemsLoading: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updating: boolean;
}

function OrderDetailDialog({ order, items, itemsLoading, onClose, onUpdateStatus, updating }: OrderDetailDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Pedido - Mesa {order.tableNumber}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Estado</span>
              <p>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_COLORS[order.status],
                  )}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Fecha</span>
              <p className="font-medium text-gray-900">
                {order.createdAt?.toDate().toLocaleString('es-PA') ?? '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Subtotal</span>
              <p className="font-medium text-gray-900">${order.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">Impuesto ({(order.taxPercent * 100).toFixed(0)}%)</span>
              <p className="font-medium text-gray-900">${order.taxAmount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">Propina</span>
              <p className="font-medium text-gray-900">${order.tipAmount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total</span>
              <p className="text-lg font-bold text-orange-700">${order.total.toFixed(2)}</p>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              <strong>Notas:</strong> {order.notes}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Items del pedido</h3>
            {itemsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400">No se encontraron items.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.quantity}x {item.productName}
                      </p>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {item.modifiers.map((m) => m.value).join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs text-yellow-600 italic">
                          {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-1">Pago</h3>
            <div className="text-sm text-gray-600">
              <p>Metodo: {order.payment.method ?? 'No definido'}</p>
              <p>Estado: {order.payment.status ?? 'Pendiente'}</p>
              {order.payment.confirmationNumber && (
                <p>Confirmacion: {order.payment.confirmationNumber}</p>
              )}
            </div>
          </div>

          {/* Status action buttons */}
          <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {order.status === 'pending' && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updating}
                onClick={() => onUpdateStatus(order.id, 'confirmed')}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Confirmar
              </Button>
            )}
            {order.status === 'ready' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={updating}
                onClick={() => onUpdateStatus(order.id, 'delivered')}
              >
                <Truck className="mr-1.5 h-4 w-4" />
                Marcar entregado
              </Button>
            )}
            {order.status === 'delivered' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={updating}
                onClick={() => onUpdateStatus(order.id, 'closed')}
              >
                <Lock className="mr-1.5 h-4 w-4" />
                Cerrar
              </Button>
            )}
            {!['cancelled', 'closed'].includes(order.status) && (
              <Button
                size="sm"
                variant="secondary"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={updating}
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Page ───

export default function OrdersPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();

  const { orders, loading } = useAllOrders(orgId, branchId);
  const { items, loading: itemsLoading, fetchItems } = useOrderItems();
  const { updateStatus, updating } = useUpdateOrderStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          order.tableNumber.toLowerCase().includes(q) ||
          order.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    fetchItems(order.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por mesa o ID..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">Todos los estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">No se encontraron pedidos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mesa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    #{order.tableNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_COLORS[order.status],
                      )}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{order.itemCount}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {order.createdAt?.toDate().toLocaleString('es-PA') ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          items={items}
          itemsLoading={itemsLoading}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (orderId, status) => {
            await updateStatus(orderId, status);
            setSelectedOrder((prev) => prev ? { ...prev, status } : null);
          }}
          updating={updating}
        />
      )}
    </div>
  );
}
