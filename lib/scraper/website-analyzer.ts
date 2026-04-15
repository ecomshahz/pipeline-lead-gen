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
}

// Analyze a website's HTML for quality signals and AI opportunity detection
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const has_ssl = normalizedUrl.startsWith('https://');

  let html: string;
  try {
    html = await withRetry(async () => {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.text();
    }, 2);
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
    };
  }

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
  };
}
