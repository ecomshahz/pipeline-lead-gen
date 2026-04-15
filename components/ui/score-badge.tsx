import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ScoreBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  score: number;
}

function getScoreStyle(score: number) {
  if (score >= 70) {
    return {
      bg: 'bg-[#EF4444]/15',
      text: 'text-[#EF4444]',
      border: 'border-[#EF4444]/25',
      label: 'Hot',
    };
  }
  if (score >= 40) {
    return {
      bg: 'bg-[#F59E0B]/15',
      text: 'text-[#F59E0B]',
      border: 'border-[#F59E0B]/25',
      label: 'Warm',
    };
  }
  return {
    bg: 'bg-[#3B82F6]/15',
    text: 'text-[#60A5FA]',
    border: 'border-[#3B82F6]/25',
    label: 'Cold',
  };
}

const ScoreBadge = React.forwardRef<HTMLSpanElement, ScoreBadgeProps>(
  ({ score, className, ...props }, ref) => {
    const style = getScoreStyle(score);

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
          style.bg,
          style.text,
          style.border,
          className
        )}
        {...props}
      >
        <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums">
          {score}
        </span>
        <span className="font-[family-name:var(--font-geist-sans)] text-[0.65rem] uppercase tracking-wider opacity-75">
          {style.label}
        </span>
      </span>
    );
  }
);

ScoreBadge.displayName = 'ScoreBadge';

export { ScoreBadge };
