import { createHmac } from "node:crypto";

/**
 * Link recovery without storing a readable address.
 *
 * When an organizer opts in, we keep a keyed hash of their (normalized) email address on the list or draw.
 * Asking for a new link later means typing the same address again: we hash it, look for matches and mail new
 * links to the address that was just typed. The address itself is never stored, logged or returned.
 */
export const RECOVERY_LIMITS = {
  /** Lists and draws that can be recovered with one request; the newest come first. */
  maxScopesPerRequest: 5,
} as const;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function recoveryHash(email: string, secret: string) {
  if (!secret) throw new Error("A recovery secret is required.");
  return createHmac("sha256", secret).update(`recovery-email-v1:${normalizeEmail(email)}`).digest("hex");
}

/** A dedicated secret wins; otherwise the server-only database key keeps the hash unguessable. */
export function recoverySecret(env: Record<string, string | undefined> = process.env) {
  return env.RECOVERY_HASH_SECRET?.trim() || env.SUPABASE_SECRET_KEY?.trim() || "";
}
