import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthContext, useAuthProvider } from '@/hooks/use-auth';
import { BranchProvider } from '@/hooks/use-branch-context';
import { router } from '@/router';

const queryClient = new QueryClient();

export default function App() {
  const auth = useAuthProvider();

  if (auth.loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-[var(--color-surface)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-3xl text-[var(--color-on-primary)] shadow-[var(--shadow-e2)]">
          🍽️
        </div>
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-orange-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Cargando RestaurantOS…</p>
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
