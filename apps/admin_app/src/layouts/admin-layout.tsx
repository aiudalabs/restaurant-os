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

// Order = frequency of use. The assistant sits apart at the bottom of the rail.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/orders', label: 'Pedidos', icon: 'receipt_long' },
  { to: '/menu', label: 'Menú', icon: 'menu_book' },
  { to: '/reports', label: 'Reportes', icon: 'bar_chart' },
  { to: '/stations', label: 'Estaciones', icon: 'soup_kitchen' },
  { to: '/tables', label: 'Mesas', icon: 'table_restaurant' },
  { to: '/users', label: 'Equipo', icon: 'group' },
  { to: '/branches', label: 'Sucursales', icon: 'storefront' },
];
const ASSISTANT: NavItem = { to: '/assistant', label: 'Asistente', icon: 'auto_awesome' };
const ALL_ITEMS = [...NAV_ITEMS, ASSISTANT];
// Phone bottom bar: the four used during service; the rest live behind "Más".
const BOTTOM_BAR = NAV_ITEMS.slice(0, 4);

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

/** One destination of the dark rail / drawer: icon over label, basil pill when active. */
function RailLink({ item, pathname, accent }: { item: NavItem; pathname: string; accent?: boolean }) {
  const active = isActive(pathname, item.to);
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] leading-4 transition-colors',
        active
          ? 'bg-[var(--md-sys-color-primary)] font-semibold text-[#ffffff] dark:text-[var(--md-sys-color-on-primary)]'
          : accent
            ? 'font-semibold text-[var(--ros-saffron)] hover:bg-[#ffffff]/5'
            : 'font-medium text-[var(--ros-rail-fg)] hover:bg-[#ffffff]/5 hover:text-[#ffffff]',
      )}
    >
      <Icon name={item.icon} filled={active} size={22} />
      {item.label}
    </Link>
  );
}

export default function AdminLayout() {
  // The modal drawer remembers the path it was opened on: navigating closes it
  // (derived state — no effect needed).
  const [modalOpenedAt, setModalOpenedAt] = useState<string | null>(null);
  const { appUser, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranchContext();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const current = ALL_ITEMS.find((i) => isActive(pathname, i.to)) ?? NAV_ITEMS[0];
  const modalOpen = modalOpenedAt === pathname;
  const setModalOpen = (open: boolean) => setModalOpenedAt(open ? pathname : null);
  const initial = appUser?.displayName?.charAt(0).toUpperCase() ?? '?';
  const onHome = current.to === '/';
  const dateLabel = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  // Close the modal drawer on Escape.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpenedAt(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const branchSelect = (id: string, className?: string) => (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Sucursal
      </label>
      <Icon
        name="storefront"
        size={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]"
      />
      <select
        id={id}
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        disabled={branches.length <= 1}
        className="t-label-large h-12 w-full appearance-none rounded-full bg-[var(--md-sys-color-surface-container-low)] pl-11 pr-10 text-[var(--md-sys-color-on-surface)] disabled:opacity-100"
      >
        {branches.length === 0 && <option value="">Sin sucursal</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {branches.length > 1 && (
        <Icon
          name="expand_more"
          size={20}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]"
        />
      )}
    </div>
  );

  const accountButton = (
    <button
      type="button"
      onClick={logout}
      title={`${appUser?.displayName ?? ''} · Cerrar sesión`}
      aria-label="Cerrar sesión"
      className="t-title-small grid h-11 w-11 place-items-center rounded-full bg-[var(--md-sys-color-primary)] text-[#ffffff]"
    >
      {initial}
    </button>
  );

  return (
    <div className="flex h-dvh bg-[var(--md-sys-color-surface)]">
      {/* Dark navigation rail — tablet and desktop (≥600px) */}
      <nav
        aria-label="Secciones"
        className="hidden w-24 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-[var(--ros-rail)] py-5 min-[600px]:flex"
      >
        <span className="mb-4 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--md-sys-color-primary)] text-[#ffffff]">
          <Icon name="room_service" filled />
        </span>
        {NAV_ITEMS.map((item) => (
          <RailLink key={item.to} item={item} pathname={pathname} />
        ))}
        <div className="min-h-4 flex-1" />
        <RailLink item={ASSISTANT} pathname={pathname} accent />
        <IconButton
          icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
          label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
          onClick={toggle}
          className="mt-2 text-[var(--ros-rail-fg)]"
        />
        <div className="mt-2">{accountButton}</div>
      </nav>

      {/* Main column — min-w-0 keeps wide content from stretching the page */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-end gap-3 px-4 pb-4 pt-5 sm:px-8 sm:pt-7">
          <div className="min-w-0 flex-1">
            <p className="t-body-medium truncate first-letter:uppercase text-[var(--md-sys-color-on-surface-variant)]">
              {onHome ? dateLabel : (selectedBranch?.name ?? '')}
            </p>
            <h1 className="t-display-small truncate sm:text-[52px] text-[var(--md-sys-color-on-surface)]">
              {onHome ? (selectedBranch?.name ?? 'Inicio') : current.label}
            </h1>
          </div>
          {branchSelect('branch-select', 'hidden w-64 sm:block')}
          <IconButton
            icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
            label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
            onClick={toggle}
            className="min-[600px]:hidden"
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 sm:px-8 sm:pb-10">
          <div key={pathname} className="mx-auto max-w-[1280px]" style={{ animation: 'm3-view-in 250ms var(--md-ease-emphasized-decelerate)' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Dark bottom bar — phones (<600px) */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 bg-[var(--ros-rail)] px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 min-[600px]:hidden"
      >
        {BOTTOM_BAR.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] leading-4',
                active
                  ? 'bg-[var(--md-sys-color-primary)] font-semibold text-[#ffffff] dark:text-[var(--md-sys-color-on-primary)]'
                  : 'font-medium text-[var(--ros-rail-fg)]',
              )}
            >
              <Icon name={item.icon} filled={active} size={22} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-current={BOTTOM_BAR.some((i) => i.to === current.to) ? undefined : 'page'}
          className={cn(
            'flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] leading-4',
            BOTTOM_BAR.some((i) => i.to === current.to)
              ? 'font-medium text-[var(--ros-rail-fg)]'
              : 'bg-[var(--md-sys-color-primary)] font-semibold text-[#ffffff] dark:text-[var(--md-sys-color-on-primary)]',
          )}
        >
          <Icon name="more_horiz" size={22} />
          Más
        </button>
      </nav>

      {/* "Más" drawer — phones: every section, branch and account */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 min-[600px]:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} style={{ animation: 'm3-fade-in 150ms linear' }} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-[var(--ros-rail)] px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-5"
            style={{ animation: 'm3-view-in 250ms var(--md-ease-emphasized-decelerate)' }}
          >
            <div className="mb-4 flex items-center gap-3">
              {accountButton}
              <div className="min-w-0 flex-1">
                <p className="t-title-small truncate text-[#ffffff]">{appUser?.displayName}</p>
                <p className="t-body-small text-[var(--ros-rail-fg)]">Toca tu inicial para cerrar sesión</p>
              </div>
              <IconButton icon="close" label="Cerrar" onClick={() => setModalOpen(false)} className="text-[var(--ros-rail-fg)]" />
            </div>
            {branchSelect('branch-select-mobile', 'mb-4')}
            <div className="grid grid-cols-4 justify-items-center gap-2">
              {ALL_ITEMS.map((item) => (
                <RailLink key={item.to} item={item} pathname={pathname} accent={item.to === ASSISTANT.to} />
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
