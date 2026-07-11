import { useState } from 'react';
import { Link, Outlet, useMatchRoute, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Grid3X3,
  Radio,
  Users,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTheme } from '@/hooks/use-theme';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/branches', label: 'Sucursales', icon: Store },
  { to: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { to: '/tables', label: 'Mesas', icon: Grid3X3 },
  { to: '/stations', label: 'Estaciones', icon: Radio },
  { to: '/users', label: 'Usuarios', icon: Users },
  { to: '/orders', label: 'Pedidos', icon: ClipboardList },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
] as const;

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { appUser, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranchContext();
  const { theme, toggle } = useTheme();
  const matchRoute = useMatchRoute();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const current =
    [...NAV_ITEMS].reverse().find((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to))) ??
    NAV_ITEMS[0];

  const nav = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-2 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-xl text-[var(--color-on-primary)] shadow-[var(--shadow-e1)]">
          🍽️
        </div>
        <div className="leading-tight">
          <p className="font-bold text-gray-900">RestaurantOS</p>
          <p className="text-xs text-gray-500">Panel de administración</p>
        </div>
        <button
          className="m3-state ml-auto rounded-full p-2 text-gray-500 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Branch selector */}
      <div className="px-4 py-3">
        {branches.length > 1 ? (
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full appearance-none rounded-full bg-[var(--color-surface-container-high)] py-2.5 pl-4 pr-9 text-sm font-medium text-gray-900"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        ) : (
          <div className="rounded-full bg-[var(--color-surface-container-high)] px-4 py-2.5 text-sm font-medium text-gray-700">
            {selectedBranch?.name ?? 'Sin sucursal'}
          </div>
        )}
      </div>

      {/* Navigation — M3 pill items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? pathname === '/' : Boolean(matchRoute({ to, fuzzy: true }));
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={cn(
                'm3-state flex items-center gap-4 rounded-full px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-orange-600')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-full bg-[var(--color-surface-container-high)] px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-[var(--color-on-primary)]">
            {appUser?.displayName?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{appUser?.displayName}</p>
            <p className="truncate text-xs capitalize text-gray-500">{appUser?.role}</p>
          </div>
          <button
            onClick={logout}
            className="m3-state rounded-full p-2 text-gray-500 hover:text-red-600"
            title="Cerrar sesión"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      {/* Scrim (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Navigation drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-[var(--color-surface-container)] transition-transform lg:static lg:translate-x-0 lg:m-3 lg:h-auto lg:rounded-[2rem]',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {nav}
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top app bar */}
        <header className="flex h-16 items-center gap-3 px-4 lg:px-8">
          <button
            className="m3-state rounded-full p-2 text-gray-700 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-[22px] font-bold text-gray-900">{current.label}</h1>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggle}
              className="m3-state rounded-full p-2.5 text-gray-700"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-[var(--color-on-primary)]">
              {appUser?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 pb-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
