import "server-only";
import { after } from "next/server";
import { emailConfigured, sendEmailWithRetry, type EmailMessage } from "@/lib/email";
import { transaction } from "@/lib/store";
import type { EmailStatus } from "@/lib/types";

export type EmailScope = { kind: "wishlist" | "draw"; id: string };

export function queuedStatus(now: Date = new Date()): EmailStatus {
  return { state: "queued", at: now.toISOString() };
}

/** Records the outcome on the list or draw (state only; never the address or the links). */
async function recordStatus(scope: EmailScope, state: "sent" | "failed") {
  try {
    await transaction((database) => {
      const target = scope.kind === "wishlist"
        ? database.wishlists.find((item) => item.id === scope.id)
        : database.draws.find((item) => item.id === scope.id);
      if (target) target.emailStatus = { state, at: new Date().toISOString() };
    });
  } catch {
    console.error("Email status could not be recorded");
  }
}

/**
 * Sends one email after the response has gone out, with retries, and records the outcome. The caller's request
 * returns at once; the status shows up on the management page. Returns false when email is not configured.
 */
export function deliverEmailAfterResponse(message: EmailMessage, scope?: EmailScope): boolean {
  if (!emailConfigured()) return false;
  after(async () => {
    const result = await sendEmailWithRetry(message);
    if (scope) await recordStatus(scope, result === "sent" ? "sent" : "failed");
  });
  return true;
}
