import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// POST /api/clients/payments — log a payment for a client
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();

    if (!body?.client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Accept dollars (number) or cents (integer)
    const amountCents = (() => {
      if (typeof body.amount_cents === 'number') return Math.round(body.amount_cents);
      if (typeof body.amount === 'number') return Math.round(body.amount * 100);
      return NaN;
    })();

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: 'amount (dollars) or amount_cents (integer cents) must be a positive number' },
        { status: 400 }
      );
    }

    const insert = {
      client_id: body.client_id,
      amount_cents: amountCents,
      currency: body.currency ?? 'USD',
      paid_at: body.paid_at ?? new Date().toISOString().split('T')[0],
      description: body.description ?? null,
      method: body.method ?? null,
    };

    const { data, error } = await supabase
      .from('client_payments')
      .insert(insert)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/clients/payments?id=... — remove a payment (e.g. refund, correction)
export async function DELETE(request: NextRequest) {
  const supabase = getServiceSupabase();
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('client_payments').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
