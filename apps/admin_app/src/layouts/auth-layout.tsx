import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">RestaurantOS</h1>
          <p className="mt-2 text-sm text-gray-500">Panel de Administración</p>
        </div>
        {children}
      </div>
    </div>
  );
}
