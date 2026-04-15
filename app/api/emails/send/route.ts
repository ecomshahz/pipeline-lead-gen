import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/sender';
import { renderTemplate, buildVariablesFromLead, textToHtml } from '@/lib/email/templates';
import { getTrackingPixelUrl } from '@/lib/email/tracking';
import { delay } from '@/lib/utils';

// POST /api/emails/send — Send email to one or more leads
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const { leadIds, templateId, customSubject, customBody } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array required' }, { status: 400 });
    }

    // Enforce daily limit of 50 emails
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', `${today}T00:00:00Z`);

    const remaining = 50 - (count ?? 0);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Daily email limit reached (50/day)' },
        { status: 429 }
      );
    }

    const sendCount = Math.min(leadIds.length, remaining);
    const idsToSend = leadIds.slice(0, sendCount);

    // Get template if provided
    let template: { subject: string; body: string } | null = null;
    if (templateId) {
      const { data: tmpl } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('id', templateId)
        .single();
      template = tmpl;
    }

    if (!template && !customSubject) {
      return NextResponse.json(
        { error: 'Either templateId or customSubject/customBody required' },
        { status: 400 }
      );
    }

    // Get leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', idsToSend);

    if (leadsError || !leads) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

    for (const lead of leads) {
      if (!lead.email) {
        results.push({ leadId: lead.id, success: false, error: 'No email address' });
        continue;
      }

      // Render template with lead variables
      const variables = buildVariablesFromLead(lead);
      const subject = template
        ? renderTemplate(template.subject, variables)
        : renderTemplate(customSubject, variables);
      const bodyText = template
        ? renderTemplate(template.body, variables)
        : renderTemplate(customBody ?? '', variables);

      // Create email log first to get tracking ID
      const { data: emailLog } = await supabase
        .from('email_logs')
        .insert({
          lead_id: lead.id,
          template_id: templateId ?? null,
          subject,
          body: bodyText,
        })
        .select()
        .single();

      const trackingUrl = emailLog ? getTrackingPixelUrl(emailLog.id) : undefined;

      // Send the email
      const result = await sendEmail({
        to: lead.email,
        subject,
        html: textToHtml(bodyText),
        trackingPixelUrl: trackingUrl,
      });

      if (result.success) {
        // Update lead
        await supabase
          .from('leads')
          .update({
            email_sent: true,
            last_contacted_at: new Date().toISOString(),
            status: lead.status === 'new' ? 'contacted' : lead.status,
          })
          .eq('id', lead.id);
      }

      results.push({
        leadId: lead.id,
        success: result.success,
        error: result.error,
      });

      // 30-second delay between emails
      if (leads.indexOf(lead) < leads.length - 1) {
        await delay(30000);
      }
    }

    // Update daily stats
    const { data: stats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('date', today)
      .single();

    const sentCount = results.filter((r) => r.success).length;
    if (stats) {
      await supabase
        .from('daily_stats')
        .update({ emails_sent: stats.emails_sent + sentCount })
        .eq('id', stats.id);
    } else {
      await supabase
        .from('daily_stats')
        .insert({ date: today, emails_sent: sentCount });
    }

    return NextResponse.json({
      sent: sentCount,
      failed: results.filter((r) => !r.success).length,
      results,
      remainingToday: remaining - sentCount,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
