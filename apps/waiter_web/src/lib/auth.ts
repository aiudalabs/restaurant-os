import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { paths } from './paths';
import type { Session } from '../types';

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

export function useWaiterAuth() {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, error: '' });

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

  const logout = () => signOut(auth);

  return { ...state, login, logout };
}
