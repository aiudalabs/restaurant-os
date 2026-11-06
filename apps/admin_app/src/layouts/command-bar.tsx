import { useMemo, useState, type KeyboardEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTodayOrders } from '@/hooks/use-orders';
import { money } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/order';
import { ALL_NAV, fold, squash } from './nav-items';

const STATUS_TEXT: Record<string, string> = {
  pending_payment: 'Esperando pago',
  payment_failed: 'Pago rechazado',
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  in_preparation: 'En cocina',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  closed: 'Cerrado',
};

interface Item {
  id: string;
  group: string;
  icon: string;
  label: string;
  hint?: string;
  run: () => void;
}

function orderMatches(o: Order, q: string): boolean {
  const flat = squash(q);
  return [o.pickupCode, o.customerName, o.tableNumber].some(
    (f) => f && (fold(f).includes(q) || (flat !== '' && squash(f).includes(flat))),
  );
}

/**
 * Ctrl/Cmd + K. One input for three jobs: find an order by its pickup code,
 * jump to any screen, or hand free text to the assistant.
 */
function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { selectedBranchId } = useBranchContext();
  // One fetch of today's orders each time the bar opens (pickup codes live for a day).
  const { orders, loading } = useTodayOrders(appUser?.orgId ?? '', selectedBranchId);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const text = query.trim();
  const folded = fold(text);

  const items = useMemo<Item[]>(() => {
    const go = (fn: () => void) => () => {
      onClose();
      fn();
    };
    const out: Item[] = [];

    if (folded.length >= 1) {
      orders
        .filter((o) => orderMatches(o, folded))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 3)
        .forEach((o) =>
          out.push({
            id: `order-${o.id}`,
            group: 'Pedidos de hoy',
            icon: 'receipt_long',
            label: `${o.pickupCode || o.tableNumber}${o.customerName && o.customerName !== o.pickupCode ? ` · ${o.customerName}` : ''}`,
            hint: `${STATUS_TEXT[o.status] ?? o.status} · ${money(o.total)}`,
            run: go(() => void navigate({ to: '/orders', search: { order: o.id } })),
          }),
        );
    }

    ALL_NAV.filter((n) => folded === '' || fold(`${n.label} ${n.keywords ?? ''}`).includes(folded))
      .slice(0, folded === '' ? ALL_NAV.length : 3)
      .forEach((n) =>
      out.push({
        id: `nav-${n.to}`,
        group: 'Ir a',
        icon: n.icon,
        label: n.label,
        run: go(() => void navigate({ to: n.to })),
      }),
    );

    if (text) {
      // A code or a name is worth searching in every order; a sentence is for the assistant.
      if (!/\s/.test(text) && text.length <= 10) {
        out.push({
          id: 'search-orders',
          group: 'Buscar',
          icon: 'search',
          label: `Buscar «${text}» en todos los pedidos`,
          run: go(() => void navigate({ to: '/orders', search: { q: text } })),
        });
      }
      out.push({
        id: 'ask',
        group: 'Asistente',
        icon: 'auto_awesome',
        label: `Preguntar o pedir al asistente: «${text}»`,
        hint: 'No se envía hasta que lo confirmes',
        run: go(() => void navigate({ to: '/assistant', search: { q: text } })),
      });
    }
    return out;
  }, [folded, text, orders, navigate, onClose]);

  const active = Math.min(cursor, Math.max(0, items.length - 1));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setCursor((active + dir + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[active]?.run();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
        <Icon name="search" size={22} className="text-[var(--ink-soft)]" />
        <label htmlFor="command-input" className="sr-only">
          Buscar un pedido, ir a una pantalla o preguntar al asistente
        </label>
        <input
          id="command-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-list"
          aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
          autoComplete="off"
          autoFocus
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKey}
          placeholder="Busca un pedido por código, salta a una pantalla o pregunta"
          className="t-body-large h-14 min-w-0 flex-1 bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
        />
        <kbd className="t-label-medium rounded-md border border-[var(--line-strong)] px-1.5 py-0.5 text-[var(--ink-soft)]">Esc</kbd>
      </div>

      <ul id="command-list" role="listbox" aria-label="Resultados" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {items.map((it, i) => (
          <li
            key={it.id}
            role="presentation"
            // The assistant row is pinned to the bottom of the list: free text can always fall through to it.
            className={it.group === 'Asistente' ? 'sticky bottom-0 -mx-2 -mb-2 border-t border-[var(--line)] bg-[var(--surface)] p-2' : undefined}
          >
            {it.group !== 'Asistente' && (i === 0 || items[i - 1].group !== it.group) && (
              <p className="t-label-medium px-3 pb-1 pt-3 text-[var(--ink-soft)]">{it.group}</p>
            )}
            <div
              id={`cmd-${it.id}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setCursor(i)}
              onClick={it.run}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-[var(--ink)]',
                i === active && 'bg-[var(--tint)]',
              )}
            >
              <Icon name={it.icon} size={20} className="text-[var(--ink-soft)]" />
              <span className="t-body-medium min-w-0 flex-1 truncate">{it.label}</span>
              {it.hint && <span className="t-body-small shrink-0 text-[var(--ink-soft)]">{it.hint}</span>}
            </div>
          </li>
        ))}
        {text && loading && (
          <li role="presentation" className="t-body-small px-3 py-2 text-[var(--ink-soft)]">
            Buscando entre los pedidos de hoy…
          </li>
        )}
      </ul>

      <p className="t-body-small border-t border-[var(--line)] px-4 py-2.5 text-[var(--ink-soft)]">
        Enter elige · Esc cierra. Lo que no coincide con nada puede ir al asistente.
      </p>
    </>
  );
}

export function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40 [animation:m3-fade-in_120ms_linear]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-3 z-[71] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-2xl [animation:m3-dialog-in_160ms_var(--ease-out)] sm:top-[12vh]"
        >
          <Dialog.Title className="sr-only">Barra de comandos</Dialog.Title>
          <Palette onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
