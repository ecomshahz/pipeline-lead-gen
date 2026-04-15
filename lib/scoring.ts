import { Lead, LeadScoreBreakdown, LeadScoreCategory } from '@/types';
import { getNicheTierNumber } from './niches';

export function calculateLeadScore(lead: Partial<Lead>): {
  score: number;
  breakdown: LeadScoreBreakdown;
} {
  const breakdown: LeadScoreBreakdown = {
    no_website: 0,
    low_pagespeed: 0,
    not_mobile_friendly: 0,
    no_ssl: 0,
    good_rating: 0,
    established_business: 0,
    has_phone: 0,
    has_email: 0,
    niche_tier: 0,
    needs_ai: 0,
    total: 0,
  };

  // No website: +35 points
  if (!lead.has_website || !lead.website_url) {
    breakdown.no_website = 35;
  } else if (lead.website_score !== null && lead.website_score !== undefined) {
    // Has website but low PageSpeed score
    if (lead.website_score < 50) {
      breakdown.low_pagespeed = 25;
    } else if (lead.website_score < 70) {
      breakdown.low_pagespeed = 15;
    }
  }

  // Website not mobile-friendly: +10 points
  const issues = lead.website_issues ?? [];
  if (issues.includes('not_mobile_friendly')) {
    breakdown.not_mobile_friendly = 10;
  }

  // No SSL certificate: +5 points
  if (issues.includes('no_ssl')) {
    breakdown.no_ssl = 5;
  }

  // Good Google rating (>= 4.0): +10 points
  if (lead.google_rating && lead.google_rating >= 4.0) {
    breakdown.good_rating = 10;
  }

  // Established business (>= 20 reviews): +5 points
  if (lead.review_count && lead.review_count >= 20) {
    breakdown.established_business = 5;
  }

  // Has phone number: +5 points
  if (lead.phone) {
    breakdown.has_phone = 5;
  }

  // Has email: +5 points
  if (lead.email) {
    breakdown.has_email = 5;
  }

  // Niche tier bonus
  const tierNumber = getNicheTierNumber(lead.niche ?? '');
  if (tierNumber === 1) {
    breakdown.niche_tier = 10;
  } else if (tierNumber === 2) {
    breakdown.niche_tier = 5;
  }

  // Needs AI services: +10 points
  if (lead.needs_ai_services) {
    breakdown.needs_ai = 10;
  }

  breakdown.total = Object.entries(breakdown)
    .filter(([key]) => key !== 'total')
    .reduce((sum, [, val]) => sum + val, 0);

  // Cap at 100
  const score = Math.min(breakdown.total, 100);

  return { score, breakdown };
}

export function getLeadScoreCategory(score: number): LeadScoreCategory {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 70) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 40) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return 'Hot Lead';
  if (score >= 40) return 'Warm Lead';
  return 'Cold Lead';
}
