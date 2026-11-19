import { NextRequest } from "next/server";
import { HttpError } from "@/lib/api-error";
import { errorResponse, noStoreJson } from "@/lib/http";
import { usageEventForResendType, verifyResendSignature } from "@/lib/resend-webhook";
import { recordUsage } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Resend delivery events (delivered, bounced, complained, delayed) become anonymous daily counters.
 * The payload contains the recipient address; it is never read into a variable beyond JSON parsing, stored or logged.
 * Resend delivers at least once, so a retried event can be counted twice: the figures are an indication, not a ledger.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) throw new HttpError(503, "webhook_not_configured");
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");

    const valid = verifyResendSignature({
      secret,
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
      body,
    });
    if (!valid) throw new HttpError(401, "webhook_signature_invalid");

    let type: unknown;
    try {
      type = (JSON.parse(body) as { type?: unknown }).type;
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    const event = usageEventForResendType(type);
    if (event) await recordUsage(event);
    return noStoreJson({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}
