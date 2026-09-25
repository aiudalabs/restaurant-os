import { useEffect, useMemo, useState } from 'react';
import { createOrder, loadMenu, type MenuData } from '../lib/api';
import { money } from '../lib/format';
import { Spinner } from '../components/Spinner';
import { CartPanel } from '../components/CartPanel';
import { clearDraft, loadDraft, saveDraft } from '../lib/draft';
import { closeLayers, openLayer, topLayer } from '../lib/nav';
import type { Branch, CartLine, Product } from '../types';

interface Props {
  branch: Branch;
}

export function NewOrderScreen({ branch }: Props) {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [menuError, setMenuError] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // Resume the unsent order of this branch, if any.
  const [draft] = useState(() => loadDraft(branch.id));
  const [customerName, setCustomerName] = useState(draft?.customerName ?? '');
  const [lines, setLines] = useState<CartLine[]>(draft?.lines ?? []);
  // The review sheet is a history entry, so the phone's back button closes it.
  const [reviewing, setReviewing] = useState(() => topLayer() === 'review');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => saveDraft(branch.id, { customerName, lines }), [branch.id, customerName, lines]);

  useEffect(() => {
    const onPop = () => setReviewing(topLayer() === 'review');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
      clearDraft(branch.id);
      closeLayers();
    } catch (e) {
      console.error('[waiter] create order failed', e);
      setSendError('No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.');
      setSending(false);
    }
  };

  // Leaving keeps the draft: the orders screen offers to continue it.
  const leave = () => closeLayers();

  const discard = () => {
    setLines([]);
    setCustomerName('');
    clearDraft(branch.id);
    closeLayers();
  };

  const openReview = () => {
    openLayer('review');
    setReviewing(true);
  };
  const closeReview = () => window.history.back();

  const cartProps = {
    customerName,
    lines,
    taxPercent: branch.taxPercent,
    sending,
    sendError,
    onNameChange: setCustomerName,
    onUpdateLine: updateLine,
    onSend: send,
    onDiscard: discard,
  };

  return (
    <div className="flex min-h-full lg:h-full">
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <header className="sticky top-0 z-10 space-y-3 border-b border-line bg-panel/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={leave} className="rounded-full border border-line px-3 py-2 text-sm font-medium text-muted">
              ← Pedidos
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

        <main className="grid flex-1 content-start gap-2 px-4 pb-32 pt-3 md:grid-cols-2 lg:pb-6 xl:grid-cols-3">
          {menuError && <p className="col-span-full rounded-xl bg-red-50 p-3 text-sm text-brand">{menuError}</p>}
          {!menu && !menuError && (
            <div className="col-span-full">
              <Spinner full />
            </div>
          )}
          {menu && menu.products.length === 0 && (
            <p className="col-span-full py-12 text-center text-muted">El menú no tiene productos activos.</p>
          )}
          {visible.map((p) => {
            const qty = qtyByProduct.get(p.id) ?? 0;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                <button onClick={() => add(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {branch.showProductImages && p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl bg-line object-cover"
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block font-bold leading-tight">{p.name}</span>
                    {p.waiterNote && <span className="mt-0.5 block text-xs leading-snug text-muted">{p.waiterNote}</span>}
                    <span className="block text-sm text-muted">{money(p.price)}</span>
                  </span>
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
          <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 lg:hidden">
            <button
              onClick={openReview}
              className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 text-lg font-bold text-white shadow-lg active:bg-brandDark"
            >
              <span>Revisar ({itemCount})</span>
              <span className="tabular-nums">{money(total)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Large screens: the cart is always visible next to the menu. */}
      <aside className="hidden w-96 shrink-0 flex-col border-l border-line bg-panel pb-4 lg:flex">
        <CartPanel {...cartProps} />
      </aside>

      {reviewing && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 lg:hidden"
          onClick={closeReview}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-panel pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <CartPanel {...cartProps} onClose={closeReview} />
          </div>
        </div>
      )}
    </div>
  );
}
