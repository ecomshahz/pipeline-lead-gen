import { NextRequest, NextResponse, after } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
  searchBusinesses,
  parseAddress,
  type PlaceResult,
} from '@/lib/scraper/google-places';
import { analyzePageSpeed } from '@/lib/scraper/pagespeed';
import { findEmailByDomain } from '@/lib/scraper/email-finder';
import { analyzeWebsite } from '@/lib/scraper/website-analyzer';
import { detectAIOpportunities } from '@/lib/scraper/ai-detector';
import { calculateLeadScore } from '@/lib/scoring';
import { STATE_TIMEZONES } from '@/lib/niches';

// Vercel serverless limit: 60s on Hobby plan, up to 300s on Pro.
// The scrape loop checks this and bails before the function is killed.
export const maxDuration = 60;

// We cap every scrape at this many QUALIFIED hot/warm leads. Low-quality
// businesses (solid existing websites) get filtered out — the user wants a
// clean pipeline of prospects worth calling, not a huge dump of noise.
const HOT_LEAD_TARGET = 20;

// We pull up to this many candidates from Google so we have a large enough
// pool to find 20 genuinely qualified leads even if most have decent sites.
const CANDIDATE_POOL_SIZE = 60;

// How many places we analyze concurrently. Each branch does a website fetch
// (≤5s) plus a few DB ops. 10 keeps Vercel + Supabase happy.
const PLACE_BATCH_SIZE = 10;

/**
 * Decides whether a business is "hot" enough to be worth a sales call.
 * The whole point of the pipeline is to surface businesses we can realistically
 * close. If they already have a fast, modern, mobile-friendly website with
 * online booking and a contact form, we probably can't sell them a new one.
 *
 * A business qualifies if ANY of these are true:
 *   - No website at all (strongest signal — guaranteed close opportunity)
 *   - Website we couldn't even fetch (likely broken, slow, or dead)
 *   - Missing mobile viewport meta (ancient/amateur site in 2026)
 *   - No SSL cert (security red flag, easy upsell)
 *   - PageSpeed score <70 when available (measurable performance pitch)
 *   - Missing BOTH contact form AND booking system (we have a clear pitch)
 */
function qualifiesAsHotLead(
  hasWebsite: boolean,
  websiteAnalysis: { issues: string[] } | null,
  websiteScore: number | null
): boolean {
  if (!hasWebsite) return true;
  if (!websiteAnalysis) return true; // analysis failed → probably a broken site

  const issues = new Set(websiteAnalysis.issues ?? []);

  // Critical single-signal disqualifications of the current site
  if (issues.has('website_unreachable')) return true;
  if (issues.has('not_mobile_friendly')) return true;
  if (issues.has('no_ssl')) return true;

  // Measurable slowness (only when PageSpeed ran)
  if (websiteScore !== null && websiteScore < 70) return true;

  // Double-missing: no contact form AND no online booking. For service
  // businesses this is a clear pitch ("you're leaking leads after hours").
  if (issues.has('no_contact_form') && issues.has('no_booking_system')) return true;

  // Otherwise they've got a reasonable web presence — skip.
  return false;
}

// How many seconds before function timeout we should stop starting new work.
// Leaves a buffer so in-flight work (DB writes) can complete.
const TIMEOUT_BUFFER_MS = 8000;

// In-memory set of cancelled job IDs (checked during scrape loop)
const cancelledJobs = new Set<string>();

// POST /api/scrape — Start a scrape job for a niche + location
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const { niche, city, state } = await request.json();

    if (!niche || !city || !state) {
      return NextResponse.json(
        { error: 'niche, city, and state are required' },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    const pagespeedApiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    const hunterApiKey = process.env.HUNTER_API_KEY;

    if (!googleApiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      );
    }

    // Create scrape job record
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        niche,
        location: `${city}, ${state}`,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    // Schedule the scrape to run AFTER the response is sent.
    // `after()` keeps the serverless function alive up to maxDuration,
    // unlike fire-and-forget promises which get killed when the response ships.
    after(async () => {
      try {
        await runScrapeJob(
          job.id,
          niche,
          city,
          state,
          googleApiKey,
          pagespeedApiKey ?? '',
          hunterApiKey ?? '',
          supabase
        );
      } catch (err) {
        console.error(`Scrape job ${job.id} failed:`, err);
      }
    });

    return NextResponse.json({
      jobId: job.id,
      status: 'running',
      message: `Scraping ${niche} in ${city}, ${state}...`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// GET /api/scrape — Get scrape job status
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (jobId) {
    const { data, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Return all recent jobs
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/scrape — Cancel a running scrape job
export async function PATCH(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const { jobId, action } = await request.json();

    if (!jobId || action !== 'cancel') {
      return NextResponse.json(
        { error: 'jobId and action:"cancel" required' },
        { status: 400 }
      );
    }

    // Add to in-memory cancellation set
    cancelledJobs.add(jobId);

    // Update DB status immediately
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return NextResponse.json({ success: true, message: 'Job cancelled' });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// The actual scraping logic — runs asynchronously
async function runScrapeJob(
  jobId: string,
  niche: string,
  city: string,
  state: string,
  googleApiKey: string,
  pagespeedApiKey: string,
  hunterApiKey: string,
  supabase: ReturnType<typeof getServiceSupabase>
) {
  // Shared counter used to enforce a hard cap across parallel inserts.
  const counter: LeadCounter = { inserted: 0, reserved: 0, target: HOT_LEAD_TARGET };
  const startedAt = Date.now();
  const deadlineMs = startedAt + (maxDuration * 1000) - TIMEOUT_BUFFER_MS;
  // PageSpeed is slow (3-30s per URL) and optional — enable with RUN_PAGESPEED=true
  const runPageSpeed = process.env.RUN_PAGESPEED === 'true';

  try {
    // Step 1: Pull a large candidate pool from Google. We'll filter down to
    // HOT_LEAD_TARGET qualified businesses from this pool.
    const places = await searchBusinesses(niche, city, state, googleApiKey, CANDIDATE_POOL_SIZE);
    console.log(
      `Found ${places.length} candidates for ${niche} in ${city}, ${state} — filtering to ${HOT_LEAD_TARGET} hot leads`
    );

    // Hot-lead prioritization: process businesses with NO website first.
    // They're the highest-value prospects for an AI/web agency, AND they skip
    // the slow website-analysis path so we get to "leads found > 0" fast.
    const sortedPlaces = [...places].sort((a, b) => {
      const aHot = a.website ? 1 : 0;
      const bHot = b.website ? 1 : 0;
      if (aHot !== bHot) return aHot - bHot;
      // Within each bucket, prefer well-reviewed businesses (better close potential)
      const aReviews = a.user_ratings_total ?? 0;
      const bReviews = b.user_ratings_total ?? 0;
      return bReviews - aReviews;
    });

    // Process places in parallel batches. Each batch does Google + website +
    // optional Hunter + DB insert concurrently — bounded so we don't melt anything.
    // Hard cap is enforced inside processPlace via the shared counter.
    for (let i = 0; i < sortedPlaces.length && counter.inserted < HOT_LEAD_TARGET; i += PLACE_BATCH_SIZE) {
      // Check if job was cancelled
      if (cancelledJobs.has(jobId)) {
        console.log(`Job ${jobId} cancelled by user`);
        cancelledJobs.delete(jobId);
        return;
      }

      // Bail if we're about to hit Vercel's serverless timeout.
      if (Date.now() > deadlineMs) {
        console.log(`Job ${jobId} stopping early near timeout (${counter.inserted} hot leads found)`);
        break;
      }

      const batch = sortedPlaces.slice(i, i + PLACE_BATCH_SIZE);
      const before = counter.inserted;

      await Promise.allSettled(
        batch.map((place) =>
          processPlace(
            place,
            niche,
            city,
            state,
            pagespeedApiKey,
            hunterApiKey,
            runPageSpeed,
            supabase,
            counter
          )
        )
      );

      if (counter.inserted > before) {
        await supabase
          .from('scrape_jobs')
          .update({ leads_found: counter.inserted })
          .eq('id', jobId);
      }
    }

    const leadsFound = counter.inserted;
    console.log(
      `Job ${jobId} done: inserted ${leadsFound} hot leads from ${sortedPlaces.length} candidates`
    );

    // Update job as completed
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'completed',
        leads_found: leadsFound,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('daily_stats')
        .update({ leads_scraped: existing.leads_scraped + leadsFound })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('daily_stats')
        .insert({ date: today, leads_scraped: leadsFound });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Scrape job ${jobId} failed:`, errorMessage);

    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        leads_found: counter.inserted,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', jobId);
  } finally {
    cancelledJobs.delete(jobId);
  }
}

// Per-place pipeline: website analysis → AI detection → email lookup → DB insert.
// Returns 'inserted' on success, 'duplicate' on dedup, 'error' on failure.
// Designed to be safely run in parallel (Promise.allSettled) for many places at once.
// Shared, mutable counter passed through the parallel batch so we can enforce
// a HARD cap on inserted leads even across concurrent tasks. `reserved`
// tracks inserts in flight so racing tasks can't collectively overshoot.
type LeadCounter = { inserted: number; reserved: number; target: number };

async function processPlace(
  place: PlaceResult,
  niche: string,
  city: string,
  state: string,
  pagespeedApiKey: string,
  hunterApiKey: string,
  runPageSpeed: boolean,
  supabase: ReturnType<typeof getServiceSupabase>,
  counter: LeadCounter
): Promise<'inserted' | 'duplicate' | 'skipped_has_good_website' | 'skipped_target_reached' | 'error'> {
  try {
    const parsed = parseAddress(place.formatted_address);
    const hasWebsite = !!place.website;
    let websiteScore: number | null = null;
    let websiteIssues: string[] = [];
    let websiteAnalysis = null;

    // Website analysis (skipped entirely for no-website hot leads)
    if (hasWebsite && place.website) {
      // PageSpeed and DOM analysis run in parallel — both are HTTP-bound
      const [psResult, htmlResult] = await Promise.allSettled([
        runPageSpeed && pagespeedApiKey
          ? analyzePageSpeed(place.website, pagespeedApiKey)
          : Promise.resolve(null),
        analyzeWebsite(place.website),
      ]);

      if (psResult.status === 'fulfilled' && psResult.value) {
        websiteScore = psResult.value.score;
        websiteIssues = psResult.value.issues;
      } else if (psResult.status === 'rejected') {
        console.warn(`PageSpeed failed for ${place.website}:`, psResult.reason);
      }

      if (htmlResult.status === 'fulfilled') {
        websiteAnalysis = htmlResult.value;
        websiteIssues = [...new Set([...websiteIssues, ...htmlResult.value.issues])];
      } else {
        console.warn(`Website analysis failed for ${place.website}:`, htmlResult.reason);
      }
    }

    // HOT-LEAD GATE: bail early on businesses with a solid existing web
    // presence. They're not a fit for "we'll build you a website" pitches.
    if (!qualifiesAsHotLead(hasWebsite, websiteAnalysis, websiteScore)) {
      return 'skipped_has_good_website';
    }

    const aiResult = detectAIOpportunities(websiteAnalysis, hasWebsite);

    // Prefer email scraped directly from the site (free, accurate). Fall back
    // to Hunter.io if a key is configured and the website didn't surface one.
    let email: string | null = websiteAnalysis?.email ?? null;
    let ownerName: string | null = null;
    if (!email && hunterApiKey && hasWebsite && place.website) {
      try {
        const emailResult = await findEmailByDomain(place.website, hunterApiKey);
        email = emailResult.email;
        ownerName = emailResult.owner_name;
      } catch (err) {
        console.warn(`Email finder failed for ${place.website}:`, err);
      }
    }

    const leadData = {
      business_name: place.name,
      business_type: niche,
      niche,
      owner_name: ownerName,
      phone: place.formatted_phone_number ?? null,
      email,
      address: parsed.address,
      city: parsed.city || city,
      state: parsed.state || state,
      zip: parsed.zip,
      timezone: STATE_TIMEZONES[parsed.state || state] ?? null,
      website_url: place.website ?? null,
      has_website: hasWebsite,
      website_score: websiteScore,
      website_issues: websiteIssues,
      google_rating: place.rating ?? null,
      review_count: place.user_ratings_total ?? 0,
      needs_ai_services: aiResult.needs_ai_services,
      ai_opportunity_notes: aiResult.ai_opportunity_notes,
      source: 'google_places',
      scraped_at: new Date().toISOString(),
    };

    const { score, breakdown } = calculateLeadScore(leadData);

    // HARD CAP: reserve a slot before the insert. If we + other in-flight
    // tasks have already claimed the target, bail without writing.
    if (counter.inserted + counter.reserved >= counter.target) {
      return 'skipped_target_reached';
    }
    counter.reserved++;

    let insertError;
    try {
      const result = await supabase.from('leads').insert({
        ...leadData,
        lead_score: score,
        lead_score_breakdown: breakdown,
      });
      insertError = result.error;
    } finally {
      counter.reserved--;
    }

    if (!insertError) {
      counter.inserted++;
      return 'inserted';
    }
    if (insertError.message.includes('duplicate')) return 'duplicate';

    console.warn(`Failed to insert lead ${place.name}:`, insertError.message);
    return 'error';
  } catch (err) {
    console.error(`Error processing ${place.name}:`, err);
    return 'error';
  }
}
