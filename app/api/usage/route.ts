import { NextResponse } from 'next/server';
import { getApiUsage, getApiUsageSummary } from '@/lib/api-usage';

export async function GET() {
  try {
    const [summary, trend] = await Promise.all([
      getApiUsageSummary(),
      getApiUsage(30),
    ]);

    // Build daily totals for the trend chart
    const dailyMap = new Map<string, { date: string; calls: number; cost: number }>();
    for (const row of trend) {
      const existing = dailyMap.get(row.date);
      if (existing) {
        existing.calls += row.calls_made;
      } else {
        dailyMap.set(row.date, {
          date: row.date,
          calls: row.calls_made,
          cost: 0,
        });
      }
    }

    // Calculate costs for daily totals
    const { COST_PER_CALL } = await import('@/lib/api-usage');
    for (const row of trend) {
      const costPerCall = COST_PER_CALL[row.api_name]?.[row.endpoint] ?? 0;
      const daily = dailyMap.get(row.date);
      if (daily) {
        daily.cost += row.calls_made * costPerCall;
      }
    }

    const trendData = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // Overall totals
    const totalCalls = trendData.reduce((sum, d) => sum + d.calls, 0);
    const totalCost = trendData.reduce((sum, d) => sum + d.cost, 0);

    return NextResponse.json({
      today: summary.today,
      month: summary.month,
      todayTotalCost: summary.todayTotalCost,
      monthTotalCost: summary.monthTotalCost,
      trend: trendData,
      totals: {
        calls: totalCalls,
        cost: totalCost,
      },
    });
  } catch (error) {
    console.error('[api/usage] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API usage data' },
      { status: 500 }
    );
  }
}
