import { Lead } from '@/types';

interface TemplateVariables {
  business_name: string;
  owner_name: string;
  niche: string;
  city: string;
  website_issue: string;
  ai_opportunity: string;
  sender_name: string;
  sender_title: string;
}

// Render template variables into a string
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      value
    );
  }

  return rendered;
}

// Build template variables from a lead
export function buildVariablesFromLead(
  lead: Lead,
  senderName: string = 'Your Name',
  senderTitle: string = 'Web & AI Solutions'
): TemplateVariables {
  // Build website issue summary
  const websiteIssues = lead.website_issues ?? [];
  const issueDescriptions: Record<string, string> = {
    slow_loading: 'Your website loads slowly, which causes visitors to leave',
    not_mobile_friendly: "Your website doesn't display well on mobile phones",
    no_ssl: "Your website isn't secure (no SSL certificate)",
    outdated_design: 'Your website appears to have an outdated design',
    unoptimized_images: 'Your website has unoptimized images slowing it down',
    no_contact_form: "There's no easy way for customers to contact you online",
  };

  const issueList = websiteIssues
    .filter((i) => issueDescriptions[i])
    .map((i) => `• ${issueDescriptions[i]}`)
    .slice(0, 3);

  const websiteIssue =
    issueList.length > 0
      ? issueList.join('\n')
      : '• Your website could be performing better for you';

  // Build AI opportunity summary
  const aiNotes = lead.ai_opportunity_notes ?? '';
  const aiLines = aiNotes
    .split('\n')
    .filter((l) => l.trim())
    .slice(0, 2);
  const aiOpportunity =
    aiLines.length > 0
      ? aiLines.map((l) => `• ${l.replace(/^[•\-]\s*/, '')}`).join('\n')
      : '• You could benefit from AI-powered customer engagement tools';

  return {
    business_name: lead.business_name,
    owner_name: lead.owner_name ?? 'there',
    niche: lead.niche.toLowerCase(),
    city: lead.city,
    website_issue: websiteIssue,
    ai_opportunity: aiOpportunity,
    sender_name: senderName,
    sender_title: senderTitle,
  };
}

// Convert plain text email to HTML
export function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.trim() === '') return '<br />';
      if (line.startsWith('•')) return `<p style="margin:4px 0 4px 16px">${line}</p>`;
      return `<p style="margin:4px 0">${line}</p>`;
    })
    .join('\n');
}
