'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead } from '@/types';

interface UseLeadsOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  niche?: string;
  state?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  hasWebsite?: boolean | null;
  hasEmail?: boolean | null;
}

interface UseLeadsResult {
  leads: Lead[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.sort) params.set('sort', options.sort);
      if (options.order) params.set('order', options.order);
      if (options.search) params.set('search', options.search);
      if (options.niche) params.set('niche', options.niche);
      if (options.state) params.set('state', options.state);
      if (options.status) params.set('status', options.status);
      if (options.minScore !== undefined) params.set('minScore', String(options.minScore));
      if (options.maxScore !== undefined) params.set('maxScore', String(options.maxScore));
      if (options.hasWebsite !== null && options.hasWebsite !== undefined) {
        params.set('hasWebsite', String(options.hasWebsite));
      }
      if (options.hasEmail !== null && options.hasEmail !== undefined) {
        params.set('hasEmail', String(options.hasEmail));
      }

      const response = await fetch(`/api/leads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');

      const data = await response.json();
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [
    options.page, options.limit, options.sort, options.order,
    options.search, options.niche, options.state, options.status,
    options.minScore, options.maxScore, options.hasWebsite, options.hasEmail,
  ]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const response = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) throw new Error('Failed to update lead');

    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
    );
  };

  const deleteLead = async (id: string) => {
    const response = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete lead');
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    setTotal((prev) => prev - 1);
  };

  return { leads, total, totalPages, loading, error, refresh: fetchLeads, updateLead, deleteLead };
}
