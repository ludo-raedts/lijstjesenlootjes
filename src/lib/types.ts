import type { Locale } from "@/i18n/config";
import type { ThemeSettings } from "@/lib/theme";

export type AccessRole =
  | "wishlist_manage"
  | "wishlist_guest"
  | "draw_admin"
  | "draw_participant";

export type Wish = {
  id: string;
  title: string;
  url?: string;
  price?: string;
  note?: string;
  reservation?: {
    ownerSessionHash: string;
    reservedAt: string;
  };
};

export type DrawWish = Omit<Wish, "reservation">;

/** Delivery state of the one-off link email. The address itself is never stored. */
export type EmailStatus = {
  state: "queued" | "sent" | "failed";
  at: string;
};

/** An extra management link the owner handed out, so it can be listed and revoked without keeping the raw token. */
export type CoManager = {
  id: string;
  label?: string;
  tokenHash: string;
  createdAt: string;
};

/**
 * One reminder mail to the organizer, set up on purpose. The address is sealed with a server key, used once, and
 * removed again after sending (or when the date has passed, or the draw is deleted).
 */
export type DrawReminder = {
  emailSealed: string;
  /** Day (YYYY-MM-DD, Europe/Amsterdam) on or after which the reminder is sent. */
  sendOn: string;
  locale: Locale;
  host?: string;
};

export type Wishlist = {
  id: string;
  title: string;
  occasion?: string;
  date?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  wishes: Wish[];
  /** Whether guests can reserve gifts. Only `false` switches it off, so lists created before this option keep reservations. */
  reservations?: boolean;
  /** Keyed hash of the organizer's address, stored only when they opted in to link recovery. */
  recoveryHash?: string;
  emailStatus?: EmailStatus;
  comanagers?: CoManager[];
};

export type Participant = {
  id: string;
  name: string;
  viewedAt?: string;
  activeTokenHash: string;
  wishes?: DrawWish[];
  /** A standalone wishlist this participant chose to show to their giver, read live. */
  linkedWishlistId?: string;
};

export type Draw = {
  id: string;
  requestId: string;
  title?: string;
  organizerName: string;
  budget?: string;
  date?: string;
  createdAt: string;
  status: "complete";
  participants: Participant[];
  exclusions: Array<{ from: string; to: string }>;
  assignments: Array<{ giverId: string; recipientId: string }>;
  recoveryHash?: string;
  emailStatus?: EmailStatus;
  /** Free text from the organizer for everyone in the draw (house rules, where to meet). */
  note?: string;
  /** Set when the organizer redrew after changing participants; participants see it. */
  redrawnAt?: string;
  reminder?: DrawReminder;
};

export type AccessToken = {
  hash: string;
  role: AccessRole;
  scopeId: string;
  participantId?: string;
  expiresAt: string;
  revokedAt?: string;
};

export type Session = {
  hash: string;
  accessHash: string;
  role: AccessRole;
  scopeId: string;
  participantId?: string;
  expiresAt: string;
};

export type Database = {
  version: 1;
  wishlists: Wishlist[];
  draws: Draw[];
  accessTokens: AccessToken[];
  sessions: Session[];
  siteSettings?: {
    theme?: ThemeSettings;
    /** When each scheduled job last ran (ISO timestamps only), read by the cron health check. */
    cronRuns?: Partial<Record<"cleanup" | "reminders", string>>;
  };
};

export const emptyDatabase = (): Database => ({
  version: 1,
  wishlists: [],
  draws: [],
  accessTokens: [],
  sessions: [],
});
