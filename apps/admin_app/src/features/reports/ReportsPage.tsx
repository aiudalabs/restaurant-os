import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Card, EmptyState, FilterChip } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { getOrderReports, type OrderReportData } from '@/services/report.service';

const STATUS_LABELS: Record<string, string> = {
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

const AXIS_TICK = { fontSize: 12, fill: 'var(--md-sys-color-on-surface-variant)' };

/** yyyy-mm-dd in local time (what <input type="date"> expects). */
function toDateInput(d: Date) {
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

interface RangePreset {
  id: string;
  label: string;
  range: () => { start: string; end: string };
}

// Shortcuts that fill the date fields; the custom range stays editable.
const PRESETS: RangePreset[] = [
  { id: 'today', label: 'Hoy', range: () => ({ start: toDateInput(new Date()), end: toDateInput(new Date()) }) },
  { id: '7d', label: 'Últimos 7 días', range: () => ({ start: toDateInput(daysAgo(7)), end: toDateInput(new Date()) }) },
  { id: '30d', label: 'Últimos 30 días', range: () => ({ start: toDateInput(daysAgo(30)), end: toDateInput(new Date()) }) },
  {
    id: 'month',
    label: 'Este mes',
    range: () => {
      const now = new Date();
      return { start: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), end: toDateInput(now) };
    },
  },
];

function SummaryCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'error' }) {
  return (
    <Card variant="filled" className="p-4">
      <p
        className={
          tone === 'error'
            ? 't-headline-medium text-[var(--md-sys-color-error)]'
            : 't-headline-medium text-[var(--md-sys-color-on-surface)]'
        }
      >
        {value}
      </p>
      <p className="t-label-large mt-1 text-[var(--md-sys-color-on-surface-variant)]">{label}</p>
    </Card>
  );
}

export default function ReportsPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();

  const [startDate, setStartDate] = useState(() => toDateInput(daysAgo(7)));
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()));
  const [report, setReport] = useState<OrderReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPreset = (preset: RangePreset) => {
    const { start, end } = preset.range();
    setStartDate(start);
    setEndDate(end);
  };

  const handleGenerateReport = async () => {
    if (!orgId || !branchId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrderReports({
        orgId,
        branchId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
      });
      setReport(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar reporte';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Date range selector */}
      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Rangos rápidos">
          {PRESETS.map((preset) => {
            const { start, end } = preset.range();
            return (
              <FilterChip
                key={preset.id}
                selected={start === startDate && end === endDate}
                onClick={() => selectPreset(preset)}
              >
                {preset.label}
              </FilterChip>
            );
          })}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Input
            id="startDate"
            label="Fecha inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            id="endDate"
            label="Fecha fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button onClick={handleGenerateReport} disabled={loading} className="sm:mt-2 max-sm:w-full">
            {loading ? (
              <>
                <Icon name="progress_activity" size={18} className="animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Icon name="download" size={18} />
                Generar reporte
              </>
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <div
          role="alert"
          className="t-body-medium flex items-start gap-3 rounded-xl bg-[var(--md-sys-color-error-container)] p-4 text-[var(--md-sys-color-on-error-container)]"
        >
          <Icon name="error" size={20} />
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <Card>
          <EmptyState
            icon="bar_chart"
            title="Sin reporte todavía"
            body="Selecciona un rango de fechas y genera el reporte."
          />
        </Card>
      )}

      {report && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-4">
            <SummaryCard label="Total pedidos" value={report.totalOrders.toString()} />
            <SummaryCard label="Ingresos totales" value={`$${report.totalRevenue.toFixed(2)}`} />
            <SummaryCard label="Ticket promedio" value={`$${report.averageTicket.toFixed(2)}`} />
            <SummaryCard label="Pedidos cancelados" value={report.cancelledOrders.toString()} tone="error" />
          </div>

          {/* Daily revenue chart */}
          {report.dailyRevenue.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h2 className="t-title-large mb-4 text-[var(--md-sys-color-on-surface)]">Ingresos por día</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.dailyRevenue} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--md-sys-color-outline-variant)" vertical={false} />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--md-sys-color-primary)', opacity: 0.08 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      background: 'var(--md-sys-color-surface-container)',
                      color: 'var(--md-sys-color-on-surface)',
                    }}
                    labelStyle={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                    itemStyle={{ color: 'var(--md-sys-color-on-surface)' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
                  />
                  <Bar dataKey="revenue" fill="var(--md-sys-color-primary)" radius={[8, 8, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Top products */}
          {report.topProducts.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h2 className="t-title-large mb-4 text-[var(--md-sys-color-on-surface)]">Productos más vendidos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[var(--md-sys-color-outline-variant)]">
                      <th scope="col" className="t-label-large px-4 py-3 text-left text-[var(--md-sys-color-on-surface-variant)]">
                        Producto
                      </th>
                      <th scope="col" className="t-label-large px-4 py-3 text-right text-[var(--md-sys-color-on-surface-variant)]">
                        Cantidad
                      </th>
                      <th scope="col" className="t-label-large px-4 py-3 text-right text-[var(--md-sys-color-on-surface-variant)]">
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]">
                    {report.topProducts.map((product, i) => (
                      <tr key={i}>
                        <td className="t-body-medium px-4 py-3 text-[var(--md-sys-color-on-surface)]">
                          {product.productName}
                        </td>
                        <td className="t-body-medium px-4 py-3 text-right tabular-nums text-[var(--md-sys-color-on-surface-variant)]">
                          {product.quantity}
                        </td>
                        <td className="t-title-small px-4 py-3 text-right tabular-nums text-[var(--md-sys-color-on-surface)]">
                          ${product.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Orders by status */}
          {Object.keys(report.ordersByStatus).length > 0 && (
            <Card className="p-4 sm:p-6">
              <h2 className="t-title-large mb-4 text-[var(--md-sys-color-on-surface)]">Pedidos por estado</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(report.ordersByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="min-w-28 rounded-xl bg-[var(--md-sys-color-surface-container-high)] px-4 py-3"
                  >
                    <p className="t-label-medium text-[var(--md-sys-color-on-surface-variant)]">
                      {STATUS_LABELS[status] ?? status.replace('_', ' ')}
                    </p>
                    <p className="t-title-large text-[var(--md-sys-color-on-surface)]">{count}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
