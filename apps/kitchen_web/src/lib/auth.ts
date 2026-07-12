import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import type { Session } from '../types';

const STATION_KEY = 'kds_station';

export function getSavedStation(): string {
  try {
    return localStorage.getItem(STATION_KEY) ?? '';
  } catch {
    return '';
  }
}
function saveStation(id: string) {
  try {
    localStorage.setItem(STATION_KEY, id);
  } catch {
    /* ignore */
  }
}

// A station id passed in the URL (?station=…) sets up this device once.
function stationFromUrl(): string {
  const id = new URLSearchParams(window.location.search).get('station');
  if (id) {
    saveStation(id);
    // Clean it out of the address bar.
    window.history.replaceState({}, '', window.location.pathname);
  }
  return id ?? '';
}

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
  return { uid, orgId: u.orgId ?? '', stationId, stationName, displayName: u.displayName ?? '' };
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string;
  stationId: string;
}

export function useKdsAuth() {
  const [state, setState] = useState<AuthState>(() => ({
    session: null,
    loading: true,
    error: '',
    stationId: stationFromUrl() || getSavedStation(),
  }));

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState((s) => ({ ...s, session: null, loading: false }));
        return;
      }
      const session = await loadSession(user.uid);
      if (!session?.stationId) {
        setState((s) => ({ ...s, session: null, loading: false, error: 'Cuenta sin estación asignada.' }));
        await signOut(auth);
        return;
      }
      if (session.stationId) saveStation(session.stationId);
      setState((s) => ({ ...s, session, loading: false, error: '', stationId: session.stationId }));
    });
  }, []);

  const loginWithPin = async (pin: string) => {
    setState((s) => ({ ...s, error: '' }));
    try {
      const call = httpsCallable<{ stationId: string; pin: string }, { token: string }>(functions, 'kdsLogin');
      const res = await call({ stationId: state.stationId, pin });
      await signInWithCustomToken(auth, res.data.token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'PIN incorrecto.';
      setState((s) => ({ ...s, error: msg.replace(/^.*: /, '') }));
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setState((s) => ({ ...s, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setState((s) => ({ ...s, error: 'Email o contraseña incorrectos.' }));
    }
  };

  const logout = () => signOut(auth);
  const clearStation = () => {
    saveStation('');
    setState((s) => ({ ...s, stationId: '' }));
  };

  return { ...state, loginWithPin, loginWithEmail, logout, clearStation };
}
