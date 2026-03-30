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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Cargando...</p>
        </div>
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
