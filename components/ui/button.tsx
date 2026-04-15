'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default:
    'bg-[#3B82F6] text-white hover:bg-[#2563EB] active:bg-[#1D4ED8] shadow-sm shadow-blue-500/20',
  secondary:
    'bg-[#1E1E2A] text-[#E4E4E7] hover:bg-[#2A2A3A] active:bg-[#333346] border border-[#1E1E2A]',
  destructive:
    'bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C] shadow-sm shadow-red-500/20',
  ghost:
    'text-[#E4E4E7] hover:bg-[#1E1E2A] active:bg-[#2A2A3A]',
  outline:
    'border border-[#1E1E2A] text-[#E4E4E7] hover:bg-[#1E1E2A] active:bg-[#2A2A3A] bg-transparent',
} as const;

const sizeStyles = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  asChild?: boolean;
}

const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const buttonClasses = (
  variant: keyof typeof variantStyles,
  size: keyof typeof sizeStyles,
  className?: string
) =>
  cn(
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]',
    'disabled:opacity-50 disabled:pointer-events-none',
    'select-none whitespace-nowrap',
    'font-[family-name:var(--font-geist-sans)]',
    variantStyles[variant],
    sizeStyles[size],
    className
  );

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & { className?: string }
      >;
      return React.cloneElement(child, {
        ...props,
        ...(child.props as Record<string, unknown>),
        className: cn(
          buttonClasses(variant, size, className),
          child.props.className
        ),
        ref,
      } as Record<string, unknown>);
    }

    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, className)}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Spinner className="shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
