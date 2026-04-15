import { Resend } from 'resend';
import { trackApiCall } from '@/lib/api-usage';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  trackingPixelUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResend();
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Pipeline';

  // Append tracking pixel if provided
  let htmlBody = params.html;
  if (params.trackingPixelUrl) {
    htmlBody += `<img src="${params.trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [params.to],
      subject: params.subject,
      html: htmlBody,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    trackApiCall('resend', 'send_email');

    return { success: true, messageId: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function sendBulkEmails(
  emails: SendEmailParams[],
  delayMs: number = 30000 // 30 seconds between emails
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = [];

  for (let i = 0; i < emails.length; i++) {
    const result = await sendEmail(emails[i]);
    results.push(result);

    // Delay between sends (except after the last one)
    if (i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
