import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadBranch } from '../lib/api';
import { loadActiveOrder } from '../lib/session';
import { useSession } from '../store/session';
import { Spinner } from '../components/Spinner';

export function EntryScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, start } = useSession();

  // QR carries org + branch. Fall back to an existing in-progress session.
  const orgId = params.get('org') ?? session?.orgId ?? '';
  const branchId = params.get('branch') ?? session?.branchId ?? '';

  const saved = useMemo(() => loadActiveOrder(), []);
  const [branchName, setBranchName] = useState(session?.branchName ?? '');
  const [name, setName] = useState(session?.customerName ?? '');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    branchId ? 'loading' : 'error',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!branchId) {
      setStatus('error');
      setError('Escanea el código QR del restaurante para empezar.');
      return;
    }
    let alive = true;
    loadBranch(branchId)
      .then((b) => {
        if (!alive) return;
        setBranchName(b.name);
        setStatus('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : 'No pudimos cargar el restaurante.');
      });
    return () => {
      alive = false;
    };
  }, [branchId]);

  const beginOrder = () => {
    start({ orgId, branchId, branchName, customerName: name.trim() });
    navigate('/menu');
  };

  if (status === 'loading') return <Spinner label="Cargando restaurante…" />;

  return (
    <div className="flex min-h-full flex-col justify-between px-6 pb-10 safe-top">
      <div />
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand text-4xl shadow-lg shadow-brand/20">
          🍽️
        </div>

        {status === 'error' ? (
          <>
            <h1 className="font-display text-2xl font-semibold">Bienvenido</h1>
            <p className="mt-3 max-w-xs text-sm text-hint">{error}</p>
            <button
              onClick={() => navigate('/recover')}
              className="mt-8 text-sm font-semibold text-brand underline underline-offset-4"
            >
              Ya tengo un número de pedido
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium uppercase tracking-wide text-hint">
              {branchName}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Haz tu pedido</h1>
            <p className="mt-3 max-w-xs text-sm text-hint">
              Escribe tu nombre (opcional). Te daremos un número único para retirar tu
              pedido.
            </p>

            {saved && (
              <button
                onClick={() => navigate(`/order/${saved.orderId}`)}
                className="mt-6 w-full rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 text-left"
              >
                <span className="text-xs font-medium text-hint">Tienes un pedido activo</span>
                <span className="mt-0.5 block font-display text-lg font-semibold text-brand">
                  {saved.pickupCode} · Ver estado →
                </span>
              </button>
            )}

            <div className="mt-8 w-full">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                autoComplete="given-name"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-center text-base outline-none focus:border-brand"
              />
            </div>
          </>
        )}
      </div>

      <div className="w-full">
        {status === 'ready' && (
          <button
            onClick={beginOrder}
            className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-lg shadow-brand/25 active:scale-[0.99]"
          >
            Ver el menú
          </button>
        )}
        <button
          onClick={() => navigate('/recover')}
          className="mt-3 w-full py-2 text-sm font-medium text-hint"
        >
          Recuperar un pedido con mi número
        </button>
      </div>
    </div>
  );
}
