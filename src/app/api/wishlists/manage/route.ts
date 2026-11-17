import { NextRequest } from "next/server";
import { assertSameOrigin, HttpError, id, requireSession } from "@/lib/security";
import { errorResponse, noStoreJson } from "@/lib/http";
import { read, transaction } from "@/lib/store";
import { optionalDate, optionalText, optionalUrl, text } from "@/lib/validation";
import type { Wish } from "@/lib/types";

function publicWishlist(wishlist: { id: string; title: string; occasion?: string; date?: string; wishes: Wish[] }) {
  return {
    id: wishlist.id,
    title: wishlist.title,
    occasion: wishlist.occasion,
    date: wishlist.date,
    wishes: wishlist.wishes.map(({ reservation: _reservation, ...wish }) => wish),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, "wishlist_manage");
    return noStoreJson(await read((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      return { wishlist: publicWishlist(wishlist) };
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "wishlist_manage");
    const body = (await request.json()) as Record<string, unknown>;
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
