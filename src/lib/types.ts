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

export type Wishlist = {
  id: string;
  title: string;
  occasion?: string;
  date?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  wishes: Wish[];
  /** Keyed hash of the organizer's address, stored only when they opted in to link recovery. */
  recoveryHash?: string;
  emailStatus?: EmailStatus;
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
  };
};

export const emptyDatabase = (): Database => ({
  version: 1,
  wishlists: [],
  draws: [],
  accessTokens: [],
  sessions: [],
});
