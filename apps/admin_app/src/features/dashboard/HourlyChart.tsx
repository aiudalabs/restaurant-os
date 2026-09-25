import { useMemo, useState } from 'react';
import { EmptyState, Segmented } from '@/components/ui/m3';
import type { Order } from '@/types/order';

type Metric = 'revenue' | 'count';

interface HourBucket {
  hour: number;
  label: string;
  revenue: number;
  count: number;
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'count', label: 'Pedidos' },
  { value: 'revenue', label: 'Ingresos' },
];

// SVG viewBox geometry; the chart scales to the card width.
const WIDTH = 640;
const HEIGHT = 240;
const PAD_LEFT = 48;
const PAD_BOTTOM = 28;
const PAD_TOP = 12;
const GRID_LINES = 4;

/** Rounds a raw grid step up to 1, 2 or 5 × 10^k so axis labels stay whole numbers. */
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / pow;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * pow;
}

function formatValue(metric: Metric, value: number) {
  return metric === 'revenue' ? `$${value.toFixed(2)}` : `${value}`;
}

/** Buckets non-cancelled orders by hour; keeps the span from the first to the last busy hour. */
function bucketByHour(orders: Order[]): HourBucket[] {
  const hourly: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h.toString().padStart(2, '0')}:00`,
    revenue: 0,
    count: 0,
  }));
  orders.forEach((order) => {
    if (order.createdAt && order.status !== 'cancelled') {
      const h = order.createdAt.toDate().getHours();
      hourly[h].revenue += order.total;
      hourly[h].count += 1;
    }
  });
  const busy = hourly.filter((d) => d.count > 0);
  if (busy.length === 0) return [];
  return hourly.slice(busy[0].hour, busy[busy.length - 1].hour + 1);
}

/** "Pedidos por hora" bar chart drawn with M3 color roles (no chart library). */
export function HourlyChart({ orders }: { orders: Order[] }) {
  const [metric, setMetric] = useState<Metric>('count');
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const data = useMemo(() => bucketByHour(orders), [orders]);

  const step = niceStep(Math.max(...data.map((d) => d[metric]), 1) / GRID_LINES);
  const max = step * GRID_LINES;
  const plotW = WIDTH - PAD_LEFT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotW / Math.max(data.length, 1);
  const barW = Math.min(slot * 0.6, 38);
  // Label every hour when there is room, otherwise every other one.
  const labelEvery = data.length > 12 ? 2 : 1;

  const active = data.find((d) => d.hour === activeHour);
  const peak = data.reduce<HourBucket | null>((best, d) => (!best || d[metric] > best[metric] ? d : best), null);
  const summary = peak
    ? `Hora pico ${peak.label}: ${formatValue(metric, peak[metric])}`
    : '';

  if (data.length === 0) {
    return <EmptyState icon="bar_chart" title="Sin ventas todavía" body="No hay datos de ventas para hoy." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]" aria-live="polite">
          {active
            ? `${active.label} · $${active.revenue.toFixed(2)} · ${active.count} ${active.count === 1 ? 'pedido' : 'pedidos'}`
            : summary}
        </p>
        <Segmented label="Métrica del gráfico" value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="group"
        aria-label={`${metric === 'revenue' ? 'Ingresos' : 'Pedidos'} por hora. ${summary}`}
      >
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const value = step * i;
          const y = PAD_TOP + plotH - (plotH / GRID_LINES) * i;
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH}
                y1={y}
                y2={y}
                stroke="var(--md-sys-color-outline-variant)"
                strokeDasharray={i === 0 ? undefined : '4 4'}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--md-sys-color-on-surface-variant)"
              >
                {metric === 'revenue' ? `$${value}` : value}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = (d[metric] / max) * plotH;
          const cx = PAD_LEFT + slot * i + slot / 2;
          const isActive = d.hour === activeHour;
          return (
            <g
              key={d.hour}
              tabIndex={0}
              aria-label={`${d.label}: $${d.revenue.toFixed(2)}, ${d.count} pedidos`}
              onMouseEnter={() => setActiveHour(d.hour)}
              onMouseLeave={() => setActiveHour(null)}
              onFocus={() => setActiveHour(d.hour)}
              onBlur={() => setActiveHour(null)}
              className="cursor-default outline-none"
            >
              {/* Full-height hit area so short bars are easy to hover. */}
              <rect
                x={cx - slot / 2}
                y={PAD_TOP}
                width={slot}
                height={plotH}
                fill="var(--md-sys-color-primary)"
                opacity={isActive ? 0.08 : 0}
              />
              {h > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={PAD_TOP + plotH - h}
                  width={barW}
                  height={h}
                  rx={Math.min(8, barW / 2)}
                  fill={isActive ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)'}
                />
              )}
              {i % labelEvery === 0 && (
                <text
                  x={cx}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--md-sys-color-on-surface-variant)"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
