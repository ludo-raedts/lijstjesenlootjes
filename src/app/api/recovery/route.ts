import { after, NextRequest } from "next/server";
import { mintDrawAdminLink, mintWishlistLinks } from "@/lib/access-links";
import { drawExpiresAt, wishlistExpiresAt } from "@/lib/data-lifecycle";
import { emailConfigured, sendEmailWithRetry } from "@/lib/email";
import { renderRecoveryEmail, type RecoveryItem } from "@/lib/email-templates";
import { getServerI18n } from "@/i18n/server";
import { errorResponse, noStoreJson, readJson } from "@/lib/http";
import { personalLink } from "@/lib/personal-links";
import { RECOVERY_LIMITS, recoveryHash, recoverySecret } from "@/lib/recovery";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { assertSameOrigin, HttpError, isWithinRateLimit, limit } from "@/lib/security";
import { read, transaction } from "@/lib/store";
import { optionalEmail } from "@/lib/validation";

/**
 * "I lost my management link." Always answers 202 with the same body, whether or not the address matches anything,
 * so the endpoint cannot be used to find out who uses the service. Matching, link creation and mailing all happen
 * after the response.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await limit(request, "recovery-ip", 10, 3600);
    const body = await readJson(request);
    const email = optionalEmail(body.email);
    if (!email) throw new HttpError(400, "invalid_email");
    if (!emailConfigured()) throw new HttpError(503, "email_not_configured");

    const hash = recoveryHash(email, recoverySecret());
    // Per address, so nobody can use this to flood a stranger's inbox. Over the limit looks like success.
    const withinLimit = await isWithinRateLimit(hash, "recovery-email", 3, 3600);
    if (withinLimit) {
      const { t, locale } = await getServerI18n();
      const site = (await getRequestSiteUrl()).replace(/^https?:\/\//, "");
      const host = await getRequestHost();
      after(async () => {
        const now = Date.now();
        const stillValid = (expiresAt: number | undefined) => expiresAt === undefined || expiresAt > now;
        const matches = await read((database) => ({
          wishlists: database.wishlists.filter((item) => item.recoveryHash === hash && !item.deletedAt && stillValid(wishlistExpiresAt(item))).map((item) => item.id),
          draws: database.draws.filter((item) => item.recoveryHash === hash && stillValid(drawExpiresAt(item))).map((item) => item.id),
        }));
        if (matches.wishlists.length + matches.draws.length === 0) return;

        const items = await transaction((database) => {
          const found: Array<RecoveryItem & { createdAt: string }> = [];
          for (const wishlist of database.wishlists.filter((item) => matches.wishlists.includes(item.id))) {
            const { manageToken, guestToken } = mintWishlistLinks(database, wishlist);
            found.push({
              kind: "wishlist",
              title: wishlist.title,
              createdAt: wishlist.createdAt,
              manageUrl: personalLink(request, "wishlistManage", manageToken),
              guestUrl: personalLink(request, "wishlistGuest", guestToken),
            });
          }
          for (const draw of database.draws.filter((item) => matches.draws.includes(item.id))) {
            const { adminToken } = mintDrawAdminLink(database, draw);
            found.push({
              kind: "draw",
              title: draw.title ?? t("draw.create.defaultGroup"),
              createdAt: draw.createdAt,
              adminUrl: personalLink(request, "drawAdmin", adminToken),
            });
          }
          return found
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, RECOVERY_LIMITS.maxScopesPerRequest);
        });

        const rendered = renderRecoveryEmail(t, { items: items.map(({ createdAt: _createdAt, ...item }) => item), locale, site });
        await sendEmailWithRetry({
          to: email,
          ...rendered,
          host,
          idempotencyKey: `recovery-${hash.slice(0, 16)}-${Math.floor(now / 600_000)}`,
        });
      });
    }
    return noStoreJson({ accepted: true }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
