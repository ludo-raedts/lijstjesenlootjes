import { createHmac, timingSafeEqual } from "node:crypto";
import type { UsageEvent } from "@/lib/usage";

/** Resend signs webhooks with Svix: `svix-id`, `svix-timestamp` and `svix-signature` (`v1,<base64>`, space-separated). */
const TOLERANCE_SECONDS = 5 * 60;

const EVENT_MAP: Record<string, UsageEvent> = {
  "email.delivered": "email_delivered",
  "email.bounced": "email_bounced",
  "email.complained": "email_complained",
  "email.delivery_delayed": "email_delayed",
};

/** Maps a Resend event type to an anonymous counter; every other type (sent, opened, clicked, ...) is ignored. */
export function usageEventForResendType(type: unknown): UsageEvent | undefined {
  return typeof type === "string" ? EVENT_MAP[type] : undefined;
}

/**
 * Verifies the Svix signature over `<id>.<timestamp>.<body>` in constant time and rejects old or future timestamps
 * (replay protection). `secret` is the `whsec_...` signing secret from the Resend dashboard.
 */
export function verifyResendSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: number;
}): boolean {
  const { secret, id, timestamp, signature, body } = input;
  if (!secret || !id || !timestamp || !signature) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(now - seconds) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const candidate = Buffer.from(value, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}
