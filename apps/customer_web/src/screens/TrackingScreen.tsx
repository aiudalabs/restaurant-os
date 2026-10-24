import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { watchOrder } from '../lib/api';
import { initPayment } from '../lib/payments';
import { money } from '../lib/format';
import { clearActiveOrder } from '../lib/session';
import { useSession } from '../store/session';
import { Spinner } from '../components/Spinner';
import { InstallCard } from '../components/InstallCard';
import { Icon, IconBadge } from '../components/Icon';
import { STAMP_GOAL, watchEarn, type EarnEvent } from '../lib/club';
import { loadActiveOrder } from '../lib/session';
import { loadHome } from '../lib/home';
import type { FiscalInfo, OrderDoc, OrderItemDoc, OrderStatus } from '../types';

const STEPS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: 'received', label: 'Recibido', statuses: ['pending', 'confirmed'] },
  { key: 'preparing', label: 'En cocina', statuses: ['in_preparation'] },
  { key: 'ready', label: 'Listo', statuses: ['ready'] },
  { key: 'done', label: 'Entregado', statuses: ['delivered', 'closed'] },
];

function stepIndex(status: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

export function TrackingScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { session, clear: clearSession } = useSession();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [items, setItems] = useState<OrderItemDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [earn, setEarn] = useState<EarnEvent | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = watchOrder(orderId, (o, its) => {
      setOrder(o);
      setItems(its);
      setLoaded(true);
      if (o && (o.status === 'delivered' || o.status === 'closed' || o.status === 'cancelled')) {
        clearActiveOrder();
      }
    });
    return unsub;
  }, [orderId]);

  // Club points show up a moment after the payment is confirmed.
  useEffect(() => (orderId ? watchEarn(orderId, setEarn) : undefined), [orderId]);

  if (!loaded) return <Spinner label="Buscando tu pedido…" />;

  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <IconBadge name="search" />
        <p className="text-sm text-hint">No encontramos este pedido.</p>
        <button
          onClick={() => navigate('/recover')}
          className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white"
        >
          Buscar con mi número
        </button>
      </div>
    );
  }

  const active = stepIndex(order.status);
  const cancelled = order.status === 'cancelled';
  const isReady = order.status === 'ready';
  const awaitingPayment = order.status === 'pending_payment';
  const paymentFailed = order.status === 'payment_failed';
  const paymentPending = awaitingPayment || paymentFailed;
  // Manual Yappy: staff confirm the transfer in their own Yappy app.
  const yappy = order.paymentMethod === 'yappy';

  const startNewOrder = () => {
    clearActiveOrder();
    clearSession();
    navigate('/', { replace: true });
  };

  const payNow = async () => {
    setPaying(true);
    try {
      const url = await initPayment(order.id, order.total, `Pedido ${order.pickupCode}`);
      window.location.href = url;
    } catch {
      setPaying(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-10 safe-top">
      <header className="pt-5 text-center">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-hint">Tu número</p>
      </header>

      {/* The number the customer must keep to pick up the order */}
      <div className="mt-1.5 flex flex-col items-center gap-1.5 text-center">
        <div
          className="font-display font-semibold leading-none text-brand"
          style={{ fontSize: `min(96px, calc((100vw - 40px) / ${Math.max(order.pickupCode.length, 3) * 0.62}))` }}
        >
          {order.pickupCode}
        </div>
        <span
          className={`mt-1 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold ${
            paymentPending || cancelled ? 'bg-ink text-white' : 'bg-brand text-white'
          }`}
        >
          {isReady && <Icon name="bell" size={18} />}
          {cancelled ? 'Cancelado' : paymentPending ? 'Esperando pago' : isReady ? 'Listo para retirar' : STEPS[active].label}
        </span>
        <p className="mt-1 max-w-xs text-sm text-hint">
          {paymentPending
            ? yappy
              ? 'Reservado — lo preparamos al confirmar tu Yappy'
              : 'Reservado — se envía a cocina al pagar'
            : order.customerName && order.customerName !== 'Cliente'
              ? `A nombre de ${order.customerName}`
              : 'Guarda este número para retirar'}
        </p>
      </div>

      {awaitingPayment && yappy && <YappySteps order={order} />}

      {/* Payment gate — order is held until paid */}
      {paymentPending && !yappy && (
        <div className="mt-4 rounded-2xl border border-line bg-white p-4 border border-line">
          <p className="text-center text-sm font-semibold text-ink">
            {paymentFailed ? 'Tu pago fue rechazado' : 'Falta completar el pago'}
          </p>
          <p className="mt-1 text-center text-xs text-hint">
            Nadie prepara tu pedido hasta confirmar el pago. Total {money(order.total)}.
          </p>
          <button
            onClick={payNow}
            disabled={paying}
            className="mt-3 w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
          >
            {paying ? 'Redirigiendo…' : paymentFailed ? 'Reintentar pago' : `Pagar ${money(order.total)}`}
          </button>
        </div>
      )}

      <InstallFor orderBranchId={order.branchId} sessionBranch={session} />

      {isReady && (
        <div className="mt-4 rounded-2xl bg-gold-tint px-4 py-3 text-center text-sm font-semibold text-gold-ink">
          Tu pedido está listo. Pasa a retirarlo en el mostrador.
        </div>
      )}
      {cancelled && (
        <div className="mt-4 rounded-2xl bg-[#FBE9E7] px-4 py-3 text-center text-sm font-semibold text-danger">
          {yappy
            ? 'Pedido cancelado: no nos llegó tu Yappy. Si pagaste, muéstrale el comprobante al personal.'
            : 'Este pedido fue cancelado. Consulta con el personal.'}
        </div>
      )}

      {/* Status stepper: four bars, gold on the current step */}
      {!cancelled && !paymentPending && (
        <ol className="mt-6 grid grid-cols-4 gap-1.5">
          {STEPS.map((step, i) => {
            const state = i < active ? 'done' : i === active ? 'current' : 'todo';
            return (
              <li
                key={step.key}
                className={`flex flex-col items-center gap-1.5 text-center text-[11px] ${
                  state === 'todo' ? 'font-medium text-hint' : state === 'current' ? 'font-bold text-brand' : 'font-semibold text-brand'
                }`}
              >
                <span
                  className={`h-1 w-full rounded-full ${
                    state === 'todo' ? 'bg-[#EFEAE0]' : state === 'current' ? 'bg-gold' : 'bg-brand'
                  }`}
                />
                {step.label}
              </li>
            );
          })}
        </ol>
      )}

      {earn && (
        <div className="mt-5 flex items-center gap-3.5 rounded-[18px] bg-gold-tint p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gold text-ink">
            <Icon name="star" size={24} />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-base font-bold">+{earn.points + (earn.bonusPoints ?? 0)} puntos ganados</p>
            <p className="text-[13px] text-gold-ink">
              {earn.stampCompleted
                ? '¡Completaste la tarjeta! Tu Bowl gratis te espera en Canjear'
                : `Sello ${earn.stampsAfter} de ${STAMP_GOAL} · ${
                    STAMP_GOAL - earn.stampsAfter === 1 ? 'un pedido más y el Bowl es gratis' : `${STAMP_GOAL - earn.stampsAfter} pedidos más para un Bowl gratis`
                  }`}
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="mt-6 rounded-2xl bg-white p-4 border border-line">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-hint">Tu pedido</p>
        {items.length === 0 ? (
          <p className="text-sm text-hint">Cargando artículos…</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold">{it.quantity}×</span> {it.productName}
                </span>
                <ItemBadge status={it.status} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </div>
      </div>

      {order.fiscal && order.fiscal.status !== 'skipped' && <InvoiceCard fiscal={order.fiscal} />}

      <button
        onClick={() => navigate('/club')}
        className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-white"
      >
        <Icon name="star" size={18} />
        Ir a Mi Club
      </button>
      <button
        onClick={startNewOrder}
        className="mt-2.5 h-[52px] w-full rounded-xl border-[1.5px] border-brand bg-white text-base font-semibold text-brand"
      >
        Hacer otro pedido
      </button>
    </div>
  );
}

function ItemBadge({ status }: { status: OrderItemDoc['status'] }) {
  const map: Record<OrderItemDoc['status'], { label: string; cls: string }> = {
    queued: { label: 'En cola', cls: 'bg-[#EFEAE0] text-hint' },
    in_progress: { label: 'Preparando', cls: 'bg-gold-tint text-gold-ink' },
    done: { label: 'Listo', cls: 'bg-brand-tint text-brand-dark' },
    cancelled: { label: 'Cancelado', cls: 'bg-[#FBE9E7] text-danger' },
  };
  const { label, cls } = map[status] ?? map.queued;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

/** Electronic invoice issued server-side once the order is paid. */
function InvoiceCard({ fiscal }: { fiscal: FiscalInfo }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 border border-line">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-hint">Factura electrónica</p>
      {fiscal.status === 'issued' ? (
        <>
          <p className="text-sm font-semibold text-ink">N.º {fiscal.numeroDF}</p>
          {fiscal.cufe && (
            <p className="mt-0.5 truncate text-xs text-hint" title={fiscal.cufe}>
              CUFE {fiscal.cufe.slice(0, 20)}…
            </p>
          )}
          {(fiscal.pdfUrl || fiscal.qrUrl) && (
            <div className="mt-3 flex gap-2">
              {fiscal.pdfUrl && (
                <a
                  href={fiscal.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl border-[1.5px] border-brand py-2.5 text-center text-sm font-semibold text-brand"
                >
                  Ver PDF
                </a>
              )}
              {fiscal.qrUrl && (
                <a
                  href={fiscal.qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl border border-line py-2.5 text-center text-sm font-semibold text-ink"
                >
                  Verificar en la DGI
                </a>
              )}
            </div>
          )}
        </>
      ) : fiscal.status === 'error' ? (
        <p className="text-sm text-ink">
          No pudimos generar tu factura. Pídela en el mostrador con tu número de pedido.
        </p>
      ) : (
        <div className="flex items-center gap-2.5 text-sm text-ink">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand" />
          Estamos generando tu factura…
        </div>
      )}
    </div>
  );
}

/** Manual Yappy instructions; the screen updates by itself once staff confirm. */
function YappySteps({ order }: { order: OrderDoc }) {
  const [copied, setCopied] = useState('');
  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 2000);
  };
  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-4 border border-line">
      <p className="text-center text-sm font-semibold text-ink">Paga con Yappy para que lo preparemos</p>
      <p className="mt-2 rounded-xl bg-brand-tint px-3 py-2 text-center text-xs text-brand-dark">
        Sabemos que copiar datos en Yappy no es lo más cómodo. Estamos trabajando para que muy pronto pagues con un
        solo toque. ¡Gracias por tu paciencia!
      </p>
      <ol className="mt-3 space-y-3 text-sm">
        <li className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">1</span>
          <span className="min-w-0 flex-1">
            Envía <b>{money(order.total)}</b> a <b className="break-all">{order.payTo}</b>
          </span>
          <button onClick={() => copy('to', order.payTo)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold">
            {copied === 'to' ? 'Copiado' : 'Copiar'}
          </button>
        </li>
        <li className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">2</span>
          <span className="min-w-0 flex-1">
            En el mensaje escribe <b className="tabular-nums">{order.pickupCode}</b>
          </span>
          <button onClick={() => copy('code', order.pickupCode)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold">
            {copied === 'code' ? 'Copiado' : 'Copiar'}
          </button>
        </li>
        <li className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">3</span>
          <span className="min-w-0 flex-1 text-hint">Te avisamos aquí cuando confirmemos tu pago. Puedes dejar esta página abierta.</span>
        </li>
      </ol>
    </div>
  );
}

/** Install card for the order's restaurant (org/name from the session, saved order or remembered home). */
function InstallFor({
  orderBranchId,
  sessionBranch,
}: {
  orderBranchId: string;
  sessionBranch: { orgId: string; branchId: string; branchName: string } | null;
}) {
  const known = [sessionBranch, loadActiveOrder(), loadHome()].find((b) => b?.branchId === orderBranchId);
  if (!known) return null;
  return <InstallCard orgId={known.orgId} branchId={known.branchId} branchName={known.branchName} />;
}
