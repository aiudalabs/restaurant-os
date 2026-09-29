import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { saveHome } from '../lib/home';

export interface OrderingSession {
  orgId: string;
  branchId: string;
  branchName: string;
  customerName: string;
}

interface SessionContextValue {
  session: OrderingSession | null;
  start: (session: OrderingSession) => void;
  update: (patch: Partial<OrderingSession>) => void;
  clear: () => void;
}

const KEY = 'ros_customer_session';
const SessionContext = createContext<SessionContextValue | null>(null);

function load(): OrderingSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OrderingSession) : null;
  } catch {
    return null;
  }
}

function persist(session: OrderingSession | null): void {
  try {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OrderingSession | null>(load);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      start: (s) => {
        persist(s);
        saveHome(s); // remember the restaurant for next time (no QR needed)
        setSession(s);
      },
      update: (patch) =>
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...patch };
          persist(next);
          saveHome(next);
          return next;
        }),
      clear: () => {
        persist(null);
        setSession(null);
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
