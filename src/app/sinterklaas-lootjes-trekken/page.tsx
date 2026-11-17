import type { Metadata } from "next";
import Link from "next/link";
import { getServerI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { getPagePath } from "@/lib/request-site";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("sinterklaasDraw", "meta.sinterklaasDraw.title", "meta.sinterklaasDraw.description");
}

const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

/** Seasonal landing page: explains the Sinterklaas name draw and leads into the draw tool. Dutch domain only. */
export default async function SinterklaasDrawPage() {
  const { t } = await getServerI18n();
  const k = (suffix: string) => `sinterklaas.${suffix}` as MessageKey;
  return (
    <>
      <header className="shell tool-hero">
        <span className="eyebrow">{t("sinterklaas.eyebrow")}</span>
        <h1>{t("sinterklaas.title")}</h1>
        <p className="lead">{t("sinterklaas.lead")}</p>
        <div className="hero-actions" style={{ gridColumn: 2, marginTop: "1.5rem" }}>
          <Link className="button button-brick" href={await getPagePath("drawCreate")}>{t("sinterklaas.cta")}</Link>
          <Link className="button" href={await getPagePath("wishlistCreate")}>{t("sinterklaas.ctaWishlist")}</Link>
        </div>
      </header>
      <div className="shell narrow page-section prose-page seo-content">
        <section>
          <h2>{t("sinterklaas.stepsTitle")}</h2>
          <ol>
            {range(3).map((step) => (
              <li key={step}><h3>{t(k(`step${step}Title`))}</h3><p>{t(k(`step${step}Body`))}</p></li>
            ))}
          </ol>
        </section>
        <section>
          <h2>{t("sinterklaas.timingTitle")}</h2>
          <p>{t("sinterklaas.timingBody")}</p>
        </section>
        <section>
          <h2>{t("sinterklaas.tipsTitle")}</h2>
          <ul>{range(4).map((tip) => <li key={tip}>{t(k(`tip${tip}`))}</li>)}</ul>
        </section>
        <section>
          <h2>{t("sinterklaas.faqTitle")}</h2>
          {range(6).map((faq) => (
            <details key={faq}><summary>{t(k(`faq${faq}Question`))}</summary><p>{t(k(`faq${faq}Answer`))}</p></details>
          ))}
        </section>
      </div>
    </>
  );
}
