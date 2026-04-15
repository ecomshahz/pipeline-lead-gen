import { withRetry } from '@/lib/utils';
import { trackApiCall } from '@/lib/api-usage';

interface HunterResponse {
  data?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    score?: number;
    domain?: string;
    sources?: Array<{
      domain: string;
      uri: string;
    }>;
  };
  errors?: Array<{ details: string }>;
}

interface DomainSearchResponse {
  data?: {
    emails?: Array<{
      value: string;
      first_name: string;
      last_name: string;
      position: string;
      confidence: number;
      type: string;
    }>;
    organization?: string;
  };
  errors?: Array<{ details: string }>;
}

export interface EmailFinderResult {
  email: string | null;
  owner_name: string | null;
  confidence: number;
}

const HUNTER_API = 'https://api.hunter.io/v2';

// Try to find an email using the business domain
export async function findEmailByDomain(
  domain: string,
  apiKey: string
): Promise<EmailFinderResult> {
  // Clean the domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  try {
    const result = await withRetry(async () => {
      const params = new URLSearchParams({
        domain: cleanDomain,
        api_key: apiKey,
      });

      const response = await fetch(`${HUNTER_API}/domain-search?${params}`);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limited');
        }
        throw new Error(`Hunter API error: ${response.status}`);
      }

      return response.json() as Promise<DomainSearchResponse>;
    }, 2);

    trackApiCall('hunter_io', 'domain_search');

    if (result.errors && result.errors.length > 0) {
      console.warn(`Hunter API warning for ${cleanDomain}:`, result.errors[0].details);
      return { email: null, owner_name: null, confidence: 0 };
    }

    const emails = result.data?.emails ?? [];
    if (emails.length === 0) {
      return { email: null, owner_name: null, confidence: 0 };
    }

    // Prefer owner/CEO/founder emails, then sort by confidence
    const priorityPositions = ['owner', 'ceo', 'founder', 'president', 'director', 'manager'];
    const sorted = [...emails].sort((a, b) => {
      const aPriority = priorityPositions.findIndex((p) =>
        (a.position ?? '').toLowerCase().includes(p)
      );
      const bPriority = priorityPositions.findIndex((p) =>
        (b.position ?? '').toLowerCase().includes(p)
      );

      // If both have priority positions, sort by that
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      // Priority positions first
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      // Otherwise sort by confidence
      return b.confidence - a.confidence;
    });

    const best = sorted[0];
    const ownerName =
      best.first_name && best.last_name
        ? `${best.first_name} ${best.last_name}`
        : best.first_name || null;

    return {
      email: best.value,
      owner_name: ownerName,
      confidence: best.confidence,
    };
  } catch (error) {
    console.error(`Email finder error for ${cleanDomain}:`, error);
    return { email: null, owner_name: null, confidence: 0 };
  }
}

// Try to find email using business name and domain together
export async function findEmailByName(
  fullName: string,
  domain: string,
  apiKey: string
): Promise<string | null> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  if (!firstName || !lastName) return null;

  try {
    const result = await withRetry(async () => {
      const params = new URLSearchParams({
        domain: cleanDomain,
        first_name: firstName,
        last_name: lastName,
        api_key: apiKey,
      });

      const response = await fetch(`${HUNTER_API}/email-finder?${params}`);

      if (!response.ok) {
        throw new Error(`Hunter API error: ${response.status}`);
      }

      return response.json() as Promise<HunterResponse>;
    }, 2);

    trackApiCall('hunter_io', 'email_finder');

    if (result.data?.email && (result.data.score ?? 0) >= 50) {
      return result.data.email;
    }

    return null;
  } catch (error) {
    console.error(`Email name search error:`, error);
    return null;
  }
}
