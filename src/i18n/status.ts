import { defaultLocale, type Locale } from "@/i18n/config";

export type ParticipantLinkStatus = "viewed" | "available";

const participantLinkStatus: Record<Locale, Record<ParticipantLinkStatus, string>> = {
  nl: {
    viewed: "lootje bekeken",
    available: "link beschikbaar",
  },
  en: {
    viewed: "draw viewed",
    available: "link available",
  },
};

export function translateParticipantLinkStatus(
  status: ParticipantLinkStatus,
  locale: Locale = defaultLocale,
) {
  return participantLinkStatus[locale][status];
}
