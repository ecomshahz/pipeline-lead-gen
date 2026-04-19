import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import type { BillingType, ClientStatus } from '@/types';

// Valid constraint values from the migration — keep these in sync.
const BILLING_TYPES: BillingType[] = ['one_time', 'monthly', 'retainer', 'project'];
const STATUSES: ClientStatus[] = ['active', 'paused', 'churned', 'completed'];

// GET /api/clients — list clients (with optional filtering + total payments)
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const billingType = params.get('billing_type');
  const clientId = params.get('id');

  // Single-client fetch returns client + payment history
  if (clientId) {
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    if (clientErr) {
      return NextResponse.json({ error: clientErr.message }, { status: 404 });
    }
    const { data: payments, error: payErr } = await supabase
      .from('client_payments')
      .select('*')
      .eq('client_id', clientId)
      .order('paid_at', { ascending: false });
    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 500 });
    }
    return NextResponse.json({ client, payments: payments ?? [] });
  }

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (billingType) query = query.eq('billing_type', billingType);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ clients: data ?? [] });
}

// POST /api/clients — create new client (optionally from an existing lead)
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();

    if (!body?.business_name || !body?.service_type || !body?.billing_type) {
      return NextResponse.json(
        { error: 'business_name, service_type, and billing_type are required' },
        { status: 400 }
      );
    }

    if (!BILLING_TYPES.includes(body.billing_type)) {
      return NextResponse.json(
        { error: `billing_type must be one of: ${BILLING_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Accept amount in dollars (number) OR cents (integer). Dollars get converted.
    // This keeps the API easy to use from forms without forcing cents everywhere.
    const amountCents = (() => {
      if (typeof body.amount_cents === 'number') return Math.round(body.amount_cents);
      if (typeof body.amount === 'number') return Math.round(body.amount * 100);
      return 0;
    })();

    // If converting from a lead, pull the lead's info for continuity
    let leadData: Record<string, unknown> = {};
    if (body.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('business_name, owner_name, email, phone, website_url, city, state, niche')
        .eq('id', body.lead_id)
        .single();
      if (lead) leadData = lead;
    }

    const insert = {
      lead_id: body.lead_id ?? null,
      business_name: body.business_name ?? leadData.business_name,
      owner_name: body.owner_name ?? leadData.owner_name ?? null,
      email: body.email ?? leadData.email ?? null,
      phone: body.phone ?? leadData.phone ?? null,
      website_url: body.website_url ?? leadData.website_url ?? null,
      city: body.city ?? leadData.city ?? null,
      state: body.state ?? leadData.state ?? null,
      niche: body.niche ?? leadData.niche ?? null,
      service_type: body.service_type,
      service_description: body.service_description ?? null,
      billing_type: body.billing_type,
      amount_cents: amountCents,
      currency: body.currency ?? 'USD',
      status: body.status ?? 'active',
      start_date: body.start_date ?? new Date().toISOString().split('T')[0],
      end_date: body.end_date ?? null,
      notes: body.notes ?? null,
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(insert)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If the client came from a lead and the lead isn't already marked won,
    // bump its status so our pipeline reflects reality.
    if (body.lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'closed_won' })
        .eq('id', body.lead_id)
        .neq('status', 'closed_won');
    }

    return NextResponse.json({ client: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PATCH /api/clients — update a client
export async function PATCH(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (updates.billing_type && !BILLING_TYPES.includes(updates.billing_type)) {
      return NextResponse.json(
        { error: `billing_type must be one of: ${BILLING_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (updates.status && !STATUSES.includes(updates.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Accept `amount` in dollars for convenience
    if (typeof updates.amount === 'number') {
      updates.amount_cents = Math.round(updates.amount * 100);
      delete updates.amount;
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/clients?id=... — hard-delete a client (cascades to payments)
export async function DELETE(request: NextRequest) {
  const supabase = getServiceSupabase();
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
