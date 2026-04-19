import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import type { Client, ClientPayment, RevenueMetrics } from '@/types';

// GET /api/clients/revenue — aggregated revenue metrics for the dashboard.
// Computed in-process because the dataset is small (dozens-to-hundreds of clients).
// If this ever grows past ~10k clients, move to a Postgres materialized view.
export async function GET() {
  const supabase = getServiceSupabase();

  const [clientsRes, paymentsRes] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('client_payments').select('*'),
  ]);

  if (clientsRes.error) {
    return NextResponse.json({ error: clientsRes.error.message }, { status: 500 });
  }
  if (paymentsRes.error) {
    return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });
  }

  const clients = (clientsRes.data ?? []) as Client[];
  const payments = (paymentsRes.data ?? []) as ClientPayment[];

  // MRR: sum of amount_cents for active monthly/retainer clients
  const mrr_cents = clients
    .filter((c) => c.status === 'active' && (c.billing_type === 'monthly' || c.billing_type === 'retainer'))
    .reduce((sum, c) => sum + c.amount_cents, 0);

  // Contracted one-time: active one-time/project clients' contract values.
  // This is "money on the books" vs "money in the bank".
  const contracted_one_time_cents = clients
    .filter((c) => c.status === 'active' && (c.billing_type === 'one_time' || c.billing_type === 'project'))
    .reduce((sum, c) => sum + c.amount_cents, 0);

  // Total revenue = sum of all payments actually received
  const total_revenue_cents = payments.reduce((sum, p) => sum + p.amount_cents, 0);

  // This month / last month buckets
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const monthBucketOf = (isoDate: string) => isoDate.slice(0, 7); // 'YYYY-MM'

  let this_month_cents = 0;
  let last_month_cents = 0;
  for (const p of payments) {
    const key = monthBucketOf(p.paid_at);
    if (key === thisMonthKey) this_month_cents += p.amount_cents;
    else if (key === lastMonthKey) last_month_cents += p.amount_cents;
  }

  // Status counts
  const counts = {
    active: 0,
    paused: 0,
    churned: 0,
    completed: 0,
  };
  for (const c of clients) counts[c.status]++;

  // Average deal = mean of actual payments
  const avg_deal_cents = payments.length > 0
    ? Math.round(total_revenue_cents / payments.length)
    : 0;

  // Last 12 months of revenue, oldest-first so it charts left-to-right
  const monthly_revenue: Array<{ month: string; revenue_cents: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = payments
      .filter((p) => monthBucketOf(p.paid_at) === key)
      .reduce((sum, p) => sum + p.amount_cents, 0);
    monthly_revenue.push({ month: key, revenue_cents: total });
  }

  const metrics: RevenueMetrics = {
    mrr_cents,
    total_revenue_cents,
    this_month_cents,
    last_month_cents,
    contracted_one_time_cents,
    active_clients: counts.active,
    paused_clients: counts.paused,
    churned_clients: counts.churned,
    completed_clients: counts.completed,
    avg_deal_cents,
    monthly_revenue,
  };

  return NextResponse.json(metrics);
}
