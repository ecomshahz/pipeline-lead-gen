// Generate a tracking pixel URL for email open tracking
export function getTrackingPixelUrl(emailLogId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/api/emails/track?id=${emailLogId}`;
}
