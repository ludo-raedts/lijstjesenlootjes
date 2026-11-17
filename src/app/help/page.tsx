import type { Metadata } from "next";
import Link from "next/link";
import { getServerI18n } from "@/i18n/server";
import { getPagePath } from "@/lib/request-site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("nav.help"), description: t("meta.help.description") };
}

export default async function HelpPage() {
  const { t } = await getServerI18n();
  const items = [
    ["help.manageQuestion", "help.manageAnswer"],
    ["help.assignmentsQuestion", "help.assignmentsAnswer"],
    ["help.ownWishlistQuestion", "help.ownWishlistAnswer"],
    ["help.reservedQuestion", "help.reservedAnswer"],
    ["help.releaseQuestion", "help.releaseAnswer"],
    ["help.whatsappQuestion", "help.whatsappAnswer"],
    ["help.emailQuestion", "help.emailAnswer"],
  ] as const;
  return (
    <div className="shell narrow page-section prose-page">
      <span className="eyebrow">{t("help.eyebrow")}</span>
      <h1>{t("help.title")}</h1>
      <p className="lead">{t("help.lead")}</p>
      {items.map(([question, answer], index) => (
        <details key={question} open={index === 0}><summary>{t(question)}</summary><p>{t(answer)}</p></details>
      ))}
      <div className="callout">
        <strong>{t("help.calloutTitle")}</strong>
        <p>{t("help.calloutBody")}</p>
        <Link className="button" href={await getPagePath("drawCreate")}>{t("help.calloutAction")}</Link>
      </div>
    </div>
  );
}
