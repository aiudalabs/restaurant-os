import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { buildCustomerOrderUrl } from '@/lib/config';
import { cn } from '@/lib/utils';

export interface SetupInput {
  orgId: string;
  branchId: string;
  /** null while the menu is still loading. */
  categoryCount: number | null;
  stationCount: number | null;
  waiterCount: number | null;
  /** True once the branch has taken any order today: the guide has done its job. */
  hasOrders: boolean;
}

interface Step {
  id: string;
  done: boolean;
  to: '/menu' | '/stations' | '/users';
  title: string;
  hint: string;
}

const DISMISS_KEY = 'ros_setup_done_dismissed';

function readDismissed(branchId: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_KEY}:${branchId}`) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(branchId: string) {
  try {
    localStorage.setItem(`${DISMISS_KEY}:${branchId}`, '1');
  } catch {
    /* private window or blocked storage: the panel just shows again next time */
  }
}

/**
 * First use. A restaurant with no menu or no waiter cannot take its first order, so the home page
 * says what is missing, links to where to fix it and offers the customer link to copy. Every step is
 * read from real data; when the three are done it says so once and can be dismissed.
 */
export function PrimerPedido({ orgId, branchId, categoryCount, stationCount, waiterCount, hasOrders }: SetupInput) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed(branchId));
  const loading = categoryCount === null || stationCount === null || waiterCount === null;

  useEffect(() => {
    setDismissed(readDismissed(branchId));
  }, [branchId]);

  if (loading || !branchId || hasOrders) return null;

  const steps: Step[] = [
    {
      id: 'menu',
      done: categoryCount > 0,
      to: '/menu',
      title: 'Carga tu menú',
      hint: 'Categorías y productos con su precio. El Asistente puede armarlo por ti desde una lista.',
    },
    {
      id: 'stations',
      done: stationCount > 0,
      to: '/stations',
      title: 'Define dónde se prepara cada cosa',
      hint: 'Cocina, barra o ambas. Sin estaciones, el mesero marca los platos como listos.',
    },
    {
      id: 'team',
      done: waiterCount > 0,
      to: '/users',
      title: 'Da de alta a tu primer mesero',
      hint: 'Entra con su nombre y un PIN de 6 dígitos desde cualquier teléfono.',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (allDone && dismissed) return null;

  const link = buildCustomerOrderUrl(orgId, branchId);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Some app views refuse the clipboard: select the text instead.
      const el = document.getElementById('enlace-clientes');
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };

  return (
    <section aria-labelledby="primer-pedido" className="rounded-2xl bg-[var(--brand-wash)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl space-y-1">
          <h2 id="primer-pedido" className="t-title-large text-[var(--ink)] [font-family:var(--font-display)]">
            {allDone ? 'Todo listo para tu primer pedido' : 'Antes del primer pedido'}
          </h2>
          <p className="t-body-medium text-[var(--ink-soft)]">
            {allDone
              ? 'Comparte el enlace con tus clientes o imprímelo en un código QR. Los pedidos aparecerán aquí.'
              : `Te faltan ${steps.length - doneCount} de ${steps.length} pasos para recibir pedidos.`}
          </p>
        </div>
        {allDone && (
          <button
            type="button"
            onClick={() => {
              writeDismissed(branchId);
              setDismissed(true);
            }}
            className="t-label-large m3-state min-h-11 rounded-[10px] px-3 text-[var(--brand-ink)] underline underline-offset-4"
          >
            Ocultar
          </button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-3 py-3">
            <Icon
              name={s.done ? 'check_circle' : 'radio_button_unchecked'}
              filled={s.done}
              size={22}
              className={cn('mt-0.5 shrink-0', s.done ? 'text-[var(--good-ink)]' : 'text-[var(--ink-soft)]')}
            />
            <div className="min-w-0 flex-1">
              <p className={cn('t-body-large', s.done ? 'text-[var(--ink-soft)]' : 'text-[var(--ink)]')}>
                {s.title}
                <span className="sr-only">{s.done ? ' (hecho)' : ' (pendiente)'}</span>
              </p>
              {!s.done && <p className="t-body-medium text-[var(--ink-soft)]">{s.hint}</p>}
            </div>
            {!s.done && (
              <Link
                to={s.to}
                className="t-label-large m3-state grid min-h-11 shrink-0 place-items-center rounded-[10px] bg-[var(--action)] px-4 text-[var(--on-action)]"
              >
                Ir allí
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p id="enlace-clientes" className="t-body-medium min-w-0 flex-1 basis-64 select-all break-all rounded-[10px] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)]">
          {link}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="t-label-large m3-state inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-[var(--ink)]"
        >
          <Icon name={copied ? 'check' : 'content_copy'} size={18} />
          {copied ? 'Enlace copiado' : 'Copiar enlace para clientes'}
        </button>
      </div>
    </section>
  );
}
