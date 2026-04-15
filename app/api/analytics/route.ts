import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/analytics — Fetch dashboard analytics data
export async function GET() {
  const supabase = getServiceSupabase();

  try {
    // Total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Hot leads (score >= 70)
    const { count: hotLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('lead_score', 70);

    // Warm leads (40-69)
    const { count: warmLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('lead_score', 40)
      .lt('lead_score', 70);

    // Cold leads (< 40)
    const { count: coldLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .lt('lead_score', 40);

    // Leads by status
    const { data: statusCounts } = await supabase
      .from('leads')
      .select('status');

    const statusBreakdown: Record<string, number> = {};
    for (const row of statusCounts ?? []) {
      statusBreakdown[row.status] = (statusBreakdown[row.status] || 0) + 1;
    }

    // Leads by niche (top 10)
    const { data: nicheCounts } = await supabase
      .from('leads')
      .select('niche, lead_score');

    const nicheMap: Record<string, { total: number; hot: number }> = {};
    for (const row of nicheCounts ?? []) {
      if (!nicheMap[row.niche]) nicheMap[row.niche] = { total: 0, hot: 0 };
      nicheMap[row.niche].total++;
      if (row.lead_score >= 70) nicheMap[row.niche].hot++;
    }

    const topNiches = Object.entries(nicheMap)
      .map(([niche, data]) => ({ niche, ...data }))
      .sort((a, b) => b.hot - a.hot)
      .slice(0, 10);

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('date', today)
      .single();

    // Emails sent today
    const { count: emailsSentToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', `${today}T00:00:00Z`);

    // This month's stats
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthStats } = await supabase
      .from('daily_stats')
      .select('*')
      .gte('date', monthStart.toISOString().split('T')[0]);

    const monthlyTotals = (monthStats ?? []).reduce(
      (acc, day) => ({
        leads_scraped: acc.leads_scraped + day.leads_scraped,
        emails_sent: acc.emails_sent + day.emails_sent,
        calls_made: acc.calls_made + day.calls_made,
        meetings_booked: acc.meetings_booked + day.meetings_booked,
        deals_closed: acc.deals_closed + day.deals_closed,
        revenue: acc.revenue + Number(day.revenue),
      }),
      { leads_scraped: 0, emails_sent: 0, calls_made: 0, meetings_booked: 0, deals_closed: 0, revenue: 0 }
    );

    // Last 30 days trend data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: trendData } = await supabase
      .from('daily_stats')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Recent leads (last 20)
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, business_name, city, state, niche, lead_score, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // Active scrape jobs
    const { data: activeJobs } = await supabase
      .from('scrape_jobs')
      .select('*')
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false });

    return NextResponse.json({
      overview: {
        totalLeads: totalLeads ?? 0,
        hotLeads: hotLeads ?? 0,
        warmLeads: warmLeads ?? 0,
        coldLeads: coldLeads ?? 0,
        emailsSentToday: emailsSentToday ?? 0,
      },
      statusBreakdown,
      topNiches,
      todayStats: todayStats ?? {
        leads_scraped: 0,
        emails_sent: 0,
        calls_made: 0,
        meetings_booked: 0,
        deals_closed: 0,
        revenue: 0,
      },
      monthlyTotals,
      trendData: trendData ?? [],
      recentLeads: recentLeads ?? [],
      activeJobs: activeJobs ?? [],
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
