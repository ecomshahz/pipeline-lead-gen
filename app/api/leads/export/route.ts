import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/leads/export — Export leads as CSV
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;

  const niche = searchParams.get('niche') ?? '';
  const state = searchParams.get('state') ?? '';
  const status = searchParams.get('status') ?? '';
  const minScore = searchParams.get('minScore') ?? '';
  const format = searchParams.get('format') ?? 'csv';
  const columns = searchParams.get('columns')?.split(',') ?? [];

  let query = supabase.from('leads').select('*');

  if (niche) query = query.eq('niche', niche);
  if (state) query = query.eq('state', state);
  if (status) query = query.eq('status', status);
  if (minScore) query = query.gte('lead_score', parseInt(minScore));

  query = query.order('lead_score', { ascending: false });

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: 'No leads found' }, { status: 404 });
  }

  // Determine which columns to export
  const defaultColumns = [
    'business_name', 'niche', 'owner_name', 'phone', 'email',
    'address', 'city', 'state', 'zip', 'website_url', 'has_website',
    'website_score', 'google_rating', 'review_count', 'lead_score',
    'status', 'needs_ai_services',
  ];
  const exportColumns = columns.length > 0 ? columns : defaultColumns;

  if (format === 'csv') {
    const headerRow = exportColumns.join(',');
    const dataRows = leads.map((lead) =>
      exportColumns
        .map((col) => {
          const value = lead[col as keyof typeof lead];
          if (value === null || value === undefined) return '';
          const str = String(value);
          // Escape CSV values that contain commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );

    const csv = [headerRow, ...dataRows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pipeline-leads-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // JSON format
  const filtered = leads.map((lead) => {
    const obj: Record<string, unknown> = {};
    for (const col of exportColumns) {
      obj[col] = lead[col as keyof typeof lead];
    }
    return obj;
  });

  return NextResponse.json(filtered);
}
