import { HttpError } from "@/lib/api-error";

export type FieldKey =
  | "requestId"
  | "participantId"
  | "name"
  | "exclusion"
  | "groupName"
  | "organizerName"
  | "budget"
  | "title"
  | "occasion"
  | "wish"
  | "price"
  | "note"
  | "url";

export function text(value: unknown, field: FieldKey, max = 160) {
  if (typeof value !== "string") throw new HttpError(400, "field_required", { field });
  const result = value.trim();
  if (!result) throw new HttpError(400, "field_required", { field });
  if (result.length > max) throw new HttpError(400, "field_too_long", { field, max });
  return result;
}

export function optionalText(value: unknown, field: FieldKey, max = 240) {
  if (value === undefined || value === null || value === "") return undefined;
  return text(value, field, max);
}

export function optionalUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = text(value, "url", 1000);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, "unsupported_url_protocol");
  }
  return url.toString();
}

export function optionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "invalid_date");
  }
  return value;
}
