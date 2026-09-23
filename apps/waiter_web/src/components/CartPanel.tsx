import { money } from '../lib/format';
import type { CartLine } from '../types';

interface Props {
  customerName: string;
  lines: CartLine[];
  taxPercent: number;
  sending: boolean;
  sendError: string;
  onUpdateLine: (key: string, patch: Partial<CartLine>) => void;
  onSend: () => void;
}

/** Cart review + send. Bottom sheet on phones, fixed side panel on large screens. */
export function CartPanel({ customerName, lines, taxPercent, sending, sendError, onUpdateLine, onSend }: Props) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = subtotal * (1 + taxPercent);
  const name = customerName.trim();

  return (
    <>
      <div className="border-b border-line px-5 py-4">
        <p className="truncate text-lg font-extrabold">{name || 'Sin nombre'}</p>
        <p className="text-sm text-muted">Revisa el pedido antes de enviarlo a cocina</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {lines.length === 0 && <p className="py-10 text-center text-sm text-muted">Toca un producto para agregarlo.</p>}
        {lines.map((l) => (
          <div key={l.key} className="space-y-2">
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 font-semibold">{l.productName}</p>
              <button
                onClick={() => onUpdateLine(l.key, { quantity: l.quantity - 1 })}
                className="h-10 w-10 rounded-full border border-line text-lg font-bold"
                aria-label={`Quitar ${l.productName}`}
              >
                −
              </button>
              <span className="w-5 text-center font-bold tabular-nums">{l.quantity}</span>
              <button
                onClick={() => onUpdateLine(l.key, { quantity: l.quantity + 1 })}
                className="h-10 w-10 rounded-full border border-line text-lg font-bold"
                aria-label={`Agregar ${l.productName}`}
              >
                +
              </button>
            </div>
            <input
              value={l.note}
              onChange={(e) => onUpdateLine(l.key, { note: e.target.value })}
              placeholder="Nota para cocina (ej. sin cebolla)"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-line px-5 pt-4">
        <div className="flex justify-between text-sm text-muted">
          <span>Subtotal</span>
          <span className="tabular-nums">{money(subtotal)}</span>
        </div>
        {taxPercent > 0 && (
          <div className="flex justify-between text-sm text-muted">
            <span>Impuesto ({Math.round(taxPercent * 100)}%)</span>
            <span className="tabular-nums">{money(subtotal * taxPercent)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-extrabold">
          <span>Total</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
        {!name && lines.length > 0 && (
          <p className="text-center text-sm font-medium text-brand">Escribe el nombre del cliente</p>
        )}
        {sendError && <p className="text-center text-sm text-brand">{sendError}</p>}
        <button
          onClick={onSend}
          disabled={sending || !name || lines.length === 0}
          className="w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white active:bg-brandDark disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Enviar a cocina'}
        </button>
      </div>
    </>
  );
}
