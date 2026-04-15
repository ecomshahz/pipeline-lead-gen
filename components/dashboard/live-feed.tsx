'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { timeAgo } from '@/lib/utils';
import { getScoreBadgeColor, getScoreLabel } from '@/lib/scoring';

interface FeedItem {
  id: string;
  business_name: string;
  city: string;
  state: string;
  niche: string;
  lead_score: number;
  created_at: string;
}

export function LiveFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Live Feed</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
          <span className="text-xs text-muted">Live</span>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted text-sm">
              No leads yet. Start a scrape job to see results here.
            </div>
          ) : (
            items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-5 py-3 border-b border-border/50 hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.business_name}
                    </p>
                    <p className="text-xs text-muted">
                      {item.niche} · {item.city}, {item.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${getScoreBadgeColor(item.lead_score)}`}
                    >
                      {item.lead_score}
                    </span>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
