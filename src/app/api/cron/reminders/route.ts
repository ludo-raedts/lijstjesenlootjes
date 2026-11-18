import { NextRequest } from "next/server";
import { mintDrawAdminLink } from "@/lib/access-links";
import { HttpError } from "@/lib/api-error";
import { isCronAuthorized } from "@/lib/cron-auth";
import { originForHost } from "@/lib/domains";
import { emailConfigured, sendEmailWithRetry } from "@/lib/email";
import { renderReminderEmail } from "@/lib/email-templates";
import { errorResponse, noStoreJson } from "@/lib/http";
import { formattingLocales } from "@/i18n/config";
import { createTranslator } from "@/i18n/messages";
import { pathForHost } from "@/lib/paths";
import { isReminderDue, isReminderStale } from "@/lib/reminders";
import { parseSealKey, unseal } from "@/lib/secret-box";
import { transaction } from "@/lib/store";
import { amsterdamDay } from "@/lib/usage";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

type Job = {
  drawId: string;
  email: string;
  adminToken: string;
  locale: Locale;
  host?: string;
  group: string;
  date: string;
  pending: number;
  total: number;
};

/**
 * Daily. Sends the one reminder an organizer asked for, then removes it (and with it their sealed address).
 * Nothing is sent when everyone has already opened their draw. Counts only in the log.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) throw new HttpError(401, "cron_unauthorized");
    const key = parseSealKey(process.env.REMINDER_ENCRYPTION_KEY);
    if (!key || !emailConfigured()) return noStoreJson({ sent: 0, cleared: 0, skipped: true });

    const today = amsterdamDay(new Date());
    const origin = new URL(request.url).origin;
    const cleared = new Set<string>();

    const jobs = await transaction((database) => {
      const due: Job[] = [];
      for (const draw of database.draws) {
        if (!draw.reminder) continue;
        if (isReminderStale(draw, today)) {
          draw.reminder = undefined;
          continue;
        }
        if (!isReminderDue(draw, today)) continue;
        const email = unseal(draw.reminder.emailSealed, key);
        const pending = draw.participants.filter((participant) => !participant.viewedAt).length;
        if (!email || pending === 0) {
          draw.reminder = undefined;
          continue;
        }
        const { adminToken } = mintDrawAdminLink(database, draw);
        due.push({
          drawId: draw.id,
          email,
          adminToken,
          locale: draw.reminder.locale,
          host: draw.reminder.host,
          group: draw.title ?? "",
          date: draw.date as string,
          pending,
          total: draw.participants.length,
        });
      }
      return due;
    });

    for (const job of jobs) {
      const t = createTranslator(job.locale);
      const base = originForHost(job.host) ?? origin;
      const adminUrl = `${base}${pathForHost("drawAdmin", job.host)}#token=${job.adminToken}`;
      const rendered = renderReminderEmail(t, {
        group: job.group || t("draw.admin.defaultGroup"),
        date: new Intl.DateTimeFormat(formattingLocales[job.locale], { dateStyle: "long" }).format(new Date(`${job.date}T12:00:00`)),
        pending: job.pending,
        total: job.total,
        adminUrl,
        site: base.replace(/^https?:\/\//, ""),
        locale: job.locale,
      });
      const result = await sendEmailWithRetry({
        to: job.email,
        ...rendered,
        host: job.host,
        idempotencyKey: `draw-reminder-${job.drawId}-${today}`,
      });
      if (result === "sent") cleared.add(job.drawId);
    }

    if (cleared.size > 0) {
      await transaction((database) => {
        for (const draw of database.draws) if (cleared.has(draw.id)) draw.reminder = undefined;
      });
    }
    console.info("draw_reminders_completed", JSON.stringify({ due: jobs.length, sent: cleared.size }));
    return noStoreJson({ sent: cleared.size, due: jobs.length });
  } catch (error) {
    return errorResponse(error);
  }
}
