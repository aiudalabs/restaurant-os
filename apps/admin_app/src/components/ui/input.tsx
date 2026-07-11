import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
}

// Material 3 filled text field: tonal surface, rounded top corners, primary
// focus underline, label above.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, isRequired, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
            {label}
            {isRequired && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'flex h-12 w-full rounded-xl bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)]',
            'border border-transparent placeholder:text-[var(--color-on-surface-variant)]/60',
            'transition-colors focus:outline-none focus:border-orange-600 focus:bg-[var(--color-surface-container)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
