import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useDayReport } from '@/hooks/use-day-report';
import { useNow } from '@/hooks/use-now';
import { useOrganization } from '@/hooks/use-organization';
import { useStations } from '@/hooks/use-stations';
import {
  useActiveOrders,
  useConfirmManualPayment,
  useItemsForOrders,
  useTodayOrders,
} from '@/hooks/use-orders';
import { DEFAULT_TIMEZONE, clock, shiftYmd, wallClock } from '@/lib/time';
import { ActiveOrders } from './ActiveOrders';
import { AhoraPanel } from './AhoraPanel';
import { JornadaChart, type LastWeekState } from './JornadaChart';
import {
  buildMarkers,
  buildSeries,
  dayWindow,
  fitWindow,
  isKitchenLate,
  jornadaSentence,
  phaseOf,
  salesFromOrders,
  salesFromReport,
} from './jornada';

const WEEKDAY_DATE = new Intl.DateTimeFormat('es-PA', { weekday: 'long', day: 'numeric', month: 'long' });

/** Inicio — «La jornada»: the state of the service now, against the same day last week. */
export default function DashboardPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranch, selectedBranchId: branchId } = useBranchContext();
  const { organization } = useOrganization(orgId);
  const tz = organization?.timezone || DEFAULT_TIMEZONE;
  const now = useNow(30_000);

  const { orders: activeOrders, loading: activeLoading } = useActiveOrders(orgId, branchId);
  const { orders: todayOrders, loading: todayLoading } = useTodayOrders(orgId, branchId);
  const { stations, loading: stationsLoading } = useStations(orgId, branchId);
  const { confirm, busyId } = useConfirmManualPayment();
  const [confirmError, setConfirmError] = useState('');

  const clockNow = wallClock(now, tz);
  const lastWeekYmd = shiftYmd(clockNow.ymd, -7);
  const report = useDayReport(orgId, branchId, lastWeekYmd, tz);

  // Orders that are in the kitchen's hands or ready, oldest first. Orders still waiting for
  // their payment are not "active": they have not reached the kitchen yet.
  const flow = useMemo(
    () =>
      activeOrders
        .filter((o) => o.status !== 'pending_payment')
        .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)),
    [activeOrders],
  );
  const unpaid = useMemo(
    () => activeOrders.filter((o) => o.status === 'pending_payment' && o.payment?.method === 'yappy'),
    [activeOrders],
  );
  const flowIds = useMemo(() => flow.map((o) => o.id), [flow]);
  const flowItems = useItemsForOrders(orgId, flowIds);

  // ── the curve ──
  const todaySales = useMemo(() => salesFromOrders(todayOrders, tz), [todayOrders, tz]);
  const lastWeekSales = useMemo(
    () => (report.data ? salesFromReport(report.data, lastWeekYmd) : null),
    [report.data, lastWeekYmd],
  );
  const baseWindow = dayWindow(selectedBranch, clockNow.weekday);
  const win = useMemo(
    () => fitWindow(baseWindow, [...todaySales, ...(lastWeekSales ?? [])].map((s) => s.minutes)),
    // baseWindow is rebuilt every render; its parts are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseWindow.openMin, baseWindow.closeMin, baseWindow.source, todaySales, lastWeekSales],
  );
  const todaySeries = useMemo(() => buildSeries(todaySales, win), [todaySales, win]);
  const lastWeekSeries = useMemo(() => (lastWeekSales ? buildSeries(lastWeekSales, win) : null), [lastWeekSales, win]);
  const markers = useMemo(
    () => buildMarkers(todayOrders, flow, win, tz, now),
    [todayOrders, flow, win, tz, now],
  );

  const phase = phaseOf(clockNow.minutes, win);
  const soldRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const sentence = activeLoading || todayLoading
    ? 'Cargando la jornada…'
    : jornadaSentence({ phase, nowMin: clockNow.minutes, win, active: flow, now, soldCount: todaySales.length, soldRevenue });

  const lastWeekState: LastWeekState = report.isError ? 'error' : report.isPending ? 'loading' : 'ready';

  const lateCount = flow.filter((o) => isKitchenLate(o, now)).length;
  const fiscalErrors = todayOrders.filter((o) => o.fiscal?.status === 'error');
  const paidToday = todayOrders.filter((o) => o.payment?.status === 'paid' && o.status !== 'cancelled');

  const confirmYappy = async (orderId: string) => {
    setConfirmError('');
    try {
      await confirm(orderId, true);
    } catch (e) {
      console.error('[admin] confirm manual payment failed', e);
      setConfirmError(e instanceof Error ? e.message : 'No se pudo confirmar el pago. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const hours =
    win.source === 'branch'
      ? `Abre ${clock(win.openMin)}, cierra ${clock(win.closeMin === 1440 ? 1439 : win.closeMin)}`
      : win.source === 'closed-day'
        ? `Sin horario para hoy; el gráfico muestra de ${clock(win.openMin)} a ${clock(win.closeMin)}`
        : `Sin horario configurado; el gráfico muestra de ${clock(win.openMin)} a ${clock(win.closeMin)}`;

  return (
    <div className="space-y-8 pb-6">
      <header className="max-w-4xl space-y-3">
        <p className="t-body-medium flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--ink-soft)]">
          <span className="first-letter:uppercase">{WEEKDAY_DATE.format(new Date(now))}</span>
          <span aria-hidden="true">·</span>
          <span>{selectedBranch?.name ?? 'Sin sucursal'}</span>
          <span aria-hidden="true">·</span>
          <span>{hours}</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--accent)] [animation:jornada-pulse_2.4s_ease-in-out_infinite]" />
            En vivo
          </span>
        </p>
        <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] [font-family:var(--font-display)] md:text-[44px]">
          {sentence}
        </h1>
        {win.source !== 'branch' && (
          <p className="t-body-small text-[var(--ink-soft)]">Configura el horario en Sucursales para que el gráfico use el real.</p>
        )}
      </header>

      <section aria-label="La jornada" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6">
        {todayLoading ? (
          <p role="status" className="t-body-medium py-24 text-center text-[var(--ink-soft)]">
            Cargando el día…
          </p>
        ) : (
          <JornadaChart
            win={win}
            today={todaySeries}
            lastWeek={lastWeekSeries}
            lastWeekState={lastWeekState}
            onRetryLastWeek={() => void report.refetch()}
            markers={markers}
            nowMin={phase === 'open' ? clockNow.minutes : null}
          />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
        <ActiveOrders orders={flow} loading={activeLoading} now={now} />
        <AhoraPanel
          unpaid={unpaid}
          lateCount={lateCount}
          fiscalErrors={fiscalErrors}
          stations={stations}
          stationsLoading={stationsLoading}
          items={flowItems}
          paidToday={paidToday}
          busyId={busyId}
          confirmError={confirmError}
          onConfirm={confirmYappy}
        />
      </div>
    </div>
  );
}
