import { createHmac } from "node:crypto";

export function createRateLimitBucketKey(
  identifier: string,
  action: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(action)
    .update("\0")
    .update(identifier)
    .digest("hex");
}
