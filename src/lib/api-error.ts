export const apiErrorCodes = [
  "internal_error",
  "invalid_origin",
  "rate_limited",
  "access_link_invalid",
  "access_link_expired",
  "access_link_replaced",
  "session_required",
  "session_expired",
  "access_revoked",
  "field_required",
  "field_too_long",
  "invalid_url",
  "unsupported_url_protocol",
  "invalid_date",
  "invalid_email",
  "invalid_wishlist_wish_count",
  "wish_incomplete",
  "duplicate_wish",
  "wishlist_not_found",
  "wish_missing",
  "wish_not_found",
  "wish_already_reserved",
  "reservation_not_owned",
  "reservations_disabled",
  "unknown_action",
  "invalid_participant_count",
  "participant_incomplete",
  "duplicate_participant_id",
  "exclusion_incomplete",
  "exclusion_unknown_participant",
  "draw_impossible",
  "draw_generation_timeout",
  "draw_already_exists",
  "draw_not_found",
  "unknown_admin_action",
  "participant_not_found",
  "personal_draw_not_found",
  "draw_reveal_failed",
  "invalid_draw_wish_count",
  "access_token_missing",
  "cron_unauthorized",
  "webhook_not_configured",
  "webhook_signature_invalid",
  "invalid_json",
  "invalid_traffic_measurement",
  "invalid_usage_event",
  "payload_too_large",
  "too_many_exclusions",
  "wishlist_link_invalid",
  "email_not_configured",
  "reminder_needs_future_date",
  "too_many_managers",
  "manager_not_found",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];
export type ApiErrorParams = Record<string, string | number | boolean>;

export type ApiErrorPayload = {
  error: {
    code: ApiErrorCode;
    params?: ApiErrorParams;
  };
};

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (apiErrorCodes as readonly string[]).includes(value);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    public params?: ApiErrorParams,
  ) {
    super(code);
    this.name = "HttpError";
  }
}
