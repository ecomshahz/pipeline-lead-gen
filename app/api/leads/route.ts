import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/leads — Fetch leads with filtering, sorting, pagination
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const sortBy = searchParams.get('sort') ?? 'lead_score';
  const sortOrder = searchParams.get('order') ?? 'desc';
  const search = searchParams.get('search') ?? '';
  const niche = searchParams.get('niche') ?? '';
  const state = searchParams.get('state') ?? '';
  const status = searchParams.get('status') ?? '';
  const minScore = searchParams.get('minScore') ?? '';
  const maxScore = searchParams.get('maxScore') ?? '';
  const hasWebsite = searchParams.get('hasWebsite');
  const hasEmail = searchParams.get('hasEmail');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' });

  // Apply filters
  if (search) {
    query = query.ilike('business_name', `%${search}%`);
  }
  if (niche) {
    query = query.eq('niche', niche);
  }
  if (state) {
    query = query.eq('state', state);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (minScore) {
    query = query.gte('lead_score', parseInt(minScore));
  }
  if (maxScore) {
    query = query.lte('lead_score', parseInt(maxScore));
  }
  if (hasWebsite === 'true') {
    query = query.eq('has_website', true);
  } else if (hasWebsite === 'false') {
    query = query.eq('has_website', false);
  }
  if (hasEmail === 'true') {
    query = query.not('email', 'is', null);
  }

  // Apply sorting and pagination
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

// POST /api/leads — Create a new lead
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();

    // Check for duplicates
    let dupQuery = supabase.from('leads').select('id');
    if (body.phone) {
      dupQuery = dupQuery
        .eq('business_name', body.business_name)
        .eq('phone', body.phone);
    } else if (body.address) {
      dupQuery = dupQuery
        .eq('business_name', body.business_name)
        .eq('address', body.address);
    }

    const { data: existing } = await dupQuery;
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Duplicate lead', existingId: existing[0].id },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PATCH /api/leads — Update a lead
export async function PATCH(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/leads — Delete a lead
export async function DELETE(request: NextRequest) {
  const supabase = getServiceSupabase();
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
  }

  const { error } = await supabase.from('leads').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
