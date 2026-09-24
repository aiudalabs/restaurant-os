import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, functions } from './firebase';
import { forgetDeviceBranch, initialDeviceBranch } from './device';
import { paths } from './paths';
import type { RosterWaiter, Session } from '../types';

// Waiters use this app; admins/managers may too (handy for testing and covering a shift).
const ALLOWED_ROLES = ['waiter', 'admin', 'manager'];

async function loadSession(uid: string): Promise<Session | string> {
  const snap = await getDoc(doc(db, paths.users, uid));
  if (!snap.exists()) return 'Tu cuenta no tiene perfil en el sistema.';
  const u = snap.data();
  if (!ALLOWED_ROLES.includes(u.role)) return 'Esta cuenta no es de mesero.';
  if (u.isActive === false) return 'Tu cuenta está desactivada.';
  const branchIds: string[] = Array.isArray(u.branchIds) ? u.branchIds : [];
  if (branchIds.length === 0) return 'Tu cuenta no tiene sucursal asignada.';
  return { uid, orgId: u.orgId ?? '', branchIds, displayName: u.displayName ?? '' };
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string;
}

export interface Roster {
  branchName: string;
  waiters: RosterWaiter[];
  /** The device's branch was deleted: it must be set up again. */
  missing: boolean;
}

export function useWaiterAuth() {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, error: '' });
  const [deviceBranch, setDeviceBranch] = useState(initialDeviceBranch);
  const [roster, setRoster] = useState<Roster | null>(null);

  // Names of this branch's waiters (only those with a PIN) for the login screen.
  useEffect(() => {
    if (!deviceBranch) return;
    httpsCallable<{ branchId: string }, { branchName: string; waiters: RosterWaiter[] }>(functions, 'waiterRoster')({
      branchId: deviceBranch,
    })
      .then((r) => setRoster({ ...r.data, missing: false }))
      .catch((e: { code?: string }) => {
        console.error('[waiter] roster failed', e);
        setRoster(e.code === 'functions/not-found' ? { branchName: '', waiters: [], missing: true } : null);
      });
  }, [deviceBranch]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState((s) => ({ ...s, session: null, loading: false }));
        return;
      }
      try {
        const result = await loadSession(user.uid);
        if (typeof result === 'string') {
          setState({ session: null, loading: false, error: result });
          await signOut(auth);
          return;
        }
        setState({ session: result, loading: false, error: '' });
      } catch {
        setState({ session: null, loading: false, error: 'No se pudo cargar tu perfil.' });
        await signOut(auth);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    setState((s) => ({ ...s, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setState((s) => ({ ...s, error: 'Email o contraseña incorrectos.' }));
    }
  };

  const loginWithPin = async (userId: string, pin: string) => {
    setState((s) => ({ ...s, error: '' }));
    try {
      const call = httpsCallable<{ branchId: string; userId: string; pin: string }, { token: string }>(functions, 'waiterLogin');
      const res = await call({ branchId: deviceBranch, userId, pin });
      await signInWithCustomToken(auth, res.data.token);
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^.*: /, '') : 'PIN incorrecto.';
      setState((s) => ({ ...s, error: msg }));
    }
  };

  const logout = () => signOut(auth);

  const resetDevice = () => {
    forgetDeviceBranch();
    setDeviceBranch('');
    setRoster(null);
  };

  return { ...state, deviceBranch, roster, login, loginWithPin, logout, resetDevice };
}
