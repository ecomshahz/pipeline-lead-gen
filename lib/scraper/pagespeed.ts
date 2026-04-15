import { withRetry } from '@/lib/utils';
import { trackApiCall } from '@/lib/api-usage';

interface PageSpeedResult {
  score: number; // 0-100
  issues: string[];
  mobile_friendly: boolean;
  has_ssl: boolean;
  load_time_ms: number;
}

interface LighthouseAudit {
  score: number | null;
  displayValue?: string;
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number };
    };
    audits?: Record<string, LighthouseAudit>;
  };
  loadingExperience?: {
    overall_category?: string;
  };
  error?: {
    message: string;
  };
}

const API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export async function analyzePageSpeed(
  url: string,
  apiKey: string
): Promise<PageSpeedResult> {
  // Ensure the URL has a protocol
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const has_ssl = normalizedUrl.startsWith('https://');

  const result = await withRetry(async () => {
    const params = new URLSearchParams({
      url: normalizedUrl,
      key: apiKey,
      strategy: 'mobile',
      category: 'performance',
    });

    const response = await fetch(`${API_URL}?${params}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`PageSpeed API error: ${response.status}`);
    }

    return response.json() as Promise<PageSpeedResponse>;
  }, 2);

  if (result.error) {
    throw new Error(`PageSpeed API error: ${result.error.message}`);
  }

  trackApiCall('google_pagespeed', 'analyze');

  const lighthouse = result.lighthouseResult;
  const performanceScore = lighthouse?.categories?.performance?.score ?? 0;
  const score = Math.round(performanceScore * 100);
  const audits = lighthouse?.audits ?? {};
  const issues: string[] = [];

  // Check for specific issues
  const viewportAudit = audits['viewport'];
  const mobile_friendly = viewportAudit?.score === 1;
  if (!mobile_friendly) {
    issues.push('not_mobile_friendly');
  }

  if (!has_ssl) {
    issues.push('no_ssl');
  }

  // Check for slow load time
  const speedIndex = audits['speed-index'];
  const loadTime = speedIndex?.displayValue
    ? parseFloat(speedIndex.displayValue)
    : 0;
  const load_time_ms = loadTime * 1000;

  if (score < 50) {
    issues.push('slow_loading');
  }

  // Check for render-blocking resources
  if (audits['render-blocking-resources']?.score !== null &&
      audits['render-blocking-resources']?.score !== undefined &&
      audits['render-blocking-resources'].score < 0.9) {
    issues.push('render_blocking_resources');
  }

  // Check for unoptimized images
  if (audits['uses-optimized-images']?.score !== null &&
      audits['uses-optimized-images']?.score !== undefined &&
      audits['uses-optimized-images'].score < 0.9) {
    issues.push('unoptimized_images');
  }

  // Check for large DOM
  if (audits['dom-size']?.score !== null &&
      audits['dom-size']?.score !== undefined &&
      audits['dom-size'].score < 0.5) {
    issues.push('large_dom');
  }

  // Mark as outdated design if overall score is very low
  if (score < 30) {
    issues.push('outdated_design');
  }

  return {
    score,
    issues,
    mobile_friendly,
    has_ssl,
    load_time_ms,
  };
}

// Convert issue codes to human-readable descriptions
export function describeIssue(issue: string): string {
  const descriptions: Record<string, string> = {
    not_mobile_friendly: 'Website is not mobile-friendly',
    no_ssl: 'No SSL certificate (not secure)',
    slow_loading: 'Page loads very slowly',
    render_blocking_resources: 'Has render-blocking resources',
    unoptimized_images: 'Images are not optimized',
    large_dom: 'Overly complex page structure',
    outdated_design: 'Likely outdated website design',
    no_contact_form: 'No contact form found',
    no_chatbot: 'No chatbot or live chat',
    no_booking_system: 'No online booking system',
    no_blog: 'No blog or content marketing',
    no_social_links: 'No social media integration',
  };

  return descriptions[issue] ?? issue;
}
