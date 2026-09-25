import { useState } from 'react';
import { PLANS, type Plan, ADMIN_URL, checkoutHandoffUrl } from './config';

export function App() {
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const goToPlan = (p: Plan) => setCheckout(p);
  const scrollToPricing = () =>
    document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen">
      <Nav onStart={scrollToPricing} />
      <Hero onStart={scrollToPricing} />
      <LogosStrip />
      <Features />
      <HowItWorks />
      <Pricing onChoose={goToPlan} />
      <Faq />
      <FinalCta onStart={scrollToPricing} />
      <Footer />
      {checkout && <CheckoutModal plan={checkout} onClose={() => setCheckout(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Nav */
function Nav({ onStart }: { onStart: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ground/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2 font-display text-xl font-600 tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-base">🔥</span>
          RestaurantOS
        </a>
        <nav className="hidden items-center gap-8 text-sm font-500 text-muted md:flex">
          <a href="#producto" className="transition-colors hover:text-ink">Producto</a>
          <a href="#como" className="transition-colors hover:text-ink">Cómo funciona</a>
          <a href="#precios" className="transition-colors hover:text-ink">Precios</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={`${ADMIN_URL}/login`}
            className="hidden text-sm font-600 text-ink transition-opacity hover:opacity-70 sm:block"
          >
            Iniciar sesión
          </a>
          <button
            onClick={onStart}
            className="rounded-full bg-ink px-5 py-2 text-sm font-700 text-ground transition-transform active:scale-95"
          >
            Empezar
          </button>
        </div>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------- Hero */
function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FF7A45 0%, transparent 60%)' }}
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-600 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Sin apps que instalar
          </span>
          <h1 className="mt-5 font-display text-5xl font-600 leading-[1.05] tracking-tight md:text-6xl" style={{ textWrap: 'balance' }}>
            Tu restaurante,{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(100deg, #E23744, #FF7A45)' }}
            >
              del QR a la cocina
            </span>{' '}
            en segundos.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            El cliente escanea un código, ordena desde su teléfono y el pedido cae directo
            en la pantalla de tu cocina. Tú lo administras todo desde un panel. Nada que descargar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onStart}
              className="rounded-full bg-brand px-7 py-3.5 text-base font-700 text-white shadow-lift transition-transform active:scale-95"
            >
              Ver planes y empezar
            </button>
            <a
              href="#como"
              className="rounded-full border border-line bg-panel px-7 py-3.5 text-base font-600 text-ink transition-colors hover:border-ink/30"
            >
              Cómo funciona
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">
            Prueba el flujo completo hoy · pago sandbox · listo para vender.
          </p>
        </div>
        <PhoneMock />
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto flex max-w-sm items-center justify-center">
      {/* Kitchen ticket floating behind */}
      <div className="absolute -left-4 top-6 hidden w-44 rotate-[-6deg] rounded-2xl border border-line bg-panel p-3 shadow-soft sm:block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-700 text-ink">Mesa · #A17</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-700 text-green-700">EN COCINA</span>
        </div>
        <div className="mt-2 space-y-1.5 text-xs text-muted">
          <div className="flex justify-between"><span>2× Pizza Margarita</span></div>
          <div className="flex justify-between"><span>1× Ensalada César</span></div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-line">
          <div className="h-1 w-2/3 rounded-full bg-brand" />
        </div>
      </div>

      {/* Phone */}
      <div className="relative w-64 rounded-[2.2rem] border-4 border-ink bg-ink p-2 shadow-soft">
        <div className="overflow-hidden rounded-[1.7rem] bg-ground">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <span className="font-display text-sm font-600">El Fogón · Centro</span>
            <span className="text-lg">🔥</span>
          </div>
          <div className="space-y-2.5 p-3">
            {[
              { n: 'Pizza Margarita', p: '$8.50', e: '🍕' },
              { n: 'Hamburguesa clásica', p: '$7.00', e: '🍔' },
              { n: 'Limonada de hierbabuena', p: '$2.50', e: '🥤' },
            ].map((i) => (
              <div key={i.n} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ground text-lg">{i.e}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-600 text-ink">{i.n}</p>
                  <p className="text-xs text-brand">{i.p}</p>
                </div>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-sm text-white">+</span>
              </div>
            ))}
          </div>
          <div className="p-3 pt-0">
            <div className="rounded-xl bg-ink py-2.5 text-center text-xs font-700 text-ground">
              Ordenar · $18.50
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Logos strip */
function LogosStrip() {
  const stats = [
    { k: '0', v: 'apps que instalar' },
    { k: '<30s', v: 'del QR al pedido' },
    { k: '24/7', v: 'pedidos en tiempo real' },
    { k: '∞', v: 'sucursales (plan Chain)' },
  ];
  return (
    <section className="border-y border-line bg-panel">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.v} className="text-center">
            <p className="font-display text-3xl font-600 text-ink">{s.k}</p>
            <p className="mt-1 text-sm text-muted">{s.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Features */
function Features() {
  const items = [
    { e: '📱', t: 'Pedidos por QR', d: 'El cliente escanea, ve el menú de esa sucursal y ordena desde su teléfono. Sin filas, sin descargas.' },
    { e: '🔥', t: 'Cocina en pantalla', d: 'Cada pedido cae en la pantalla de cocina o bar al instante, con temporizador y estados por estación.' },
    { e: '🧑‍🍳', t: 'Login por PIN', d: 'Las estaciones entran con un PIN de 4 dígitos. Rápido, seguro y sin escribir emails cada vez.' },
    { e: '🛠️', t: 'Panel de administración', d: 'Crea sucursales, menús, categorías y productos con fotos. Edita y elimina todo desde un lugar.' },
    { e: '💳', t: 'Pagos en línea', d: 'Cobra antes de preparar con PagueloFácil. Se acabaron los pedidos que nadie recoge.' },
    { e: '🏢', t: 'Multi-sucursal', d: 'Cada sucursal, su menú y sus estaciones. Un cliente ve siempre el restaurante correcto.' },
  ];
  return (
    <section id="producto" className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-700 uppercase tracking-widest text-brand">Todo en un sistema</p>
        <h2 className="mt-3 font-display text-4xl font-600 tracking-tight md:text-5xl" style={{ textWrap: 'balance' }}>
          Lo que tu restaurante necesita, sin el enredo de diez herramientas.
        </h2>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.t}
            className="group rounded-2xl border border-line bg-panel p-6 shadow-soft transition-transform hover:-translate-y-1"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ground text-2xl">{i.e}</span>
            <h3 className="mt-4 font-display text-xl font-600">{i.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{i.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- How it works */
function HowItWorks() {
  const steps = [
    { t: 'Crea tu restaurante', d: 'Elige un plan, crea tu cuenta y tendrás tu organización, tu primera sucursal y un menú listos para editar.' },
    { t: 'Arma tu menú e imprime el QR', d: 'Agrega categorías, productos y fotos desde el panel. Coloca el QR en las mesas o en la entrada.' },
    { t: 'Recibe pedidos en la cocina', d: 'El cliente escanea, ordena y paga. El pedido aparece en la pantalla de cocina en tiempo real.' },
  ];
  return (
    <section id="como" className="border-y border-line bg-panel">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-700 uppercase tracking-widest text-brand">Cómo funciona</p>
          <h2 className="mt-3 font-display text-4xl font-600 tracking-tight md:text-5xl" style={{ textWrap: 'balance' }}>
            De cero a recibir pedidos en tres pasos.
          </h2>
        </div>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand font-display text-lg font-700 text-white">
                  {i + 1}
                </span>
                {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-line md:block" />}
              </div>
              <h3 className="mt-4 font-display text-xl font-600">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Pricing */
function Pricing({ onChoose }: { onChoose: (p: Plan) => void }) {
  return (
    <section id="precios" className="mx-auto max-w-6xl px-5 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-700 uppercase tracking-widest text-brand">Precios</p>
        <h2 className="mt-3 font-display text-4xl font-600 tracking-tight md:text-5xl" style={{ textWrap: 'balance' }}>
          Un plan para cada etapa de tu restaurante.
        </h2>
        <p className="mt-4 text-muted">Elige, paga y empieza a vender el mismo día. Cancela cuando quieras.</p>
      </div>
      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative rounded-3xl border p-7 shadow-soft ${
              p.featured ? 'border-brand bg-panel ring-2 ring-brand/20' : 'border-line bg-panel'
            }`}
          >
            {p.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-700 text-white">
                Más popular
              </span>
            )}
            <h3 className="font-display text-2xl font-600">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="font-display text-5xl font-600">${p.price}</span>
              <span className="mb-1.5 text-sm text-muted">/ mes</span>
            </div>
            <button
              onClick={() => onChoose(p)}
              className={`mt-6 w-full rounded-full py-3 text-base font-700 transition-transform active:scale-95 ${
                p.featured ? 'bg-brand text-white shadow-lift' : 'bg-ink text-ground'
              }`}
            >
              Elegir {p.name}
            </button>
            <ul className="mt-6 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-700 text-brand">
                    ✓
                  </span>
                  <span className="text-ink/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted">
        Precios en USD. El pago hoy es en modo sandbox (demostración); la conexión con PagueloFácil se activa antes de salir a producción.
      </p>
    </section>
  );
}

/* ----------------------------------------------------- Checkout modal */
type Stage = 'form' | 'processing' | 'done';

function CheckoutModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('form');
  const [email, setEmail] = useState('');

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    setStage('processing');
    // Simulated authorization delay. Real PagueloFácil hosted checkout replaces this.
    window.setTimeout(() => setStage('done'), 1600);
  };

  const goToApp = () => {
    window.location.href = checkoutHandoffUrl(plan.id, email.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-panel p-6 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {stage === 'form' && (
          <form onSubmit={pay}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-700 uppercase tracking-widest text-brand">Checkout</p>
                <h3 className="mt-1 font-display text-2xl font-600">Plan {plan.name}</h3>
              </div>
              <button type="button" onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink">×</button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-ground p-4">
              <span className="text-sm text-muted">Total mensual</span>
              <span className="font-display text-2xl font-600">${plan.price}<span className="text-sm text-muted"> /mes</span></span>
            </div>

            <label className="mt-5 block text-sm font-600 text-ink">
              Tu email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dueño@turestaurante.com"
                className="mt-1.5 w-full rounded-xl border border-line bg-ground px-4 py-3 text-ink outline-none focus:border-brand"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-line bg-ground p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-600 text-ink">Tarjeta (sandbox)</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-700 text-brand">DEMO</span>
              </div>
              <div className="mt-3 rounded-xl bg-panel px-4 py-3 font-mono text-sm tracking-widest text-muted">
                4111 1111 1111 1111
              </div>
              <div className="mt-2 flex gap-2">
                <div className="flex-1 rounded-xl bg-panel px-4 py-3 font-mono text-sm text-muted">12/28</div>
                <div className="w-20 rounded-xl bg-panel px-4 py-3 font-mono text-sm text-muted">123</div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-full bg-brand py-3.5 text-base font-700 text-white shadow-lift transition-transform active:scale-95"
            >
              Pagar ${plan.price} (simulado)
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              Pago de demostración. No se hace ningún cargo real.
            </p>
          </form>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="mt-5 font-600 text-ink">Procesando pago…</p>
            <p className="text-sm text-muted">Autorizando con la pasarela sandbox</p>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl text-green-600">✓</div>
            <h3 className="mt-5 font-display text-2xl font-600">¡Pago confirmado!</h3>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Plan <b>{plan.name}</b> activado. El último paso es crear tu cuenta y tu restaurante.
            </p>
            <button
              onClick={goToApp}
              className="mt-6 w-full rounded-full bg-ink py-3.5 text-base font-700 text-ground transition-transform active:scale-95"
            >
              Crear mi restaurante →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- FAQ */
function Faq() {
  const qs = [
    { q: '¿Mis clientes tienen que descargar una app?', a: 'No. Todo funciona desde el navegador del teléfono al escanear el QR. Tu cocina también usa una pantalla web, sin instalar nada.' },
    { q: '¿Puedo tener varias sucursales?', a: 'Sí. Cada sucursal tiene su propio menú y estaciones, y cada QR lleva al cliente al restaurante correcto. Los planes Growth y Chain amplían el número de sucursales.' },
    { q: '¿Cómo cobro a mis clientes?', a: 'Con PagueloFácil el cliente paga en línea antes de que la cocina prepare el pedido, así no preparas comida que nadie recoge. El cobro en línea está en los planes Growth y Chain.' },
    { q: '¿El pago de hoy es real?', a: 'No todavía. El checkout está en modo sandbox para que pruebes el flujo completo. Conectamos el cobro real de la suscripción antes de salir a producción.' },
  ];
  return (
    <section className="mx-auto max-w-3xl px-5 py-20">
      <h2 className="text-center font-display text-4xl font-600 tracking-tight">Preguntas frecuentes</h2>
      <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-panel">
        {qs.map((item) => (
          <details key={item.q} className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-600 text-ink">
              {item.q}
              <span className="ml-4 text-xl text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Final CTA */
function FinalCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div
        className="relative overflow-hidden rounded-[2rem] px-8 py-16 text-center text-white shadow-lift"
        style={{ background: 'linear-gradient(120deg, #E23744, #FF7A45)' }}
      >
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-600 leading-tight tracking-tight md:text-5xl" style={{ textWrap: 'balance' }}>
          Empieza a recibir pedidos por QR hoy mismo.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/85">
          Crea tu restaurante en minutos. Sin instalaciones, sin contratos largos.
        </p>
        <button
          onClick={onStart}
          className="mt-8 rounded-full bg-white px-8 py-3.5 text-base font-700 text-brand transition-transform active:scale-95"
        >
          Elegir mi plan
        </button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Footer */
function Footer() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2 font-display text-base font-600 text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm">🔥</span>
          RestaurantOS
        </div>
        <p>© 2026 RestaurantOS · Hecho en Panamá</p>
        <a href={`${ADMIN_URL}/login`} className="font-600 text-ink hover:text-brand">
          Iniciar sesión
        </a>
      </div>
    </footer>
  );
}
