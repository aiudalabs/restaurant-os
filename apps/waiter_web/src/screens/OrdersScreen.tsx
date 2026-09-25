import { useEffect, useState } from 'react';
import { watchActiveOrders } from '../lib/api';
import { OrderCard } from '../components/OrderCard';
import { Spinner } from '../components/Spinner';
import type { Branch, Order, Session } from '../types';
import type { OrderDraft } from '../lib/draft';

interface Props {
  session: Session;
  branch: Branch;
  branches: Branch[];
  onChangeBranch: (id: string) => void;
  /** Unsent order kept on this device, if any. */
  draft: OrderDraft | null;
  onNewOrder: () => void;
  onLogout: () => void;
}

export function OrdersScreen({ session, branch, branches, onChangeBranch, draft, onNewOrder, onLogout }: Props) {
  const draftItems = draft?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;
  const draftName = draft?.customerName.trim();
  const newOrderLabel = draft
    ? `Continuar pedido${draftName ? ` de ${draftName}` : ''}${draftItems ? ` (${draftItems})` : ''}`
    : '+ Nuevo pedido';
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
      <header className="top-bar">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[22px] font-extrabold leading-7">Pedidos activos</p>
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onNewOrder}
              disabled={!branch.menuId}
              className="btn btn-filled hidden md:inline-flex"
            >
              {newOrderLabel}
            </button>
            <button onClick={onLogout} className="btn btn-outlined">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-6">
        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-brand">{error}</p>}
        {!orders && !error && <Spinner full />}
        {orders?.length === 0 && (
          <div className="py-16 text-center text-muted">
            <p className="text-4xl">🍽️</p>
            <p className="mt-2 font-medium">No hay pedidos abiertos</p>
            <p className="text-sm">Toca “Nuevo pedido” para empezar</p>
          </div>
        )}
        {/* Oldest first: phone = vertical list; larger/touch screens = grid, left→right. */}
        <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {orders?.map((o) => <OrderCard key={o.id} order={o} orgId={session.orgId} now={now} />)}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 md:hidden bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <button
          onClick={onNewOrder}
          disabled={!branch.menuId}
          className="fab-extended"
        >
          {newOrderLabel}
        </button>
        {!branch.menuId && (
          <p className="mt-2 text-center text-xs text-muted">Esta sucursal no tiene menú asignado.</p>
        )}
      </div>
    </div>
  );
}
