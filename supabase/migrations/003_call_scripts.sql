-- Cold call scripts and recordings

-- Playbook tips: what works and what to avoid
CREATE TABLE call_playbook (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('works', 'avoid')),
  tip TEXT NOT NULL,
  niche TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Custom call scripts per niche/scenario
CREATE TABLE call_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  niche TEXT,
  scenario TEXT NOT NULL CHECK (scenario IN ('no_website', 'bad_website', 'ai_services', 'follow_up', 'general')),
  opening TEXT NOT NULL,
  value_proposition TEXT NOT NULL,
  discovery_questions TEXT NOT NULL,
  objection_handling TEXT NOT NULL,
  closing TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call recordings with AI analysis
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  file_url TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  ai_analysis JSONB,
  score INTEGER,
  strengths TEXT[],
  improvements TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_playbook_type ON call_playbook(type);
CREATE INDEX idx_call_scripts_scenario ON call_scripts(scenario);
CREATE INDEX idx_call_scripts_niche ON call_scripts(niche);
CREATE INDEX idx_call_recordings_created ON call_recordings(created_at DESC);
CREATE INDEX idx_call_recordings_lead ON call_recordings(lead_id);

-- Trigger for updated_at
CREATE TRIGGER update_call_playbook_updated_at
  BEFORE UPDATE ON call_playbook
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_scripts_updated_at
  BEFORE UPDATE ON call_scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default scripts
INSERT INTO call_scripts (name, scenario, opening, value_proposition, discovery_questions, objection_handling, closing, is_default) VALUES
(
  'No Website Script',
  'no_website',
  E'Hi, is this {{owner_name}}? Great — my name is [YOUR NAME], I help local {{niche}} businesses in {{city}} get found online. I was actually just searching for {{niche}} in your area and noticed {{business_name}} doesn''t have a website yet. Do you have a minute?',
  E'The reason I''m calling is that right now when someone in {{city}} searches Google for "{{niche}} near me," they''re finding your competitors instead of you. I build websites specifically for {{niche}} businesses that actually bring in new customers on autopilot — we''re talking calls, form submissions, booked jobs — all from people who are actively searching for exactly what you do.',
  E'• How are you currently getting new customers? Word of mouth, referrals?\n• Do you ever feel like you''re leaving money on the table by not being online?\n• If I could show you a way to get 5-10 new leads per month without lifting a finger, would that be worth a conversation?',
  E'**"I''m too busy"**\nThat''s exactly why you need this — the website works for you 24/7 so you don''t have to chase leads. It takes one meeting to get started and I handle everything.\n\n**"I get enough work from referrals"**\nThat''s great — referrals are the best. But what happens when they slow down? A website is like insurance for your pipeline. Plus, when people get referred to you, the first thing they do is Google you.\n\n**"How much does it cost?"**\nIt depends on what you need, but I work with {{niche}} businesses every day and I make sure the ROI makes sense. Can we set up a quick 15-minute call so I can show you exactly what I''d build?',
  E'Listen, I don''t want to take up more of your time — I know you''re busy. How about this: I''ll put together a free mockup of what your website could look like, completely custom for {{business_name}}. If you love it, we move forward. If not, no hard feelings. Can I grab your email to send that over?\n\nWhat does your schedule look like [tomorrow/this week] for a quick 15-minute call?',
  true
),
(
  'Bad Website Script',
  'bad_website',
  E'Hi {{owner_name}}, my name is [YOUR NAME]. I run a web design agency here in {{city}} and I was actually looking at {{niche}} websites in the area today. I came across {{business_name}}''s site and I noticed a few things that might be costing you customers. Do you have two minutes?',
  E'So I ran your site through some analysis tools and found that {{website_issue}}. What that means in real terms is that potential customers are probably landing on your site and leaving before they ever call you. Your competitors with faster, modern sites are getting those calls instead.\n\nI specialize in rebuilding websites for {{niche}} businesses — fast, mobile-friendly sites that actually convert visitors into paying customers.',
  E'• When was the last time your website was updated?\n• Do you know roughly how much traffic your site gets?\n• Are you getting leads or calls from your website right now?\n• If your website was generating 5-10 new leads a month, what would that be worth to your business?',
  E'**"My nephew/friend built it"**\nI totally understand — and it was probably great when it was first built. But web standards change fast. Google now penalizes slow, non-mobile-friendly sites. I can show you exactly what your site looks like on Google''s scorecard.\n\n**"I just had it redone"**\nI hear that sometimes — unfortunately not all web designers build with performance in mind. I''d love to show you the specific issues I found. It''s a free audit, no strings attached.\n\n**"We''re happy with our current site"**\nI get it. But your PageSpeed score is {{website_score}}/100, which means Google is actually ranking your competitors above you. Would it be worth 10 minutes to see what you''re missing?',
  E'Here''s what I''d like to do — let me send you a free website audit report. It''ll show you exactly where your site is losing customers, what your competitors'' sites look like, and what a rebuilt site could do for your leads. No obligation at all.\n\nWhat''s the best email to send that to? And when would be a good time for a quick 15-minute walkthrough?',
  true
),
(
  'AI Services Script',
  'ai_services',
  E'Hey {{owner_name}}, this is [YOUR NAME]. I work with {{niche}} businesses in {{city}} helping them save time with automation tools. I noticed {{business_name}} might be missing out on some tools that could save you 10+ hours a week. Got a quick minute?',
  E'So right now, a lot of {{niche}} businesses are using AI-powered tools to handle things like:\n• Answering customer calls and messages automatically — even after hours\n• Letting customers book appointments online without the back-and-forth\n• Following up with leads automatically so nobody falls through the cracks\n\n{{ai_opportunity}}\n\nThe businesses using this stuff are closing more jobs with less effort. And the ROI usually pays for itself within the first month.',
  E'• How are you currently handling appointment scheduling?\n• What happens when a customer calls after hours — do they just get voicemail?\n• How much time do you spend each week on phone tag and follow-ups?\n• If you could get back 10 hours a week and close more jobs, what would that be worth?',
  E'**"I''m not tech-savvy"**\nThat''s the beauty of it — I set everything up for you and it runs automatically. You don''t need to touch anything. It''s like hiring a virtual receptionist that works 24/7.\n\n**"That sounds expensive"**\nMost of my clients spend less than what they''d pay a part-time employee, and they get way more done. Plus, you''re capturing leads you''re currently losing. Think about how many calls go to voicemail.\n\n**"I don''t trust AI"**\nI hear you. Think of it less like AI and more like smart automation — it''s basically a really good system that handles the repetitive stuff so you can focus on doing the actual work.',
  E'Tell you what — let me show you a quick demo of what this would look like specifically for {{business_name}}. I''ll customize it for {{niche}} so you can see exactly how it works. It takes 15 minutes and there''s zero obligation.\n\nDo you have time [tomorrow morning/afternoon]? I''ll send you a calendar link.',
  true
);

-- Insert some starter playbook tips
INSERT INTO call_playbook (type, tip) VALUES
('works', 'Lead with their specific problem — mention their actual business name and what you found'),
('works', 'Ask permission early: "Do you have a minute?" builds respect and lowers guard'),
('works', 'Use specific numbers: "5-10 new leads per month" is better than "more leads"'),
('works', 'Reference competitors: "Your 3 competitors all have modern websites" creates urgency'),
('works', 'Offer something free first: free mockup, free audit, free demo — removes risk'),
('works', 'Match their energy and pace — if they talk slow, slow down'),
('avoid', 'Don''t pitch immediately — ask at least 2 questions before presenting your solution'),
('avoid', 'Never badmouth their current website/setup — frame it as "opportunity" not "problem"'),
('avoid', 'Don''t say "I''m calling to sell you..." — say "I noticed..." or "I was looking at..."'),
('avoid', 'Avoid technical jargon — say "loads slow" not "poor Core Web Vitals score"'),
('avoid', 'Don''t argue with objections — acknowledge, then redirect'),
('avoid', 'Never pressure for an immediate decision — always offer a low-commitment next step');
