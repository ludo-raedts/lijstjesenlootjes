import { personalLink } from "@/lib/personal-links";
import { NextRequest } from "next/server";
import { mintDrawAdminLink } from "@/lib/access-links";
import { parseSealKey, seal } from "@/lib/secret-box";
import { reminderSendOn } from "@/lib/reminders";
import { planRedraw } from "@/lib/redraw";
import { amsterdamDay } from "@/lib/usage";
import { accessExpiryIso, drawExpiresAt, syncDrawAccess } from "@/lib/data-lifecycle";
import { deliverEmailAfterResponse, queuedStatus } from "@/lib/email-delivery";
import { emailConfigured } from "@/lib/email";
import { renderRecoveryEmail } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { recoveryHash, recoverySecret } from "@/lib/recovery";
import { assertSameOrigin, createAccessToken, HttpError, id, limit, requireSession } from "@/lib/security";
import { errorResponse, noStoreJson, readJson } from "@/lib/http";
import { read, transaction } from "@/lib/store";
import { optionalDate, optionalEmail, optionalText, text } from "@/lib/validation";

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
          note: draw.note,
          redrawnAt: draw.redrawnAt,
          reminder: draw.reminder ? { sendOn: draw.reminder.sendOn } : undefined,
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
        reminderAvailable: emailConfigured() && Boolean(parseSealKey(process.env.REMINDER_ENCRYPTION_KEY)),
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

    if (body.action === "redraw") {
      const addNames = Array.isArray(body.addNames) ? body.addNames.map((name) => text(name, "name", 80)) : [];
      const removeIds = Array.isArray(body.removeIds) ? body.removeIds.filter((value): value is string => typeof value === "string") : [];
      if (addNames.length + removeIds.length > 50) throw new HttpError(400, "invalid_participant_count", { min: 3, max: 50 });
      const result = await transaction((database) => {
        const draw = database.draws.find((item) => item.id === session.scopeId);
        if (!draw) throw new HttpError(410, "draw_not_found");
        const plan = planRedraw(draw, { addNames, removeIds }, id);
        const now = new Date().toISOString();
        const expiry = accessExpiryIso(drawExpiresAt(draw));
        const removedHashes = new Set(
          draw.participants.filter((participant) => plan.removedIds.includes(participant.id)).map((participant) => participant.activeTokenHash),
        );
        for (const token of database.accessTokens) {
          if (removedHashes.has(token.hash)) token.revokedAt = now;
        }
        database.sessions = database.sessions.filter((item) => !(item.scopeId === draw.id && item.participantId && plan.removedIds.includes(item.participantId)));
        const existing = new Map(draw.participants.map((participant) => [participant.id, participant]));
        const created: Array<{ name: string; raw: string }> = [];
        draw.participants = plan.participants.map((entry) => {
          const current = existing.get(entry.id);
          if (current) return { ...current, viewedAt: undefined };
          const token = createAccessToken("draw_participant", draw.id, expiry, entry.id);
          database.accessTokens.push(token.record);
          created.push({ name: entry.name, raw: token.raw });
          return { id: entry.id, name: entry.name, activeTokenHash: token.record.hash };
        });
        draw.exclusions = plan.exclusions;
        draw.assignments = plan.assignments;
        draw.redrawnAt = now;
        return created;
      });
      return noStoreJson({
        added: result.map((entry) => ({ name: entry.name, url: personalLink(request, "drawReveal", entry.raw) })),
      });
    }

    if (body.action === "set_reminder") {
      const key = parseSealKey(process.env.REMINDER_ENCRYPTION_KEY);
      if (!key || !emailConfigured()) throw new HttpError(503, "email_not_configured");
      await limit(request, "email-send", 5);
      const email = optionalEmail(body.email);
      if (!email) throw new HttpError(400, "invalid_email");
      const { locale } = await getServerI18n();
      const host = (await getRequestHost()) ?? undefined;
      const sendOn = await transaction((database) => {
        const draw = database.draws.find((item) => item.id === session.scopeId);
        if (!draw) throw new HttpError(410, "draw_not_found");
        const day = reminderSendOn(draw.date, amsterdamDay(new Date()));
        if (!day) throw new HttpError(400, "reminder_needs_future_date");
        draw.reminder = { emailSealed: seal(email, key), sendOn: day, locale, host };
        return day;
      });
      return noStoreJson({ sendOn });
    }

    if (body.action === "clear_reminder") {
      await transaction((database) => {
        const draw = database.draws.find((item) => item.id === session.scopeId);
        if (!draw) throw new HttpError(410, "draw_not_found");
        draw.reminder = undefined;
      });
      return noStoreJson({ cleared: true });
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

/** The organizer can move the date and edit the note; every link of the draw follows a new date. */
export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, "draw_admin");
    const body = await readJson(request);
    const hasDate = "date" in body;
    const hasNote = "note" in body;
    if (!hasDate && !hasNote) throw new HttpError(400, "unknown_action");
    const date = hasDate ? optionalDate(body.date) : undefined;
    const note = hasNote ? optionalText(body.note, "note", 500) : undefined;
    const updated = await transaction((database) => {
      const draw = database.draws.find((item) => item.id === session.scopeId);
      if (!draw) throw new HttpError(410, "draw_not_found");
      if (hasNote) draw.note = note;
      let expiresAt: string | undefined;
      if (hasDate) {
        draw.date = date;
        expiresAt = syncDrawAccess(database, draw);
        if (draw.reminder) {
          const day = reminderSendOn(draw.date, amsterdamDay(new Date()));
          if (day) draw.reminder.sendOn = day;
          else draw.reminder = undefined;
        }
      }
      return { date: draw.date, note: draw.note, expiresAt, reminder: draw.reminder ? { sendOn: draw.reminder.sendOn } : undefined };
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
