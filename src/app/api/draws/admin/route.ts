import { personalLink } from "@/lib/personal-links";
import { NextRequest } from "next/server";
import { mintDrawAdminLink } from "@/lib/access-links";
import { accessExpiryIso, drawExpiresAt, syncDrawAccess } from "@/lib/data-lifecycle";
import { deliverEmailAfterResponse, queuedStatus } from "@/lib/email-delivery";
import { emailConfigured } from "@/lib/email";
import { renderRecoveryEmail } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { recoveryHash, recoverySecret } from "@/lib/recovery";
import { assertSameOrigin, createAccessToken, HttpError, limit, requireSession } from "@/lib/security";
import { errorResponse, noStoreJson, readJson } from "@/lib/http";
import { read, transaction } from "@/lib/store";
import { optionalDate, optionalEmail } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, "draw_admin");
    return noStoreJson(await read((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      if (!draw) throw new HttpError(410, "draw_not_found");
      const expiresAt = drawExpiresAt(draw);
      return {
        draw: {
          title: draw.title,
          organizerName: draw.organizerName,
          date: draw.date,
          budget: draw.budget,
          expiresAt: expiresAt === undefined ? undefined : new Date(expiresAt).toISOString(),
          emailStatus: draw.emailStatus,
          recoverable: Boolean(draw.recoveryHash),
          participants: draw.participants.map((participant) => ({
            id: participant.id,
            name: participant.name,
            status: participant.viewedAt ? "viewed" : "available",
          })),
        },
        emailAvailable: emailConfigured(),
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
    const body = await readJson(request);

    if (body.action === "email_link") {
      await limit(request, "email-send", 5);
      if (!emailConfigured()) throw new HttpError(503, "email_not_configured");
      const email = optionalEmail(body.email);
      if (!email) throw new HttpError(400, "invalid_email");
      const minted = await transaction((database) => {
        const draw = database.draws.find((item) => item.id === session.scopeId);
        if (!draw) throw new HttpError(410, "draw_not_found");
        const { adminToken } = mintDrawAdminLink(database, draw);
        draw.emailStatus = queuedStatus();
        if (body.recoverable === true) draw.recoveryHash = recoveryHash(email, recoverySecret());
        return { adminToken, title: draw.title, drawId: draw.id };
      });
      const { t, locale } = await getServerI18n();
      const rendered = renderRecoveryEmail(t, {
        items: [{ kind: "draw", title: minted.title ?? t("draw.create.defaultGroup"), adminUrl: personalLink(request, "drawAdmin", minted.adminToken) }],
        locale,
        site: (await getRequestSiteUrl()).replace(/^https?:\/\//, ""),
      });
      deliverEmailAfterResponse(
        { to: email, ...rendered, host: await getRequestHost(), idempotencyKey: `draw-link-${minted.drawId}-${minted.adminToken.slice(0, 12)}` },
        { kind: "draw", id: minted.drawId },
      );
      return noStoreJson({ queued: true }, { status: 202 });
    }

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
      const next = createAccessToken("draw_participant", draw.id, accessExpiryIso(drawExpiresAt(draw)), participant.id);
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

/** The organizer can move the date; every link of the draw then follows the new expiry. */
export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "draw_admin");
    const body = await readJson(request);
    const date = optionalDate(body.date);
    const updated = await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      if (!draw) throw new HttpError(410, "draw_not_found");
      draw.date = date;
      const expiresAt = syncDrawAccess(database, draw);
      return { date: draw.date, expiresAt };
    });
    return noStoreJson(updated);
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
