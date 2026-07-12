import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Session } from '../types';

async function loadSession(uid: string): Promise<Session | null> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;
  const u = userSnap.data();
  const stationId: string = u.stationId ?? '';
  let stationName = 'Estación';
  if (stationId) {
    try {
      const st = await getDoc(doc(db, 'stations', stationId));
      if (st.exists()) stationName = st.data().name ?? 'Estación';
    } catch {
      /* keep default */
    }
  }
  return {
    uid,
    orgId: u.orgId ?? '',
    stationId,
    stationName,
    displayName: u.displayName ?? '',
  };
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string;
}

export function useKdsAuth() {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, error: '' });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ session: null, loading: false, error: '' });
        return;
      }
      const session = await loadSession(user.uid);
      if (!session) {
        setState({ session: null, loading: false, error: 'Tu cuenta no está registrada.' });
        await signOut(auth);
        return;
      }
      if (!session.stationId) {
        setState({ session: null, loading: false, error: 'Tu cuenta no tiene una estación asignada.' });
        await signOut(auth);
        return;
      }
      setState({ session, loading: false, error: '' });
    });
  }, []);

  const login = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Email o contraseña incorrectos.' }));
    }
  };

  const logout = () => signOut(auth);

  return { ...state, login, logout };
}
