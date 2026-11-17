/**
 * One-off transactional mail through the Resend HTTP API.
 *
 * Addresses are used for a single send and never stored or logged. This function never throws:
 * a failed mail must not fail the action the user just completed.
 */
export type EmailResult = "sent" | "skipped" | "failed";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Makes a retried request for the same event send at most one mail. */
  idempotencyKey: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

export function emailConfigured() {
  return Boolean(process.env.EMAIL_PROVIDER_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return "skipped";
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("Email send failed", response.status);
      return "failed";
    }
    return "sent";
  } catch {
    console.error("Email send failed");
    return "failed";
  }
}
