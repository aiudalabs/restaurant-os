import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { watchMyOrders } from '../lib/api';
import { historyDate, sortHistory, statusInfo, type StatusTone } from '../lib/history';
import { money } from '../lib/format';
import { ClubNav } from '../components/ClubNav';
import { BackButton, IconBadge } from '../components/Icon';
import { Spinner } from '../components/Spinner';
import type { OrderDoc } from '../types';

const TONE: Record<StatusTone, string> = {
  active: 'bg-gold-tint text-gold-ink',
  done: 'bg-brand-tint text-brand-dark',
  problem: 'bg-[#FBE9E7] text-danger',
};

/** "Mis pedidos": what this device ordered. Tapping one opens its tracking screen. */
export function HistoryScreen() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDoc[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(
    () =>
      watchMyOrders(
        (list) => {
          setOrders(sortHistory(list));
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col px-5 pb-6 safe-top">
        <header className="flex items-center gap-3 pt-5">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="font-display text-2xl font-semibold">Mis pedidos</h1>
        </header>

        {failed && orders === null && (
          <p className="mt-10 text-center text-sm text-danger">No pudimos cargar tus pedidos. Revisa tu conexión e intenta de nuevo.</p>
        )}
        {!failed && orders === null && <Spinner label="Cargando tus pedidos…" />}

        {orders && orders.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <IconBadge name="bag" />
            <p className="max-w-xs text-sm text-hint">
              Aún no hay pedidos hechos desde este dispositivo. Si pediste antes con otro teléfono o borraste los datos del navegador,
              búscalo con su número.
            </p>
            <button onClick={() => navigate('/recover')} className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
              Buscar con mi número
            </button>
          </div>
        )}

        {orders && orders.length > 0 && (
          <>
            <ul className="mt-5 flex flex-col gap-2.5">
              {orders.map((o) => {
                const st = statusInfo(o.status);
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => navigate(`/order/${o.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-lg font-semibold text-brand">{o.pickupCode || 'Pedido'}</span>
                        <span className="block text-xs text-hint">
                          {historyDate(o.createdAtMs)} · {o.itemCount} {o.itemCount === 1 ? 'artículo' : 'artículos'}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">{money(o.total)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[st.tone]}`}>{st.label}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => navigate('/recover')} className="mt-4 w-full py-2 text-sm font-medium text-hint">
              ¿Falta alguno? Buscar con mi número
            </button>
          </>
        )}
      </div>
      <ClubNav />
    </div>
  );
}
