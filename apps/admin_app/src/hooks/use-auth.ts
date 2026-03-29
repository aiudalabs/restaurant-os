import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '@/types/user';
import { subscribeToAuth, signIn, signOut, fetchAppUser } from '@/services/auth.service';

interface AuthState {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      if (user) {
        const appUser = await fetchAppUser(user.uid);
        if (appUser && (appUser.role === 'admin' || appUser.role === 'manager')) {
          setState({ firebaseUser: user, appUser, loading: false, error: null });
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

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  return { ...state, login, logout };
}
