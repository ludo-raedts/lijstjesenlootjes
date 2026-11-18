import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Seals a short secret (an email address kept for one reminder) with AES-256-GCM. The key lives only in the
 * server environment; the database never holds anything readable.
 */
export function parseSealKey(raw: string | undefined): Buffer | undefined {
  if (!raw) return undefined;
  const key = Buffer.from(raw.trim(), "base64");
  return key.length === 32 ? key : undefined;
}

export function seal(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

/** Returns undefined for a wrong key or any tampering. */
export function unseal(sealed: string, key: Buffer): string | undefined {
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !data || iv.length !== 12 || tag.length !== 16) return undefined;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}
