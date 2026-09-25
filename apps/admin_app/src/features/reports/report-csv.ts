import type { OrderReportData } from '@/services/report.service';

type Cell = string | number;

const SOURCE_LABELS: Record<string, string> = { waiter: 'Mesero', qr: 'QR cliente' };
const PAY_METHOD_LABELS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', yappy: 'Yappy' };
const PAY_STATUS_LABELS: Record<string, string> = { paid: 'Cobrado', pending: 'Por cobrar', failed: 'Rechazado' };

const money = (n: number) => n.toFixed(2);

/** RFC 4180 cell: quote when it holds a comma, quote or line break. */
function cell(value: Cell): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text with a UTF-8 BOM so Excel shows accents correctly. */
function toCsv(rows: Cell[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function ordersCsv(report: OrderReportData, statusLabels: Record<string, string>): string {
  const header = ['Fecha', 'Hora', 'Número', 'Cliente / Mesa', 'Origen', 'Estado', 'Productos', 'Subtotal', 'ITBMS', 'Propina', 'Total', 'Pago', 'Estado del pago', 'ID'];
  const rows = report.orders.map((o) => [
    o.date,
    o.time,
    o.id.slice(0, 4).toUpperCase(), // same short number the KDS shows
    o.label,
    SOURCE_LABELS[o.source] ?? o.source,
    statusLabels[o.status] ?? o.status,
    o.items,
    money(o.subtotal),
    money(o.tax),
    money(o.tip),
    money(o.total),
    PAY_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod,
    o.status === 'cancelled' ? '' : (PAY_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus),
    o.id,
  ]);
  return toCsv([header, ...rows]);
}

export function summaryCsv(
  report: OrderReportData,
  range: { start: string; end: string },
  statusLabels: Record<string, string>,
): string {
  const rows: Cell[][] = [
    ['Periodo', `${range.start} a ${range.end}`],
    ['Pedidos (sin cancelados)', report.totalOrders],
    ['Ingresos cobrados', money(report.totalRevenue)],
    ['Ticket promedio', money(report.averageTicket)],
    ['Pedidos cancelados', report.cancelledOrders],
    [],
    ['Día', 'Ingresos cobrados', 'Pedidos'],
    ...report.dailyRevenue.map((d) => [d.date, money(d.revenue), d.orders]),
    [],
    ['Producto', 'Cantidad', 'Ingresos'],
    ...report.topProducts.map((p) => [p.productName, p.quantity, money(p.revenue)]),
    [],
    ['Estado', 'Pedidos'],
    ...Object.entries(report.ordersByStatus).map(([status, count]) => [statusLabels[status] ?? status, count]),
  ];
  return toCsv(rows);
}

/** Saves text as a file through a temporary object URL. */
export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
