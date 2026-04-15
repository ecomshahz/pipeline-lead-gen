import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { calculateLeadScore } from '@/lib/scoring';

// POST /api/leads/score — Recalculate scores for all leads or specific ones
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json().catch(() => ({}));
    const leadIds: string[] | undefined = body.leadIds;

    let query = supabase.from('leads').select('*');
    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds);
    }

    const { data: leads, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    let updated = 0;
    for (const lead of leads) {
      const { score, breakdown } = calculateLeadScore(lead);

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          lead_score: score,
          lead_score_breakdown: breakdown,
        })
        .eq('id', lead.id);

      if (!updateError) updated++;
    }

    return NextResponse.json({ updated, total: leads.length });
  } catch {
    return NextResponse.json({ error: 'Failed to recalculate scores' }, { status: 500 });
  }
}
