import { personalLink } from "@/lib/personal-links";
import { sendEmail } from "@/lib/email";
import { renderWishlistEmail } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { getRequestSiteUrl } from "@/lib/request-site";
import { NextRequest } from "next/server";
import { accessExpiryIso, wishlistExpiresAt } from "@/lib/data-lifecycle";
import { assertSameOrigin, createAccessToken, HttpError, id, limit } from "@/lib/security";
import { errorResponse, LIST_BODY_BYTES, noStoreJson, readJson } from "@/lib/http";
import { recordUsage, transaction } from "@/lib/store";
import { optionalDate, optionalEmail, optionalText, optionalUrl, text } from "@/lib/validation";
import type { Wish } from "@/lib/types";

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
    if (email) await limit(request, "email-send", 5);
    if (!Array.isArray(body.wishes) || body.wishes.length < 1 || body.wishes.length > 50) {
      throw new HttpError(400, "invalid_wishlist_wish_count", { min: 1, max: 50 });
    }
    const wishlistId = id();
    const createdAt = new Date().toISOString();
    const accessExpiry = accessExpiryIso(wishlistExpiresAt({ createdAt, updatedAt: createdAt }));
    const manage = createAccessToken("wishlist_manage", wishlistId, accessExpiry);
    const guest = createAccessToken("wishlist_guest", wishlistId, accessExpiry);
    const wishlist = {
      id: wishlistId,
      title: text(body.title, "title", 120),
      occasion: optionalText(body.occasion, "occasion", 80),
      date: optionalDate(body.date),
      createdAt,
      updatedAt: createdAt,
      wishes: body.wishes.map(parseWish),
    };
    await transaction((database) => {
      database.wishlists.push(wishlist);
      database.accessTokens.push(manage.record, guest.record);
    });
    await recordUsage("wishlist_created");
    const manageUrl = personalLink(request, "wishlistManage", manage.raw);
    const guestUrl = personalLink(request, "wishlistGuest", guest.raw);
    let emailStatus: "not_requested" | "sent" | "failed" = "not_requested";
    if (email) {
      const { t } = await getServerI18n();
      const rendered = renderWishlistEmail(t, { title: wishlist.title, manageUrl, guestUrl, site: (await getRequestSiteUrl()).replace(/^https?:\/\//, "") });
      const result = await sendEmail({ to: email, ...rendered, idempotencyKey: `wishlist-${wishlistId}` });
      emailStatus = result === "sent" ? "sent" : "failed";
    }
    return noStoreJson({ manageUrl, guestUrl, emailStatus }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
