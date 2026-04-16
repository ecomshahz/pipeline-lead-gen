// Niche-specific outreach playbooks
// Organized by niche slug, with structured sections for DMs, Cold Call, Objections, Follow-Ups, and Selling Points
// Append new content to an existing niche, or add a new niche below. Keep sections in the same shape.

export type OutreachTemplate = {
  label: string;         // Short identifier (e.g., "No Website Lead")
  description?: string;  // Optional one-liner describing when to use it
  body: string;          // The actual copy — supports multi-line, {{placeholders}}
};

export type ConversationBlock = {
  label: string;         // e.g., "Opener (first 10 seconds)"
  guidance?: string;     // Optional coaching note about this block
  body: string;          // The script copy
};

export type Objection = {
  objection: string;     // What the prospect says
  response: string;      // How to respond
  guidance?: string;     // Optional note (e.g., "Don't answer price yet")
};

export type FollowUp = {
  timing: string;        // e.g., "Day 1 (right after sending)"
  body: string;
};

export type SellingPoint = {
  headline: string;      // Short bolded hook
  detail: string;        // The supporting explanation
};

export type NichePlaybook = {
  slug: string;          // URL-safe slug (e.g., "hair-salons")
  name: string;          // Display name (e.g., "Hair Salons")
  emoji?: string;        // Optional emoji for visual recognition
  tagline?: string;      // One-line positioning summary
  dms?: OutreachTemplate[];
  coldCall?: ConversationBlock[];
  objections?: Objection[];
  followUps?: FollowUp[];
  sellingPoints?: SellingPoint[];
};

// -------------------------------------------------------------------
// HAIR SALONS
// -------------------------------------------------------------------
const hairSalons: NichePlaybook = {
  slug: 'hair-salons',
  name: 'Hair Salons',
  emoji: '💇',
  tagline: 'Beauty businesses live on Instagram — but clients book on Google.',

  dms: [
    {
      label: 'No Website Lead',
      description: 'Use when the salon has zero web presence outside of social media.',
      body: `Hey {{name}}! I was looking for hair salons in {{city}} and came across your Instagram — your work is really good. I noticed you don't have a website though, so when people Google salons in the area you're not showing up at all. I actually build sites for salons and I'd love to show you something quick if you're open to it — no pressure either way.`,
    },
    {
      label: 'Bad / Outdated Website Lead',
      description: 'Use when there is a site, but it\u2019s slow, broken on mobile, or missing online booking.',
      body: `Hey {{name}}, I came across {{salon_name}} online and love the vibe — but I noticed your website isn't loading right on mobile and there's no way to book online. A lot of salon clients are searching on their phones at like 10 or 11 at night, and if they can't book right then they just go to the next one. I help salons fix exactly that — would you be open to seeing what an updated version could look like?`,
    },
    {
      label: 'Instagram-Only Lead',
      description: 'Very common for salons. Opens with genuine compliment, pivots to the Google gap.',
      body: `Hey {{name}}! Your work on IG is fire 🔥 — quick question though, do you have a website or are you running everything through Instagram right now? I ask because I work with salon owners and the biggest thing I see is they're getting great engagement on socials but losing clients who actually Google 'hair salon near me' and can't find them. Would love to chat about it if you're interested.`,
    },
  ],

  coldCall: [
    {
      label: 'Opener (first 10 seconds)',
      guidance: 'Pattern interrupt — not a pitch. Acknowledge they\u2019re busy. Ask for 30 seconds, not a meeting.',
      body: `Hey {{name}}, this is {{your_name}} — I know you're probably in between clients so I'll be super quick. I'm not trying to sell you anything, I just had a quick question about your salon's website. Do you have 30 seconds?`,
    },
    {
      label: 'If They Say Yes',
      guidance: 'Reference a specific finding about their business. Ask a diagnostic question — then let them talk.',
      body: `So I was looking up salons in {{city}} and I noticed {{specific_finding}} — no website / site doesn't work on mobile / no online booking. I work with a few salon owners in the area and the biggest thing I keep hearing is that they're losing bookings because clients can't find them on Google or can't book after hours. Is that something you've run into at all?`,
    },
    {
      label: 'Close (soft ask)',
      guidance: 'Don\u2019t pitch yet. Offer a free spec site — no strings. Lowest possible risk ask.',
      body: `That makes sense. Look, I don't want to take up your time right now — would it be cool if I just sent you a quick example of what a site could look like for {{salon_name}}? Totally free, no strings. If you like it we can talk, if not no worries at all.`,
    },
  ],

  objections: [
    {
      objection: 'I just use Instagram / I get all my clients from social media',
      response: `Yeah I totally get that, and your page looks great — a lot of the salon owners I talk to say the same thing. The only thing is, there's like 450,000 people Googling 'hair salon near me' every month, and if you don't have a website you're invisible to all of them. Instagram is amazing for showing your work, but a website is what catches the people who aren't on IG or who are just searching Google for a salon nearby. It actually works with your social media, not against it.`,
    },
    {
      objection: 'I already have someone working on it',
      response: `Oh nice, that's great — how long have they been working on it? [Usually they say weeks/months.] Got it. Look I'm not trying to step on anyone's toes, but if you want I can put something together just so you have a comparison. That way you know what your options are. No cost to you either way.`,
    },
    {
      objection: 'How much does it cost?',
      guidance: 'Don\u2019t quote price yet. Redirect to value and a free comparison first.',
      response: `It depends on what you need — some salons just want something simple with online booking, others want the full thing with a gallery, reviews, the works. Before I throw a number out, let me just send you a quick example so you can see the quality first. Then we can talk about what makes sense for your salon specifically.`,
    },
  ],

  followUps: [
    {
      timing: 'Day 1 — right after sending',
      body: `Just sent it over! Let me know if it loads okay on your phone — I built it mobile-first since most of your clients are probably finding you from their phone.`,
    },
    {
      timing: 'Day 3 — if no reply',
      body: `Hey {{name}}! Just checking in — did you get a chance to look at the site? I also added an online booking button and a gallery section for your work. Let me know what you think or if you'd want anything changed!`,
    },
    {
      timing: 'Day 7 — final follow-up',
      body: `Hey {{name}}, just circling back one more time — I've got a couple other salon projects starting up this week so wanted to check in before I get tied up. If you're interested I'd love to finalize yours, and if the timing isn't right no worries at all. Just shoot me a message whenever.`,
    },
  ],

  sellingPoints: [
    {
      headline: 'After-hours booking',
      detail: 'Nearly half of salon clients want to book outside business hours. If they can\u2019t book at 11pm on a Tuesday, they go to the next salon that lets them.',
    },
    {
      headline: 'Google visibility',
      detail: 'Instagram doesn\u2019t rank on Google. A website does. Hundreds of thousands of people search for salons on Google monthly.',
    },
    {
      headline: 'Credibility',
      detail: 'A salon without a website looks less professional. Clients check before they book — especially first-timers.',
    },
    {
      headline: 'Saves them time',
      detail: 'A good site answers questions (hours, pricing, services) so they spend less time on the phone repeating the same info.',
    },
    {
      headline: 'Their work sells itself',
      detail: 'A gallery with their best cuts and colors does more convincing than any sales pitch.',
    },
  ],
};

// -------------------------------------------------------------------
// Registry — add new niches here as you build them out
// -------------------------------------------------------------------
export const NICHE_PLAYBOOKS: NichePlaybook[] = [
  hairSalons,
];

export function getNichePlaybook(slug: string): NichePlaybook | undefined {
  return NICHE_PLAYBOOKS.find((p) => p.slug === slug);
}
