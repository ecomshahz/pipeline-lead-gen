'use client';

import { useAnalytics } from '@/hooks/use-analytics';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  meeting_scheduled: 'Meeting',
  proposal_sent: 'Proposal',
  closed_won: 'Won',
  closed_lost: 'Lost',
  not_interested: 'Not Interested',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  contacted: '#8B5CF6',
  follow_up: '#F59E0B',
  meeting_scheduled: '#10B981',
  proposal_sent: '#06B6D4',
  closed_won: '#22C55E',
  closed_lost: '#EF4444',
  not_interested: '#71717A',
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AnalyticsPage() {
  const { data, loading } = useAnalytics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted text-sm mt-1">Performance metrics and trends</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <div className="skeleton h-5 w-40 rounded mb-4" />
              <div className="skeleton h-48 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trendData = data?.trendData ?? [];
  const statusData = Object.entries(data?.statusBreakdown ?? {}).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#71717A',
  }));

  const funnelData = [
    { stage: 'New', count: data?.statusBreakdown?.new ?? 0 },
    { stage: 'Contacted', count: data?.statusBreakdown?.contacted ?? 0 },
    { stage: 'Follow Up', count: data?.statusBreakdown?.follow_up ?? 0 },
    { stage: 'Meeting', count: data?.statusBreakdown?.meeting_scheduled ?? 0 },
    { stage: 'Proposal', count: data?.statusBreakdown?.proposal_sent ?? 0 },
    { stage: 'Won', count: data?.statusBreakdown?.closed_won ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted text-sm mt-1">Performance metrics and trends</p>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Leads Scraped" value={formatNumber(data?.monthlyTotals.leads_scraped ?? 0)} />
        <SummaryCard label="Emails Sent" value={formatNumber(data?.monthlyTotals.emails_sent ?? 0)} />
        <SummaryCard label="Meetings Booked" value={formatNumber(data?.monthlyTotals.meetings_booked ?? 0)} />
        <SummaryCard label="Revenue" value={formatCurrency(data?.monthlyTotals.revenue ?? 0)} highlight />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold text-sm mb-4">Leads Over Time (30 Days)</h3>
          {trendData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                <XAxis
                  dataKey="date"
                  stroke="#71717A"
                  fontSize={11}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid #1E1E2A', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                />
                <Line type="monotone" dataKey="leads_scraped" stroke="#3B82F6" strokeWidth={2} dot={false} name="Leads" />
                <Line type="monotone" dataKey="emails_sent" stroke="#10B981" strokeWidth={2} dot={false} name="Emails" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Conversion Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold text-sm mb-4">Conversion Funnel</h3>
          {funnelData.every((d) => d.count === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" horizontal={false} />
                <XAxis type="number" stroke="#71717A" fontSize={11} />
                <YAxis type="category" dataKey="stage" stroke="#71717A" fontSize={11} width={70} />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid #1E1E2A', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Leads">
                  {funnelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold text-sm mb-4">Lead Status Distribution</h3>
          {statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111118', border: '1px solid #1E1E2A', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-xs text-muted">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Top Niches by Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold text-sm mb-4">Top Niches by Hot Leads</h3>
          {(data?.topNiches ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.topNiches ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                <XAxis dataKey="niche" stroke="#71717A" fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid #1E1E2A', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="hot" fill="#EF4444" radius={[4, 4, 0, 0]} name="Hot Leads" />
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total Leads" opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${highlight ? 'text-accent-green' : ''}`}>
        {value}
      </p>
      <p className="text-xs text-muted mt-1">This month</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[200px] text-muted text-sm">
      No data available yet
    </div>
  );
}
