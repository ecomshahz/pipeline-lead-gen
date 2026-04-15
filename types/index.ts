export interface Lead {
  id: string;
  business_name: string;
  business_type: string;
  niche: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  timezone: string | null;
  website_url: string | null;
  has_website: boolean;
  website_score: number | null;
  website_issues: string[] | null;
  google_rating: number | null;
  review_count: number | null;
  needs_ai_services: boolean;
  ai_opportunity_notes: string | null;
  lead_score: number;
  lead_score_breakdown: LeadScoreBreakdown | null;
  status: LeadStatus;
  contact_method: ContactMethod | null;
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  email_sent: boolean;
  email_opened: boolean;
  source: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface LeadScoreBreakdown {
  no_website: number;
  low_pagespeed: number;
  not_mobile_friendly: number;
  no_ssl: number;
  good_rating: number;
  established_business: number;
  has_phone: number;
  has_email: number;
  niche_tier: number;
  needs_ai: number;
  total: number;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'closed_won'
  | 'closed_lost'
  | 'not_interested';

export type ContactMethod = 'phone' | 'email' | 'both';

export interface ScrapeJob {
  id: string;
  niche: string;
  location: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  leads_found: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  niche: string | null;
  is_default: boolean;
  created_at: string;
}

export interface EmailLog {
  id: string;
  lead_id: string;
  template_id: string | null;
  subject: string;
  body: string;
  sent_at: string;
  opened: boolean;
  replied: boolean;
}

export interface DailyStats {
  id: string;
  date: string;
  leads_scraped: number;
  emails_sent: number;
  calls_made: number;
  meetings_booked: number;
  deals_closed: number;
  revenue: number;
}

export type NicheTier = 'tier1' | 'tier2' | 'tier3';

export interface NicheConfig {
  name: string;
  tier: NicheTier;
  tierNumber: number;
}

export interface ScraperConfig {
  niches: string[];
  locations: string[];
  maxLeadsPerJob: number;
}

export type LeadScoreCategory = 'hot' | 'warm' | 'cold';
