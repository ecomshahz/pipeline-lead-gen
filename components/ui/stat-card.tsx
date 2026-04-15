'use client';

import * as React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: number;
  /** Format function applied to the animated number for display. Defaults to locale string. */
  formatValue?: (value: number) => string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
  className?: string;
}

function AnimatedNumber({
  value,
  formatValue,
}: {
  value: number;
  formatValue: (v: number) => string;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => formatValue(Math.round(latest)));
  const [display, setDisplay] = React.useState(formatValue(0));

  React.useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: [0.32, 0.72, 0, 1],
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);

  return <>{display}</>;
}

const TrendArrow = ({ direction }: { direction: 'up' | 'down' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(direction === 'down' && 'rotate-180')}
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

export function StatCard({
  label,
  value,
  formatValue = (v) => v.toLocaleString(),
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        'rounded-xl border border-[#1E1E2A] bg-[#111118] p-6',
        'transition-colors duration-200 hover:border-[#2A2A3A]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[#71717A] font-[family-name:var(--font-geist-sans)]">
          {label}
        </p>
        {icon && (
          <div className="text-[#71717A]">{icon}</div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="text-3xl font-bold text-white tracking-tight font-[family-name:var(--font-geist-sans)]">
          <AnimatedNumber value={value} formatValue={formatValue} />
        </span>

        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium mb-1',
              trend.direction === 'up'
                ? 'bg-[#10B981]/15 text-[#10B981]'
                : 'bg-[#EF4444]/15 text-[#EF4444]'
            )}
          >
            <TrendArrow direction={trend.direction} />
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
