import { useEffect, useMemo, useState } from 'react';
import { createOrder, loadMenu, type MenuData } from '../lib/api';
import { money } from '../lib/format';
import { Spinner } from '../components/Spinner';
import type { Branch, CartLine, Product } from '../types';

interface Props {
  branch: Branch;
  onDone: () => void;
}

export function NewOrderScreen({ branch, onDone }: Props) {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [menuError, setMenuError] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    loadMenu(branch.menuId)
      .then((m) => {
        setMenu(m);
        setCategoryId(m.categories[0]?.id ?? '');
      })
      .catch((e) => {
        console.error('[waiter] menu load failed', e);
        setMenuError('No se pudo cargar el menú.');
      });
  }, [branch.menuId]);

  const qtyByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity);
    return m;
  }, [lines]);

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = subtotal * (1 + branch.taxPercent);
  const visible = menu?.products.filter((p) => p.categoryId === categoryId) ?? [];

  const add = (p: Product) =>
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === p.id && l.note === '');
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l));
      const line: CartLine = {
        key: `${p.id}-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        categoryId: p.categoryId,
        unitPrice: p.price,
        quantity: 1,
        note: '',
      };
      return [...prev, line];
    });

  const removeOne = (productId: string) =>
    setLines((prev) => {
      const i = prev.map((l) => l.productId).lastIndexOf(productId);
      if (i < 0) return prev;
      const line = prev[i];
      if (line.quantity > 1) return prev.map((l, j) => (j === i ? { ...l, quantity: l.quantity - 1 } : l));
      return prev.filter((_, j) => j !== i);
    });

  const updateLine = (key: string, patch: Partial<CartLine>) =>
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        const next = { ...l, ...patch };
        return next.quantity > 0 ? [next] : [];
      }),
    );

  const send = async () => {
    if (!customerName.trim() || lines.length === 0) return;
    setSending(true);
    setSendError('');
    try {
      await createOrder(branch, customerName, lines);
      onDone();
    } catch (e) {
      console.error('[waiter] create order failed', e);
      setSendError('No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.');
      setSending(false);
    }
  };

  const leave = () => {
    if (lines.length > 0 && !window.confirm('¿Descartar este pedido?')) return;
    onDone();
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 space-y-3 border-b border-line bg-panel/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={leave} className="rounded-full border border-line px-3 py-2 text-sm font-medium text-muted">
            ← Volver
          </button>
          <p className="text-lg font-extrabold">Nuevo pedido</p>
        </div>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nombre del cliente"
          autoCapitalize="words"
          className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-base font-semibold outline-none focus:border-brand"
        />
        {menu && menu.categories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {menu.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  c.id === categoryId ? 'bg-ink text-white' : 'border border-line bg-panel text-muted'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 space-y-2 px-4 pb-32 pt-3">
        {menuError && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand">{menuError}</p>}
        {!menu && !menuError && <Spinner full />}
        {menu && menu.products.length === 0 && (
          <p className="py-12 text-center text-muted">El menú no tiene productos activos.</p>
        )}
        {visible.map((p) => {
          const qty = qtyByProduct.get(p.id) ?? 0;
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
              <button onClick={() => add(p)} className="min-w-0 flex-1 text-left">
                <p className="font-bold leading-tight">{p.name}</p>
                <p className="text-sm text-muted">{money(p.price)}</p>
              </button>
              {qty > 0 && (
                <>
                  <button
                    onClick={() => removeOne(p.id)}
                    className="h-10 w-10 rounded-full border border-line text-xl font-bold"
                    aria-label={`Quitar ${p.name}`}
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-extrabold tabular-nums">{qty}</span>
                </>
              )}
              <button
                onClick={() => add(p)}
                className="h-10 w-10 rounded-full bg-brand text-xl font-bold text-white active:bg-brandDark"
                aria-label={`Agregar ${p.name}`}
              >
                +
              </button>
            </div>
          );
        })}
      </main>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
          <button
            onClick={() => setReviewing(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 text-lg font-bold text-white shadow-lg active:bg-brandDark"
          >
            <span>Revisar ({itemCount})</span>
            <span className="tabular-nums">{money(total)}</span>
          </button>
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={() => setReviewing(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-panel pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-line px-5 py-4">
              <p className="text-lg font-extrabold">{customerName.trim() || 'Sin nombre'}</p>
              <p className="text-sm text-muted">Revisa el pedido antes de enviarlo a cocina</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((l) => (
                <div key={l.key} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="min-w-0 flex-1 font-semibold">{l.productName}</p>
                    <button
                      onClick={() => updateLine(l.key, { quantity: l.quantity - 1 })}
                      className="h-9 w-9 rounded-full border border-line text-lg font-bold"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold tabular-nums">{l.quantity}</span>
                    <button
                      onClick={() => updateLine(l.key, { quantity: l.quantity + 1 })}
                      className="h-9 w-9 rounded-full border border-line text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                  <input
                    value={l.note}
                    onChange={(e) => updateLine(l.key, { note: e.target.value })}
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
              {branch.taxPercent > 0 && (
                <div className="flex justify-between text-sm text-muted">
                  <span>Impuesto ({Math.round(branch.taxPercent * 100)}%)</span>
                  <span className="tabular-nums">{money(subtotal * branch.taxPercent)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
              {!customerName.trim() && (
                <p className="text-center text-sm font-medium text-brand">Escribe el nombre del cliente</p>
              )}
              {sendError && <p className="text-center text-sm text-brand">{sendError}</p>}
              <button
                onClick={send}
                disabled={sending || !customerName.trim() || lines.length === 0}
                className="w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white active:bg-brandDark disabled:opacity-50"
              >
                {sending ? 'Enviando…' : 'Enviar a cocina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
