import "server-only";
import { accessExpiryIso, drawExpiresAt, wishlistExpiresAt } from "@/lib/data-lifecycle";
import { createAccessToken } from "@/lib/security";
import type { Database, Draw, Wishlist } from "@/lib/types";

/**
 * Issues additional management links for a list or draw that someone lost. Existing links keep working: a
 * recovery request typed by someone else must never lock the real organizer out.
 */
export function mintWishlistLinks(database: Database, wishlist: Wishlist) {
  const expiry = accessExpiryIso(wishlistExpiresAt(wishlist));
  const manage = createAccessToken("wishlist_manage", wishlist.id, expiry);
  const guest = createAccessToken("wishlist_guest", wishlist.id, expiry);
  database.accessTokens.push(manage.record, guest.record);
  return { manageToken: manage.raw, guestToken: guest.raw };
}

export function mintDrawAdminLink(database: Database, draw: Draw) {
  const admin = createAccessToken("draw_admin", draw.id, accessExpiryIso(drawExpiresAt(draw)));
  database.accessTokens.push(admin.record);
  return { adminToken: admin.raw };
}
