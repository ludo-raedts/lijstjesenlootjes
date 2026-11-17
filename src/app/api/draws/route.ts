import { personalLink } from "@/lib/personal-links";
import { NextRequest } from "next/server";
import { createAssignments } from "@/lib/draw";
import { errorResponse, noStoreJson } from "@/lib/http";
import { assertSameOrigin, createAccessToken, HttpError, id, limit } from "@/lib/security";
import { transaction } from "@/lib/store";
import { optionalDate, optionalText, text } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await limit(request, "draw-create", 10);
    const body = (await request.json()) as Record<string, unknown>;
    const requestId = text(body.requestId, "requestId", 100);
    if (!Array.isArray(body.participants) || body.participants.length < 3 || body.participants.length > 50) {
      throw new HttpError(400, "invalid_participant_count", { min: 3, max: 50 });
    }
    const participants = body.participants.map((input) => {
      if (!input || typeof input !== "object") throw new HttpError(400, "participant_incomplete");
      const source = input as Record<string, unknown>;
      return { id: text(source.id, "participantId", 80), name: text(source.name, "name", 80) };
    });
    if (new Set(participants.map((participant) => participant.id)).size !== participants.length) {
      throw new HttpError(400, "duplicate_participant_id");
    }
    const participantIds = new Set(participants.map((participant) => participant.id));
    const exclusions = Array.isArray(body.exclusions)
      ? body.exclusions.map((input) => {
          if (!input || typeof input !== "object") throw new HttpError(400, "exclusion_incomplete");
          const source = input as Record<string, unknown>;
          const from = text(source.from, "exclusion", 80);
          const to = text(source.to, "exclusion", 80);
          if (from === to || !participantIds.has(from) || !participantIds.has(to)) {
            throw new HttpError(400, "exclusion_unknown_participant");
          }
          return { from, to };
        })
      : [];
    const result = createAssignments(participants, exclusions);
    if (result.kind === "impossible") {
      throw new HttpError(422, "draw_impossible");
    }
    if (result.kind === "technical-limit") {
      throw new HttpError(503, "draw_generation_timeout");
    }
    const drawId = id();
    const admin = createAccessToken("draw_admin", drawId);
    const participantAccess = participants.map((participant) => ({
      participant,
      token: createAccessToken("draw_participant", drawId, participant.id),
    }));
    const draw = {
      id: drawId,
      requestId,
      title: optionalText(body.title, "groupName", 100),
      organizerName: text(body.organizerName, "organizerName", 80),
      budget: optionalText(body.budget, "budget", 40),
      date: optionalDate(body.date),
      createdAt: new Date().toISOString(),
      status: "complete" as const,
      exclusions,
      assignments: result.assignments,
      participants: participantAccess.map(({ participant, token }) => ({
        ...participant,
        activeTokenHash: token.record.hash,
      })),
    };
    await transaction((database) => {
      if (database.draws.some((existing) => existing.requestId === requestId)) {
        throw new HttpError(409, "draw_already_exists");
      }
      database.draws.push(draw);
      database.accessTokens.push(admin.record, ...participantAccess.map(({ token }) => token.record));
    });
    return noStoreJson({
      adminUrl: personalLink(request, "drawAdmin", admin.raw),
      participantLinks: participantAccess.map(({ participant, token }) => ({
        participantId: participant.id,
        name: participant.name,
        url: personalLink(request, "drawReveal", token.raw),
      })),
      emailAvailable: false,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
