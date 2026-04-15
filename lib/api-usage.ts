import { getServiceSupabase } from '@/lib/supabase';

// Cost per API call in USD
const COST_PER_CALL: Record<string, Record<string, number>> = {
  google_places: {
    text_search: 0.032,
    place_details: 0.017,
  },
  google_pagespeed: {
    analyze: 0.0,
  },
  hunter_io: {
    domain_search: 0.01,
    email_finder: 0.01,
  },
  resend: {
    send_email: 0.001,
  },
};

/**
 * Track an API call by upserting into the api_usage table.
 * If a row already exists for the same api_name + endpoint + date,
 * the calls_made counter is incremented. Otherwise a new row is inserted.
 */
export async function trackApiCall(apiName: string, endpoint: string): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.rpc('upsert_api_usage', {
      p_api_name: apiName,
      p_endpoint: endpoint,
      p_date: today,
    });

    // If the RPC doesn't exist yet, fall back to manual upsert
    if (error) {
      // Try a select + update/insert approach
      const { data: existing } = await supabase
        .from('api_usage')
        .select('id, calls_made')
        .eq('api_name', apiName)
        .eq('endpoint', endpoint)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('api_usage')
          .update({ calls_made: existing.calls_made + 1 })
          .eq('id', existing.id);
      } else {
        await supabase.from('api_usage').insert({
          api_name: apiName,
          endpoint: endpoint,
          calls_made: 1,
          date: today,
        });
      }
    }
  } catch (err) {
    // Never let tracking failures break the main flow
    console.error('[api-usage] Failed to track API call:', err);
  }
}

/**
 * Fetch API usage grouped by api_name and date for the last N days.
 */
export async function getApiUsage(days: number = 30): Promise<
  Array<{
    api_name: string;
    endpoint: string;
    calls_made: number;
    date: string;
  }>
> {
  const supabase = getServiceSupabase();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('api_usage')
    .select('api_name, endpoint, calls_made, date')
    .gte('date', since)
    .order('date', { ascending: true });

  if (error) {
    console.error('[api-usage] Failed to fetch usage:', error);
    return [];
  }

  return data ?? [];
}

interface ApiCostEntry {
  api_name: string;
  endpoint: string;
  calls: number;
  cost: number;
}

interface UsageSummary {
  today: ApiCostEntry[];
  month: ApiCostEntry[];
  todayTotalCost: number;
  monthTotalCost: number;
}

function getCostPerCall(apiName: string, endpoint: string): number {
  return COST_PER_CALL[apiName]?.[endpoint] ?? 0;
}

/**
 * Returns today's usage and this month's usage per API, plus estimated costs.
 */
export async function getApiUsageSummary(): Promise<UsageSummary> {
  const supabase = getServiceSupabase();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01'; // YYYY-MM-01

  // Fetch today's usage
  const { data: todayData } = await supabase
    .from('api_usage')
    .select('api_name, endpoint, calls_made')
    .eq('date', today);

  // Fetch this month's usage
  const { data: monthData } = await supabase
    .from('api_usage')
    .select('api_name, endpoint, calls_made, date')
    .gte('date', monthStart);

  const todayEntries: ApiCostEntry[] = (todayData ?? []).map((row) => ({
    api_name: row.api_name,
    endpoint: row.endpoint,
    calls: row.calls_made,
    cost: row.calls_made * getCostPerCall(row.api_name, row.endpoint),
  }));

  // Aggregate month data by api_name + endpoint
  const monthMap = new Map<string, ApiCostEntry>();
  for (const row of monthData ?? []) {
    const key = `${row.api_name}:${row.endpoint}`;
    const existing = monthMap.get(key);
    if (existing) {
      existing.calls += row.calls_made;
      existing.cost += row.calls_made * getCostPerCall(row.api_name, row.endpoint);
    } else {
      monthMap.set(key, {
        api_name: row.api_name,
        endpoint: row.endpoint,
        calls: row.calls_made,
        cost: row.calls_made * getCostPerCall(row.api_name, row.endpoint),
      });
    }
  }
  const monthEntries = Array.from(monthMap.values());

  const todayTotalCost = todayEntries.reduce((sum, e) => sum + e.cost, 0);
  const monthTotalCost = monthEntries.reduce((sum, e) => sum + e.cost, 0);

  return {
    today: todayEntries,
    month: monthEntries,
    todayTotalCost,
    monthTotalCost,
  };
}

export { COST_PER_CALL };
