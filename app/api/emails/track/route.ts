import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/emails/track — Tracking pixel endpoint for email opens
export async function GET(request: NextRequest) {
  const emailLogId = request.nextUrl.searchParams.get('id');

  if (emailLogId) {
    const supabase = getServiceSupabase();

    // Mark email as opened
    await supabase
      .from('email_logs')
      .update({ opened: true })
      .eq('id', emailLogId);

    // Also update the lead's email_opened flag
    const { data: emailLog } = await supabase
      .from('email_logs')
      .select('lead_id')
      .eq('id', emailLogId)
      .single();

    if (emailLog) {
      await supabase
        .from('leads')
        .update({ email_opened: true })
        .eq('id', emailLog.lead_id);
    }
  }

  // Return a 1x1 transparent PNG
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
