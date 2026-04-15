import * as React from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default:
    'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/25',
  hot:
    'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25',
  warm:
    'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25',
  cold:
    'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/25',
  success:
    'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/25',
  secondary:
    'bg-[#71717A]/15 text-[#A1A1AA] border-[#71717A]/25',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        'font-[family-name:var(--font-geist-sans)]',
        'transition-colors duration-150',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

export { Badge };
