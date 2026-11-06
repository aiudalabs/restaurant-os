import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Segmented } from '@/components/ui/m3';
import { clock, money } from '@/lib/time';
import {
  SLOT_MINUTES,
  cumulative,
  slotCount,
  slotOf,
  type DayWindow,
  type Marker,
  type Series,
} from './jornada';

type Metric = 'revenue' | 'count';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'revenue', label: 'Ventas' },
  { value: 'count', label: 'Pedidos' },
];

/** Rounds a raw grid step up to 1, 2 or 5 × 10^k so axis labels stay whole. */
function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export type LastWeekState = 'loading' | 'ready' | 'error';

interface Props {
  win: DayWindow;
  today: Series;
  lastWeek: Series | null;
  lastWeekState: LastWeekState;
  onRetryLastWeek: () => void;
  markers: Marker[];
  /** Minutes since midnight; null when the branch is not open right now. */
  nowMin: number | null;
}

/**
 * «La jornada»: one bar per 15 minutes from opening to closing, last week's same
 * weekday as a ghost outline, a fixed line for "now" and markers for incidents
 * at the time of day they happened. Drawn with SVG so it needs no chart library.
 */
export function JornadaChart({ win, today, lastWeek, lastWeekState, onRetryLastWeek, markers, nowMin }: Props) {
  const { ref, width } = useWidth();
  const [metric, setMetric] = useState<Metric>('revenue');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [activeMarker, setActiveMarker] = useState<Marker | null>(null);

  const n = slotCount(win);
  const nowSlot = nowMin === null ? -1 : Math.min(n - 1, Math.max(0, slotOf(nowMin, win)));
  const W = Math.max(width, 280);
  const H = W < 520 ? 250 : 320;
  const padL = metric === 'revenue' ? 44 : 32;
  const padR = 8;
  const padT = 34;
  const padB = 52;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const sw = plotW / n;
  const base = padT + plotH;
  const x = (slot: number) => padL + slot * sw;

  const values = today[metric];
  const ghost = lastWeek?.[metric] ?? null;
  const peak = Math.max(1, ...values, ...(ghost ?? []));
  const step = niceStep(peak / 3);
  const top = step * 3;
  const y = (v: number) => base - (v / top) * plotH;

  const ghostPath = useMemo(() => {
    if (!ghost) return '';
    let d = `M ${x(0)} ${y(ghost[0])}`;
    ghost.forEach((_, i) => {
      d += ` H ${x(i + 1)}`;
      if (i + 1 < ghost.length) d += ` V ${y(ghost[i + 1])}`;
    });
    return d;
    // x and y are pure functions of the values below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost, top, plotW, plotH, n, padL]);

  // Hour labels, thinned so they never touch (about 46px each).
  const hourSlots = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) if ((win.openMin + i * SLOT_MINUTES) % 60 === 0) out.push(i);
    const every = Math.max(1, Math.ceil(46 / (sw * (60 / SLOT_MINUTES))));
    return out.filter((_, k) => k % every === 0);
  }, [n, win.openMin, sw]);

  const nowX = nowMin === null ? null : padL + ((nowMin - win.openMin) / SLOT_MINUTES) * sw;

  const slotLabel = (i: number) => `${clock(win.openMin + i * SLOT_MINUTES)} a ${clock(win.openMin + (i + 1) * SLOT_MINUTES)}`;

  // Markers sharing a slot are laid side by side.
  const placed = useMemo(() => {
    const seen = new Map<number, number>();
    return markers.map((m) => {
      const k = seen.get(m.slot) ?? 0;
      seen.set(m.slot, k + 1);
      return { m, cx: x(m.slot) + sw / 2 + k * 14 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, sw, padL]);

  const totalNow = cumulative(today, nowSlot >= 0 ? nowSlot : n - 1);
  const totalThen = lastWeek ? cumulative(lastWeek, nowSlot >= 0 ? nowSlot : n - 1) : null;

  let readout: string;
  if (activeMarker) {
    readout = activeMarker.label;
  } else if (activeSlot !== null) {
    readout =
      `${slotLabel(activeSlot)} · ${plural(today.count[activeSlot], 'pedido', 'pedidos')} · ${money(today.revenue[activeSlot])}` +
      (lastWeek
        ? ` · semana pasada ${plural(lastWeek.count[activeSlot], 'pedido', 'pedidos')} · ${money(lastWeek.revenue[activeSlot])}`
        : '');
  } else {
    const upTo = nowSlot >= 0 ? 'Hasta ahora' : 'En el día';
    readout =
      `${upTo}: ${plural(totalNow.count, 'pedido', 'pedidos')}, ${money(totalNow.revenue)}.` +
      (totalThen
        ? ` La semana pasada ${nowSlot >= 0 ? 'a esta hora' : 'en total'}: ${plural(totalThen.count, 'pedido', 'pedidos')}, ${money(totalThen.revenue)}.`
        : '');
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      setActiveMarker(null);
      setActiveSlot((s) => Math.min(n - 1, Math.max(0, (s ?? (nowSlot >= 0 ? nowSlot : 0)) + dir)));
    } else if (e.key === 'Escape') {
      setActiveSlot(null);
      setActiveMarker(null);
    }
  };

  const hasToday = today.count.some((c) => c > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="t-body-medium min-h-10 min-w-0 flex-1 basis-80 text-[var(--ink)]" aria-live="polite">
          {readout}
        </p>
        <Segmented label="Medida del gráfico" value={metric} options={METRICS} onChange={setMetric} />
      </div>

      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-roledescription="gráfico de la jornada"
        aria-label={`Ventas y pedidos cada 15 minutos, de ${clock(win.openMin)} a ${clock(win.closeMin)}. Usa las flechas para recorrer el día.`}
        onKeyDown={onKey}
        onBlur={() => {
          setActiveSlot(null);
          setActiveMarker(null);
        }}
        className="relative rounded-[10px]"
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(step * i)}
                y2={y(step * i)}
                stroke="var(--line)"
                strokeDasharray={i === 0 ? undefined : '3 5'}
              />
              <text x={padL - 8} y={y(step * i) + 4} textAnchor="end" fontSize={12} fill="var(--ink-soft)" className="tnum">
                {metric === 'revenue' ? `$${step * i}` : step * i}
              </text>
            </g>
          ))}

          {/* hovered slot */}
          {activeSlot !== null && (
            <rect x={x(activeSlot)} y={padT} width={sw} height={plotH} fill="var(--tint)" />
          )}

          {/* today's bars */}
          {values.map((v, i) => {
            if (v <= 0) return null;
            const h = Math.max(2, (v / top) * plotH);
            const bw = Math.max(2, sw - (sw > 8 ? 2 : 1));
            const cx = x(i) + (sw - bw) / 2;
            return (
              <rect
                key={i}
                x={cx}
                y={base - h}
                width={bw}
                height={h}
                rx={Math.min(3, bw / 2)}
                fill="var(--brand)"
                style={{
                  transformOrigin: `${cx + bw / 2}px ${base}px`,
                  animation: `jornada-rise 520ms var(--ease-out) ${Math.min(i * 12, 700)}ms both`,
                }}
              />
            );
          })}

          {/* last week, as a ghost outline on top of today */}
          {ghostPath && (
            <path
              d={ghostPath}
              fill="none"
              stroke="var(--ink-soft)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {/* x axis */}
          <line x1={padL} x2={W - padR} y1={base} y2={base} stroke="var(--line-strong)" />
          {hourSlots.map((i) => {
            const cx = x(i);
            return (
              <text key={i} x={cx} y={base + 18} textAnchor="middle" fontSize={12} fill="var(--ink-soft)" className="tnum">
                {clock(win.openMin + i * SLOT_MINUTES)}
              </text>
            );
          })}

          {/* "ahora" */}
          {nowX !== null && (
            <g>
              <line x1={nowX} x2={nowX} y1={padT - 6} y2={H - 24} stroke="var(--accent)" strokeWidth={2} />
              <rect x={nowX - 26} y={H - 24} width={52} height={20} rx={10} fill="var(--accent)" />
              <text x={nowX} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="#101a33">
                ahora
              </text>
            </g>
          )}

          {/* slot hit areas */}
          {values.map((_, i) => (
            <rect
              key={i}
              x={x(i)}
              y={padT}
              width={sw}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => {
                setActiveMarker(null);
                setActiveSlot(i);
              }}
              onMouseLeave={() => setActiveSlot(null)}
            />
          ))}

          {/* incidents */}
          {placed.map(({ m, cx }, k) => (
            <g
              key={`${m.orderId}-${m.kind}-${k}`}
              tabIndex={0}
              role="img"
              aria-label={m.label}
              className="cursor-default outline-none [&:focus-visible>rect]:stroke-[var(--ink)] [&:focus-visible>rect]:stroke-2"
              onMouseEnter={() => setActiveMarker(m)}
              onMouseLeave={() => setActiveMarker(null)}
              onFocus={() => setActiveMarker(m)}
              onBlur={() => setActiveMarker(null)}
            >
              <rect x={cx - 11} y={0} width={22} height={26} rx={6} fill="transparent" stroke="none" />
              {m.kind === 'late' ? (
                <circle cx={cx} cy={13} r={6} fill="var(--late)" stroke="var(--surface)" strokeWidth={2} />
              ) : (
                <path
                  d={`M ${cx} 6 L ${cx + 7} 13 L ${cx} 20 L ${cx - 7} 13 Z`}
                  fill="var(--accent)"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              )}
            </g>
          ))}
        </svg>

        {!hasToday && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-6">
            <span className="t-body-medium rounded-[10px] bg-[var(--surface)] px-4 py-2 text-center text-[var(--ink)] shadow-[0_1px_2px_rgba(16,26,51,0.08),0_4px_12px_rgba(16,26,51,0.06)]">
              Todavía no hay ventas hoy. Las barras aparecen con el primer pedido.
            </span>
          </p>
        )}
      </div>

      <ul className="t-body-small flex flex-wrap items-center gap-x-5 gap-y-1 text-[var(--ink-soft)]">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[var(--brand)]" />
          Hoy
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-0 w-4 border-t-[1.5px] border-[var(--ink-soft)]" />
          {lastWeekState === 'ready' && 'Mismo día de la semana pasada'}
          {lastWeekState === 'loading' && 'Cargando la semana pasada…'}
          {lastWeekState === 'error' && (
            <>
              No se pudo cargar la semana pasada.
              <button type="button" onClick={onRetryLastWeek} className="t-label-large -my-2 min-h-11 rounded-md px-2 text-[var(--ink)] underline">
                Reintentar
              </button>
            </>
          )}
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5" fill="var(--late)" />
          </svg>
          Pedido retrasado
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="var(--accent)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          Factura con error
        </li>
      </ul>
    </div>
  );
}
