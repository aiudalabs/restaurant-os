import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { Card, EmptyState, PageHeader, StatusChip, type StatusTone } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useActiveOrders, useTodayOrders } from '@/hooks/use-orders';
import type { Order, OrderStatus } from '@/types/order';
import { HourlyChart } from './HourlyChart';

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

// success = listo · info = en cocina · error = pago/alerta (spec, StatusChip).
const STATUS_TONES: Partial<Record<OrderStatus, StatusTone>> = {
  pending_payment: 'error',
  payment_failed: 'error',
  paid: 'neutral',
  pending: 'outline',
  confirmed: 'info',
  in_preparation: 'info',
  ready: 'success',
  delivered: 'neutral',
  cancelled: 'error',
  closed: 'neutral',
};

function isUnpaid(order: Order) {
  return order.payment?.status !== 'paid';
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function Spinner() {
  return (
    <div role="status" className="flex items-center justify-center py-10">
      <Icon name="progress_activity" size={28} className="animate-spin text-[var(--md-sys-color-primary)]" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

// ─── Summary cards ───

interface SummaryCardProps {
  label: string;
  value: string;
  icon: string;
  /** M3 container pair for the icon badge, e.g. "primary" → primary-container / on-primary-container. */
  role: 'primary' | 'secondary' | 'tertiary';
}

function SummaryCard({ label, value, icon, role }: SummaryCardProps) {
  return (
    <Card variant="filled" className="flex flex-col gap-4 p-4">
      <span
        className="grid h-10 w-10 place-items-center rounded-full"
        style={{
          background: `var(--md-sys-color-${role}-container)`,
          color: `var(--md-sys-color-on-${role}-container)`,
        }}
      >
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="t-headline-medium text-[var(--md-sys-color-on-surface)]">{value}</p>
        <p className="t-label-large mt-1 text-[var(--md-sys-color-on-surface-variant)]">{label}</p>
      </div>
    </Card>
  );
}

// ─── Active orders list ───

function ActiveOrdersList({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) return <Spinner />;

  if (orders.length === 0) {
    return <EmptyState icon="coffee" title="Todo tranquilo" body="No hay pedidos activos en este momento." />;
  }

  return (
    <ul className="divide-y divide-[var(--md-sys-color-outline-variant)]">
      {orders.map((order) => (
        <li key={order.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="t-title-small truncate text-[var(--md-sys-color-on-surface)]">{order.tableNumber}</span>
            <StatusChip tone={STATUS_TONES[order.status] ?? 'neutral'}>
              {STATUS_LABELS[order.status] ?? order.status}
            </StatusChip>
            {isUnpaid(order) && (
              <StatusChip tone="error" icon="payments">
                Por cobrar
              </StatusChip>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <span className="t-body-medium hidden text-[var(--md-sys-color-on-surface-variant)] sm:inline">
              {order.itemCount} ítems
            </span>
            <span className="t-title-small text-[var(--md-sys-color-on-surface)]">${order.total.toFixed(2)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Dashboard ("Hoy") ───

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

  // What needs attention right now, from the live active-orders feed.
  const attention = useMemo(() => {
    if (activeLoading) return 'Este es el resumen de hoy.';
    const pending = activeOrders.filter((o) => o.status === 'pending').length;
    const ready = activeOrders.filter((o) => o.status === 'ready').length;
    const unpaid = activeOrders.filter(isUnpaid).length;
    const parts = [
      pending > 0 && plural(pending, 'pedido pendiente', 'pedidos pendientes'),
      ready > 0 && plural(ready, 'listo para entregar', 'listos para entregar'),
      unpaid > 0 && `${unpaid} por cobrar`,
    ].filter(Boolean);
    if (parts.length > 0) return `${parts.join(' · ')}.`;
    return activeOrders.length > 0 ? 'Todo en marcha, nada pendiente.' : 'Sin pedidos activos por ahora.';
  }, [activeOrders, activeLoading]);

  const firstName = appUser?.displayName?.split(' ')[0] ?? '';
  const dateLabel = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      <PageHeader
        title={firstName ? `Hola, ${firstName}` : 'Resumen de hoy'}
        subtitle={
          <>
            <span className="capitalize">{dateLabel}</span> · {attention}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-4">
        <SummaryCard
          label="Pedidos hoy"
          value={todayLoading ? '—' : stats.totalOrders.toString()}
          icon="receipt_long"
          role="secondary"
        />
        <SummaryCard
          label="Ingresos hoy"
          value={todayLoading ? '—' : `$${stats.totalRevenue.toFixed(2)}`}
          icon="payments"
          role="primary"
        />
        <SummaryCard
          label="Ticket promedio"
          value={todayLoading ? '—' : `$${stats.avgTicket.toFixed(2)}`}
          icon="trending_up"
          role="tertiary"
        />
        <SummaryCard
          label="Pedidos activos"
          value={activeLoading ? '—' : stats.activeCount.toString()}
          icon="skillet"
          role="secondary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="schedule" className="text-[var(--md-sys-color-primary)]" />
            <h2 className="t-title-large text-[var(--md-sys-color-on-surface)]">Pedidos activos</h2>
            {!activeLoading && stats.activeCount > 0 && (
              <span className="t-label-medium grid h-6 min-w-6 place-items-center rounded-full bg-[var(--md-sys-color-primary-container)] px-2 text-[var(--md-sys-color-on-primary-container)]">
                {stats.activeCount}
              </span>
            )}
            <Link
              to="/orders"
              className="m3-state t-label-large ml-auto inline-flex h-10 items-center rounded-full px-3 text-[var(--md-sys-color-primary)]"
            >
              Ver pedidos
            </Link>
          </div>
          <ActiveOrdersList orders={activeOrders} loading={activeLoading} />
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="t-title-large mb-2 text-[var(--md-sys-color-on-surface)]">Pedidos por hora</h2>
          {todayLoading ? <Spinner /> : <HourlyChart orders={todayOrders} />}
        </Card>
      </div>
    </div>
  );
}
