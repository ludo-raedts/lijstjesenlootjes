"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { pathForLocale } from "@/lib/paths";

/** Soft call to action under shared pages (guest wishlist, draw reveal) that invites visitors to make their own list. */
export function MakeOwnList() {
  const { locale, t } = useI18n();
  return (
    <aside className="make-own-list" aria-labelledby="make-own-list-title">
      <h3 id="make-own-list-title">{t("promo.title")}</h3>
      <p>{t("promo.body")}</p>
      <Link className="button button-secondary" href={pathForLocale("wishlistCreate", locale)}>{t("promo.button")}</Link>
    </aside>
  );
}
