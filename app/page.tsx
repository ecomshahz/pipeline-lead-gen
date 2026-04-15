'use client';

import { useAnalytics } from '@/hooks/use-analytics';
import { LiveFeed } from '@/components/dashboard/live-feed';
import { ScoreDistribution } from '@/components/dashboard/score-distribution';
import { TopNichesChart } from '@/components/dashboard/top-niches-chart';
import { ScrapeStatus } from '@/components/dashboard/scrape-status';
import { motion } from 'framer-motion';
import {
  Users,
  Flame,
  Mail,
  Handshake,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const { data, loading } = useAnalytics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted text-sm mt-1">
          Your lead generation pipeline at a glance
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Leads"
          value={data?.overview.totalLeads ?? 0}
          icon={Users}
          color="text-accent-blue"
          loading={loading}
        />
        <StatCard
          label="Hot Leads"
          value={data?.overview.hotLeads ?? 0}
          icon={Flame}
          color="text-accent-red"
          loading={loading}
        />
        <StatCard
          label="Emails Today"
          value={data?.overview.emailsSentToday ?? 0}
          icon={Mail}
          color="text-accent-amber"
          loading={loading}
        />
        <StatCard
          label="Deals This Month"
          value={data?.monthlyTotals.deals_closed ?? 0}
          icon={Handshake}
          color="text-accent-green"
          loading={loading}
        />
        <StatCard
          label="Revenue"
          value={data?.monthlyTotals.revenue ?? 0}
          icon={DollarSign}
          color="text-accent-green"
          loading={loading}
          format="currency"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Live Feed */}
        <div className="lg:col-span-2">
          <LiveFeed items={data?.recentLeads ?? []} />
        </div>

        {/* Right column — Score Distribution + Scrape Status */}
        <div className="space-y-6">
          <ScoreDistribution
            hot={data?.overview.hotLeads ?? 0}
            warm={data?.overview.warmLeads ?? 0}
            cold={data?.overview.coldLeads ?? 0}
          />
          <ScrapeStatus jobs={data?.activeJobs ?? []} />
        </div>
      </div>

      {/* Bottom row — Top Niches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopNichesChart data={data?.topNiches ?? []} />

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              href="/scraper"
              label="Start Scraping"
              description="Find new leads"
              color="bg-accent-blue/10 text-accent-blue border-accent-blue/20"
            />
            <QuickActionButton
              href="/leads?sort=lead_score&order=desc&minScore=70"
              label="View Hot Leads"
              description="Score 70+"
              color="bg-accent-red/10 text-accent-red border-accent-red/20"
            />
            <QuickActionButton
              href="/emails"
              label="Send Emails"
              description="Cold outreach"
              color="bg-accent-amber/10 text-accent-amber border-accent-amber/20"
            />
            <QuickActionButton
              href="/analytics"
              label="View Analytics"
              description="Charts & trends"
              color="bg-accent-green/10 text-accent-green border-accent-green/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
  format,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
  format?: 'currency' | 'number';
}) {
  const displayValue =
    format === 'currency' ? formatCurrency(value) : formatNumber(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted uppercase tracking-wider">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      {loading ? (
        <div className="h-8 skeleton rounded w-20" />
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold font-mono tracking-tight"
        >
          {displayValue}
        </motion.p>
      )}
    </motion.div>
  );
}

function QuickActionButton({
  href,
  label,
  description,
  color,
}: {
  href: string;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className={`flex flex-col p-4 rounded-lg border transition-all hover:scale-[1.02] ${color}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs opacity-70 mt-0.5">{description}</span>
    </a>
  );
}
