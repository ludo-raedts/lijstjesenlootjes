import { NextRequest } from "next/server";
import { assertSameOrigin, HttpError, requireSession } from "@/lib/security";
import { errorResponse, noStoreJson } from "@/lib/http";
import { read, transaction } from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, "wishlist_guest");
    return noStoreJson(await read((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      return {
        wishlist: {
          title: wishlist.title,
          occasion: wishlist.occasion,
          date: wishlist.date,
          wishes: wishlist.wishes.map((wish) => ({
            id: wish.id,
            title: wish.title,
            url: wish.url,
            price: wish.price,
            note: wish.note,
            reserved: Boolean(wish.reservation),
            ownReservation: wish.reservation?.ownerSessionHash === session.hash,
          })),
        },
      };
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "wishlist_guest");
    const body = (await request.json()) as { action?: unknown; wishId?: unknown };
    if (typeof body.wishId !== "string") throw new HttpError(400, "wish_missing");
    const result = await transaction((database) => {
      const wishlist = database.wishlists.find((item) => item.id === session.scopeId && !item.deletedAt);
      if (!wishlist) throw new HttpError(410, "wishlist_not_found");
      const wish = wishlist.wishes.find((item) => item.id === body.wishId);
      if (!wish) throw new HttpError(404, "wish_not_found");
      if (body.action === "reserve") {
        if (wish.reservation && wish.reservation.ownerSessionHash !== session.hash) {
          throw new HttpError(409, "wish_already_reserved");
        }
        wish.reservation = { ownerSessionHash: session.hash, reservedAt: new Date().toISOString() };
        return { reserved: true };
      }
      if (body.action === "release") {
        if (!wish.reservation || wish.reservation.ownerSessionHash !== session.hash) {
          throw new HttpError(403, "reservation_not_owned");
        }
        delete wish.reservation;
        return { reserved: false };
      }
      throw new HttpError(400, "unknown_action");
    });
    return noStoreJson(result);
  } catch (error) {
    return errorResponse(error);
  }
}
