import { personalLink } from "@/lib/personal-links";
import { NextRequest } from "next/server";
import { assertSameOrigin, createAccessToken, HttpError, id, limit } from "@/lib/security";
import { errorResponse, noStoreJson } from "@/lib/http";
import { transaction } from "@/lib/store";
import { optionalDate, optionalText, optionalUrl, text } from "@/lib/validation";
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
    const body = (await request.json()) as Record<string, unknown>;
    if (!Array.isArray(body.wishes) || body.wishes.length < 1 || body.wishes.length > 50) {
      throw new HttpError(400, "invalid_wishlist_wish_count", { min: 1, max: 50 });
    }
    const wishlistId = id();
    const manage = createAccessToken("wishlist_manage", wishlistId);
    const guest = createAccessToken("wishlist_guest", wishlistId);
    const createdAt = new Date().toISOString();
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
    return noStoreJson({
      manageUrl: personalLink(request, "wishlistManage", manage.raw),
      guestUrl: personalLink(request, "wishlistGuest", guest.raw),
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
