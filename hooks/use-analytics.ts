'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  overview: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    emailsSentToday: number;
  };
  statusBreakdown: Record<string, number>;
  topNiches: Array<{ niche: string; total: number; hot: number }>;
  todayStats: {
    leads_scraped: number;
    emails_sent: number;
    calls_made: number;
    meetings_booked: number;
    deals_closed: number;
    revenue: number;
  };
  monthlyTotals: {
    leads_scraped: number;
    emails_sent: number;
    calls_made: number;
    meetings_booked: number;
    deals_closed: number;
    revenue: number;
  };
  trendData: Array<{
    date: string;
    leads_scraped: number;
    emails_sent: number;
    calls_made: number;
    meetings_booked: number;
    deals_closed: number;
    revenue: number;
  }>;
  recentLeads: Array<{
    id: string;
    business_name: string;
    city: string;
    state: string;
    niche: string;
    lead_score: number;
    created_at: string;
  }>;
  activeJobs: Array<{
    id: string;
    niche: string;
    location: string;
    status: string;
    leads_found: number;
    started_at: string;
  }>;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return { data, loading, error, refresh: fetchAnalytics };
}
