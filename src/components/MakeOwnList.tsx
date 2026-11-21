"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { reportUsage } from "@/lib/client";
import { pathForLocale } from "@/lib/paths";

/**
 * Soft call to action under shared pages. People who opened a personal draw link are invited to organize their own
 * draw (the main growth loop: every participant is a possible next organizer); guests of a shared wishlist are invited
 * to make their own list. The other option stays as a quieter second choice. Clicks are counted anonymously.
 */
export function MakeOwnList({ source }: { source: "reveal" | "guest" }) {
  const { locale, t } = useI18n();
  const drawFirst = source === "reveal";
  const draw = { path: pathForLocale("drawCreate", locale), label: t("promo.drawButton"), event: `cta_${source}_to_draw` } as const;
  const list = { path: pathForLocale("wishlistCreate", locale), label: t("promo.button"), event: `cta_${source}_to_wishlist` } as const;
  const [primary, secondary] = drawFirst ? [draw, list] : [list, draw];
  return (
    <aside className="make-own-list" aria-labelledby="make-own-list-title">
      <h3 id="make-own-list-title">{drawFirst ? t("promo.drawTitle") : t("promo.title")}</h3>
      <p>{drawFirst ? t("promo.drawBody") : t("promo.body")}</p>
      <div className="button-row">
        <Link className="button" href={primary.path} onClick={() => reportUsage(primary.event)}>{primary.label}</Link>
        <Link className="button button-secondary" href={secondary.path} onClick={() => reportUsage(secondary.event)}>{secondary.label}</Link>
      </div>
    </aside>
  );
}
