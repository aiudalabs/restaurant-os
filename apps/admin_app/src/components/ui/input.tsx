import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, isRequired, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
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
