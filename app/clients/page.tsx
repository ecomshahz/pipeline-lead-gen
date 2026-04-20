'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  DollarSign,
  Plus,
  RotateCcw,
  X,
  Loader2,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  Trash2,
  Pencil,
  Eye,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Square,
  CheckSquare,
  MinusSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Client,
  ClientPayment,
  ClientStatus,
  BillingType,
  RevenueMetrics,
} from '@/types';

// ---- Constants ----

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: 'Monthly',
  retainer: 'Retainer',
  one_time: 'One-Time',
  project: 'Project',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
  completed: 'Completed',
};

function statusColor(status: ClientStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'paused':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'completed':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'churned':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}

function billingColor(billing: BillingType): string {
  switch (billing) {
    case 'monthly':
    case 'retainer':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'one_time':
    case 'project':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  }
}

function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

function formatMoneyPrecise(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function formatShortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function monthLabel(ym: string): string {
  // '2026-04' -> 'Apr'
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

// ---- Page ----

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [billingFilter, setBillingFilter] = useState<BillingType | 'all'>('all');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, metricsRes] = await Promise.all([
        fetch('/api/clients').then((r) => r.json()),
        fetch('/api/clients/revenue').then((r) => r.json()),
      ]);
      setClients(clientsRes.clients ?? []);
      setMetrics(metricsRes);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (billingFilter !== 'all' && c.billing_type !== billingFilter) return false;
      return true;
    });
  }, [clients, statusFilter, billingFilter]);

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  // ---- Selection helpers ----

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      // If every filtered row is already selected, clear. Otherwise select all visible.
      const allSelected = filtered.length > 0 && filtered.every((c) => prev.has(c.id));
      if (allSelected) return new Set();
      return new Set(filtered.map((c) => c.id));
    });
  }, [filtered]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const allOnPageSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someOnPageSelected = filtered.some((c) => selectedIds.has(c.id));

  const deleteOne = useCallback(
    async (client: Client) => {
      const confirmMsg = `Delete ${client.business_name}? This also removes their payment history. Cannot be undone.`;
      if (!confirm(confirmMsg)) return;
      setDeleting(true);
      try {
        const res = await fetch(`/api/clients?id=${client.id}`, { method: 'DELETE' });
        if (res.ok) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(client.id);
            return next;
          });
          await refresh();
        }
      } finally {
        setDeleting(false);
      }
    },
    [refresh]
  );

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmMsg =
      selectedIds.size === 1
        ? 'Delete 1 client? This also removes their payment history. Cannot be undone.'
        : `Delete ${selectedIds.size} clients? This also removes all their payment history. Cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      // Parallel DELETE calls — fine for dozens of clients.
      // Falls back to sequential if we ever hit a rate limit (we won't on Supabase service key).
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/clients?id=${id}`, { method: 'DELETE' })
        )
      );
      clearSelection();
      await refresh();
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, refresh, clearSelection]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-6 lg:p-10">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Briefcase className="w-7 h-7 text-[#3B82F6]" />
              Clients
            </h1>
            <p className="text-sm text-[#71717A] mt-1">
              Closed business, revenue, and who we&rsquo;re billing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E1E2A] bg-[#111118] text-sm text-[#71717A] hover:text-white hover:border-[#3B82F6]/50 transition-colors"
            >
              <RotateCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add client
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="MRR"
            value={metrics ? formatMoney(metrics.mrr_cents) : '—'}
            sub={metrics ? `${metrics.active_clients} active clients` : ''}
            accent="text-green-400"
          />
          <MetricCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Total revenue"
            value={metrics ? formatMoney(metrics.total_revenue_cents) : '—'}
            sub={metrics && metrics.avg_deal_cents > 0 ? `avg ${formatMoney(metrics.avg_deal_cents)} / payment` : 'no payments logged'}
            accent="text-[#3B82F6]"
          />
          <MetricCard
            icon={<Calendar className="w-4 h-4" />}
            label="This month"
            value={metrics ? formatMoney(metrics.this_month_cents) : '—'}
            sub={
              metrics
                ? metrics.last_month_cents > 0
                  ? `last month ${formatMoney(metrics.last_month_cents)}`
                  : 'no revenue last month'
                : ''
            }
            accent="text-amber-400"
          />
          <MetricCard
            icon={<Users className="w-4 h-4" />}
            label="Active"
            value={metrics ? String(metrics.active_clients) : '—'}
            sub={
              metrics
                ? [
                    metrics.completed_clients > 0 && `${metrics.completed_clients} completed`,
                    metrics.paused_clients > 0 && `${metrics.paused_clients} paused`,
                    metrics.churned_clients > 0 && `${metrics.churned_clients} churned`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'clean pipeline'
                : ''
            }
            accent="text-purple-400"
          />
        </div>

        {/* 12-month revenue chart */}
        {metrics && metrics.monthly_revenue.length > 0 && (
          <RevenueChart data={metrics.monthly_revenue} />
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
          <FilterPill
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            All status
          </FilterPill>
          {(['active', 'paused', 'completed', 'churned'] as ClientStatus[]).map((s) => (
            <FilterPill
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s]}
            </FilterPill>
          ))}
          <div className="w-px h-6 bg-[#1E1E2A] mx-2" />
          <FilterPill
            active={billingFilter === 'all'}
            onClick={() => setBillingFilter('all')}
          >
            All billing
          </FilterPill>
          {(['monthly', 'retainer', 'one_time', 'project'] as BillingType[]).map((b) => (
            <FilterPill
              key={b}
              active={billingFilter === b}
              onClick={() => setBillingFilter(b)}
            >
              {BILLING_TYPE_LABELS[b]}
            </FilterPill>
          ))}
          <div className="ml-auto text-xs text-[#71717A]">
            {filtered.length} of {clients.length} clients
          </div>
        </div>

        {/* Bulk action bar — slides in when any rows are selected */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30"
            >
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[#3B82F6] font-medium">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-[#71717A] hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete selected
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client table */}
        <div className="bg-[#111118] border border-[#1E1E2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="w-12 px-4 py-3">
                    <button
                      onClick={toggleAll}
                      disabled={filtered.length === 0}
                      className="text-[#71717A] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Select all"
                    >
                      {allOnPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#3B82F6]" />
                      ) : someOnPageSelected ? (
                        <MinusSquare className="w-4 h-4 text-[#3B82F6]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Billing</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#71717A] uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#71717A] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && clients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <Loader2 className="w-6 h-6 text-[#3B82F6] animate-spin mx-auto mb-3" />
                      <span className="text-sm text-[#71717A]">Loading clients...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <Briefcase className="w-8 h-8 text-[#71717A] mx-auto mb-3" />
                      <p className="text-sm text-[#71717A] mb-1">
                        {clients.length === 0 ? 'No clients yet.' : 'No clients match these filters.'}
                      </p>
                      <p className="text-xs text-[#71717A]/70">
                        {clients.length === 0
                          ? 'Click "Add client" to track your first closed deal.'
                          : 'Try different filter options.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const checked = selectedIds.has(c.id);
                    return (
                    <tr
                      key={c.id}
                      onClick={() => setDetailId(c.id)}
                      className={cn(
                        'border-b border-[#1E1E2A] last:border-b-0 hover:bg-[#0F0F15] cursor-pointer transition-colors',
                        checked && 'bg-[#3B82F6]/5'
                      )}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleOne(c.id)}
                          className="text-[#71717A] hover:text-white transition-colors"
                          aria-label={checked ? 'Deselect' : 'Select'}
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-[#3B82F6]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{c.business_name}</div>
                        {c.city && c.state && (
                          <div className="text-xs text-[#71717A]">{c.city}, {c.state}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">{c.service_type}</div>
                        {c.niche && (
                          <div className="text-xs text-[#71717A] truncate max-w-[180px]">{c.niche}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                          billingColor(c.billing_type)
                        )}>
                          {BILLING_TYPE_LABELS[c.billing_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-[family-name:var(--font-geist-mono)] text-sm text-white">
                          {formatMoney(c.amount_cents, c.currency)}
                          {(c.billing_type === 'monthly' || c.billing_type === 'retainer') && (
                            <span className="text-[#71717A] text-xs ml-1">/mo</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#71717A]">
                        {formatShortDate(c.start_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                          statusColor(c.status)
                        )}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailId(c.id)}
                            title="View details & payments"
                            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1E1E2A] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit"
                            className="p-1 rounded text-[#71717A] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteOne(c)}
                            disabled={deleting}
                            title="Delete"
                            className="p-1 rounded text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {formOpen && (
          <ClientFormModal
            client={editingClient}
            onClose={() => {
              setFormOpen(false);
              setEditingClient(null);
            }}
            onSaved={() => {
              setFormOpen(false);
              setEditingClient(null);
              refresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailId && (
          <ClientDetailModal
            clientId={detailId}
            onClose={() => setDetailId(null)}
            onChanged={() => {
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Sub-components ----

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-[#111118] border border-[#1E1E2A] rounded-xl p-5">
      <div className={cn('flex items-center gap-2 text-xs font-medium mb-2', accent)}>
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white font-[family-name:var(--font-geist-mono)]">
        {value}
      </div>
      {sub && <div className="text-xs text-[#71717A] mt-1">{sub}</div>}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
        active
          ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#3B82F6]'
          : 'bg-[#111118] border-[#1E1E2A] text-[#71717A] hover:text-white hover:border-[#3B82F6]/30'
      )}
    >
      {children}
    </button>
  );
}

function RevenueChart({ data }: { data: Array<{ month: string; revenue_cents: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.revenue_cents));
  return (
    <div className="bg-[#111118] border border-[#1E1E2A] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
          Revenue — last 12 months
        </h3>
        <span className="text-xs text-[#71717A]">
          {formatMoney(data.reduce((s, d) => s + d.revenue_cents, 0))} total
        </span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => {
          const pct = (d.revenue_cents / max) * 100;
          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={`${d.month} — ${formatMoney(d.revenue_cents)}`}
            >
              <div className="flex-1 w-full flex items-end">
                <div
                  style={{ height: `${Math.max(pct, d.revenue_cents > 0 ? 4 : 0)}%` }}
                  className={cn(
                    'w-full rounded-t transition-colors',
                    d.revenue_cents > 0
                      ? 'bg-[#3B82F6]/60 group-hover:bg-[#3B82F6]'
                      : 'bg-[#1E1E2A]'
                  )}
                />
              </div>
              <div className="text-[10px] text-[#71717A] uppercase">{monthLabel(d.month)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Form Modal (Add + Edit) ----

function ClientFormModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!client;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: client?.business_name ?? '',
    owner_name: client?.owner_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    website_url: client?.website_url ?? '',
    city: client?.city ?? '',
    state: client?.state ?? '',
    niche: client?.niche ?? '',
    service_type: client?.service_type ?? 'AI Website',
    service_description: client?.service_description ?? '',
    billing_type: (client?.billing_type ?? 'monthly') as BillingType,
    amount: client ? client.amount_cents / 100 : 0,
    status: (client?.status ?? 'active') as ClientStatus,
    start_date: client?.start_date ?? new Date().toISOString().split('T')[0],
    notes: client?.notes ?? '',
  });

  // "Already paid?" toggle. Default ON for one-time/project (they're usually
  // collected upfront), OFF for monthly (recognized month-by-month).
  // Only meaningful on CREATE — existing clients log payments via the detail view.
  const [logInitialPayment, setLogInitialPayment] = useState(
    !isEdit && (form.billing_type === 'one_time' || form.billing_type === 'project')
  );
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('');

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Smart default for the "already paid" checkbox based on billing type
    if (key === 'billing_type' && !isEdit) {
      const bt = value as BillingType;
      setLogInitialPayment(bt === 'one_time' || bt === 'project');
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      // Only meaningful on create — don't confuse PATCH with it
      if (!isEdit && logInitialPayment) {
        payload.log_initial_payment = true;
        if (initialPaymentMethod) payload.initial_payment_method = initialPaymentMethod;
      }
      const res = await fetch('/api/clients', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: client!.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50"
        onClick={() => !saving && onClose()}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-2xl bg-[#111118] border border-[#1E1E2A] rounded-2xl shadow-2xl p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEdit ? 'Edit client' : 'Add a client'}
              </h3>
              <p className="text-sm text-[#71717A] mt-1">
                Track who we&rsquo;ve closed and what we&rsquo;re charging.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-[#71717A] hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="Business name" required>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                placeholder="Acme Salon"
                className="input"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact name">
                <input
                  type="text"
                  value={form.owner_name}
                  onChange={(e) => update('owner_name', e.target.value)}
                  placeholder="Jane Doe"
                  className="input"
                />
              </Field>
              <Field label="Niche">
                <input
                  type="text"
                  value={form.niche}
                  onChange={(e) => update('niche', e.target.value)}
                  placeholder="hair-salons"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Website">
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => update('website_url', e.target.value)}
                  placeholder="https://..."
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="City">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value.toUpperCase().slice(0, 2))}
                    className="input"
                  />
                </Field>
              </div>
            </div>

            <div className="h-px bg-[#1E1E2A] my-2" />

            <Field label="Service" required>
              <input
                type="text"
                value={form.service_type}
                onChange={(e) => update('service_type', e.target.value)}
                placeholder="AI Website, Automation, Paid Ads..."
                className="input"
              />
            </Field>

            <Field label="Service details">
              <textarea
                value={form.service_description}
                onChange={(e) => update('service_description', e.target.value)}
                placeholder="Scope, deliverables, what's included..."
                className="input min-h-[80px] resize-y"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Billing" required>
                <select
                  value={form.billing_type}
                  onChange={(e) => update('billing_type', e.target.value as BillingType)}
                  className="input"
                >
                  <option value="monthly">Monthly (MRR)</option>
                  <option value="retainer">Retainer</option>
                  <option value="one_time">One-time fee</option>
                  <option value="project">Project (fixed)</option>
                </select>
              </Field>
              <Field
                label={`Amount ${form.billing_type === 'monthly' || form.billing_type === 'retainer' ? '(per month)' : '(total)'}`}
                required
              >
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[#71717A] pointer-events-none text-sm z-10">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => update('amount', parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </Field>
            </div>

            {/* Auto-log initial payment (create flow only) */}
            {!isEdit && form.amount > 0 && (
              <div className="rounded-lg border border-[#1E1E2A] bg-[#0A0A0F] p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logInitialPayment}
                    onChange={(e) => setLogInitialPayment(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#1E1E2A] bg-[#0A0A0F] text-[#3B82F6] focus:ring-[#3B82F6]/30 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">
                      {form.billing_type === 'monthly' || form.billing_type === 'retainer'
                        ? 'Log the first month as received ($' + form.amount.toFixed(2) + ')'
                        : 'Payment already received ($' + form.amount.toFixed(2) + ')'}
                    </div>
                    <div className="text-xs text-[#71717A] mt-0.5">
                      Creates a payment record so Total Revenue reflects this amount immediately.
                    </div>
                    {logInitialPayment && (
                      <input
                        type="text"
                        value={initialPaymentMethod}
                        onChange={(e) => setInitialPaymentMethod(e.target.value)}
                        placeholder="Payment method (optional — stripe, wire, check, etc.)"
                        className="mt-2 w-full px-2 py-1.5 bg-[#111118] border border-[#1E1E2A] rounded-md text-xs text-white outline-none focus:border-[#3B82F6]"
                      />
                    )}
                  </div>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value as ClientStatus)}
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="churned">Churned</option>
                </select>
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update('start_date', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                className="input min-h-[60px] resize-y"
                placeholder="Anything else worth remembering..."
              />
            </Field>

            {error && (
              <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#71717A] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.business_name || !form.service_type}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isEdit ? 'Save changes' : 'Add client'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 10px 12px;
          background: #0A0A0F;
          border: 1px solid #1E1E2A;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        :global(.input:focus) {
          border-color: #3B82F6;
        }
      `}</style>
    </>
  );
}

// ---- Detail Modal ----

function ClientDetailModal({
  clientId,
  onClose,
  onChanged,
}: {
  clientId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-payment form
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingPayment, setAddingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?id=${clientId}`).then((r) => r.json());
      setClient(res.client ?? null);
      setPayments(res.payments ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount_cents, 0),
    [payments]
  );

  const addPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) return;
    setAddingPayment(true);
    try {
      const res = await fetch('/api/clients/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          amount: paymentAmount,
          description: paymentDesc || null,
          method: paymentMethod || null,
          paid_at: paymentDate,
        }),
      });
      if (res.ok) {
        setPaymentAmount(0);
        setPaymentDesc('');
        setPaymentMethod('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        await load();
        onChanged();
      }
    } finally {
      setAddingPayment(false);
    }
  };

  const removePayment = async (id: string) => {
    if (!confirm('Remove this payment?')) return;
    const res = await fetch(`/api/clients/payments?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      await load();
      onChanged();
    }
  };

  const deleteClient = async () => {
    if (!client) return;
    if (!confirm(`Delete ${client.business_name}? This also removes all their payments. This cannot be undone.`)) return;
    const res = await fetch(`/api/clients?id=${clientId}`, { method: 'DELETE' });
    if (res.ok) {
      onChanged();
      onClose();
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-3xl bg-[#111118] border border-[#1E1E2A] rounded-2xl shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
          {loading || !client ? (
            <div className="p-20 text-center">
              <Loader2 className="w-6 h-6 text-[#3B82F6] animate-spin mx-auto" />
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-[#1E1E2A]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-white">{client.business_name}</h3>
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                        statusColor(client.status)
                      )}>
                        {STATUS_LABELS[client.status]}
                      </span>
                    </div>
                    {client.service_type && (
                      <div className="text-sm text-[#71717A]">{client.service_type}</div>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="text-[#71717A] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1E1E2A]">
                <StatCell
                  label={
                    client.billing_type === 'monthly' || client.billing_type === 'retainer'
                      ? 'MRR'
                      : 'Contract'
                  }
                  value={formatMoney(client.amount_cents, client.currency)}
                  sub={BILLING_TYPE_LABELS[client.billing_type]}
                />
                <StatCell
                  label="Paid to date"
                  value={formatMoney(totalPaid, client.currency)}
                  sub={`${payments.length} payment${payments.length === 1 ? '' : 's'}`}
                />
                <StatCell
                  label="Start date"
                  value={formatShortDate(client.start_date)}
                  sub={client.end_date ? `Ended ${formatShortDate(client.end_date)}` : 'Ongoing'}
                />
              </div>

              {/* Contact info */}
              <div className="p-6 border-b border-[#1E1E2A]">
                <h4 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3">
                  Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                  {client.owner_name && (
                    <InfoRow label="Name" value={client.owner_name} />
                  )}
                  {client.email && (
                    <InfoRow label="Email" value={<a href={`mailto:${client.email}`} className="text-[#3B82F6] hover:underline">{client.email}</a>} />
                  )}
                  {client.phone && (
                    <InfoRow label="Phone" value={<a href={`tel:${client.phone}`} className="text-[#3B82F6] hover:underline">{client.phone}</a>} />
                  )}
                  {client.website_url && (
                    <InfoRow
                      label="Website"
                      value={
                        <a
                          href={client.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3B82F6] hover:underline inline-flex items-center gap-1"
                        >
                          {client.website_url.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      }
                    />
                  )}
                  {(client.city || client.state) && (
                    <InfoRow label="Location" value={[client.city, client.state].filter(Boolean).join(', ')} />
                  )}
                  {client.niche && <InfoRow label="Niche" value={client.niche} />}
                </div>
                {client.service_description && (
                  <div className="mt-4 p-3 rounded-lg bg-[#0A0A0F] border border-[#1E1E2A]">
                    <div className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">
                      Scope
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap">{client.service_description}</p>
                  </div>
                )}
                {client.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-[#0A0A0F] border border-[#1E1E2A]">
                    <div className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">
                      Notes
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>

              {/* Payments */}
              <div className="p-6">
                <h4 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment history
                </h4>

                {payments.length > 0 ? (
                  <div className="space-y-1 mb-4">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2A] hover:border-[#3B82F6]/30 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-[family-name:var(--font-geist-mono)] text-white">
                              {formatMoneyPrecise(p.amount_cents, p.currency)}
                            </span>
                            <span className="text-xs text-[#71717A]">{formatShortDate(p.paid_at)}</span>
                            {p.method && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-[#1E1E2A] text-[#71717A]">{p.method}</span>
                            )}
                          </div>
                          {p.description && (
                            <div className="text-xs text-[#71717A] mt-0.5 truncate">{p.description}</div>
                          )}
                        </div>
                        <button
                          onClick={() => removePayment(p.id)}
                          title="Remove"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#71717A] hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[#71717A] italic mb-4">
                    No payments logged yet.
                  </div>
                )}

                {/* Add payment */}
                <div className="p-3 rounded-lg border border-dashed border-[#1E1E2A]">
                  <div className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">
                    Log a payment
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="relative col-span-2 sm:col-span-1 flex items-center">
                      <span className="absolute left-3.5 text-[#71717A] pointer-events-none text-sm z-10">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pr-2 py-2 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-sm text-white outline-none focus:border-[#3B82F6]"
                        style={{ paddingLeft: '2rem' }}
                      />
                    </div>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="px-2 py-2 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-sm text-white outline-none focus:border-[#3B82F6]"
                    />
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="Method"
                      className="px-2 py-2 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-sm text-white outline-none focus:border-[#3B82F6]"
                    />
                    <input
                      type="text"
                      value={paymentDesc}
                      onChange={(e) => setPaymentDesc(e.target.value)}
                      placeholder="Description"
                      className="px-2 py-2 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-sm text-white outline-none focus:border-[#3B82F6] col-span-2 sm:col-span-1"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={addPayment}
                      disabled={addingPayment || paymentAmount <= 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingPayment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Log payment
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#1E1E2A] flex items-center justify-between">
                <button
                  onClick={deleteClient}
                  className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete client
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5 bg-[#111118]">
      <div className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="text-xl font-semibold text-white font-[family-name:var(--font-geist-mono)]">
        {value}
      </div>
      {sub && <div className="text-xs text-[#71717A] mt-0.5">{sub}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#71717A] w-20 shrink-0">{label}</span>
      <span className="text-white min-w-0 truncate">{value}</span>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
