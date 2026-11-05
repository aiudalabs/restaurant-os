import { useState } from 'react';
import { useVoucher } from '../lib/api';

/** Counter lookup for Club vouchers: type the 6-character code, hand over the product, mark it used. */
export function VoucherSheet({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (commit: boolean) => {
    setBusy(true);
    setError('');
    try {
      const r = await useVoucher(code.trim().toUpperCase(), commit);
      setFound(r.rewardName);
      setDone(r.used);
    } catch (e) {
      setFound(null);
      setError(e instanceof Error ? e.message : 'No se pudo consultar el cupón.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-panel p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-lg font-extrabold">Cupón del Club</p>
        <p className="mt-1 text-center text-sm text-muted">Pídele al cliente el código de 6 caracteres.</p>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setFound(null);
            setDone(false);
            setError('');
          }}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="XXXXXX"
          className="mt-4 w-full rounded-2xl border border-line px-4 py-3.5 text-center text-2xl font-extrabold uppercase tracking-widest outline-none focus:border-brand"
        />
        {error && <p className="mt-3 text-center text-sm font-medium text-brand">{error}</p>}
        {found && (
          <p className="mt-3 rounded-2xl bg-bg px-4 py-3 text-center font-semibold">
            {done ? 'Entregado y marcado como usado: ' : 'Entregar: '}
            {found}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-outlined flex-1">
            Cerrar
          </button>
          {found && !done ? (
            <button onClick={() => void run(true)} disabled={busy} className="btn btn-filled flex-1">
              {busy ? 'Marcando…' : 'Marcar usado'}
            </button>
          ) : (
            <button onClick={() => void run(false)} disabled={busy || code.trim().length !== 6} className="btn btn-filled flex-1">
              {busy ? 'Buscando…' : 'Buscar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
