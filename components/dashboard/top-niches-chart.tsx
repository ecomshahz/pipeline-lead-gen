'use client';

import { motion } from 'framer-motion';

interface NicheData {
  niche: string;
  total: number;
  hot: number;
}

export function TopNichesChart({ data }: { data: NicheData[] }) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Top Niches by Hot Leads</h3>

      {data.length === 0 ? (
        <div className="py-8 text-center text-muted text-sm">
          No niche data yet
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.niche}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm truncate mr-3">{item.niche}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-accent-red font-mono">
                    {item.hot} hot
                  </span>
                  <span className="text-xs text-muted font-mono">
                    / {item.total}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.total / maxTotal) * 100}%` }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
