'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLeads } from '@/hooks/use-leads';
import { Lead, LeadStatus } from '@/types';
import { getScoreBadgeColor, getScoreLabel } from '@/lib/scoring';
import { cn, formatDate, formatNumber, timeAgo } from '@/lib/utils';
import { NICHES } from '@/lib/niches';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Calendar,
  FileText,
  Download,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Loader2,
  Star,
  MapPin,
  Clock,
  MessageSquare,
  Zap,
  Eye,
  Send,
  Save,
  Briefcase,
} from 'lucide-react';

// ---- Constants ----

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
  { value: 'not_interested', label: 'Not Interested' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];

const PAGE_SIZES = [25, 50, 100];

function getStatusColor(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'contacted':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'follow_up':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'meeting_scheduled':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'proposal_sent':
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    case 'closed_won':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'closed_lost':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'not_interested':
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

function getStatusLabel(status: LeadStatus): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function getWebsiteScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

// ---- Component ----

export default function LeadsPage() {
  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [niche, setNiche] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);

  // Table state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState('lead_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail panel
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [detailStatus, setDetailStatus] = useState<LeadStatus>('new');

  // Bulk actions
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState(
    'Quick question about {{business_name}}'
  );
  const [composeBody, setComposeBody] = useState(
    "Hi {{owner_name}},\n\nI work with {{niche}} businesses in {{city}} and noticed {{business_name}} doesn't have a strong online presence yet.\n\nI help shops like yours attract more customers with a modern website and AI tools — would a quick 10-minute chat this week be useful?\n\n{{sender_name}}\n{{sender_title}}"
  );
  const [sending, setSending] = useState(false);
  const [composeFeedback, setComposeFeedback] = useState<string | null>(null);
  // Scope of the compose modal — null = bulk (use selection), otherwise single lead
  const [composeTarget, setComposeTarget] = useState<Lead | null>(null);
  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  // Convert-to-client state
  const [convertingClient, setConvertingClient] = useState(false);
  const router = useRouter();

  // Debounce search
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Build hook params
  const hookParams = useMemo(
    () => ({
      page,
      limit,
      sort,
      order,
      search: debouncedSearch || undefined,
      niche: niche || undefined,
      state: state || undefined,
      status: status || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      hasWebsite,
      hasEmail,
    }),
    [page, limit, sort, order, debouncedSearch, niche, state, status, minScore, maxScore, hasWebsite, hasEmail]
  );

  const { leads, total, totalPages, loading, error, refresh, updateLead, deleteLead } = useLeads(hookParams);

  // Handlers
  const handleSort = useCallback(
    (col: string) => {
      if (sort === col) {
        setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSort(col);
        setOrder('desc');
      }
      setPage(1);
    },
    [sort]
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setNiche('');
    setState('');
    setStatus('');
    setMinScore('');
    setMaxScore('');
    setHasWebsite(null);
    setHasEmail(null);
    setPage(1);
  }, []);

  const hasActiveFilters = !!(
    search || niche || state || status || minScore || maxScore ||
    hasWebsite !== null || hasEmail !== null
  );

  // Selection helpers
  const allOnPageSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someOnPageSelected = leads.some((l) => selectedIds.has(l.id));

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        leads.forEach((l) => next.delete(l.id));
      } else {
        leads.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }, [leads, allOnPageSelected]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  // Detail panel
  const openDetail = useCallback((lead: Lead) => {
    setDetailLead(lead);
    setEditNotes(lead.notes ?? '');
    setDetailStatus(lead.status);
  }, []);

  const closeDetail = useCallback(() => setDetailLead(null), []);

  const saveNotes = useCallback(async () => {
    if (!detailLead) return;
    setSavingNotes(true);
    try {
      await updateLead(detailLead.id, { notes: editNotes });
      setDetailLead((prev) => (prev ? { ...prev, notes: editNotes } : null));
    } catch {
      // Error handled by hook
    } finally {
      setSavingNotes(false);
    }
  }, [detailLead, editNotes, updateLead]);

  const changeDetailStatus = useCallback(
    async (newStatus: LeadStatus) => {
      if (!detailLead) return;
      setDetailStatus(newStatus);
      try {
        await updateLead(detailLead.id, { status: newStatus });
        setDetailLead((prev) => (prev ? { ...prev, status: newStatus } : null));
      } catch {
        setDetailStatus(detailLead.status);
      }
    },
    [detailLead, updateLead]
  );

  // Bulk status change
  const handleBulkStatus = useCallback(
    async (newStatus: LeadStatus) => {
      setBulkStatusOpen(false);
      const ids = Array.from(selectedIds);
      await Promise.allSettled(ids.map((id) => updateLead(id, { status: newStatus })));
      refresh();
    },
    [selectedIds, updateLead, refresh]
  );

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Delete failed');
      }
      setSelectedIds(new Set());
      setConfirmDeleteOpen(false);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete leads');
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, refresh]);

  // Bulk email compose — sends via Resend through /api/emails/send
  const selectedWithEmail = useMemo(
    () => leads.filter((l) => selectedIds.has(l.id) && !!l.email),
    [leads, selectedIds]
  );

  // Whoever the compose modal is targeting right now: the single lead if set,
  // otherwise the bulk selection filtered to those with emails.
  const composeRecipients = useMemo<Lead[]>(
    () => (composeTarget ? (composeTarget.email ? [composeTarget] : []) : selectedWithEmail),
    [composeTarget, selectedWithEmail]
  );

  const handleSendCampaign = useCallback(async () => {
    const ids = composeRecipients.map((l) => l.id);
    if (ids.length === 0) {
      setComposeFeedback('No recipients have an email address.');
      return;
    }
    if (!composeSubject.trim() || !composeBody.trim()) {
      setComposeFeedback('Subject and body are required.');
      return;
    }
    setSending(true);
    setComposeFeedback(null);
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: ids,
          customSubject: composeSubject,
          customBody: composeBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Send failed');
      }
      setComposeFeedback(
        `${data.message ?? `Queued ${data.queued ?? ids.length} emails`}. You can close this window.`
      );
      // Refresh after a beat so sent statuses show up
      setTimeout(() => refresh(), 4000);
    } catch (err) {
      setComposeFeedback(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }, [composeRecipients, composeSubject, composeBody, refresh]);

  // Defaults for the "build them a website" pitch. Different starter for
  // no-website leads vs. sites-that-need-improvement leads.
  const composeForLead = useCallback((lead: Lead) => {
    const hasSite = !!(lead.has_website && lead.website_url);
    setComposeTarget(lead);
    setComposeFeedback(null);
    setComposeSubject(
      hasSite
        ? 'A few ideas for {{business_name}}\'s website'
        : 'A website for {{business_name}}'
    );
    setComposeBody(
      hasSite
        ? "Hi {{owner_name}},\n\nI came across {{business_name}} while looking at {{niche}} in {{city}} and took a quick look at your current site.\n\n{{website_issue}}\n\nI build fast, mobile-friendly websites plus AI tools (booking, chat, lead capture) that help local shops turn more visits into paying customers. Would a short 10-minute call this week to walk you through a quick before/after mock-up be useful?\n\nNo pressure either way — happy to help.\n\n{{sender_name}}\n{{sender_title}}"
        : "Hi {{owner_name}},\n\nI noticed {{business_name}} is doing great on Google (your reviews are solid!), but you don't seem to have a website yet. For a {{niche}} in {{city}}, a website is usually the #1 thing driving new-customer calls after hours.\n\nI build modern sites for local businesses — mobile-friendly, fast to load, with online booking and a contact form built in. Most of our {{niche}} clients see more inbound leads within the first 30 days.\n\nWould you be open to a quick 10-minute chat this week to see what it'd look like for {{business_name}}?\n\n{{sender_name}}\n{{sender_title}}"
    );
    setComposeOpen(true);
  }, []);

  // Convert a closed_won lead into a tracked client. Creates the client in
  // the Clients section (defaulting to monthly / $0 so the user can fill in
  // real numbers on the clients page) and jumps there.
  const convertToClient = useCallback(
    async (lead: Lead) => {
      if (convertingClient) return;
      const confirmMsg = `Convert ${lead.business_name} into a client? You can set billing amount and service details on the next screen.`;
      if (!confirm(confirmMsg)) return;

      setConvertingClient(true);
      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            business_name: lead.business_name,
            owner_name: lead.owner_name,
            email: lead.email,
            phone: lead.phone,
            website_url: lead.website_url,
            city: lead.city,
            state: lead.state,
            niche: lead.niche,
            service_type: 'AI Website',
            billing_type: 'monthly',
            amount: 0,
            status: 'active',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to convert lead');
        router.push('/clients');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to convert lead to client');
      } finally {
        setConvertingClient(false);
      }
    },
    [convertingClient, router]
  );

  // Enrich emails — background scrapes the websites of leads missing an email
  const handleEnrichEmails = useCallback(async () => {
    setEnriching(true);
    setEnrichMessage(null);
    try {
      const res = await fetch('/api/leads/enrich-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Enrichment failed');
      setEnrichMessage(data.message ?? 'Enrichment queued.');
      // Poll refresh a few times so newly filled emails appear
      setTimeout(() => refresh(), 15000);
      setTimeout(() => refresh(), 30000);
      setTimeout(() => setEnrichMessage(null), 12000);
    } catch (err) {
      setEnrichMessage(err instanceof Error ? err.message : 'Failed');
      setTimeout(() => setEnrichMessage(null), 6000);
    } finally {
      setEnriching(false);
    }
  }, [refresh]);

  // Bulk export
  const handleExportSelected = useCallback(() => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const headers = ['Business Name', 'Niche', 'City', 'State', 'Phone', 'Email', 'Website', 'Score', 'Status'];
    const rows = selected.map((l) => [
      l.business_name,
      l.niche,
      l.city,
      l.state,
      l.phone ?? '',
      l.email ?? '',
      l.website_url ?? '',
      String(l.lead_score),
      l.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads, selectedIds]);

  // Sort icon helper
  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-[#71717A]" />;
    return order === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#3B82F6]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#3B82F6]" />
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-[#71717A] mt-1">
              {loading ? 'Loading...' : `${formatNumber(total)} total leads`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnrichEmails}
              disabled={enriching}
              title="Scrape websites of leads missing emails and fill them in"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E1E2A] bg-[#111118] text-sm text-[#71717A] hover:text-white hover:border-[#10B981]/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enriching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Enrich Emails
            </button>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E1E2A] bg-[#111118] text-sm text-[#71717A] hover:text-white hover:border-[#3B82F6]/50 transition-colors"
            >
              <RotateCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>
        {enrichMessage && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
            {enrichMessage}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-[#111118] border border-[#1E1E2A] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[#71717A]" />
            <span className="text-sm font-medium text-[#71717A]">Filters</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1.5 text-xs text-[#71717A] hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Search */}
            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Niche */}
            <select
              value={niche}
              onChange={(e) => { setNiche(e.target.value); setPage(1); }}
              className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#3B82F6]/50 transition-colors"
            >
              <option value="">All Niches</option>
              {NICHES.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>

            {/* State */}
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setPage(1); }}
              className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#3B82F6]/50 transition-colors"
            >
              <option value="">All States</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#3B82F6]/50 transition-colors"
            >
              <option value="">All Statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Min Score */}
            <input
              type="number"
              placeholder="Min Score"
              value={minScore}
              onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
              min={0}
              max={100}
              className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#3B82F6]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            {/* Max Score */}
            <input
              type="number"
              placeholder="Max Score"
              value={maxScore}
              onChange={(e) => { setMaxScore(e.target.value); setPage(1); }}
              min={0}
              max={100}
              className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#3B82F6]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Toggle filters */}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => { setHasWebsite((prev) => (prev === true ? null : true)); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                hasWebsite === true
                  ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30'
                  : 'bg-[#0A0A0F] text-[#71717A] border-[#1E1E2A] hover:text-white hover:border-[#3B82F6]/30'
              )}
            >
              <Globe className="w-3 h-3" />
              Has Website
            </button>
            <button
              onClick={() => { setHasEmail((prev) => (prev === true ? null : true)); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                hasEmail === true
                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#0A0A0F] text-[#71717A] border-[#1E1E2A] hover:text-white hover:border-[#10B981]/30'
              )}
            >
              <Mail className="w-3 h-3" />
              Has Email
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl p-3 mb-4 flex items-center gap-3"
            >
              <span className="text-sm font-medium text-[#3B82F6]">
                {selectedIds.size} selected
              </span>
              <div className="h-4 w-px bg-[#3B82F6]/30" />

              <button
                onClick={() => {
                  setComposeTarget(null);
                  setComposeFeedback(null);
                  setComposeOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111118] border border-[#1E1E2A] text-white hover:border-[#3B82F6]/50 transition-colors"
                title={
                  selectedWithEmail.length === 0
                    ? 'No selected leads have emails'
                    : `Compose email to ${selectedWithEmail.length} lead${selectedWithEmail.length === 1 ? '' : 's'}`
                }
              >
                <Send className="w-3 h-3" />
                Send Email{selectedWithEmail.length > 0 ? ` (${selectedWithEmail.length})` : ''}
              </button>

              {/* Bulk status dropdown */}
              <div className="relative">
                <button
                  onClick={() => setBulkStatusOpen((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111118] border border-[#1E1E2A] text-white hover:border-[#3B82F6]/50 transition-colors"
                >
                  Change Status
                  <ChevronDown className="w-3 h-3" />
                </button>
                {bulkStatusOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-[#111118] border border-[#1E1E2A] rounded-lg shadow-xl z-50 py-1">
                    {LEAD_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleBulkStatus(s.value)}
                        className="w-full text-left px-3 py-2 text-xs text-[#71717A] hover:text-white hover:bg-[#1E1E2A] transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleExportSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111118] border border-[#1E1E2A] text-white hover:border-[#3B82F6]/50 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export Selected
              </button>

              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected
              </button>

              <button
                onClick={deselectAll}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Deselect All
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <span className="text-sm text-[#EF4444]">{error}</span>
            <button
              onClick={refresh}
              className="ml-auto text-xs text-[#EF4444] hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-[#111118] border border-[#1E1E2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="w-12 px-4 py-3">
                    <button onClick={toggleAll} className="text-[#71717A] hover:text-white transition-colors">
                      {allOnPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#3B82F6]" />
                      ) : someOnPageSelected ? (
                        <MinusSquare className="w-4 h-4 text-[#3B82F6]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  {[
                    { key: 'lead_score', label: 'Score', w: 'w-24' },
                    { key: 'business_name', label: 'Business Name', w: 'min-w-[200px]' },
                    { key: 'niche', label: 'Niche', w: 'w-40' },
                    { key: 'city', label: 'City / State', w: 'w-36' },
                    { key: 'phone', label: 'Phone', w: 'w-36' },
                    { key: 'email', label: 'Email', w: 'w-48' },
                    { key: 'website_score', label: 'Web Score', w: 'w-28' },
                    { key: 'status', label: 'Status', w: 'w-36' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors',
                        col.w
                      )}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="w-16 px-4 py-3 text-xs font-medium text-[#71717A] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && leads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <Loader2 className="w-6 h-6 text-[#3B82F6] animate-spin mx-auto mb-3" />
                      <span className="text-sm text-[#71717A]">Loading leads...</span>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <Search className="w-6 h-6 text-[#71717A] mx-auto mb-3" />
                      <p className="text-sm text-[#71717A]">No leads found</p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="text-xs text-[#3B82F6] hover:underline mt-2"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => openDetail(lead)}
                      className={cn(
                        'border-b border-[#1E1E2A]/50 cursor-pointer transition-colors',
                        selectedIds.has(lead.id)
                          ? 'bg-[#3B82F6]/5'
                          : 'hover:bg-[#1E1E2A]/30'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleOne(lead.id)}
                          className="text-[#71717A] hover:text-white transition-colors"
                        >
                          {selectedIds.has(lead.id) ? (
                            <CheckSquare className="w-4 h-4 text-[#3B82F6]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
                            getScoreBadgeColor(lead.lead_score)
                          )}
                        >
                          {lead.lead_score}
                        </span>
                      </td>

                      {/* Business Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-white truncate max-w-[250px]">
                          {lead.business_name}
                        </div>
                        {lead.google_rating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                            <span className="text-xs text-[#71717A]">
                              {lead.google_rating} ({lead.review_count ?? 0})
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Niche */}
                      <td className="px-4 py-3 text-sm text-[#71717A]">{lead.niche}</td>

                      {/* City / State */}
                      <td className="px-4 py-3 text-sm text-[#71717A]">
                        {lead.city}, {lead.state}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-sm font-[family-name:var(--font-geist-mono)]" onClick={(e) => e.stopPropagation()}>
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-[#71717A] hover:text-[#3B82F6] transition-colors"
                          >
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-[#71717A]/40">--</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-[#71717A] hover:text-[#3B82F6] truncate block max-w-[180px] transition-colors"
                          >
                            {lead.email}
                          </a>
                        ) : (
                          <span className="text-[#71717A]/40">--</span>
                        )}
                      </td>

                      {/* Website Score */}
                      <td className="px-4 py-3">
                        {lead.website_score !== null && lead.website_score !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-[#1E1E2A] overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', getWebsiteScoreColor(lead.website_score))}
                                style={{ width: `${lead.website_score}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#71717A] font-[family-name:var(--font-geist-mono)]">
                              {lead.website_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#71717A]/40">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                            getStatusColor(lead.status)
                          )}
                        >
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => composeForLead(lead)}
                            disabled={!lead.email}
                            title={
                              lead.email
                                ? `Send cold email to ${lead.email}`
                                : 'No email on file — run Enrich Emails'
                            }
                            className="p-1 rounded text-[#71717A] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#71717A]"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDetail(lead)}
                            title="View details"
                            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1E1E2A] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E1E2A]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#71717A]">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-md px-2 py-1 text-xs text-white appearance-none cursor-pointer focus:outline-none"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-[#71717A]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md border border-[#1E1E2A] text-[#71717A] hover:text-white hover:border-[#3B82F6]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-md border border-[#1E1E2A] text-[#71717A] hover:text-white hover:border-[#3B82F6]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Slide-in Panel */}
      <AnimatePresence>
        {detailLead && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={closeDetail}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-[#111118] border-l border-[#1E1E2A] z-50 overflow-y-auto"
            >
              {/* Panel Header */}
              <div className="sticky top-0 bg-[#111118] border-b border-[#1E1E2A] px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
                      getScoreBadgeColor(detailLead.lead_score)
                    )}
                  >
                    {detailLead.lead_score}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">{detailLead.business_name}</h2>
                    <p className="text-xs text-[#71717A]">{getScoreLabel(detailLead.lead_score)}</p>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1E1E2A] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  {detailLead.phone && (
                    <a
                      href={`tel:${detailLead.phone}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-sm font-medium hover:bg-[#10B981]/20 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                  {detailLead.email && (
                    <a
                      href={`mailto:${detailLead.email}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] text-sm font-medium hover:bg-[#3B82F6]/20 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  )}
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-sm font-medium hover:bg-[#F59E0B]/20 transition-colors">
                    <Calendar className="w-4 h-4" />
                    Schedule Follow-up
                  </button>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={detailStatus}
                    onChange={(e) => changeDetailStatus(e.target.value as LeadStatus)}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#3B82F6]/50 transition-colors"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Convert to client — only relevant once the deal is closed */}
                {detailStatus === 'closed_won' && (
                  <button
                    onClick={() => convertToClient(detailLead)}
                    disabled={convertingClient}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {convertingClient ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Briefcase className="w-4 h-4" />
                    )}
                    Convert to Client
                  </button>
                )}

                {/* Contact Info */}
                <div>
                  <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3">
                    Contact Information
                  </h3>
                  <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg divide-y divide-[#1E1E2A]">
                    {detailLead.owner_name && (
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-[#71717A]">Owner</span>
                        <span className="text-sm text-white">{detailLead.owner_name}</span>
                      </div>
                    )}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Phone</span>
                      {detailLead.phone ? (
                        <a
                          href={`tel:${detailLead.phone}`}
                          className="text-sm text-[#3B82F6] hover:underline font-[family-name:var(--font-geist-mono)]"
                        >
                          {detailLead.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-[#71717A]/40">Not available</span>
                      )}
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Email</span>
                      {detailLead.email ? (
                        <a
                          href={`mailto:${detailLead.email}`}
                          className="text-sm text-[#3B82F6] hover:underline"
                        >
                          {detailLead.email}
                        </a>
                      ) : (
                        <span className="text-sm text-[#71717A]/40">Not available</span>
                      )}
                    </div>
                    {detailLead.address && (
                      <div className="px-4 py-3 flex items-start justify-between">
                        <span className="text-xs text-[#71717A]">Address</span>
                        <span className="text-sm text-white text-right max-w-[200px]">
                          {detailLead.address}, {detailLead.city}, {detailLead.state} {detailLead.zip}
                        </span>
                      </div>
                    )}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Niche</span>
                      <span className="text-sm text-white">{detailLead.niche}</span>
                    </div>
                    {detailLead.google_rating && (
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-[#71717A]">Google Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="text-sm text-white">{detailLead.google_rating}</span>
                          <span className="text-xs text-[#71717A]">({detailLead.review_count ?? 0} reviews)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Website Section */}
                <div>
                  <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3">
                    Website
                  </h3>
                  <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg p-4 space-y-4">
                    {detailLead.website_url ? (
                      <>
                        <div className="flex items-center justify-between">
                          <a
                            href={detailLead.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#3B82F6] hover:underline flex items-center gap-1.5 truncate max-w-[300px]"
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            {detailLead.website_url}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>

                        {/* PageSpeed Score */}
                        {detailLead.website_score !== null && detailLead.website_score !== undefined && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-[#71717A]">PageSpeed Score</span>
                              <span
                                className={cn(
                                  'text-sm font-bold font-[family-name:var(--font-geist-mono)]',
                                  detailLead.website_score >= 90
                                    ? 'text-[#10B981]'
                                    : detailLead.website_score >= 50
                                    ? 'text-[#F59E0B]'
                                    : 'text-[#EF4444]'
                                )}
                              >
                                {detailLead.website_score}/100
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#1E1E2A] overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${detailLead.website_score}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={cn('h-full rounded-full', getWebsiteScoreColor(detailLead.website_score))}
                              />
                            </div>
                          </div>
                        )}

                        {/* Issues */}
                        {detailLead.website_issues && detailLead.website_issues.length > 0 && (
                          <div>
                            <span className="text-xs text-[#71717A] mb-2 block">Issues Found</span>
                            <div className="flex flex-wrap gap-1.5">
                              {detailLead.website_issues.map((issue) => (
                                <span
                                  key={issue}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
                                >
                                  {issue.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Globe className="w-6 h-6 text-[#71717A]/30 mx-auto mb-2" />
                        <p className="text-sm text-[#71717A]">No website found</p>
                        <p className="text-xs text-[#71717A]/60 mt-0.5">This is a strong opportunity for web services</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Opportunities */}
                {detailLead.needs_ai_services && (
                  <div>
                    <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                      AI Opportunities
                    </h3>
                    <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg p-4">
                      <p className="text-sm text-white/80 leading-relaxed">
                        {detailLead.ai_opportunity_notes || 'This business has been identified as a strong candidate for AI services.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lead Score Breakdown */}
                {detailLead.lead_score_breakdown && (
                  <div>
                    <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3">
                      Score Breakdown
                    </h3>
                    <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg divide-y divide-[#1E1E2A]">
                      {Object.entries(detailLead.lead_score_breakdown)
                        .filter(([key]) => key !== 'total')
                        .map(([key, value]) => (
                          <div key={key} className="px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-[#71717A] capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-[family-name:var(--font-geist-mono)]',
                                (value as number) > 0 ? 'text-[#10B981]' : 'text-[#71717A]/40'
                              )}
                            >
                              +{value as number}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Timeline Info */}
                <div>
                  <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3">
                    Activity
                  </h3>
                  <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg divide-y divide-[#1E1E2A]">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Scraped</span>
                      <span className="text-xs text-white">{timeAgo(detailLead.scraped_at)}</span>
                    </div>
                    {detailLead.last_contacted_at && (
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-[#71717A]">Last Contacted</span>
                        <span className="text-xs text-white">{timeAgo(detailLead.last_contacted_at)}</span>
                      </div>
                    )}
                    {detailLead.next_follow_up && (
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-[#71717A]">Next Follow-up</span>
                        <span className="text-xs text-white">{formatDate(detailLead.next_follow_up)}</span>
                      </div>
                    )}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Email Sent</span>
                      <span className={cn('text-xs', detailLead.email_sent ? 'text-[#10B981]' : 'text-[#71717A]/40')}>
                        {detailLead.email_sent ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Email Opened</span>
                      <span className={cn('text-xs', detailLead.email_opened ? 'text-[#10B981]' : 'text-[#71717A]/40')}>
                        {detailLead.email_opened ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Notes
                  </h3>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    rows={4}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-4 py-3 text-sm text-white placeholder-[#71717A]/50 focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/20 resize-none transition-colors"
                  />
                  {editNotes !== (detailLead.notes ?? '') && (
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#3B82F6]/80 disabled:opacity-50 transition-colors"
                    >
                      {savingNotes ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Notes
                    </button>
                  )}
                </div>

                {/* Meta */}
                <div className="text-xs text-[#71717A]/50 space-y-1 pb-4">
                  <p>Source: {detailLead.source ?? 'Google Maps'}</p>
                  <p>Created: {formatDate(detailLead.created_at)}</p>
                  <p>Updated: {timeAgo(detailLead.updated_at)}</p>
                  <p className="font-[family-name:var(--font-geist-mono)]">ID: {detailLead.id}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Bulk Delete Modal */}
      <AnimatePresence>
        {confirmDeleteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => !deleting && setConfirmDeleteOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#111118] border border-[#1E1E2A] rounded-xl shadow-2xl z-50 p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Delete {selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'}?</h3>
                  <p className="text-sm text-[#71717A] mt-1">
                    This permanently removes the selected leads and their email history. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#71717A] hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete {selectedIds.size}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Compose Email Modal */}
      <AnimatePresence>
        {composeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => {
                if (sending) return;
                setComposeOpen(false);
                setComposeTarget(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111118] border border-[#1E1E2A] rounded-xl shadow-2xl z-50 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#3B82F6]" />
                    {composeTarget ? 'Send Cold Email' : 'Cold Email Blast'}
                  </h3>
                  <p className="text-sm text-[#71717A] mt-1">
                    {composeTarget ? (
                      <>
                        Sending to <span className="text-white font-medium">{composeTarget.business_name}</span>
                        {composeTarget.email && (
                          <span className="text-[#71717A]"> ({composeTarget.email})</span>
                        )}
                      </>
                    ) : (
                      <>
                        Sending to <span className="text-white font-medium">{selectedWithEmail.length}</span> of {selectedIds.size} selected
                        {selectedIds.size !== selectedWithEmail.length && (
                          <span className="text-[#71717A]"> — {selectedIds.size - selectedWithEmail.length} skipped (no email)</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => { setComposeOpen(false); setComposeTarget(null); }}
                  disabled={sending}
                  className="text-[#71717A] hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-1.5 block">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]/50"
                    disabled={sending}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-1.5 block">Body</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={12}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2 text-sm text-white font-[family-name:var(--font-geist-mono)] focus:outline-none focus:border-[#3B82F6]/50 resize-none"
                    disabled={sending}
                  />
                </div>

                <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg p-3">
                  <p className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">Available placeholders</p>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-[family-name:var(--font-geist-mono)]">
                    {['{{business_name}}','{{owner_name}}','{{niche}}','{{city}}','{{website_issue}}','{{ai_opportunity}}','{{sender_name}}','{{sender_title}}'].map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-[#111118] border border-[#1E1E2A] text-[#3B82F6]">{p}</span>
                    ))}
                  </div>
                </div>

                {composeFeedback && (
                  <div className={cn(
                    'text-sm rounded-lg px-3 py-2 border',
                    composeFeedback.startsWith('Queued') || composeFeedback.toLowerCase().includes('queued')
                      ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                      : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                  )}>
                    {composeFeedback}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#1E1E2A]">
                  <p className="text-[11px] text-[#71717A]">
                    Sends via Resend. Configure from-address in Settings.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setComposeOpen(false); setComposeTarget(null); }}
                      disabled={sending}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-[#71717A] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {composeFeedback?.toLowerCase().includes('queued') ? 'Close' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleSendCampaign}
                      disabled={sending || composeRecipients.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {composeTarget ? 'Send' : `Send to ${composeRecipients.length}`}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
