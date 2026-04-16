import { NextRequest, NextResponse, after } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { searchBusinesses, parseAddress } from '@/lib/scraper/google-places';
import { analyzePageSpeed } from '@/lib/scraper/pagespeed';
import { findEmailByDomain } from '@/lib/scraper/email-finder';
import { analyzeWebsite } from '@/lib/scraper/website-analyzer';
import { detectAIOpportunities } from '@/lib/scraper/ai-detector';
import { calculateLeadScore } from '@/lib/scoring';
import { STATE_TIMEZONES } from '@/lib/niches';
import { delay } from '@/lib/utils';

// Vercel serverless limit: 60s on Hobby plan, up to 300s on Pro.
// The scrape loop checks this and bails before the function is killed.
export const maxDuration = 60;

// Process at most this many places per job so we finish within maxDuration.
// Each place takes ~1-3s (Google Places details + website analysis + DB insert).
const MAX_PLACES_PER_JOB = 20;

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
  let leadsFound = 0;
  const startedAt = Date.now();
  const deadlineMs = startedAt + (maxDuration * 1000) - TIMEOUT_BUFFER_MS;
  // PageSpeed is slow (3-30s per URL) and optional — enable with RUN_PAGESPEED=true
  const runPageSpeed = process.env.RUN_PAGESPEED === 'true';

  try {
    // Step 1: Search Google Places (capped so we fit within maxDuration)
    const places = await searchBusinesses(niche, city, state, googleApiKey, MAX_PLACES_PER_JOB);
    console.log(`Found ${places.length} places for ${niche} in ${city}, ${state}`);

    for (const place of places) {
      // Check if job was cancelled
      if (cancelledJobs.has(jobId)) {
        console.log(`Job ${jobId} cancelled by user`);
        cancelledJobs.delete(jobId);
        return;
      }

      // Bail if we're about to hit Vercel's serverless timeout.
      // Mark the job completed with whatever we got so far.
      if (Date.now() > deadlineMs) {
        console.log(`Job ${jobId} stopping early near timeout (${leadsFound} leads found)`);
        break;
      }

      try {
        const parsed = parseAddress(place.formatted_address);
        const hasWebsite = !!place.website;
        let websiteScore: number | null = null;
        let websiteIssues: string[] = [];
        let websiteAnalysis = null;

        // Step 2: Analyze website if it exists
        if (hasWebsite && place.website) {
          // PageSpeed is opt-in — it's the slowest step (3-30s per URL)
          if (runPageSpeed && pagespeedApiKey) {
            try {
              const psResult = await analyzePageSpeed(place.website, pagespeedApiKey);
              websiteScore = psResult.score;
              websiteIssues = psResult.issues;
            } catch (err) {
              console.warn(`PageSpeed failed for ${place.website}:`, err);
            }
          }

          try {
            websiteAnalysis = await analyzeWebsite(place.website);
            websiteIssues = [...new Set([...websiteIssues, ...websiteAnalysis.issues])];
          } catch (err) {
            console.warn(`Website analysis failed for ${place.website}:`, err);
          }
        }

        // Step 3: Detect AI opportunities
        const aiResult = detectAIOpportunities(websiteAnalysis, hasWebsite);

        // Step 4: Find email
        let email: string | null = null;
        let ownerName: string | null = null;

        if (hunterApiKey && hasWebsite && place.website) {
          try {
            const emailResult = await findEmailByDomain(place.website, hunterApiKey);
            email = emailResult.email;
            ownerName = emailResult.owner_name;
          } catch (err) {
            console.warn(`Email finder failed for ${place.website}:`, err);
          }
        }

        // Step 5: Build lead data and calculate score
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

        // Step 6: Insert lead (with dedup check)
        const { error: insertError } = await supabase.from('leads').insert({
          ...leadData,
          lead_score: score,
          lead_score_breakdown: breakdown,
        });

        if (!insertError) {
          leadsFound++;
          // Update leads_found count in real-time
          await supabase
            .from('scrape_jobs')
            .update({ leads_found: leadsFound })
            .eq('id', jobId);
        } else if (!insertError.message.includes('duplicate')) {
          console.warn(`Failed to insert lead ${place.name}:`, insertError.message);
        }

        await delay(50);
      } catch (err) {
        console.error(`Error processing ${place.name}:`, err);
      }
    }

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
        leads_found: leadsFound,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', jobId);
  } finally {
    cancelledJobs.delete(jobId);
  }
}
