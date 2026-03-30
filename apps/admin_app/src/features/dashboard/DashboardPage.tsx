import { useMemo } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Activity,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useActiveOrders, useTodayOrders } from '@/hooks/use-orders';
import type { Order, OrderStatus } from '@/types/order';

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

// ─── Stats Cards ───

interface StatsCardProps {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
}

function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Active Orders List ───

interface ActiveOrdersListProps {
  orders: Order[];
  loading: boolean;
}

function ActiveOrdersList({ orders, loading }: ActiveOrdersListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No hay pedidos activos en este momento.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">
              Mesa {order.tableNumber}
            </span>
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                STATUS_COLORS[order.status],
              )}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{order.itemCount} items</span>
            <span className="font-semibold text-gray-900">${order.total.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sales Chart ───

interface SalesChartProps {
  orders: Order[];
}

function SalesChart({ orders }: SalesChartProps) {
  const chartData = useMemo(() => {
    const hourly: Record<number, { hour: string; revenue: number; count: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourly[h] = { hour: `${h.toString().padStart(2, '0')}:00`, revenue: 0, count: 0 };
    }
    orders.forEach((order) => {
      if (order.createdAt && order.status !== 'cancelled') {
        const date = order.createdAt.toDate();
        const h = date.getHours();
        hourly[h].revenue += order.total;
        hourly[h].count += 1;
      }
    });
    return Object.values(hourly).filter((d) => d.revenue > 0 || d.count > 0);
  }, [orders]);

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No hay datos de ventas para hoy.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
          labelFormatter={(label: string) => `Hora: ${label}`}
        />
        <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Dashboard Page ───

export default function DashboardPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();

  const { orders: activeOrders, loading: activeLoading } = useActiveOrders(orgId, branchId);
  const { orders: todayOrders, loading: todayLoading } = useTodayOrders(orgId, branchId);

  const stats = useMemo(() => {
    const completedOrders = todayOrders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    return {
      totalOrders: todayOrders.length,
      totalRevenue,
      avgTicket,
      activeCount: activeOrders.length,
    };
  }, [todayOrders, activeOrders]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Pedidos hoy"
          value={todayLoading ? '...' : stats.totalOrders.toString()}
          icon={ShoppingCart}
          color="bg-blue-50 text-blue-600"
        />
        <StatsCard
          label="Ingresos hoy"
          value={todayLoading ? '...' : `$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
        <StatsCard
          label="Ticket promedio"
          value={todayLoading ? '...' : `$${stats.avgTicket.toFixed(2)}`}
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
        />
        <StatsCard
          label="Pedidos activos"
          value={activeLoading ? '...' : stats.activeCount.toString()}
          icon={Activity}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Orders */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Pedidos activos</h2>
          </div>
          <ActiveOrdersList orders={activeOrders} loading={activeLoading} />
        </div>

        {/* Sales Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas por hora</h2>
          {todayLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            </div>
          ) : (
            <SalesChart orders={todayOrders} />
          )}
        </div>
      </div>
    </div>
  );
}
