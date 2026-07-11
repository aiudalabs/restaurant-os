import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, loadTaxPercent } from '../lib/api';
import { paymentsEnabled } from '../lib/config';
import { initPayment } from '../lib/payments';
import { money } from '../lib/format';
import { saveActiveOrder } from '../lib/session';
import { useCart } from '../store/cart';
import { useSession } from '../store/session';

export function CartScreen() {
  const navigate = useNavigate();
  const cart = useCart();
  const { session } = useSession();
  const [notes, setNotes] = useState('');
  const [taxPercent, setTaxPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    loadTaxPercent(session.branchId)
      .then(setTaxPercent)
      .catch(() => setTaxPercent(0));
  }, [session, navigate]);

  if (!session) return null;

  const taxAmount = cart.subtotal * taxPercent;
  const total = cart.subtotal + taxAmount;

  const confirm = async () => {
    if (cart.itemCount === 0 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const { orderId, pickupCode, total } = await createOrder({
        branch: {
          id: session.branchId,
          orgId: session.orgId,
          name: session.branchName,
          menuId: '',
        },
        customerName: session.customerName,
        lines: cart.lines,
        notes,
        taxPercent,
        requirePayment: paymentsEnabled,
      });
      saveActiveOrder({
        orderId,
        pickupCode,
        customerName: session.customerName,
        orgId: session.orgId,
        branchId: session.branchId,
        branchName: session.branchName,
        createdAt: Date.now(),
      });
      cart.clear();

      if (paymentsEnabled) {
        // Redirect to PagueloFácil's hosted page. The BFF confirms the payment
        // and only then releases the order to the kitchen. If we can't reach the
        // gateway, land on tracking — the order is 'pending_payment' and the
        // customer can retry payment from there.
        try {
          const url = await initPayment(orderId, total, `Pedido ${pickupCode}`);
          window.location.href = url;
          return;
        } catch {
          navigate(`/order/${orderId}`, { replace: true });
          return;
        }
      }

      navigate(`/order/${orderId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos enviar tu pedido. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  // Full-screen loader during checkout so the (now-cleared) cart never flashes
  // its empty state while we create the order and fetch the payment link.
  if (submitting) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
        <div>
          <p className="font-display text-xl font-semibold">
            {paymentsEnabled ? 'Te llevamos al pago seguro…' : 'Enviando tu pedido…'}
          </p>
          <p className="mt-2 text-sm text-hint">
            {paymentsEnabled
              ? '🔒 Pago protegido por PagueloFácil. No cierres esta ventana.'
              : 'Un momento, por favor.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/5 bg-white/90 px-4 py-4 backdrop-blur safe-top">
        <button onClick={() => navigate(-1)} className="text-xl" aria-label="Volver">
          ←
        </button>
        <h1 className="font-display text-xl font-semibold">Mi pedido</h1>
      </header>

      {cart.itemCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">🛒</div>
          <p className="text-sm text-hint">Tu carrito está vacío.</p>
          <button
            onClick={() => navigate('/menu')}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ver el menú
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 px-4 pb-64 pt-3">
            <div className="flex flex-col gap-2.5">
              {cart.lines.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.productName}</p>
                    <p className="mt-0.5 text-sm text-hint">{money(line.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl bg-brand px-2 py-1.5 text-white">
                    <button
                      onClick={() => cart.setQuantity(line.productId, line.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center text-lg font-bold"
                      aria-label="Quitar uno"
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center text-sm font-bold">{line.quantity}</span>
                    <button
                      onClick={() => cart.setQuantity(line.productId, line.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center text-lg font-bold"
                      aria-label="Agregar uno"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas para la cocina (opcional)"
              rows={2}
              className="mt-4 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-black/5 bg-white px-4 pt-4 safe-bottom">
            <div className="flex justify-between text-sm text-hint">
              <span>Subtotal</span>
              <span>{money(cart.subtotal)}</span>
            </div>
            {taxPercent > 0 && (
              <div className="mt-1 flex justify-between text-sm text-hint">
                <span>Impuesto ({Math.round(taxPercent * 100)}%)</span>
                <span>{money(taxAmount)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            {error && <p className="mt-2 text-center text-sm text-brand">{error}</p>}

            <button
              onClick={confirm}
              disabled={submitting}
              className="mt-3 w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-lg shadow-brand/25 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting
                ? paymentsEnabled
                  ? 'Redirigiendo al pago…'
                  : 'Enviando…'
                : paymentsEnabled
                  ? `Pagar ${money(total)}`
                  : 'Confirmar pedido'}
            </button>
            <p className="mt-2 text-center text-xs text-hint">
              {paymentsEnabled
                ? 'Pago seguro con PagueloFácil. Tu pedido va a cocina solo cuando el pago se confirma.'
                : 'Pagas al retirar. Te daremos tu número de pedido.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
