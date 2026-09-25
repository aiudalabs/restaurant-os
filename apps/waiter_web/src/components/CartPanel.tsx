import { useRef, useState } from 'react';
import { money } from '../lib/format';
import type { CartLine } from '../types';

interface Props {
  customerName: string;
  lines: CartLine[];
  taxPercent: number;
  sending: boolean;
  sendError: string;
  onNameChange: (name: string) => void;
  onUpdateLine: (key: string, patch: Partial<CartLine>) => void;
  onSend: () => void;
  onDiscard: () => void;
  /** Phones: closes the sheet to keep adding products. */
  onClose?: () => void;
}

/** Cart review + send. Bottom sheet on phones, fixed side panel on large screens. */
export function CartPanel({
  customerName,
  lines,
  taxPercent,
  sending,
  sendError,
  onNameChange,
  onUpdateLine,
  onSend,
  onDiscard,
  onClose,
}: Props) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = subtotal * (1 + taxPercent);
  const name = customerName.trim();
  const nameInput = useRef<HTMLInputElement>(null);
  const [missingName, setMissingName] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // No name yet: point the waiter at the field instead of a dead button.
  const trySend = () => {
    if (!name) {
      setMissingName(true);
      nameInput.current?.focus();
      return;
    }
    onSend();
  };

  return (
    <>
      <div className="space-y-4 border-b border-line px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[22px] font-extrabold leading-7">Tu pedido</p>
          {onClose && (
            <button onClick={onClose} className="btn btn-outlined">
              Seguir agregando
            </button>
          )}
        </div>
        <label htmlFor="cart-customer" className="sr-only">
          Nombre del cliente
        </label>
        <input
          id="cart-customer"
          ref={nameInput}
          value={customerName}
          onChange={(e) => {
            onNameChange(e.target.value);
            if (e.target.value.trim()) setMissingName(false);
          }}
          placeholder="Nombre del cliente"
          autoCapitalize="words"
          enterKeyHint="done"
          className={`field font-semibold ${missingName ? 'border-brand ring-1 ring-brand' : ''}`}
        />
        {missingName && <p className="text-sm font-medium text-brand">Escribe el nombre del cliente para enviarlo.</p>}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {lines.length === 0 && <p className="py-10 text-center text-sm text-muted">Toca un producto para agregarlo.</p>}
        {lines.map((l) => (
          <div key={l.key} className="space-y-2">
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 font-semibold">{l.productName}</p>
              <button
                onClick={() => onUpdateLine(l.key, { quantity: l.quantity - 1 })}
                className="icon-btn border border-line active:bg-bg"
                aria-label={`Quitar ${l.productName}`}
              >
                −
              </button>
              <span className="w-5 text-center font-bold tabular-nums">{l.quantity}</span>
              <button
                onClick={() => onUpdateLine(l.key, { quantity: l.quantity + 1 })}
                className="icon-btn border border-line active:bg-bg"
                aria-label={`Agregar ${l.productName}`}
              >
                +
              </button>
            </div>
            <input
              value={l.note}
              onChange={(e) => onUpdateLine(l.key, { note: e.target.value })}
              placeholder="Nota para cocina (ej. sin cebolla)"
              className="field h-10 px-3 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-line px-6 pt-4">
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
        {sendError && <p className="text-center text-sm text-brand">{sendError}</p>}
        <button
          onClick={trySend}
          disabled={sending || lines.length === 0}
          className="btn btn-lg btn-filled mt-2 w-full"
        >
          {sending ? 'Enviando…' : 'Enviar a cocina'}
        </button>
        {(lines.length > 0 || name) && (
          <button
            onClick={() => (confirmDiscard ? onDiscard() : setConfirmDiscard(true))}
            onBlur={() => setConfirmDiscard(false)}
            disabled={sending}
            className={`btn btn-text w-full ${confirmDiscard ? 'font-bold text-brand' : ''}`}
          >
            {confirmDiscard ? 'Toca otra vez para descartar el pedido' : 'Descartar pedido'}
          </button>
        )}
      </div>
    </>
  );
}
