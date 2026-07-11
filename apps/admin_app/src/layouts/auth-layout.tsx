import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-surface)] px-4">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-3xl text-[var(--color-on-primary)] shadow-[var(--shadow-e2)]">
            🍽️
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RestaurantOS</h1>
          <p className="mt-1 text-sm text-gray-500">Panel de administración</p>
        </div>

        <div className="m3-card p-8">{children}</div>
      </div>
    </div>
  );
}
