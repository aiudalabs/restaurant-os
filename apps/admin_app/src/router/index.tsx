import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import AdminLayout from '@/layouts/admin-layout';
import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import MenuPage from '@/features/menu/MenuPage';
import TablesPage from '@/features/tables/TablesPage';
import StationsPage from '@/features/stations/StationsPage';
import UsersPage from '@/features/users/UsersPage';
import OrdersPage from '@/features/orders/OrdersPage';
import ReportsPage from '@/features/reports/ReportsPage';
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

const ordersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/orders',
  component: OrdersPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/reports',
  component: ReportsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute.addChildren([
    dashboardRoute,
    menuRoute,
    tablesRoute,
    stationsRoute,
    usersRoute,
    ordersRoute,
    reportsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
