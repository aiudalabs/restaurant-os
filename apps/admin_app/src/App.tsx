import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthContext, useAuthProvider } from '@/hooks/use-auth';
import { router } from '@/router';

const queryClient = new QueryClient();

export default function App() {
  const auth = useAuthProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
