import Link from "next/link";
import { getServerI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <div className="shell narrow page-section center">
      <span className="eyebrow">404</span>
      <h1>{t("notFound.title")}</h1>
      <p className="lead">{t("notFound.body")}</p>
      <Link className="button" href="/">{t("notFound.action")}</Link>
    </div>
  );
}
