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

export type Wishlist = {
  id: string;
  title: string;
  occasion?: string;
  date?: string;
  createdAt: string;
  deletedAt?: string;
  wishes: Wish[];
};

export type Participant = {
  id: string;
  name: string;
  viewedAt?: string;
  activeTokenHash: string;
  wishes?: DrawWish[];
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
};

export const emptyDatabase = (): Database => ({
  version: 1,
  wishlists: [],
  draws: [],
  accessTokens: [],
  sessions: [],
});
