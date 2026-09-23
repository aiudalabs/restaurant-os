import { useEffect, useState } from 'react';
import { watchActiveOrders } from '../lib/api';
import { OrderCard } from '../components/OrderCard';
import { Spinner } from '../components/Spinner';
import type { Branch, Order, Session } from '../types';

interface Props {
  session: Session;
  branch: Branch;
  branches: Branch[];
  onChangeBranch: (id: string) => void;
  onNewOrder: () => void;
  onLogout: () => void;
}

export function OrdersScreen({ session, branch, branches, onChangeBranch, onNewOrder, onLogout }: Props) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setOrders(null);
    setError('');
    return watchActiveOrders(session.orgId, branch.id, setOrders, (msg) => {
      console.error('[waiter] orders listener failed', msg);
      setError('No se pudieron cargar los pedidos. Revisa tu conexión.');
    });
  }, [session.orgId, branch.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-panel/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">Pedidos activos</p>
            {branches.length > 1 ? (
              <select
                value={branch.id}
                onChange={(e) => onChangeBranch(e.target.value)}
                className="-ml-1 max-w-full truncate bg-transparent text-sm text-muted"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="truncate text-sm text-muted">
                {branch.name} · {session.displayName}
              </p>
            )}
          </div>
          <button onClick={onLogout} className="shrink-0 rounded-full border border-line px-3 py-2 text-sm font-medium text-muted">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-3 px-4 pb-28 pt-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand">{error}</p>}
        {!orders && !error && <Spinner full />}
        {orders?.length === 0 && (
          <div className="py-16 text-center text-muted">
            <p className="text-4xl">🍽️</p>
            <p className="mt-2 font-medium">No hay pedidos abiertos</p>
            <p className="text-sm">Toca “Nuevo pedido” para empezar</p>
          </div>
        )}
        {orders?.map((o) => <OrderCard key={o.id} order={o} orgId={session.orgId} now={now} />)}
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <button
          onClick={onNewOrder}
          disabled={!branch.menuId}
          className="w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white shadow-lg active:bg-brandDark disabled:opacity-50"
        >
          + Nuevo pedido
        </button>
        {!branch.menuId && (
          <p className="mt-2 text-center text-xs text-muted">Esta sucursal no tiene menú asignado.</p>
        )}
      </div>
    </div>
  );
}
