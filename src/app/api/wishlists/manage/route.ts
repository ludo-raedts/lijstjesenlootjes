import { NextRequest } from "next/server";
import { mintWishlistLinks } from "@/lib/access-links";
import { extendWishlistAccess, wishlistExpiresAt } from "@/lib/data-lifecycle";
import { deliverEmailAfterResponse, queuedStatus } from "@/lib/email-delivery";
import { emailConfigured } from "@/lib/email";
import { renderRecoveryEmail } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { personalLink } from "@/lib/personal-links";
import { recoveryHash, recoverySecret } from "@/lib/recovery";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { assertSameOrigin, HttpError, id, limit, requireSession } from "@/lib/security";
import { errorResponse, LIST_BODY_BYTES, noStoreJson, readJson } from "@/lib/http";
import { read, transaction } from "@/lib/store";
import { optionalDate, optionalEmail, optionalText, optionalUrl, text } from "@/lib/validation";
import type { Wishlist } from "@/lib/types";

function publicWishlist(wishlist: Wishlist) {
  const expiresAt = wishlistExpiresAt(wishlist);
  return {
    id: wishlist.id,
    title: wishlist.title,
    occasion: wishlist.occasion,
    date: wishlist.date,
    expiresAt: expiresAt === undefined ? undefined : new Date(expiresAt).toISOString(),
    emailStatus: wishlist.emailStatus,
    recoverable: Boolean(wishlist.recoveryHash),
    wishes: wishlist.wishes.map(({ reservation: _reservation, ...wish }) => wish),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, "wishlist_manage");
    return noStoreJson(await read((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      return { wishlist: publicWishlist(wishlist), emailAvailable: emailConfigured() };
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

/** Mails fresh links for this list to an address typed now. The address is not stored. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "wishlist_manage");
    const body = await readJson(request);
    if (body.action !== "email_link") throw new HttpError(400, "unknown_action");
    await limit(request, "email-send", 5);
    if (!emailConfigured()) throw new HttpError(503, "email_not_configured");
    const email = optionalEmail(body.email);
    if (!email) throw new HttpError(400, "invalid_email");
    const minted = await transaction((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      const tokens = mintWishlistLinks(database, wishlist);
      wishlist.emailStatus = queuedStatus();
      if (body.recoverable === true) wishlist.recoveryHash = recoveryHash(email, recoverySecret());
      return { ...tokens, title: wishlist.title, wishlistId: wishlist.id };
    });
    const { t, locale } = await getServerI18n();
    const rendered = renderRecoveryEmail(t, {
      items: [{
        kind: "wishlist",
        title: minted.title,
        manageUrl: personalLink(request, "wishlistManage", minted.manageToken),
        guestUrl: personalLink(request, "wishlistGuest", minted.guestToken),
      }],
      locale,
      site: (await getRequestSiteUrl()).replace(/^https?:\/\//, ""),
    });
    deliverEmailAfterResponse(
      { to: email, ...rendered, host: await getRequestHost(), idempotencyKey: `wishlist-link-${minted.wishlistId}-${minted.manageToken.slice(0, 12)}` },
      { kind: "wishlist", id: minted.wishlistId },
    );
    return noStoreJson({ queued: true }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "wishlist_manage");
    const body = await readJson(request, LIST_BODY_BYTES);
    if (!Array.isArray(body.wishes) || body.wishes.length < 1 || body.wishes.length > 50) {
      throw new HttpError(400, "invalid_wishlist_wish_count", { min: 1, max: 50 });
    }
    const requestedWishes = body.wishes;
    const updated = await transaction((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      const oldById = new Map(wishlist.wishes.map((wish) => [wish.id, wish]));
      const seen = new Set<string>();
      const wishes = requestedWishes.map((input: unknown) => {
        if (!input || typeof input !== "object") throw new HttpError(400, "wish_incomplete");
        const source = input as Record<string, unknown>;
        const requestedId = typeof source.id === "string" ? source.id : undefined;
        const existing = requestedId ? oldById.get(requestedId) : undefined;
        const wishId = existing?.id ?? id();
        if (seen.has(wishId)) throw new HttpError(400, "duplicate_wish");
        seen.add(wishId);
        return {
          id: wishId,
          title: text(source.title, "wish", 160),
          url: optionalUrl(source.url),
          price: optionalText(source.price, "price", 40),
          note: optionalText(source.note, "note", 500),
          reservation: existing?.reservation,
        };
      });
      wishlist.title = text(body.title, "title", 120);
      wishlist.occasion = optionalText(body.occasion, "occasion", 80);
      wishlist.date = optionalDate(body.date);
      wishlist.wishes = wishes;
      wishlist.updatedAt = new Date().toISOString();
      extendWishlistAccess(database, wishlist);
      return publicWishlist(wishlist);
    });
    return noStoreJson({ wishlist: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "wishlist_manage");
    await transaction((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      database.wishlists = database.wishlists.filter((item) => item.id !== wishlist.id);
      database.accessTokens = database.accessTokens.filter((token) => token.scopeId !== wishlist.id);
      database.sessions = database.sessions.filter((item) => item.scopeId !== wishlist.id);
    });
    return noStoreJson({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
