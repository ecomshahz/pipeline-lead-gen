import { NextRequest, NextResponse, after } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/sender';
import { renderTemplate, buildVariablesFromLead, textToHtml } from '@/lib/email/templates';
import { getTrackingPixelUrl } from '@/lib/email/tracking';
import { delay } from '@/lib/utils';

// Vercel serverless ceiling (Hobby=60s). The inner send loop runs via after()
// so the API returns immediately and the user sees progress update in the UI.
export const maxDuration = 60;

// Per-send delay. Cold-email deliverability prefers 2-10s between sends.
// Kept short so a batch of N actually finishes inside maxDuration.
const DEFAULT_SEND_DELAY_MS = 2000;

// POST /api/emails/send — Queue emails to one or more leads.
// Returns 202 immediately; the actual sending happens in a background task.
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const { leadIds, templateId, customSubject, customBody, delayMs } = await request.json();

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

    // Get leads (with emails)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', idsToSend);

    if (leadsError || !leads) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const sendable = leads.filter((l) => !!l.email);
    const perSendDelay = typeof delayMs === 'number' && delayMs >= 0
      ? delayMs
      : DEFAULT_SEND_DELAY_MS;

    // Schedule the actual sending AFTER the response is shipped.
    // Vercel keeps the function alive up to maxDuration, so we have ~55s of
    // budget for the loop. With a 2s delay that's ~25 emails per request.
    after(async () => {
      let sentCount = 0;
      const startedAt = Date.now();
      const deadlineMs = startedAt + (maxDuration * 1000) - 5000;

      for (let i = 0; i < sendable.length; i++) {
        if (Date.now() > deadlineMs) {
          console.warn(`Email send job stopping early near timeout (${sentCount} sent)`);
          break;
        }

        const lead = sendable[i];
        try {
          const variables = buildVariablesFromLead(lead);
          const subject = template
            ? renderTemplate(template.subject, variables)
            : renderTemplate(customSubject ?? '', variables);
          const bodyText = template
            ? renderTemplate(template.body, variables)
            : renderTemplate(customBody ?? '', variables);

          // Insert log first so we have a tracking ID
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

          const result = await sendEmail({
            to: lead.email!,
            subject,
            html: textToHtml(bodyText),
            trackingPixelUrl: trackingUrl,
          });

          if (result.success) {
            sentCount++;
            await supabase
              .from('leads')
              .update({
                email_sent: true,
                last_contacted_at: new Date().toISOString(),
                status: lead.status === 'new' ? 'contacted' : lead.status,
              })
              .eq('id', lead.id);
          } else {
            console.warn(`Send failed for lead ${lead.id}: ${result.error ?? 'unknown'}`);
          }
        } catch (err) {
          console.error(`Send failed for lead ${lead.id}:`, err);
        }

        if (i < sendable.length - 1 && perSendDelay > 0) {
          await delay(perSendDelay);
        }
      }

      // Roll sentCount into daily stats
      if (sentCount > 0) {
        const { data: stats } = await supabase
          .from('daily_stats')
          .select('*')
          .eq('date', today)
          .single();

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
      }
    });

    return NextResponse.json(
      {
        status: 'queued',
        queued: sendable.length,
        skipped: leads.length - sendable.length,
        remainingToday: remaining - sendable.length,
        message: `Queued ${sendable.length} email${sendable.length === 1 ? '' : 's'} for delivery`,
      },
      { status: 202 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
