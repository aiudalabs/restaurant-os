import { updateItemStatus, nextStatus } from '../lib/kds';
import type { KdsTicket } from '../types';

function ageLabel(ms: number): { text: string; cls: string } {
  const secs = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const text = `${m}:${s.toString().padStart(2, '0')}`;
  if (m >= 10) return { text, cls: 'bg-red-500 text-white' };
  if (m >= 5) return { text, cls: 'bg-amber-500 text-black' };
  return { text, cls: 'bg-emerald-500 text-black' };
}

export function TicketCard({ ticket, stationId, now }: { ticket: KdsTicket; stationId: string; now: number }) {
  const age = ageLabel(now - ticket.receivedAt);
  const allInProgress = ticket.items.every((i) => i.status === 'in_progress');

  const bumpAll = async () => {
    for (const it of ticket.items) {
      if (it.status !== 'done') await updateItemStatus(stationId, it.rtdbKey, 'done');
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line bg-panel2 px-4 py-3">
        <div>
          <p className="text-xl font-extrabold leading-none">{ticket.tableNumber}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">{ticket.displayNumber}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${age.cls}`}>{age.text}</span>
      </div>

      <div className="flex-1 divide-y divide-line">
        {ticket.items.map((it) => (
          <button
            key={it.rtdbKey}
            onClick={() => updateItemStatus(stationId, it.rtdbKey, nextStatus(it.status))}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5 ${
              it.status === 'in_progress' ? 'bg-amber-500/10' : ''
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                it.status === 'in_progress' ? 'bg-amber-500 text-black' : 'bg-panel2 text-ink'
              }`}
            >
              {it.quantity}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold leading-tight">{it.productName}</span>
              {it.specialInstructions && (
                <span className="block truncate text-sm text-amber-400">{it.specialInstructions}</span>
              )}
            </span>
            {it.status === 'in_progress' && (
              <span className="text-xs font-bold uppercase tracking-wide text-amber-400">En marcha</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={bumpAll}
        className={`px-4 py-3 text-center text-sm font-bold ${
          allInProgress ? 'bg-emerald-600 text-white' : 'bg-panel2 text-muted'
        }`}
      >
        ✓ Marcar listo
      </button>
    </div>
  );
}
