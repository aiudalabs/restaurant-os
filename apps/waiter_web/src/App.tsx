import { useEffect, useState } from 'react';
import { useWaiterAuth } from './lib/auth';
import { loadBranch } from './lib/api';
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
    Promise.all(session.branchIds.map((id) => loadBranch(id).catch(() => null)))
      .then((list) => {
        const ok = list.filter((b): b is Branch => b !== null);
        if (ok.length === 0) setError('No se pudo cargar tu sucursal.');
        setBranches(ok);
      })
      .catch(() => setError('No se pudo cargar tu sucursal.'));
  }, [session.branchIds]);

  const changeBranch = (id: string) => {
    setBranchId(id);
    try {
      localStorage.setItem(BRANCH_KEY, id);
    } catch {
      /* per-device convenience only */
    }
  };

  if (error) return <p className="p-6 text-center text-brand">{error}</p>;
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
