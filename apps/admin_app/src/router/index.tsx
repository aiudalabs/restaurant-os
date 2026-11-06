import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import AdminLayout from '@/layouts/admin-layout';
import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import BranchesPage from '@/features/branches/BranchesPage';
import MenuPage from '@/features/menu/MenuPage';
import TablesPage from '@/features/tables/TablesPage';
import StationsPage from '@/features/stations/StationsPage';
import UsersPage from '@/features/users/UsersPage';
import OrdersPage from '@/features/orders/OrdersPage';
import ReportsPage from '@/features/reports/ReportsPage';
import AiAssistantPage from '@/features/ai-assistant/AiAssistantPage';
import SettingsPage from '@/features/settings/SettingsPage';
import { auth } from '@/lib/firebase';

function isAuthenticated() {
  return auth.currentUser !== null;
}

const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin',
  component: AdminLayout,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/',
  component: DashboardPage,
});

const branchesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/branches',
  component: BranchesPage,
});

const menuRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/menu',
  component: MenuPage,
});

const tablesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/tables',
  component: TablesPage,
});

const stationsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/stations',
  component: StationsPage,
});

const usersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/users',
  component: UsersPage,
});

/** `order` opens that order's detail; `q` pre-fills the search box (both come from the command bar and Inicio). */
export interface OrdersSearch {
  order?: string;
  q?: string;
}

const text = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

const ordersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/orders',
  component: OrdersPage,
  validateSearch: (s: Record<string, unknown>): OrdersSearch => ({ order: text(s.order), q: text(s.q) }),
});

const reportsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/reports',
  component: ReportsPage,
});

/** `q` is what the person typed in the command bar; the assistant shows it in its input, unsent. */
export interface AssistantSearch {
  q?: string;
}

const assistantRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/assistant',
  component: AiAssistantPage,
  validateSearch: (s: Record<string, unknown>): AssistantSearch => ({ q: text(s.q) }),
});

const settingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute.addChildren([
    dashboardRoute,
    branchesRoute,
    menuRoute,
    tablesRoute,
    stationsRoute,
    usersRoute,
    ordersRoute,
    reportsRoute,
    assistantRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
