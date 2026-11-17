import { NextRequest } from "next/server";
import { assertSameOrigin, HttpError, id, requireSession } from "@/lib/security";
import { errorResponse, LIST_BODY_BYTES, noStoreJson, readJson } from "@/lib/http";
import { read, recordUsage, transaction } from "@/lib/store";
import { optionalText, optionalUrl, text } from "@/lib/validation";
import type { DrawWish } from "@/lib/types";

function publicWishes(wishes: DrawWish[] | undefined) {
  return (wishes ?? []).map(({ id: wishId, title, url, price, note }) => ({
    id: wishId,
    title,
    url,
    price,
    note,
  }));
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
        recipientWishes: publicWishes(recipient.wishes),
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
    if (!Array.isArray(body.wishes) || body.wishes.length < 1 || body.wishes.length > 30) {
      throw new HttpError(400, "invalid_draw_wish_count", { min: 1, max: 30 });
    }
    const requestedWishes = body.wishes;

    const wishes = await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      const participant = draw?.participants.find((item) => item.id === session.participantId);
      if (!draw || !participant) throw new HttpError(410, "personal_draw_not_found");

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
