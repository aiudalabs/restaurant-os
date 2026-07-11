import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Material 3 button variants. `secondary` kept as an alias for back-compat.
  variant?: 'primary' | 'tonal' | 'secondary' | 'outlined' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

// M3 buttons are fully-rounded ("stadium") with a state layer on hover/press.
const VARIANT_CLASSES: Record<string, string> = {
  primary:
    'bg-orange-600 text-[var(--color-on-primary)] shadow-[var(--shadow-e1)] hover:shadow-[var(--shadow-e2)]',
  tonal: 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]',
  secondary: 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]',
  outlined: 'border border-[var(--color-outline)] text-orange-600 bg-transparent',
  ghost: 'text-orange-600 bg-transparent',
  destructive: 'bg-red-600 text-white shadow-[var(--shadow-e1)]',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'm3-state inline-flex items-center justify-center gap-2 rounded-full font-semibold',
          'transition-shadow duration-150 select-none',
          'disabled:pointer-events-none disabled:opacity-40',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        disabled={disabled}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
