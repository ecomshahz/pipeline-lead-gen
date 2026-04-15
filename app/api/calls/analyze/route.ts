import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// POST /api/calls/analyze — Analyze a call transcript using Claude API
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const { recordingId, transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'transcript required' }, { status: 400 });
    }

    // Fetch playbook tips for context
    const { data: playbook } = await supabase
      .from('call_playbook')
      .select('type, tip');

    const works = (playbook ?? []).filter((t) => t.type === 'works').map((t) => t.tip);
    const avoid = (playbook ?? []).filter((t) => t.type === 'avoid').map((t) => t.tip);

    // Build the analysis prompt
    const analysisPrompt = `You are a cold calling coach for a web design and AI services agency. Analyze this cold call transcript and provide actionable feedback.

WHAT WORKS (from the caller's playbook):
${works.map((t) => `• ${t}`).join('\n')}

WHAT TO AVOID (from the caller's playbook):
${avoid.map((t) => `• ${t}`).join('\n')}

CALL TRANSCRIPT:
${transcript}

Analyze this call and respond in this exact JSON format:
{
  "score": <number 1-100 rating overall call quality>,
  "strengths": [<array of 3-5 specific things the caller did well, referencing exact quotes>],
  "improvements": [<array of 3-5 specific things to improve, with concrete suggestions>],
  "analysis": {
    "opening": "<how was the opening? did they build rapport?>",
    "discovery": "<did they ask good questions? listen to answers?>",
    "value_prop": "<was the value proposition clear and relevant?>",
    "objection_handling": "<how did they handle objections?>",
    "closing": "<did they get a clear next step?>",
    "tone": "<energy, pace, confidence assessment>",
    "playbook_compliance": "<did they follow the works/avoid rules?>"
  },
  "rewrite_suggestions": [<2-3 specific lines from the call rewritten to be more effective>],
  "overall_summary": "<2-3 sentence summary of the call and key takeaway>"
}

Be specific and reference exact parts of the transcript. Be encouraging but honest.`;

    // Use Claude API if available, otherwise provide a structured placeholder
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let analysis;

    if (anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: analysisPrompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API error:', errText);
        return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
      }

      const result = await response.json();
      const text = result.content?.[0]?.text ?? '';

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Failed to parse AI analysis' }, { status: 500 });
      }
    } else {
      // No API key — do basic keyword analysis
      analysis = basicAnalysis(transcript, works, avoid);
    }

    // Save analysis to recording if recordingId provided
    if (recordingId) {
      await supabase
        .from('call_recordings')
        .update({
          ai_analysis: analysis,
          score: analysis.score,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
        })
        .eq('id', recordingId);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

// Basic analysis when no AI API key is available
function basicAnalysis(transcript: string, works: string[], avoid: string[]) {
  const lower = transcript.toLowerCase();
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 50;

  // Check for good practices
  if (lower.includes('do you have a minute') || lower.includes('got a minute')) {
    strengths.push('Asked for permission early in the call — shows respect');
    score += 5;
  }
  if (lower.includes('noticed') || lower.includes('found')) {
    strengths.push('Used research-based opening instead of a generic pitch');
    score += 5;
  }
  if (lower.includes('?')) {
    const questionCount = (transcript.match(/\?/g) ?? []).length;
    if (questionCount >= 3) {
      strengths.push(`Asked ${questionCount} questions — good discovery`);
      score += 10;
    } else {
      improvements.push('Ask more discovery questions before pitching');
      score -= 5;
    }
  }
  if (lower.includes('free') || lower.includes('no obligation')) {
    strengths.push('Offered a low-risk next step');
    score += 5;
  }
  if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('tomorrow')) {
    strengths.push('Attempted to book a specific next step');
    score += 5;
  }

  // Check for things to avoid
  if (lower.includes('sell') || lower.includes('buy')) {
    improvements.push('Avoid using "sell" or "buy" — use "help" or "show" instead');
    score -= 5;
  }
  if (lower.includes('core web vitals') || lower.includes('seo optimization') || lower.includes('server-side')) {
    improvements.push('Used technical jargon — keep language simple and benefit-focused');
    score -= 5;
  }
  if (transcript.length < 200) {
    improvements.push('Call seems very short — try to engage more before wrapping up');
  }

  if (strengths.length === 0) strengths.push('Completed the call — every call is practice');
  if (improvements.length === 0) improvements.push('Try to incorporate more specific details about the prospect');

  score = Math.max(10, Math.min(100, score));

  return {
    score,
    strengths,
    improvements,
    analysis: {
      opening: 'Review your opening — make sure you mention their business name and a specific finding',
      discovery: 'Focus on asking 3-5 open-ended questions before presenting your solution',
      value_prop: 'Tie your value proposition to specific numbers (leads per month, hours saved)',
      objection_handling: 'Practice the objection scripts — acknowledge first, then redirect',
      closing: 'Always end with a specific next step: date, time, and action item',
      tone: 'Record more calls to track tone and pacing improvements over time',
      playbook_compliance: 'Review the playbook tips and practice incorporating them naturally',
    },
    rewrite_suggestions: [
      'Add Claude API key (ANTHROPIC_API_KEY) to .env.local for detailed AI-powered call analysis with specific rewrite suggestions',
    ],
    overall_summary: `Basic analysis complete (score: ${score}/100). For detailed AI coaching with specific feedback, add your Anthropic API key in settings.`,
  };
}
