import { NicheConfig, NicheTier } from '@/types';

export const NICHES: NicheConfig[] = [
  // Tier 1 — Highest close rate for web/AI services
  { name: 'Plumbers', tier: 'tier1', tierNumber: 1 },
  { name: 'HVAC Contractors', tier: 'tier1', tierNumber: 1 },
  { name: 'Electricians', tier: 'tier1', tierNumber: 1 },
  { name: 'Roofing Companies', tier: 'tier1', tierNumber: 1 },
  { name: 'General Contractors', tier: 'tier1', tierNumber: 1 },
  { name: 'Auto Repair Shops', tier: 'tier1', tierNumber: 1 },
  { name: 'Landscaping Companies', tier: 'tier1', tierNumber: 1 },
  { name: 'Pest Control Services', tier: 'tier1', tierNumber: 1 },
  { name: 'Cleaning Services', tier: 'tier1', tierNumber: 1 },
  { name: 'Moving Companies', tier: 'tier1', tierNumber: 1 },

  // Tier 2 — High value, slightly more competitive
  { name: 'Dentists', tier: 'tier2', tierNumber: 2 },
  { name: 'Chiropractors', tier: 'tier2', tierNumber: 2 },
  { name: 'Law Firms', tier: 'tier2', tierNumber: 2 },
  { name: 'Real Estate Agents', tier: 'tier2', tierNumber: 2 },
  { name: 'Insurance Agencies', tier: 'tier2', tierNumber: 2 },
  { name: 'Accounting Firms', tier: 'tier2', tierNumber: 2 },
  { name: 'Veterinary Clinics', tier: 'tier2', tierNumber: 2 },
  { name: 'Med Spas', tier: 'tier2', tierNumber: 2 },
  { name: 'Physical Therapy', tier: 'tier2', tierNumber: 2 },
  { name: 'Home Inspectors', tier: 'tier2', tierNumber: 2 },

  // Tier 3 — Volume play, many businesses, lower deal size
  { name: 'Restaurants', tier: 'tier3', tierNumber: 3 },
  { name: 'Hair Salons', tier: 'tier3', tierNumber: 3 },
  { name: 'Gyms', tier: 'tier3', tierNumber: 3 },
  { name: 'Tutoring Services', tier: 'tier3', tierNumber: 3 },
  { name: 'Photography Studios', tier: 'tier3', tierNumber: 3 },
  { name: 'Pet Grooming', tier: 'tier3', tierNumber: 3 },
  { name: 'Florists', tier: 'tier3', tierNumber: 3 },
  { name: 'Dry Cleaners', tier: 'tier3', tierNumber: 3 },
  { name: 'Daycares', tier: 'tier3', tierNumber: 3 },
  { name: 'Martial Arts Studios', tier: 'tier3', tierNumber: 3 },
];

export function getNicheTier(niche: string): NicheTier | null {
  const found = NICHES.find(
    (n) => n.name.toLowerCase() === niche.toLowerCase()
  );
  return found?.tier ?? null;
}

export function getNicheTierNumber(niche: string): number {
  const found = NICHES.find(
    (n) => n.name.toLowerCase() === niche.toLowerCase()
  );
  return found?.tierNumber ?? 3;
}

// Top 200 US cities by population for systematic scraping
export const US_CITIES = [
  { city: 'New York', state: 'NY' }, { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' }, { city: 'Houston', state: 'TX' },
  { city: 'Phoenix', state: 'AZ' }, { city: 'Philadelphia', state: 'PA' },
  { city: 'San Antonio', state: 'TX' }, { city: 'San Diego', state: 'CA' },
  { city: 'Dallas', state: 'TX' }, { city: 'San Jose', state: 'CA' },
  { city: 'Austin', state: 'TX' }, { city: 'Jacksonville', state: 'FL' },
  { city: 'Fort Worth', state: 'TX' }, { city: 'Columbus', state: 'OH' },
  { city: 'Indianapolis', state: 'IN' }, { city: 'Charlotte', state: 'NC' },
  { city: 'San Francisco', state: 'CA' }, { city: 'Seattle', state: 'WA' },
  { city: 'Denver', state: 'CO' }, { city: 'Nashville', state: 'TN' },
  { city: 'Oklahoma City', state: 'OK' }, { city: 'El Paso', state: 'TX' },
  { city: 'Washington', state: 'DC' }, { city: 'Boston', state: 'MA' },
  { city: 'Las Vegas', state: 'NV' }, { city: 'Portland', state: 'OR' },
  { city: 'Memphis', state: 'TN' }, { city: 'Louisville', state: 'KY' },
  { city: 'Baltimore', state: 'MD' }, { city: 'Milwaukee', state: 'WI' },
  { city: 'Albuquerque', state: 'NM' }, { city: 'Tucson', state: 'AZ' },
  { city: 'Fresno', state: 'CA' }, { city: 'Sacramento', state: 'CA' },
  { city: 'Mesa', state: 'AZ' }, { city: 'Kansas City', state: 'MO' },
  { city: 'Atlanta', state: 'GA' }, { city: 'Omaha', state: 'NE' },
  { city: 'Colorado Springs', state: 'CO' }, { city: 'Raleigh', state: 'NC' },
  { city: 'Long Beach', state: 'CA' }, { city: 'Virginia Beach', state: 'VA' },
  { city: 'Miami', state: 'FL' }, { city: 'Oakland', state: 'CA' },
  { city: 'Minneapolis', state: 'MN' }, { city: 'Tulsa', state: 'OK' },
  { city: 'Tampa', state: 'FL' }, { city: 'Arlington', state: 'TX' },
  { city: 'New Orleans', state: 'LA' }, { city: 'Wichita', state: 'KS' },
  { city: 'Cleveland', state: 'OH' }, { city: 'Bakersfield', state: 'CA' },
  { city: 'Aurora', state: 'CO' }, { city: 'Anaheim', state: 'CA' },
  { city: 'Honolulu', state: 'HI' }, { city: 'Santa Ana', state: 'CA' },
  { city: 'Riverside', state: 'CA' }, { city: 'Corpus Christi', state: 'TX' },
  { city: 'Lexington', state: 'KY' }, { city: 'Stockton', state: 'CA' },
  { city: 'Pittsburgh', state: 'PA' }, { city: 'Saint Paul', state: 'MN' },
  { city: 'Cincinnati', state: 'OH' }, { city: 'Anchorage', state: 'AK' },
  { city: 'Henderson', state: 'NV' }, { city: 'Greensboro', state: 'NC' },
  { city: 'Plano', state: 'TX' }, { city: 'Newark', state: 'NJ' },
  { city: 'Lincoln', state: 'NE' }, { city: 'Orlando', state: 'FL' },
  { city: 'Irvine', state: 'CA' }, { city: 'Toledo', state: 'OH' },
  { city: 'Jersey City', state: 'NJ' }, { city: 'Chula Vista', state: 'CA' },
  { city: 'Durham', state: 'NC' }, { city: 'Laredo', state: 'TX' },
  { city: 'Madison', state: 'WI' }, { city: 'Gilbert', state: 'AZ' },
  { city: 'Lubbock', state: 'TX' }, { city: 'St. Petersburg', state: 'FL' },
  { city: 'Chandler', state: 'AZ' }, { city: 'Reno', state: 'NV' },
  { city: 'Scottsdale', state: 'AZ' }, { city: 'Glendale', state: 'AZ' },
  { city: 'North Las Vegas', state: 'NV' }, { city: 'Irving', state: 'TX' },
  { city: 'Chesapeake', state: 'VA' }, { city: 'Fremont', state: 'CA' },
  { city: 'Norfolk', state: 'VA' }, { city: 'Winston-Salem', state: 'NC' },
  { city: 'Boise', state: 'ID' }, { city: 'Richmond', state: 'VA' },
  { city: 'San Bernardino', state: 'CA' }, { city: 'Spokane', state: 'WA' },
  { city: 'Des Moines', state: 'IA' }, { city: 'Birmingham', state: 'AL' },
  { city: 'Tacoma', state: 'WA' }, { city: 'Baton Rouge', state: 'LA' },
  { city: 'Modesto', state: 'CA' }, { city: 'Fontana', state: 'CA' },
];

// US timezone mapping by state (simplified)
export const STATE_TIMEZONES: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix',
  AR: 'America/Chicago', CA: 'America/Los_Angeles', CO: 'America/Denver',
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago', KS: 'America/Chicago', KY: 'America/New_York',
  LA: 'America/Chicago', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver',
  NE: 'America/Chicago', NV: 'America/Los_Angeles', NH: 'America/New_York',
  NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York',
  NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York',
  RI: 'America/New_York', SC: 'America/New_York', SD: 'America/Chicago',
  TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};
