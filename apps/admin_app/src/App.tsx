import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthContext, useAuthProvider } from '@/hooks/use-auth';
import { BranchProvider } from '@/hooks/use-branch-context';
import { router } from '@/router';
import { Icon } from '@/components/ui/icon';

const queryClient = new QueryClient();

export default function App() {
  const auth = useAuthProvider();

  if (auth.loading) {
    return (
      <div role="status" className="flex h-dvh flex-col items-center justify-center gap-5 bg-[var(--md-sys-color-surface)]">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
          <Icon name="restaurant" filled size={32} />
        </span>
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[var(--md-sys-color-primary)] border-t-transparent" />
        <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">Cargando RestaurantOS…</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <BranchProvider>
          <RouterProvider router={router} />
        </BranchProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
