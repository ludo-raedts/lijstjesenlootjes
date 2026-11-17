import { personalLink } from "@/lib/personal-links";
import { deliverEmailAfterResponse, queuedStatus } from "@/lib/email-delivery";
import { emailConfigured } from "@/lib/email";
import { recoveryHash, recoverySecret } from "@/lib/recovery";
import type { Draw } from "@/lib/types";
import { renderDrawEmail } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { NextRequest } from "next/server";
import { createAssignments } from "@/lib/draw";
import { DRAW_BODY_BYTES, errorResponse, noStoreJson, readJson } from "@/lib/http";
import { accessExpiryIso, drawExpiresAt } from "@/lib/data-lifecycle";
import { assertSameOrigin, createAccessToken, HttpError, id, limit } from "@/lib/security";
import { recordUsage, transaction } from "@/lib/store";
import { optionalDate, optionalEmail, optionalText, text } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await limit(request, "draw-create", 10);
    const body = await readJson(request, DRAW_BODY_BYTES);
    const requestId = text(body.requestId, "requestId", 100);
    const email = optionalEmail(body.email);
    if (email) await limit(request, "email-send", 5);
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
    if (Array.isArray(body.exclusions) && body.exclusions.length > participants.length * (participants.length - 1)) {
      throw new HttpError(400, "too_many_exclusions");
    }
    const seenExclusions = new Set<string>();
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
        }).filter(({ from, to }) => {
          const key = `${from}:${to}`;
          if (seenExclusions.has(key)) return false;
          seenExclusions.add(key);
          return true;
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
    const createdAt = new Date().toISOString();
    const date = optionalDate(body.date);
    const accessExpiry = accessExpiryIso(drawExpiresAt({ date, createdAt }));
    const admin = createAccessToken("draw_admin", drawId, accessExpiry);
    const participantAccess = participants.map((participant) => ({
      participant,
      token: createAccessToken("draw_participant", drawId, accessExpiry, participant.id),
    }));
    const draw: Draw = {
      id: drawId,
      requestId,
      title: optionalText(body.title, "groupName", 100),
      organizerName: text(body.organizerName, "organizerName", 80),
      budget: optionalText(body.budget, "budget", 40),
      date,
      createdAt,
      status: "complete",
      recoveryHash: email && body.recoverable === true ? recoveryHash(email, recoverySecret()) : undefined,
      emailStatus: email && emailConfigured() ? queuedStatus() : undefined,
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
    await recordUsage("draw_created");
    const adminUrl = personalLink(request, "drawAdmin", admin.raw);
    const participantLinks = participantAccess.map(({ participant, token }) => ({
      participantId: participant.id,
      name: participant.name,
      url: personalLink(request, "drawReveal", token.raw),
    }));
    let emailStatus: "not_requested" | "queued" | "failed" = "not_requested";
    if (email) {
      const { t, locale } = await getServerI18n();
      const rendered = renderDrawEmail(t, {
        group: draw.title ?? t("draw.create.defaultGroup"),
        adminUrl,
        participants: participantLinks,
        locale, site: (await getRequestSiteUrl()).replace(/^https?:\/\//, ""),
      });
      const queued = deliverEmailAfterResponse(
        { to: email, ...rendered, host: await getRequestHost(), idempotencyKey: `draw-${drawId}` },
        { kind: "draw", id: drawId },
      );
      emailStatus = queued ? "queued" : "failed";
    }
    return noStoreJson({ adminUrl, participantLinks, emailStatus }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
