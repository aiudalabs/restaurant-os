import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, loadCheckoutConfig } from '../lib/api';
import { initPayment } from '../lib/payments';
import { money } from '../lib/format';
import { saveActiveOrder } from '../lib/session';
import { useCart } from '../store/cart';
import { useSession } from '../store/session';
import type { CheckoutConfig, InvoiceRequest, PayMethod } from '../types';

const METHOD_TEXT: Record<PayMethod, { label: string; hint: string }> = {
  yappy: { label: 'Yappy', hint: 'Pagas ahora por Yappy y lo preparamos al confirmar tu pago.' },
  card: { label: 'Tarjeta', hint: 'Pago seguro con PagueloFácil. Va a cocina al confirmarse el pago.' },
  pickup: { label: 'Al retirar', hint: 'Pagas en el mostrador cuando bajes por tu pedido.' },
};

const INPUT_CLS =
  'w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand';

interface InvoiceForm {
  taxId: string;
  dv: string;
  name: string;
  email: string;
}

const EMPTY_INVOICE: InvoiceForm = { taxId: '', dv: '', name: '', email: '' };

/** Returns the request to send, or an error message for the customer. */
function buildInvoiceRequest(form: InvoiceForm): { request?: InvoiceRequest; error?: string } {
  const taxId = form.taxId.trim();
  const dv = form.dv.trim();
  const name = form.name.trim();
  const email = form.email.trim();
  if (!taxId || !dv || !name) return { error: 'Para la factura con RUC necesitamos RUC, DV y nombre.' };
  if (!/^\d{1,2}$/.test(dv)) return { error: 'El DV debe tener 1 o 2 dígitos.' };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Revisa el correo para la factura.' };
  const request: InvoiceRequest = { receiverType: '01', taxId, dv, name };
  if (email) request.email = email;
  return { request };
}

export function CartScreen() {
  const navigate = useNavigate();
  const cart = useCart();
  const { session } = useSession();
  const [notes, setNotes] = useState('');
  const [config, setConfig] = useState<CheckoutConfig>({ taxPercent: 0, methods: ['pickup'], yappyHandle: '' });
  const [method, setMethod] = useState<PayMethod>('pickup');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceForm>(EMPTY_INVOICE);

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    loadCheckoutConfig(session.branchId)
      .then((c) => {
        setConfig(c);
        setMethod(c.methods[0]);
      })
      .catch((e) => console.error('[customer] checkout config failed', e));
  }, [session, navigate]);

  if (!session) return null;

  const { taxPercent } = config;
  const taxAmount = cart.subtotal * taxPercent;
  const total = cart.subtotal + taxAmount;

  const confirm = async () => {
    if (cart.itemCount === 0 || submitting) return;
    let invoiceRequest: InvoiceRequest | undefined;
    if (wantsInvoice) {
      const built = buildInvoiceRequest(invoice);
      if (built.error) {
        setError(built.error);
        return;
      }
      invoiceRequest = built.request;
    }
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
        payment: method,
        yappyHandle: config.yappyHandle,
        invoiceRequest,
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

      if (method === 'card') {
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
            {method === 'card' ? 'Te llevamos al pago seguro…' : 'Enviando tu pedido…'}
          </p>
          <p className="mt-2 text-sm text-hint">
            {method === 'card'
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
          <div className="flex-1 px-4 pb-80 pt-3">
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

            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={wantsInvoice}
                onChange={(e) => {
                  setWantsInvoice(e.target.checked);
                  setError('');
                }}
                className="h-5 w-5 accent-brand"
              />
              <span className="text-sm font-semibold">Necesito factura con RUC</span>
            </label>

            {wantsInvoice && (
              <div className="mt-2.5 flex flex-col gap-2.5">
                <div className="flex gap-2.5">
                  <input
                    value={invoice.taxId}
                    onChange={(e) => setInvoice({ ...invoice, taxId: e.target.value })}
                    placeholder="155704849-2-2021"
                    aria-label="RUC"
                    autoComplete="off"
                    className={`${INPUT_CLS} min-w-0 flex-1`}
                  />
                  <input
                    value={invoice.dv}
                    onChange={(e) => setInvoice({ ...invoice, dv: e.target.value.replace(/\D/g, '') })}
                    placeholder="32"
                    aria-label="DV"
                    inputMode="numeric"
                    maxLength={2}
                    autoComplete="off"
                    className={`${INPUT_CLS} w-20 shrink-0 text-center`}
                  />
                </div>
                <input
                  value={invoice.name}
                  onChange={(e) => setInvoice({ ...invoice, name: e.target.value })}
                  placeholder="Nombre o razón social"
                  aria-label="Nombre o razón social"
                  autoComplete="organization"
                  className={INPUT_CLS}
                />
                <input
                  type="email"
                  value={invoice.email}
                  onChange={(e) => setInvoice({ ...invoice, email: e.target.value })}
                  placeholder="Correo (opcional)"
                  aria-label="Correo (opcional)"
                  autoComplete="email"
                  className={INPUT_CLS}
                />
                <p className="px-1 text-xs text-hint">Te mostramos la factura aquí cuando se confirme el pago.</p>
              </div>
            )}
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

            {config.methods.length > 1 && (
              <div className="mt-3" role="radiogroup" aria-label="Cómo pagas">
                <p className="mb-1.5 text-xs font-medium text-hint">¿Cómo pagas?</p>
                <div className="flex gap-2">
                  {config.methods.map((m) => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={method === m}
                      onClick={() => setMethod(m)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${
                        method === m ? 'border-brand bg-brand/5 text-brand' : 'border-black/10 text-ink'
                      }`}
                    >
                      {METHOD_TEXT[m].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="mt-2 text-center text-sm text-brand">{error}</p>}

            <button
              onClick={confirm}
              disabled={submitting}
              className="mt-3 w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-lg shadow-brand/25 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting
                ? method === 'card'
                  ? 'Redirigiendo al pago…'
                  : 'Enviando…'
                : method === 'pickup'
                  ? 'Confirmar pedido'
                  : `Pagar ${money(total)}${method === 'yappy' ? ' con Yappy' : ''}`}
            </button>
            <p className="mt-2 text-center text-xs text-hint">
              {METHOD_TEXT[method].hint}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
