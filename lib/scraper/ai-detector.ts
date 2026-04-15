import { WebsiteAnalysis } from './website-analyzer';

export interface AIOpportunity {
  needs_ai_services: boolean;
  ai_opportunity_notes: string;
}

// Determine if a business could benefit from AI services
// based on website analysis and business metadata
export function detectAIOpportunities(
  analysis: WebsiteAnalysis | null,
  hasWebsite: boolean
): AIOpportunity {
  const opportunities: string[] = [];

  if (!hasWebsite) {
    return {
      needs_ai_services: true,
      ai_opportunity_notes:
        'No website at all — needs full digital presence including AI chatbot, online booking, and automated lead capture.',
    };
  }

  if (!analysis) {
    return {
      needs_ai_services: true,
      ai_opportunity_notes:
        'Could not analyze website — likely needs modernization and AI services.',
    };
  }

  // Collect specific opportunities from the analysis
  if (analysis.ai_opportunities.length > 0) {
    opportunities.push(...analysis.ai_opportunities);
  }

  // Additional AI-specific opportunities
  if (!analysis.has_chatbot) {
    opportunities.push(
      'AI Chatbot: Could handle customer FAQs, provide quotes, and capture leads 24/7'
    );
  }

  if (!analysis.has_booking_system) {
    opportunities.push(
      'AI Scheduling: Automated appointment booking would reduce phone call volume by 40-60%'
    );
  }

  if (!analysis.has_contact_form) {
    opportunities.push(
      'Automated Lead Capture: AI-powered forms could qualify leads and route them automatically'
    );
  }

  if (!analysis.has_blog) {
    opportunities.push(
      'AI Content: Automated blog/content generation could boost SEO and attract organic traffic'
    );
  }

  if (!analysis.has_social_links) {
    opportunities.push(
      'Social Automation: AI tools could manage social media presence and customer engagement'
    );
  }

  const needs_ai_services = opportunities.length >= 2;

  return {
    needs_ai_services,
    ai_opportunity_notes: opportunities.length > 0
      ? opportunities.join('\n• ')
      : 'Business appears to have good digital infrastructure.',
  };
}
