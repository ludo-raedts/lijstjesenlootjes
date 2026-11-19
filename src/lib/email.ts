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
/** Pauses before each attempt: first try at once, then two retries for transient failures. */
export const RETRY_DELAYS_MS = [0, 1500, 4000] as const;

/** Test and staging hook: point the provider call at a stand-in. Never set in production. */
function endpoint() {
  return process.env.EMAIL_API_URL?.trim() || RESEND_ENDPOINT;
}

/**
 * Sender for a public domain. `EMAIL_FROM_<HOST>` (for example `EMAIL_FROM_WISHANDDRAW_COM`) wins when set;
 * otherwise `EMAIL_FROM` is used, so one verified domain is enough to start.
 */
export function senderForHost(host: string | null | undefined) {
  const domain = findSiteDomain(host)?.host;
  const specific = domain ? process.env[`EMAIL_FROM_${domain.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`]?.trim() : undefined;
  return specific || process.env.EMAIL_FROM?.trim() || undefined;
}

/**
 * Where a reply to a mail goes: the contact address of the domain the request arrived on (so mail from
 * wishanddraw.com is answered at wishanddraw.com). `EMAIL_REPLY_TO` is only the fallback for unknown hosts such as
 * previews. Each address needs a real mailbox.
 */
export function replyToForHost(host: string | null | undefined) {
  return findSiteDomain(host)?.contactEmail || process.env.EMAIL_REPLY_TO?.trim() || undefined;
}

export function emailConfigured() {
  return Boolean(process.env.EMAIL_PROVIDER_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

/** Resend answers errors as `{ "name": "...", "message": "..." }`; only the short, fixed name is safe to log. */
async function providerErrorName(response: Response) {
  try {
    const name = ((await response.json()) as { name?: unknown }).name;
    return typeof name === "string" && /^[a-z_]{1,40}$/.test(name) ? name : "unknown";
  } catch {
    return "unknown";
  }
}

type Attempt = { result: EmailResult; retryable: boolean };

async function attempt(message: EmailMessage): Promise<Attempt> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = senderForHost(message.host);
  if (!apiKey || !from) return { result: "skipped", retryable: false };
  const replyTo = replyToForHost(message.host);
  try {
    const response = await fetch(endpoint(), {
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
      // The provider's error name (for example "validation_error") and the sender domain make a 403 diagnosable
      // (an unverified sending domain looks different from a restricted key); recipients and message text are never logged.
      const name = await providerErrorName(response);
      console.error("Email send failed", response.status, name, from.split("@").pop()?.replace(/[>\s]/g, "") ?? "");
      // Rate limits and provider errors are worth another try; a rejected request (4xx) is not.
      return { result: "failed", retryable: response.status === 429 || response.status >= 500 };
    }
    return { result: "sent", retryable: false };
  } catch {
    console.error("Email send failed");
    return { result: "failed", retryable: true };
  }
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return (await attempt(message)).result;
}

/**
 * Sends with a few retries for transient failures. The idempotency key makes a retried send deliver at most one
 * mail. Meant to run after the response, so the visitor never waits on the provider.
 */
export async function sendEmailWithRetry(
  message: EmailMessage,
  delays: readonly number[] = RETRY_DELAYS_MS,
): Promise<EmailResult> {
  let last: EmailResult = "failed";
  for (const delay of delays) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    const outcome = await attempt(message);
    last = outcome.result;
    if (outcome.result !== "failed" || !outcome.retryable) return outcome.result;
  }
  return last;
}
