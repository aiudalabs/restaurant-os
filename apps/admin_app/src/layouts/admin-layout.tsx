import { useState } from 'react';
import { Link, Outlet, useMatchRoute } from '@tanstack/react-router';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  Radio,
  Users,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { to: '/tables', label: 'Mesas', icon: Grid3X3 },
  { to: '/stations', label: 'Estaciones', icon: Radio },
  { to: '/users', label: 'Usuarios', icon: Users },
  { to: '/orders', label: 'Pedidos', icon: ClipboardList },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
] as const;

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { appUser, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranchContext();
  const matchRoute = useMatchRoute();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <span className="text-lg font-bold text-gray-900">RestaurantOS</span>
          <button
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Branch selector */}
        <div className="px-4 py-2 border-b border-gray-200">
          {branches.length > 1 ? (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {selectedBranch?.name ?? 'Sin sucursal'}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = matchRoute({ to, fuzzy: to !== '/' }) || (to === '/' && location.pathname === '/');
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
              {appUser?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {appUser?.displayName}
              </p>
              <p className="truncate text-xs text-gray-500">{appUser?.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar mobile */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            className="rounded-md p-1.5 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-bold text-gray-900">RestaurantOS</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
