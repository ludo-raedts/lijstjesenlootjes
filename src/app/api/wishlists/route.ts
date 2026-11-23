import { personalLink } from "@/lib/personal-links";
import { deliverEmailAfterResponse, queuedStatus } from "@/lib/email-delivery";
import { emailConfigured } from "@/lib/email";
import { recoveryHash, recoverySecret } from "@/lib/recovery";
import { renderWishlistEmail } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { NextRequest } from "next/server";
import { accessExpiryIso, wishlistExpiresAt } from "@/lib/data-lifecycle";
import { assertSameOrigin, createAccessToken, HttpError, id, limit, limitRecipient } from "@/lib/security";
import { errorResponse, LIST_BODY_BYTES, noStoreJson, readJson } from "@/lib/http";
import { recordUsage, transaction } from "@/lib/store";
import { optionalDate, optionalEmail, optionalText, optionalUrl, text } from "@/lib/validation";
import type { Wish, Wishlist } from "@/lib/types";

function parseWish(input: unknown): Wish {
  if (!input || typeof input !== "object") throw new HttpError(400, "wish_incomplete");
  const wish = input as Record<string, unknown>;
  return {
    id: id(),
    title: text(wish.title, "wish", 160),
    url: optionalUrl(wish.url),
    price: optionalText(wish.price, "price", 40),
    note: optionalText(wish.note, "note", 500),
  };
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await limit(request, "wishlist-create", 12);
    const body = await readJson(request, LIST_BODY_BYTES);
    const email = optionalEmail(body.email);
    if (email) {
      await limit(request, "email-send", 5);
      await limitRecipient(email);
    }
    if (!Array.isArray(body.wishes) || body.wishes.length < 1 || body.wishes.length > 50) {
      throw new HttpError(400, "invalid_wishlist_wish_count", { min: 1, max: 50 });
    }
    const wishlistId = id();
    const createdAt = new Date().toISOString();
    const accessExpiry = accessExpiryIso(wishlistExpiresAt({ createdAt, updatedAt: createdAt }));
    const manage = createAccessToken("wishlist_manage", wishlistId, accessExpiry);
    const guest = createAccessToken("wishlist_guest", wishlistId, accessExpiry);
    const wishlist: Wishlist = {
      id: wishlistId,
      title: text(body.title, "title", 120),
      occasion: optionalText(body.occasion, "occasion", 80),
      date: optionalDate(body.date),
      createdAt,
      updatedAt: createdAt,
      wishes: body.wishes.map(parseWish),
      reservations: body.reservations === false ? false : undefined,
      recoveryHash: email && body.recoverable === true ? recoveryHash(email, recoverySecret()) : undefined,
      emailStatus: email && emailConfigured() ? queuedStatus() : undefined,
    };
    await transaction((database) => {
      database.wishlists.push(wishlist);
      database.accessTokens.push(manage.record, guest.record);
    });
    await recordUsage("wishlist_created");
    const manageUrl = personalLink(request, "wishlistManage", manage.raw);
    const guestUrl = personalLink(request, "wishlistGuest", guest.raw);
    let emailStatus: "not_requested" | "queued" | "failed" = "not_requested";
    if (email) {
      const { t, locale } = await getServerI18n();
      const rendered = renderWishlistEmail(t, { title: wishlist.title, manageUrl, guestUrl, locale, site: (await getRequestSiteUrl()).replace(/^https?:\/\//, "") });
      const queued = deliverEmailAfterResponse(
        { to: email, ...rendered, host: await getRequestHost(), idempotencyKey: `wishlist-${wishlistId}` },
        { kind: "wishlist", id: wishlistId },
      );
      emailStatus = queued ? "queued" : "failed";
    }
    return noStoreJson({ manageUrl, guestUrl, emailStatus }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
