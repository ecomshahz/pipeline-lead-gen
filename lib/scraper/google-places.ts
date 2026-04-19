import { delay, withRetry } from '@/lib/utils';
import { trackApiCall } from '@/lib/api-usage';

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
  geometry?: {
    location: { lat: number; lng: number };
  };
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
}

interface TextSearchResponse {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    types?: string[];
    geometry?: {
      location: { lat: number; lng: number };
    };
  }>;
  next_page_token?: string;
  status: string;
  error_message?: string;
}

interface PlaceDetailsResponse {
  result: PlaceResult;
  status: string;
  error_message?: string;
}

const API_BASE = 'https://maps.googleapis.com/maps/api/place';

export async function searchBusinesses(
  niche: string,
  city: string,
  state: string,
  apiKey: string,
  maxResults: number = 60
): Promise<PlaceResult[]> {
  const query = `${niche} in ${city}, ${state}`;
  const allResults: PlaceResult[] = [];
  let pageToken: string | undefined;

  // Google Places returns up to 20 results per page, max 3 pages (60 results).
  // Detail fetches run in parallel batches — sequential w/100ms delay was eating ~6s per page.
  const DETAIL_BATCH_SIZE = 10;

  for (let page = 0; page < 3 && allResults.length < maxResults; page++) {
    const results = await withRetry(() =>
      textSearch(query, apiKey, pageToken)
    );

    if (!results || results.results.length === 0) break;

    // Cap the page to whatever budget remains
    const remaining = maxResults - allResults.length;
    const pagePlaces = results.results.slice(0, remaining);

    // Fan out detail requests in parallel batches
    for (let i = 0; i < pagePlaces.length; i += DETAIL_BATCH_SIZE) {
      const batch = pagePlaces.slice(i, i + DETAIL_BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map((place) =>
          withRetry(() => getPlaceDetails(place.place_id, apiKey))
        )
      );

      settled.forEach((res, idx) => {
        const place = batch[idx];
        if (res.status === 'fulfilled' && res.value?.result) {
          allResults.push(res.value.result);
        } else {
          if (res.status === 'rejected') {
            console.warn(`Detail fetch failed for ${place.name}:`, res.reason);
          }
          // Fall back to basic info so we don't lose the lead entirely
          allResults.push({
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            business_status: place.business_status,
            types: place.types,
            geometry: place.geometry,
          });
        }
      });
    }

    pageToken = results.next_page_token;
    if (!pageToken) break;

    // Google requires a short delay before using next_page_token
    await delay(2000);
  }

  return allResults;
}

async function textSearch(
  query: string,
  apiKey: string,
  pageToken?: string
): Promise<TextSearchResponse> {
  const params = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (pageToken) {
    params.set('pagetoken', pageToken);
  }

  const response = await fetch(`${API_BASE}/textsearch/json?${params}`);

  if (!response.ok) {
    throw new Error(`Google Places text search failed: ${response.status}`);
  }

  const data: TextSearchResponse = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(
      `Google Places API error: ${data.status} — ${data.error_message ?? 'Unknown error'}`
    );
  }

  trackApiCall('google_places', 'text_search');

  return data;
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetailsResponse> {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'business_status',
    'types',
    'geometry',
    'opening_hours',
  ].join(',');

  const params = new URLSearchParams({
    place_id: placeId,
    fields,
    key: apiKey,
  });

  const response = await fetch(`${API_BASE}/details/json?${params}`);

  if (!response.ok) {
    throw new Error(`Google Places details failed: ${response.status}`);
  }

  const data: PlaceDetailsResponse = await response.json();

  if (data.status !== 'OK') {
    throw new Error(
      `Google Places details error: ${data.status} — ${data.error_message ?? 'Unknown error'}`
    );
  }

  trackApiCall('google_places', 'place_details');

  return data;
}

// Parse address components from formatted_address
export function parseAddress(formattedAddress: string): {
  address: string;
  city: string;
  state: string;
  zip: string;
} {
  // Typical format: "123 Main St, City, ST 12345, USA"
  const parts = formattedAddress.split(',').map((s) => s.trim());

  if (parts.length >= 3) {
    const address = parts[0];
    const city = parts[1];
    const stateZip = parts[2].trim().split(' ');
    const state = stateZip[0] || '';
    const zip = stateZip[1] || '';

    return { address, city, state, zip };
  }

  return {
    address: formattedAddress,
    city: '',
    state: '',
    zip: '',
  };
}
