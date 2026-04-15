import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/calls — Fetch scripts, playbook tips, and recordings
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const type = request.nextUrl.searchParams.get('type');

  if (type === 'scripts') {
    const niche = request.nextUrl.searchParams.get('niche');
    const scenario = request.nextUrl.searchParams.get('scenario');

    let query = supabase.from('call_scripts').select('*');
    if (niche) query = query.eq('niche', niche);
    if (scenario) query = query.eq('scenario', scenario);
    query = query.order('is_default', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (type === 'playbook') {
    const { data, error } = await supabase
      .from('call_playbook')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const works = (data ?? []).filter((t) => t.type === 'works');
    const avoid = (data ?? []).filter((t) => t.type === 'avoid');
    return NextResponse.json({ works, avoid });
  }

  if (type === 'recordings') {
    const { data, error } = await supabase
      .from('call_recordings')
      .select('*, leads(business_name, niche, city, state)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'type parameter required (scripts|playbook|recordings)' }, { status: 400 });
}

// POST /api/calls — Create script, playbook tip, or recording
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'script') {
      const { data: result, error } = await supabase
        .from('call_scripts')
        .insert(data)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(result, { status: 201 });
    }

    if (type === 'playbook') {
      const { data: result, error } = await supabase
        .from('call_playbook')
        .insert({ type: data.tipType, tip: data.tip, niche: data.niche || null })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(result, { status: 201 });
    }

    if (type === 'recording') {
      const { data: result, error } = await supabase
        .from('call_recordings')
        .insert({
          lead_id: data.lead_id || null,
          duration_seconds: data.duration_seconds,
          transcript: data.transcript || null,
          ai_analysis: data.ai_analysis || null,
          score: data.score || null,
          strengths: data.strengths || null,
          improvements: data.improvements || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: 'type required (script|playbook|recording)' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PATCH /api/calls — Update script or playbook tip
export async function PATCH(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();
    const { type, id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const table = type === 'script' ? 'call_scripts' : type === 'playbook' ? 'call_playbook' : null;
    if (!table) return NextResponse.json({ error: 'type required (script|playbook)' }, { status: 400 });

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/calls — Delete script, playbook tip, or recording
export async function DELETE(request: NextRequest) {
  const supabase = getServiceSupabase();
  const type = request.nextUrl.searchParams.get('type');
  const id = request.nextUrl.searchParams.get('id');

  if (!type || !id) return NextResponse.json({ error: 'type and id required' }, { status: 400 });

  const table =
    type === 'script' ? 'call_scripts' :
    type === 'playbook' ? 'call_playbook' :
    type === 'recording' ? 'call_recordings' : null;

  if (!table) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
