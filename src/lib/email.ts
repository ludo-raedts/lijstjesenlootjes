/**
 * One-off transactional mail through the Resend HTTP API.
 *
 * Addresses are used for a single send and never stored or logged. This function never throws:
 * a failed mail must not fail the action the user just completed.
 */
import { findSiteDomain } from "@/lib/domains";

export type EmailResult = "sent" | "skipped" | "failed";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Makes a retried request for the same event send at most one mail. */
  idempotencyKey: string;
  /** Domain the request arrived on; selects the sender so each domain mails from itself. */
  host?: string | null;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

/**
 * Sender for a public domain. `EMAIL_FROM_<HOST>` (for example `EMAIL_FROM_WISHANDDRAW_COM`) wins when set;
 * otherwise `EMAIL_FROM` is used, so one verified domain is enough to start.
 */
export function senderForHost(host: string | null | undefined) {
  const domain = findSiteDomain(host)?.host;
  const specific = domain ? process.env[`EMAIL_FROM_${domain.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`]?.trim() : undefined;
  return specific || process.env.EMAIL_FROM?.trim() || undefined;
}

export function emailConfigured() {
  return Boolean(process.env.EMAIL_PROVIDER_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = senderForHost(message.host);
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
