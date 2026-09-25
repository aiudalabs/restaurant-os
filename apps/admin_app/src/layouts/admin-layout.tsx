import { useEffect, useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTheme } from '@/hooks/use-theme';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/button';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

// Order = frequency of use. The first three also live in the phone's bottom bar.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoy', icon: 'space_dashboard' },
  { to: '/orders', label: 'Pedidos', icon: 'receipt_long' },
  { to: '/menu', label: 'Menú', icon: 'restaurant_menu' },
  { to: '/stations', label: 'Estaciones', icon: 'soup_kitchen' },
  { to: '/tables', label: 'Mesas', icon: 'table_restaurant' },
  { to: '/users', label: 'Equipo', icon: 'group' },
  { to: '/branches', label: 'Sucursales', icon: 'storefront' },
  { to: '/reports', label: 'Reportes', icon: 'bar_chart' },
  { to: '/assistant', label: 'Asistente IA', icon: 'auto_awesome' },
];
const BOTTOM_BAR = NAV_ITEMS.slice(0, 3);
// Rail keeps the destinations used during service; the rest sit behind its menu button.
const RAIL_ITEMS = NAV_ITEMS.slice(0, 6);

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export default function AdminLayout() {
  // The modal drawer remembers the path it was opened on: navigating closes it
  // (derived state — no effect needed).
  const [modalOpenedAt, setModalOpenedAt] = useState<string | null>(null);
  const { appUser, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranchContext();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const current = NAV_ITEMS.find((i) => isActive(pathname, i.to)) ?? NAV_ITEMS[0];
  const modalOpen = modalOpenedAt === pathname;
  const setModalOpen = (open: boolean) => setModalOpenedAt(open ? pathname : null);

  // Close the modal drawer on Escape.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpenedAt(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // Full navigation drawer content (standard drawer on large screens, modal elsewhere).
  const drawer = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-7 pb-2 pt-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
          <Icon name="restaurant" filled />
        </span>
        <span className="t-title-medium text-[var(--md-sys-color-on-surface)]">RestaurantOS</span>
      </div>

      <div className="px-3 py-3">
        <label htmlFor="branch-select" className="t-label-medium block px-4 pb-1 text-[var(--md-sys-color-on-surface-variant)]">
          Sucursal
        </label>
        <div className="relative">
          <Icon name="storefront" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
          <select
            id="branch-select"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={branches.length <= 1}
            className="t-title-small h-14 w-full appearance-none rounded-2xl bg-[var(--md-sys-color-surface-container-high)] pl-12 pr-10 text-[var(--md-sys-color-on-surface)] disabled:opacity-100"
          >
            {branches.length === 0 && <option value="">Sin sucursal</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {branches.length > 1 && (
            <Icon name="unfold_more" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
          )}
        </div>
      </div>

      <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'm3-state t-label-large flex h-14 items-center gap-3 rounded-full pl-4 pr-6',
                active
                  ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)]',
              )}
            >
              <Icon name={item.icon} filled={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="flex items-center gap-3 rounded-full bg-[var(--md-sys-color-surface-container-high)] py-2 pl-2 pr-1">
          <span className="t-title-small grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]">
            {appUser?.displayName?.charAt(0).toUpperCase() ?? '?'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="t-title-small block truncate text-[var(--md-sys-color-on-surface)]">{appUser?.displayName}</span>
            <span className="t-body-small block truncate text-[var(--md-sys-color-on-surface-variant)]">
              {appUser?.role === 'admin' ? 'Administrador' : 'Gerente'}
            </span>
          </span>
          <IconButton icon="logout" label="Cerrar sesión" onClick={logout} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-[var(--md-sys-color-surface)]">
      {/* Standard navigation drawer — expanded windows (≥1200px) */}
      <aside className="hidden w-[300px] shrink-0 bg-[var(--md-sys-color-surface-container-low)] min-[1200px]:block">{drawer}</aside>

      {/* Navigation rail — medium windows (600–1199px) */}
      <nav
        aria-label="Secciones"
        className="hidden w-[88px] shrink-0 flex-col items-center gap-3 pt-3 min-[600px]:flex min-[1200px]:hidden"
      >
        <IconButton icon="menu" label="Abrir menú completo" onClick={() => setModalOpen(true)} />
        <div className="mt-2 flex flex-col items-center gap-3">
          {RAIL_ITEMS.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="group t-label-medium flex w-20 flex-col items-center gap-1 text-[var(--md-sys-color-on-surface-variant)] aria-[current=page]:text-[var(--md-sys-color-on-surface)]"
              >
                <span
                  className={cn(
                    'm3-state grid h-8 w-14 place-items-center rounded-full',
                    active
                      ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                      : '',
                  )}
                >
                  <Icon name={item.icon} filled={active} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main column — min-w-0 keeps wide content from stretching the page */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 pl-4 pr-2 sm:pl-6 sm:pr-4">
          <div className="min-w-0 flex-1">
            <h1 className="t-title-large truncate text-[var(--md-sys-color-on-surface)]">{current.label}</h1>
            {selectedBranch && (
              <p className="t-body-small truncate text-[var(--md-sys-color-on-surface-variant)] min-[1200px]:hidden">
                {selectedBranch.name}
              </p>
            )}
          </div>
          <IconButton
            icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
            label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
            onClick={toggle}
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 sm:px-6 sm:pb-10">
          <div key={pathname} className="mx-auto max-w-[1200px]" style={{ animation: 'm3-view-in 250ms var(--md-ease-emphasized-decelerate)' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Navigation bar — compact windows (<600px) */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 bg-[var(--md-sys-color-surface-container)] pb-[max(12px,env(safe-area-inset-bottom))] pt-3 min-[600px]:hidden"
      >
        {BOTTOM_BAR.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className="t-label-medium flex flex-col items-center gap-1 text-[var(--md-sys-color-on-surface-variant)] aria-[current=page]:text-[var(--md-sys-color-on-surface)]"
            >
              <span
                className={cn(
                  'm3-state grid h-8 w-16 place-items-center rounded-full',
                  active && 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]',
                )}
              >
                <Icon name={item.icon} filled={active} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-current={BOTTOM_BAR.some((i) => i.to === current.to) ? undefined : 'page'}
          className="t-label-medium flex flex-col items-center gap-1 text-[var(--md-sys-color-on-surface-variant)] aria-[current=page]:text-[var(--md-sys-color-on-surface)]"
        >
          <span
            className={cn(
              'm3-state grid h-8 w-16 place-items-center rounded-full',
              !BOTTOM_BAR.some((i) => i.to === current.to) &&
                'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]',
            )}
          >
            <Icon name="menu" />
          </span>
          Más
        </button>
      </nav>

      {/* Modal navigation drawer — opened from the rail or the bar's "Más" */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 min-[1200px]:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setModalOpen(false)} style={{ animation: 'm3-fade-in 150ms linear' }} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="absolute inset-y-0 left-0 w-[min(320px,85vw)] rounded-r-2xl bg-[var(--md-sys-color-surface-container-low)] pb-[env(safe-area-inset-bottom)]"
            style={{ animation: 'm3-drawer-in 300ms var(--md-ease-emphasized-decelerate)' }}
          >
            {drawer}
          </aside>
        </div>
      )}
    </div>
  );
}
