'use client';

import { motion } from 'framer-motion';

interface ScoreDistributionProps {
  hot: number;
  warm: number;
  cold: number;
}

export function ScoreDistribution({ hot, warm, cold }: ScoreDistributionProps) {
  const total = hot + warm + cold || 1;
  const hotPct = (hot / total) * 100;
  const warmPct = (warm / total) * 100;
  const coldPct = (cold / total) * 100;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Lead Score Distribution</h3>

      <div className="space-y-4">
        <DistributionBar
          label="Hot"
          count={hot}
          percentage={hotPct}
          color="bg-accent-red"
          delay={0}
        />
        <DistributionBar
          label="Warm"
          count={warm}
          percentage={warmPct}
          color="bg-accent-amber"
          delay={0.1}
        />
        <DistributionBar
          label="Cold"
          count={cold}
          percentage={coldPct}
          color="bg-accent-blue"
          delay={0.2}
        />
      </div>

      {/* Stacked bar */}
      <div className="mt-5 flex h-3 rounded-full overflow-hidden bg-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${hotPct}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-accent-red"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${warmPct}%` }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-accent-amber"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${coldPct}%` }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="bg-accent-blue"
        />
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  count,
  percentage,
  color,
  delay,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <span className="text-sm text-muted">{label} Leads</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium">{count}</span>
          <span className="text-xs text-muted">({percentage.toFixed(1)}%)</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
