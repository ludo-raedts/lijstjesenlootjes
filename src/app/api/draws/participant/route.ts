import { NextRequest } from "next/server";
import { extractToken } from "@/lib/link-input";
import { assertSameOrigin, HttpError, id, limit, requireSession, tokenHash } from "@/lib/security";
import { errorResponse, LIST_BODY_BYTES, noStoreJson, readJson } from "@/lib/http";
import { read, recordUsage, transaction } from "@/lib/store";
import { optionalText, optionalUrl, text } from "@/lib/validation";
import type { Database, DrawWish, Participant } from "@/lib/types";

function publicWishes(wishes: DrawWish[] | undefined) {
  return (wishes ?? []).map(({ id: wishId, title, url, price, note }) => ({
    id: wishId,
    title,
    url,
    price,
    note,
  }));
}

/**
 * What a giver sees of someone's wishes: the wishes typed into the draw, followed by the live wishes of a
 * standalone list the person chose to link. Reservations of that list are never exposed.
 */
function visibleWishes(database: Database, participant: Participant) {
  const own = publicWishes(participant.wishes);
  const linked = participant.linkedWishlistId
    ? database.wishlists.find((item) => item.id === participant.linkedWishlistId && !item.deletedAt)
    : undefined;
  return linked ? [...own, ...publicWishes(linked.wishes)] : own;
}

function linkedWishlistSummary(database: Database, participant: Participant) {
  const linked = participant.linkedWishlistId
    ? database.wishlists.find((item) => item.id === participant.linkedWishlistId && !item.deletedAt)
    : undefined;
  return linked ? { title: linked.title, wishCount: linked.wishes.length } : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, "draw_participant");
    return noStoreJson(await read((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      const participant = draw?.participants.find((item) => item.id === session.participantId);
      if (!draw || !participant) throw new HttpError(410, "personal_draw_not_found");
      return {
        draw: {
          title: draw.title,
          giverName: participant.name,
          budget: draw.budget,
          date: draw.date,
          revealedBefore: Boolean(participant.viewedAt),
          ownWishes: publicWishes(participant.wishes),
          linkedWishlist: linkedWishlistSummary(database, participant),
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
    const session = await requireSession(request, "draw_participant");
    const result = await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      const participant = draw?.participants.find((item) => item.id === session.participantId);
      if (!draw || !participant) throw new HttpError(410, "personal_draw_not_found");
      const assignment = draw.assignments.find((item) => item.giverId === participant.id);
      const recipient = draw.participants.find((item) => item.id === assignment?.recipientId);
      if (!assignment || !recipient) throw new HttpError(500, "draw_reveal_failed");
      const firstView = !participant.viewedAt;
      participant.viewedAt = participant.viewedAt ?? new Date().toISOString();
      return {
        firstView,
        recipientName: recipient.name,
        title: draw.title,
        budget: draw.budget,
        date: draw.date,
        recipientWishes: visibleWishes(database, recipient),
      };
    });
    if (result.firstView) await recordUsage("personal_link_opened");
    const { firstView: _firstView, ...payload } = result;
    return noStoreJson(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "draw_participant");
    const body = await readJson(request, LIST_BODY_BYTES);
    if (!Array.isArray(body.wishes) || body.wishes.length > 30) {
      throw new HttpError(400, "invalid_draw_wish_count", { min: 1, max: 30 });
    }
    const requestedWishes = body.wishes;

    const wishes = await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      const participant = draw?.participants.find((item) => item.id === session.participantId);
      if (!draw || !participant) throw new HttpError(410, "personal_draw_not_found");

      // An empty list is fine when a standalone wishlist is linked; otherwise at least one wish is needed.
      if (requestedWishes.length < 1 && !participant.linkedWishlistId) {
        throw new HttpError(400, "invalid_draw_wish_count", { min: 1, max: 30 });
      }
      const existingById = new Map((participant.wishes ?? []).map((wish) => [wish.id, wish]));
      const seen = new Set<string>();
      participant.wishes = requestedWishes.map((input) => {
        if (!input || typeof input !== "object") throw new HttpError(400, "wish_incomplete");
        const source = input as Record<string, unknown>;
        const requestedId = typeof source.id === "string" ? source.id : undefined;
        const wishId = requestedId && existingById.has(requestedId) ? requestedId : id();
        if (seen.has(wishId)) throw new HttpError(400, "duplicate_wish");
        seen.add(wishId);
        return {
          id: wishId,
          title: text(source.title, "wish", 160),
          url: optionalUrl(source.url),
          price: optionalText(source.price, "price", 40),
          note: optionalText(source.note, "note", 500),
        };
      });
      return publicWishes(participant.wishes);
    });

    return noStoreJson({ wishes });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Link or unlink a standalone wishlist so the giver sees its wishes instead of retyping them. */
export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "draw_participant");
    await limit(request, "wishlist-link", 20);
    const body = await readJson(request);

    if (body.action === "unlink_wishlist") {
      await transaction((database) => {
        const participant = database.draws
          .find((item) => item.id === session.scopeId)
          ?.participants.find((item) => item.id === session.participantId);
        if (!participant) throw new HttpError(410, "personal_draw_not_found");
        participant.linkedWishlistId = undefined;
      });
      return noStoreJson({ linkedWishlist: undefined });
    }

    if (body.action !== "link_wishlist" || typeof body.link !== "string") {
      throw new HttpError(400, "unknown_action");
    }
    const token = extractToken(body.link);
    if (!token) throw new HttpError(400, "wishlist_link_invalid");
    const hash = tokenHash(token);

    const linkedWishlist = await transaction((database) => {
      const participant = database.draws
        .find((item) => item.id === session.scopeId)
        ?.participants.find((item) => item.id === session.participantId);
      if (!participant) throw new HttpError(410, "personal_draw_not_found");
      const access = database.accessTokens.find((candidate) => candidate.hash === hash);
      const usable =
        access &&
        (access.role === "wishlist_guest" || access.role === "wishlist_manage") &&
        !access.revokedAt &&
        Date.parse(access.expiresAt) > Date.now();
      const wishlist = usable
        ? database.wishlists.find((item) => item.id === access.scopeId && !item.deletedAt)
        : undefined;
      if (!wishlist) throw new HttpError(400, "wishlist_link_invalid");
      participant.linkedWishlistId = wishlist.id;
      return { title: wishlist.title, wishCount: wishlist.wishes.length };
    });
    return noStoreJson({ linkedWishlist });
  } catch (error) {
    return errorResponse(error);
  }
}
