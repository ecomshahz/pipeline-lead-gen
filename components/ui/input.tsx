import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#E4E4E7] mb-1.5 font-[family-name:var(--font-geist-sans)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-[#111118] px-3 py-2 text-sm text-[#E4E4E7]',
            'font-[family-name:var(--font-geist-sans)]',
            'border-[#1E1E2A]',
            'placeholder:text-[#71717A]',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1 focus:ring-offset-[#0A0A0F] focus:border-[#3B82F6]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#E4E4E7]',
            error && 'border-[#EF4444] focus:ring-[#EF4444] focus:border-[#EF4444]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-[#EF4444] font-[family-name:var(--font-geist-sans)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
