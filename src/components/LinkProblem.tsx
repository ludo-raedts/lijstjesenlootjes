"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import type { ApiErrorCode } from "@/lib/api-error";
import { pathForHost } from "@/lib/paths";

type Role = "organizer" | "participant" | "guest";

const titles: Partial<Record<ApiErrorCode, MessageKey>> = {
  access_link_expired: "linkProblem.expired.title",
  session_expired: "linkProblem.expired.title",
  access_link_replaced: "linkProblem.replaced.title",
  access_revoked: "linkProblem.replaced.title",
  access_link_invalid: "linkProblem.invalid.title",
  session_required: "linkProblem.session.title",
};

/** Explains a dead personal link and says what to do next, depending on who is looking. */
export function LinkProblem({ role, code, message }: { role: Role; code: ApiErrorCode; message: string }) {
  const { t } = useI18n();
  const recoverPath = pathForHost("recover", window.location.host);
  return (
    <div className="notice error link-problem" role="alert">
      <strong>{t(titles[code] ?? "linkProblem.invalid.title")}</strong>
      <span>{message}</span>
      <span>{t(role === "organizer" ? "linkProblem.organizer.body" : role === "participant" ? "linkProblem.participant.body" : "linkProblem.guest.body")}</span>
      {role === "organizer" ? <Link className="button button-small" href={recoverPath}>{t("linkProblem.organizer.action")}</Link> : null}
    </div>
  );
}
