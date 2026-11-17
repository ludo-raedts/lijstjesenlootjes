import "server-only";

import type { Metadata } from "next";
import { getServerI18n } from "@/i18n/server";
import { getPagePath, getRequestSiteUrl } from "@/lib/request-site";
import type { PageKey } from "@/lib/paths";

const openGraphLocales = { nl: "nl_NL", en: "en_GB" } as const;

/**
 * Metadata for a public page. Next.js replaces (not merges) the openGraph object of the layout, so every page
 * has to provide its own complete one; otherwise it would inherit the homepage's social title and description.
 */
export async function publicPageMetadata(
  key: PageKey,
  titleKey: Parameters<Awaited<ReturnType<typeof getServerI18n>>["t"]>[0],
  descriptionKey: Parameters<Awaited<ReturnType<typeof getServerI18n>>["t"]>[0],
): Promise<Metadata> {
  const { locale, t } = await getServerI18n();
  const path = await getPagePath(key);
  const base = await getRequestSiteUrl();
  const title = t(titleKey);
  const description = t(descriptionKey);
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      siteName: t("app.name"),
      url: path === "/" ? base : `${base}${path}`,
      title,
      description,
    },
  };
}
