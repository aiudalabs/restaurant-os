import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // M3 variants: primary = filled, ghost = text. `secondary` kept as an alias of tonal.
  variant?: 'primary' | 'tonal' | 'secondary' | 'outlined' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  /** Leading Material Symbol. */
  icon?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
  tonal: 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]',
  secondary: 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]',
  outlined: 'border border-[var(--md-sys-color-outline)] bg-transparent text-[var(--md-sys-color-primary)]',
  ghost: 'bg-transparent text-[var(--md-sys-color-primary)]',
  destructive: 'bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]',
};

// M3 common button: 40dp tall, full shape, label-large.
const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-9 px-4',
  md: 'h-10 px-6',
  lg: 'h-12 px-8',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'm3-state t-label-large inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full',
          'disabled:pointer-events-none disabled:opacity-40',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          icon && size === 'md' && 'pl-4',
          variant === 'ghost' && 'px-3',
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {icon && <Icon name={icon} size={18} />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  /** Accessible name — icon buttons have no visible text. */
  label: string;
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  filled?: boolean;
}

const ICON_VARIANTS: Record<string, string> = {
  standard: 'text-[var(--md-sys-color-on-surface-variant)]',
  filled: 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
  tonal: 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]',
  outlined: 'border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)]',
};

/** M3 icon button: 40dp target with a 24dp icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'standard', filled, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'm3-state inline-grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:pointer-events-none disabled:opacity-40',
        ICON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon name={icon} filled={filled} />
    </button>
  ),
);

IconButton.displayName = 'IconButton';
