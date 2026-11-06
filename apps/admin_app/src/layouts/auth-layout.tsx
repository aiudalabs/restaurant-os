import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/** The product's front door: brand and one promise on the left (desktop), the form on a work surface. */
function Brand() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-10 w-10">
        <rect width="32" height="32" rx="9" fill="var(--action)" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="var(--on-action)" strokeWidth="2" />
        <path d="M16 9.5V16" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="text-[20px] font-bold tracking-[-0.01em] text-[var(--ink)] [font-family:var(--font-display)]">RestaurantOS</span>
    </div>
  );
}

// A quiet preview of the day curve: bars for today, an outline for last week, the "ahora" line.
const TODAY = [2, 3, 5, 8, 12, 15, 11, 9, 7, 9, 13, 16, 12, 8, 0, 0, 0, 0];
const LAST_WEEK = [1, 3, 4, 7, 11, 14, 12, 10, 8, 8, 12, 15, 14, 11, 9, 6, 4, 2];

function Silhouette() {
  const w = 18;
  const gap = 4;
  const h = 120;
  const step = w + gap;
  const total = TODAY.length * step;
  const y = (v: number) => h - v * 6.5;
  let ghost = `M 0 ${y(LAST_WEEK[0])}`;
  LAST_WEEK.forEach((_, i) => {
    ghost += ` H ${(i + 1) * step - gap / 2}`;
    if (i + 1 < LAST_WEEK.length) ghost += ` V ${y(LAST_WEEK[i + 1])}`;
  });
  const nowX = 14 * step - gap / 2;
  return (
    <svg viewBox={`0 0 ${total} ${h + 8}`} aria-hidden="true" className="w-full max-w-md">
      {TODAY.map((v, i) =>
        v > 0 ? <rect key={i} x={i * step} y={y(v)} width={w} height={v * 6.5} rx="3" fill="var(--ink)" /> : null,
      )}
      <path d={ghost} fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1={nowX} x2={nowX} y1="0" y2={h} stroke="var(--accent)" strokeWidth="2" />
      <line x1="0" x2={total} y1={h} y2={h} stroke="var(--line-strong)" />
    </svg>
  );
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-[var(--ground)] text-[var(--ink)] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between p-12 lg:flex xl:p-16">
        <Brand />
        <div className="space-y-8">
          <h2 className="max-w-lg text-[44px] font-bold leading-[1.05] tracking-[-0.02em] [font-family:var(--font-display)]">
            Sabe cómo va el servicio sin preguntarle a nadie.
          </h2>
          <Silhouette />
          <p className="t-body-large max-w-md text-[var(--ink-soft)]">
            Pedidos, cocina, cobros y facturas en una sola vista, comparada con el mismo día de la semana pasada.
          </p>
        </div>
        <span aria-hidden="true" />
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-4 py-10 lg:[--field-bg:var(--surface)] lg:border-l lg:border-[var(--line)] lg:bg-[var(--surface)]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
