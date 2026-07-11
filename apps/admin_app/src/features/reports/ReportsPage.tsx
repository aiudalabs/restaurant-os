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
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { getOrderReports, type OrderReportData } from '@/services/report.service';

export default function ReportsPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [startDate, setStartDate] = useState(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [report, setReport] = useState<OrderReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="m3-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
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
          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileDown className="mr-1.5 h-4 w-4" />
                Generar reporte
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="m3-card p-5 py-12 text-center">
          <p className="text-sm text-gray-500">
            Selecciona un rango de fechas y genera el reporte.
          </p>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="m3-card p-5">
              <p className="text-3xl font-extrabold tracking-tight text-gray-900">{report.totalOrders}</p>
              <p className="mt-1 text-sm text-gray-500">Total pedidos</p>
            </div>
            <div className="m3-card p-5">
              <p className="text-3xl font-extrabold tracking-tight text-gray-900">
                ${report.totalRevenue.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-gray-500">Ingresos totales</p>
            </div>
            <div className="m3-card p-5">
              <p className="text-3xl font-extrabold tracking-tight text-gray-900">
                ${report.averageTicket.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-gray-500">Ticket promedio</p>
            </div>
            <div className="m3-card p-5">
              <p className="text-3xl font-extrabold tracking-tight text-red-600">{report.cancelledOrders}</p>
              <p className="mt-1 text-sm text-gray-500">Pedidos cancelados</p>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          {report.dailyRevenue.length > 0 && (
            <div className="m3-card p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Ingresos por dia
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.dailyRevenue}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--color-outline-variant)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }}
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
                  />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[8, 8, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products */}
          {report.topProducts.length > 0 && (
            <div className="m3-card p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Productos mas vendidos
              </h2>
              <div className="overflow-hidden rounded-2xl">
                <table className="min-w-full divide-y divide-[var(--color-outline-variant)]">
                  <thead className="bg-[var(--color-surface-container-high)]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Cantidad
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-outline-variant)]">
                    {report.topProducts.map((product, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {product.productName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {product.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-700">
                          ${product.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders by Status */}
          {Object.keys(report.ordersByStatus).length > 0 && (
            <div className="m3-card p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Pedidos por estado
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(report.ordersByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="rounded-2xl bg-[var(--color-surface-container-high)] px-4 py-2 text-center"
                  >
                    <p className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</p>
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
