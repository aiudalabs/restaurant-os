import { useMemo } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Activity, Clock } from 'lucide-react';
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

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  pending_payment: 'Esperando pago',
  payment_failed: 'Pago rechazado',
  paid: 'Pagado',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  closed: 'Cerrado',
};

const STATUS_COLORS: Partial<Record<OrderStatus, string>> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  payment_failed: 'bg-red-100 text-red-700',
  paid: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_preparation: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-500',
};

// ─── Stats Cards ───

interface StatsCardProps {
  label: string;
  value: string;
  icon: typeof DollarSign;
  tint: string;
}

function StatsCard({ label, value, icon: Icon, tint }: StatsCardProps) {
  return (
    <div className="m3-card p-5">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', tint)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

// ─── Active Orders List ───

function ActiveOrdersList({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="text-3xl">☕️</div>
        <p className="text-sm text-gray-400">No hay pedidos activos en este momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-2xl bg-[var(--color-surface-container-high)] px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900">{order.tableNumber}</span>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600',
              )}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{order.itemCount} ítems</span>
            <span className="font-bold text-gray-900">${order.total.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sales Chart ───

function SalesChart({ orders }: { orders: Order[] }) {
  const chartData = useMemo(() => {
    const hourly: Record<number, { hour: string; revenue: number; count: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourly[h] = { hour: `${h.toString().padStart(2, '0')}:00`, revenue: 0, count: 0 };
    }
    orders.forEach((order) => {
      if (order.createdAt && order.status !== 'cancelled') {
        const h = order.createdAt.toDate().getHours();
        hourly[h].revenue += order.total;
        hourly[h].count += 1;
      }
    });
    return Object.values(hourly).filter((d) => d.revenue > 0 || d.count > 0);
  }, [orders]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="text-3xl">📊</div>
        <p className="text-sm text-gray-400">No hay datos de ventas para hoy.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ left: -18, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-outline-variant)" vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-primary)', opacity: 0.08 }}
          contentStyle={{
            borderRadius: 16,
            border: '1px solid var(--color-outline-variant)',
            background: 'var(--color-white)',
            color: 'var(--color-on-surface)',
            boxShadow: 'var(--shadow-e2)',
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
          labelFormatter={(label: string) => `Hora: ${label}`}
        />
        <Bar dataKey="revenue" fill="var(--color-primary)" radius={[8, 8, 0, 0]} maxBarSize={38} />
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
    const completed = todayOrders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = completed.reduce((sum, o) => sum + o.total, 0);
    return {
      totalOrders: todayOrders.length,
      totalRevenue,
      avgTicket: completed.length > 0 ? totalRevenue / completed.length : 0,
      activeCount: activeOrders.length,
    };
  }, [todayOrders, activeOrders]);

  const firstName = appUser?.displayName?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      <p className="text-[15px] text-gray-500">
        {firstName ? `Hola, ${firstName} 👋 ` : ''}Este es el resumen de hoy.
      </p>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Pedidos hoy"
          value={todayLoading ? '—' : stats.totalOrders.toString()}
          icon={ShoppingCart}
          tint="bg-blue-100 text-blue-700"
        />
        <StatsCard
          label="Ingresos hoy"
          value={todayLoading ? '—' : `$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          tint="bg-green-100 text-green-700"
        />
        <StatsCard
          label="Ticket promedio"
          value={todayLoading ? '—' : `$${stats.avgTicket.toFixed(2)}`}
          icon={TrendingUp}
          tint="bg-[var(--color-primary-container)] text-orange-700"
        />
        <StatsCard
          label="Pedidos activos"
          value={activeLoading ? '—' : stats.activeCount.toString()}
          icon={Activity}
          tint="bg-purple-100 text-purple-700"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="m3-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-900">Pedidos activos</h2>
            {!activeLoading && stats.activeCount > 0 && (
              <span className="ml-auto rounded-full bg-[var(--color-primary-container)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-on-primary-container)]">
                {stats.activeCount}
              </span>
            )}
          </div>
          <ActiveOrdersList orders={activeOrders} loading={activeLoading} />
        </section>

        <section className="m3-card p-5">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Ventas por hora</h2>
          {todayLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            </div>
          ) : (
            <SalesChart orders={todayOrders} />
          )}
        </section>
      </div>
    </div>
  );
}
