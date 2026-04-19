import * as cheerio from 'cheerio';
import { withRetry } from '@/lib/utils';

export interface WebsiteAnalysis {
  has_contact_form: boolean;
  has_chatbot: boolean;
  has_booking_system: boolean;
  has_blog: boolean;
  has_social_links: boolean;
  has_ssl: boolean;
  is_mobile_friendly: boolean;
  issues: string[];
  ai_opportunities: string[];
  /** First plausible business email found on the page, if any */
  email: string | null;
}

// Emails we explicitly don't want to treat as real business contact addresses.
// Noreply / tracking / CDN / template boilerplate / generic vendor addresses.
const EMAIL_DOMAIN_DENYLIST = [
  'sentry.io',
  'sentry-next.wixpress.com',
  'wixpress.com',
  'wix.com',
  'squarespace.com',
  'godaddy.com',
  'godaddysites.com',
  'weebly.com',
  'example.com',
  'domain.com',
  'sentry.wixpress.com',
];

const EMAIL_LOCAL_DENYLIST = [
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'postmaster',
  'abuse',
  'webmaster',
  'privacy',
  'unsubscribe',
];

// Rough email regex — good enough for HTML scraping. Not RFC-5321 perfect.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function isPlausibleBusinessEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return false;
  if (EMAIL_LOCAL_DENYLIST.some((bad) => local.startsWith(bad))) return false;
  if (EMAIL_DOMAIN_DENYLIST.some((bad) => domain.endsWith(bad))) return false;
  // Filter out sentry/tracking emails that look like hashes
  if (/^[a-f0-9]{16,}$/.test(local)) return false;
  return true;
}

// Score emails so the best candidate wins when a page has several.
// Owner/contact/booking style addresses score higher than generic info@.
function scoreEmail(email: string, siteDomain: string | null): number {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  let score = 0;

  // Strongly prefer emails on the site's own domain
  if (siteDomain && domain.endsWith(siteDomain)) score += 50;

  // Role-based priorities
  const priorities: Array<{ match: RegExp; points: number }> = [
    { match: /^(owner|founder|ceo|president)/, points: 40 },
    { match: /^(hello|hi|contact|team)/, points: 30 },
    { match: /^(booking|bookings|appointments|schedule)/, points: 25 },
    { match: /^(sales|inquiries|office)/, points: 20 },
    { match: /^(info|admin)/, points: 15 },
    { match: /^(support|help)/, points: 10 },
  ];
  for (const p of priorities) {
    if (p.match.test(local)) {
      score += p.points;
      break;
    }
  }

  // Slight penalty for free providers (still valid, just less professional)
  if (/@(gmail|yahoo|outlook|hotmail|aol|icloud)\./.test(lower)) score -= 5;

  return score;
}

/** Extract the best candidate business email from page HTML. */
function extractEmailFromHtml(
  $: cheerio.CheerioAPI,
  html: string,
  siteDomain: string | null
): string | null {
  const candidates = new Set<string>();

  // 1) mailto: links — most reliable signal
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const raw = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (raw) candidates.add(raw);
  });

  // 2) Free-text scan of the raw HTML (catches emails inside footers, schema.org JSON-LD, etc)
  const matches = html.match(EMAIL_PATTERN) ?? [];
  for (const m of matches) candidates.add(m);

  const valid = Array.from(candidates)
    .map((e) => e.trim())
    .filter((e) => isPlausibleBusinessEmail(e));

  if (valid.length === 0) return null;

  valid.sort((a, b) => scoreEmail(b, siteDomain) - scoreEmail(a, siteDomain));
  return valid[0];
}

// Analyze a website's HTML for quality signals and AI opportunity detection
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const has_ssl = normalizedUrl.startsWith('https://');

  let html: string;
  try {
    // 5s timeout, no retries — slow sites are common and we can't afford to wait
    html = await withRetry(async () => {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.text();
    }, 0);
  } catch {
    // Can't fetch the website — return defaults
    return {
      has_contact_form: false,
      has_chatbot: false,
      has_booking_system: false,
      has_blog: false,
      has_social_links: false,
      has_ssl,
      is_mobile_friendly: false,
      issues: ['website_unreachable'],
      ai_opportunities: [
        'Website appears to be down or unreachable — they may need a new one',
      ],
      email: null,
    };
  }

  const siteDomain = (() => {
    try {
      return new URL(normalizedUrl).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  })();

  const $ = cheerio.load(html);
  const htmlLower = html.toLowerCase();
  const issues: string[] = [];
  const ai_opportunities: string[] = [];

  // Check for contact form
  const has_contact_form =
    $('form').length > 0 &&
    (htmlLower.includes('contact') ||
      htmlLower.includes('message') ||
      htmlLower.includes('inquiry') ||
      $('input[type="email"]').length > 0);

  if (!has_contact_form) {
    issues.push('no_contact_form');
    ai_opportunities.push(
      'No contact form — customers can only reach them by phone'
    );
  }

  // Check for chatbot / live chat widgets
  const chatbotIndicators = [
    'tawk.to', 'intercom', 'drift', 'livechat', 'zendesk',
    'hubspot', 'crisp', 'tidio', 'freshchat', 'olark',
    'chat-widget', 'chatbot', 'live-chat', 'messenger-widget',
  ];
  const has_chatbot = chatbotIndicators.some((indicator) =>
    htmlLower.includes(indicator)
  );

  if (!has_chatbot) {
    issues.push('no_chatbot');
    ai_opportunities.push(
      'No chatbot or live chat — missing after-hours customer engagement'
    );
  }

  // Check for booking/scheduling system
  const bookingIndicators = [
    'calendly', 'acuity', 'booksy', 'square appointments',
    'schedulicity', 'setmore', 'book online', 'book now',
    'schedule appointment', 'booking', 'reservation',
    'book-now', 'schedule-now', 'appointment',
  ];
  const has_booking_system = bookingIndicators.some((indicator) =>
    htmlLower.includes(indicator)
  );

  if (!has_booking_system) {
    issues.push('no_booking_system');
    ai_opportunities.push(
      'No online booking system — customers must call to schedule'
    );
  }

  // Check for blog
  const has_blog =
    $('a[href*="blog"]').length > 0 ||
    $('a[href*="news"]').length > 0 ||
    $('a[href*="articles"]').length > 0 ||
    htmlLower.includes('/blog');

  if (!has_blog) {
    issues.push('no_blog');
  }

  // Check for social media links
  const socialPlatforms = [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
    'linkedin.com', 'youtube.com', 'tiktok.com',
  ];
  const has_social_links = socialPlatforms.some((platform) =>
    htmlLower.includes(platform)
  );

  if (!has_social_links) {
    issues.push('no_social_links');
  }

  // Check for mobile viewport
  const viewportMeta = $('meta[name="viewport"]');
  const is_mobile_friendly =
    viewportMeta.length > 0 &&
    (viewportMeta.attr('content') ?? '').includes('width=device-width');

  if (!is_mobile_friendly) {
    issues.push('not_mobile_friendly');
  }

  if (!has_ssl) {
    issues.push('no_ssl');
  }

  const email = extractEmailFromHtml($, html, siteDomain);

  return {
    has_contact_form,
    has_chatbot,
    has_booking_system,
    has_blog,
    has_social_links,
    has_ssl,
    is_mobile_friendly,
    issues,
    ai_opportunities,
    email,
  };
}
