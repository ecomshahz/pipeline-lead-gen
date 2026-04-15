import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { NICHES, US_CITIES } from '@/lib/niches';

// GET /api/scrape/cron — Automated scraping cron job
// Picks the next niche+city combo that hasn't been scraped in 30 days
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find a niche+city combination that hasn't been scraped recently
  for (const nicheConfig of NICHES) {
    for (const cityConfig of US_CITIES) {
      const location = `${cityConfig.city}, ${cityConfig.state}`;

      // Check if this combo was recently scraped
      const { data: recentJob } = await supabase
        .from('scrape_jobs')
        .select('id')
        .eq('niche', nicheConfig.name)
        .eq('location', location)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1);

      if (recentJob && recentJob.length > 0) continue;

      // Check no currently running job for this combo
      const { data: runningJob } = await supabase
        .from('scrape_jobs')
        .select('id')
        .eq('niche', nicheConfig.name)
        .eq('location', location)
        .eq('status', 'running')
        .limit(1);

      if (runningJob && runningJob.length > 0) continue;

      // Trigger scrape via our own API
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        await fetch(`${appUrl}/api/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche: nicheConfig.name,
            city: cityConfig.city,
            state: cityConfig.state,
          }),
        });

        return NextResponse.json({
          success: true,
          message: `Started scraping ${nicheConfig.name} in ${location}`,
          niche: nicheConfig.name,
          location,
        });
      } catch (error) {
        console.error('Failed to trigger scrape:', error);
        continue;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'All niche+city combinations have been scraped within the last 30 days',
  });
}
