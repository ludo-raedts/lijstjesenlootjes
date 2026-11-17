import { personalLink } from "@/lib/personal-links";
import { NextRequest } from "next/server";
import { assertSameOrigin, createAccessToken, HttpError, requireSession } from "@/lib/security";
import { errorResponse, noStoreJson } from "@/lib/http";
import { read, transaction } from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, "draw_admin");
    return noStoreJson(await read((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      if (!draw) throw new HttpError(410, "draw_not_found");
      return {
        draw: {
          title: draw.title,
          organizerName: draw.organizerName,
          date: draw.date,
          budget: draw.budget,
          participants: draw.participants.map((participant) => ({
            id: participant.id,
            name: participant.name,
            status: participant.viewedAt ? "viewed" : "available",
          })),
        },
        emailAvailable: false,
      };
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "draw_admin");
    const body = (await request.json()) as { action?: unknown; participantId?: unknown };
    if (body.action !== "regenerate" || typeof body.participantId !== "string") {
      throw new HttpError(400, "unknown_admin_action");
    }
    const regenerated = await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      if (!draw) throw new HttpError(410, "draw_not_found");
      const participant = draw.participants.find((item) => item.id === body.participantId);
      if (!participant) throw new HttpError(404, "participant_not_found");
      const now = new Date().toISOString();
      const oldToken = database.accessTokens.find((token) => token.hash === participant.activeTokenHash);
      if (oldToken) oldToken.revokedAt = now;
      const next = createAccessToken("draw_participant", draw.id, participant.id);
      participant.activeTokenHash = next.record.hash;
      participant.viewedAt = undefined;
      database.accessTokens.push(next.record);
      return { raw: next.raw, name: participant.name };
    });
    return noStoreJson({ name: regenerated.name, url: personalLink(request, "drawReveal", regenerated.raw) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "draw_admin");
    await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      if (!draw) throw new HttpError(410, "draw_not_found");
      database.draws = database.draws.filter((item) => item.id !== draw.id);
      database.accessTokens = database.accessTokens.filter((token) => token.scopeId !== draw.id);
      database.sessions = database.sessions.filter((item) => item.scopeId !== draw.id);
    });
    return noStoreJson({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
