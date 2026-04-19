import { NextRequest, NextResponse, after } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { analyzeWebsite } from '@/lib/scraper/website-analyzer';

// Vercel serverless ceiling. Enrichment runs in after() so the UI isn't blocked.
export const maxDuration = 60;

const ENRICH_BATCH_SIZE = 10;
// Max leads we touch per request. Call again to process more.
const MAX_PER_REQUEST = 100;

// POST /api/leads/enrich-emails — Fill in missing emails for leads with websites.
// Returns 202 immediately; the actual scraping runs in the background.
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(
      typeof body?.limit === 'number' ? body.limit : MAX_PER_REQUEST,
      MAX_PER_REQUEST
    );
    const onlyIds: string[] | null = Array.isArray(body?.ids) ? body.ids : null;

    // Target: has website, no email yet
    let query = supabase
      .from('leads')
      .select('id, website_url, business_name')
      .is('email', null)
      .not('website_url', 'is', null)
      .limit(limit);

    if (onlyIds && onlyIds.length > 0) {
      query = query.in('id', onlyIds);
    }

    const { data: targets, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({
        status: 'done',
        enriched: 0,
        queued: 0,
        message: 'No leads need enrichment.',
      });
    }

    // Run in the background so the client isn't waiting for ~N websites to load
    after(async () => {
      const startedAt = Date.now();
      const deadlineMs = startedAt + (maxDuration * 1000) - 5000;
      let enriched = 0;

      for (let i = 0; i < targets.length; i += ENRICH_BATCH_SIZE) {
        if (Date.now() > deadlineMs) {
          console.warn(`enrich-emails: stopping near timeout (${enriched} enriched)`);
          break;
        }

        const batch = targets.slice(i, i + ENRICH_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (lead) => {
            if (!lead.website_url) return null;
            const analysis = await analyzeWebsite(lead.website_url);
            return { id: lead.id, email: analysis.email };
          })
        );

        // Fire the updates in parallel too
        await Promise.allSettled(
          results.map(async (r) => {
            if (r.status !== 'fulfilled' || !r.value?.email) return;
            const { error: updateError } = await supabase
              .from('leads')
              .update({ email: r.value.email })
              .eq('id', r.value.id);
            if (!updateError) enriched++;
          })
        );
      }

      console.log(`enrich-emails: enriched ${enriched}/${targets.length} leads`);
    });

    return NextResponse.json(
      {
        status: 'queued',
        queued: targets.length,
        message: `Enriching ${targets.length} lead${targets.length === 1 ? '' : 's'}. Refresh in ~30s.`,
      },
      { status: 202 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// GET /api/leads/enrich-emails — Count how many leads could be enriched.
export async function GET() {
  const supabase = getServiceSupabase();

  const { count, error } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('email', null)
    .not('website_url', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ eligible: count ?? 0 });
}
