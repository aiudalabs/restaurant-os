import { useEffect, useState } from 'react';
import { useWaiterAuth } from './lib/auth';
import { BRANCH_NOT_FOUND, loadBranch } from './lib/api';
import { LoginScreen } from './screens/LoginScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { NewOrderScreen } from './screens/NewOrderScreen';
import { Spinner } from './components/Spinner';
import type { Branch, Session } from './types';

const BRANCH_KEY = 'waiter_branch';

function savedBranch(): string {
  try {
    return localStorage.getItem(BRANCH_KEY) ?? '';
  } catch {
    return '';
  }
}

export function App() {
  const { session, loading, error, login, logout } = useWaiterAuth();

  if (loading) return <Spinner full />;
  if (!session) return <LoginScreen error={error} onLogin={login} />;
  return <Workspace session={session} onLogout={logout} />;
}

function Workspace({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [branchId, setBranchId] = useState(() => {
    const saved = savedBranch();
    return session.branchIds.includes(saved) ? saved : session.branchIds[0];
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'orders' | 'new'>('orders');

  useEffect(() => {
    let missing = false;
    const load = (id: string) =>
      loadBranch(id).catch((e: Error) => {
        if (e.message === BRANCH_NOT_FOUND) missing = true;
        else console.error('[waiter] branch load failed', e);
        return null;
      });
    Promise.all(session.branchIds.map(load)).then((list) => {
      const ok = list.filter((b): b is Branch => b !== null);
      if (ok.length === 0) {
        setError(
          missing
            ? 'Tu cuenta está asignada a una sucursal que ya no existe. Pide al administrador que te vuelva a crear en «Usuarios».'
            : 'No se pudo cargar tu sucursal. Revisa tu conexión e intenta de nuevo.',
        );
      }
      setBranches(ok);
    });
  }, [session.branchIds]);

  const changeBranch = (id: string) => {
    setBranchId(id);
    try {
      localStorage.setItem(BRANCH_KEY, id);
    } catch {
      /* per-device convenience only */
    }
  };

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="max-w-sm font-medium text-brand">{error}</p>
        <button onClick={onLogout} className="rounded-xl border border-line px-5 py-3 font-semibold text-muted">
          Salir
        </button>
      </div>
    );
  }
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];
  if (!branch) return <Spinner full />;

  if (view === 'new') {
    return <NewOrderScreen branch={branch} onDone={() => setView('orders')} />;
  }
  return (
    <OrdersScreen
      session={session}
      branch={branch}
      branches={branches}
      onChangeBranch={changeBranch}
      onNewOrder={() => setView('new')}
      onLogout={onLogout}
    />
  );
}
