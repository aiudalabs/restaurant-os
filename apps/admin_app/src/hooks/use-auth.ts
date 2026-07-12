import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import type { AppUser } from '@/types/user';
import { subscribeToAuth, signIn, signOut, fetchAppUser } from '@/services/auth.service';
import { auth, functions } from '@/lib/firebase';

interface AuthState {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
}

interface RegisterInput {
  orgName: string;
  ownerName: string;
  email: string;
  password: string;
  plan?: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthProvider(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    appUser: null,
    loading: true,
    error: null,
  });
  // While onboarding a brand-new owner, the user is signed in for a moment
  // before their users/{uid} doc exists — don't auto-sign-them-out during that.
  const registering = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      if (user) {
        const appUser = await fetchAppUser(user.uid);
        if (appUser && (appUser.role === 'admin' || appUser.role === 'manager')) {
          setState({ firebaseUser: user, appUser, loading: false, error: null });
        } else if (registering.current) {
          setState({ firebaseUser: user, appUser: null, loading: true, error: null });
        } else {
          setState({
            firebaseUser: null,
            appUser: null,
            loading: false,
            error: 'No tienes permisos de administrador.',
          });
          await signOut();
        }
      } else {
        setState({ firebaseUser: null, appUser: null, loading: false, error: null });
      }
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signIn(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  const register = useCallback(async ({ orgName, ownerName, email, password, plan }: RegisterInput) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    registering.current = true;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const call = httpsCallable(functions, 'createOrganization');
      await call({ orgName, ownerName, plan });
      // Reload so auth picks up the newly-created owner doc → dashboard.
      window.location.reload();
    } catch (err) {
      registering.current = false;
      const message = err instanceof Error ? err.message : 'No se pudo crear la organización';
      try {
        await signOut();
      } catch {
        /* ignore */
      }
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    // Router beforeLoad only re-runs on navigation, so force a redirect to the
    // login screen (a full load also clears any in-memory state).
    window.location.href = '/login';
  }, []);

  return { ...state, login, register, logout };
}
