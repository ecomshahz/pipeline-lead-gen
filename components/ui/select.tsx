import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[#E4E4E7] mb-1.5 font-[family-name:var(--font-geist-sans)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border bg-[#111118] px-3 py-2 pr-8 text-sm text-[#E4E4E7]',
              'font-[family-name:var(--font-geist-sans)]',
              'border-[#1E1E2A]',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1 focus:ring-offset-[#0A0A0F] focus:border-[#3B82F6]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-[#EF4444] focus:ring-[#EF4444] focus:border-[#EF4444]',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg
              className="h-4 w-4 text-[#71717A]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-[#EF4444] font-[family-name:var(--font-geist-sans)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
