import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { IconButton } from './button';

// ─── Card ───────────────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'outlined' | 'filled' | 'elevated';
}

const CARD: Record<string, string> = {
  outlined: 'm3-card-outlined [--field-bg:var(--md-sys-color-surface)]',
  filled: 'm3-card-filled [--field-bg:var(--md-sys-color-surface-container-highest)]',
  elevated: 'm3-card [--field-bg:var(--md-sys-color-surface-container-low)]',
};

/** M3 card (medium corners). Outlined by default — tonal surfaces over shadows. */
export function Card({ variant = 'outlined', className, ...props }: CardProps) {
  return <div className={cn(CARD[variant], className)} {...props} />;
}

// ─── Chips ──────────────────────────────────────────────────────────────────

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  icon?: string;
  children: ReactNode;
  className?: string;
}

/** M3 filter chip: 32dp, small corners; selected shows a check on secondary-container. */
export function FilterChip({ selected, onClick, icon, children, className }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'm3-state t-label-large inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-4 whitespace-nowrap',
        selected
          ? 'bg-[var(--md-sys-color-secondary-container)] pl-2 text-[var(--md-sys-color-on-secondary-container)]'
          : 'border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]',
        className,
      )}
    >
      {selected ? <Icon name="check" size={18} /> : icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

/** Non-interactive M3 assist-style chip for tags (e.g. categories of a station). */
export function TagChip({ icon, children, className }: { icon?: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        't-label-large inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--md-sys-color-outline-variant)] px-3 text-[var(--md-sys-color-on-surface-variant)]',
        className,
      )}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </span>
  );
}

// ─── Status chip ────────────────────────────────────────────────────────────

export type StatusTone = 'success' | 'info' | 'error' | 'neutral' | 'outline';

const TONE: Record<StatusTone, string> = {
  success: 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]',
  info: 'bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]',
  error: 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]',
  neutral: 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]',
  outline: 'border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]',
};

/** Compact status label. Tone mapping: listo → success, en cocina → info, por cobrar/alerta → error. */
export function StatusChip({ tone, icon, children, className }: { tone: StatusTone; icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('t-label-medium inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-lg px-2.5', icon && 'pl-2', TONE[tone], className)}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}

// ─── Switch ─────────────────────────────────────────────────────────────────

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/** M3 switch (52×32 track). Pass `label` when there is no visible <label for>. */
export function Switch({ id, checked, onChange, disabled, label }: SwitchProps) {
  return (
    <span className="relative inline-block h-8 w-[52px] shrink-0">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        className={cn(
          'absolute inset-0 rounded-full border-2 transition-colors duration-200',
          checked
            ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]'
            : 'border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)]',
          'peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--md-sys-color-primary)]',
          'peer-disabled:opacity-40',
        )}
      />
      <span
        className={cn(
          'absolute rounded-full transition-all duration-200 [transition-timing-function:var(--md-ease-emphasized)]',
          checked
            ? 'left-6 top-1 h-6 w-6 bg-[var(--md-sys-color-on-primary)]'
            : 'left-2 top-2 h-4 w-4 bg-[var(--md-sys-color-outline)]',
        )}
      />
    </span>
  );
}

// ─── Segmented button ───────────────────────────────────────────────────────

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string; icon?: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** M3 single-select segmented button. */
export function Segmented<T extends string>({ value, options, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-full border border-[var(--md-sys-color-outline)]', className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'm3-state t-label-large inline-flex h-10 shrink-0 items-center gap-2 px-4 whitespace-nowrap',
              i > 0 && 'border-l border-[var(--md-sys-color-outline)]',
              on
                ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                : 'text-[var(--md-sys-color-on-surface)]',
            )}
          >
            {on ? <Icon name="check" size={18} /> : o.icon && <Icon name={o.icon} size={18} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Side sheet ─────────────────────────────────────────────────────────────

interface SideSheetProps {
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** M3 modal side sheet (right edge, large corners on the inner side). Full width on phones. */
export function SideSheet({ title, onClose, footer, children }: SideSheetProps) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} style={{ animation: 'm3-fade-in 150ms linear' }} />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-[var(--md-sys-color-surface-container-low)] [--field-bg:var(--md-sys-color-surface-container-low)] sm:w-[420px] sm:rounded-l-2xl"
        style={{ animation: 'm3-sheet-in 350ms var(--md-ease-emphasized-decelerate)' }}
      >
        <div className="flex shrink-0 items-center gap-2 py-3 pl-6 pr-3">
          <h2 className="t-title-large min-w-0 flex-1 text-[var(--md-sys-color-on-surface)]">{title}</h2>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--md-sys-color-outline-variant)] px-6 py-4">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Icon name={icon} size={40} className="text-[var(--md-sys-color-on-surface-variant)]" />
      <p className="t-title-medium text-[var(--md-sys-color-on-surface)]">{title}</p>
      {body && <p className="t-body-medium max-w-md text-[var(--md-sys-color-on-surface-variant)]">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Page header ────────────────────────────────────────────────────────────

/** Section intro under the top app bar: headline + supporting text + actions. */
export function PageHeader({ title, subtitle, actions }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-2">
      <div className="min-w-0">
        {title && <h2 className="t-headline-small text-[var(--md-sys-color-on-surface)]">{title}</h2>}
        {subtitle && <p className="t-body-medium mt-1 text-[var(--md-sys-color-on-surface-variant)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Extended FAB ───────────────────────────────────────────────────────────

/** M3 extended FAB, fixed bottom-right (clears the bottom nav bar on phones). */
export function ExtendedFab({ icon, children, onClick }: { icon: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="m3-state t-label-large fixed bottom-[calc(96px+env(safe-area-inset-bottom,0px))] right-4 z-30 inline-flex h-14 items-center gap-3 rounded-2xl bg-[var(--md-sys-color-primary-container)] pl-4 pr-5 text-[var(--md-sys-color-on-primary-container)] shadow-[var(--shadow-e3)] sm:bottom-6 sm:right-6"
    >
      <Icon name={icon} />
      {children}
    </button>
  );
}
