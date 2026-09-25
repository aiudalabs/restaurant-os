import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--md-sys-color-surface-container)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
            <Icon name="restaurant" filled size={32} />
          </span>
          <h1 className="t-headline-medium text-[var(--md-sys-color-on-surface)]">RestaurantOS</h1>
          <p className="t-body-medium mt-1 text-[var(--md-sys-color-on-surface-variant)]">Panel de administración</p>
        </div>

        <div className="rounded-[28px] bg-[var(--md-sys-color-surface)] p-6 [--field-bg:var(--md-sys-color-surface)] sm:p-8">{children}</div>
      </div>
    </div>
  );
}
