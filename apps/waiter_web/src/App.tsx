import { useEffect, useState } from 'react';
import { useWaiterAuth } from './lib/auth';
import { BRANCH_NOT_FOUND, loadBranch } from './lib/api';
import { LoginScreen } from './screens/LoginScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { NewOrderScreen } from './screens/NewOrderScreen';
import { Spinner } from './components/Spinner';
import { loadDraft } from './lib/draft';
import { openLayer, topLayer } from './lib/nav';
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
  const { session, loading, error, deviceBranch, roster, login, loginWithPin, logout, resetDevice } = useWaiterAuth();

  if (loading) return <Spinner full />;
  if (!session) {
    return (
      <LoginScreen
        error={error}
        deviceBranch={deviceBranch}
        roster={roster}
        onLogin={login}
        onPin={loginWithPin}
        onResetDevice={resetDevice}
      />
    );
  }
  return <Workspace session={session} onLogout={logout} />;
}

function Workspace({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [branchId, setBranchId] = useState(() => {
    const saved = savedBranch();
    return session.branchIds.includes(saved) ? saved : session.branchIds[0];
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState('');
  // The new-order screen is a history entry (see lib/nav): back returns here.
  const [view, setView] = useState<'orders' | 'new'>(() => (topLayer() ? 'new' : 'orders'));
  useEffect(() => {
    const onPop = () => setView(topLayer() ? 'new' : 'orders');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
    return <NewOrderScreen branch={branch} />;
  }
  return (
    <OrdersScreen
      session={session}
      branch={branch}
      branches={branches}
      onChangeBranch={changeBranch}
      draft={loadDraft(branch.id)}
      onNewOrder={() => {
        openLayer('new');
        setView('new');
      }}
      onLogout={onLogout}
    />
  );
}
