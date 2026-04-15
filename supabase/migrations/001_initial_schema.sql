-- Pipeline Lead Generation Command Center
-- Initial database schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT '',
  niche TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  timezone TEXT,
  website_url TEXT,
  has_website BOOLEAN NOT NULL DEFAULT false,
  website_score INTEGER,
  website_issues JSONB DEFAULT '[]'::jsonb,
  google_rating DECIMAL,
  review_count INTEGER DEFAULT 0,
  needs_ai_services BOOLEAN NOT NULL DEFAULT false,
  ai_opportunity_notes TEXT,
  lead_score INTEGER NOT NULL DEFAULT 0,
  lead_score_breakdown JSONB,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'follow_up', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost', 'not_interested')),
  contact_method TEXT CHECK (contact_method IN ('phone', 'email', 'both')),
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_opened BOOLEAN NOT NULL DEFAULT false,
  source TEXT DEFAULT 'google_places',
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrape jobs table
CREATE TABLE scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niche TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  leads_found INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  niche TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email logs table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened BOOLEAN NOT NULL DEFAULT false,
  replied BOOLEAN NOT NULL DEFAULT false
);

-- Daily stats table
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  leads_scraped INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  calls_made INTEGER NOT NULL DEFAULT 0,
  meetings_booked INTEGER NOT NULL DEFAULT 0,
  deals_closed INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL NOT NULL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_leads_niche ON leads(niche);
CREATE INDEX idx_leads_city_state ON leads(city, state);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_has_website ON leads(has_website);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_scraped_at ON leads(scraped_at DESC);
CREATE INDEX idx_leads_business_name_phone ON leads(business_name, phone);
CREATE INDEX idx_leads_business_name_address ON leads(business_name, address);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_niche_location ON scrape_jobs(niche, location);
CREATE INDEX idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, niche, is_default) VALUES
(
  'No Website',
  'Quick question about {{business_name}}''s online presence',
  E'Hi {{owner_name}},\n\nI was searching for {{niche}} services in {{city}} and came across {{business_name}}. I noticed you don''t currently have a website, and I wanted to reach out because I help local businesses like yours get found online.\n\nRight now, potential customers searching for "{{niche}} in {{city}}" are finding your competitors instead of you. A professional website could change that — bringing in new leads on autopilot.\n\nI specialize in building modern, mobile-friendly websites for {{niche}} businesses, and I''d love to show you what I can do. Would you be open to a quick 10-minute call this week?\n\nBest,\n{{sender_name}}\n{{sender_title}}',
  NULL,
  true
),
(
  'Bad Website',
  'I found some issues with {{business_name}}''s website',
  E'Hi {{owner_name}},\n\nI came across {{business_name}} while researching {{niche}} businesses in {{city}}, and I took a quick look at your website. I noticed a few things that might be costing you customers:\n\n{{website_issue}}\n\nThese issues can cause potential customers to leave your site before ever contacting you. The good news is they''re all fixable.\n\nI help {{niche}} businesses build fast, modern websites that actually convert visitors into paying customers. Would you be interested in a free website audit where I walk you through exactly what I''d improve?\n\nLet me know — happy to find a time that works for you.\n\nBest,\n{{sender_name}}\n{{sender_title}}',
  NULL,
  true
),
(
  'AI Services',
  'How {{business_name}} could save 10+ hours/week with automation',
  E'Hi {{owner_name}},\n\nI''ve been looking at how {{niche}} businesses in {{city}} operate, and I noticed that {{business_name}} might be missing out on some powerful automation tools that could save you serious time and money.\n\n{{ai_opportunity}}\n\nBusinesses like yours are using AI-powered tools to:\n• Automatically respond to customer inquiries 24/7\n• Let customers book appointments online without phone tag\n• Follow up with leads automatically so no one falls through the cracks\n\nI help local businesses implement these tools — and the ROI is usually felt within the first month.\n\nWould you be open to a quick chat about what this could look like for {{business_name}}?\n\nBest,\n{{sender_name}}\n{{sender_title}}',
  NULL,
  true
);

-- Enable Row Level Security (optional, can be configured per-deployment)
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
