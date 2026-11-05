import { BackButton, IconBadge } from '../components/Icon';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findOrderByPickupCode } from '../lib/api';
import { normalizePickupCode } from '../lib/pickup';
import { saveActiveOrder } from '../lib/session';
import { useSession } from '../store/session';

export function RecoverScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'notfound'>('idle');

  const search = async () => {
    const normalized = normalizePickupCode(code);
    if (!normalized) return;
    setStatus('searching');
    try {
      const order = await findOrderByPickupCode(normalized, session?.branchId);
      if (!order) {
        setStatus('notfound');
        return;
      }
      saveActiveOrder({
        orderId: order.id,
        pickupCode: order.pickupCode,
        customerName: order.customerName,
        orgId: session?.orgId ?? '',
        branchId: order.branchId,
        branchName: session?.branchName ?? '',
        createdAt: Date.now(),
      });
      navigate(`/order/${order.id}`, { replace: true });
    } catch {
      setStatus('notfound');
    }
  };

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 safe-top">
      <header className="flex items-center gap-3 py-4">
        <BackButton onClick={() => navigate('/')} />
        <h1 className="font-display text-[26px] font-semibold">Recuperar pedido</h1>
      </header>

      <div className="mt-6 flex flex-1 flex-col items-center text-center">
        <IconBadge name="ticket" />
        <p className="mt-4 max-w-xs text-sm text-hint">
          Escribe el número de pedido que te dimos (por ejemplo <b>P-K7QX</b>) para ver su
          estado.
        </p>

        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setStatus('idle');
          }}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="P-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          className="mt-7 w-full rounded-2xl border border-line bg-white px-4 py-4 text-center font-display text-2xl font-semibold uppercase tracking-widest outline-none focus:border-brand"
        />

        {status === 'notfound' && (
          <p className="mt-3 text-sm text-danger">
            No encontramos un pedido con ese número. Revísalo e intenta de nuevo.
          </p>
        )}
      </div>

      <button
        onClick={search}
        disabled={status === 'searching' || !code.trim()}
        className="h-[52px] w-full rounded-xl bg-brand text-base font-semibold text-white active:scale-[0.99] disabled:opacity-60"
      >
        {status === 'searching' ? 'Buscando…' : 'Buscar mi pedido'}
      </button>
    </div>
  );
}
