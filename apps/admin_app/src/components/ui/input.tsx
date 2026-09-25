import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id?: string;
  label?: string;
  error?: string;
  isRequired?: boolean;
  supporting?: ReactNode;
  children: ReactNode;
}

/**
 * M3 outlined text field frame: the label sits in a notch on the outline. The
 * notch background comes from --field-bg, which cards and dialogs set to their
 * own surface color.
 */
function FieldShell({ id, label, error, isRequired, supporting, children }: FieldShellProps) {
  return (
    <div className="space-y-1">
      <div className="relative">
        {children}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              't-body-small pointer-events-none absolute -top-2 left-3 px-1',
              'bg-[var(--field-bg,var(--md-sys-color-surface))]',
              error ? 'text-[var(--md-sys-color-error)]' : 'text-[var(--md-sys-color-on-surface-variant)]',
            )}
          >
            {label}
            {isRequired && <span className="ml-0.5 text-[var(--md-sys-color-error)]">*</span>}
          </label>
        )}
      </div>
      {error ? (
        <p className="t-body-small px-4 text-[var(--md-sys-color-error)]">{error}</p>
      ) : (
        supporting && <p className="t-body-small px-4 text-[var(--md-sys-color-on-surface-variant)]">{supporting}</p>
      )}
    </div>
  );
}

const FIELD_CLASSES = cn(
  't-body-large w-full rounded-[4px] border border-[var(--md-sys-color-outline)] bg-transparent px-4',
  'text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/70',
  'hover:border-[var(--md-sys-color-on-surface)]',
  'focus:border-2 focus:border-[var(--md-sys-color-primary)] focus:px-[15px] focus:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-40',
);
const ERROR_CLASSES = 'border-[var(--md-sys-color-error)] focus:border-[var(--md-sys-color-error)]';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
  supporting?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, isRequired, supporting, ...props }, ref) => (
    <FieldShell id={id} label={label} error={error} isRequired={isRequired} supporting={supporting}>
      <input ref={ref} id={id} className={cn(FIELD_CLASSES, 'h-14', error && ERROR_CLASSES, className)} {...props} />
    </FieldShell>
  ),
);
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
  supporting?: ReactNode;
}

/** Outlined select with the same frame as Input. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, isRequired, supporting, children, ...props }, ref) => (
    <FieldShell id={id} label={label} error={error} isRequired={isRequired} supporting={supporting}>
      <select
        ref={ref}
        id={id}
        className={cn(FIELD_CLASSES, 'h-14 appearance-none pr-10', error && ERROR_CLASSES, className)}
        {...props}
      >
        {children}
      </select>
      <span className="ms pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" aria-hidden="true" style={{ fontSize: 24 }}>
        arrow_drop_down
      </span>
    </FieldShell>
  ),
);
Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
  supporting?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, isRequired, supporting, ...props }, ref) => (
    <FieldShell id={id} label={label} error={error} isRequired={isRequired} supporting={supporting}>
      <textarea
        ref={ref}
        id={id}
        className={cn(FIELD_CLASSES, 'min-h-24 py-4 focus:py-[15px]', error && ERROR_CLASSES, className)}
        {...props}
      />
    </FieldShell>
  ),
);
Textarea.displayName = 'Textarea';
