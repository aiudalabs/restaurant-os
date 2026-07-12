import { useEffect, useRef, useState } from 'react';
import { watchTickets } from '../lib/kds';
import { TicketCard } from './TicketCard';
import type { KdsTicket, Session } from '../types';

export function BoardScreen({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [now, setNow] = useState(Date.now());
  const [fs, setFs] = useState(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  // Live tickets for this station.
  useEffect(() => watchTickets(session.stationId, setTickets), [session.stationId]);

  // Tick every second for the age timers.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keep the screen awake (best-effort; ignored where unsupported).
  useEffect(() => {
    const request = async () => {
      try {
        wakeLock.current = await navigator.wakeLock?.request('screen');
      } catch {
        /* ignore */
      }
    };
    request();
    const onVis = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      wakeLock.current?.release().catch(() => {});
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFs(true);
      } else {
        await document.exitFullscreen();
        setFs(false);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg">🔥</span>
        <div className="leading-tight">
          <h1 className="text-lg font-extrabold">{session.stationName}</h1>
          <p className="text-xs text-muted">
            {tickets.length} {tickets.length === 1 ? 'pedido activo' : 'pedidos activos'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-muted active:scale-95"
          >
            {fs ? '⤢ Salir' : '⛶ Pantalla completa'}
          </button>
          <button
            onClick={onLogout}
            className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-muted active:scale-95"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {tickets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted">
            <div className="text-5xl">🍽️</div>
            <p className="text-lg font-semibold">Sin pedidos por ahora</p>
            <p className="text-sm">Los nuevos pedidos aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tickets.map((t) => (
              <TicketCard key={t.orderId} ticket={t} stationId={session.stationId} now={now} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
