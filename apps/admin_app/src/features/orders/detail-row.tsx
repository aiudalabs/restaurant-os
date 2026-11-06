import type { ReactNode } from 'react';

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="t-body-medium text-[var(--ink-soft)]">{label}</dt>
      <dd className="t-body-medium tnum text-right text-[var(--ink)]">{children}</dd>
    </div>
  );
}
